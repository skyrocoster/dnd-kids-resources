"""Contract tests for the isolated browser-validation runner."""
from pathlib import Path
import importlib.util
import json

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("browser_validation", ROOT / "scripts/browser_validation.py")
module = importlib.util.module_from_spec(spec); assert spec.loader; spec.loader.exec_module(module)


def test_duplicate_case_is_rejected(tmp_path):
    (tmp_path / "case.lock").touch()
    result = module.run("case", "weapon-edit-dialog", tmp_path)
    assert result["status"] == "INFRA_FAIL"
    assert "duplicate" in result["error"]


def test_output_defaults_to_repository_artifacts_case_folder():
    assert module.resolve_output("weapon-edit-dialog", None) == module.ROOT / "artifacts" / "browser-validation-weapon-edit-dialog"


def test_explicit_output_is_a_named_repository_artifacts_folder():
    assert module.resolve_output("case", "review-run") == module.ROOT / "artifacts" / "review-run"


def test_output_rejects_absolute_and_traversal_paths():
    for value in ("C:/outside", "../outside", "nested/run"):
        try:
            module.resolve_output("case", value)
        except ValueError:
            pass
        else:
            raise AssertionError(value)


def test_unknown_scenario_is_infrastructure_failure(tmp_path):
    result = module.run("case", "other", tmp_path)
    assert result["status"] == "INFRA_FAIL"


def test_vite_override_is_documented_in_config():
    source = (ROOT / "frontend/vite.config.ts").read_text(encoding="utf-8")
    assert "VITE_API_PROXY_TARGET" in source
    assert "127.0.0.1:8000" in source


def test_invoke_contract_exists():
    skill = ROOT / ".opencode/skills/browser-validation-invoke/SKILL.md"
    assert skill.is_file()
    source = skill.read_text(encoding="utf-8")
    assert "name: browser-validation-invoke" in source
    assert "browser_validation.py" in source


def test_validator_registers_invoke_skill_before_browser_runs():
    source = (ROOT / ".opencode/agents/coordinator-test-validator.md").read_text(encoding="utf-8")
    assert "browser-validation-invoke" in source


def test_artifact_contract_is_ignored_and_documented():
    assert "/artifacts/browser-validation-*/" in (ROOT / ".gitignore").read_text(encoding="utf-8")
    skill = (ROOT / ".opencode/skills/browser-validation-invoke/SKILL.md").read_text(encoding="utf-8")
    docs = (ROOT / "docs/TESTING.md").read_text(encoding="utf-8")
    validator = (ROOT / ".opencode/agents/coordinator-test-validator.md").read_text(encoding="utf-8")
    assert "artifacts/browser-validation-<case-id>" in skill
    assert "artifacts/" in docs and "artifacts/" in validator


def test_dialog_snapshot_precedes_print_media_and_print_is_reached():
    source = (ROOT / "scripts/browser_validation.py").read_text(encoding="utf-8")
    assert 'dialog_aria = dialog.aria_snapshot()' in source
    assert 'page.evaluate("window.print()")' in source
    assert source.index("dialog_aria = dialog.aria_snapshot()") < source.index("for label, media")


def test_windows_cleanup_kills_and_verifies_owned_process_tree():
    source = (ROOT / "scripts/browser_validation.py").read_text(encoding="utf-8")
    assert '"taskkill", "/PID", str(process.pid), "/T", "/F"' in source
    assert "_listener_exists" in source
    assert 'error="owned process-tree cleanup failed"' in source
