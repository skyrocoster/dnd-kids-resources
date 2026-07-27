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

sys.path.insert(0, str(Path(__file__).resolve().parent))
import check_orders  # noqa: E402  (same directory; owns the work-order lint rules)

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
PLAN_QUEUE_RE = re.compile(r"^>\s*\*\*Plan queue:\*\*$", re.MULTILINE)
PLAN_QUEUE_NONE_RE = re.compile(r"^>\s*\*\*Plan queue:\*\*\s*None\.?\s*$", re.MULTILINE)
PLAN_QUEUE_ITEM_RE = re.compile(r"^>\s*(\d+)\.\s+(.+)$")
AREA_GUIDE_RE = re.compile(r"^\s*-\s+\*\*Area guide:\*\*\s*\[[^\]]+\]\(([^)]+)\)\.?\s*$", re.MULTILINE)
AREA_GUIDE_HEADINGS = {"scope", "read-first", "source-map", "invariants", "work-queue", "cross-references"}
IMPLEMENTATION_PREFIXES = ("backend/", "frontend/", "scripts/", "data/", ".github/")
ROUTER_PATH_RE = re.compile(r"backend/app/routers/(\w+)\.py")
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
    "plans/done/INDEX.md": "ARCHIVE_INDEX",
}
GLOB_LIKE_RE = re.compile(r"[/\[\]\*\?\{\}]")
CHANGE_MAP_EXCLUDE_DIRS = frozenset({
    "__pycache__", "node_modules", "dist", "build", ".venv", "venv",
    ".pytest_cache", ".mypy_cache", ".tox",
    "5eTools", "archive",
})
CHANGE_MAP_EXCLUDE_SUFFIXES = (".err.log", ".out.log", ".coverage")
CHANGE_MAP_SECTION_RE = re.compile(r"## Change map\n(.*?)(?=\n## |\Z)", re.DOTALL)
BACKTICK_RE = re.compile(r"`([^`]+)`")

# ── Plan touch-overlap contract ─────────────────────────────────────

TOUCHES_SECTION_RE = re.compile(r"^## Touches\s*\n(.*?)(?=\n## |\Z)", re.DOTALL | re.MULTILINE)
TOUCH_GLOB_RE = re.compile(r"^\s*-\s+`([^`]+)`\s*$", re.MULTILINE)
TOUCH_DEPENDS_RE = re.compile(r"^\s*-\s+\*\*Depends on:\*\*\s+\[([^\]]+)\]\(([^)]+)\)", re.MULTILINE)
ACTIVE_WORK_ORDER_RE = re.compile(r"^\d{2,}-.*\.md$")


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
    """Return focused execution plans from feature subdirectories."""
    active_dir = docs_dir / "plans" / "active"
    if not active_dir.exists():
        return []
    plans = []
    for entry in sorted(active_dir.iterdir()):
        if entry.is_dir():
            plan_file = entry / f"{entry.name}.md"
            if plan_file.exists():
                plans.append(plan_file)
    return plans


def _parse_touches(content: str, plan_path: Path, repo_root: Path) -> tuple[list[str], list[str]]:
    """Parse ``## Touches`` section from plan content.

    Returns ``(globs, depends_on)`` where *globs* are repo-root-relative
    patterns and *depends_on* lists feature names of other active Plans
    resolved from ``- **Depends on:** [text](relative/link.md)`` entries.
    """
    m = TOUCHES_SECTION_RE.search(content)
    if not m:
        return [], []
    section = m.group(1)
    globs = [match.group(1) for match in TOUCH_GLOB_RE.finditer(section)]
    depends_on: list[str] = []
    for match in TOUCH_DEPENDS_RE.finditer(section):
        resolved = _local_link_target(plan_path, match.group(2), repo_root)
        if not resolved:
            continue
        target_path, _ = resolved
        try:
            target_path.relative_to(repo_root / "docs" / "plans" / "active")
        except ValueError:
            pass
        feature_name = target_path.parent.name
        depends_on.append(feature_name)
    return globs, depends_on


def _has_work_orders(plan_dir: Path) -> bool:
    """Return True when *plan_dir* contains at least one ``NN-*.md`` work order."""
    try:
        return any(
            entry.name.endswith(".md") and ACTIVE_WORK_ORDER_RE.match(entry.name)
            for entry in plan_dir.iterdir()
        )
    except FileNotFoundError:
        return False


def find_area_guides(docs_dir: Path) -> list[Path]:
    """Return durable area guides from the area-guide directory, excluding glossary companions."""
    area_dir = docs_dir / "areas"
    if not area_dir.exists():
        return []
    return sorted(p for p in area_dir.glob("*.md") if not p.name.endswith(".words.md"))


def parse_manifest_plan_files(readme_path: Path) -> list[str]:
    """Extract plan filenames listed in docs/README.md.

    Looks for table rows containing ``_plan.md`` links.
    """
    content = readme_path.read_text(encoding="utf-8")
    return re.findall(r"\[([^\]]+_plan\.md)\]", content)


def _is_redirect(content: str) -> bool:
    return "moved to" in content.lower() and (
        "complete" in content.lower() or "done" in content.lower()
    )


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


def check_plan_touch_overlap(docs_dir: Path) -> list[CheckError]:
    """Validate ``## Touches`` contract and reject unacknowledged file overlap between in-flight Plans.

    Every active Plan must declare a ``## Touches`` section listing repo-root-relative
    backtick-quoted globs.  A Plan is *in-flight* when its sibling directory contains at
    least one ``NN-*.md`` work order; only in-flight Plans participate in overlap checks.

    When two in-flight Plans expand to the same file the overlap is accepted only if
    either Plan directly depends on the other via ``- **Depends on:** ``feature-name`` ``.
    """
    errors: list[CheckError] = []

    active_plans = find_active_plan_files(docs_dir)
    if not active_plans:
        return errors

    active_feature_names = {plan.parent.name for plan in active_plans}
    plan_data: dict[str, dict] = {}

    for plan in active_plans:
        feature = plan.parent.name
        rel = _safe_rel(plan)
        try:
            content = plan.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue

        globs, depends_on = _parse_touches(content, plan, REPO_ROOT)
        in_flight = _has_work_orders(plan.parent)

        plan_data[feature] = {
            "path": plan,
            "rel": rel,
            "globs": globs,
            "depends_on": depends_on,
            "in_flight": in_flight,
        }

        # ── Require ## Touches ────────────────────────────────────────
        if not TOUCHES_SECTION_RE.search(content):
            errors.append(CheckError(
                rel,
                "Missing ## Touches section",
                "Add a ## Touches section with repo-root-relative backtick-quoted globs "
                "(see PLAN_TEMPLATE.md)",
            ))
            continue

        # ── Validate globs ────────────────────────────────────────────
        for g in globs:
            if g.startswith("/") or g.startswith("\\"):
                errors.append(CheckError(
                    rel,
                    f"Touch glob `{g}` must be repo-root-relative, not absolute",
                    "Remove the leading separator from the glob",
                ))
                continue
            # Reject globs that escape the repository root
            resolved: Path | None = None
            try:
                resolved = (REPO_ROOT / g).resolve()
            except (ValueError, OSError):
                pass
            if resolved is not None:
                try:
                    resolved.relative_to(REPO_ROOT.resolve())
                except ValueError:
                    errors.append(CheckError(
                        rel,
                        f"Touch glob `{g}` escapes the repository root",
                        "Use only repo-root-relative paths inside the backtick quotes",
                    ))
                    continue

            expanded = _expand_glob(g, REPO_ROOT)
            if not expanded:
                errors.append(CheckError(
                    rel,
                    f"Touch glob `{g}` does not match any file",
                    "Correct the glob or add the matching files",
                ))

        # ── Validate dependencies ─────────────────────────────────────
        for dep in depends_on:
            if dep == feature:
                errors.append(CheckError(
                    rel,
                    f"Plan depends on itself (`{dep}`)",
                    "Remove the self-dependency or target a different active Plan",
                ))
            elif dep not in active_feature_names:
                errors.append(CheckError(
                    rel,
                    f"Dependency `{dep}` does not resolve to an active Plan",
                    "Point the dependency at a feature name under docs/plans/active/",
                ))

    # ── Overlap check (in-flight Plans only) ──────────────────────────
    in_flight_features = [
        f for f, d in plan_data.items()
        if d["in_flight"] and d["globs"]
    ]

    for i in range(len(in_flight_features)):
        fa = in_flight_features[i]
        da = plan_data[fa]
        expanded_a: set[Path] = set()
        for g in da["globs"]:
            expanded_a.update(_expand_glob(g, REPO_ROOT))

        for j in range(i + 1, len(in_flight_features)):
            fb = in_flight_features[j]
            db = plan_data[fb]
            expanded_b: set[Path] = set()
            for g in db["globs"]:
                expanded_b.update(_expand_glob(g, REPO_ROOT))

            overlap = expanded_a & expanded_b
            if not overlap:
                continue

            # Accepted when either Plan directly depends on the other
            if fb in da["depends_on"] or fa in db["depends_on"]:
                continue

            example_file = _safe_rel(next(iter(overlap)))
            errors.append(CheckError(
                f"{da['rel']} and {db['rel']}",
                f"Undeclared touch overlap between in-flight Plans; shared file: {example_file}",
                "Add a '**Depends on:**' line in one Plan's ## Touches section, "
                "or remove the overlapping glob",
            ))

    return errors


def check_work_orders(docs_dir: Path) -> list[CheckError]:
    """Lint work orders against the compiling rules in scripts/check_orders.py.

    The rules themselves live next door because a compiler needs to run them while
    writing a stage's orders, not only in CI: `check_orders.py` is runnable on its own
    and each rule there is one fault the telemetry log paid to learn (an unresolvable
    path, a file named in DO but missing from START IN, a conditional instruction, an
    unscoped large file, a fixture with no typecheck). This wrapper just puts them on
    the documentation gate too.
    """
    return [
        CheckError(error.file, error.message, error.fix)
        for error in check_orders.lint_orders(docs_dir / "plans" / "active")
    ]


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
        rel_plan = plan_path.relative_to(docs_dir / "plans" / "active").as_posix()
        expected = f"(plans/active/{rel_plan}#{github_anchor(heading_match.group(0).lstrip('#').strip())})"
        if expected not in manifest:
            errors.append(CheckError(
                "docs/README.md",
                f"Missing direct current-stage anchor for {plan_path.name}",
                f"Link its manifest row directly to {expected[1:-1]}",
            ))
    return errors


def check_manifest_completeness(docs_dir: Path, readme_path: Path, inventory_path: Path) -> list[CheckError]:
    """Validate that the inventory lists legacy plan files and every area guide."""
    errors: list[CheckError] = []

    if not inventory_path.exists():
        errors.append(CheckError(
            "docs/README.md",
            "docs/INVENTORY.md does not exist",
            "Create docs/INVENTORY.md as the documentation inventory",
        ))
        return errors

    inventory_content = inventory_path.read_text(encoding="utf-8")

    # Check legacy plan files are listed in the inventory
    actual = [p.name for p in find_legacy_plan_files(docs_dir)]
    missing = [name for name in actual if name not in inventory_content]
    if missing:
        errors.append(CheckError(
            "docs/README.md",
            f"Missing plan files in manifest: {', '.join(missing)}",
            "Add a row to the Document Inventory table in docs/INVENTORY.md",
        ))

    # Check area guides are listed in the inventory
    for guide in find_area_guides(docs_dir):
        expected = f"areas/{guide.name}"
        if expected not in inventory_content:
            errors.append(CheckError(
                "docs/README.md",
                f"Missing area guide in manifest: {expected}",
                "Add a canonical area-guide row to docs/INVENTORY.md",
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
        if any(part in ("complete", "archive", "done") for part in rel.parts):
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
        if any(part in ("complete", "archive", "done") for part in relative.parts):
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
            # In the new layout, archives live under docs/plans/done/<feature>/.
            feature = plan_path.stem.replace("_plan", "")
            target = docs_dir / "plans" / "done" / feature / plan_path.name
            if not target.exists():
                errors.append(CheckError(
                    _safe_rel(plan_path),
                    "Redirect plan has no archived target",
                    f"Move the completed plan to docs/plans/done/{feature}/{plan_path.name} or repair the redirect",
                ))
            continue
        if plan_path.name not in manifest:
            errors.append(CheckError(
                "docs/README.md",
                f"Legacy plan redirect is not represented in the manifest: {plan_path.name}",
                "Add or repair the redirect's manifest row",
            ))
    return errors


def _parse_plan_queue_items(content: str, header_match_end: int) -> list[tuple[str, str]]:
    """Parse ordered list items after the Plan queue header.

    Each item is expected on its own blockquote line:
        > 1. [Link text](path) (next up)

    Returns a list of (full_item_text, link_url) tuples.
    """
    remainder = content[header_match_end:]
    items: list[tuple[str, str]] = []
    for line in remainder.splitlines():
        if not line.strip():
            continue
        m = PLAN_QUEUE_ITEM_RE.match(line)
        if not m:
            break
        item_text = m.group(2).strip()
        link_match = MARKDOWN_LINK_RE.search(item_text)
        link_url = link_match.group(1) if link_match else ""
        items.append((item_text, link_url))
    return items


def _parse_guide_source_routers(content: str) -> set[str]:
    """Extract router names from the ## Source map section of an area guide."""
    section_match = re.search(r"## Source map\n(.*?)(?=\n## |\Z)", content, re.DOTALL)
    if not section_match:
        return set()
    return {m.group(1) for m in ROUTER_PATH_RE.finditer(section_match.group(1))}


def _parse_guide_surfaces_routes(content: str) -> set[str]:
    """Extract route strings from the ## Surfaces table of an area guide."""
    section_match = re.search(r"## Surfaces\n(.*?)(?=\n## |\Z)", content, re.DOTALL)
    if not section_match:
        return set()
    table_text = section_match.group(1)
    routes: set[str] = set()
    for line in table_text.splitlines():
        stripped = line.strip()
        if not stripped.startswith("|") or stripped.startswith("|---"):
            continue
        if "Surface" in stripped and "Route" in stripped:
            continue
        parts = [p.strip() for p in stripped.split("|")]
        if len(parts) < 3:
            continue
        route_cell = parts[2]
        for candidate in route_cell.split(","):
            candidate = candidate.strip().strip("`")
            if candidate.startswith("/") and candidate != "all routes":
                routes.add(candidate)
    return routes


def _parse_change_map(content: str) -> list[tuple[str, list[str]]]:
    """Parse the ## Change map table, returning (change_type, [glob_strings]) rows."""
    section = CHANGE_MAP_SECTION_RE.search(content)
    if not section:
        return []
    table_text = section.group(1)
    rows: list[tuple[str, list[str]]] = []
    for line in table_text.splitlines():
        stripped = line.strip()
        if not stripped.startswith("|") or stripped.startswith("|---"):
            continue
        if "Change type" in stripped and "Source globs" in stripped:
            continue
        parts = [p.strip() for p in stripped.split("|")]
        if len(parts) < 3:
            continue
        change_type = parts[1]
        source_cell = parts[2]
        globs: list[str] = []
        for segment in source_cell.split("<br>"):
            for m in BACKTICK_RE.finditer(segment.strip()):
                candidate = m.group(1).strip()
                if GLOB_LIKE_RE.search(candidate):
                    globs.append(candidate)
        rows.append((change_type, globs))
    return rows


def _expand_braces(pattern: str) -> list[str]:
    """Expand brace patterns like {a,b,c} into multiple patterns."""
    m = re.search(r"\{([^{}]+)\}", pattern)
    if not m:
        return [pattern]
    options = [o.strip() for o in m.group(1).split(",")]
    prefix = pattern[:m.start()]
    suffix = pattern[m.end():]
    results: list[str] = []
    for option in options:
        results.extend(_expand_braces(prefix + option + suffix))
    return results


def _expand_glob(glob_str: str, repo_root: Path) -> set[Path]:
    """Expand a single repo-root-relative glob to matching files."""
    matches: set[Path] = set()
    for pattern in _expand_braces(glob_str):
        # pathlib glob(**/**) matches only directories, not files.
        # Append /* so the pattern matches all files recursively.
        if pattern.endswith("/**") or pattern.endswith("**"):
            pattern = pattern + "/*"
        for path in repo_root.glob(pattern):
            if path.is_file():
                matches.add(path)
    return matches


def _collect_implementation_files(repo_root: Path) -> set[Path]:
    """Collect every regular file under IMPLEMENTATION_PREFIXES, excluding cache/deps/build dirs."""
    files: set[Path] = set()
    for prefix in IMPLEMENTATION_PREFIXES:
        prefix_path = repo_root / prefix
        if not prefix_path.exists():
            continue
        for path in prefix_path.rglob("*"):
            if not path.is_file():
                continue
            if any(excl in path.parts for excl in CHANGE_MAP_EXCLUDE_DIRS):
                continue
            if path.name.endswith(CHANGE_MAP_EXCLUDE_SUFFIXES):
                continue
            files.add(path)
    return files


def check_area_guide_contract(docs_dir: Path) -> list[CheckError]:
    """Ensure guides and active plans form one unambiguous ownership relationship.

    Replaced the single Active-plan blockquote with a Plan queue contract:
      > **Plan queue:** None.
    or an ordered list whose first item is marked (next up):
      > **Plan queue:**
      > 1. [Plan A](path) (next up)
      > 2. [Plan B](path)

    Also validates that no backend router or frontend route is claimed
    by two different area guides.
    """
    errors: list[CheckError] = []
    guides = find_area_guides(docs_dir)
    active_plans = find_active_plan_files(docs_dir)
    guide_paths = {guide.resolve() for guide in guides}
    active_paths = {plan.resolve() for plan in active_plans}
    guide_targets: dict[Path, Path] = {}

    # ── Router / route / file duplicate-ownership tracking ──────────
    router_owners: dict[str, str] = {}   # router_name -> guide_rel_path
    route_owners: dict[str, str] = {}    # route_string -> guide_rel_path
    file_owners: dict[Path, Path] = {}   # absolute_file_path -> absolute_guide_path

    for guide in guides:
        rel = _safe_rel(guide)
        content = guide.read_text(encoding="utf-8")

        # ── Required headings ────────────────────────────────────────
        headings = {github_anchor(match.group(1)) for match in HEADING_RE.finditer(content)}
        missing = sorted(AREA_GUIDE_HEADINGS - headings)
        if missing:
            errors.append(CheckError(
                rel,
                f"Missing required area-guide sections: {', '.join(missing)}",
                "Add the required sections from PLAN_TEMPLATE.md",
            ))

        # ── Plan queue ───────────────────────────────────────────────
        none_match = PLAN_QUEUE_NONE_RE.search(content)
        header_match = PLAN_QUEUE_RE.search(content)
        if not none_match and not header_match:
            errors.append(CheckError(
                rel,
                "Missing Plan queue blockquote",
                "Add '> **Plan queue:** None.' or an ordered list of queued plans",
            ))
            continue

        if none_match is not None:
            # Valid empty queue — skip link validation
            pass
        elif header_match is not None:
            items = _parse_plan_queue_items(content, header_match.end())
            if not items:
                errors.append(CheckError(
                    rel,
                    "Plan queue must be 'None.' or an ordered list of links",
                    "Add '1. [Plan Name](path) (next up)' after the queue header",
                ))
                continue
            for i, (item_text, link_url) in enumerate(items):
                has_next_up = "(next up)" in item_text
                if i == 0 and not has_next_up:
                    errors.append(CheckError(
                        rel,
                        "First queued plan must be marked '(next up)'",
                        "Add '(next up)' after the first plan link",
                    ))
                elif i > 0 and has_next_up:
                    errors.append(CheckError(
                        rel,
                        "Only the first queued plan may be marked '(next up)'",
                        "Remove '(next up)' from later queued plans",
                    ))
                if not link_url:
                    errors.append(CheckError(
                        rel,
                        f"Queued item {i+1} has no Markdown link",
                        "Add a Markdown link to the active execution plan",
                    ))
                    continue
                resolved = _local_link_target(guide, link_url, REPO_ROOT)
                if resolved is None or resolved[0].resolve() not in active_paths:
                    errors.append(CheckError(
                        rel,
                        f"Plan queue link '{item_text[:60]}' does not target an active execution plan",
                        "Point it at a file under docs/plans/active/",
                    ))
                    continue
                target, _anchor = resolved
                guide_targets[target.resolve()] = guide.resolve()

        # ── Ownership: source-map routers ────────────────────────────
        for router_name in _parse_guide_source_routers(content):
            if router_name in router_owners and router_owners[router_name] != rel:
                errors.append(CheckError(
                    rel,
                    f"Router '{router_name}' is already claimed by {router_owners[router_name]}",
                    "Remove the duplicate router from one guide's Source map",
                ))
            else:
                router_owners[router_name] = rel

        # ── Ownership: surfaces routes ───────────────────────────────
        for route in _parse_guide_surfaces_routes(content):
            if route in route_owners and route_owners[route] != rel:
                errors.append(CheckError(
                    rel,
                    f"Route '{route}' is already claimed by {route_owners[route]}",
                    "Remove the duplicate route from one guide's Surfaces table",
                ))
            else:
                route_owners[route] = rel

        # ── Ownership: change-map file coverage ──────────────────────
        change_map_rows = _parse_change_map(content)
        if not change_map_rows:
            errors.append(CheckError(
                rel,
                "Missing ## Change map section",
                "Add a ## Change map table with Change type and Source globs columns",
            ))
        else:
            for i, (change_type, globs) in enumerate(change_map_rows):
                row_label = f"(row {i + 1})"
                if change_type.upper() == "TODO" or change_type.strip() == "":
                    errors.append(CheckError(
                        rel,
                        f"Change map {row_label} change type is TODO or empty",
                        "Replace TODO with a real change-type description",
                    ))
                if not globs and change_type.upper() != "TODO":
                    errors.append(CheckError(
                        rel,
                        f"Change map {row_label} ('{change_type}') has no source globs",
                        "Add repo-root-relative backtick-quoted globs in the Source globs cell",
                    ))
                for glob_str in globs:
                    expanded = _expand_glob(glob_str, REPO_ROOT)
                    if not expanded:
                        errors.append(CheckError(
                            rel,
                            f"Change map glob `{glob_str}` {row_label} ('{change_type}') does not match any file",
                            "Correct the glob or add the matching files",
                        ))
                    guide_abs = guide.resolve()
                    for fpath in expanded:
                        prev_owner = file_owners.get(fpath)
                        if prev_owner is not None and prev_owner != guide_abs:
                            errors.append(CheckError(
                                rel,
                                f"File '{_safe_rel(fpath)}' ({row_label}) is already covered by {_safe_rel(prev_owner)}'s change map",
                                "Remove this file from one guide's change map to resolve the duplicate",
                            ))
                        else:
                            file_owners[fpath] = guide_abs

    # ── Change-map universe coverage ─────────────────────────────────
    if guides:
        universe = _collect_implementation_files(REPO_ROOT)
        for fpath in sorted(universe):
            if fpath not in file_owners:
                errors.append(CheckError(
                    _safe_rel(fpath),
                    "File is not covered by any area guide's change map",
                    "Add a glob for this file to the appropriate area guide's ## Change map",
                ))

    # ── Active-plan → guide backlink validation ──────────────────────
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
                "Update the guide's Plan queue with a link to this plan",
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
    errors.extend(check_manifest_completeness(docs_dir, readme, docs_dir / "INVENTORY.md"))
    errors.extend(check_forbidden_references(docs_dir))
    errors.extend(check_plan_lifecycle(docs_dir, readme))
    errors.extend(check_area_guide_contract(docs_dir))
    errors.extend(check_plan_touch_overlap(docs_dir))

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


def generate_archive_index(repo_root: Path) -> str:
    """Generate a markdown index of all archived plans under docs/plans/done/.

    Uses `docs/plans/done/INDEX.md` GENERATED markers. Each archived-plan
    directory contributes one bullet with the plan's title, status, and
    area-guide name.
    """
    done_dir = repo_root / "docs" / "plans" / "done"
    if not done_dir.is_dir():
        return "_(no archived plans)_\n"

    lines: list[str] = []
    for entry in sorted(done_dir.iterdir()):
        if not entry.is_dir():
            continue
        md_files = sorted(entry.glob("*.md"))
        if not md_files:
            continue
        plan_file = md_files[0]
        text = plan_file.read_text(encoding="utf-8")

        # Title from first H1
        title = plan_file.stem.replace("-", " ").title()
        for line in text.splitlines():
            if line.startswith("# "):
                title = line[2:].strip()
                break

        # Status from **Status:**
        status = ""
        for line in text.splitlines():
            if "**Status:**" in line:
                raw = line.split("**Status:**", 1)[1].strip().strip(">").strip()
                status = raw.split(".")[0] + "." if "." in raw else raw
                break

        # Area guide name
        area = ""
        for line in text.splitlines():
            if "**Area guide:**" in line:
                m = re.search(r'\*\*Area guide:\*\*\s+\[([^\]]+)\]', line)
                if m:
                    area = m.group(1)
                break

        link = f"{entry.name}/{plan_file.name}"
        parts: list[str] = [f"[{title}]({link})"]
        if status:
            parts.append(status)
        if area:
            parts.append(f"({area})")
        lines.append("- " + " — ".join(parts))

    if not lines:
        return "_(no archived plans)_\n"

    return "\n".join(lines) + "\n"


def generated_sections(repo_root: Path) -> dict[str, str]:
    return {
        "API_REFERENCE.md": generate_api_inventory(repo_root),
        "DATA_MODEL.md": generate_data_model_inventory(repo_root),
        "ARCHITECTURE.md": generate_architecture_inventory(repo_root),
        "DESIGN_SYSTEM.md": generate_design_inventory(repo_root),
        "TESTING.md": generate_testing_inventory(repo_root),
        "plans/done/INDEX.md": generate_archive_index(repo_root),
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


# ── Kid palette contract ────────────────────────────────────────────


KID_PALETTE_START = "/* KID_PALETTE:START */"
KID_PALETTE_END = "/* KID_PALETTE:END */"


def _indent_kid_palette(expected: str, indent: str = "  ") -> str:
    """Indent each non-empty line of *expected* by *indent*, wrapped in newlines."""
    return "\n" + "\n".join(
        indent + line if line else "" for line in expected.rstrip().split("\n")
    ) + "\n"


def check_kid_palette(repo_root: Path) -> list[CheckError]:
    """Fail when the kid palette block in theme.css is missing, malformed, or stale."""
    errors: list[CheckError] = []
    css_path = repo_root / "frontend" / "src" / "theme.css"
    css = css_path.read_text(encoding="utf-8")

    if KID_PALETTE_START not in css or KID_PALETTE_END not in css:
        errors.append(CheckError(
            _safe_rel(css_path, repo_root),
            "Kid palette markers not found in theme.css",
            "Add /* KID_PALETTE:START */ and /* KID_PALETTE:END */ around the kid palette block",
        ))
        return errors

    start_idx = css.index(KID_PALETTE_START) + len(KID_PALETTE_START)
    end_idx = css.index(KID_PALETTE_END, start_idx)
    actual_block = css[start_idx:end_idx]

    try:
        result = subprocess.run(
            ["node", "scripts/derive-kid-palette.mjs"],
            cwd=repo_root,
            capture_output=True,
            text=True,
            check=True,
        )
    except (subprocess.CalledProcessError, FileNotFoundError) as exc:
        errors.append(CheckError(
            _safe_rel(css_path, repo_root),
            f"Cannot run derive-kid-palette.mjs: {exc}",
            "Ensure Node.js is installed and the script is present",
        ))
        return errors

    expected_block = _indent_kid_palette(result.stdout)

    if actual_block.strip() != expected_block.strip():
        errors.append(CheckError(
            _safe_rel(css_path, repo_root),
            "Kid palette block is stale or hand-edited",
            "Run node scripts/derive-kid-palette.mjs and update the KID_PALETTE block in theme.css, or run --write-generated",
        ))

    return errors


def write_kid_palette(repo_root: Path) -> bool:
    """Regenerate the kid palette block in theme.css. Returns True on success."""
    css_path = repo_root / "frontend" / "src" / "theme.css"
    css = css_path.read_text(encoding="utf-8")

    if KID_PALETTE_START not in css or KID_PALETTE_END not in css:
        print("Kid palette markers not found in theme.css — cannot write.", file=sys.stderr)
        return False

    try:
        result = subprocess.run(
            ["node", "scripts/derive-kid-palette.mjs"],
            cwd=repo_root,
            capture_output=True,
            text=True,
            check=True,
        )
    except (subprocess.CalledProcessError, FileNotFoundError) as exc:
        print(f"Cannot run derive-kid-palette.mjs: {exc}", file=sys.stderr)
        return False

    expected_block = _indent_kid_palette(result.stdout)
    start_idx = css.index(KID_PALETTE_START) + len(KID_PALETTE_START)
    end_idx = css.index(KID_PALETTE_END, start_idx)
    updated = css[:start_idx] + expected_block + css[end_idx:]
    css_path.write_text(updated, encoding="utf-8")
    return True


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
        result = write_generated_sections(DOCS_DIR, REPO_ROOT)
        if not write_kid_palette(REPO_ROOT):
            result = 1
        return result

    errors = run_all_checks(DOCS_DIR)
    errors.extend(check_local_links(DOCS_DIR, REPO_ROOT))
    errors.extend(check_instruction_precedence(REPO_ROOT))
    errors.extend(check_configured_test_commands(REPO_ROOT))
    errors.extend(check_generated_sections(DOCS_DIR, REPO_ROOT))
    errors.extend(check_kid_palette(REPO_ROOT))

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
