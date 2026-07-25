#!/usr/bin/env python3
"""Derive the export schema from init_database.py instead of restating it by hand.

`export_db_seeds.py` used to carry a hand-written column list per table. It fell behind the
schema, and because the exporter swallowed `sqlite3.OperationalError`, a renamed column silently
dropped a whole table from the seeds. This script makes the schema data: it parses the CREATE
TABLE statements in `scripts/init_database.py` — the canonical schema per
`docs/plans/active/production-nightly-deploys/production-nightly-deploys.md` — and writes them to a generated manifest that
the exporter reads.

Usage:
  python scripts/generate_export_schema.py --write     # regenerate the manifest
  python scripts/generate_export_schema.py --check     # fail if the manifest is stale
  python scripts/generate_export_schema.py --check-db  # also compare against the live database
"""

import argparse
import json
import re
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
INIT_SCRIPT = ROOT / "scripts" / "init_database.py"
DB_PATH = ROOT / "dnd_kids_resources.db"
MANIFEST_PATH = ROOT / "data" / "generated" / "export_schema.json"

CREATE_TABLE_RE = re.compile(r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\(", re.IGNORECASE)

# Lines inside a CREATE TABLE body that declare a constraint rather than a column.
CONSTRAINT_KEYWORDS = ("primary", "foreign", "unique", "check", "constraint")


def _balanced_body(text: str, open_paren_index: int) -> str:
    """Return the contents of the parenthesised block starting at open_paren_index."""
    depth = 0
    for offset, char in enumerate(text[open_paren_index:]):
        if char == "(":
            depth += 1
        elif char == ")":
            depth -= 1
            if depth == 0:
                return text[open_paren_index + 1 : open_paren_index + offset]
    raise ValueError(f"Unbalanced parentheses starting at index {open_paren_index}")


def _split_top_level(body: str) -> list[str]:
    """Split a CREATE TABLE body on commas that are not nested inside parentheses or quotes."""
    parts: list[str] = []
    current: list[str] = []
    depth = 0
    quote: str | None = None
    for char in body:
        if quote:
            current.append(char)
            if char == quote:
                quote = None
            continue
        if char in "'\"":
            quote = char
            current.append(char)
            continue
        if char == "(":
            depth += 1
        elif char == ")":
            depth -= 1
        if char == "," and depth == 0:
            parts.append("".join(current))
            current = []
            continue
        current.append(char)
    if current:
        parts.append("".join(current))
    return [part.strip() for part in parts if part.strip()]


def parse_schema(source: str) -> dict[str, list[str]]:
    """Extract {table: [column, ...]} from the CREATE TABLE statements in init_database.py."""
    schema: dict[str, list[str]] = {}
    for match in CREATE_TABLE_RE.finditer(source):
        table = match.group(1)
        body = _balanced_body(source, match.end() - 1)
        columns = []
        for part in _split_top_level(body):
            # Split on whitespace *and* "(" so that `UNIQUE(a, b)` is recognised as a
            # constraint just as `UNIQUE (a, b)` is.
            first_word = re.split(r"[\s(]", part, maxsplit=1)[0].strip("`\"[]")
            if first_word.lower() in CONSTRAINT_KEYWORDS:
                continue
            columns.append(first_word)
        if columns:
            schema[table] = columns
    return dict(sorted(schema.items()))


def build_manifest() -> dict:
    source = INIT_SCRIPT.read_text(encoding="utf-8")
    return {
        "_generated_by": "scripts/generate_export_schema.py",
        "_source": "scripts/init_database.py",
        "_do_not_edit": "Regenerate with --write; CI runs --check.",
        "tables": parse_schema(source),
    }


def _serialise(manifest: dict) -> str:
    return json.dumps(manifest, indent=2, ensure_ascii=False) + "\n"


def load_manifest() -> dict[str, list[str]]:
    """Read the generated manifest. Used by export_db_seeds.py."""
    if not MANIFEST_PATH.exists():
        raise FileNotFoundError(
            f"Missing {MANIFEST_PATH.relative_to(ROOT)}. "
            "Run: python scripts/generate_export_schema.py --write"
        )
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))["tables"]


def compare_with_database() -> list[str]:
    """Report drift between the canonical schema and the live database."""
    problems: list[str] = []
    if not DB_PATH.exists():
        return [f"No database at {DB_PATH.name}; skipped live comparison."]

    expected = build_manifest()["tables"]
    with sqlite3.connect(str(DB_PATH)) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        live_tables = {row[0] for row in cursor.fetchall()}

        for table in sorted(set(expected) - live_tables):
            problems.append(f"{table}: in init_database.py but missing from the live database")
        for table in sorted(live_tables - set(expected)):
            problems.append(f"{table}: in the live database but unknown to init_database.py")

        for table in sorted(set(expected) & live_tables):
            cursor.execute(f"PRAGMA table_info({table})")
            live_columns = [row[1] for row in cursor.fetchall()]
            missing = [c for c in expected[table] if c not in live_columns]
            extra = [c for c in live_columns if c not in expected[table]]
            if missing:
                problems.append(f"{table}: live database missing column(s) {', '.join(missing)}")
            if extra:
                problems.append(f"{table}: live database has unexpected column(s) {', '.join(extra)}")
    return problems


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate the export schema manifest from init_database.py")
    parser.add_argument("--write", action="store_true", help="Regenerate the manifest")
    parser.add_argument("--check", action="store_true", help="Fail if the manifest is stale")
    parser.add_argument("--check-db", action="store_true", help="Also compare the schema against the live database")
    args = parser.parse_args()

    if not (args.write or args.check or args.check_db):
        parser.error("Choose one of --write, --check, or --check-db")

    manifest = build_manifest()
    rendered = _serialise(manifest)

    if args.write:
        MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
        MANIFEST_PATH.write_text(rendered, encoding="utf-8")
        print(f"Wrote {MANIFEST_PATH.relative_to(ROOT)} ({len(manifest['tables'])} tables)")

    if args.check:
        current = MANIFEST_PATH.read_text(encoding="utf-8") if MANIFEST_PATH.exists() else ""
        if current != rendered:
            print(
                f"[STALE] {MANIFEST_PATH.relative_to(ROOT)} does not match init_database.py.\n"
                "        Run: python scripts/generate_export_schema.py --write",
                file=sys.stderr,
            )
            return 1
        print(f"Export schema is current ({len(manifest['tables'])} tables).")

    if args.check_db:
        problems = compare_with_database()
        if problems:
            print("\nSchema drift against the live database:", file=sys.stderr)
            for problem in problems:
                print(f"  - {problem}", file=sys.stderr)
            return 1
        print("Live database matches the canonical schema.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
