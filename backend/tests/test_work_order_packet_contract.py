"""Repository-level contract assertions for the replacement work-order system."""

from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]


def test_order_tools_describe_only_the_packet_contract():
    generator = (REPO_ROOT / "scripts/new_order.py").read_text(encoding="utf-8")
    checker = (REPO_ROOT / "scripts/check_orders.py").read_text(encoding="utf-8")
    assert "--packet" in generator
    assert "--start-in" not in generator
    assert "MAX_DO_BULLETS" not in checker
    assert "docs/plans/active/(?P<feature>" in checker


def test_canonical_docs_and_skills_name_nested_orders():
    paths = [
        "docs/PLAN_TEMPLATE.md",
        ".opencode/skills/to-orders/SKILL.md",
        ".opencode/skills/author-workorders/SKILL.md",
        ".opencode/skills/implement-order/SKILL.md",
    ]
    for relative in paths:
        text = (REPO_ROOT / relative).read_text(encoding="utf-8")
        assert "orders/" in text, relative


def test_order_check_wrapper_remains_independent():
    generator = (REPO_ROOT / "scripts/new_order.py").read_text(encoding="utf-8")
    assert "scripts/order_check.py" not in generator
