"""Tests for the lossless JSON-packet work-order renderer."""

from __future__ import annotations

import importlib.util
import io
import json
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]


def _load(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


no = _load(REPO_ROOT / "scripts/new_order.py", "new_order_under_test")


@pytest.fixture()
def repo(tmp_path: Path, monkeypatch):
    monkeypatch.setattr(no, "REPO_ROOT", tmp_path)
    monkeypatch.setattr(no.co, "REPO_ROOT", tmp_path)
    monkeypatch.setattr(no.co, "ORDERS_ROOT", tmp_path / "docs/plans/active")
    (tmp_path / "src").mkdir()
    (tmp_path / "src/existing.py").write_text("def existing():\n    pass\n", encoding="utf-8")
    (tmp_path / "frontend").mkdir()
    return tmp_path


def packet() -> dict:
    return {
        "output_path": "docs/plans/active/demo/orders/01-lossless-order.md",
        "identity": {
            "number": "01",
            "slug": "lossless-order",
            "title": "Lossless order",
            "goal": "Preserve the reviewed compile envelope.",
        },
        "depends_on": [],
        "required_strength": {"level": "Standard", "reason": "Several settled contracts move together."},
        "authorization": {
            "creates": [".opencode/skills/example/SKILL.md"],
            "edits": ["src/existing.py"],
            "removes": [],
        },
        "context": [
            {
                "path": "src/existing.py",
                "scope": {"kind": "anchor", "value": "def existing():"},
                "purpose": "Existing edit seam.",
            }
        ],
        "known_facts": ["The compile envelope is settled."],
        "actions": [
            {"kind": "file", "paths": [".opencode/skills/example/SKILL.md"], "instruction": "Create the skill."},
            {"kind": "file", "paths": ["src/existing.py"], "instruction": "Update the existing seam."},
            {"kind": "non_file", "operation": "documentation_generation", "paths": [], "instruction": "Regenerate inventories."},
        ],
        "proof": [
            {"cwd": ".", "command": ".venv\\Scripts\\python.exe -m pytest --no-cov backend/tests/test_x.py", "purpose": "Focused proof."},
            {"cwd": "frontend", "command": "npm run typecheck", "purpose": "Type proof."},
        ],
        "acceptance_handoff": {
            "coordinator": {"requirements": ["Review the evidence."]},
            "validator": {"requirements": ["Observe the result independently."]},
        },
        "exclusions": ["Do not execute adjacent work."],
        "escalate_if": ["A new path or decision is required."],
    }


def test_build_preserves_dot_paths_commands_and_order(repo: Path):
    target, text = no.build(packet())
    assert target == repo / "docs/plans/active/demo/orders/01-lossless-order.md"
    assert ".opencode/skills/example/SKILL.md" in text
    assert ".venv\\Scripts\\python.exe -m pytest --no-cov backend/tests/test_x.py" in text
    assert text.index("Create the skill") < text.index("Update the existing seam")
    assert "Test-Path" not in text and "order_check.py" not in text


def test_windows_paths_normalize_without_eating_root_dot(repo: Path):
    data = packet()
    data["output_path"] = "docs\\plans\\active\\demo\\orders\\01-lossless-order.md"
    data["authorization"]["creates"] = [".opencode\\skills\\example\\SKILL.md"]
    data["actions"][0]["paths"] = [".opencode\\skills\\example\\SKILL.md"]
    _, text = no.build(data)
    assert '"output_path": "docs/plans/active/demo/orders/01-lossless-order.md"' in text
    assert ".opencode/skills/example/SKILL.md" in text


def test_many_actions_and_proof_commands_have_no_ceiling(repo: Path):
    data = packet()
    for index in range(20):
        path = f"src/new_{index}.py"
        data["authorization"]["creates"].append(path)
        data["actions"].append({"kind": "file", "paths": [path], "instruction": f"Create artifact {index}."})
        data["proof"].append({"cwd": ".", "command": f"python check_{index}.py", "purpose": f"Proof {index}."})
    _, text = no.build(data)
    assert "Create artifact 19" in text and "python check_19.py" in text


def test_transport_failure_is_exit_two(monkeypatch, capsys):
    monkeypatch.setattr(no.sys, "stdin", io.StringIO("{"))
    assert no.main(["--packet", "-"]) == 2
    assert "TRANSPORT ERROR" in capsys.readouterr().err


def test_invalid_packet_writes_nothing(repo: Path, monkeypatch, capsys):
    data = packet()
    data["proof"] = []
    monkeypatch.setattr(no.sys, "stdin", io.StringIO(json.dumps(data)))
    assert no.main(["--packet", "-"]) == 1
    assert not (repo / data["output_path"]).exists()
    assert "proof must be" in capsys.readouterr().out


def test_exact_output_and_force_behavior(repo: Path, monkeypatch, capsys):
    raw = json.dumps(packet())
    monkeypatch.setattr(no.sys, "stdin", io.StringIO(raw))
    assert no.main(["--packet", "-"]) == 0
    target = repo / packet()["output_path"]
    assert target.is_file()
    monkeypatch.setattr(no.sys, "stdin", io.StringIO(raw))
    assert no.main(["--packet", "-"]) == 1
    monkeypatch.setattr(no.sys, "stdin", io.StringIO(raw))
    assert no.main(["--packet", "-", "--force"]) == 0
