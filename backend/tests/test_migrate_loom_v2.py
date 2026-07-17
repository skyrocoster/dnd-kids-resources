"""Tests for scripts/migrate_loom_v2.py — the v1→v2 Loom schema migrator.

Each test creates a temporary SQLite database with the OLD v1 schema,
populates it with test data, runs the migration, and asserts the results.
"""

from __future__ import annotations

import importlib.util
import json
import sqlite3
import tempfile
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
SCRIPT_PATH = ROOT / "scripts" / "migrate_loom_v2.py"

spec = importlib.util.spec_from_file_location("migrate_loom_v2", SCRIPT_PATH)
migrate_mod = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(migrate_mod)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_OLD_SCHEMA = """
CREATE TABLE loom_threads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT 'thread-1',
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE loom_nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL CHECK (kind IN ('anchor', 'update')),
    title TEXT NOT NULL,
    body TEXT,
    status TEXT CHECK (status IN ('planned', 'reached', 'abandoned')),
    session_tag TEXT,
    x REAL NOT NULL DEFAULT 0,
    y REAL NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE loom_node_threads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id INTEGER NOT NULL,
    thread_id INTEGER NOT NULL,
    UNIQUE (node_id, thread_id),
    FOREIGN KEY (node_id) REFERENCES loom_nodes(id) ON DELETE CASCADE,
    FOREIGN KEY (thread_id) REFERENCES loom_threads(id) ON DELETE CASCADE
);

CREATE TABLE loom_edges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER NOT NULL,
    target_id INTEGER NOT NULL,
    UNIQUE (source_id, target_id),
    CHECK (source_id != target_id),
    FOREIGN KEY (source_id) REFERENCES loom_nodes(id) ON DELETE CASCADE,
    FOREIGN KEY (target_id) REFERENCES loom_nodes(id) ON DELETE CASCADE
);
"""


def _make_old_db(tmp_path: Path) -> Path:
    """Create a v1-schema database and return its path."""
    db_path = tmp_path / "test_loom.db"
    conn = sqlite3.connect(str(db_path))
    conn.executescript(_OLD_SCHEMA)
    conn.commit()
    conn.close()
    return db_path


def _conn_cols(db_path: Path, table: str) -> dict[str, str]:
    """Return {col_name: col_type} for a table."""
    conn = sqlite3.connect(str(db_path))
    cols = {r[1]: r[2] for r in conn.execute(f"PRAGMA table_info({table})").fetchall()}
    conn.close()
    return cols


def _conn_rows(db_path: Path, sql: str) -> list[dict]:
    """Run a query and return rows as dicts."""
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    rows = [dict(r) for r in conn.execute(sql).fetchall()]
    conn.close()
    return rows


def _conn_table_exists(db_path: Path, table: str) -> bool:
    conn = sqlite3.connect(str(db_path))
    exists = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,)
    ).fetchone() is not None
    conn.close()
    return exists


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestSimpleChain:
    """A thread with a simple chain of nodes and edges → automatic order."""

    def test_simple_chain_automatic_order(self, tmp_path):
        db_path = _make_old_db(tmp_path)
        conn = sqlite3.connect(str(db_path))

        # Thread with 3 nodes: anchor(planned) → update → anchor(planned)
        conn.execute("INSERT INTO loom_threads (id, name, color) VALUES (1, 'Quest', 'thread-1')")
        conn.execute("INSERT INTO loom_nodes (id, kind, title, status, x, y) VALUES (1, 'anchor', 'Start Quest', 'planned', 0, 0)")
        conn.execute("INSERT INTO loom_nodes (id, kind, title, x, y) VALUES (2, 'update', 'Met the NPC', 10, 0)")
        conn.execute("INSERT INTO loom_nodes (id, kind, title, status, x, y) VALUES (3, 'anchor', 'Quest Done', 'planned', 20, 0)")
        conn.execute("INSERT INTO loom_node_threads (node_id, thread_id) VALUES (1, 1)")
        conn.execute("INSERT INTO loom_node_threads (node_id, thread_id) VALUES (2, 1)")
        conn.execute("INSERT INTO loom_node_threads (node_id, thread_id) VALUES (3, 1)")
        # Edges: 1→2→3 (simple chain)
        conn.execute("INSERT INTO loom_edges (source_id, target_id) VALUES (1, 2)")
        conn.execute("INSERT INTO loom_edges (source_id, target_id) VALUES (2, 3)")
        conn.commit()
        conn.close()

        report_path = tmp_path / "report.json"
        report = migrate_mod.migrate(db_path, report_path, dry_run=False)

        # Verify schema
        cols = _conn_cols(db_path, "loom_nodes")
        assert "fulfilled_planned_title" in cols
        assert "banked_from_thread_id" in cols
        assert "status" not in cols

        cols_t = _conn_cols(db_path, "loom_node_threads")
        assert "position" in cols_t

        assert not _conn_table_exists(db_path, "loom_edges")

        # Verify data
        nodes = _conn_rows(db_path, "SELECT id, kind, title FROM loom_nodes ORDER BY id")
        # Should have: start (synthesized), beat (was planned anchor), session (was update),
        # beat (was planned anchor), end (synthesized) = 5 nodes
        kinds = [n["kind"] for n in nodes]
        assert "start" in kinds
        assert "end" in kinds
        assert kinds.count("beat") == 2  # two planned anchors
        assert kinds.count("session") == 1  # one update

        # Verify linearization was automatic
        linearized = report["linearized"]
        assert len(linearized) == 1
        assert linearized[0]["automatic"] is True

        # Verify positions are assigned
        memberships = _conn_rows(
            db_path,
            "SELECT node_id, position FROM loom_node_threads WHERE thread_id=1 ORDER BY position"
        )
        positions = [m["position"] for m in memberships]
        assert positions == sorted(positions)  # ascending
        assert len(positions) == 5  # start + 2 beats + session + end

        # Backup was created
        assert (tmp_path / "test_loom.pre_v2_migration.db").exists()


class TestBranchyThread:
    """A thread with fan-in/fan-out → reported for review."""

    def test_branchy_thread_flagged(self, tmp_path):
        db_path = _make_old_db(tmp_path)
        conn = sqlite3.connect(str(db_path))

        # Thread: node1 → node2, node1 → node3, node2 → node4, node3 → node4 (diamond)
        conn.execute("INSERT INTO loom_threads (id, name, color) VALUES (1, 'Diamond', 'thread-1')")
        for i, (kind, title, status) in enumerate([
            ("anchor", "Start", "planned"),
            ("update", "Left path", None),
            ("update", "Right path", None),
            ("anchor", "End", "planned"),
        ], 1):
            conn.execute(
                "INSERT INTO loom_nodes (id, kind, title, status, x, y) VALUES (?, ?, ?, ?, ?, ?)",
                (i, kind, title, status, i * 10, 0),
            )
            conn.execute("INSERT INTO loom_node_threads (node_id, thread_id) VALUES (?, 1)", (i,))

        conn.execute("INSERT INTO loom_edges (source_id, target_id) VALUES (1, 2)")
        conn.execute("INSERT INTO loom_edges (source_id, target_id) VALUES (1, 3)")
        conn.execute("INSERT INTO loom_edges (source_id, target_id) VALUES (2, 4)")
        conn.execute("INSERT INTO loom_edges (source_id, target_id) VALUES (3, 4)")
        conn.commit()
        conn.close()

        report = migrate_mod.migrate(db_path, tmp_path / "report.json", dry_run=False)

        linearized = report["linearized"]
        assert len(linearized) == 1
        assert linearized[0]["automatic"] is False  # branchy → flagged


class TestAbandonedAnchors:
    """Abandoned anchors become banked beats."""

    def test_abandoned_becomes_banked(self, tmp_path):
        db_path = _make_old_db(tmp_path)
        conn = sqlite3.connect(str(db_path))

        conn.execute("INSERT INTO loom_threads (id, name, color) VALUES (1, 'T', 'thread-1')")
        conn.execute("INSERT INTO loom_nodes (id, kind, title, status, x, y) VALUES (1, 'anchor', 'Abandoned idea', 'abandoned', 0, 0)")
        conn.execute("INSERT INTO loom_nodes (id, kind, title, x, y) VALUES (2, 'update', 'Did stuff', 10, 0)")
        conn.execute("INSERT INTO loom_node_threads (node_id, thread_id) VALUES (1, 1)")
        conn.execute("INSERT INTO loom_node_threads (node_id, thread_id) VALUES (2, 1)")
        conn.commit()
        conn.close()

        report = migrate_mod.migrate(db_path, tmp_path / "report.json", dry_run=False)

        # Abandoned node should be banked
        assert len(report["abandoned_banked"]) == 1
        assert report["abandoned_banked"][0]["node_id"] == 1

        # Banked beat should have no membership
        nodes = _conn_rows(db_path, "SELECT id, kind, banked_from_thread_id FROM loom_nodes WHERE id=1")
        assert nodes[0]["kind"] == "beat"
        assert nodes[0]["banked_from_thread_id"] is not None

        memberships = _conn_rows(db_path, "SELECT node_id FROM loom_node_threads WHERE node_id=1")
        assert len(memberships) == 0  # removed from thread


class TestCrossThreadEdges:
    """Edges between nodes on different threads are dropped."""

    def test_cross_thread_edge_dropped(self, tmp_path):
        db_path = _make_old_db(tmp_path)
        conn = sqlite3.connect(str(db_path))

        conn.execute("INSERT INTO loom_threads (id, name, color) VALUES (1, 'A', 'thread-1')")
        conn.execute("INSERT INTO loom_threads (id, name, color) VALUES (2, 'B', 'thread-2')")
        conn.execute("INSERT INTO loom_nodes (id, kind, title, x, y) VALUES (1, 'update', 'On A', 0, 0)")
        conn.execute("INSERT INTO loom_nodes (id, kind, title, x, y) VALUES (2, 'update', 'On B', 10, 0)")
        conn.execute("INSERT INTO loom_node_threads (node_id, thread_id) VALUES (1, 1)")
        conn.execute("INSERT INTO loom_node_threads (node_id, thread_id) VALUES (2, 2)")
        conn.execute("INSERT INTO loom_edges (source_id, target_id) VALUES (1, 2)")  # cross-thread
        conn.commit()
        conn.close()

        report = migrate_mod.migrate(db_path, tmp_path / "report.json", dry_run=False)

        assert len(report["cross_thread_edges"]) == 1
        assert report["cross_thread_edges"][0]["source_id"] == 1
        assert report["cross_thread_edges"][0]["target_id"] == 2

        # loom_edges table should be gone
        assert not _conn_table_exists(db_path, "loom_edges")


class TestOrphanNodes:
    """Nodes with no memberships end up in the orphan bucket."""

    def test_orphan_in_report(self, tmp_path):
        db_path = _make_old_db(tmp_path)
        conn = sqlite3.connect(str(db_path))

        conn.execute("INSERT INTO loom_threads (id, name, color) VALUES (1, 'T', 'thread-1')")
        conn.execute("INSERT INTO loom_nodes (id, kind, title, x, y) VALUES (1, 'update', 'Orphan', 0, 0)")
        # No membership for node 1
        conn.commit()
        conn.close()

        report = migrate_mod.migrate(db_path, tmp_path / "report.json", dry_run=False)

        assert len(report["orphan_nodes"]) >= 1
        orphan_ids = [o["node_id"] for o in report["orphan_nodes"]]
        assert 1 in orphan_ids


class TestSharedBeatConflict:
    """A beat with memberships on multiple threads → conflict resolved."""

    def test_shared_beat_kept_on_one_thread(self, tmp_path):
        db_path = _make_old_db(tmp_path)
        conn = sqlite3.connect(str(db_path))

        conn.execute("INSERT INTO loom_threads (id, name, color) VALUES (1, 'A', 'thread-1')")
        conn.execute("INSERT INTO loom_threads (id, name, color) VALUES (2, 'B', 'thread-2')")
        # A planned anchor (will become beat) on both threads
        conn.execute("INSERT INTO loom_nodes (id, kind, title, status, x, y) VALUES (1, 'anchor', 'Shared beat', 'planned', 0, 0)")
        conn.execute("INSERT INTO loom_node_threads (node_id, thread_id) VALUES (1, 1)")
        conn.execute("INSERT INTO loom_node_threads (node_id, thread_id) VALUES (1, 2)")
        conn.commit()
        conn.close()

        report = migrate_mod.migrate(db_path, tmp_path / "report.json", dry_run=False)

        assert len(report["shared_beat_conflicts"]) == 1
        conflict = report["shared_beat_conflicts"][0]
        assert conflict["node_id"] == 1
        assert len(conflict["dropped_thread_ids"]) == 1

        # Beat should only have one membership now
        memberships = _conn_rows(db_path, "SELECT thread_id FROM loom_node_threads WHERE node_id=1")
        assert len(memberships) == 1


class TestIdempotent:
    """Running the migration twice is a no-op the second time."""

    def test_second_run_noop(self, tmp_path):
        db_path = _make_old_db(tmp_path)
        conn = sqlite3.connect(str(db_path))
        conn.execute("INSERT INTO loom_threads (id, name, color) VALUES (1, 'T', 'thread-1')")
        conn.execute("INSERT INTO loom_nodes (id, kind, title, status, x, y) VALUES (1, 'anchor', 'X', 'planned', 0, 0)")
        conn.execute("INSERT INTO loom_node_threads (node_id, thread_id) VALUES (1, 1)")
        conn.commit()
        conn.close()

        report1 = migrate_mod.migrate(db_path, tmp_path / "report1.json", dry_run=False)
        assert "total_nodes" in report1["summary"]

        report2 = migrate_mod.migrate(db_path, tmp_path / "report2.json", dry_run=False)
        assert report2["summary"]["status"] == "already_migrated"


class TestDryRun:
    """Dry run computes the report but doesn't modify the DB."""

    def test_dry_run_no_write(self, tmp_path):
        db_path = _make_old_db(tmp_path)
        conn = sqlite3.connect(str(db_path))
        conn.execute("INSERT INTO loom_threads (id, name, color) VALUES (1, 'T', 'thread-1')")
        conn.execute("INSERT INTO loom_nodes (id, kind, title, status, x, y) VALUES (1, 'anchor', 'X', 'planned', 0, 0)")
        conn.execute("INSERT INTO loom_node_threads (node_id, thread_id) VALUES (1, 1)")
        conn.commit()
        conn.close()

        report_path = tmp_path / "report.json"
        report = migrate_mod.migrate(db_path, report_path, dry_run=True)

        # Report was computed
        assert "summary" in report

        # DB is unchanged — still has loom_edges table
        assert _conn_table_exists(db_path, "loom_edges")

        # Report file was written
        assert report_path.exists()
        written = json.loads(report_path.read_text())
        assert "summary" in written


class TestBackupCreated:
    """A backup file is created before migration."""

    def test_backup_exists(self, tmp_path):
        db_path = _make_old_db(tmp_path)
        conn = sqlite3.connect(str(db_path))
        conn.execute("INSERT INTO loom_threads (id, name, color) VALUES (1, 'T', 'thread-1')")
        conn.commit()
        conn.close()

        migrate_mod.migrate(db_path, tmp_path / "report.json", dry_run=False)

        backup = tmp_path / "test_loom.pre_v2_migration.db"
        assert backup.exists()
        # Backup should have the old schema
        assert _conn_table_exists(backup, "loom_edges")


class TestReachesAndPlanned:
    """Reached anchors become sessions with provenance; planned become beats."""

    def test_reached_anchor_becomes_session(self, tmp_path):
        db_path = _make_old_db(tmp_path)
        conn = sqlite3.connect(str(db_path))
        conn.execute("INSERT INTO loom_threads (id, name, color) VALUES (1, 'T', 'thread-1')")
        conn.execute("INSERT INTO loom_nodes (id, kind, title, status, x, y) VALUES (1, 'anchor', 'Victory', 'reached', 0, 0)")
        conn.execute("INSERT INTO loom_node_threads (node_id, thread_id) VALUES (1, 1)")
        conn.commit()
        conn.close()

        migrate_mod.migrate(db_path, tmp_path / "report.json", dry_run=False)

        nodes = _conn_rows(db_path, "SELECT kind, fulfilled_planned_title FROM loom_nodes WHERE id=1")
        assert nodes[0]["kind"] == "session"
        assert nodes[0]["fulfilled_planned_title"] == "Victory"

    def test_planned_anchor_becomes_beat(self, tmp_path):
        db_path = _make_old_db(tmp_path)
        conn = sqlite3.connect(str(db_path))
        conn.execute("INSERT INTO loom_threads (id, name, color) VALUES (1, 'T', 'thread-1')")
        conn.execute("INSERT INTO loom_nodes (id, kind, title, status, x, y) VALUES (1, 'anchor', 'Todo', 'planned', 0, 0)")
        conn.execute("INSERT INTO loom_node_threads (node_id, thread_id) VALUES (1, 1)")
        conn.commit()
        conn.close()

        migrate_mod.migrate(db_path, tmp_path / "report.json", dry_run=False)

        nodes = _conn_rows(db_path, "SELECT kind FROM loom_nodes WHERE id=1")
        assert nodes[0]["kind"] == "beat"


class TestUpdateBecomesSession:
    """Update nodes become sessions."""

    def test_update_to_session(self, tmp_path):
        db_path = _make_old_db(tmp_path)
        conn = sqlite3.connect(str(db_path))
        conn.execute("INSERT INTO loom_threads (id, name, color) VALUES (1, 'T', 'thread-1')")
        conn.execute("INSERT INTO loom_nodes (id, kind, title, session_tag, x, y) VALUES (1, 'update', 'Session event', 'Session 1', 5, 10)")
        conn.execute("INSERT INTO loom_node_threads (node_id, thread_id) VALUES (1, 1)")
        conn.commit()
        conn.close()

        migrate_mod.migrate(db_path, tmp_path / "report.json", dry_run=False)

        nodes = _conn_rows(db_path, "SELECT kind, title, session_tag FROM loom_nodes WHERE id=1")
        assert nodes[0]["kind"] == "session"
        assert nodes[0]["title"] == "Session event"
        assert nodes[0]["session_tag"] == "Session 1"


class TestSynthesizeStartEnd:
    """Start and End nodes are synthesized per thread."""

    def test_synthesized_start_end(self, tmp_path):
        db_path = _make_old_db(tmp_path)
        conn = sqlite3.connect(str(db_path))
        conn.execute("INSERT INTO loom_threads (id, name, color) VALUES (1, 'My Quest', 'thread-1')")
        conn.execute("INSERT INTO loom_nodes (id, kind, title, x, y) VALUES (1, 'update', 'Event', 0, 0)")
        conn.execute("INSERT INTO loom_node_threads (node_id, thread_id) VALUES (1, 1)")
        conn.commit()
        conn.close()

        report = migrate_mod.migrate(db_path, tmp_path / "report.json", dry_run=False)

        syn = report["synthesized"]
        assert len(syn) == 1
        assert syn[0]["start_node_id"] is not None
        assert syn[0]["end_node_id"] is not None

        nodes = _conn_rows(db_path, "SELECT kind, title FROM loom_nodes ORDER BY id")
        start_nodes = [n for n in nodes if n["kind"] == "start"]
        end_nodes = [n for n in nodes if n["kind"] == "end"]
        assert len(start_nodes) == 1
        assert start_nodes[0]["title"] == "My Quest"
        assert len(end_nodes) == 1
        assert end_nodes[0]["title"] == "Resolve: My Quest"


class TestMalformedFixture:
    """Edge-case: old-shape DB with missing tables, empty threads, etc."""

    def test_no_edges_table_migrates_gracefully(self, tmp_path):
        """DB with loom_nodes and loom_node_threads but no loom_edges table."""
        db_path = tmp_path / "test_loom.db"
        conn = sqlite3.connect(str(db_path))
        conn.executescript("""
            CREATE TABLE loom_threads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                color TEXT NOT NULL DEFAULT 'thread-1',
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE loom_nodes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                kind TEXT NOT NULL CHECK (kind IN ('anchor', 'update')),
                title TEXT NOT NULL,
                body TEXT,
                status TEXT CHECK (status IN ('planned', 'reached', 'abandoned')),
                session_tag TEXT,
                x REAL NOT NULL DEFAULT 0,
                y REAL NOT NULL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE loom_node_threads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                node_id INTEGER NOT NULL,
                thread_id INTEGER NOT NULL,
                UNIQUE (node_id, thread_id),
                FOREIGN KEY (node_id) REFERENCES loom_nodes(id) ON DELETE CASCADE,
                FOREIGN KEY (thread_id) REFERENCES loom_threads(id) ON DELETE CASCADE
            );
        """)
        conn.execute("INSERT INTO loom_threads (id, name, color) VALUES (1, 'Solo Thread', 'thread-2')")
        conn.execute("INSERT INTO loom_nodes (id, kind, title, x, y) VALUES (1, 'update', 'Lone event', 0, 0)")
        conn.execute("INSERT INTO loom_node_threads (node_id, thread_id) VALUES (1, 1)")
        conn.commit()
        conn.close()

        report = migrate_mod.migrate(db_path, tmp_path / "report.json", dry_run=False)

        assert "total_nodes" in report["summary"]
        assert not _conn_table_exists(db_path, "loom_edges")

        nodes = _conn_rows(db_path, "SELECT kind FROM loom_nodes ORDER BY id")
        kinds = [n["kind"] for n in nodes]
        assert "start" in kinds
        assert "end" in kinds

    def test_empty_database_no_crash(self, tmp_path):
        """DB with loom tables but zero rows migrates without error."""
        db_path = _make_old_db(tmp_path)

        report = migrate_mod.migrate(db_path, tmp_path / "report.json", dry_run=False)

        assert report["summary"]["total_nodes"] >= 0
        assert not _conn_table_exists(db_path, "loom_edges")
