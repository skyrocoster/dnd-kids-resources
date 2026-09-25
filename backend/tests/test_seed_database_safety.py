"""Disposable-database tests for seed replacement, failure rollback, and map-state restore."""

import json
import sqlite3
import sys
from contextlib import contextmanager

import pytest

from backend.database import init_database, seed_database


@contextmanager
def database(db_path):
    conn = sqlite3.connect(db_path)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def initialize_database(db_path):
    init_database.init_database(db_path)


def write_seed(seed_dir, filename, value):
    seed_dir.mkdir(parents=True, exist_ok=True)
    (seed_dir / filename).write_text(json.dumps(value), encoding="utf-8")


def spell_seed(spell_id, name):
    return {
        "id": spell_id,
        "name": name,
        "level": 1,
        "description": f"{name} description.",
        "quick_rules": "A safe test effect.",
        "range": "Self",
        "duration": "Instantaneous",
        "concentration": False,
        "ritual": False,
    }


def run_seed_main(monkeypatch, db_path, seed_dir, *arguments):
    monkeypatch.setattr(seed_database, "DB_PATH", db_path)
    monkeypatch.setattr(seed_database, "SEEDS_DIR", seed_dir)
    monkeypatch.setattr(sys, "argv", ["seed_database.py", *arguments])
    return seed_database.main()


def spell_names(db_path):
    with database(db_path) as conn:
        return conn.execute("SELECT id, name FROM spells ORDER BY id").fetchall()


def test_database_initialization_can_repeat_with_all_map_state_tables(tmp_path):
    db_path = tmp_path / "repeat-init.db"

    initialize_database(db_path)
    initialize_database(db_path)

    with database(db_path) as conn:
        tables = {
            row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
        }
    expected_map_tables = {
        "dungeons",
        "map_layout",
        "map_session_state",
        "revealed_cells",
        "at_the_table",
    }
    assert expected_map_tables <= tables


def test_force_spells_replaces_only_spells(tmp_path, monkeypatch, capsys):
    db_path = tmp_path / "selected-force.db"
    seed_dir = tmp_path / "seed-copy"
    initialize_database(db_path)
    write_seed(seed_dir, "seed_spells.json", [spell_seed(2, "New Spell")])
    with database(db_path) as conn:
        conn.execute(
            "INSERT INTO spells (id, name, level, description, range, duration) "
            "VALUES (1, 'Old Spell', 1, 'Old description', 'Self', 'Instantaneous')"
        )
        conn.execute(
            "INSERT INTO conditions (title, icon, explanation) VALUES ('Preserved', '!', 'Still here')"
        )

    assert run_seed_main(monkeypatch, db_path, seed_dir, "--spells", "--force") is True

    assert spell_names(db_path) == [(2, "New Spell")]
    with database(db_path) as conn:
        assert conn.execute("SELECT title FROM conditions").fetchall() == [("Preserved",)]
    assert "PHASE 2 COMPLETE" in capsys.readouterr().out


@pytest.mark.parametrize("input_problem", ["missing", "malformed"])
def test_missing_or_malformed_seed_keeps_existing_rows(tmp_path, monkeypatch, capsys, input_problem):
    db_path = tmp_path / f"{input_problem}.db"
    seed_dir = tmp_path / f"{input_problem}-seed-copy"
    initialize_database(db_path)
    with database(db_path) as conn:
        conn.execute(
            "INSERT INTO spells (id, name, level, description, range, duration) "
            "VALUES (1, 'Keep Me', 1, 'Original', 'Self', 'Instantaneous')"
        )
    seed_dir.mkdir()
    if input_problem == "malformed":
        (seed_dir / "seed_spells.json").write_text("{ invalid json", encoding="utf-8")

    assert run_seed_main(monkeypatch, db_path, seed_dir, "--spells", "--force") is False

    assert spell_names(db_path) == [(1, "Keep Me")]
    output = capsys.readouterr().out
    assert "[ERROR] ERROR:" in output
    assert "PHASE 2 COMPLETE" not in output


@pytest.mark.parametrize("failure", ["delete", "populate"])
def test_delete_or_population_failure_rolls_back_forced_reload(
    tmp_path, monkeypatch, capsys, failure
):
    db_path = tmp_path / f"{failure}-failure.db"
    seed_dir = tmp_path / f"{failure}-seed-copy"
    initialize_database(db_path)
    write_seed(seed_dir, "seed_spells.json", [spell_seed(2, "New Spell")])
    with database(db_path) as conn:
        conn.execute(
            "INSERT INTO spells (id, name, level, description, range, duration) "
            "VALUES (1, 'Keep Me', 1, 'Original', 'Self', 'Instantaneous')"
        )
        if failure == "delete":
            conn.execute(
                "CREATE TRIGGER fail_spell_delete BEFORE DELETE ON spells "
                "BEGIN SELECT RAISE(ABORT, 'injected delete failure'); END"
            )
        else:
            conn.execute(
                "CREATE TRIGGER fail_spell_insert BEFORE INSERT ON spells "
                "BEGIN SELECT RAISE(ABORT, 'injected populate failure'); END"
            )

    assert run_seed_main(monkeypatch, db_path, seed_dir, "--spells", "--force") is False

    assert spell_names(db_path) == [(1, "Keep Me")]
    output = capsys.readouterr().out
    assert "injected" in output
    assert "PHASE 2 COMPLETE" not in output


def test_dungeon_force_reload_restores_revealed_cells_and_at_the_table(
    tmp_path, monkeypatch, capsys
):
    db_path = tmp_path / "dungeon-state.db"
    seed_dir = tmp_path / "dungeon-seed-copy"
    initialize_database(db_path)
    with database(db_path) as conn:
        conn.execute("INSERT INTO dungeons (id, title, data) VALUES (1, 'Old', '{}')")
        conn.execute("INSERT INTO map_layout (dungeon_id, data) VALUES (1, '{}')")
        conn.execute("INSERT INTO map_session_state (dungeon_id, data) VALUES (1, '{}')")
        conn.execute("INSERT INTO revealed_cells (dungeon_id, x, y) VALUES (1, 0, 0)")
        conn.execute("INSERT INTO at_the_table (lock, dungeon_id) VALUES (1, 1)")

    write_seed(seed_dir, "seed_dungeons.json", [{"id": 10, "title": "Restored", "data": {}}])
    write_seed(seed_dir, "seed_map_layouts.json", [{"dungeon_id": 10, "data": {"rooms": []}}])
    write_seed(
        seed_dir,
        "seed_map_session_state.json",
        [{"dungeon_id": 10, "data": {"doors": {"gate": True}}}],
    )
    write_seed(seed_dir, "seed_revealed_cells.json", [{"dungeon_id": 10, "x": 3, "y": 4}])
    write_seed(seed_dir, "seed_at_the_table.json", [{"lock": 1, "dungeon_id": 10}])

    assert run_seed_main(monkeypatch, db_path, seed_dir, "--dungeons", "--force") is True

    with database(db_path) as conn:
        assert conn.execute("SELECT id, title FROM dungeons").fetchall() == [(10, "Restored")]
        assert conn.execute("SELECT dungeon_id, x, y FROM revealed_cells").fetchall() == [
            (10, 3, 4)
        ]
        assert conn.execute("SELECT lock, dungeon_id FROM at_the_table").fetchall() == [(1, 10)]
    assert "PHASE 2 COMPLETE" in capsys.readouterr().out
