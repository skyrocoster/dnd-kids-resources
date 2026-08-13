"""Deterministic contract tests for the inert experimental validator protocol."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
AGENT = ROOT / ".opencode/agents/coordinator-test-validator.md"
SKILL = ROOT / ".opencode/skills/coordinator-test-validator/SKILL.md"


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_validator_is_deepseek_and_caseworker_remains_luna():
    assert "model: opencode-go/deepseek-v4-flash" in read(AGENT)
    assert "model: openai/gpt-5.6-luna" in read(ROOT / ".opencode/agents/coordinator-test-caseworker.md")


def test_phase_order_and_inert_gate_are_fixed():
    skill = read(SKILL)
    phases = ["INTAKE", "VALIDATE", "REVALIDATE", "PROPOSE CLOSEOUT", "APPLY CLOSEOUT",
              "ARCHIVE AND CLEAN", "VERIFY CLOSEOUT", "COMMIT"]
    positions = [skill.index(f"**{phase}:") for phase in phases]
    assert positions == sorted(positions)
    assert "does not authorize invoking them" in skill


def test_isolation_gates_and_archive_rules_are_documented():
    text = read(AGENT) + read(SKILL)
    for phrase in ("never implementation narrative", "cannot edit product implementation", "coordinator approval",
                   "never pushes", "exactly one commit", "docs/plans/done/", "known inbound links",
                   "empty leftover folders", "deterministic metadata/generated-doc repair"):
        assert phrase.lower() in text.lower()


def test_closeout_read_authorization_is_documented():
    text = read(AGENT) + read(SKILL)
    for phrase in ("validator: coordinator-test-validator", "coordinator_approved: true", "approved_paths",
                   "scripts/browser_validation.py"):
        assert phrase.lower() in text.lower()
