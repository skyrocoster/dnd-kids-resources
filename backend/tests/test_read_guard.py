"""Tests for scripts/read_guard.py.

The guard exists because one waste class in docs/plans/telemetry-log.md survived every
order-side correction: an executor re-reading a file it had just edited, to verify an edit
the tool had already confirmed. Wording never fixed it, so the harness does.

The load-bearing test here is `test_both_harnesses_decide_identically`. The rule is
implemented once and reached from two different harnesses, and the whole point is that an
order behaves the same whichever executor picks it up — a rule that only bound Claude
sessions would be a rule that silently stopped applying half the time.
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


# --- payload builders, one per harness ------------------------------------------------


def claude_read(path: str, session: str = "s1") -> dict:
    return {"session_id": session, "tool_name": "Read", "tool_input": {"file_path": path}}


def claude_edit(path: str, session: str = "s1") -> dict:
    return {"session_id": session, "tool_name": "Edit", "tool_input": {"file_path": path}}


def claude_skill(session: str = "s1") -> dict:
    return {"session_id": session, "tool_name": "Skill", "tool_input": {"skill": "implement-order"}}


def claude_bash(output: str, session: str = "s1") -> dict:
    return {
        "session_id": session,
        "tool_name": "Bash",
        "tool_input": {"command": "npm run test:check"},
        "tool_response": {"stdout": output, "stderr": ""},
    }


def opencode_read(path: str, session: str = "s1") -> dict:
    return {"sessionID": session, "tool": "read", "args": {"filePath": path}}


def opencode_edit(path: str, session: str = "s1") -> dict:
    return {"sessionID": session, "tool": "edit", "args": {"filePath": path}}


def opencode_skill(session: str = "s1") -> dict:
    return {"sessionID": session, "tool": "skill", "args": {"name": "implement-order"}}


def opencode_bash(output: str, session: str = "s1") -> dict:
    return {
        "sessionID": session,
        "tool": "bash",
        "args": {"command": "npm run test:check"},
        "output": {"output": output},
    }


# --- the rule --------------------------------------------------------------------------


def test_unarmed_session_is_never_blocked(guard):
    """A planner session edits and re-reads freely; only order execution is policed."""
    guard._record_post(claude_edit("src/Tile.tsx"))
    allow, _ = guard._record_pre(claude_read("src/Tile.tsx"))
    assert allow is True


def test_post_edit_reread_is_denied_once_armed(guard):
    guard._record_post(claude_skill())
    guard._record_post(claude_edit("src/Tile.tsx"))
    allow, reason = guard._record_pre(claude_read("src/Tile.tsx"))
    assert allow is False
    assert "src/tile.tsx" in reason.lower()


def test_untouched_files_stay_readable(guard):
    guard._record_post(claude_skill())
    guard._record_post(claude_edit("src/Tile.tsx"))
    (guard.REPO_ROOT / "src" / "Other.tsx").write_text("x\n", encoding="utf-8")
    allow, _ = guard._record_pre(claude_read("src/Other.tsx"))
    assert allow is True


def test_failing_check_unlocks(guard):
    """A red STOP WHEN is the sanctioned reason to reopen an edited file."""
    guard._record_post(claude_skill())
    guard._record_post(claude_edit("src/Tile.tsx"))
    guard._record_post(claude_bash("Tests: 3 failed, 2 passed"))
    allow, _ = guard._record_pre(claude_read("src/Tile.tsx"))
    assert allow is True


def test_green_check_does_not_unlock(guard):
    """The exact case the guard is for: edit, check passes, reflexively re-read."""
    guard._record_post(claude_skill())
    guard._record_post(claude_edit("src/Tile.tsx"))
    guard._record_post(claude_bash("Tests: 0 failed, 91 passed | 11 known failures"))
    allow, _ = guard._record_pre(claude_read("src/Tile.tsx"))
    assert allow is False


def test_editing_again_relocks(guard):
    guard._record_post(claude_skill())
    guard._record_post(claude_edit("src/Tile.tsx"))
    guard._record_post(claude_bash("1 failed"))
    guard._record_post(claude_edit("src/Tile.tsx"))
    allow, _ = guard._record_pre(claude_read("src/Tile.tsx"))
    assert allow is False


def test_explicit_unlock_is_logged(guard):
    guard._record_post(claude_skill())
    guard._record_post(claude_edit("src/Tile.tsx"))
    assert guard._cmd_unlock("src/Tile.tsx", "need the imports back", "s1") == 0
    allow, _ = guard._record_pre(claude_read("src/Tile.tsx"))
    assert allow is True
    state = guard._load("s1")
    assert state["unlocks"][0]["reason"] == "need the imports back"


def test_env_switch_disables_the_guard(guard, monkeypatch):
    guard._record_post(claude_skill())
    guard._record_post(claude_edit("src/Tile.tsx"))
    monkeypatch.setenv("READ_GUARD", "off")
    allow, _ = guard._record_pre(claude_read("src/Tile.tsx"))
    assert allow is True


def test_files_outside_the_repo_are_not_policed(guard, tmp_path):
    outside = tmp_path.parent / "elsewhere.txt"
    outside.write_text("x\n", encoding="utf-8")
    guard._record_post(claude_skill())
    guard._record_post(claude_edit(str(outside)))
    allow, _ = guard._record_pre(claude_read(str(outside)))
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
    assert guard._looks_like_failure({"tool_response": {"stdout": output}}) is expected_failure


def test_both_harnesses_decide_identically(guard):
    """One rule, two transports. This is the guarantee, not an implementation detail."""
    for arm, edit, read, check in (
        (claude_skill, claude_edit, claude_read, claude_bash),
        (opencode_skill, opencode_edit, opencode_read, opencode_bash),
    ):
        session = "claude" if arm is claude_skill else "opencode"
        guard._record_post(arm(session))
        guard._record_post(edit("src/Tile.tsx", session))

        allow, _ = guard._record_pre(read("src/Tile.tsx", session))
        assert allow is False, f"{session}: post-edit re-read should be denied"

        guard._record_post(check("Tests: 0 failed, 91 passed", session))
        allow, _ = guard._record_pre(read("src/Tile.tsx", session))
        assert allow is False, f"{session}: a green check must not unlock"

        guard._record_post(check("Tests: 2 failed", session))
        allow, _ = guard._record_pre(read("src/Tile.tsx", session))
        assert allow is True, f"{session}: a red check must unlock"
