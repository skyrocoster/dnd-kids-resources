"""Fail-fast, resumable runner for the repository's complete local test process.

Spec and policy: docs/FULL_TEST_PROCESS.md. The committed `test-fixer` agent
(`.opencode/agents/test-fixer.md`) assumes this exact interface. Run from the
repository root with the project virtual environment:

    .venv/Scripts/python.exe src/tools/full_test_process.py --list
    .venv/Scripts/python.exe src/tools/full_test_process.py

The runner stops at the first failed command, timeout, or warning, records the
checkpoint under the ignored `.stage-check/full-test/`, and resumes there on
the next invocation. A completed run deletes the checkpoint and failure log.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import threading
import time
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
STAGE_DIR = REPO_ROOT / ".stage-check" / "full-test"
STATE_PATH = STAGE_DIR / "state.json"
FAILURE_LOG_PATH = STAGE_DIR / "latest-failure.log"

FINISH_LINE = "PASS complete full-test process"

# Warning text in a check's output is a failure even when the command exits 0.
WARNING_PATTERN = re.compile(r"\bwarn(?:ings?)?\b", re.IGNORECASE)

# Accepted exception 1 (the only one repository-wide): npm's local engine
# mismatch warning when the installed Node version is outside the repository's
# Node 24 pin (`engines` in frontend/package.json).
EBADENGINE_PATTERN = re.compile(r"EBADENGINE", re.IGNORECASE)

# Accepted exception 2: the known Windows Storybook libuv teardown assertion,
# only for the production Storybook build check and only once that build has
# printed its success marker.
STORYBOOK_BUILD_SUCCESS_MARKER = "storybook build completed successfully"
LIBUV_TEARDOWN_PATTERN = re.compile(
    r"Assertion failed.*(uv__|libuv|handle\.c)|handle\.c.*Assertion failed", re.IGNORECASE
)

SERVICE_NAMES = ("backend", "frontend", "storybook", "datasette")


@dataclass(frozen=True)
class Check:
    name: str
    command: tuple[str, ...]
    cwd: str
    timeout_seconds: int


def build_checks() -> list[Check]:
    """The authoritative ordered inventory; the `--list` output mirrors this."""
    python = sys.executable
    return [
        Check("Compose configuration parsing", ("docker", "compose", "--file", "compose.yaml", "config", "--quiet"), ".", 120),
        Check("pip check", (python, "-m", "pip", "check"), ".", 120),
        Check("pip-audit", (python, "-m", "pip_audit", "--requirement", "backend/requirements.txt"), ".", 600),
        Check("npm dependency tree", ("npm", "ls", "--all"), "frontend", 240),
        Check("Ruff lint", (python, "-m", "ruff", "check", "backend"), ".", 120),
        Check("Ruff format", (python, "-m", "ruff", "format", "--check", "backend"), ".", 120),
        Check("Prettier format", ("npm", "run", "format:check"), "frontend", 240),
        Check("oxlint", ("npm", "run", "lint"), "frontend", 120),
        Check("ESLint zero warnings", ("npm", "run", "lint:eslint", "--", "--max-warnings", "0"), "frontend", 240),
        Check("TypeScript checking", ("npm", "run", "typecheck"), "frontend", 600),
        Check("Python tests", (python, "-m", "pytest", "-x", "-W", "error"), ".", 900),
        Check("Vitest unit tests", ("npm", "test", "--", "--bail", "1"), "frontend", 1800),
        Check("Development service health", ("powershell", "-ExecutionPolicy", "Bypass", "-File", "./dev.ps1", "status"), ".", 180),
        Check("Frontend production build", ("npm", "run", "build"), "frontend", 600),
        Check("Storybook browser tests", ("npm", "run", "test:storybook", "--", "--bail", "1"), "frontend", 1800),
        Check("Storybook production build", ("npm", "run", "build-storybook"), "frontend", 900),
        Check("Playwright end-to-end tests", ("npm", "run", "test:e2e", "--", "--max-failures", "1"), "frontend", 900),
    ]


def fingerprint(checks: list[Check]) -> str:
    payload = json.dumps([[c.name, list(c.command), c.cwd, c.timeout_seconds] for c in checks])
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def load_state() -> dict | None:
    try:
        return json.loads(STATE_PATH.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def write_state(check_index: int, check_fingerprint: str) -> None:
    STAGE_DIR.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(
        json.dumps({"fingerprint": check_fingerprint, "check": check_index}, indent=2),
        encoding="utf-8",
    )


def discard_state() -> None:
    """A completed (or discarded) run leaves no checkpoint or failure log behind."""
    for path in (STATE_PATH, FAILURE_LOG_PATH):
        try:
            path.unlink()
        except FileNotFoundError:
            pass


def terminate_tree(process: subprocess.Popen) -> None:
    if os.name == "nt":
        subprocess.run(
            ("taskkill", "/F", "/T", "/PID", str(process.pid)),
            capture_output=True,
            check=False,
        )
    process.kill()
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        pass


def host_command(command: tuple[str, ...]) -> list[str]:
    """Windows cannot execute npm.cmd/npx.cmd directly; route through cmd."""
    if os.name == "nt" and command[0] in ("npm", "npx"):
        return ["cmd", "/c", *command]
    return list(command)


def find_warning_lines(output: str, check: Check) -> list[str]:
    # Exception 2 applies only once Storybook itself reports a completed build.
    libuv_allowed = (
        check.name == "Storybook production build"
        and STORYBOOK_BUILD_SUCCESS_MARKER in output.lower()
    )
    flagged = []
    for line in output.splitlines():
        if not WARNING_PATTERN.search(line):
            continue
        if EBADENGINE_PATTERN.search(line):
            continue
        if libuv_allowed and LIBUV_TEARDOWN_PATTERN.search(line):
            continue
        flagged.append(line)
    return flagged


def run_check(check: Check) -> tuple[int | None, str, bool, str | None]:
    """Run one check with live output. Returns (exit code, output, timed_out, error)."""
    try:
        process = subprocess.Popen(
            host_command(check.command),
            cwd=REPO_ROOT / check.cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
            bufsize=1,
        )
    except OSError as error:
        return None, "", False, f"could not start the command: {error}"

    timed_out = False
    lines: list[str] = []

    def read_stream() -> None:
        assert process.stdout is not None
        for line in process.stdout:
            lines.append(line)
            print(line, end="", flush=True)

    reader = threading.Thread(target=read_stream, daemon=True)
    reader.start()
    deadline = time.monotonic() + check.timeout_seconds
    while process.poll() is None:
        if time.monotonic() >= deadline:
            timed_out = True
            terminate_tree(process)
            break
        time.sleep(0.25)
    reader.join(timeout=10)
    return process.returncode, "".join(lines), timed_out, None


def verify_service_status(output: str) -> str | None:
    lines = [line for line in output.splitlines() if line.strip()]
    if len(lines) <= 1:
        return "dev.ps1 status produced no service table"
    problems = []
    for service in SERVICE_NAMES:
        healthy = any(service in line and "(healthy)" in line for line in lines)
        if not healthy:
            problems.append(f"{service} is not running healthy")
    return "; ".join(problems) if problems else None


def run_process(checks: list[Check], check_fingerprint: str, start: int) -> int:
    total = len(checks)
    for index in range(start, total):
        check = checks[index]
        # State points at the check before its process starts, so an
        # interruption safely reruns this check.
        write_state(index, check_fingerprint)
        label = f"[{index + 1}/{total}] {check.name}"
        print(f"--- RUN {label} ({check.timeout_seconds}s timeout, cwd {check.cwd})")
        print(f"    {' '.join(host_command(check.command))}")
        started = time.monotonic()
        try:
            exit_code, output, timed_out, error = run_check(check)
        except KeyboardInterrupt:
            print(f"\nINTERRUPTED during {label}; the checkpoint still points at it, rerun to continue.")
            return 130
        if error:
            write_failure_log(check, error, "")
            print(f"FAIL {check.name}: {error}")
            print(f"Full output: {FAILURE_LOG_PATH}")
            return 1
        elapsed = time.monotonic() - started
        if timed_out:
            write_failure_log(check, f"timed out after {check.timeout_seconds}s", output)
            print(f"FAIL {check.name}: timed out after {check.timeout_seconds}s")
            print(f"Full output: {FAILURE_LOG_PATH}")
            return 1
        if exit_code is not None and exit_code != 0:
            # Exception 2: the Windows libuv teardown assertion can make the
            # build process exit nonzero after a successful build; accept only
            # when the success marker is present and nothing else is flagged.
            accept = (
                check.name == "Storybook production build"
                and STORYBOOK_BUILD_SUCCESS_MARKER in output.lower()
                and not find_warning_lines(output, check)
            )
            if not accept:
                write_failure_log(check, f"exit code {exit_code}", output)
                print(f"FAIL {check.name}: exit code {exit_code}")
                print(f"Full stdout and stderr: {FAILURE_LOG_PATH}")
                print("Fix this one issue, then run the same command again to resume at this check.")
                return 1
        warning_lines = find_warning_lines(output, check)
        if check.name == "Development service health":
            service_problem = verify_service_status(output)
            if service_problem:
                write_failure_log(check, service_problem, output)
                print(f"FAIL {check.name}: {service_problem}")
                print(f"Full output: {FAILURE_LOG_PATH}")
                return 1
        if warning_lines:
            write_failure_log(check, "warning output with successful exit", output)
            print(f"FAIL {check.name}: warning output with a zero exit code")
            for line in warning_lines:
                print(f"    warning: {line.rstrip()}")
            print(f"Full stdout and stderr: {FAILURE_LOG_PATH}")
            return 1
        print(f"--- PASS {label} ({elapsed:.1f}s)")
    # A completed run deletes the checkpoint and failure log.
    discard_state()
    print(FINISH_LINE)
    return 0


def write_failure_log(check: Check, reason: str, output: str) -> None:
    STAGE_DIR.mkdir(parents=True, exist_ok=True)
    header = (
        f"check: {check.name}\n"
        f"reason: {reason}\n"
        f"command: {' '.join(host_command(check.command))}\n"
        f"cwd: {check.cwd}\n"
        "--- stdout and stderr (merged) ---\n"
    )
    FAILURE_LOG_PATH.write_text(header + output, encoding="utf-8", errors="replace")


def main() -> int:
    for stream in (sys.stdout, sys.stderr):
        try:
            # Child output may contain characters the console's codepage
            # cannot encode (npm tree glyphs); keep the run alive by
            # replacing them instead of crashing the reader thread.
            stream.reconfigure(errors="replace")
        except (AttributeError, OSError):
            pass
    parser = argparse.ArgumentParser(description="Run the repository's full test, build, and quality process.")
    parser.add_argument("--list", action="store_true", help="show the authoritative ordered inventory without running it")
    parser.add_argument("--fresh", action="store_true", help="discard progress and start at check 1")
    parser.add_argument("--from", dest="start_from", metavar="CHECK", help="restart at one exact or uniquely matching check")
    args = parser.parse_args()

    checks = build_checks()
    check_fingerprint = fingerprint(checks)

    if args.list:
        for number, check in enumerate(checks, start=1):
            print(f"{number:2}. {check.name} (cwd {check.cwd}, timeout {check.timeout_seconds}s)")
            print(f"    {' '.join(host_command(check.command))}")
        return 0

    start = 0
    state = load_state()
    if args.start_from:
        matches = [i for i, c in enumerate(checks) if c.name.lower() == args.start_from.lower()]
        if not matches:
            matches = [i for i, c in enumerate(checks) if args.start_from.lower() in c.name.lower()]
            if len(matches) > 1:
                names = ", ".join(checks[i].name for i in matches)
                print(f"--from \"{args.start_from}\" matches several checks: {names}", file=sys.stderr)
                return 2
        if not matches:
            print(f"no check matches \"{args.start_from}\"", file=sys.stderr)
            return 2
        start = matches[0]
        try:
            FAILURE_LOG_PATH.unlink()
        except FileNotFoundError:
            pass
        print(f"Restarting at check {start + 1} ({checks[start].name}).")
    elif args.fresh:
        start = 0
        print("Starting fresh at check 1.")
    elif state and state.get("fingerprint") == check_fingerprint:
        candidate = state.get("check")
        if isinstance(candidate, int) and 0 <= candidate < len(checks):
            start = candidate
            print(f"Resuming at check {start + 1} ({checks[start].name}).")
        else:
            print("Checkpoint is invalid; starting from check 1.")
    elif state:
        print("Check inventory changed since the checkpoint; old checkpoint rejected, starting from check 1.")
    else:
        print("No checkpoint; starting from check 1.")

    return run_process(checks, check_fingerprint, start)


if __name__ == "__main__":
    sys.exit(main())
