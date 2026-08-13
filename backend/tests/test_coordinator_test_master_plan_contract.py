"""Contract tests for experimental master-plan assessment routing."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def test_assessment_defines_master_plan_gate_and_compact_envelope():
    text = read(".opencode/skills/assess-case-test/SKILL.md")
    flat = " ".join(text.split())
    for phrase in (
        "## `DIRECT-CANDIDATE`",
        "## `PLAN-CANDIDATE`",
        "## `MASTER-PLAN-CANDIDATE`",
        "at least two independently reviewable and independently selectable",
        "Crossing product surfaces, capabilities, or owning areas is supporting evidence",
        "The words “plan” and “master plan” in the request do not select a route.",
        "A large single outcome remains a focused Plan.",
        "RESULT: MASTER-PLAN-CANDIDATE",
        "CANDIDATE SLICES",
        "EXISTING COVERAGE",
        "normal to-plan",
    ):
        assert phrase in flat


def test_master_plan_assessment_is_recommendation_only():
    text = read(".opencode/skills/assess-case-test/SKILL.md")
    flat = " ".join(text.split())
    for phrase in (
        "write or refine a master plan",
        "create a focused Plan",
        "compile orders",
        "recommendation-only",
    ):
        assert phrase in flat


def test_each_candidate_keeps_its_envelope_with_its_route():
    text = read(".opencode/skills/assess-case-test/SKILL.md")
    direct = text.index("## `DIRECT-CANDIDATE`")
    plan = text.index("## `PLAN-CANDIDATE`")
    master = text.index("## `MASTER-PLAN-CANDIDATE`")
    non_candidate = text.index("## Non-candidate results")

    assert direct < text.index("RESULT: DIRECT-CANDIDATE") < plan
    assert plan < text.index("RESULT: PLAN-CANDIDATE") < master
    assert master < text.index("RESULT: MASTER-PLAN-CANDIDATE") < non_candidate


def test_workflow_allows_recommendation_but_preserves_stop_boundary():
    text = read(".opencode/skills/coordinator-test-workflow/SKILL.md")
    assert "Assessment may recommend `MASTER-PLAN-CANDIDATE`" in text
    assert "never authors, writes, implements, or routes downstream master-plan work" in text
    assert "normal" in text and "`to-plan` routing" in text
    assert "Do not introduce MASTER-PLAN behavior" not in text
