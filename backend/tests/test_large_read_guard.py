"""Tests for scripts/large_read_guard.py.

The sibling guard (scripts/read_guard.py) polices the executor. This one polices the
compiler: while `to-orders` is compiling a stage, opening a large file whole is the habit
that costs most, and the skill's own prose has never been able to stop it.

Two tests here are load-bearing. `test_both_harnesses_decide_identically` is the same
reason as in the sibling suite — the rule is implemented once and reached from two
harnesses, and a rule that only bound one of them would silently stop applying half the
time. `test_bounded_read_of_a_large_file_is_allowed` is the guard's whole point: it has no
opinion about large files, only about *unbounded* reads of them, and a version that
blocked the bounded route would leave the compiler with nowhere to go.
"""

from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]


def _import_large_read_guard():
    spec = importlib.util.spec_from_file_location(
        "large_read_guard_under_test", REPO_ROOT / "scripts" / "large_read_guard.py"
    )
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod


lrg = _import_large_read_guard()


@pytest.fixture()
def guard(tmp_path: Path, monkeypatch):
    """The guard, with its repo root and state directory pointed at a temp tree."""
    monkeypatch.setattr(lrg, "REPO_ROOT", tmp_path)
    monkeypatch.setattr(lrg, "STATE_DIR", tmp_path / ".telemetry" / "large-read-guard")
    monkeypatch.delenv("LARGE_READ_GUARD", raising=False)
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "Big.tsx").write_text("x\n" * 1000, encoding="utf-8")
    (tmp_path / "src" / "Small.tsx").write_text("x\n" * 50, encoding="utf-8")
    (tmp_path / "CLAUDE.md").write_text("x\n" * 1000, encoding="utf-8")
    (tmp_path / "docs").mkdir()
    (tmp_path / "docs" / "API_REFERENCE.md").write_text("x\n" * 1000, encoding="utf-8")
    return lrg


# --- payload builders, one per harness ------------------------------------------------


def claude_read(path: str, session: str = "s1", **extra) -> dict:
    return {
        "session_id": session,
        "tool_name": "Read",
        "tool_input": {"file_path": path, **extra},
    }


def claude_skill(session: str = "s1") -> dict:
    return {"session_id": session, "tool_name": "Skill", "tool_input": {"skill": "to-orders"}}


def opencode_read(path: str, session: str = "s1", **extra) -> dict:
    return {"sessionID": session, "tool": "read", "args": {"filePath": path, **extra}}


def opencode_skill(session: str = "s1") -> dict:
    return {"sessionID": session, "tool": "skill", "args": {"name": "to-orders"}}


def arm(guard, session: str = "s1") -> None:
    guard._record_post(claude_skill(session))


# --- arming ---------------------------------------------------------------------------


def test_unarmed_session_is_never_policed(guard):
    allow, _ = guard._record_pre(claude_read("src/Big.tsx"))
    assert allow is True


def test_the_compiler_skill_arms_the_session(guard):
    arm(guard)
    allow, reason = guard._record_pre(claude_read("src/Big.tsx"))
    assert allow is False
    assert "1001 lines" in reason


def test_arming_is_per_session(guard):
    arm(guard, "s1")
    allow, _ = guard._record_pre(claude_read("src/Big.tsx", session="s2"))
    assert allow is True


def test_reading_the_skill_file_arms_the_session(guard):
    # opencode's `/to-orders` slash command under the default agent fired no `skill` tool
    # event at all — it just read SKILL.md, and the guard slept through a whole compile.
    guard._record_post(opencode_read(".claude/skills/to-orders/SKILL.md"))
    allow, _ = guard._record_pre(claude_read("src/Big.tsx"))
    assert allow is False


def test_catting_the_skill_file_arms_the_session(guard):
    guard._record_post(
        {
            "sessionID": "s1",
            "tool": "bash",
            "args": {"command": "cat .claude/skills/to-orders/SKILL.md"},
        }
    )
    allow, _ = guard._record_pre(claude_read("src/Big.tsx"))
    assert allow is False


def test_reading_another_skills_file_does_not_arm(guard):
    guard._record_post(opencode_read(".claude/skills/reconcile/SKILL.md"))
    allow, _ = guard._record_pre(claude_read("src/Big.tsx"))
    assert allow is True


def test_an_unrelated_skill_does_not_arm(guard):
    guard._record_post(
        {"session_id": "s1", "tool_name": "Skill", "tool_input": {"skill": "reconcile"}}
    )
    allow, _ = guard._record_pre(claude_read("src/Big.tsx"))
    assert allow is True


# --- the rule -------------------------------------------------------------------------


def test_bounded_read_of_a_large_file_is_allowed(guard):
    arm(guard)
    allow, _ = guard._record_pre(claude_read("src/Big.tsx", offset=860, limit=60))
    assert allow is True


def test_a_window_wider_than_the_threshold_is_not_a_bound(guard):
    arm(guard)
    allow, _ = guard._record_pre(claude_read("src/Big.tsx", limit=2000))
    assert allow is False


def test_small_files_are_read_whole(guard):
    arm(guard)
    allow, _ = guard._record_pre(claude_read("src/Small.tsx"))
    assert allow is True


def test_routing_documents_are_exempt_however_long(guard):
    arm(guard)
    allow, _ = guard._record_pre(claude_read("CLAUDE.md"))
    assert allow is True


def test_a_long_reference_document_is_not_exempt(guard):
    arm(guard)
    allow, _ = guard._record_pre(claude_read("docs/API_REFERENCE.md"))
    assert allow is False


def test_a_file_outside_the_repo_is_not_ours_to_police(guard, tmp_path):
    arm(guard)
    outside = tmp_path.parent / "elsewhere.tsx"
    outside.write_text("x\n" * 1000, encoding="utf-8")
    allow, _ = guard._record_pre(claude_read(str(outside)))
    assert allow is True


def test_a_missing_file_is_allowed_through(guard):
    arm(guard)
    allow, _ = guard._record_pre(claude_read("src/Nope.tsx"))
    assert allow is True


def test_the_deny_message_names_the_three_routes(guard):
    arm(guard)
    _, reason = guard._record_pre(claude_read("src/Big.tsx"))
    assert "explore-deepseek" in reason
    assert "check_orders.py --fix" in reason
    assert "--unlock" in reason


def test_the_deny_message_keeps_the_path_as_written(guard):
    """The state key is case-folded; a path pasted into --unlock must not be."""
    arm(guard)
    _, reason = guard._record_pre(claude_read("src/Big.tsx"))
    assert "src/Big.tsx" in reason


# --- shell bypass ---------------------------------------------------------------------


def test_a_bare_cat_is_the_same_read(guard):
    arm(guard)
    allow, _ = guard._record_pre(
        {"session_id": "s1", "tool_name": "Bash", "tool_input": {"command": "cat src/Big.tsx"}}
    )
    assert allow is False


@pytest.mark.parametrize(
    "command",
    [
        "cat src/Big.tsx | head -40",
        "sed -n '10,40p' src/Big.tsx",
        "grep -n RoomLabel src/Big.tsx",
        "Get-Content src/Big.tsx -TotalCount 40",
    ],
)
def test_a_bounded_shell_read_is_allowed(guard, command):
    arm(guard)
    allow, _ = guard._record_pre(
        {"session_id": "s1", "tool_name": "Bash", "tool_input": {"command": command}}
    )
    assert allow is True


# --- escape hatches -------------------------------------------------------------------


def test_the_env_switch_disables_the_guard(guard, monkeypatch):
    arm(guard)
    monkeypatch.setenv("LARGE_READ_GUARD", "off")
    allow, _ = guard._record_pre(claude_read("src/Big.tsx"))
    assert allow is True


def test_an_explicit_unlock_lets_one_file_through(guard):
    arm(guard)
    assert guard._record_pre(claude_read("src/Big.tsx"))[0] is False
    guard._cmd_unlock("src/Big.tsx", "judging its shape", "s1")
    assert guard._record_pre(claude_read("src/Big.tsx"))[0] is True
    # ...and only that file.
    (guard.REPO_ROOT / "src" / "Other.tsx").write_text("x\n" * 1000, encoding="utf-8")
    assert guard._record_pre(claude_read("src/Other.tsx"))[0] is False


def test_an_unlock_is_logged_with_its_reason(guard):
    arm(guard)
    guard._cmd_unlock("src/Big.tsx", "judging its shape", "s1")
    state = guard._load("s1")
    assert state["unlocks"][0]["reason"] == "judging its shape"


# --- the load-bearing one -------------------------------------------------------------


@pytest.mark.parametrize(
    ("skill_payload", "read_payload", "bounded_payload"),
    [
        (claude_skill("c1"), claude_read("src/Big.tsx", "c1"), claude_read("src/Big.tsx", "c1", limit=50)),
        (opencode_skill("o1"), opencode_read("src/Big.tsx", "o1"), opencode_read("src/Big.tsx", "o1", limit=50)),
    ],
    ids=["claude", "opencode"],
)
def test_both_harnesses_decide_identically(guard, skill_payload, read_payload, bounded_payload):
    assert guard._record_pre(read_payload)[0] is True  # unarmed
    guard._record_post(skill_payload)
    assert guard._record_pre(read_payload)[0] is False  # armed, unbounded
    assert guard._record_pre(bounded_payload)[0] is True  # armed, bounded


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"session_id": "s1", "tool_name": "Read"},
        {"session_id": "s1", "tool_name": "Read", "tool_input": {}},
        {"session_id": "s1", "tool_name": "Read", "tool_input": {"file_path": ""}},
    ],
    ids=["empty", "no-input", "no-path", "blank-path"],
)
def test_a_malformed_payload_resolves_to_allow(guard, payload):
    """A guard that can break the harness is worse than a guard that misses a read."""
    arm(guard)
    assert guard._record_pre(payload)[0] is True


def test_an_unreadable_target_resolves_to_allow(guard, monkeypatch):
    monkeypatch.setattr(guard, "_line_count", lambda _: None)
    arm(guard)
    assert guard._record_pre(claude_read("src/Big.tsx"))[0] is True
