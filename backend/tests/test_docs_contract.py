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
# check_docs imports check_orders by path insertion; reuse the instance it loaded so a
# monkeypatched REPO_ROOT reaches the code actually running.
check_orders = cd.check_orders


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
        manifest="| [foo](plans/active/foo/foo.md#wrong-stage) |\n",
    )
    active = docs / "plans" / "active"
    active.mkdir(parents=True)
    feature_dir = active / "foo"
    feature_dir.mkdir()
    (feature_dir / "foo.md").write_text(f"> **Status:** F0 queued.\n\n#### F0 — Work (next up)\n{fields}", encoding="utf-8")
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


def test_find_active_plan_files_ignores_sibling_orders(tmp_path: Path):
    """Active Plan discovery must select only <feature>/<feature>.md, never sibling numbered orders."""
    docs = tmp_path / "docs"
    active = docs / "plans" / "active"
    feature_dir = active / "tooling"
    feature_dir.mkdir(parents=True)
    (feature_dir / "tooling.md").write_text("# Tooling\n\n> **Status:** Active.\n", encoding="utf-8")
    (feature_dir / "01-setup.md").write_text("WORK ORDER 01", encoding="utf-8")
    (feature_dir / "02-tune.md").write_text("WORK ORDER 02", encoding="utf-8")
    plans = cd.find_active_plan_files(docs)
    assert len(plans) == 1
    assert plans[0].name == "tooling.md"
    assert plans[0].parent.name == "tooling"


# ── Plan touch overlap contract ─────────────────────────────────────


def _setup_active_plan(
    parent: Path,
    feature: str,
    content: str,
    *,
    work_orders: int = 0,
    create_files: list[str] | None = None,
) -> Path:
    """Create an active Plan directory under *parent* with optional work orders and touch files.

    *parent* should be ``tmp_path / "docs" / "plans" / "active"``.
    *create_files* are repo-root-relative paths to create as empty files for glob matching.
    """
    active = parent
    plan_dir = active / feature
    plan_dir.mkdir(parents=True, exist_ok=True)
    (plan_dir / f"{feature}.md").write_text(content, encoding="utf-8")
    for n in range(1, work_orders + 1):
        (plan_dir / f"{n:02d}-task-{n}.md").write_text(
            f"WORK ORDER {n:02d}\nGOAL: Task {n}\n", encoding="utf-8",
        )
    if create_files:
        repo_root = parent.parents[2]
        for rel in create_files:
            fpath = repo_root / rel
            fpath.parent.mkdir(parents=True, exist_ok=True)
            fpath.write_text("", encoding="utf-8")
    return plan_dir


def test_touches_section_valid_globs_accepted(tmp_path: Path, monkeypatch):
    """A Plan with a valid ## Touches section passes validation."""
    monkeypatch.setattr(cd, "REPO_ROOT", tmp_path)
    docs = _write_docs_tree(tmp_path, manifest="# Docs\n")
    active = docs / "plans" / "active"
    _setup_active_plan(
        active, "my-feature",
        "# My Feature\n\n> **Status:** Active.\n\n"
        "## Touches\n"
        "- `backend/app/main.py`\n",
        create_files=["backend/app/main.py"],
    )
    errs = cd.check_plan_touch_overlap(docs)
    assert errs == []


def test_touches_missing_section_is_rejected(tmp_path: Path, monkeypatch):
    """A Plan without ## Touches is an error."""
    monkeypatch.setattr(cd, "REPO_ROOT", tmp_path)
    docs = _write_docs_tree(tmp_path, manifest="# Docs\n")
    active = docs / "plans" / "active"
    _setup_active_plan(
        active, "my-feature",
        "# My Feature\n\n> **Status:** Active.\n",
    )
    errs = cd.check_plan_touch_overlap(docs)
    assert any("Missing ## Touches" in e.message for e in errs)


def test_touches_absolute_glob_is_rejected(tmp_path: Path, monkeypatch):
    """Touch globs starting with / are rejected as non-relative."""
    monkeypatch.setattr(cd, "REPO_ROOT", tmp_path)
    docs = _write_docs_tree(tmp_path, manifest="# Docs\n")
    active = docs / "plans" / "active"
    _setup_active_plan(
        active, "my-feature",
        "# My Feature\n\n> **Status:** Active.\n\n"
        "## Touches\n"
        "- `/absolute/path.py`\n",
    )
    errs = cd.check_plan_touch_overlap(docs)
    assert any("must be repo-root-relative" in e.message for e in errs)


def test_touches_glob_escape_repo_is_rejected(tmp_path: Path, monkeypatch):
    """Touch globs that escape the repository root are rejected."""
    monkeypatch.setattr(cd, "REPO_ROOT", tmp_path)
    docs = _write_docs_tree(tmp_path, manifest="# Docs\n")
    active = docs / "plans" / "active"
    _setup_active_plan(
        active, "my-feature",
        "# My Feature\n\n> **Status:** Active.\n\n"
        "## Touches\n"
        "- `../../outside.txt`\n",
    )
    errs = cd.check_plan_touch_overlap(docs)
    assert any("escapes the repository" in e.message for e in errs)


def test_touches_unmatched_glob_is_rejected(tmp_path: Path, monkeypatch):
    """A touch glob matching no existing file is an error."""
    monkeypatch.setattr(cd, "REPO_ROOT", tmp_path)
    docs = _write_docs_tree(tmp_path, manifest="# Docs\n")
    active = docs / "plans" / "active"
    _setup_active_plan(
        active, "my-feature",
        "# My Feature\n\n> **Status:** Active.\n\n"
        "## Touches\n"
        "- `nonexistent/ghost.py`\n",
    )
    errs = cd.check_plan_touch_overlap(docs)
    assert any("does not match any file" in e.message for e in errs)


def test_touches_self_dependency_is_rejected(tmp_path: Path, monkeypatch):
    """A Plan depending on itself is an error."""
    monkeypatch.setattr(cd, "REPO_ROOT", tmp_path)
    docs = _write_docs_tree(tmp_path, manifest="# Docs\n")
    active = docs / "plans" / "active"
    _setup_active_plan(
        active, "my-feature",
        "# My Feature\n\n> **Status:** Active.\n\n"
        "## Touches\n"
        "- `backend/app/main.py`\n"
        "- **Depends on:** [My Feature](../my-feature/my-feature.md)\n",
        create_files=["backend/app/main.py"],
    )
    errs = cd.check_plan_touch_overlap(docs)
    assert any("depends on itself" in e.message for e in errs)


def test_touches_unknown_dependency_is_rejected(tmp_path: Path, monkeypatch):
    """A dependency on a non-existent active Plan is an error."""
    monkeypatch.setattr(cd, "REPO_ROOT", tmp_path)
    docs = _write_docs_tree(tmp_path, manifest="# Docs\n")
    active = docs / "plans" / "active"
    _setup_active_plan(
        active, "my-feature",
        "# My Feature\n\n> **Status:** Active.\n\n"
        "## Touches\n"
        "- `backend/app/main.py`\n"
        "- **Depends on:** [Nonexistent](../nonexistent-plan/nonexistent-plan.md)\n",
        create_files=["backend/app/main.py"],
    )
    errs = cd.check_plan_touch_overlap(docs)
    assert any("does not resolve to an active Plan" in e.message for e in errs)


def test_touches_inactive_plan_dependency_is_rejected(tmp_path: Path, monkeypatch):
    """A dependency link pointing outside docs/plans/active/ is an error."""
    monkeypatch.setattr(cd, "REPO_ROOT", tmp_path)
    docs = _write_docs_tree(tmp_path, manifest="# Docs\n")
    active = docs / "plans" / "active"
    _setup_active_plan(
        active, "my-feature",
        "# My Feature\n\n> **Status:** Active.\n\n"
        "## Touches\n"
        "- `backend/app/main.py`\n"
        "- **Depends on:** [Done Plan](../done/some-plan/some-plan.md)\n",
        create_files=["backend/app/main.py"],
    )
    errs = cd.check_plan_touch_overlap(docs)
    assert any("does not resolve to an active Plan" in e.message for e in errs)


def test_touches_queued_plan_excluded_from_overlap(tmp_path: Path, monkeypatch):
    """A queued Plan (no work orders) does not participate in overlap checks."""
    monkeypatch.setattr(cd, "REPO_ROOT", tmp_path)
    docs = _write_docs_tree(tmp_path, manifest="# Docs\n")
    active = docs / "plans" / "active"

    # In-flight plan-A (has work orders)
    _setup_active_plan(
        active, "plan-a",
        "# Plan A\n\n> **Status:** Active.\n\n"
        "## Touches\n"
        "- `scripts/shared.py`\n",
        work_orders=1,
        create_files=["scripts/shared.py"],
    )
    # Queued plan-B (no work orders) — touches same file
    _setup_active_plan(
        active, "plan-b",
        "# Plan B\n\n> **Status:** Queued.\n\n"
        "## Touches\n"
        "- `scripts/shared.py`\n",
    )
    # No error because plan-b is not in-flight
    errs = cd.check_plan_touch_overlap(docs)
    assert not any("Undeclared touch overlap" in e.message for e in errs)


def test_touches_overlap_rejected_between_inflight_plans(tmp_path: Path, monkeypatch):
    """Two in-flight Plans touching the same file without a dependency is an error."""
    monkeypatch.setattr(cd, "REPO_ROOT", tmp_path)
    docs = _write_docs_tree(tmp_path, manifest="# Docs\n")
    active = docs / "plans" / "active"

    _setup_active_plan(
        active, "plan-a",
        "# Plan A\n\n> **Status:** Active.\n\n"
        "## Touches\n"
        "- `scripts/shared.py`\n",
        work_orders=1,
        create_files=["scripts/shared.py"],
    )
    _setup_active_plan(
        active, "plan-b",
        "# Plan B\n\n> **Status:** Active.\n\n"
        "## Touches\n"
        "- `scripts/shared.py`\n",
        work_orders=1,
    )
    errs = cd.check_plan_touch_overlap(docs)
    assert any("Undeclared touch overlap" in e.message for e in errs)
    assert any("shared.py" in e.message for e in errs)


def test_touches_overlap_accepted_with_dependency(tmp_path: Path, monkeypatch):
    """Overlap is accepted when one in-flight Plan depends on the other."""
    monkeypatch.setattr(cd, "REPO_ROOT", tmp_path)
    docs = _write_docs_tree(tmp_path, manifest="# Docs\n")
    active = docs / "plans" / "active"

    _setup_active_plan(
        active, "plan-a",
        "# Plan A\n\n> **Status:** Active.\n\n"
        "## Touches\n"
        "- `scripts/shared.py`\n",
        work_orders=1,
        create_files=["scripts/shared.py"],
    )
    _setup_active_plan(
        active, "plan-b",
        "# Plan B\n\n> **Status:** Active.\n\n"
        "## Touches\n"
        "- `scripts/shared.py`\n"
        "- **Depends on:** [Plan A](../plan-a/plan-a.md)\n",
        work_orders=1,
    )
    errs = cd.check_plan_touch_overlap(docs)
    assert not any("Undeclared touch overlap" in e.message for e in errs)




def _write_docs_tree(base: Path, manifest: str = "", plans: dict[str, str] | None = None, inventory: str = ""):
    """Populate a minimal docs/ tree under *base* for testing."""
    docs = base / "docs"
    docs.mkdir(parents=True, exist_ok=True)
    (docs / "README.md").write_text(manifest, encoding="utf-8")
    if inventory:
        (docs / "INVENTORY.md").write_text(inventory, encoding="utf-8")
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


def test_temp_repo_plan_status_only_is_valid(tmp_path: Path):
    """Lean Plans need only a Status line; a current-stage heading is optional."""
    docs = _write_docs_tree(
        tmp_path,
        plans={"bar_plan.md": "# Bar\n\n> **Status:** Complete.\n"},
    )
    errs = cd.check_plan_metadata(docs / "bar_plan.md")
    assert errs == []


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
    docs = _write_docs_tree(
        tmp_path,
        manifest="# Docs\n",
        inventory=(
            "# Documentation Inventory\n\n"
            "## Document Inventory\n\n"
            "| Document | Type |\n"
            "|---|---|\n"
            "| [dungeon_plan.md](dungeon_plan.md) | Plan |\n"
        ),
        plans={
            "dungeon_plan.md": "> **Status:** Complete.\n\n#### X0 (next up)\n",
            "spells_plan.md": "> **Status:** S0 queued.\n\n#### S0 (next up)\n",
        },
    )
    errs = cd.check_manifest_completeness(
        docs,
        docs / "README.md",
        docs / "INVENTORY.md",
    )
    assert any("spells_plan.md" in e.message for e in errs)


def test_temp_repo_manifest_complete(tmp_path: Path):
    docs = _write_docs_tree(
        tmp_path,
        manifest="# Docs\n",
        inventory=(
            "# Documentation Inventory\n\n"
            "## Document Inventory\n\n"
            "| Document | Type |\n"
            "|---|---|\n"
            "| [alpha_plan.md](alpha_plan.md) | Plan |\n"
        ),
        plans={"alpha_plan.md": "> **Status:** Complete.\n\n#### A0 (next up)\n"},
    )
    errs = cd.check_manifest_completeness(
        docs,
        docs / "README.md",
        docs / "INVENTORY.md",
    )
    assert errs == []


def test_temp_repo_manifest_missing_area_guide(tmp_path: Path):
    docs = _write_docs_tree(
        tmp_path,
        manifest="# Docs\n",
        inventory=(
            "# Documentation Inventory\n\n"
            "## Document Inventory\n\n"
            "| Document | Type |\n"
            "|---|---|\n"
        ),
    )
    # Create an area guide that is NOT listed in the inventory
    areas = docs / "areas"
    areas.mkdir(parents=True, exist_ok=True)
    (areas / "test_guide.md").write_text(
        "# Test Guide\n\n> **Status:** Active.\n", encoding="utf-8"
    )
    errs = cd.check_manifest_completeness(
        docs,
        docs / "README.md",
        docs / "INVENTORY.md",
    )
    assert any("areas/test_guide.md" in e.message for e in errs)


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
        inventory=(
            "# Documentation Inventory\n\n"
            "## Document Inventory\n\n"
            "| Document | Type |\n"
            "|---|---|\n"
            "| [valid_plan.md](valid_plan.md) | Plan |\n"
        ),
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
        plans={"old_plan.md": "# Old\n\nMoved to `plans/done/old/old_plan.md`.\n"},
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


# ── Work-order lint (Plan -> Implement -> Reconcile) ────────────────


def test_work_orders_flag_missing_fields(tmp_path: Path, monkeypatch):
    """check_docs delegates to check_orders; the rules themselves are tested there."""
    monkeypatch.setattr(check_orders, "REPO_ROOT", tmp_path)
    docs = _write_docs_tree(tmp_path, manifest="# Docs\n")
    feat_dir = docs / "plans" / "active" / "feat"
    feat_dir.mkdir(parents=True)
    (tmp_path / "file.py").write_text("x = 1\n", encoding="utf-8")
    (feat_dir / "01-good.md").write_text(
        "WORK ORDER 01 — x\nGOAL: do a thing\nDEPENDS ON: none\n"
        "REQUIRED STRENGTH: Light\nCREATES: none\nREMOVES: none\n"
        "CHANGES SIGNATURE: none\n\n"
        "START IN:\n- file.py\n\nDO:\n- change the thing\n\n"
        "STOP WHEN: tests pass\nSTATUS: DONE\n",
        encoding="utf-8",
    )
    (feat_dir / "02-bad.md").write_text("WORK ORDER 02 — y\nGOAL: do a thing\n", encoding="utf-8")
    errs = cd.check_work_orders(docs)
    assert any("02-bad.md" in e.source for e in errs)
    assert not any("01-good.md" in e.source for e in errs)


def test_work_orders_absent_directory_is_ok(tmp_path: Path):
    docs = _write_docs_tree(tmp_path, manifest="# Docs\n")
    assert cd.check_work_orders(docs) == []


def test_area_guide_active_plan_link_without_anchor_is_accepted(tmp_path: Path, monkeypatch):
    """Plan queue with a single (next up) entry is accepted."""
    monkeypatch.setattr(cd, "REPO_ROOT", tmp_path)
    docs = _write_docs_tree(tmp_path, manifest="# Docs\n")
    areas = docs / "areas"
    areas.mkdir()
    active = docs / "plans" / "active"
    active.mkdir(parents=True)
    loom_dir = active / "loom"
    loom_dir.mkdir()
    # Create a minimal implementation file for the change-map glob to match
    (tmp_path / "frontend" / "src" / "features" / "loom").mkdir(parents=True)
    (tmp_path / "frontend" / "src" / "features" / "loom" / "LoomPage.tsx").write_text("", encoding="utf-8")
    (areas / "loom.md").write_text(
        "# Loom\n\n"
        "> **Plan queue:**\n"
        "> 1. [Loom feature](../plans/active/loom/loom.md) (next up)\n\n"
        "## Scope\n## Read first\n## Source map\n## Change map\n\n"
        "| Change type | Source globs |\n"
        "|---|---|\n"
        "| Loom feature | `frontend/src/features/loom/**` |\n"
        "## Invariants\n## Work queue\n## Cross-references\n",
        encoding="utf-8",
    )
    (loom_dir / "loom.md").write_text(
        "# Loom feature\n\n> **Status:** Active.\n\n- **Area guide:** [Loom](../../../areas/loom.md)\n",
        encoding="utf-8",
    )
    assert cd.check_area_guide_contract(docs) == []


def test_diff_checks_allow_implementation_without_plan_edit(tmp_path: Path, monkeypatch):
    """Code may land per work order without editing a top-level active plan."""
    docs = _write_docs_tree(tmp_path, manifest="# Docs\n")

    def fake_run(command, **_kwargs):
        if command[1:4] == ["rev-parse", "--verify", "HEAD"]:
            return subprocess.CompletedProcess(command, 0)
        return subprocess.CompletedProcess(command, 0, stdout="frontend/src/App.tsx\n")

    monkeypatch.setattr(cd.subprocess, "run", fake_run)
    monkeypatch.setattr(cd, "REPO_ROOT", tmp_path)
    errs = cd.run_diff_checks(docs, "HEAD")
    assert not any("owning active plan" in e.message for e in errs)


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


def test_archive_index_checker_reports_stale_content(tmp_path: Path, monkeypatch):
    """Prove that stale or missing archive-index content is rejected."""
    # Create a fake archived plan under docs/plans/done/
    done = tmp_path / "docs" / "plans" / "done"
    (done / "test-plan" / "test-plan.md").parent.mkdir(parents=True, exist_ok=True)
    (done / "test-plan" / "test-plan.md").write_text(
        "# Test Plan — a test\n\n"
        "> **Status:** Complete. All done.\n\n"
        "- **Area guide:** [Test Area](../../areas/test-area.md)\n",
        encoding="utf-8",
    )

    # Create INDEX.md with stale content (wrong title)
    (done / "INDEX.md").write_text(
        "<!-- GENERATED:ARCHIVE_INDEX:START -->\n"
        "- [Wrong Plan](test-plan/test-plan.md)\n"
        "<!-- GENERATED:ARCHIVE_INDEX:END -->\n",
        encoding="utf-8",
    )

    # Monkeypatch generated_sections to include the archive index
    monkeypatch.setattr(
        cd,
        "generated_sections",
        lambda _root: {"plans/done/INDEX.md": cd.generate_archive_index(tmp_path)},
    )
    monkeypatch.setattr(
        cd,
        "GENERATED_MARKERS",
        {"plans/done/INDEX.md": "ARCHIVE_INDEX"},
    )

    errs = cd.check_generated_sections(tmp_path / "docs", tmp_path)
    assert any("stale" in error.message for error in errs)


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
        inventory=(
            "# Documentation Inventory\n\n"
            "## Document Inventory\n\n"
            "| Document | Type |\n"
            "|---|---|\n"
            "| [q_plan.md](q_plan.md) | Plan |\n"
        ),
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


# ── Plan queue contract ───────────────────────────────────────────────


def test_plan_queue_none_is_valid(tmp_path: Path, monkeypatch):
    """A guide with '> **Plan queue:** None.' is valid."""
    monkeypatch.setattr(cd, "REPO_ROOT", tmp_path)
    docs = _write_docs_tree(tmp_path, manifest="# Docs\n")
    areas = docs / "areas"
    areas.mkdir()
    # Create a minimal implementation file for the change-map glob to match
    (tmp_path / "backend" / "app" / "routers").mkdir(parents=True)
    (tmp_path / "backend" / "app" / "routers" / "encounters.py").write_text("", encoding="utf-8")
    (areas / "encounters.md").write_text(
        "# Encounters\n\n"
        "> **Plan queue:** None.\n\n"
        "## Scope\n## Read first\n## Source map\n## Change map\n\n"
        "| Change type | Source globs |\n"
        "|---|---|\n"
        "| Encounters | `backend/app/routers/encounters.py` |\n"
        "## Invariants\n## Work queue\n## Cross-references\n",
        encoding="utf-8",
    )
    assert cd.check_area_guide_contract(docs) == []


def test_plan_queue_ordered_first_next_up_is_valid(tmp_path: Path, monkeypatch):
    """An ordered queue where the first item is (next up) is valid."""
    monkeypatch.setattr(cd, "REPO_ROOT", tmp_path)
    docs = _write_docs_tree(tmp_path, manifest="# Docs\n")
    areas = docs / "areas"
    areas.mkdir()
    # Create a minimal implementation file for the change-map glob to match
    (tmp_path / "scripts").mkdir()
    (tmp_path / "scripts" / "guide_a.py").write_text("", encoding="utf-8")
    active = docs / "plans" / "active"
    active.mkdir(parents=True)
    plan_a = active / "plan-a"
    plan_a.mkdir()
    plan_b = active / "plan-b"
    plan_b.mkdir()
    (plan_a / "plan-a.md").write_text(
        "# Plan A\n\n> **Status:** Active.\n\n- **Area guide:** [Guide A](../../../areas/guide-a.md)\n",
        encoding="utf-8",
    )
    (plan_b / "plan-b.md").write_text(
        "# Plan B\n\n> **Status:** Queued.\n\n- **Area guide:** [Guide A](../../../areas/guide-a.md)\n",
        encoding="utf-8",
    )
    (areas / "guide-a.md").write_text(
        "# Guide A\n\n"
        "> **Plan queue:**\n"
        "> 1. [Plan A](../plans/active/plan-a/plan-a.md) (next up)\n"
        "> 2. [Plan B](../plans/active/plan-b/plan-b.md)\n\n"
        "## Scope\n## Read first\n## Source map\n## Change map\n\n"
        "| Change type | Source globs |\n"
        "|---|---|\n"
        "| Guide A features | `scripts/guide_a.py` |\n"
        "## Invariants\n## Work queue\n## Cross-references\n",
        encoding="utf-8",
    )
    # Plan A backlinks to guide-a; Plan B backlinks to guide-a too (allowed — one guide, many plans)
    # The guide targets map will pick the last resolved link; backlink validation checks guide_targets
    errs = cd.check_area_guide_contract(docs)
    # We expect only one plan to get the backlink error because guide_targets only records one
    # per target (the last one wins). The other plan's backlink will be flagged.
    # Actually both plans have the same Area guide, and the guide has both in its queue.
    # But guide_targets[plan-a.resolve()] = guide.resolve() and guide_targets[plan-b.resolve()] = guide.resolve()
    # if both are in the queue. So both should pass.
    assert errs == []


def test_plan_queue_next_up_not_first_is_rejected(tmp_path: Path, monkeypatch):
    """Only the first queued plan may be marked (next up)."""
    monkeypatch.setattr(cd, "REPO_ROOT", tmp_path)
    docs = _write_docs_tree(tmp_path, manifest="# Docs\n")
    areas = docs / "areas"
    areas.mkdir()
    active = docs / "plans" / "active"
    active.mkdir(parents=True)
    plan_a = active / "plan-a"
    plan_a.mkdir()
    plan_b = active / "plan-b"
    plan_b.mkdir()
    (plan_a / "plan-a.md").write_text(
        "# Plan A\n\n> **Status:** Active.\n\n- **Area guide:** [Guide A](../../../areas/guide-a.md)\n",
        encoding="utf-8",
    )
    (plan_b / "plan-b.md").write_text(
        "# Plan B\n\n> **Status:** Queued.\n\n- **Area guide:** [Guide A](../../../areas/guide-a.md)\n",
        encoding="utf-8",
    )
    (areas / "guide-a.md").write_text(
        "# Guide A\n\n"
        "> **Plan queue:**\n"
        "> 1. [Plan A](../plans/active/plan-a/plan-a.md)\n"
        "> 2. [Plan B](../plans/active/plan-b/plan-b.md) (next up)\n\n"  # Wrong: next up on item 2
        "## Scope\n## Read first\n## Source map\n## Invariants\n## Work queue\n## Cross-references\n",
        encoding="utf-8",
    )
    errs = cd.check_area_guide_contract(docs)
    assert any("must be marked '(next up)'" in e.message for e in errs)
    assert any("Only the first" in e.message for e in errs)


def test_plan_queue_missing_next_up_is_rejected(tmp_path: Path, monkeypatch):
    """The first queued plan must be marked (next up)."""
    monkeypatch.setattr(cd, "REPO_ROOT", tmp_path)
    docs = _write_docs_tree(tmp_path, manifest="# Docs\n")
    areas = docs / "areas"
    areas.mkdir()
    active = docs / "plans" / "active"
    active.mkdir(parents=True)
    plan_a = active / "plan-a"
    plan_a.mkdir()
    (plan_a / "plan-a.md").write_text(
        "# Plan A\n\n> **Status:** Active.\n\n- **Area guide:** [Guide A](../../../areas/guide-a.md)\n",
        encoding="utf-8",
    )
    (areas / "guide-a.md").write_text(
        "# Guide A\n\n"
        "> **Plan queue:**\n"
        "> 1. [Plan A](../plans/active/plan-a/plan-a.md)\n\n"  # No (next up)
        "## Scope\n## Read first\n## Source map\n## Invariants\n## Work queue\n## Cross-references\n",
        encoding="utf-8",
    )
    errs = cd.check_area_guide_contract(docs)
    assert any("must be marked '(next up)'" in e.message for e in errs)


def test_words_md_files_excluded_from_guides(tmp_path: Path, monkeypatch):
    """Glossary companion files (*.words.md) are not treated as area guides."""
    monkeypatch.setattr(cd, "REPO_ROOT", tmp_path)
    docs = _write_docs_tree(tmp_path, manifest="# Docs\n")
    areas = docs / "areas"
    areas.mkdir()
    # Create a minimal implementation file for the change-map glob to match
    (tmp_path / "backend" / "app" / "routers").mkdir(parents=True)
    (tmp_path / "backend" / "app" / "routers" / "dungeons.py").write_text("", encoding="utf-8")
    (areas / "dungeons.md").write_text(
        "# Dungeons\n\n"
        "> **Plan queue:** None.\n\n"
        "## Scope\n## Read first\n## Source map\n## Change map\n\n"
        "| Change type | Source globs |\n"
        "|---|---|\n"
        "| Dungeons | `backend/app/routers/dungeons.py` |\n"
        "## Invariants\n## Work queue\n## Cross-references\n",
        encoding="utf-8",
    )
    # This file should be excluded — no required headings, no plan queue needed
    (areas / "dungeons.words.md").write_text(
        "# Dungeons Glossary\n\n"
        "Glossary of dungeon terms.\n",
        encoding="utf-8",
    )
    errs = cd.check_area_guide_contract(docs)
    # Only dungeons.md is checked; the .words.md file is skipped
    assert errs == []


def test_duplicate_router_claim_is_rejected(tmp_path: Path, monkeypatch):
    """Two guides claiming the same backend router is an error."""
    monkeypatch.setattr(cd, "REPO_ROOT", tmp_path)
    docs = _write_docs_tree(tmp_path, manifest="# Docs\n")
    areas = docs / "areas"
    areas.mkdir()
    (areas / "guide-a.md").write_text(
        "# Guide A\n\n"
        "> **Plan queue:** None.\n\n"
        "## Scope\n## Read first\n"
        "## Source map\n"
        "- Backend: `backend/app/routers/items.py`.\n"
        "## Invariants\n## Work queue\n## Cross-references\n",
        encoding="utf-8",
    )
    (areas / "guide-b.md").write_text(
        "# Guide B\n\n"
        "> **Plan queue:** None.\n\n"
        "## Scope\n## Read first\n"
        "## Source map\n"
        "- Backend: `backend/app/routers/items.py`.\n"
        "## Invariants\n## Work queue\n## Cross-references\n",
        encoding="utf-8",
    )
    errs = cd.check_area_guide_contract(docs)
    assert any("items" in e.message and "already claimed" in e.message for e in errs)


def test_duplicate_route_claim_is_rejected(tmp_path: Path, monkeypatch):
    """Two guides claiming the same frontend route is an error."""
    monkeypatch.setattr(cd, "REPO_ROOT", tmp_path)
    docs = _write_docs_tree(tmp_path, manifest="# Docs\n")
    areas = docs / "areas"
    areas.mkdir()
    (areas / "guide-a.md").write_text(
        "# Guide A\n\n"
        "> **Plan queue:** None.\n\n"
        "## Scope\n## Read first\n## Source map\n## Invariants\n"
        "## Surfaces\n\n"
        "| Surface | Route | Mode | Operator |\n"
        "|---|---|---|---|\n"
        "| Item browser | `/items` | prep | DM |\n"
        "## Work queue\n## Cross-references\n",
        encoding="utf-8",
    )
    (areas / "guide-b.md").write_text(
        "# Guide B\n\n"
        "> **Plan queue:** None.\n\n"
        "## Scope\n## Read first\n## Source map\n## Invariants\n"
        "## Surfaces\n\n"
        "| Surface | Route | Mode | Operator |\n"
        "|---|---|---|---|\n"
        "| Other browser | `/items` | prep | DM |\n"
        "## Work queue\n## Cross-references\n",
        encoding="utf-8",
    )
    errs = cd.check_area_guide_contract(docs)
    assert any("/items" in e.message and "already claimed" in e.message for e in errs)


def test_duplicate_own_router_within_same_guide_is_ok(tmp_path: Path, monkeypatch):
    """Repeated router ownership within one guide is harmless."""
    monkeypatch.setattr(cd, "REPO_ROOT", tmp_path)
    docs = _write_docs_tree(tmp_path, manifest="# Docs\n")
    areas = docs / "areas"
    areas.mkdir()
    (areas / "guide-a.md").write_text(
        "# Guide A\n\n"
        "> **Plan queue:** None.\n\n"
        "## Scope\n## Read first\n"
        "## Source map\n"
        "- Backend: `backend/app/routers/items.py` and `backend/app/routers/items.py`.\n"
        "## Invariants\n## Work queue\n## Cross-references\n",
        encoding="utf-8",
    )
    errs = cd.check_area_guide_contract(docs)
    assert not any("already claimed" in e.message for e in errs)


# ── Change map coverage ─────────────────────────────────────────────


def test_change_map_missing_section_is_rejected(tmp_path: Path, monkeypatch):
    """A guide without a ## Change map section is an error."""
    monkeypatch.setattr(cd, "REPO_ROOT", tmp_path)
    docs = _write_docs_tree(tmp_path, manifest="# Docs\n")
    areas = docs / "areas"
    areas.mkdir()
    (areas / "guide.md").write_text(
        "# Guide\n\n"
        "> **Plan queue:** None.\n\n"
        "## Scope\n## Read first\n## Source map\n## Invariants\n## Work queue\n## Cross-references\n",
        encoding="utf-8",
    )
    errs = cd.check_area_guide_contract(docs)
    assert any("Missing ## Change map" in e.message for e in errs)


def test_change_map_valid_coverage_is_accepted(tmp_path: Path, monkeypatch):
    """All implementation files covered by exactly one guide passes."""
    monkeypatch.setattr(cd, "REPO_ROOT", tmp_path)
    docs = _write_docs_tree(tmp_path, manifest="# Docs\n")
    areas = docs / "areas"
    areas.mkdir()
    # Create minimal implementation files
    (tmp_path / "backend").mkdir()
    (tmp_path / "backend" / "app").mkdir()
    (tmp_path / "backend" / "app" / "main.py").write_text("", encoding="utf-8")
    (tmp_path / "frontend").mkdir()
    (tmp_path / "frontend" / "src").mkdir()
    (tmp_path / "frontend" / "src" / "App.tsx").write_text("", encoding="utf-8")

    (areas / "guide-a.md").write_text(
        "# Guide A\n\n"
        "> **Plan queue:** None.\n\n"
        "## Scope\n## Read first\n## Source map\n## Invariants\n"
        "## Change map\n\n"
        "| Change type | Source globs |\n"
        "|---|---|\n"
        "| Backend | `backend/app/main.py` |\n"
        "| Frontend | `frontend/src/App.tsx` |\n"
        "## Work queue\n## Cross-references\n",
        encoding="utf-8",
    )
    errs = cd.check_area_guide_contract(docs)
    assert not any("change map" in e.message.lower() or "Change map" in e.message for e in errs)
    assert not any("not covered" in e.message for e in errs)


def test_change_map_unmatched_file_is_rejected(tmp_path: Path, monkeypatch):
    """A file not covered by any guide's change map is an error."""
    monkeypatch.setattr(cd, "REPO_ROOT", tmp_path)
    docs = _write_docs_tree(tmp_path, manifest="# Docs\n")
    areas = docs / "areas"
    areas.mkdir()
    (tmp_path / "backend").mkdir()
    (tmp_path / "backend" / "app").mkdir()
    (tmp_path / "backend" / "app" / "main.py").write_text("", encoding="utf-8")
    (tmp_path / "frontend").mkdir()
    (tmp_path / "frontend" / "src").mkdir()
    (tmp_path / "frontend" / "src" / "orphan.tsx").write_text("", encoding="utf-8")

    (areas / "guide.md").write_text(
        "# Guide\n\n"
        "> **Plan queue:** None.\n\n"
        "## Scope\n## Read first\n## Source map\n## Invariants\n"
        "## Change map\n\n"
        "| Change type | Source globs |\n"
        "|---|---|\n"
        "| Backend | `backend/app/main.py` |\n"
        "## Work queue\n## Cross-references\n",
        encoding="utf-8",
    )
    errs = cd.check_area_guide_contract(docs)
    assert any("orphan.tsx" in e.source and "not covered" in e.message for e in errs)


def test_change_map_cross_area_duplicate_is_rejected(tmp_path: Path, monkeypatch):
    """A file claimed by two guides is an error."""
    monkeypatch.setattr(cd, "REPO_ROOT", tmp_path)
    docs = _write_docs_tree(tmp_path, manifest="# Docs\n")
    areas = docs / "areas"
    areas.mkdir()
    (tmp_path / "scripts").mkdir()
    (tmp_path / "scripts" / "shared.py").write_text("", encoding="utf-8")

    (areas / "guide-a.md").write_text(
        "# Guide A\n\n"
        "> **Plan queue:** None.\n\n"
        "## Scope\n## Read first\n## Source map\n## Invariants\n"
        "## Change map\n\n"
        "| Change type | Source globs |\n"
        "|---|---|\n"
        "| Shared script | `scripts/shared.py` |\n"
        "## Work queue\n## Cross-references\n",
        encoding="utf-8",
    )
    (areas / "guide-b.md").write_text(
        "# Guide B\n\n"
        "> **Plan queue:** None.\n\n"
        "## Scope\n## Read first\n## Source map\n## Invariants\n"
        "## Change map\n\n"
        "| Change type | Source globs |\n"
        "|---|---|\n"
        "| Also shared | `scripts/shared.py` |\n"
        "## Work queue\n## Cross-references\n",
        encoding="utf-8",
    )
    errs = cd.check_area_guide_contract(docs)
    assert any("already covered" in e.message and "shared.py" in e.message for e in errs)


def test_change_map_unmatched_glob_is_rejected(tmp_path: Path, monkeypatch):
    """A glob that matches no file is an error."""
    monkeypatch.setattr(cd, "REPO_ROOT", tmp_path)
    docs = _write_docs_tree(tmp_path, manifest="# Docs\n")
    areas = docs / "areas"
    areas.mkdir()
    (tmp_path / "scripts").mkdir()

    (areas / "guide.md").write_text(
        "# Guide\n\n"
        "> **Plan queue:** None.\n\n"
        "## Scope\n## Read first\n## Source map\n## Invariants\n"
        "## Change map\n\n"
        "| Change type | Source globs |\n"
        "|---|---|\n"
        "| Nonexistent | `scripts/ghost.py` |\n"
        "## Work queue\n## Cross-references\n",
        encoding="utf-8",
    )
    errs = cd.check_area_guide_contract(docs)
    assert any("does not match any file" in e.message for e in errs)


def test_change_map_todo_type_is_rejected(tmp_path: Path, monkeypatch):
    """A row with TODO as change type is an error."""
    monkeypatch.setattr(cd, "REPO_ROOT", tmp_path)
    docs = _write_docs_tree(tmp_path, manifest="# Docs\n")
    areas = docs / "areas"
    areas.mkdir()

    (areas / "guide.md").write_text(
        "# Guide\n\n"
        "> **Plan queue:** None.\n\n"
        "## Scope\n## Read first\n## Source map\n## Invariants\n"
        "## Change map\n\n"
        "| Change type | Source globs |\n"
        "|---|---|\n"
        "| TODO | `scripts/stub.py` |\n"
        "## Work queue\n## Cross-references\n",
        encoding="utf-8",
    )
    errs = cd.check_area_guide_contract(docs)
    assert any("TODO" in e.message and "change type" in e.message.lower() for e in errs)


def test_change_map_empty_source_cell_is_rejected(tmp_path: Path, monkeypatch):
    """A row with only descriptive text and no file globs in the source cell is an error."""
    monkeypatch.setattr(cd, "REPO_ROOT", tmp_path)
    docs = _write_docs_tree(tmp_path, manifest="# Docs\n")
    areas = docs / "areas"
    areas.mkdir()

    (areas / "guide.md").write_text(
        "# Guide\n\n"
        "> **Plan queue:** None.\n\n"
        "## Scope\n## Read first\n## Source map\n## Invariants\n"
        "## Change map\n\n"
        "| Change type | Source globs |\n"
        "|---|---|\n"
        "| Placeholder |  |\n"
        "## Work queue\n## Cross-references\n",
        encoding="utf-8",
    )
    errs = cd.check_area_guide_contract(docs)
    assert any("no source globs" in e.message for e in errs)
