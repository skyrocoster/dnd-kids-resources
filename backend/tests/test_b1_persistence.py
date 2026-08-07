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
EXPORT_DB = _load_module("_b1_export_db_seeds", REPO_ROOT / "scripts" / "export_db_seeds.py")
QUICK_RULES = _load_module(
    "_b1_generate_spell_quick_rules",
    REPO_ROOT / "scripts" / "generate_spell_quick_rules.py",
)


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
    defaults = {row[1]: row[4] for row in columns if row[1] != "created_at"}

    assert names == [
        "id",
        "name",
        "level",
        "school",
        "description",
        "quick_rules",
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
        "categories",
        "materials",
        "attacks",
        "area_of_effect",
    ]
    assert types["id"] == "INTEGER"
    assert types["level"] == "INTEGER"
    assert types["concentration"] == "BOOLEAN"
    assert types["ritual"] == "BOOLEAN"
    assert defaults["categories"] == "'[\"Other\"]'"
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


def test_seed_categories_are_fixed_nonempty_and_round_trip(tmp_path: Path):
    db_path = tmp_path / "seed-categories.db"
    export_dir = tmp_path / "seeds"
    export_dir.mkdir()
    allowed = {"Damage", "Heal", "Protect", "Control", "Move", "Detect", "Influence", "Create", "Summon", "Other"}
    original = json.loads((REPO_ROOT / "data" / "seeds" / "seed_spells.json").read_text(encoding="utf-8"))

    _init_schema(db_path)
    _seed_spells(db_path, force=True)
    assert len(original) == 525
    assert all(spell["categories"] for spell in original)
    assert all(set(spell["categories"]) <= allowed for spell in original)
    assert all(spell["categories"] == list(dict.fromkeys(spell["categories"])) for spell in original)

    original_dir = EXPORT_DB.SEEDS_DIR
    try:
        EXPORT_DB.SEEDS_DIR = export_dir
        with sqlite3.connect(str(db_path)) as export_conn:
            EXPORT_DB.export_table(export_conn.cursor(), "spells")
    finally:
        EXPORT_DB.SEEDS_DIR = original_dir

    exported = json.loads((export_dir / "seed_spells.json").read_text(encoding="utf-8"))
    assert {spell["id"]: spell["categories"] for spell in exported} == {
        spell["id"]: spell["categories"] for spell in original
    }


def test_seed_all_525_quick_rules_are_nonblank_and_valid(tmp_path: Path):
    db_path = tmp_path / "seed-quick-rules.db"
    _init_schema(db_path)
    _seed_spells(db_path, force=True)

    conn = sqlite3.connect(str(db_path))
    try:
        rows = conn.execute("SELECT quick_rules FROM spells ORDER BY id").fetchall()
    finally:
        conn.close()

    assert len(rows) == 525
    assert all(isinstance(row[0], str) and row[0].strip() for row in rows)
    assert all(
        SEED_DB.validate_reference_text(row[0], SEED_DB.spell_value_reference_registry)["valid"]
        for row in rows
    )


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
                "quick_rules": None,
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
            "SELECT categories, damage, healing, higher_levels, casting_times, components, attacks, area_of_effect FROM spells WHERE id = ?",
            (9999,),
        ).fetchone()
        parsed = {
            "categories": json.loads(row["categories"]),
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

    assert parsed["categories"] == []
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
                "quick_rules": None,
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


def _init_and_seed_weapons(db_path: Path, force: bool = False) -> None:
    _init_schema(db_path)
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    try:
        with redirect_stdout(io.StringIO()):
            SEED_DB.populate_weapons(cursor, conn, force=force)
    finally:
        conn.close()


def test_weapon_invalid_quick_rules_rejected(tmp_path: Path):
    db_path = tmp_path / "weapon-invalid-qr.db"
    _init_schema(db_path)

    conn = sqlite3.connect(str(db_path))
    try:
        with pytest.raises(ValueError) as exc:
            SEED_DB.insert_weapon(
                conn.cursor(),
                {
                    "name": "Invalid QR Weapon",
                    "quick_rules": "Use {bogus_token}.",
                },
            )
        assert "Invalid quick_rules" in str(exc.value)
    finally:
        conn.close()


def test_weapon_quick_rules_round_trip_exact_string(tmp_path: Path):
    db_path = tmp_path / "weapon-qr-rt.db"
    export_dir = tmp_path / "seeds"
    export_dir.mkdir()
    _init_schema(db_path)

    conn = sqlite3.connect(str(db_path))
    try:
        SEED_DB.insert_weapon(
            conn.cursor(),
            {
                "name": "Round Trip Blade",
                "quick_rules": "Attack +{weapon_attack_bonus}, damage +{weapon_damage_bonus}.",
                "weapon_attack_bonus": 3,
                "weapon_damage_bonus": 2,
            },
        )
        conn.commit()
        row = conn.execute(
            "SELECT quick_rules FROM weapons WHERE name = ?",
            ("Round Trip Blade",),
        ).fetchone()
    finally:
        conn.close()

    assert row[0] == "Attack +{weapon_attack_bonus}, damage +{weapon_damage_bonus}."

    original_dir = EXPORT_DB.SEEDS_DIR
    try:
        EXPORT_DB.SEEDS_DIR = export_dir
        with sqlite3.connect(str(db_path)) as export_conn:
            EXPORT_DB.export_table(export_conn.cursor(), "weapons")
    finally:
        EXPORT_DB.SEEDS_DIR = original_dir

    exported = json.loads((export_dir / "seed_weapons.json").read_text(encoding="utf-8"))
    exported_row = next(item for item in exported if item["name"] == "Round Trip Blade")
    assert exported_row["quick_rules"] == "Attack +{weapon_attack_bonus}, damage +{weapon_damage_bonus}."
    assert exported_row["weapon_attack_bonus"] == 3
    assert exported_row["weapon_damage_bonus"] == 2


def test_seeded_weapon_quick_rules_round_trip_exact_strings(tmp_path: Path):
    db_path = tmp_path / "seeded-weapon-qr-rt.db"
    export_dir = tmp_path / "seeds"
    export_dir.mkdir()

    original_weapons = json.loads(
        (REPO_ROOT / "data" / "seeds" / "seed_weapons.json").read_text(encoding="utf-8")
    )
    original_quick_rules = {weapon["id"]: weapon.get("quick_rules") for weapon in original_weapons}

    assert len(original_quick_rules) == 218
    assert all(isinstance(value, str) and value.strip() for value in original_quick_rules.values())

    _init_and_seed_weapons(db_path, force=True)

    original_dir = EXPORT_DB.SEEDS_DIR
    try:
        EXPORT_DB.SEEDS_DIR = export_dir
        with sqlite3.connect(str(db_path)) as export_conn:
            EXPORT_DB.export_table(export_conn.cursor(), "weapons")
    finally:
        EXPORT_DB.SEEDS_DIR = original_dir

    exported = json.loads((export_dir / "seed_weapons.json").read_text(encoding="utf-8"))
    exported_quick_rules = {weapon["id"]: weapon.get("quick_rules") for weapon in exported}

    assert set(exported_quick_rules) == set(original_quick_rules)
    assert all(isinstance(value, str) and value.strip() for value in exported_quick_rules.values())
    assert exported_quick_rules == original_quick_rules


def test_quick_rules_round_trip_exact_string(tmp_path: Path):
    db_path = tmp_path / "quick-rules.db"
    export_dir = tmp_path / "seeds"
    export_dir.mkdir()
    _init_schema(db_path)

    conn = sqlite3.connect(str(db_path))
    try:
        SEED_DB.insert_spell(
            conn.cursor(),
            {
                "id": 321,
                "name": "Quick Rules Test",
                "level": 1,
                "school": "evocation",
                "categories": ["utility", "battle"],
                "description": "Quick rules test",
                "quick_rules": "Deal {spell_attack_bonus} damage.",
                "alternate_description": None,
                "range": "60 feet",
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
        row = conn.execute(
            "SELECT quick_rules FROM spells WHERE id = ?",
            (321,),
        ).fetchone()
    finally:
        conn.close()

    assert row[0] == "Deal {spell_attack_bonus} damage."

    original_dir = EXPORT_DB.SEEDS_DIR
    try:
        EXPORT_DB.SEEDS_DIR = export_dir
        with sqlite3.connect(str(db_path)) as export_conn:
            EXPORT_DB.export_table(export_conn.cursor(), "spells")
    finally:
        EXPORT_DB.SEEDS_DIR = original_dir

    exported = json.loads((export_dir / "seed_spells.json").read_text(encoding="utf-8"))
    exported_row = next(item for item in exported if item["id"] == 321)
    assert exported_row["quick_rules"] == "Deal {spell_attack_bonus} damage."
    assert exported_row["categories"] == ["utility", "battle"]


def test_seeded_quick_rules_round_trip_exact_strings(tmp_path: Path):
    db_path = tmp_path / "seeded-quick-rules.db"
    export_dir = tmp_path / "seeds"
    export_dir.mkdir()
    _init_schema(db_path)
    _seed_spells(db_path, force=True)

    original_spells = json.loads((REPO_ROOT / "data" / "seeds" / "seed_spells.json").read_text(encoding="utf-8"))
    original_quick_rules = {spell["id"]: spell.get("quick_rules") for spell in original_spells}

    assert len(original_quick_rules) == 525
    assert all(isinstance(value, str) and value.strip() for value in original_quick_rules.values())

    original_dir = EXPORT_DB.SEEDS_DIR
    try:
        EXPORT_DB.SEEDS_DIR = export_dir
        with sqlite3.connect(str(db_path)) as export_conn:
            EXPORT_DB.export_table(export_conn.cursor(), "spells")
    finally:
        EXPORT_DB.SEEDS_DIR = original_dir

    exported = json.loads((export_dir / "seed_spells.json").read_text(encoding="utf-8"))
    exported_quick_rules = {spell["id"]: spell.get("quick_rules") for spell in exported}

    assert set(exported_quick_rules) == set(original_quick_rules)
    assert all(isinstance(value, str) and value.strip() for value in exported_quick_rules.values())
    assert exported_quick_rules == original_quick_rules

def test_invalid_quick_rules_rejected(tmp_path: Path):
    db_path = tmp_path / "invalid-quick-rules.db"
    _init_schema(db_path)

    conn = sqlite3.connect(str(db_path))
    try:
        with pytest.raises(ValueError) as exc:
            SEED_DB.insert_spell(
                conn.cursor(),
                {
                    "id": 322,
                    "name": "Invalid Quick Rules",
                    "level": 1,
                    "school": "evocation",
                    "description": "Invalid quick rules",
                    "quick_rules": "Use {weapon_bonus}.",
                    "range": "60 feet",
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
        assert "Invalid quick_rules" in str(exc.value)
    finally:
        conn.close()



def _quick_rule_spell(**overrides):
    spell = {
        "id": 9000,
        "name": "Generated",
        "description": "Creates a simple magical effect. Extra detail stays out.",
        "damage": [],
        "healing": {"amount": None, "temp_hp": False, "max_hp": False},
        "range": "60 feet",
        "duration": "Instantaneous",
        "attacks": [],
    }
    spell.update(overrides)
    return spell


def test_quick_rules_generator_saving_throw_damage():
    result = QUICK_RULES.generate_quick_rules(
        [
            _quick_rule_spell(
                id=9001,
                name="Save Damage",
                damage=[{"name": "primary", "formula": "3d8", "damage_types": ["fire"]}],
                attacks=[{"kind": None, "saving_throws": ["dex"]}],
            ),
        ],
    )

    assert result["review"] == []
    assert result["drafts"][0]["quick_rules"] == (
        "Target makes a Dexterity save against {spell_save_dc}; "
        "on a failure, it takes 3d8 fire damage (Range 60 feet; duration Instantaneous)."
    )


def test_quick_rules_generator_spell_attack_damage():
    result = QUICK_RULES.generate_quick_rules(
        [
            _quick_rule_spell(
                id=9002,
                name="Attack Damage",
                damage=[{"name": "primary", "formula": "1d12", "damage_types": ["lightning"]}],
                attacks=[{"kind": "ranged", "saving_throws": []}],
            ),
        ],
    )

    assert result["review"] == []
    assert result["drafts"][0]["quick_rules"] == (
        "Make a ranged spell attack using {spell_attack_bonus}; "
        "on a hit, the target takes 1d12 lightning damage (Range 60 feet; duration Instantaneous)."
    )


def test_quick_rules_generator_healing():
    result = QUICK_RULES.generate_quick_rules(
        [
            _quick_rule_spell(
                id=9003,
                name="Healing",
                healing={"amount": "2d8 + 3", "temp_hp": False, "max_hp": False},
            ),
        ],
    )

    assert result["review"] == []
    assert result["drafts"][0]["quick_rules"] == (
        "Restore 2d8 + 3 hit points (Range 60 feet; duration Instantaneous)."
    )


def test_quick_rules_generator_descriptive_utility():
    result = QUICK_RULES.generate_quick_rules(
        [
            _quick_rule_spell(
                id=9004,
                name="Utility",
                description="You create a spectral globe around a willing creature. It lasts until the spell ends.",
                range="30 feet",
                duration="1 hour",
            ),
        ],
    )

    assert result["review"] == []
    assert result["drafts"][0]["quick_rules"] == (
        "You create a spectral globe around a willing creature. (Range 30 feet; duration 1 hour)."
    )


def test_quick_rules_generator_ambiguous_record_in_review_list():
    result = QUICK_RULES.generate_quick_rules(
        [
            _quick_rule_spell(
                id=9005,
                name="Ambiguous",
                damage=[{"name": "primary", "formula": "2d6", "damage_types": ["cold"]}],
                attacks=[{"kind": None, "saving_throws": ["dex", "str"]}],
            ),
        ],
    )

    assert result["drafts"] == []
    assert result["review"] == [
        {
            "id": 9005,
            "name": "Ambiguous",
            "reasons": ["multiple saving throw abilities"],
        },
    ]


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

