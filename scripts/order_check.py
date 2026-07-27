#!/usr/bin/env python
"""STOP WHEN wrapper: run an order's checks and print only what the executor can act on.

Same argument as `stage_check.py`, one level down. A work order's STOP WHEN runs a vitest
subset and often a typecheck and a lint, and every one of those dumps its full output into
the executor's context — repeatedly, because the checks re-run after each fix attempt. In
the measured runs those results were routinely the largest single tool result of the whole
order.

A green check needs one line. A red check needs the failing test names and enough tail to
diagnose, not the whole run. That is all this prints.

    python scripts/order_check.py --tests src/features/x/__tests__/y.test.tsx
    python scripts/order_check.py --tests <path> --typecheck --lint
    python scripts/order_check.py --pytest backend/tests/test_thing.py
    python scripts/order_check.py --tests <path> --docs

Exit code is 1 if any check failed, so it drops straight into a STOP WHEN command.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
FRONTEND = REPO_ROOT / "frontend"

# Runner output carries ✓/× freely; a Windows console defaults to cp1252 and would crash
# on them while reporting a failure — exactly when the executor needs the output.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

MAX_TAIL_LINES = 20
MAX_NAMED_FAILURES = 10

# What "this test failed" looks like in each runner.
FAILURE_NAME_RES = (
    re.compile(r"^\s*(?:FAIL|×|✕)\s+(.+)$", re.MULTILINE),
    re.compile(r"^FAILED (\S+.*?)(?: - |$)", re.MULTILINE),
    re.compile(r"^\s*(.+\.tsx?):(\d+):(\d+)\s+-\s+error TS\d+", re.MULTILINE),
)
# The lookbehind matters: without it the npm banner line `frontend@0.0.0 test:check`
# parses as "0 test" and leads every summary with a fictional count.
COUNT_RE = re.compile(
    r"(?<![\w.])(\d+) (passed|failed|failing|tests?|known failures?)\b", re.IGNORECASE
)


def run(label: str, command: str | list[str], cwd: Path, shell: bool) -> tuple[bool, str, str]:
    try:
        completed = subprocess.run(
            command,
            cwd=cwd,
            shell=shell,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
    except OSError as exc:
        return False, f"{label}: could not run ({exc})", ""
    output = (completed.stdout or "") + "\n" + (completed.stderr or "")
    passed = completed.returncode == 0

    counts = ", ".join(f"{n} {word}" for n, word in COUNT_RE.findall(output)[:3])
    summary = f"{label}: {'pass' if passed else 'FAIL'}" + (f" ({counts})" if counts else "")
    return passed, summary, output


def named_failures(output: str) -> list[str]:
    names: list[str] = []
    for pattern in FAILURE_NAME_RES:
        for match in pattern.finditer(output):
            name = match.group(1).strip()
            if name and name not in names:
                names.append(name)
    return names[:MAX_NAMED_FAILURES]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tests", nargs="*", default=[], help="Frontend test paths (vitest)")
    parser.add_argument("--pytest", nargs="*", default=[], help="Backend test paths or node ids")
    parser.add_argument("--typecheck", action="store_true", help="Run npm run typecheck")
    parser.add_argument("--lint", action="store_true", help="Run npm run lint")
    parser.add_argument("--docs", action="store_true", help="Run check_docs.py --check")
    parser.add_argument(
        "--strict", action="store_true", help="Pass --strict to the frontend runner"
    )
    args = parser.parse_args()

    jobs: list[tuple[str, str | list[str], Path, bool]] = []
    if args.tests:
        flags = "--strict " if args.strict else ""
        jobs.append(
            ("tests", f"npm run test:check -- {flags}{' '.join(args.tests)}", FRONTEND, True)
        )
    if args.pytest:
        jobs.append(
            ("pytest", [sys.executable, "-m", "pytest", "--no-cov", *args.pytest], REPO_ROOT, False)
        )
    if args.typecheck:
        jobs.append(("typecheck", "npm run typecheck", FRONTEND, True))
    if args.lint:
        jobs.append(("lint", "npm run lint", FRONTEND, True))
    if args.docs:
        jobs.append(
            ("docs", [sys.executable, str(REPO_ROOT / "scripts" / "check_docs.py"), "--check"], REPO_ROOT, False)
        )

    if not jobs:
        parser.error("nothing to run: pass --tests, --pytest, --typecheck, --lint or --docs")

    failed = False
    for label, command, cwd, shell in jobs:
        passed, summary, output = run(label, command, cwd, shell)
        print(summary)
        if passed:
            continue
        failed = True
        for name in named_failures(output):
            print(f"  failing: {name}")
        tail = output.strip().splitlines()[-MAX_TAIL_LINES:]
        print("  --- last output ---")
        for line in tail:
            print(f"  {line}")
        # A failing check is the sanctioned reason to reopen an edited file.
        break

    print("STOP WHEN: " + ("FAILED" if failed else "passed"))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
