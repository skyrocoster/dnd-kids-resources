"""Persistence-projection tests for the B1 spell-table cutover."""

from __future__ import annotations

import importlib.util
import io
import json
import sqlite3
from contextlib import redirect_stdout
from pathlib import Path

import pytest

from backend.app.db import parse_json_list, parse_spell_row


REPO_ROOT = Path(__file__).resolve().parents[2]


def _load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


INIT_DB = _load_module("_b1_init_database", REPO_ROOT / "scripts" / "init_database.py")
SEED_DB = _load_module("_b1_seed_database", REPO_ROOT / "scripts" / "seed_database.py")


def _init_schema(db_path: Path) -> None:
    original = INIT_DB.DB_PATH
    INIT_DB.DB_PATH = db_path
    try:
        with redirect_stdout(io.StringIO()):
            INIT_DB.init_database()
    finally:
        INIT_DB.DB_PATH = original


def _seed_spells(db_path: Path, force: bool = False) -> None:
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    try:
        with redirect_stdout(io.StringIO()):
            SEED_DB.populate_spells(cursor, conn, force=force)
    finally:
        conn.close()


def test_target_schema_creates_correct_columns(tmp_path: Path):
    db_path = tmp_path / "schema.db"
    _init_schema(db_path)

    conn = sqlite3.connect(str(db_path))
    try:
        columns = conn.execute("PRAGMA table_info(spells)").fetchall()
    finally:
        conn.close()

    names = [row[1] for row in columns if row[1] != "created_at"]
    types = {row[1]: row[2] for row in columns if row[1] != "created_at"}

    assert names == [
        "id",
        "name",
        "level",
        "school",
        "description",
        "alternate_description",
        "damage",
        "healing",
        "range",
        "higher_levels",
        "casting_times",
        "duration",
        "concentration",
        "ritual",
        "components",
        "materials",
        "attacks",
        "area_of_effect",
    ]
    assert types["id"] == "INTEGER"
    assert types["level"] == "INTEGER"
    assert types["concentration"] == "BOOLEAN"
    assert types["ritual"] == "BOOLEAN"
    assert all(
        types[name] == "TEXT"
        for name in names
        if name not in {"id", "level", "concentration", "ritual"}
    )


def test_indexes_created(tmp_path: Path):
    db_path = tmp_path / "indexes.db"
    _init_schema(db_path)

    conn = sqlite3.connect(str(db_path))
    try:
        index_names = {row[1] for row in conn.execute("PRAGMA index_list(spells)").fetchall()}
    finally:
        conn.close()

    assert {"idx_spells_name", "idx_spells_level", "idx_spells_school"}.issubset(index_names)


def test_seed_all_525_insert_with_ids_preserved(tmp_path: Path):
    db_path = tmp_path / "seed.db"
    _init_schema(db_path)
    _seed_spells(db_path, force=True)

    conn = sqlite3.connect(str(db_path))
    try:
        count = conn.execute("SELECT COUNT(*) FROM spells").fetchone()[0]
        ids = [row[0] for row in conn.execute("SELECT id FROM spells ORDER BY id").fetchall()]
    finally:
        conn.close()

    assert count == 525
    assert ids == list(range(1, 526))


def test_seed_level_is_integer(tmp_path: Path):
    db_path = tmp_path / "level.db"
    _init_schema(db_path)
    _seed_spells(db_path, force=True)

    conn = sqlite3.connect(str(db_path))
    try:
        level_type = conn.execute("SELECT typeof(level) FROM spells LIMIT 1").fetchone()[0]
    finally:
        conn.close()

    assert level_type == "integer"


def test_json_text_columns_round_trip(tmp_path: Path):
    db_path = tmp_path / "roundtrip.db"
    _init_schema(db_path)
    _seed_spells(db_path, force=True)

    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    try:
        damage_row = conn.execute(
            "SELECT damage, healing, higher_levels, casting_times, components, attacks, area_of_effect FROM spells WHERE name = ?",
            ("Absorb Elements",),
        ).fetchone()
        healing_row = conn.execute(
            "SELECT damage, healing, higher_levels, casting_times, components, attacks, area_of_effect FROM spells WHERE name = ?",
            ("Aid",),
        ).fetchone()
        empty_row = conn.execute(
            "SELECT damage, healing, higher_levels, casting_times, components, attacks, area_of_effect FROM spells WHERE name = ?",
            ("Abi-Dalzim's Horrid Wilting",),
        ).fetchone()
    finally:
        conn.close()

    assert isinstance(json.loads(damage_row["damage"]), list)
    assert isinstance(json.loads(damage_row["healing"]), dict)
    assert isinstance(json.loads(damage_row["higher_levels"]), dict)
    assert isinstance(json.loads(damage_row["casting_times"]), list)
    assert isinstance(json.loads(damage_row["components"]), list)
    assert isinstance(json.loads(damage_row["attacks"]), list)
    assert isinstance(json.loads(damage_row["area_of_effect"]), dict)
    assert json.loads(healing_row["healing"]) == {"amount": "5", "temp_hp": False, "max_hp": True}
    assert json.loads(empty_row["damage"]) == []


def test_empty_collections_survive_storage(tmp_path: Path):
    db_path = tmp_path / "empty.db"
    _init_schema(db_path)

    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    try:
        SEED_DB.insert_spell(
            conn.cursor(),
            {
                "id": 9999,
                "name": "Empty Test",
                "level": 0,
                "school": None,
                "description": "Empty test",
                "alternate_description": None,
                "range": "Self",
                "duration": "Instantaneous",
                "concentration": False,
                "ritual": False,
                "materials": None,
            },
        )
        conn.commit()

        row = conn.execute(
            "SELECT damage, healing, higher_levels, casting_times, components, attacks, area_of_effect FROM spells WHERE id = ?",
            (9999,),
        ).fetchone()
        parsed = {
            "damage": json.loads(row["damage"]),
            "healing": json.loads(row["healing"]),
            "higher_levels": json.loads(row["higher_levels"]),
            "casting_times": json.loads(row["casting_times"]),
            "components": json.loads(row["components"]),
            "attacks": json.loads(row["attacks"]),
            "area_of_effect": json.loads(row["area_of_effect"]),
        }
    finally:
        conn.close()

    assert parsed["damage"] == []
    assert parsed["healing"] == {"amount": None, "temp_hp": False, "max_hp": False}
    assert parsed["higher_levels"] == {"text": None, "damage_by_slot": {}}
    assert parsed["casting_times"] == []
    assert parsed["components"] == []
    assert parsed["attacks"] == []
    assert parsed["area_of_effect"] == {"shape": None, "size": None}


def test_insert_spell_with_explicit_id(tmp_path: Path):
    db_path = tmp_path / "explicit.db"
    _init_schema(db_path)

    conn = sqlite3.connect(str(db_path))
    try:
        SEED_DB.insert_spell(
            conn.cursor(),
            {
                "id": 123,
                "name": "Explicit",
                "level": 1,
                "school": "abjuration",
                "description": "Explicit ID",
                "range": "Self",
                "duration": "Instantaneous",
                "casting_times": ["1 action"],
                "components": ["V"],
                "damage": [],
                "healing": {"amount": None, "temp_hp": False, "max_hp": False},
                "higher_levels": {"text": None, "damage_by_slot": {}},
                "attacks": [],
                "area_of_effect": {"shape": None, "size": None},
                "concentration": False,
                "ritual": False,
            },
        )
        conn.commit()
        inserted_id = conn.execute("SELECT id FROM spells").fetchone()[0]
    finally:
        conn.close()

    assert inserted_id == 123


def test_seed_idempotent_without_force(tmp_path: Path):
    db_path = tmp_path / "idempotent.db"
    _init_schema(db_path)
    _seed_spells(db_path, force=False)
    _seed_spells(db_path, force=False)

    conn = sqlite3.connect(str(db_path))
    try:
        count = conn.execute("SELECT COUNT(*) FROM spells").fetchone()[0]
    finally:
        conn.close()

    assert count == 525


def test_parse_spell_row_target_columns():
    row = {
        "id": 1,
        "name": "Test",
        "level": 3,
        "school": "evocation",
        "description": "Test spell",
        "alternate_description": None,
        "damage": '[{"name": "primary", "formula": "2d6", "damage_types": ["fire"]}]',
        "healing": '{"amount": "1d4", "temp_hp": true, "max_hp": false}',
        "range": "120 feet",
        "higher_levels": '{"text": "At higher levels", "damage_by_slot": {"3": "3d6"}}',
        "casting_times": '["1 action"]',
        "duration": "Instantaneous",
        "concentration": False,
        "ritual": False,
        "components": '["V", "S"]',
        "materials": None,
        "attacks": '[{"kind": "ranged", "saving_throws": ["dex"]}]',
        "area_of_effect": '{"shape": "sphere", "size": 20}',
    }

    parsed = parse_spell_row(row)

    assert parsed["damage"] == [{"name": "primary", "formula": "2d6", "damage_types": ["fire"]}]
    assert parsed["healing"] == {"amount": "1d4", "temp_hp": True, "max_hp": False}
    assert parsed["higher_levels"] == {"text": "At higher levels", "damage_by_slot": {"3": "3d6"}}
    assert parsed["casting_times"] == ["1 action"]
    assert parsed["components"] == ["V", "S"]
    assert parsed["attacks"] == [{"kind": "ranged", "saving_throws": ["dex"]}]
    assert parsed["area_of_effect"] == {"shape": "sphere", "size": 20}


def test_parse_json_list_no_comma_fallback():
    with pytest.raises(TypeError):
        parse_json_list("V, S")
