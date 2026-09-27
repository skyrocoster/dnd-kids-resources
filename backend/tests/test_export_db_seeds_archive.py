"""Focused regression tests for seed-file archiving in `src/tools/export_db_seeds.py`.

`archive_seed_file()` produces the only pre-overwrite copy of a seed file's historical
content, so two archives of the same seed file within one UTC second must yield two
preserved copies, never one overwriting the other. Timestamps are frozen with a patched
`datetime` to make the same-second collision deterministic; everything runs inside
pytest's `tmp_path`, so real `data/seeds/` and `data/archive/` are untouched.
"""

from __future__ import annotations

import importlib.util
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def _load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


EXPORT_DB = _load_module(
    "_archive_export_db_seeds",
    REPO_ROOT / "src" / "tools" / "export_db_seeds.py",
)


class _FrozenDatetime(datetime):
    """`datetime` pinned inside a single UTC second to force a same-second archive collision."""

    @classmethod
    def now(cls, tz=None):
        if tz is None:
            return cls(2026, 9, 27, 12, 0, 0)
        return cls(2026, 9, 27, 12, 0, 0, tzinfo=timezone.utc)


def test_same_second_archive_collision_keeps_every_copy(tmp_path: Path, monkeypatch):
    """Two archives of one seed file in the same second must keep both historical copies."""
    archive = tmp_path / "archive"
    seed_file = tmp_path / "seeds" / "seed_spells.json"
    seed_file.parent.mkdir()

    monkeypatch.setattr(EXPORT_DB, "ARCHIVE_DIR", archive)
    monkeypatch.setattr(EXPORT_DB, "datetime", _FrozenDatetime)

    # Seed file holds A -> archived, replaced by B -> archived again, all in one second.
    seed_file.write_text("A\n", encoding="utf-8")
    EXPORT_DB.archive_seed_file(seed_file)
    seed_file.write_text("B\n", encoding="utf-8")
    EXPORT_DB.archive_seed_file(seed_file)

    copies = sorted(archive.rglob("seed_spells.json"))
    contents = sorted(copy.read_text(encoding="utf-8") for copy in copies)
    assert len(copies) == 2
    assert contents == ["A\n", "B\n"]


def test_dry_run_never_writes_or_archives(tmp_path: Path, monkeypatch):
    """A differing seed file stays untouched and unarchived under --dry-run."""
    seeds_dir = tmp_path / "seeds"
    archive = tmp_path / "archive"
    seed_file = seeds_dir / "seed_spells.json"
    seeds_dir.mkdir()
    seed_file.write_text('[{"id": 999, "name": "On Disk"}]\n', encoding="utf-8")

    monkeypatch.setattr(EXPORT_DB, "SEEDS_DIR", seeds_dir)
    monkeypatch.setattr(EXPORT_DB, "ARCHIVE_DIR", archive)

    conn = sqlite3.connect(":memory:")
    conn.execute('CREATE TABLE "spells" (id INTEGER, name TEXT)')
    conn.execute('INSERT INTO "spells" VALUES (1, \'Magic Missile\')')
    EXPORT_DB.export_table(conn.cursor(), "spells", dry_run=True)

    assert seed_file.read_text(encoding="utf-8") == '[{"id": 999, "name": "On Disk"}]\n'
    assert not archive.exists()
