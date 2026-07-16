"""Fixture-based tests for scripts/check_docs.py.

Uses temporary repository fixtures to exercise every check path and
error formatter without touching the real docs/ tree.
"""

from __future__ import annotations

import subprocess
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]


def _import_check_docs():
    """Import check_docs.py as a module via the same loader as conftest."""
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "check_docs",
        REPO_ROOT / "scripts" / "check_docs.py",
    )
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod


cd = _import_check_docs()


# ── Metadata parsing ────────────────────────────────────────────────


def test_parse_metadata_valid():
    content = (
        "# Plan\n\n"
        "> **Status:** F0–F3 shipped. F4 (design pass) queued next.\n\n"
        "## What the feature is\n\n"
        "Blah.\n\n"
        "#### F4 — Design pass (next up)\n"
    )
    meta = cd.parse_plan_metadata(content)
    assert meta["status"] == "F0–F3 shipped. F4 (design pass) queued next."
    assert meta["current_stage"] == "F4 — Design pass"


def test_parse_metadata_missing_all():
    meta = cd.parse_plan_metadata("# Plan\n\nNo metadata here.\n")
    assert meta["status"] is None
    assert meta["current_stage"] is None


def test_parse_metadata_status_only():
    content = "# Plan\n\n> **Status:** Complete.\n\nNo stage heading.\n"
    meta = cd.parse_plan_metadata(content)
    assert meta["status"] == "Complete."
    assert meta["current_stage"] is None


def test_parse_metadata_stage_only():
    content = "# Plan\n\n#### F0 — Scaffolding (next up)\n"
    meta = cd.parse_plan_metadata(content)
    assert meta["status"] is None
    assert meta["current_stage"] == "F0 — Scaffolding"


def test_parse_metadata_status_spacing():
    """Status blockquote with extra whitespace before **."""
    content = ">   **Status:**   Ready.\n"
    meta = cd.parse_plan_metadata(content)
    assert meta["status"] == "Ready."


def test_parse_metadata_stage_no_next_up():
    content = "#### F1 — Feature\n"
    meta = cd.parse_plan_metadata(content)
    assert meta["current_stage"] is None


def test_parse_execution_stage_fields():
    content = """#### F1 — Feature (next up)

- **Read first:** `docs/README.md`
- **Build:** Implement the focused change.
- **Inherits:** Existing shared contracts.
- **Expected touch set:** `src/feature.py`
- **Documentation impact:** None: behavior is unchanged.
- **Tests:** `pytest`
- **Gate:** Tests pass.
- **Completion edit:** Collapse F1 and advance F2.
"""
    stages = cd.parse_execution_stages(content)
    assert stages[0]["id"] == "F1"
    assert stages[0]["is_current"] is True
    assert set(stages[0]["fields"]) == set(cd.EXECUTION_FIELDS)


def test_execution_contract_reports_missing_fields(tmp_path: Path):
    docs = _write_docs_tree(
        tmp_path,
        plans={"foo_plan.md": "> **Status:** F0 queued.\n\n#### F0 — Work (next up)\n"},
    )
    errs = cd.check_plan_execution_contract(docs / "foo_plan.md")
    assert any("Read first" in error.message for error in errs)


def test_execution_contract_reports_duplicate_current_stages(tmp_path: Path):
    fields = "\n".join(f"- **{field}:** present" for field in cd.EXECUTION_FIELDS)
    docs = _write_docs_tree(
        tmp_path,
        plans={"foo_plan.md": f"> **Status:** F0 queued.\n\n#### F0 — One (next up)\n{fields}\n\n#### F1 — Two (next up)\n{fields}"},
    )
    errs = cd.check_plan_execution_contract(docs / "foo_plan.md")
    assert any("Duplicate current stages" in error.message for error in errs)


def test_execution_contract_reports_verbose_shipped_block(tmp_path: Path):
    fields = "\n".join(f"- **{field}:** present" for field in cd.EXECUTION_FIELDS)
    docs = _write_docs_tree(
        tmp_path,
        plans={"foo_plan.md": f"> **Status:** F0 shipped. F1 queued.\n\n| Stage | What shipped |\n|---|---|\n| **F0** | Done. |\n\n#### F0 — Done (planned)\n{fields}\n\n#### F1 — Next (next up)\n{fields}"},
    )
    errs = cd.check_plan_execution_contract(docs / "foo_plan.md")
    assert any("retain verbose blocks" in error.message for error in errs)


def test_manifest_reports_invalid_current_stage_anchor(tmp_path: Path):
    fields = "\n".join(f"- **{field}:** present" for field in cd.EXECUTION_FIELDS)
    docs = _write_docs_tree(
        tmp_path,
        manifest="| [foo](plans/active/foo.md#wrong-stage) |\n",
    )
    active = docs / "plans" / "active"
    active.mkdir(parents=True)
    (active / "foo.md").write_text(f"> **Status:** F0 queued.\n\n#### F0 — Work (next up)\n{fields}", encoding="utf-8")
    errs = cd.check_manifest_current_stage_anchors(docs, docs / "README.md")
    assert any("current-stage anchor" in error.message for error in errs)


def test_find_legacy_plan_files(tmp_path: Path):
    (tmp_path / "alpha_plan.md").write_text("# Alpha", encoding="utf-8")
    (tmp_path / "beta_plan.md").write_text("# Beta", encoding="utf-8")
    (tmp_path / "PLAN_TEMPLATE.md").write_text("# Template", encoding="utf-8")
    (tmp_path / "README.md").write_text("# Docs", encoding="utf-8")
    (tmp_path / "notaplan.md").write_text("# Other", encoding="utf-8")
    plans = cd.find_legacy_plan_files(tmp_path)
    names = [p.name for p in plans]
    assert "alpha_plan.md" in names
    assert "beta_plan.md" in names
    assert "PLAN_TEMPLATE.md" not in names
    assert "notaplan.md" not in names


def test_find_legacy_plan_files_accepts_underscored_feature_names(tmp_path: Path):
    (tmp_path / "documentation_rework_plan.md").write_text("# Docs", encoding="utf-8")
    assert [path.name for path in cd.find_legacy_plan_files(tmp_path)] == ["documentation_rework_plan.md"]


# ── Temporary-repository fixture tests ──────────────────────────────


def _write_docs_tree(base: Path, manifest: str = "", plans: dict[str, str] | None = None):
    """Populate a minimal docs/ tree under *base* for testing."""
    docs = base / "docs"
    docs.mkdir(parents=True, exist_ok=True)
    (docs / "README.md").write_text(manifest, encoding="utf-8")
    for name, content in (plans or {}).items():
        (docs / name).write_text(content, encoding="utf-8")
    return docs


def test_temp_repo_plan_missing_status(tmp_path: Path):
    docs = _write_docs_tree(
        tmp_path,
        plans={"foo_plan.md": "# Foo\n\n#### F0 — Scaffolding (next up)\n"},
    )
    errs = cd.check_plan_metadata(docs / "foo_plan.md")
    assert any("Missing status" in e.message for e in errs)


def test_temp_repo_plan_missing_stage(tmp_path: Path):
    docs = _write_docs_tree(
        tmp_path,
        plans={"bar_plan.md": "# Bar\n\n> **Status:** Complete.\n"},
    )
    errs = cd.check_plan_metadata(docs / "bar_plan.md")
    assert any("Missing next-up stage" in e.message for e in errs)


def test_temp_repo_plan_valid(tmp_path: Path):
    docs = _write_docs_tree(
        tmp_path,
        plans={
            "dungeon_plan.md": (
                "# Dungeon Plan\n\n"
                "> **Status:** F0 shipped. F1 queued.\n\n"
                "#### F1 — Feature (next up)\n"
            ),
        },
    )
    errs = cd.check_plan_metadata(docs / "dungeon_plan.md")
    assert errs == []


def test_temp_repo_manifest_completeness(tmp_path: Path):
    _write_docs_tree(
        tmp_path,
        manifest="# Docs\n\n| Doc |\n|---|\n| [dungeon_plan.md](dungeon_plan.md) |\n",
        plans={
            "dungeon_plan.md": "> **Status:** Complete.\n\n#### X0 (next up)\n",
            "spells_plan.md": "> **Status:** S0 queued.\n\n#### S0 (next up)\n",
        },
    )
    errs = cd.check_manifest_completeness(
        tmp_path / "docs",
        tmp_path / "docs" / "README.md",
    )
    assert any("spells_plan.md" in e.message for e in errs)


def test_temp_repo_manifest_complete(tmp_path: Path):
    _write_docs_tree(
        tmp_path,
        manifest="# Docs\n\n| [alpha_plan.md](alpha_plan.md) |\n",
        plans={"alpha_plan.md": "> **Status:** Complete.\n\n#### A0 (next up)\n"},
    )
    errs = cd.check_manifest_completeness(
        tmp_path / "docs",
        tmp_path / "docs" / "README.md",
    )
    assert errs == []


def test_temp_repo_forbidden_pattern(tmp_path: Path):
    docs = _write_docs_tree(
        tmp_path,
        manifest="# Docs\n",
        plans={"f_plan.md": "Uses Flask for the backend.\n\n> **Status:** Active.\n"},
    )
    errs = cd.check_forbidden_references(docs)
    assert any("Flask" in e.message for e in errs)


def test_temp_repo_forbidden_excludes_archive(tmp_path: Path):
    docs = _write_docs_tree(tmp_path, manifest="# Docs\n")
    complete_dir = docs / "complete"
    complete_dir.mkdir()
    (complete_dir / "old_plan.md").write_text(
        "This used Flask.\n", encoding="utf-8"
    )
    errs = cd.check_forbidden_references(docs)
    assert not any("Flask" in e.message for e in errs)


def test_temp_repo_run_all_checks_pass(tmp_path: Path):
    fields = "\n".join(f"- **{field}:** present" for field in cd.EXECUTION_FIELDS)
    _write_docs_tree(
        tmp_path,
        manifest="# Docs\n\n| [valid_plan.md](valid_plan.md#s1-next-next-up) |\n",
        plans={
            "valid_plan.md": f"> **Status:** S0 shipped.\n\n#### S1 — Next (next up)\n{fields}\n"
        },
    )
    errs = cd.run_all_checks(tmp_path / "docs")
    assert errs == []


def test_local_links_report_missing_paths_and_anchors(tmp_path: Path):
    docs = _write_docs_tree(tmp_path, manifest="# Docs\n\n[bad](missing.md) [anchor](target.md#nope)\n")
    (docs / "target.md").write_text("# Present\n", encoding="utf-8")
    errs = cd.check_local_links(docs, tmp_path)
    assert any("target does not exist" in error.message for error in errs)
    assert any("anchor does not exist" in error.message for error in errs)


def test_local_links_accept_windows_separators_and_encoded_spaces(tmp_path: Path):
    docs = _write_docs_tree(tmp_path, manifest="[guide](guides\\My%20Guide.md#hello-world)\n")
    guide = docs / "guides"
    guide.mkdir()
    (guide / "My Guide.md").write_text("# Hello World\n", encoding="utf-8")
    assert cd.check_local_links(docs, tmp_path) == []


def test_plan_lifecycle_requires_archive_target_for_redirect(tmp_path: Path):
    docs = _write_docs_tree(
        tmp_path,
        manifest="[old_plan.md](old_plan.md)\n",
        plans={"old_plan.md": "# Old\n\nMoved to `complete/old_plan.md`.\n"},
    )
    errs = cd.check_plan_lifecycle(docs, docs / "README.md")
    assert any("no archived target" in error.message for error in errs)


def test_instruction_precedence_reports_missing_manifest_pointer(tmp_path: Path):
    (tmp_path / ".github").mkdir()
    (tmp_path / "CLAUDE.md").write_text("The single authoritative instruction file.", encoding="utf-8")
    (tmp_path / "AGENTS.md").write_text("Read CLAUDE.md.", encoding="utf-8")
    (tmp_path / ".github" / "copilot-instructions.md").write_text("Read CLAUDE.md.", encoding="utf-8")
    errs = cd.check_instruction_precedence(tmp_path)
    assert any(error.source == "AGENTS.md" for error in errs)


def test_configured_test_commands_follow_configuration(tmp_path: Path):
    docs = _write_docs_tree(tmp_path, manifest="# Docs\n")
    (docs / "TESTING.md").write_text("pytest\nnpm run test\n", encoding="utf-8")
    (tmp_path / "pytest.ini").write_text("[pytest]\naddopts = --cov-fail-under=91\n", encoding="utf-8")
    frontend = tmp_path / "frontend"
    frontend.mkdir()
    (frontend / "package.json").write_text(
        '{"scripts": {"test": "vitest", "build": "vite build"}}', encoding="utf-8"
    )
    errs = cd.check_configured_test_commands(tmp_path)
    assert any("npm run build" in error.message for error in errs)
    assert any("91%" in error.message for error in errs)


# ── Generated-section contracts ─────────────────────────────────────


def test_replace_generated_section_preserves_handwritten_prose():
    content = "Before\n<!-- GENERATED:API:START -->\nold\n<!-- GENERATED:API:END -->\nAfter\n"
    updated = cd.replace_generated_section(content, "API", "new inventory\n")
    assert updated == "Before\n<!-- GENERATED:API:START -->\nnew inventory\n<!-- GENERATED:API:END -->\nAfter\n"


def test_replace_generated_section_rejects_malformed_markers():
    with pytest.raises(ValueError, match="exactly one"):
        cd.replace_generated_section("<!-- GENERATED:API:START -->", "API", "inventory")


def test_generated_section_checker_reports_stale_and_malformed_markers(tmp_path: Path, monkeypatch):
    docs = _write_docs_tree(tmp_path)
    monkeypatch.setattr(cd, "generated_sections", lambda _root: {"TESTING.md": "fresh\n"})
    monkeypatch.setattr(cd, "GENERATED_MARKERS", {"TESTING.md": "TESTING"})
    (docs / "TESTING.md").write_text(
        "<!-- GENERATED:TESTING:START -->\nstale\n<!-- GENERATED:TESTING:END -->\n", encoding="utf-8"
    )
    errs = cd.check_generated_sections(docs, tmp_path)
    assert any("stale" in error.message for error in errs)

    (docs / "TESTING.md").write_text("no markers\n", encoding="utf-8")
    errs = cd.check_generated_sections(docs, tmp_path)
    assert any("exactly one" in error.message for error in errs)


def test_schema_inventory_uses_disposable_database():
    root_database = REPO_ROOT / "dnd_kids_resources.db"
    before = root_database.stat().st_mtime_ns if root_database.exists() else None
    inventory = cd.generate_data_model_inventory(REPO_ROOT)
    after = root_database.stat().st_mtime_ns if root_database.exists() else None
    assert "#### `spells`" in inventory
    assert before == after


def test_testing_inventory_is_deterministic_and_detects_config_drift(tmp_path: Path):
    frontend = tmp_path / "frontend"
    frontend.mkdir()
    (tmp_path / "pytest.ini").write_text("[pytest]\ntestpaths = tests\naddopts = --cov-fail-under=90\n", encoding="utf-8")
    package = frontend / "package.json"
    package.write_text('{"scripts": {"test": "vitest run"}}', encoding="utf-8")
    original = cd.generate_testing_inventory(tmp_path)
    assert original == cd.generate_testing_inventory(tmp_path)
    package.write_text('{"scripts": {"test": "vitest run", "lint": "oxlint"}}', encoding="utf-8")
    assert cd.generate_testing_inventory(tmp_path) != original


# ── Error formatting ────────────────────────────────────────────────


def test_check_error_str():
    err = cd.CheckError(
        "docs/foo.md",
        "Missing required field",
        "Add the field to foo.md",
    )
    s = str(err)
    assert "docs/foo.md" in s
    assert "Missing required field" in s
    assert "Add the field to foo.md" in s


def test_check_error_source_path():
    err = cd.CheckError("source.py", "error msg", "fix it")
    assert err.source == "source.py"


# ── CLI argument handling ───────────────────────────────────────────


def test_cli_no_args_prints_help():
    """--help is implicit when no args are provided; test --help explicitly."""
    with pytest.raises(SystemExit) as exc_info:
        cd.main(["--help"])
    assert exc_info.value.code == 0


def test_cli_check_help_documents_modes(capsys):
    """--help output mentions every supported mode."""
    with pytest.raises(SystemExit) as exc_info:
        cd.main(["--help"])
    assert exc_info.value.code == 0
    out = capsys.readouterr().out
    assert "--check" in out
    assert "--write-generated" in out
    assert "--base" in out


def test_cli_write_generated_exits_cleanly(capsys):
    rc = cd.main(["--write-generated"])
    assert rc == 0


# ── Base argument handling ──────────────────────────────────────────


def test_cli_base_invalid_ref(tmp_path: Path):
    _write_docs_tree(
        tmp_path,
        manifest="# Docs\n\n| [p_plan.md](p_plan.md) |\n",
        plans={"p_plan.md": "> **Status:** Active.\n\n#### P0 (next up)\n"},
    )
    errs = cd.run_diff_checks(tmp_path / "docs", "nonexistent_branch_xyz")
    assert any("not found" in e.message for e in errs)


def test_cli_base_valid_ref(tmp_path: Path):
    """A valid git ref proceeds to diff-impact validation."""
    errs = cd.run_diff_checks(tmp_path / "docs", "HEAD")
    assert not any("not found" in error.message for error in errs)


def test_cli_check_with_base(tmp_path: Path, monkeypatch):
    """Full --check --base path with an invalid ref surfaces ref errors."""
    monkeypatch.setattr(cd, "REPO_ROOT", tmp_path)
    monkeypatch.setattr(cd, "DOCS_DIR", tmp_path / "docs")

    _write_docs_tree(
        tmp_path,
        manifest="# Docs\n\n| [q_plan.md](q_plan.md) |\n",
        plans={"q_plan.md": "> **Status:** Active.\n\n#### Q0 (next up)\n"},
    )

    # This will find all normal checks + the invalid-base error
    errs = cd.run_all_checks(tmp_path / "docs")
    errs.extend(cd.run_diff_checks(tmp_path / "docs", "definitely_not_a_ref"))
    assert any("definitely_not_a_ref" in e.message for e in errs)


def test_diff_checks_require_owner_plan_and_declared_documentation(tmp_path: Path, monkeypatch):
    fields = "\n".join([
        "- **Read first:** docs",
        "- **Build:** change documentation validation",
        "- **Inherits:** existing documentation contract",
        "- **Expected touch set:** scripts/check_docs.py",
        "- **Documentation impact:** `docs/DATA_MODEL.md`.",
        "- **Tests:** pytest",
        "- **Gate:** pass",
        "- **Completion edit:** collapse",
    ])
    docs = _write_docs_tree(
        tmp_path,
        manifest="[foo](plans/active/foo.md#f0-work-next-up)\n",
    )
    active = docs / "plans" / "active"
    active.mkdir(parents=True)
    (active / "foo.md").write_text(f"> **Status:** F0 queued.\n\n#### F0 — Work (next up)\n{fields}\n", encoding="utf-8")

    def fake_run(command, **_kwargs):
        if command[1:4] == ["rev-parse", "--verify", "HEAD"]:
            return subprocess.CompletedProcess(command, 0)
        return subprocess.CompletedProcess(command, 0, stdout="scripts/init_database.py\ndocs/plans/active/foo.md\n")

    monkeypatch.setattr(cd.subprocess, "run", fake_run)
    monkeypatch.setattr(cd, "REPO_ROOT", tmp_path)
    errs = cd.run_diff_checks(docs, "HEAD")
    assert not any("owning active plan" in error.message for error in errs)
    assert any("docs/DATA_MODEL.md" in error.message for error in errs)
