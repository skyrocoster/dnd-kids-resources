#!/usr/bin/env python
"""Run every reconcile-time check and print a summary short enough to read once.

Reconcile runs five checks — backend tests, the frontend suite, lint, the build, and the
documentation contract. Run by hand that is five separate tool calls whose outputs the
planner reads in full and then hand-summarises into one telemetry line. The measured cost
of that is not small: in the executor transcripts a single `npm run lint` result is ~1,129
tokens and `npm run test:check` ~1,135, and reconcile pays for all five plus the
transcription.

None of that reading changes a decision. What reconcile needs from each check is whether
it passed, the numbers that go in the log, and — only when something failed — enough
output to act on. So this script runs all five, prints about ten lines, and emits the
`- stage checks:` line verbatim, which also stops the format drifting between stages.

    .venv\\Scripts\\python.exe scripts/stage_check.py
    .venv\\Scripts\\python.exe scripts/stage_check.py --only backend,docs
    .venv\\Scripts\\python.exe scripts/stage_check.py --telemetry-line

Exit code is 1 if any check failed, so it works as a single gate.
"""

from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
FRONTEND = REPO_ROOT / "frontend"
LOG_DIR = REPO_ROOT / ".stage-check"

# Tool output carries ✓/× freely; a Windows console defaults to cp1252 and would otherwise
# crash the summary *after* the checks have all run, which is the worst possible moment.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Lines worth keeping from each tool's output. Everything else is progress noise.
SIGNAL_PATTERNS = {
    "backend": (
        r"\d+ (?:passed|failed|error)",
        r"Required test coverage.*",
        r"^TOTAL\s+.*\d+%",
        r"^FAILED .*",
    ),
    "frontend": (
        r"test:check —.*",
        r"test:check (?:PASS|FAIL).*",
        r"\d+ tests?, \d+ failing",
        r"^\s*(?:FAIL|×)\s+.*",
    ),
    "lint": (r"Found \d+ warning.*", r"Found \d+ error.*", r"^\s*(?:×|error)\s+.*"),
    "build": (r"error TS\d+.*", r"built in .*", r"^\s*✓.*modules transformed.*"),
    "docs": (r"All checks pass.*", r"\d+ (?:problem|error|failure)s?.*", r"^\s*\S+\.md: .*"),
}

# Of the signal lines, the one or two that belong in the telemetry entry. Without this the
# first *matching* line wins, which for pytest is the column-aligned coverage row rather
# than the test counts anyone actually wants recorded.
PRIMARY_PATTERNS = {
    "backend": (r"\d+ passed", r"Total coverage: [\d.]+%"),
    "frontend": (r"\d+ tests?, \d+ failing", r"test:check (?:PASS|FAIL)"),
    "lint": (r"Found \d+ warning", r"Found \d+ error"),
    "build": (r"built in", r"error TS\d+"),
    "docs": (r"All checks pass", r"\d+ (?:problem|failure)"),
}
MAX_SIGNAL_LINES = 4
MAX_FAILURE_TAIL = 25
HEARTBEAT_SECONDS = 60
DEFAULT_TIMEOUT_SECONDS = 15 * 60
TIMEOUT_SECONDS = DEFAULT_TIMEOUT_SECONDS
KILL_WAIT_SECONDS = 5
ANSI_RE = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")


@dataclass
class Check:
    key: str
    label: str
    command: str | list[str]
    cwd: Path
    telemetry: str
    shell: bool = False
    passed: bool = False
    summary: str = ""
    output: str = ""
    seconds: float = 0.0
    signals: list[str] = field(default_factory=list)
    log_path: Path | None = None


def _checks() -> list[Check]:
    python = sys.executable
    return [
        Check(
            key="backend",
            label="pytest (backend)",
            command=[python, "-m", "pytest", "-vv"],
            cwd=REPO_ROOT,
            telemetry="pytest",
        ),
        Check(
            key="frontend",
            label="npm run test:check -- --strict",
            command="npm run test:check -- --strict",
            cwd=FRONTEND,
            telemetry="test:check --strict",
            shell=True,
        ),
        Check(
            key="lint",
            label="npm run lint",
            command="npm run lint",
            cwd=FRONTEND,
            telemetry="lint",
            shell=True,
        ),
        Check(
            key="build",
            label="npm run build (tsc -b)",
            command="npm run build",
            cwd=FRONTEND,
            telemetry="build",
            shell=True,
        ),
        Check(
            key="docs",
            label="check_docs.py --check",
            command=[python, str(REPO_ROOT / "scripts" / "check_docs.py"), "--check"],
            cwd=REPO_ROOT,
            telemetry="check_docs --check",
        ),
    ]


def _clean(line: str) -> str:
    """One readable line: no colour codes, no column padding."""
    return " ".join(ANSI_RE.sub("", line).split())


def _last_output_line(*chunks: str | bytes | None) -> str:
    """Return one bounded clue from output captured before a heartbeat timeout."""
    lines: list[str] = []
    for chunk in chunks:
        if isinstance(chunk, bytes):
            chunk = chunk.decode("utf-8", errors="replace")
        if chunk:
            lines.extend(cleaned for line in chunk.splitlines() if (cleaned := _clean(line)))
    return lines[-1][-200:] if lines else ""


def _log_tail(path: Path, max_bytes: int = 8192) -> str:
    """Read enough of a live log to identify the currently running test."""
    try:
        with path.open("rb") as log:
            log.seek(0, 2)
            log.seek(max(0, log.tell() - max_bytes))
            return _last_output_line(log.read())
    except OSError:
        return ""


def _signal_lines(key: str, output: str) -> list[str]:
    patterns = [re.compile(p, re.MULTILINE) for p in SIGNAL_PATTERNS.get(key, ())]
    seen: list[str] = []
    for line in output.splitlines():
        stripped = _clean(line)
        if not stripped:
            continue
        if any(pattern.search(stripped) for pattern in patterns) and stripped not in seen:
            seen.append(stripped)
    return seen[:MAX_SIGNAL_LINES]


def _primary(check: Check) -> str:
    """The one or two signal lines worth putting in the telemetry entry."""
    chosen: list[str] = []
    for pattern in PRIMARY_PATTERNS.get(check.key, ()):
        compiled = re.compile(pattern, re.IGNORECASE)
        for signal in check.signals:
            if compiled.search(signal) and signal not in chosen:
                chosen.append(signal)
                break
    return "; ".join(chosen) or (check.signals[0] if check.signals else "")


def _stop_process_tree(process: subprocess.Popen[bytes | str]) -> None:
    """Stop the isolated check process and descendants on both supported platforms."""
    if process.poll() is not None:
        return
    if os.name == "nt":
        subprocess.run(
            ["taskkill", "/PID", str(process.pid), "/T", "/F"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        )
    else:
        try:
            os.killpg(process.pid, 15)
        except ProcessLookupError:
            return
    try:
        process.wait(timeout=KILL_WAIT_SECONDS)
    except subprocess.TimeoutExpired:
        if os.name == "nt":
            subprocess.run(
                ["taskkill", "/PID", str(process.pid), "/T", "/F"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False,
            )
        else:
            try:
                os.killpg(process.pid, 9)
            except ProcessLookupError:
                pass
        process.wait()


def run_check(check: Check) -> Check:
    started = time.time()
    LOG_DIR.mkdir(exist_ok=True)
    log_file = tempfile.NamedTemporaryFile(
        mode="w+",
        encoding="utf-8",
        errors="replace",
        prefix=f"stage-check-{check.key}-",
        suffix=".log",
        dir=LOG_DIR,
        delete=False,
    )
    check.log_path = Path(log_file.name)
    print(f"RUN   {check.label} (log: {check.log_path})", file=sys.stderr, flush=True)
    try:
        popen_kwargs = {
            "cwd": check.cwd,
            "shell": check.shell,
            "stdout": log_file,
            "stderr": subprocess.STDOUT,
        }
        if os.name == "nt":
            popen_kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
        else:
            popen_kwargs["start_new_session"] = True
        process = subprocess.Popen(
            check.command,
            **popen_kwargs,
        )
        deadline = started + TIMEOUT_SECONDS
        while True:
            try:
                remaining = deadline - time.time()
                if remaining <= 0:
                    raise subprocess.TimeoutExpired(check.command, TIMEOUT_SECONDS)
                process.wait(timeout=min(HEARTBEAT_SECONDS, remaining))
                break
            except subprocess.TimeoutExpired:
                elapsed = time.time() - started
                active = _log_tail(check.log_path)
                if elapsed >= TIMEOUT_SECONDS:
                    _stop_process_tree(process)
                    check.passed = False
                    check.output = check.log_path.read_text(encoding="utf-8", errors="replace")
                    check.summary = f"timed out after {TIMEOUT_SECONDS}s"
                    check.seconds = elapsed
                    log_file.close()
                    return check
                detail = f"; last: {active}" if active else ""
                print(
                    f"WAIT  {check.label} ({elapsed:.0f}s, still running{detail}; "
                    f"log: {check.log_path})",
                    file=sys.stderr,
                    flush=True,
                )
    except OSError as exc:
        log_file.close()
        check.passed = False
        check.output = str(exc)
        check.summary = f"could not run ({exc})"
        check.seconds = time.time() - started
        return check

    log_file.close()
    check.seconds = time.time() - started
    check.output = check.log_path.read_text(encoding="utf-8", errors="replace")
    check.passed = process.returncode == 0
    check.signals = _signal_lines(check.key, check.output)
    check.summary = "; ".join(check.signals) if check.signals else (
        "pass" if check.passed else f"exit {process.returncode}"
    )
    if check.passed:
        check.log_path.unlink(missing_ok=True)
        check.log_path = None
    return check


def telemetry_line(checks: list[Check]) -> str:
    """The `- stage checks:` line, formatted the same way every stage."""
    parts = []
    for check in checks:
        verdict = "pass" if check.passed else "FAIL"
        detail = _primary(check)
        parts.append(f"{check.telemetry}: {verdict} ({detail})" if detail else f"{check.telemetry}: {verdict}")
    return "- stage checks: " + " / ".join(parts)


def run_checks(checks: list[Check]) -> list[Check]:
    """Run independent gates concurrently while retaining their declared order."""
    with ThreadPoolExecutor(max_workers=len(checks)) as executor:
        return list(executor.map(run_check, checks))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--only",
        help="Comma-separated subset: backend, frontend, lint, build, docs",
    )
    parser.add_argument(
        "--telemetry-line",
        action="store_true",
        help="Print only the `- stage checks:` line, for the reconcile telemetry entry",
    )
    parser.add_argument(
        "--full-output",
        action="store_true",
        help="Print each failing check's whole output instead of the last "
        f"{MAX_FAILURE_TAIL} lines",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=DEFAULT_TIMEOUT_SECONDS,
        help=f"Maximum seconds for each check (default: {DEFAULT_TIMEOUT_SECONDS:g})",
    )
    args = parser.parse_args()

    global TIMEOUT_SECONDS
    if args.timeout <= 0:
        parser.error("--timeout must be greater than zero")
    TIMEOUT_SECONDS = args.timeout

    checks = _checks()
    if args.only:
        wanted = {name.strip() for name in args.only.split(",")}
        unknown = wanted - {check.key for check in checks}
        if unknown:
            print(f"ERROR: unknown check(s): {', '.join(sorted(unknown))}", file=sys.stderr)
            return 2
        checks = [check for check in checks if check.key in wanted]

    results = run_checks(checks)
    failed = [check for check in results if not check.passed]

    if not args.telemetry_line:
        for check in results:
            mark = "PASS" if check.passed else "FAIL"
            print(f"{mark}  {check.label}  ({check.seconds:.0f}s)")
            if check.summary and check.summary != "pass":
                print(f"      {check.summary}")

    print()
    print(telemetry_line(results))

    if failed and not args.telemetry_line:
        for check in failed:
            print()
            print(f"--- {check.label} ---")
            if check.log_path:
                print(f"Full log: {check.log_path}")
            lines = check.output.strip().splitlines()
            tail = lines if args.full_output else lines[-MAX_FAILURE_TAIL:]
            print("\n".join(tail))

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
