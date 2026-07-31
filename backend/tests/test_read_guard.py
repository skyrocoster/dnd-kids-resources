"""Tests for scripts/read_guard.py.

The guard exists because one waste class in docs/plans/telemetry-log.md survived every
order-side correction: an executor re-reading a file it had just edited, to verify an edit
the tool had already confirmed. Wording never fixed it, so the harness does.

The load-bearing tests here are the opencode hook-shape regressions at the bottom. The
guard is reached only through `.opencode/plugin/read-guard.js`, and a version that reads
the wrong field off the plugin's payload silently stops applying to every opencode
executor — which is worse than no guard at all.
"""

from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]


def _import_read_guard():
    spec = importlib.util.spec_from_file_location(
        "read_guard_under_test", REPO_ROOT / "scripts" / "read_guard.py"
    )
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod


rg = _import_read_guard()


@pytest.fixture()
def guard(tmp_path: Path, monkeypatch):
    """The guard, with its repo root and state directory pointed at a temp tree."""
    monkeypatch.setattr(rg, "REPO_ROOT", tmp_path)
    monkeypatch.setattr(rg, "STATE_DIR", tmp_path / ".telemetry" / "read-guard")
    monkeypatch.delenv("READ_GUARD", raising=False)
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "Tile.tsx").write_text("export const Tile = 1\n", encoding="utf-8")
    return rg


# --- payload builders, in the shape `.opencode/plugin/read-guard.js` sends ------------


def opencode_read(path: str, session: str = "s1") -> dict:
    return {"sessionID": session, "tool": "read", "args": {"filePath": path}}


def opencode_edit(path: str, session: str = "s1") -> dict:
    return {"sessionID": session, "tool": "edit", "args": {"filePath": path}}


def opencode_skill(session: str = "s1") -> dict:
    return {"sessionID": session, "tool": "skill", "args": {"name": "implement-order"}}


def opencode_quick_skill(session: str = "s1") -> dict:
    return {"sessionID": session, "tool": "skill", "args": {"name": "implement-quick"}}


def opencode_bash(
    output: str,
    session: str = "s1",
    command: str = "npm run test:check",
) -> dict:
    return {
        "sessionID": session,
        "tool": "bash",
        "args": {"command": command},
        "output": {"output": output},
    }


# --- the rule --------------------------------------------------------------------------


def test_unarmed_session_is_never_blocked(guard):
    """A planner session edits and re-reads freely; only order execution is policed."""
    guard._record_post(opencode_edit("src/Tile.tsx"))
    allow, _ = guard._record_pre(opencode_read("src/Tile.tsx"))
    assert allow is True


def test_post_edit_reread_is_denied_once_armed(guard):
    guard._record_post(opencode_skill())
    guard._record_post(opencode_edit("src/Tile.tsx"))
    allow, reason = guard._record_pre(opencode_read("src/Tile.tsx"))
    assert allow is False
    assert "src/tile.tsx" in reason.lower()


def test_untouched_files_stay_readable(guard):
    guard._record_post(opencode_skill())
    guard._record_post(opencode_edit("src/Tile.tsx"))
    (guard.REPO_ROOT / "src" / "Other.tsx").write_text("x\n", encoding="utf-8")
    allow, _ = guard._record_pre(opencode_read("src/Other.tsx"))
    assert allow is True


def test_failing_check_unlocks(guard):
    """A red STOP WHEN is the sanctioned reason to reopen an edited file."""
    guard._record_post(opencode_skill())
    guard._record_post(opencode_edit("src/Tile.tsx"))
    guard._record_post(opencode_bash("Tests: 3 failed, 2 passed"))
    allow, _ = guard._record_pre(opencode_read("src/Tile.tsx"))
    assert allow is True


def test_green_check_does_not_unlock(guard):
    """The exact case the guard is for: edit, check passes, reflexively re-read."""
    guard._record_post(opencode_skill())
    guard._record_post(opencode_edit("src/Tile.tsx"))
    guard._record_post(opencode_bash("Tests: 0 failed, 91 passed | 11 known failures"))
    allow, _ = guard._record_pre(opencode_read("src/Tile.tsx"))
    assert allow is False


def test_quick_executor_is_armed(guard):
    guard._record_post(opencode_quick_skill())
    guard._record_post(opencode_edit("src/Tile.tsx"))
    allow, _ = guard._record_pre(opencode_read("src/Tile.tsx"))
    assert allow is False


def test_second_failed_check_blocks_further_work(guard):
    guard._record_post(opencode_skill())
    guard._record_post(opencode_edit("src/Tile.tsx"))
    guard._record_post(opencode_bash("Tests: 1 failed"))
    guard._record_post(opencode_edit("src/Tile.tsx"))
    guard._record_post(opencode_bash("Tests: 1 failed"))

    for payload in (
        opencode_read("src/Tile.tsx"),
        opencode_edit("src/Tile.tsx"),
        {"sessionID": "s1", "tool": "grep", "args": {"pattern": "Tile"}},
        {"sessionID": "s1", "tool": "bash", "args": {"command": "npm run test:check"}},
    ):
        allow, reason = guard._record_pre(payload)
        assert allow is False
        assert "two failed verification runs" in reason


def test_attempt_limit_allows_work_order_failure_report(guard):
    order = guard.REPO_ROOT / "docs" / "plans" / "active" / "feature" / "01-change.md"
    order.parent.mkdir(parents=True)
    order.write_text("STATUS:\n", encoding="utf-8")
    guard._record_post(opencode_skill())
    guard._record_post(opencode_bash("1 failed"))
    guard._record_post(opencode_bash("1 failed"))

    allow, _ = guard._record_pre(opencode_edit(str(order)))
    assert allow is True


def test_non_verification_shell_failures_do_not_consume_attempts(guard):
    guard._record_post(opencode_skill())
    guard._record_post(opencode_bash("fatal: not a git repository", command="git status"))
    guard._record_post(opencode_bash("fatal: not a git repository", command="git status"))
    state = guard._load("s1")
    assert state["failed_checks"] == 0


def test_first_failed_check_still_allows_repair(guard):
    guard._record_post(opencode_skill())
    guard._record_post(opencode_bash("Tests: 1 failed"))
    allow, _ = guard._record_pre(opencode_edit("src/Tile.tsx"))
    assert allow is True


def test_editing_again_relocks(guard):
    guard._record_post(opencode_skill())
    guard._record_post(opencode_edit("src/Tile.tsx"))
    guard._record_post(opencode_bash("1 failed"))
    guard._record_post(opencode_edit("src/Tile.tsx"))
    allow, _ = guard._record_pre(opencode_read("src/Tile.tsx"))
    assert allow is False


def test_explicit_unlock_is_logged(guard):
    guard._record_post(opencode_skill())
    guard._record_post(opencode_edit("src/Tile.tsx"))
    assert guard._cmd_unlock("src/Tile.tsx", "need the imports back", "s1") == 0
    allow, _ = guard._record_pre(opencode_read("src/Tile.tsx"))
    assert allow is True
    state = guard._load("s1")
    assert state["unlocks"][0]["reason"] == "need the imports back"


def test_env_switch_disables_the_guard(guard, monkeypatch):
    guard._record_post(opencode_skill())
    guard._record_post(opencode_edit("src/Tile.tsx"))
    monkeypatch.setenv("READ_GUARD", "off")
    allow, _ = guard._record_pre(opencode_read("src/Tile.tsx"))
    assert allow is True


def test_files_outside_the_repo_are_not_policed(guard, tmp_path):
    outside = tmp_path.parent / "elsewhere.txt"
    outside.write_text("x\n", encoding="utf-8")
    guard._record_post(opencode_skill())
    guard._record_post(opencode_edit(str(outside)))
    allow, _ = guard._record_pre(opencode_read(str(outside)))
    assert allow is True


@pytest.mark.parametrize(
    "output,expected_failure",
    [
        ("Tests: 3 failed, 2 passed", True),
        ("Traceback (most recent call last):", True),
        ("src/x.ts:3:1 - error TS2345: nope", True),
        ("Tests: 0 failed, 91 passed", False),
        ("1348 tests, 11 known failures, 0 new", False),
        ("All checks pass.", False),
    ],
)
def test_failure_detection(guard, output, expected_failure):
    assert guard._looks_like_failure({"output": {"output": output}}) is expected_failure


def test_opencode_lifecycle_is_policed_end_to_end(guard):
    """One harness now. The whole rule walks: arm, edit, deny, green stays, red unlocks."""
    session = "o1"
    guard._record_post(opencode_skill(session))
    guard._record_post(opencode_edit("src/Tile.tsx", session))

    allow, _ = guard._record_pre(opencode_read("src/Tile.tsx", session))
    assert allow is False, "post-edit re-read should be denied"

    guard._record_post(opencode_bash("Tests: 0 failed, 91 passed", session))
    allow, _ = guard._record_pre(opencode_read("src/Tile.tsx", session))
    assert allow is False, "a green check must not unlock"

    guard._record_post(opencode_bash("Tests: 2 failed", session))
    allow, _ = guard._record_pre(opencode_read("src/Tile.tsx", session))
    assert allow is True, "a red check must unlock"


# --- transport wiring -------------------------------------------------------------------
#
# The rule above was correct for a whole telemetry cycle while the guard did nothing at all
# under opencode: the plugin read `args` off the wrong object in the post hook, so every
# post payload arrived empty, the session never armed, and no edited file was ever locked.
# Payload-level tests could not see it because they build the payload themselves. These
# assert the plugin's side of the contract instead.


PLUGIN = REPO_ROOT / ".opencode" / "plugin" / "read-guard.js"


def _hook_body(name: str) -> str:
    source = PLUGIN.read_text(encoding="utf-8")
    start = source.index(f'"{name}"')
    end = source.find('"tool.execute.', start + 1)
    return source[start : end if end != -1 else len(source)]


def test_opencode_plugin_is_tracked():
    assert PLUGIN.is_file(), "the opencode half of the guard must stay in the repo"


def test_post_hook_forwards_the_arguments_object():
    """`tool.execute.after` carries args on `input`; `output` there holds the result."""
    body = _hook_body("tool.execute.after")
    assert "input.args" in body, (
        "the post hook must forward input.args — forwarding output.args sends an empty "
        "object, which silently disarms the guard for every opencode executor"
    )


def test_pre_hook_forwards_the_arguments_object():
    """`tool.execute.before` is the mirror image: args live on `output`."""
    body = _hook_body("tool.execute.before")
    assert "output.args" in body


def test_empty_arguments_never_arm_or_lock(guard):
    """What the broken wiring produced, stated as behaviour rather than as source."""
    guard._record_post({"sessionID": "s1", "tool": "skill", "args": {}})
    guard._record_post({"sessionID": "s1", "tool": "edit", "args": {}})
    allow, _ = guard._record_pre(opencode_read("src/Tile.tsx"))
    assert allow is True
