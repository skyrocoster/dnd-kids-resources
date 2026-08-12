"""Contract tests for the Luna-only experimental order-authoring lifecycle."""

from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
SKILL = REPO_ROOT / ".opencode/skills/coordinator-test-order-author/SKILL.md"
WORKFLOW = REPO_ROOT / ".opencode/skills/coordinator-test-workflow/SKILL.md"
CASEWORKER = REPO_ROOT / ".opencode/agents/coordinator-test-caseworker.md"
COORDINATOR = REPO_ROOT / ".opencode/agents/coordinatorTest.md"
STRONG_HOST = REPO_ROOT / ".opencode/agents/coordinator-test-order-author.md"
PRODUCTION_SKILL = REPO_ROOT / ".opencode/skills/author-workorders/SKILL.md"


def text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_specialized_strong_host_is_not_an_active_route():
    assert not STRONG_HOST.exists()
    combined = "\n".join(text(path) for path in (SKILL, WORKFLOW, CASEWORKER, COORDINATOR))
    assert "strong compiler" not in combined.lower()
    assert "invoke the specialized" not in combined.lower()
    assert "launch `coordinator-test-order-author`" not in combined.lower()
    assert "stronger-model variants" in combined
    assert "deferred" in combined.lower()


def test_warm_and_fresh_luna_sessions_invoke_the_same_skill():
    skill = text(SKILL)
    workflow = text(WORKFLOW)
    caseworker = text(CASEWORKER)

    assert "**warm**" in skill and "**fresh**" in skill
    assert "retained `coordinator-test-caseworker`" in workflow
    assert "new `coordinator-test-caseworker`" in workflow
    assert "The skill and protocol are identical" in workflow
    assert '"coordinator-test-order-author": allow' in caseworker
    assert "PHASE: AUTHOR ORDERS" in caseworker


def test_shared_skill_preserves_frontier_gates_and_classifications():
    skill = text(SKILL)
    workflow = text(WORKFLOW)

    for classification in ("`ZERO`", "`ONE`", "`MULTIPLE`", "`UNDER-CAPTURED`"):
        assert classification in skill
    assert "a one-order Plan is valid" in skill
    assert "Never split" in skill
    assert "one frontier correction" in skill
    assert "one approved `WRITE`" in skill
    assert "one deterministic generator/checker" in skill
    assert "Preserve proposal-to-write continuity" in skill
    assert "frontier owns" in workflow.lower()


def test_shared_skill_is_compiler_only_and_tools_are_invoke_only():
    skill = text(SKILL)

    for prohibited in (
        "Do not execute",
        "dispatch",
        "reconcile",
        "update Plan status",
        "commit",
        "modify production tools",
    ):
        assert prohibited in skill
    assert "`new_order.py --packet -`" in skill
    assert "`check_orders.py <paths>`; never read their source" in skill
    assert "preserve root dot-directory paths" in skill
    assert PRODUCTION_SKILL.exists()


def test_installed_contract_records_luna_pivot_and_execution_boundary():
    workflow = text(WORKFLOW)
    coordinator = text(COORDINATOR)
    assert "new `coordinator-test-caseworker` session" in workflow
    assert "stronger-model" in (workflow + coordinator).lower()
    assert "deferred" in (workflow + coordinator).lower()
    assert "Ordered execution remains unsupported" in workflow
