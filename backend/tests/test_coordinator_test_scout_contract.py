"""Deterministic contract tests for coordinator grilling and factual scouting."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def test_workflow_delays_assessment_and_excludes_master_plan():
    text = read(".opencode/skills/coordinator-test-workflow/SKILL.md")
    assert "invoke `grilling` and follow its design-tree protocol before assessment" in text
    assert "invoke the `scout-case-test` agent" in text
    assert "`assess-case-test`" in text
    assert "Assessment may recommend `MASTER-PLAN-CANDIDATE`" in text


def test_coordinator_uses_scout_first_single_question_grilling():
    workflow = read(".opencode/skills/coordinator-test-workflow/SKILL.md")
    coordinator = read(".opencode/agents/coordinatorTest.md")
    grilling = read(".opencode/skills/grilling/SKILL.md")

    for phrase in (
        "invoke the `scout-case-test` agent with one bounded lookup before asking",
        "ask exactly one dependency-ready frontier",
        "recommendation is not the user's answer",
        "initial scout is not a one-time gate",
        "another bounded lookup",
        "pending fact lookup",
        "explicit confirmation",
    ):
        assert phrase in workflow
    assert '"grilling": allow' in coordinator
    assert "invoke `grilling`" in coordinator
    assert "Ask exactly one question per assistant turn" in grilling
    assert "Never answer a question on the user's behalf" in grilling
    assert "Options: **A.**" in grilling
    assert "Do not plan implementation" in grilling


def test_scout_is_a_read_only_deepseek_agent():
    scout = read(".opencode/agents/scout-case-test.md")
    caseworker = read(".opencode/agents/coordinator-test-caseworker.md")
    for phrase in ("opencode-go/deepseek-v4-flash", "VERIFIED FACTS", "ABSENT EVIDENCE",
                   "CONTRADICTIONS", "Do not diagnose", "ask questions", "edit files"):
        assert phrase in scout
    assert "edit: deny" in scout
    assert "task: deny" in scout
    assert "scout-case-test" not in caseworker
    assert not (ROOT / ".opencode/skills/scout-case-test/SKILL.md").exists()


def test_verbose_record_is_conditional_and_review_only():
    text = read(".opencode/skills/coordinator-test-workflow/SKILL.md")
    for phrase in ("At least four confirmed decisions", "explicit user request",
                   "complete verbose record", "decision and its reason",
                   "explicit safe target path", "never invent a persistent location",
                   "neither a Plan nor"):
        assert phrase in text


def test_retained_caseworker_has_runtime_context_budget_gate():
    workflow = read(".opencode/skills/coordinator-test-workflow/SKILL.md")
    coordinator = read(".opencode/agents/coordinatorTest.md")
    plugin = read(".opencode/plugin/context-budget.js")

    for phrase in ("Before every retained `coordinator-test-caseworker` resume",
                   "From 120k through 199,999", "At 200k or above",
                   "`ROLLOVER` is the hard default", "CONTEXT DECISION",
                   "Do not transfer the transcript"):
        assert phrase in workflow
    assert "context_budget: allow" in coordinator
    assert "Before every retained case-worker resume" in coordinator
    for phrase in ("client.session.messages", "latest.tokens.input + latest.tokens.cache.read",
                   "WARNING_TOKENS = 100_000", "DECISION_TOKENS = 120_000",
                   "ROLLOVER_TOKENS = 200_000", 'status = "DECISION-REQUIRED"',
                   'status = "ROLLOVER-DEFAULT"', 'status: "UNAVAILABLE"'):
        assert phrase in plugin
