"""Tests for the two check wrappers, scripts/stage_check.py and scripts/order_check.py.

Both exist to turn a thousand tokens of runner output into one readable line, which makes
their output parsing the whole product — and it is exactly where both of them were wrong
first time. `stage_check` crashed on a `✓` under a cp1252 console *after* running all five
checks, and reported pytest's column-aligned coverage row instead of the test counts;
`order_check` read npm's `frontend@0.0.0 test:check` banner as "0 test" and led every
summary with a number that did not exist.

None of those are caught by running the wrappers — they all pass. So the parsers are
tested against captured real output instead.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def _import(name: str):
    spec = importlib.util.spec_from_file_location(
        f"{name}_under_test", REPO_ROOT / "scripts" / f"{name}.py"
    )
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    # `@dataclass` resolves its own module out of sys.modules, so registration has to
    # happen before the module body runs, not after.
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    return mod


stage_check = _import("stage_check")
order_check = _import("order_check")


# Captured verbatim from real runs in this repo.
PYTEST_OUTPUT = """\
TOTAL                                   2217     61    97%
Required test coverage of 97% reached. Total coverage: 97.25%
624 passed in 73.34s (0:01:13)
"""
FRONTEND_OUTPUT = """\
> frontend@0.0.0 test:check
> node scripts/test-check.mjs --strict

test:check — 1380 tests, 10 failing, 10 of them already known.

test:check PASS — no new failures.
"""
BUILD_OUTPUT = "\x1b[32m✓ built in 526ms\x1b[39m\n"
VITEST_FAILURE_OUTPUT = """\
 FAIL  src/features/x/__tests__/y.test.tsx > fullscreen > centres the map
AssertionError: expected 224 to be 0
"""


def _check(key: str, output: str) -> stage_check.Check:
    check = stage_check.Check(
        key=key, label=key, command="x", cwd=REPO_ROOT, telemetry=key, passed=True
    )
    check.signals = stage_check._signal_lines(key, output)
    return check


def test_ansi_and_column_padding_are_stripped():
    assert stage_check._clean("\x1b[32m✓ built  in   526ms\x1b[39m") == "✓ built in 526ms"
    assert stage_check._clean("TOTAL      2217     61    97%") == "TOTAL 2217 61 97%"


def test_pytest_telemetry_prefers_counts_over_the_coverage_row():
    """The coverage row matches first by position; it is not what belongs in the log."""
    detail = stage_check._primary(_check("backend", PYTEST_OUTPUT))
    assert detail.startswith("624 passed")
    assert "Total coverage: 97.25%" in detail


def test_frontend_telemetry_carries_the_known_failure_count():
    detail = stage_check._primary(_check("frontend", FRONTEND_OUTPUT))
    assert "1380 tests, 10 failing" in detail
    assert "10 of them already known" in detail


def test_build_signal_survives_a_colourised_console():
    detail = stage_check._primary(_check("build", BUILD_OUTPUT))
    assert detail == "✓ built in 526ms"
    assert "\x1b" not in detail


def test_telemetry_line_is_one_line_and_names_every_check():
    checks = [_check("backend", PYTEST_OUTPUT), _check("frontend", FRONTEND_OUTPUT)]
    line = stage_check.telemetry_line(checks)
    assert line.startswith("- stage checks: ")
    assert "\n" not in line
    assert "backend: pass" in line and "frontend: pass" in line


def test_failing_check_is_marked_in_the_telemetry_line():
    check = _check("backend", PYTEST_OUTPUT)
    check.passed = False
    assert "backend: FAIL" in stage_check.telemetry_line([check])


def test_npm_banner_is_not_read_as_a_test_count():
    """`frontend@0.0.0 test:check` parsed as "0 test" before the lookbehind was added."""
    counts = order_check.COUNT_RE.findall(FRONTEND_OUTPUT)
    assert ("0", "test") not in counts
    assert ("1380", "tests") in counts


def test_order_check_names_the_failing_test():
    names = order_check.named_failures(VITEST_FAILURE_OUTPUT)
    assert names
    assert "fullscreen > centres the map" in names[0]


def test_order_check_names_a_failing_pytest_node():
    names = order_check.named_failures("FAILED backend/tests/test_x.py::test_y - boom\n")
    assert names == ["backend/tests/test_x.py::test_y"]


def test_order_check_reports_a_typescript_error_location():
    names = order_check.named_failures("src/x.tsx:31:5 - error TS2345: nope\n")
    assert names and "src/x.tsx" in names[0]


# --- vitest filters are matched from frontend/ -------------------------------------------
#
# An order that wrote `frontend/src/...` matched no test file at all. The runner already
# refuses to call an empty run a pass; the wrapper now refuses to start one.


def test_frontend_prefix_is_stripped_from_a_filter():
    runnable, complaints = order_check.frontend_test_paths(
        ["frontend/src/player/__tests__/PlayerShell.test.tsx"]
    )
    assert runnable == ["src/player/__tests__/PlayerShell.test.tsx"]
    assert any("relative to frontend/" in line for line in complaints)


def test_an_already_relative_filter_is_left_alone():
    runnable, complaints = order_check.frontend_test_paths(
        ["src/player/__tests__/PlayerShell.test.tsx"]
    )
    assert runnable == ["src/player/__tests__/PlayerShell.test.tsx"]
    assert complaints == []


def test_a_filter_that_matches_no_file_is_named():
    _, complaints = order_check.frontend_test_paths(["src/player/__tests__/NotThere.test.tsx"])
    assert any(line.startswith("  missing:") for line in complaints)
