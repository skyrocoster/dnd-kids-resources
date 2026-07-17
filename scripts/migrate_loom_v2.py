#!/usr/bin/env python3
"""Migrate a Loom database from the flat-DAG schema (v1) to the ordered-threads schema (v2).

Old schema:
  loom_threads(id, name, color, description, created_at, updated_at)
  loom_nodes(id, kind IN ('anchor','update'), title, body, status, session_tag,
             x, y, created_at, updated_at)
  loom_node_threads(id, node_id, thread_id, UNIQUE(node_id,thread_id))
  loom_edges(id, source_id, target_id, UNIQUE(source_id,target_id))

New schema:
  loom_threads  + origin_node_id INTEGER NULL REFERENCES loom_nodes(id)
  loom_nodes    + kind IN ('start','end','beat','session'), -status,
                + fulfilled_planned_title, fulfilled_at, banked_from_thread_id
  loom_node_threads + position INTEGER NOT NULL
  loom_edges    dropped

Usage:
    python scripts/migrate_loom_v2.py [--db-path PATH] [--report-path PATH] [--dry-run]
"""

from __future__ import annotations

import argparse
import collections
import copy
import json
import shutil
import sqlite3
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DB = ROOT / "dnd_kids_resources.db"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _detect_already_migrated(conn: sqlite3.Connection) -> bool:
    """Return True if the database already has the v2 schema."""
    tables = {r[0] for r in conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
    ).fetchall()}
    if "loom_edges" in tables:
        return False
    if "loom_nodes" not in tables:
        return True  # no loom tables at all — nothing to migrate
    node_cols = {r[1] for r in conn.execute("PRAGMA table_info(loom_nodes)").fetchall()}
    membership_cols = {r[1] for r in conn.execute("PRAGMA table_info(loom_node_threads)").fetchall()}
    return "fulfilled_planned_title" in node_cols and "position" in membership_cols


def _backup_db(db_path: Path) -> Path:
    """Copy the database file to a backup location."""
    backup = db_path.with_suffix(".pre_v2_migration.db")
    shutil.copy2(db_path, backup)
    return backup


# ---------------------------------------------------------------------------
# Topological sort for per-thread edge linearization
# ---------------------------------------------------------------------------

def _topo_sort_nodes(
    node_ids: set[int],
    edges: list[tuple[int, int]],
    nodes_xy: dict[int, tuple[float, float]],
) -> tuple[list[int], bool]:
    """Topological sort of a subgraph. Returns (ordered_ids, is_simple_chain).

    Simple chain = every node has in-degree <= 1 and out-degree <= 1, and
    the graph is a single connected path (exactly one source, one sink).
    Tie-break by (x, y, id) for determinism.
    """
    # Build adjacency for this subgraph
    adj: dict[int, list[int]] = collections.defaultdict(list)
    in_deg: dict[int, int] = {nid: 0 for nid in node_ids}
    for src, tgt in edges:
        if src in node_ids and tgt in node_ids:
            adj[src].append(tgt)
            in_deg[tgt] = in_deg.get(tgt, 0) + 1

    # Detect simple chain: all in-degrees in {0,1}, all out-degrees in {0,1},
    # exactly one source (in-degree 0) and one sink (out-degree 0).
    sources = [n for n in node_ids if in_deg[n] == 0]
    sinks = [n for n in node_ids if len(adj[n]) == 0]
    all_degrees_ok = all(
        in_deg[n] <= 1 and len(adj[n]) <= 1 for n in node_ids
    )
    is_simple_chain = (
        all_degrees_ok
        and len(sources) == 1
        and len(sinks) == 1
        and len(node_ids) > 0
    )

    # Kahn's algorithm with (x, y, id) tie-break
    queue: list[int] = sorted(sources, key=lambda n: (*nodes_xy.get(n, (0, 0)), n))
    result: list[int] = []
    while queue:
        node = queue.pop(0)
        result.append(node)
        for neighbor in sorted(adj[node], key=lambda n: (*nodes_xy.get(n, (0, 0)), n)):
            in_deg[neighbor] -= 1
            if in_deg[neighbor] == 0:
                queue.append(neighbor)
        queue.sort(key=lambda n: (*nodes_xy.get(n, (0, 0)), n))

    if len(result) != len(node_ids):
        # Cycle detected — shouldn't happen in a valid DAG, but handle gracefully
        remaining = node_ids - set(result)
        result.extend(sorted(remaining, key=lambda n: (*nodes_xy.get(n, (0, 0)), n)))

    return result, is_simple_chain


# ---------------------------------------------------------------------------
# Main migration logic
# ---------------------------------------------------------------------------

def _read_old_schema(conn: sqlite3.Connection) -> dict[str, Any]:
    """Read all loom data from the old schema."""
    threads = conn.execute(
        "SELECT id, name, color, description FROM loom_threads ORDER BY id"
    ).fetchall()

    nodes = conn.execute(
        "SELECT id, kind, title, body, status, session_tag, x, y "
        "FROM loom_nodes ORDER BY id"
    ).fetchall()

    memberships = conn.execute(
        "SELECT id, node_id, thread_id FROM loom_node_threads ORDER BY id"
    ).fetchall()

    edges = []
    try:
        edges = conn.execute(
            "SELECT id, source_id, target_id FROM loom_edges ORDER BY id"
        ).fetchall()
    except sqlite3.OperationalError:
        pass  # table may not exist

    return {
        "threads": [
            {"id": r[0], "name": r[1], "color": r[2], "description": r[3]}
            for r in threads
        ],
        "nodes": [
            {
                "id": r[0], "kind": r[1], "title": r[2], "body": r[3],
                "status": r[4], "session_tag": r[5], "x": r[6], "y": r[7],
            }
            for r in nodes
        ],
        "memberships": [
            {"id": r[0], "node_id": r[1], "thread_id": r[2]}
            for r in memberships
        ],
        "edges": [
            {"id": r[0], "source_id": r[1], "target_id": r[2]}
            for r in edges
        ],
    }


def _migrate(data: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    """Run the migration algorithm. Returns (new_data, report)."""
    threads = copy.deepcopy(data["threads"])
    old_nodes = copy.deepcopy(data["nodes"])
    old_memberships = copy.deepcopy(data["memberships"])
    old_edges = copy.deepcopy(data["edges"])

    report: dict[str, Any] = {
        "summary": {},
        "kind_remap": [],
        "abandoned_banked": [],
        "synthesized": [],
        "linearized": [],
        "cross_thread_edges": [],
        "orphan_nodes": [],
        "shared_beat_conflicts": [],
    }

    # -- Build lookup structures -----------------------------------------------
    nodes_by_id: dict[int, dict[str, Any]] = {n["id"]: n for n in old_nodes}
    memberships_by_thread: dict[int, list[dict]] = collections.defaultdict(list)
    for m in old_memberships:
        memberships_by_thread[m["thread_id"]].append(m)
    memberships_by_node: dict[int, list[dict]] = collections.defaultdict(list)
    for m in old_memberships:
        memberships_by_node[m["node_id"]].append(m)

    # -- Step 1 & 2: Kind remap + abandoned -----------------------------------
    next_node_id = max((n["id"] for n in old_nodes), default=0) + 1
    new_nodes: list[dict[str, Any]] = []
    node_id_remap: dict[int, int] = {}  # old id → new id (usually same)

    for node in old_nodes:
        old_kind = node["kind"]
        status = node.get("status")

        if old_kind == "update":
            # → session
            new_nodes.append({
                "id": node["id"], "kind": "session", "title": node["title"],
                "body": node["body"], "session_tag": node["session_tag"],
                "x": node["x"], "y": node["y"],
                "fulfilled_planned_title": None, "fulfilled_at": None,
                "banked_from_thread_id": None,
            })
            node_id_remap[node["id"]] = node["id"]
            report["kind_remap"].append({
                "old_id": node["id"], "old_kind": "update", "new_kind": "session",
            })

        elif old_kind == "anchor" and status == "reached":
            # → session with fulfilment provenance
            new_nodes.append({
                "id": node["id"], "kind": "session", "title": node["title"],
                "body": node["body"], "session_tag": node["session_tag"],
                "x": node["x"], "y": node["y"],
                "fulfilled_planned_title": node["title"],
                "fulfilled_at": None,  # updated_at not available in old read
                "banked_from_thread_id": None,
            })
            node_id_remap[node["id"]] = node["id"]
            report["kind_remap"].append({
                "old_id": node["id"], "old_kind": "anchor(reached)",
                "new_kind": "session", "provenance": "fulfilled",
            })

        elif old_kind == "anchor" and status == "planned":
            # → beat (may become banked in step 2 if orphaned)
            new_nodes.append({
                "id": node["id"], "kind": "beat", "title": node["title"],
                "body": node["body"], "session_tag": node["session_tag"],
                "x": node["x"], "y": node["y"],
                "fulfilled_planned_title": None, "fulfilled_at": None,
                "banked_from_thread_id": None,
            })
            node_id_remap[node["id"]] = node["id"]
            report["kind_remap"].append({
                "old_id": node["id"], "old_kind": "anchor(planned)",
                "new_kind": "beat",
            })

        elif old_kind == "anchor" and status == "abandoned":
            # → beat, will be banked below
            new_nodes.append({
                "id": node["id"], "kind": "beat", "title": node["title"],
                "body": node["body"], "session_tag": node["session_tag"],
                "x": node["x"], "y": node["y"],
                "fulfilled_planned_title": None, "fulfilled_at": None,
                "banked_from_thread_id": None,
            })
            node_id_remap[node["id"]] = node["id"]
            report["kind_remap"].append({
                "old_id": node["id"], "old_kind": "anchor(abandoned)",
                "new_kind": "beat",
            })

        else:
            # Already new kind or unexpected — keep as-is
            new_nodes.append({
                "id": node["id"], "kind": old_kind, "title": node["title"],
                "body": node["body"], "session_tag": node["session_tag"],
                "x": node["x"], "y": node["y"],
                "fulfilled_planned_title": None, "fulfilled_at": None,
                "banked_from_thread_id": None,
            })
            node_id_remap[node["id"]] = node["id"]

    nodes_by_new_id: dict[int, dict[str, Any]] = {n["id"]: n for n in new_nodes}

    # -- Step 2 continued: bank abandoned anchors -----------------------------
    new_memberships = list(old_memberships)  # will be mutated
    for node in new_nodes:
        if node["kind"] != "beat":
            continue
        # Find the old node to check if it was abandoned
        old_node = nodes_by_id.get(node["id"])
        if old_node and old_node["kind"] == "anchor" and old_node.get("status") == "abandoned":
            # Pick the thread with the most memberships (or lowest id) for banked_from
            node_memberships = [m for m in new_memberships if m["node_id"] == node["id"]]
            if node_memberships:
                # Keep membership on one thread for banked_from_thread_id reference,
                # but drop all memberships (banked = unplaced)
                thread_ids = [m["thread_id"] for m in node_memberships]
                banked_thread = min(thread_ids)
                node["banked_from_thread_id"] = banked_thread
                new_memberships = [m for m in new_memberships if m["node_id"] != node["id"]]
                report["abandoned_banked"].append({
                    "node_id": node["id"], "title": node["title"],
                    "banked_from_thread_id": banked_thread,
                    "dropped_thread_ids": thread_ids,
                })

    # -- Classify edges: intra-thread vs cross-thread -------------------------
    # Build membership lookup for old node ids
    member_threads: dict[int, set[int]] = collections.defaultdict(set)
    for m in old_memberships:
        member_threads[m["node_id"]].add(m["thread_id"])

    intra_edges: list[dict] = []  # edges where both endpoints share a thread
    cross_edges: list[dict] = []  # edges where endpoints are on different threads

    for edge in old_edges:
        src, tgt = edge["source_id"], edge["target_id"]
        src_threads = member_threads.get(src, set())
        tgt_threads = member_threads.get(tgt, set())
        shared = src_threads & tgt_threads
        if shared:
            intra_edges.append(edge)
        else:
            cross_edges.append(edge)

    # Record cross-thread edges
    for edge in cross_edges:
        src, tgt = edge["source_id"], edge["target_id"]
        src_threads = member_threads.get(src, set())
        tgt_threads = member_threads.get(tgt, set())
        report["cross_thread_edges"].append({
            "edge_id": edge["id"], "source_id": src, "target_id": tgt,
            "source_threads": sorted(src_threads),
            "target_threads": sorted(tgt_threads),
        })

    # -- Step 3: Synthesize Start and End per thread --------------------------
    for thread in threads:
        tid = thread["id"]
        existing_kinds = {
            nodes_by_new_id[m["node_id"]]["kind"]
            for m in new_memberships
            if m["thread_id"] == tid and m["node_id"] in nodes_by_new_id
        }

        has_start = "start" in existing_kinds
        has_end = "end" in existing_kinds

        synthesized: dict[str, int | None] = {"start": None, "end": None}

        if not has_start:
            start_id = next_node_id
            next_node_id += 1
            new_nodes.append({
                "id": start_id, "kind": "start", "title": thread["name"],
                "body": None, "session_tag": None, "x": 0, "y": 0,
                "fulfilled_planned_title": None, "fulfilled_at": None,
                "banked_from_thread_id": None,
            })
            new_memberships.append({
                "id": max((m["id"] for m in new_memberships), default=0) + 1,
                "node_id": start_id, "thread_id": tid,
            })
            synthesized["start"] = start_id

        if not has_end:
            end_id = next_node_id
            next_node_id += 1
            new_nodes.append({
                "id": end_id, "kind": "end",
                "title": f"Resolve: {thread['name']}",
                "body": None, "session_tag": None, "x": 0, "y": 0,
                "fulfilled_planned_title": None, "fulfilled_at": None,
                "banked_from_thread_id": None,
            })
            new_memberships.append({
                "id": max((m["id"] for m in new_memberships), default=0) + 1,
                "node_id": end_id, "thread_id": tid,
            })
            synthesized["end"] = end_id

        if synthesized["start"] or synthesized["end"]:
            report["synthesized"].append({
                "thread_id": tid, "thread_name": thread["name"],
                "start_node_id": synthesized["start"],
                "end_node_id": synthesized["end"],
            })

    # Rebuild membership lookups after synthesis
    memberships_by_thread_new: dict[int, list[dict]] = collections.defaultdict(list)
    for m in new_memberships:
        memberships_by_thread_new[m["thread_id"]].append(m)

    # -- Step 4: Derive position from intra-thread edges ----------------------
    nodes_xy: dict[int, tuple[float, float]] = {
        n["id"]: (n["x"], n["y"]) for n in new_nodes
    }

    for thread in threads:
        tid = thread["id"]
        thread_member_ids = {
            m["node_id"] for m in memberships_by_thread_new.get(tid, [])
        }
        if not thread_member_ids:
            continue

        # Find edges where both endpoints are members of this thread
        thread_edges = [
            (e["source_id"], e["target_id"])
            for e in intra_edges
            if e["source_id"] in thread_member_ids and e["target_id"] in thread_member_ids
        ]

        # Separate start/end from the sortable set
        start_ids = {n["id"] for n in new_nodes if n["kind"] == "start" and n["id"] in thread_member_ids}
        end_ids = {n["id"] for n in new_nodes if n["kind"] == "end" and n["id"] in thread_member_ids}
        sortable_ids = thread_member_ids - start_ids - end_ids

        if not sortable_ids:
            # Only start/end — just pin them
            order = list(start_ids) + list(end_ids)
            is_chain = True
        else:
            order, is_chain = _topo_sort_nodes(sortable_ids, thread_edges, nodes_xy)
            # Pin start at front, end at back
            order = list(start_ids) + order + list(end_ids)

        report["linearized"].append({
            "thread_id": tid,
            "thread_name": thread["name"],
            "automatic": is_chain,
            "order": order,
        })

    # -- Step 5: Assign positions ---------------------------------------------
    # Clear existing position assignments, then reassign
    final_memberships: list[dict] = []
    for m in new_memberships:
        final_memberships.append({
            "id": m["id"], "node_id": m["node_id"],
            "thread_id": m["thread_id"], "position": 0,
        })

    for linearization in report["linearized"]:
        tid = linearization["thread_id"]
        order = linearization["order"]
        pos = 0
        for node_id in order:
            for m in final_memberships:
                if m["thread_id"] == tid and m["node_id"] == node_id:
                    m["position"] = pos
                    pos += 10

    # -- Step 6: Orphan nodes (zero memberships) ------------------------------
    member_node_ids = {m["node_id"] for m in final_memberships}
    for node in new_nodes:
        if node["id"] not in member_node_ids:
            if node["kind"] == "beat":
                # Already handled by abandoned logic, but if a planned anchor
                # had no memberships at all, bank it now
                if node["banked_from_thread_id"] is None:
                    node["banked_from_thread_id"] = None  # truly orphaned
            report["orphan_nodes"].append({
                "node_id": node["id"], "kind": node["kind"],
                "title": node["title"],
            })

    # -- Step 7: Shared-beat conflict (beat with >1 membership) ---------------
    # After step 2, beats should be thread-exclusive. But if a planned anchor
    # was a member of multiple threads and wasn't abandoned, we need to resolve.
    for node in new_nodes:
        if node["kind"] != "beat":
            continue
        node_memberships = [m for m in final_memberships if m["node_id"] == node["id"]]
        if len(node_memberships) <= 1:
            continue

        # Keep on the thread where it has the lowest position
        node_memberships.sort(key=lambda m: m["position"])
        keep = node_memberships[0]
        drop = node_memberships[1:]
        drop_thread_ids = [m["thread_id"] for m in drop]
        final_memberships = [m for m in final_memberships if m not in drop]
        report["shared_beat_conflicts"].append({
            "node_id": node["id"], "title": node["title"],
            "kept_thread_id": keep["thread_id"],
            "dropped_thread_ids": drop_thread_ids,
        })

    # -- Build final data -----------------------------------------------------
    new_data = {
        "threads": threads,
        "nodes": sorted(new_nodes, key=lambda n: n["id"]),
        "memberships": sorted(final_memberships, key=lambda m: (m["thread_id"], m["position"])),
    }

    # Summary
    kind_counts: dict[str, int] = collections.Counter(n["kind"] for n in new_nodes)
    report["summary"] = {
        "total_nodes": len(new_nodes),
        "total_memberships": len(final_memberships),
        "total_edges_dropped": len(old_edges),
        "total_threads": len(threads),
        "kind_counts": dict(kind_counts),
        "synthesized_start": sum(1 for s in report["synthesized"] if s["start_node_id"]),
        "synthesized_end": sum(1 for s in report["synthesized"] if s["end_node_id"]),
        "abandoned_banked": len(report["abandoned_banked"]),
        "cross_thread_edges_dropped": len(report["cross_thread_edges"]),
        "orphans": len(report["orphan_nodes"]),
        "shared_beat_conflicts": len(report["shared_beat_conflicts"]),
    }

    return new_data, report


def _write_new_schema(conn: sqlite3.Connection) -> None:
    """Recreate loom tables with the v2 schema (drop loom_edges, alter nodes/threads/memberships)."""
    # Read any existing data before dropping
    # (caller should have called _read_old_schema first)

    # Drop loom_edges
    conn.execute("DROP TABLE IF EXISTS loom_edges")

    # Recreate loom_nodes with new schema
    conn.execute("ALTER TABLE loom_nodes RENAME TO loom_nodes_old_v1")
    conn.execute("""
        CREATE TABLE loom_nodes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            kind TEXT NOT NULL CHECK (kind IN ('start', 'end', 'beat', 'session')),
            title TEXT NOT NULL,
            body TEXT,
            session_tag TEXT,
            x REAL NOT NULL DEFAULT 0,
            y REAL NOT NULL DEFAULT 0,
            fulfilled_planned_title TEXT,
            fulfilled_at DATETIME,
            banked_from_thread_id INTEGER REFERENCES loom_threads(id) ON DELETE SET NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Recreate loom_node_threads with position
    conn.execute("ALTER TABLE loom_node_threads RENAME TO loom_node_threads_old_v1")
    conn.execute("""
        CREATE TABLE loom_node_threads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            node_id INTEGER NOT NULL,
            thread_id INTEGER NOT NULL,
            position INTEGER NOT NULL,
            UNIQUE (node_id, thread_id),
            FOREIGN KEY (node_id) REFERENCES loom_nodes(id) ON DELETE CASCADE,
            FOREIGN KEY (thread_id) REFERENCES loom_threads(id) ON DELETE CASCADE
        )
    """)

    # Add origin_node_id to loom_threads
    try:
        conn.execute(
            "ALTER TABLE loom_threads ADD COLUMN origin_node_id INTEGER NULL "
            "REFERENCES loom_nodes(id) ON DELETE SET NULL"
        )
    except sqlite3.OperationalError:
        pass  # column already exists


def _insert_new_data(
    conn: sqlite3.Connection,
    new_data: dict[str, Any],
) -> None:
    """Insert transformed data into the new schema."""
    for node in new_data["nodes"]:
        conn.execute(
            "INSERT INTO loom_nodes "
            "(id, kind, title, body, session_tag, x, y, "
            "fulfilled_planned_title, fulfilled_at, banked_from_thread_id) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                node["id"], node["kind"], node["title"], node["body"],
                node["session_tag"], node["x"], node["y"],
                node["fulfilled_planned_title"], node["fulfilled_at"],
                node["banked_from_thread_id"],
            ),
        )

    for m in new_data["memberships"]:
        conn.execute(
            "INSERT INTO loom_node_threads (id, node_id, thread_id, position) "
            "VALUES (?, ?, ?, ?)",
            (m["id"], m["node_id"], m["thread_id"], m["position"]),
        )

    # Recreate indexes
    conn.execute("CREATE INDEX IF NOT EXISTS idx_loom_node_threads_thread ON loom_node_threads(thread_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_loom_node_threads_position ON loom_node_threads(thread_id, position)")

    # Clean up old tables
    conn.execute("DROP TABLE IF EXISTS loom_nodes_old_v1")
    conn.execute("DROP TABLE IF EXISTS loom_node_threads_old_v1")


def migrate(
    db_path: Path,
    report_path: Path | None = None,
    dry_run: bool = False,
) -> dict[str, Any]:
    """Run the full migration. Returns the migration report."""
    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA foreign_keys = OFF")

    try:
        if _detect_already_migrated(conn):
            print("[OK] Database already has v2 loom schema — nothing to do.")
            return {"summary": {"status": "already_migrated"}}

        # Backup
        backup_path = _backup_db(db_path)
        print(f"[OK] Backup created: {backup_path}")

        # Read old data
        old_data = _read_old_schema(conn)
        print(f"[OK] Read old schema: {len(old_data['threads'])} threads, "
              f"{len(old_data['nodes'])} nodes, {len(old_data['memberships'])} memberships, "
              f"{len(old_data['edges'])} edges")

        # Transform
        new_data, report = _migrate(old_data)
        print(f"[OK] Migration computed: {report['summary']['total_nodes']} nodes, "
              f"{report['summary']['total_memberships']} memberships")

        if dry_run:
            print("[DRY RUN] No changes written to database.")
            if report_path:
                report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
                print(f"[OK] Report written: {report_path}")
            conn.close()
            return report

        # Write
        _write_new_schema(conn)
        _insert_new_data(conn, new_data)
        conn.commit()
        print("[OK] Schema and data written successfully")

        # Verify
        if _detect_already_migrated(conn):
            print("[OK] Post-migration verification passed")
        else:
            print("[ERROR] Post-migration verification failed — schema not v2")

        # Write report
        if report_path is None:
            report_path = db_path.parent / "migration_report.json"
        report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"[OK] Migration report: {report_path}")

        conn.close()
        return report

    except Exception:
        conn.rollback()
        conn.close()
        raise


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Migrate a Loom database from flat-DAG (v1) to ordered-threads (v2)."
    )
    parser.add_argument(
        "--db-path",
        type=Path,
        default=DEFAULT_DB,
        help=f"Path to the SQLite database (default: {DEFAULT_DB})",
    )
    parser.add_argument(
        "--report-path",
        type=Path,
        default=None,
        help="Path for the migration report JSON (default: migration_report.json next to DB)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Compute the migration but don't write to the database",
    )
    args = parser.parse_args()

    if not args.db_path.exists():
        print(f"[ERROR] Database not found: {args.db_path}")
        sys.exit(1)

    report = migrate(args.db_path, args.report_path, args.dry_run)
    summary = report.get("summary", {})
    print(f"\nMigration complete. Summary: {json.dumps(summary, indent=2)}")


if __name__ == "__main__":
    main()
