#!/usr/bin/env python
"""Documentation contract checker for the D&D Kids Resources repo.

Validates that documentation is consistent, complete, and internally
coherent. Runs locally as a fast pre-commit gate and will be integrated
into CI in DOC6.

Usage:
    python scripts/check_docs.py --check
    python scripts/check_docs.py --write-generated
    python scripts/check_docs.py --check --base origin/main

Exit codes:
    0  All checks pass.
    1  One or more checks failed (details printed to stderr).
"""

from __future__ import annotations

import argparse
import contextlib
import importlib.util
import io
import json
import re
import sqlite3
import subprocess
import sys
import tempfile
import textwrap
from configparser import ConfigParser
from pathlib import Path
from urllib.parse import unquote

REPO_ROOT = Path(__file__).resolve().parent.parent
DOCS_DIR = REPO_ROOT / "docs"


def _safe_rel(path: Path, anchor: Path = REPO_ROOT) -> str:
    """Return a relative string from *anchor*, or just the filename."""
    try:
        return str(path.relative_to(anchor))
    except ValueError:
        return path.name
PLAN_TEMPLATE = DOCS_DIR / "PLAN_TEMPLATE.md"
README = DOCS_DIR / "README.md"
CLAUDE_MD = REPO_ROOT / "CLAUDE.md"
AREA_GUIDES_DIR = DOCS_DIR / "areas"
ACTIVE_PLANS_DIR = DOCS_DIR / "plans" / "active"

STATUS_RE = re.compile(r"^>\s*\*\*Status:\*\*\s*(.+)$", re.MULTILINE)
STAGE_HEADING_RE = re.compile(r"^#{2,6}\s+(.+?)\s*\(next up\)", re.MULTILINE)
EXECUTABLE_STAGE_RE = re.compile(
    r"^(#{2,6})\s+([A-Z]+\d+\s+[^\n]+?)\s*\((?:next up|planned|next after[^)]*)\)\s*$",
    re.MULTILINE,
)
EXECUTION_FIELDS = (
    "Read first", "Build", "Inherits", "Expected touch set", "Documentation impact", "Tests", "Gate", "Completion edit",
)
EXECUTION_FIELD_RE = re.compile(r"^\s*-\s+\*\*([^:]+):\*\*\s*(.+)$", re.MULTILINE)
SHIPPED_STAGE_RE = re.compile(r"^\|\s+\*\*([A-Z]+\d+)\*\*\s+\|", re.MULTILINE)
FORBIDDEN_PATTERNS = [
    ("Flask reference", re.compile(r"\bFlask\b", re.IGNORECASE)),
    ("_dev/ reference", re.compile(r"_dev/")),
    ("server_flask.py reference", re.compile(r"server_flask\.py")),
]
GUIDE_PATHS = [
    "docs/guides/GETTING_STARTED.md",
    "docs/guides/SETUP.md",
]
MARKDOWN_LINK_RE = re.compile(r"(?<!!)\[[^\]]*\]\(([^)]+)\)")
HEADING_RE = re.compile(r"^#{1,6}\s+(.+?)\s*#*\s*$", re.MULTILINE)
ACTIVE_PLAN_RE = re.compile(r"^>\s*\*\*Active plan:\*\*\s*(.+?)\s*$", re.MULTILINE)
AREA_GUIDE_RE = re.compile(r"^\s*-\s+\*\*Area guide:\*\*\s*\[[^\]]+\]\(([^)]+)\)\.?\s*$", re.MULTILINE)
AREA_GUIDE_HEADINGS = {"scope", "read-first", "source-map", "invariants", "work-queue", "cross-references"}
IMPLEMENTATION_PREFIXES = ("backend/", "frontend/", "scripts/", "data/", ".github/")
GENERATED_CONTRACT_REFERENCES = {
    "scripts/init_database.py": {"docs/DATA_MODEL.md"},
    "pytest.ini": {"docs/TESTING.md"},
    "frontend/package.json": {"docs/TESTING.md"},
    "frontend/src/theme.css": {"docs/DESIGN_SYSTEM.md"},
}
GENERATED_MARKERS = {
    "API_REFERENCE.md": "API",
    "DATA_MODEL.md": "DATA_MODEL",
    "ARCHITECTURE.md": "ARCHITECTURE",
    "DESIGN_SYSTEM.md": "DESIGN_SYSTEM",
    "TESTING.md": "TESTING",
}


class CheckError:
    """A single actionable documentation error."""

    def __init__(self, source: str, message: str, remediation: str) -> None:
        self.source = source
        self.message = message
        self.remediation = remediation

    def __str__(self) -> str:
        return (
            f"\nSource:    {self.source}\n"
            f"Error:     {self.message}\n"
            f"Fix:       {self.remediation}\n"
        )


# ── Metadata parsing ────────────────────────────────────────────────


def parse_plan_metadata(text: str) -> dict[str, str | None]:
    """Extract status and current_stage from plan markdown content.

    Returns a dict with keys ``status``, ``status_source``,
    ``current_stage``, and ``current_stage_source``.  Each value is
    ``None`` when not found; the ``*_source`` keys describe where the
    value was found for diagnostic messages.

    Metadata format (no YAML dependency):
        Status:      > **Status:** <text>   (blockquote anywhere in file)
        Current:     #### X<n> — <name> (next up)  (first match in headings)
    """
    result: dict[str, str | None] = {
        "status": None,
        "status_source": None,
        "current_stage": None,
        "current_stage_source": None,
    }

    m = STATUS_RE.search(text)
    if m:
        result["status"] = m.group(1).strip()
        result["status_source"] = "Status blockquote"

    m = STAGE_HEADING_RE.search(text)
    if m:
        result["current_stage"] = m.group(1).strip()
        result["current_stage_source"] = "Stage heading"

    return result


def github_anchor(heading: str) -> str:
    """Return the GitHub-style anchor used by the manifest for a heading."""
    cleaned = re.sub(r"[^\w\s-]", "", heading.lower())
    return "-".join(cleaned.split())


def parse_execution_stages(text: str) -> list[dict[str, object]]:
    """Extract executable stage blocks and their declared execution fields."""
    matches = list(EXECUTABLE_STAGE_RE.finditer(text))
    stages: list[dict[str, object]] = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        fields = {
            field_match.group(1).strip().removeprefix("🚦 "): field_match.group(2).strip()
            for field_match in EXECUTION_FIELD_RE.finditer(text[match.end():end])
        }
        heading = match.group(2).strip()
        stages.append({
            "id": heading.split(maxsplit=1)[0],
            "heading": heading,
            "is_current": "(next up)" in match.group(0),
            "fields": fields,
        })
    return stages


def find_legacy_plan_files(docs_dir: Path) -> list[Path]:
    """Return legacy root *_plan.md files, excluding PLAN_TEMPLATE.md.

    Matches the naming convention ``<feature>_plan.md`` where <feature>
    contains lowercase letters, digits, underscores, and hyphens (the project's
    actual plan-file pattern).
    """
    plans = sorted(docs_dir.glob("*_plan.md"))
    return [
        p for p in plans
        if p.name != "PLAN_TEMPLATE.md"
        and re.fullmatch(r"[a-z0-9_-]+_plan\.md", p.name)
    ]


def find_active_plan_files(docs_dir: Path) -> list[Path]:
    """Return focused execution plans from the active-plan directory."""
    active_dir = docs_dir / "plans" / "active"
    return sorted(active_dir.glob("*.md")) if active_dir.exists() else []


def find_area_guides(docs_dir: Path) -> list[Path]:
    """Return durable area guides from the area-guide directory."""
    area_dir = docs_dir / "areas"
    return sorted(area_dir.glob("*.md")) if area_dir.exists() else []


def parse_manifest_plan_files(readme_path: Path) -> list[str]:
    """Extract plan filenames listed in docs/README.md.

    Looks for table rows containing ``_plan.md`` links.
    """
    content = readme_path.read_text(encoding="utf-8")
    return re.findall(r"\[([^\]]+_plan\.md)\]", content)


def _is_redirect(content: str) -> bool:
    return "moved to" in content.lower() and "complete" in content.lower()


def _markdown_anchors(content: str) -> set[str]:
    return {github_anchor(match.group(1)) for match in HEADING_RE.finditer(content)}


def _local_link_target(source: Path, raw_target: str, repo_root: Path) -> tuple[Path, str | None] | None:
    """Resolve a repository-local Markdown link, including Windows separators."""
    target = raw_target.strip().split(maxsplit=1)[0].strip("<>")
    if not target or target.startswith(("#", "http://", "https://", "mailto:")):
        return None
    path_text, separator, anchor = target.partition("#")
    path_text = unquote(path_text).replace("\\", "/")
    path = (source.parent / path_text).resolve()
    try:
        path.relative_to(repo_root.resolve())
    except ValueError:
        return None
    return path, anchor if separator else None


# ── Checks ──────────────────────────────────────────────────────────


def check_plan_metadata(plan_path: Path) -> list[CheckError]:
    """Validate that a plan file has required metadata."""
    errors: list[CheckError] = []
    rel = _safe_rel(plan_path)

    try:
        content = plan_path.read_text(encoding="utf-8")
    except UnicodeDecodeError as exc:
        errors.append(CheckError(rel, f"Cannot read file: {exc}", "Fix file encoding"))
        return errors

    # Completed plans remain at their former root paths only as link-preserving redirects.
    # Redirects have no executable next stage.
    if _is_redirect(content):
        return errors

    meta = parse_plan_metadata(content)

    if meta["status"] is None:
        errors.append(CheckError(
            rel,
            "Missing status blockquote",
            "Add '> **Status:** ...' after the first paragraph (see PLAN_TEMPLATE.md)",
        ))

    # The Plan -> Implement -> Reconcile workflow uses lean Plans whose stages are
    # plain-English list items, not '(next up)' execution blocks. A current-stage
    # heading is therefore optional; only the Status line is required.

    return errors


WORK_ORDER_FIELDS = ("GOAL:", "START IN:", "STOP WHEN:", "STATUS:")


def check_work_orders(docs_dir: Path) -> list[CheckError]:
    """Lint work-order files for the load-bearing fields a small model needs.

    Work orders live under docs/plans/active/orders/<feature>/ and drive the
    Plan -> Implement -> Reconcile workflow. Each must name a goal, where to start,
    a hard stop condition, and a status line, so a fresh cheap-model context can
    execute it without wandering. This is a light structural check only.
    """
    errors: list[CheckError] = []
    orders_root = docs_dir / "plans" / "active" / "orders"
    if not orders_root.exists():
        return errors
    for order in sorted(orders_root.rglob("*.md")):
        content = order.read_text(encoding="utf-8")
        missing = [label for label in WORK_ORDER_FIELDS if label not in content]
        if missing:
            errors.append(CheckError(
                _safe_rel(order),
                f"Work order is missing required fields: {', '.join(missing)}",
                "Add the missing work-order fields (see PLAN_TEMPLATE.md)",
            ))
    return errors


def check_plan_execution_contract(plan_path: Path) -> list[CheckError]:
    """Validate DOC3 execution fields and lifecycle invariants for a plan."""
    errors: list[CheckError] = []
    rel = _safe_rel(plan_path)
    content = plan_path.read_text(encoding="utf-8")

    if _is_redirect(content):
        return errors

    stages = parse_execution_stages(content)
    current_stages = [stage for stage in stages if stage["is_current"]]
    if len(current_stages) > 1:
        errors.append(CheckError(
            rel,
            f"Duplicate current stages: {', '.join(str(stage['id']) for stage in current_stages)}",
            "Keep exactly one '(next up)' execution block",
        ))

    for stage in stages:
        fields = stage["fields"]
        missing = [field for field in EXECUTION_FIELDS if field not in fields]
        if missing:
            errors.append(CheckError(
                rel,
                f"Stage {stage['id']} is missing execution fields: {', '.join(missing)}",
                "Add the required labeled fields from PLAN_TEMPLATE.md",
            ))

    shipped_ids = set(SHIPPED_STAGE_RE.findall(content))
    verbose_shipped = sorted(shipped_ids & {str(stage["id"]) for stage in stages})
    if verbose_shipped:
        errors.append(CheckError(
            rel,
            f"Shipped stages retain verbose blocks: {', '.join(verbose_shipped)}",
            "Delete each shipped stage block; retain only its Shipped stages table row",
        ))

    return errors


def check_manifest_current_stage_anchors(docs_dir: Path, readme_path: Path) -> list[CheckError]:
    """Require every active plan's manifest row to link to its current stage."""
    errors: list[CheckError] = []
    manifest = readme_path.read_text(encoding="utf-8")
    for plan_path in find_active_plan_files(docs_dir):
        content = plan_path.read_text(encoding="utf-8")
        metadata = parse_plan_metadata(content)
        if metadata["current_stage"] is None:
            continue
        heading_match = STAGE_HEADING_RE.search(content)
        assert heading_match is not None
        expected = f"(plans/active/{plan_path.name}#{github_anchor(heading_match.group(0).lstrip('#').strip())})"
        if expected not in manifest:
            errors.append(CheckError(
                "docs/README.md",
                f"Missing direct current-stage anchor for {plan_path.name}",
                f"Link its manifest row directly to {expected[1:-1]}",
            ))
    return errors


def check_manifest_completeness(docs_dir: Path, readme_path: Path) -> list[CheckError]:
    """Validate that the manifest lists legacy redirects and every area guide."""
    errors: list[CheckError] = []

    actual = [p.name for p in find_legacy_plan_files(docs_dir)]
    listed = parse_manifest_plan_files(readme_path)

    missing = [name for name in actual if name not in listed]
    if missing:
        errors.append(CheckError(
            "docs/README.md",
            f"Missing plan files in manifest: {', '.join(missing)}",
            "Add a row to the Feature Plans table in docs/README.md",
        ))
    for guide in find_area_guides(docs_dir):
        expected = f"areas/{guide.name}"
        if expected not in readme_path.read_text(encoding="utf-8"):
            errors.append(CheckError(
                "docs/README.md",
                f"Missing area guide in manifest: {expected}",
                "Add a canonical area-guide row to docs/README.md",
            ))

    return errors


def check_forbidden_references(doc_dir: Path) -> list[CheckError]:
    """Scan active docs for references to legacy Flask paths."""
    errors: list[CheckError] = []

    for md in sorted(doc_dir.rglob("*.md")):
        try:
            rel = md.relative_to(doc_dir)
        except ValueError:
            rel = md
        if any(part in ("complete", "archive") for part in rel.parts):
            continue

        rel = _safe_rel(md)
        try:
            content = md.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue

        for label, pattern in FORBIDDEN_PATTERNS:
            if pattern.search(content):
                errors.append(CheckError(
                    rel,
                    f"Forbidden legacy reference: {label}",
                    f"Remove or update the stale {label} reference",
                ))

    return errors


def check_local_links(docs_dir: Path, repo_root: Path) -> list[CheckError]:
    """Validate paths and anchors in repository-local Markdown links."""
    errors: list[CheckError] = []
    for markdown in sorted(docs_dir.rglob("*.md")):
        relative = markdown.relative_to(docs_dir)
        if any(part in ("complete", "archive") for part in relative.parts):
            continue
        content = markdown.read_text(encoding="utf-8")
        for match in MARKDOWN_LINK_RE.finditer(content):
            resolved = _local_link_target(markdown, match.group(1), repo_root)
            if resolved is None:
                continue
            target, anchor = resolved
            source = _safe_rel(markdown, repo_root)
            if not target.exists():
                errors.append(CheckError(
                    source,
                    f"Local link target does not exist: {match.group(1)}",
                    "Correct the link target or create the referenced file",
                ))
                continue
            if anchor and target.is_file() and anchor not in _markdown_anchors(target.read_text(encoding="utf-8")):
                errors.append(CheckError(
                    source,
                    f"Local link anchor does not exist: {match.group(1)}",
                    "Link to an existing heading using its GitHub-style anchor",
                ))
    return errors


def check_plan_lifecycle(docs_dir: Path, readme_path: Path) -> list[CheckError]:
    """Ensure legacy root plans are valid redirects to their historical archive."""
    errors: list[CheckError] = []
    manifest = readme_path.read_text(encoding="utf-8")
    for plan_path in find_legacy_plan_files(docs_dir):
        content = plan_path.read_text(encoding="utf-8")
        if _is_redirect(content):
            target = docs_dir / "complete" / plan_path.name
            if not target.exists():
                errors.append(CheckError(
                    _safe_rel(plan_path),
                    "Redirect plan has no archived target",
                    f"Move the completed plan to docs/complete/{plan_path.name} or repair the redirect",
                ))
            continue
        if plan_path.name not in manifest:
            errors.append(CheckError(
                "docs/README.md",
                f"Legacy plan redirect is not represented in the manifest: {plan_path.name}",
                "Add or repair the redirect's manifest row",
            ))
    return errors


def check_area_guide_contract(docs_dir: Path) -> list[CheckError]:
    """Ensure guides and active plans form one unambiguous ownership relationship."""
    errors: list[CheckError] = []
    guides = find_area_guides(docs_dir)
    active_plans = find_active_plan_files(docs_dir)
    guide_paths = {guide.resolve() for guide in guides}
    active_paths = {plan.resolve() for plan in active_plans}
    guide_targets: dict[Path, Path] = {}

    for guide in guides:
        content = guide.read_text(encoding="utf-8")
        headings = {github_anchor(match.group(1)) for match in HEADING_RE.finditer(content)}
        missing = sorted(AREA_GUIDE_HEADINGS - headings)
        if missing:
            errors.append(CheckError(
                _safe_rel(guide),
                f"Missing required area-guide sections: {', '.join(missing)}",
                "Add the required sections from PLAN_TEMPLATE.md",
            ))
        status = ACTIVE_PLAN_RE.search(content)
        if not status:
            errors.append(CheckError(
                _safe_rel(guide),
                "Missing active-plan status blockquote",
                "Add '> **Active plan:** None.' or a link to one active execution plan",
            ))
            continue
        link = MARKDOWN_LINK_RE.search(status.group(1))
        if not link:
            if not status.group(1).strip().lower().startswith("none"):
                errors.append(CheckError(
                    _safe_rel(guide),
                    "Active-plan status must be None or a Markdown link",
                    "Link directly to the active plan's current-stage anchor",
                ))
            continue
        resolved = _local_link_target(guide, link.group(1), REPO_ROOT)
        if resolved is None or resolved[0].resolve() not in active_paths:
            errors.append(CheckError(
                _safe_rel(guide),
                "Active-plan link does not target an active execution plan",
                "Point it at a file under docs/plans/active/",
            ))
            continue
        # A stage anchor is optional: lean Plans have plain-English stages, not
        # '(next up)' headings to anchor to. Linking to the plan file is enough.
        target, _anchor = resolved
        guide_targets[target.resolve()] = guide.resolve()

    for plan in active_plans:
        content = plan.read_text(encoding="utf-8")
        match = AREA_GUIDE_RE.search(content)
        if not match:
            errors.append(CheckError(
                _safe_rel(plan),
                "Missing Area guide line",
                "Add an Area guide Markdown link immediately after the status block",
            ))
            continue
        resolved = _local_link_target(plan, match.group(1), REPO_ROOT)
        if resolved is None or resolved[0].resolve() not in guide_paths:
            errors.append(CheckError(
                _safe_rel(plan),
                "Area guide link does not target a file under docs/areas/",
                "Link this plan to its owning area guide",
            ))
            continue
        if guide_targets.get(plan.resolve()) != resolved[0].resolve():
            errors.append(CheckError(
                _safe_rel(plan),
                "Owning area guide does not point back to this active plan",
                "Update the guide's Active plan link to this plan's current-stage anchor",
            ))
    return errors


def check_instruction_precedence(repo_root: Path) -> list[CheckError]:
    """Keep every supported AI entry point subordinate to CLAUDE.md."""
    errors: list[CheckError] = []
    requirements = {
        "CLAUDE.md": ("single authoritative instruction",),
        "AGENTS.md": ("claude.md", "docs/readme.md"),
        ".github/copilot-instructions.md": ("claude.md", "docs/readme.md"),
    }
    for relative, phrases in requirements.items():
        path = repo_root / relative
        if not path.exists():
            errors.append(CheckError(relative, "Required AI entry point is missing", "Restore the supported entry point"))
            continue
        content = path.read_text(encoding="utf-8").lower()
        missing = [phrase for phrase in phrases if phrase not in content]
        if missing:
            errors.append(CheckError(
                relative,
                f"Instruction precedence is incomplete; missing: {', '.join(missing)}",
                "Point the entry file to CLAUDE.md and the documentation manifest",
            ))
    return errors


def check_configured_test_commands(repo_root: Path) -> list[CheckError]:
    """Require TESTING.md to document commands derived from current test config."""
    errors: list[CheckError] = []
    testing = repo_root / "docs" / "TESTING.md"
    pytest_ini = repo_root / "pytest.ini"
    package_json = repo_root / "frontend" / "package.json"
    if not all(path.exists() for path in (testing, pytest_ini, package_json)):
        return errors
    content = testing.read_text(encoding="utf-8")
    parser = ConfigParser()
    parser.read(pytest_ini, encoding="utf-8")
    coverage = parser.get("pytest", "addopts", fallback="")
    package = json.loads(package_json.read_text(encoding="utf-8"))
    commands = ["pytest", "npm run test"]
    for script in ("lint", "typecheck", "build"):
        if script in package.get("scripts", {}):
            commands.append(f"npm run {script}")
    for command in commands:
        if command not in content:
            errors.append(CheckError("docs/TESTING.md", f"Missing configured test command: {command}", "Document the command from pytest.ini or frontend/package.json"))
    threshold = re.search(r"--cov-fail-under=(\d+)", coverage)
    if threshold and threshold.group(1) not in content:
        errors.append(CheckError("docs/TESTING.md", f"Missing configured coverage threshold: {threshold.group(1)}%", "Update the documented coverage gate to match pytest.ini"))
    return errors


def check_guide_links(docs_dir: Path) -> list[CheckError]:
    """Verify that advertised guide paths actually exist."""
    errors: list[CheckError] = []

    for guide_path in GUIDE_PATHS:
        full = REPO_ROOT / guide_path
        if not full.exists():
            errors.append(CheckError(
                "docs/README.md",
                f"Advertised guide path does not exist: {guide_path}",
                "Either create the guide file or remove the reference from documentation",
            ))

    return errors


def run_all_checks(docs_dir: Path) -> list[CheckError]:
    """Run the full suite of documentation contract checks."""
    errors: list[CheckError] = []

    readme = docs_dir / "README.md"
    if not readme.exists():
        errors.append(CheckError(
            "docs/README.md",
            "docs/README.md does not exist",
            "Create docs/README.md as the documentation manifest",
        ))
        return errors

    for plan in find_active_plan_files(docs_dir):
        errors.extend(check_plan_metadata(plan))

    errors.extend(check_work_orders(docs_dir))
    errors.extend(check_manifest_completeness(docs_dir, readme))
    errors.extend(check_forbidden_references(docs_dir))
    errors.extend(check_plan_lifecycle(docs_dir, readme))
    errors.extend(check_area_guide_contract(docs_dir))

    return errors


# ── Base-aware checks ────────────────────────────────────────────────


def run_diff_checks(docs_dir: Path, base: str) -> list[CheckError]:
    """Require code changes to carry their active plan and declared doc impact."""
    errors: list[CheckError] = []

    try:
        subprocess.run(
            ["git", "rev-parse", "--verify", base],
            cwd=REPO_ROOT,
            capture_output=True,
            check=True,
        )
    except (subprocess.CalledProcessError, FileNotFoundError):
        errors.append(CheckError(
            "--base ref",
            f"Git reference '{base}' not found",
            "Provide a valid branch name or commit SHA (e.g., origin/main, HEAD~3)",
        ))

        return errors

    diff = subprocess.run(
        ["git", "diff", "--name-only", base],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=True,
    )
    untracked = subprocess.run(
        ["git", "ls-files", "--others", "--exclude-standard"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=True,
    )
    changed = {
        line.replace("\\", "/")
        for output in (diff.stdout, untracked.stdout)
        for line in output.splitlines()
        if line
    }
    # Note: implementation changes are no longer coupled to an active-plan edit.
    # Under the Plan -> Implement -> Reconcile workflow, code lands per work order
    # and the Plan is reconciled in batches, so per-diff plan edits are not required.
    # Generated-contract references still must move with their source.
    for source, references in GENERATED_CONTRACT_REFERENCES.items():
        if source not in changed:
            continue
        for reference in references:
            if reference not in changed:
                errors.append(CheckError(
                    source,
                    f"Generated-contract change does not update its named reference: {reference}",
                    "Update the named generated reference in the same change set",
                ))
    return errors


# ── Generated reference sections ────────────────────────────────────


def _schema_name(value: object) -> str:
    if isinstance(value, dict) and "$ref" in value:
        return str(value["$ref"]).rsplit("/", maxsplit=1)[-1]
    if isinstance(value, dict) and "items" in value:
        return f"List[{_schema_name(value['items'])}]"
    if isinstance(value, dict) and "type" in value:
        return str(value["type"])
    return "-"


def generate_api_inventory(repo_root: Path) -> str:
    """Render endpoints from FastAPI's OpenAPI contract without starting a server."""
    sys.path.insert(0, str(repo_root))
    try:
        from backend.app.main import app
        paths = app.openapi()["paths"]
    finally:
        sys.path.pop(0)

    lines = ["### Generated API Inventory", "", "| Method | Path | Parameters | Request | Responses |", "|---|---|---|---|---|"]
    for path in sorted(path for path in paths if path.startswith("/api/")):
        for method, operation in sorted(paths[path].items()):
            if method not in {"get", "post", "put", "patch", "delete"}:
                continue
            parameters = ", ".join(
                f"`{item['name']}` ({item['in']}{', required' if item.get('required') else ''})"
                for item in operation.get("parameters", [])
            ) or "-"
            request = _schema_name(operation.get("requestBody", {}).get("content", {}).get("application/json", {}).get("schema", {}))
            responses = ", ".join(
                f"{status}: {_schema_name(response.get('content', {}).get('application/json', {}).get('schema', {}))}"
                for status, response in sorted(operation.get("responses", {}).items())
            )
            lines.append(f"| {method.upper()} | `{path}` | {parameters} | {request} | {responses} |")
    return "\n".join(lines) + "\n"


def generate_data_model_inventory(repo_root: Path) -> str:
    """Render SQLite metadata from a disposable database built by the real initializer."""
    spec = importlib.util.spec_from_file_location("doc_schema_initializer", repo_root / "scripts" / "init_database.py")
    assert spec and spec.loader
    initializer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(initializer)
    with tempfile.TemporaryDirectory() as directory:
        db_path = Path(directory) / "documentation-schema.db"
        with contextlib.redirect_stdout(io.StringIO()):
            initializer.init_database(db_path)
        connection = sqlite3.connect(db_path)
        try:
            tables = [row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")]
            lines = ["### Generated Schema Inventory", ""]
            for table in tables:
                columns = connection.execute(f"PRAGMA table_info({table})").fetchall()
                foreign_keys = connection.execute(f"PRAGMA foreign_key_list({table})").fetchall()
                indexes = connection.execute(f"PRAGMA index_list({table})").fetchall()
                lines.extend([f"#### `{table}`", "", "| Column | Type | Required | Default |", "|---|---|---|---|"])
                for _, name, column_type, not_null, default, primary_key in columns:
                    lines.append(f"| `{name}` | `{column_type or 'ANY'}` | {'yes' if not_null or primary_key else 'no'} | `{default or '-'}` |")
                if foreign_keys:
                    lines.extend(["", "Foreign keys: " + ", ".join(f"`{row[3]}` -> `{row[2]}.{row[4]}` ({row[6]})" for row in foreign_keys) + "."])
                if indexes:
                    lines.extend(["", "Indexes: " + ", ".join(f"`{row[1]}`" for row in indexes) + "."])
                lines.append("")
            return "\n".join(lines)
        finally:
            connection.close()


def generate_architecture_inventory(repo_root: Path) -> str:
    """Render registered backend routers and top-level frontend feature directories."""
    main = (repo_root / "backend" / "app" / "main.py").read_text(encoding="utf-8")
    routers = re.findall(r"app\.include_router\((\w+)\.router\)", main)
    features = sorted(path.name for path in (repo_root / "frontend" / "src" / "features").iterdir() if path.is_dir() and not path.name.startswith("__"))
    return "\n".join(["### Generated Registration Inventory", "", "Backend routers registered in `main.py`: " + ", ".join(f"`{router}.py`" for router in routers) + ".", "", "Frontend feature directories: " + ", ".join(f"`{feature}/`" for feature in features) + ".", ""])


def generate_design_inventory(repo_root: Path) -> str:
    """Render CSS custom-property and supported data-variant inventories."""
    css = (repo_root / "frontend" / "src" / "theme.css").read_text(encoding="utf-8")
    tokens = sorted(set(re.findall(r"^\s*(--[\w-]+):", css, re.MULTILINE)))
    variants = sorted(set(re.findall(r"\[data-variant=['\"]([^'\"]+)['\"]\]", css)))
    return "\n".join(["### Generated Design Inventory", "", "CSS custom properties: " + ", ".join(f"`{token}`" for token in tokens) + ".", "", "Supported `data-variant` values: " + ", ".join(f"`{variant}`" for variant in variants) + ".", ""])


def generate_testing_inventory(repo_root: Path) -> str:
    """Render test commands from pytest.ini and frontend/package.json."""
    config = ConfigParser()
    config.read(repo_root / "pytest.ini", encoding="utf-8")
    package = json.loads((repo_root / "frontend" / "package.json").read_text(encoding="utf-8"))
    addopts = config.get("pytest", "addopts", fallback="").split()
    threshold = next((value.split("=", maxsplit=1)[1] for value in addopts if value.startswith("--cov-fail-under=")), "not configured")
    lines = ["### Generated Test Configuration", "", f"- Pytest paths: `{config.get('pytest', 'testpaths', fallback='backend/tests')}`.", f"- Pytest coverage threshold: `{threshold}%`.", f"- Pytest default options: `{' '.join(addopts)}`.", "- Frontend scripts:"]
    lines.extend(f"  - `npm run {name}`: `{command}`" for name, command in sorted(package.get("scripts", {}).items()))
    return "\n".join(lines) + "\n"


def generated_sections(repo_root: Path) -> dict[str, str]:
    return {
        "API_REFERENCE.md": generate_api_inventory(repo_root),
        "DATA_MODEL.md": generate_data_model_inventory(repo_root),
        "ARCHITECTURE.md": generate_architecture_inventory(repo_root),
        "DESIGN_SYSTEM.md": generate_design_inventory(repo_root),
        "TESTING.md": generate_testing_inventory(repo_root),
    }


def replace_generated_section(content: str, marker: str, generated: str) -> str:
    """Replace one exact marker pair, rejecting missing or duplicate markers."""
    start = f"<!-- GENERATED:{marker}:START -->"
    end = f"<!-- GENERATED:{marker}:END -->"
    if content.count(start) != 1 or content.count(end) != 1:
        raise ValueError(f"Expected exactly one {start} and {end} marker pair")
    start_index = content.index(start) + len(start)
    end_index = content.index(end, start_index)
    return content[:start_index] + "\n" + generated.rstrip() + "\n" + content[end_index:]


def check_generated_sections(docs_dir: Path, repo_root: Path) -> list[CheckError]:
    """Fail when generated inventories are missing, malformed, or stale."""
    errors: list[CheckError] = []
    for filename, generated in generated_sections(repo_root).items():
        path = docs_dir / filename
        try:
            content = path.read_text(encoding="utf-8")
            expected = replace_generated_section(content, GENERATED_MARKERS[filename], generated)
        except ValueError as exc:
            errors.append(CheckError(_safe_rel(path, repo_root), str(exc), "Add the stable generated-section markers and run --write-generated"))
            continue
        if expected != content:
            errors.append(CheckError(_safe_rel(path, repo_root), "Generated inventory is stale", "Run python scripts/check_docs.py --write-generated"))
    return errors


def write_generated_sections(docs_dir: Path, repo_root: Path = REPO_ROOT) -> int:
    """Refresh only stable generated sections, preserving surrounding prose."""
    try:
        for filename, generated in generated_sections(repo_root).items():
            path = docs_dir / filename
            content = path.read_text(encoding="utf-8")
            path.write_text(replace_generated_section(content, GENERATED_MARKERS[filename], generated), encoding="utf-8")
    except ValueError as exc:
        print(f"Documentation generation failed: {exc}", file=sys.stderr)
        return 1
    print("Documentation generated sections refreshed.")
    return 0


# ── CLI ─────────────────────────────────────────────────────────────


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="check_docs",
        description=(
            "Documentation contract checker for the D&D Kids Resources repo.\n"
            "Validates that documentation is consistent, complete, and internally\n"
            "coherent. Runs locally as a fast pre-commit gate."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""\
            modes:
              --check            Validate documentation contracts (default)
              --write-generated  Regenerate volatile reference sections
              --base <ref>       Additionally run diff-aware checks against <ref>

            examples:
              python scripts/check_docs.py --check
              python scripts/check_docs.py --check --base origin/main
              python scripts/check_docs.py --write-generated
        """),
    )
    group = parser.add_mutually_exclusive_group()
    group.add_argument(
        "--check",
        action="store_true",
        default=False,
        help="Run all documentation contract checks and report failures",
    )
    group.add_argument(
        "--write-generated",
        action="store_true",
        default=False,
        help="Refresh generated reference sections in documentation",
    )
    parser.add_argument(
        "--base",
        type=str,
        default=None,
        metavar="<ref>",
        help="Git ref for diff-aware checks (e.g., origin/main, HEAD~3)",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.write_generated:
        return write_generated_sections(DOCS_DIR, REPO_ROOT)

    errors = run_all_checks(DOCS_DIR)
    errors.extend(check_local_links(DOCS_DIR, REPO_ROOT))
    errors.extend(check_instruction_precedence(REPO_ROOT))
    errors.extend(check_configured_test_commands(REPO_ROOT))
    errors.extend(check_generated_sections(DOCS_DIR, REPO_ROOT))

    if args.base:
        errors.extend(run_diff_checks(DOCS_DIR, args.base))

    if errors:
        print("Documentation contract failures:", file=sys.stderr)
        for err in errors:
            print(str(err), file=sys.stderr)
        print(
            f"\n{len(errors)} failure(s). Fix the issues above and re-run.",
            file=sys.stderr,
        )
        return 1

    print("Documentation contract: all checks pass.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
