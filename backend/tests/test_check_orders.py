"""Tests for the strict canonical work-order checker."""

from __future__ import annotations

import copy
import importlib.util
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]


def _load():
    spec = importlib.util.spec_from_file_location("check_orders_under_test", REPO_ROOT / "scripts/check_orders.py")
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


co = _load()


@pytest.fixture()
def repo(tmp_path: Path, monkeypatch):
    monkeypatch.setattr(co, "REPO_ROOT", tmp_path)
    monkeypatch.setattr(co, "ORDERS_ROOT", tmp_path / "docs/plans/active")
    (tmp_path / "src").mkdir()
    (tmp_path / "src/existing.py").write_text("def existing():\n    pass\n", encoding="utf-8")
    (tmp_path / "frontend").mkdir()
    return tmp_path


def good_packet() -> dict:
    return {
        "output_path": "docs/plans/active/demo/orders/01-demo.md",
        "identity": {"number": "01", "slug": "demo", "title": "Demo", "goal": "Ship the settled change."},
        "depends_on": [],
        "required_strength": {"level": "Light", "reason": None},
        "authorization": {"creates": [".opencode/new.md"], "edits": ["src/existing.py"], "removes": []},
        "context": [{"path": "src/existing.py", "scope": {"kind": "anchor", "value": "def existing():"}, "purpose": "Edit seam."}],
        "known_facts": ["The behavior is settled."],
        "actions": [
            {"kind": "file", "paths": [".opencode/new.md"], "instruction": "Create the contract."},
            {"kind": "file", "paths": ["src/existing.py"], "instruction": "Update the seam."},
        ],
        "proof": [{"cwd": ".", "command": "python -m pytest --no-cov backend/tests/test_x.py", "purpose": "Focused proof."}],
        "acceptance_handoff": {"coordinator": {"requirements": ["Review proof."]}, "validator": None},
        "exclusions": ["No adjacent work."],
        "escalate_if": ["A new decision is required."],
    }


def messages(packet: dict, *, check_files: bool = False) -> list[str]:
    return [finding.message for finding in co.validate_packet(packet, check_files=check_files)]


def mutate(path: str, value):
    data = copy.deepcopy(good_packet())
    target = data
    parts = path.split(".")
    for part in parts[:-1]:
        target = target[part]
    target[parts[-1]] = value
    return data


def test_valid_packet_passes(repo: Path):
    assert messages(good_packet(), check_files=True) == []


@pytest.mark.parametrize(
    "packet,fragment",
    [
        (mutate("output_path", "docs/plans/active/demo/01-demo.md"), "output_path"),
        (mutate("identity.number", "1"), "two digits"),
        (mutate("identity.slug", "Not Valid"), "kebab-case"),
        (mutate("required_strength", {"level": "Standard", "reason": None}), "requires a reason"),
        (mutate("authorization", {"creates": [], "edits": [], "removes": []}), "names no paths"),
        (mutate("proof", []), "proof must be"),
        (mutate("known_facts", []), "known_facts"),
        (mutate("exclusions", []), "exclusions"),
        (mutate("escalate_if", []), "escalate_if"),
        (mutate("acceptance_handoff.coordinator", {"requirements": []}), "Coordinator acceptance"),
        (mutate("acceptance_handoff.validator", {"requirements": []}), "validator"),
    ],
)
def test_required_contract_rejections(packet: dict, fragment: str):
    assert any(fragment in message for message in messages(packet))


def test_contradictory_authorization_is_rejected():
    data = good_packet()
    data["authorization"]["creates"].append("src/existing.py")
    assert any("Contradictory authorization" in message for message in messages(data))


def test_unauthorized_action_path_is_rejected():
    data = good_packet()
    data["actions"].append({"kind": "file", "paths": ["src/other.py"], "instruction": "Edit it."})
    assert any("not authorized" in message for message in messages(data))


def test_non_file_action_is_explicit():
    data = good_packet()
    data["actions"].append({"kind": "non_file", "operation": "documentation_generation", "paths": [], "instruction": "Regenerate docs."})
    assert messages(data) == []
    data["actions"][-1]["paths"] = ["docs/README.md"]
    assert any("paths: []" in message for message in messages(data))


def test_context_scope_and_anchor_are_checked(repo: Path):
    data = good_packet()
    data["context"][0]["scope"] = {"kind": "lines", "start": 1, "end": 1, "anchor": "gone"}
    assert any("not inside" in message for message in messages(data, check_files=True))


def test_unresolved_placeholder_is_rejected():
    data = good_packet()
    data["known_facts"] = ["TODO decide later"]
    assert any("placeholder" in message for message in messages(data))


def test_dot_directory_round_trips(repo: Path):
    text = co.render_order(good_packet())
    assert ".opencode/new.md" in text
    assert '".opencode/new.md"' in text


def test_compiled_order_and_executor_shape_pass(repo: Path):
    path = repo / good_packet()["output_path"]
    path.parent.mkdir(parents=True)
    path.write_text(co.render_order(good_packet()), encoding="utf-8")
    assert co.lint_order(path) == []


def test_hand_edit_of_compiled_sections_is_rejected(repo: Path):
    path = repo / good_packet()["output_path"]
    path.parent.mkdir(parents=True)
    path.write_text(co.render_order(good_packet()).replace("Ship the settled change", "Changed by hand", 1), encoding="utf-8")
    assert any("do not match" in finding.message for finding in co.lint_order(path))


def test_completed_result_must_be_filled(repo: Path):
    path = repo / good_packet()["output_path"]
    path.parent.mkdir(parents=True)
    path.write_text(co.render_order(good_packet()).replace("STATUS: PENDING", "STATUS: DONE"), encoding="utf-8")
    assert any("not filled" in finding.message for finding in co.lint_order(path))


def test_discovery_accepts_only_nested_orders(repo: Path):
    canonical = repo / good_packet()["output_path"]
    canonical.parent.mkdir(parents=True)
    canonical.write_text(co.render_order(good_packet()), encoding="utf-8")
    sibling = repo / "docs/plans/active/demo/02-old.md"
    sibling.write_text(co.render_order(good_packet()), encoding="utf-8")
    assert co.discover_orders() == [canonical]


def test_dependency_must_be_canonical_and_not_self():
    data = good_packet()
    data["depends_on"] = [data["output_path"]]
    assert any("depends on itself" in message for message in messages(data))
    data["depends_on"] = ["01-other.md"]
    assert any("canonical order path" in message for message in messages(data))
