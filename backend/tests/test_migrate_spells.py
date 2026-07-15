from __future__ import annotations

import copy
import importlib.util
import json
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
SCRIPT_PATH = ROOT / "scripts" / "migrate_spells.py"
SEED_PATH = ROOT / "data" / "seeds" / "seed_spells.json"
TARGET_FIELDS = [
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

spec = importlib.util.spec_from_file_location("migrate_spells", SCRIPT_PATH)
migrate_spells = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(migrate_spells)


def base_spell(**overrides):
    spell = {
        "id": 999,
        "spell_name": "Fixture Spell",
        "icon": "✨",
        "level": "3",
        "school": "Evocation",
        "spell_text": "A test spell description.",
        "spell_alt_text": None,
        "damage": [
            {"name": "initial", "damage": "3d6", "type": ["Fire"]}
        ],
        "heal": '{"amount": "2d8", "temp_hp": false, "max_hp": false}',
        "heal_at_spell_slots": None,
        "range": "60 feet",
        "higher_levels": "Higher level text.",
        "damage_at_higher_levels": '{"1": "3d6", "2": "4d6"}',
        "casting_time": "1 action",
        "duration": "Concentration, up to 1 minute",
        "concentration": 1,
        "ritual": 0,
        "components": '["V", "S", "M"]',
        "materials": "a pinch of sulfur",
        "attack_type": [
            {"name": "initial", "type": "ranged", "save": ["DEX"]}
        ],
        "action": None,
        "area_of_effect": '{"Sphere": 20}',
        "classes": None,
        "subclasses": None,
    }
    spell.update(overrides)
    return spell


def migrate_one(spell):
    return migrate_spells.migrate([copy.deepcopy(spell)])[0]


@pytest.fixture(scope="module")
def legacy_spells():
    return json.loads(SEED_PATH.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def migrated_spells(legacy_spells):
    return migrate_spells.migrate(copy.deepcopy(legacy_spells))


def corpus_spell(legacy_spells, spell_id):
    return next(spell for spell in legacy_spells if spell["id"] == spell_id)


def run_cli(*args):
    return subprocess.run(
        [sys.executable, str(SCRIPT_PATH), *map(str, args)],
        capture_output=True,
        text=True,
    )


def write_source(path, rows=None):
    path.write_text(
        json.dumps(rows if rows is not None else [base_spell()], ensure_ascii=False),
        encoding="utf-8",
    )


def test_conventional_spell_transform_has_exact_ordered_contract():
    result = migrate_one(base_spell())

    assert list(result) == TARGET_FIELDS
    assert result == {
        "id": 999,
        "name": "Fixture Spell",
        "level": 3,
        "school": "evocation",
        "description": "A test spell description.",
        "alternate_description": None,
        "damage": [
            {"name": "initial", "formula": "3d6", "damage_types": ["fire"]}
        ],
        "healing": {"amount": "2d8", "temp_hp": False, "max_hp": False},
        "range": "60 feet",
        "higher_levels": {
            "text": "Higher level text.",
            "damage_by_slot": {"1": "3d6", "2": "4d6"},
        },
        "casting_times": ["1 action"],
        "duration": "Concentration, up to 1 minute",
        "concentration": True,
        "ritual": False,
        "components": ["V", "S", "M"],
        "materials": "a pinch of sulfur",
        "attacks": [{"kind": "ranged", "saving_throws": ["dex"]}],
        "area_of_effect": {"shape": "sphere", "size": 20},
    }
    assert "icon" not in result


def test_no_optional_data_uses_native_defaults():
    result = migrate_one(
        base_spell(
            spell_alt_text=None,
            damage=None,
            heal=None,
            higher_levels=None,
            damage_at_higher_levels=None,
            materials=None,
            attack_type=None,
            area_of_effect=None,
            concentration=0,
            ritual=1,
        )
    )

    assert result["damage"] == []
    assert result["healing"] == {
        "amount": None,
        "temp_hp": False,
        "max_hp": False,
    }
    assert result["higher_levels"] == {"text": None, "damage_by_slot": {}}
    assert result["attacks"] == []
    assert result["area_of_effect"] == {"shape": None, "size": None}
    assert result["concentration"] is False
    assert result["ritual"] is True


def test_healing_preserves_free_form_expression():
    result = migrate_one(
        base_spell(heal='{"amount": "1/2 x damage", "temp_hp": true, "max_hp": true}')
    )
    assert result["healing"] == {
        "amount": "1/2 x damage",
        "temp_hp": True,
        "max_hp": True,
    }


def test_scaled_damage_preserves_ordered_slot_map():
    result = migrate_one(
        base_spell(
            damage_at_higher_levels='{"3": "4d8", "5": "6d8", "9": "10d8"}'
        )
    )
    assert list(result["higher_levels"]["damage_by_slot"].items()) == [
        ("3", "4d8"),
        ("5", "6d8"),
        ("9", "10d8"),
    ]


def test_multiple_damage_entries_are_not_collapsed():
    result = migrate_one(
        base_spell(
            damage=[
                {"name": "primary", "damage": "2d6", "type": ["cold"]},
                {"name": "secondary", "damage": "1d6", "type": ["fire"]},
            ]
        )
    )
    assert result["damage"] == [
        {"name": "primary", "formula": "2d6", "damage_types": ["cold"]},
        {"name": "secondary", "formula": "1d6", "damage_types": ["fire"]},
    ]


@pytest.mark.parametrize(
    ("raw_attack", "expected"),
    [
        (
            {"name": "initial", "type": "melee"},
            {"kind": "melee", "saving_throws": []},
        ),
        (
            {"name": "initial", "type": "", "save": ["WIS", "CON"]},
            {"kind": None, "saving_throws": ["wis", "con"]},
        ),
    ],
)
def test_attack_roll_and_saving_throw_shapes(raw_attack, expected):
    assert migrate_one(base_spell(attack_type=[raw_attack]))["attacks"] == [expected]


def test_plant_growth_preserves_both_casting_times(legacy_spells):
    result = migrate_one(corpus_spell(legacy_spells, 348))
    assert result["casting_times"] == ["1 action", "8 hours"]
    assert result["area_of_effect"] == {"shape": None, "size": None}


def test_absorb_elements_preserves_variable_damage_type(legacy_spells):
    result = migrate_one(corpus_spell(legacy_spells, 2))
    assert result["damage"] == [
        {"name": "primary", "formula": "1d6", "damage_types": []}
    ]


def test_flashdaggers_applies_only_enumerated_repairs(legacy_spells):
    result = migrate_one(corpus_spell(legacy_spells, 525))
    assert result["name"] == "Flashdaggers"
    assert result["school"] == "conjuration"
    assert result["components"] == ["V", "S"]
    assert result["damage"] == [
        {"name": "initial", "formula": "5d4", "damage_types": ["piercing"]}
    ]
    assert result["attacks"] == [{"kind": None, "saving_throws": ["dex"]}]


def test_full_corpus_acceptance_contract(migrated_spells):
    assert len(migrated_spells) == 525
    assert len({spell["id"] for spell in migrated_spells}) == 525
    assert len({spell["name"] for spell in migrated_spells}) == 525
    assert all(list(spell) == TARGET_FIELDS for spell in migrated_spells)
    assert all(type(spell["level"]) is int for spell in migrated_spells)
    assert all(0 <= spell["level"] <= 9 for spell in migrated_spells)
    assert all(type(spell["concentration"]) is bool for spell in migrated_spells)
    assert all(type(spell["ritual"]) is bool for spell in migrated_spells)
    assert all(isinstance(spell["components"], list) for spell in migrated_spells)
    assert all(isinstance(spell["healing"], dict) for spell in migrated_spells)
    assert all(isinstance(spell["higher_levels"], dict) for spell in migrated_spells)
    assert all(isinstance(spell["area_of_effect"], dict) for spell in migrated_spells)
    assert sum(len(spell["damage"]) for spell in migrated_spells) == 103
    assert sum(bool(spell["damage"]) for spell in migrated_spells) == 97
    assert sum(len(spell["damage"]) == 2 for spell in migrated_spells) == 6
    assert sum(len(spell["attacks"]) for spell in migrated_spells) == 249
    assert sum(bool(spell["higher_levels"]["damage_by_slot"]) for spell in migrated_spells) == 74
    assert all(
        spell["higher_levels"]["text"] is not None
        for spell in migrated_spells
        if spell["higher_levels"]["damage_by_slot"]
    )
    assert all(
        attack["kind"] in {None, "melee", "ranged"}
        and all(save == save.lower() for save in attack["saving_throws"])
        for spell in migrated_spells
        for attack in spell["attacks"]
    )


def test_migration_is_pure_and_deterministic(legacy_spells):
    original = copy.deepcopy(legacy_spells)
    first = migrate_spells.migrate(legacy_spells)
    second = migrate_spells.migrate(copy.deepcopy(legacy_spells))
    assert legacy_spells == original
    assert first == second
    assert migrate_spells._serialize(first) == migrate_spells._serialize(second)


@pytest.mark.parametrize(
    ("field", "bad_value"),
    [
        ("components", '["V"'),
        ("heal", '{"amount":'),
        ("damage_at_higher_levels", "[]"),
        ("area_of_effect", "not json"),
    ],
)
def test_malformed_embedded_json_has_spell_and_field_context(field, bad_value):
    with pytest.raises(migrate_spells.MigrationError) as exc_info:
        migrate_one(base_spell(**{field: bad_value}))
    message = str(exc_info.value)
    assert "spell 999 'Fixture Spell'" in message
    assert field in message


@pytest.mark.parametrize(
    "mutation",
    [
        lambda spell: spell.update({"unexpected": "value"}),
        lambda spell: spell.pop("duration"),
        lambda spell: spell.update({"concentration": "1"}),
        lambda spell: spell.update(
            {"damage": [{"name": "initial", "damage": "1d6"}]}
        ),
        lambda spell: spell.update(
            {"attack_type": [{"name": "other", "type": "melee"}]}
        ),
        lambda spell: spell.update({"casting_time": "['1 action']"}),
    ],
)
def test_unrecognized_source_shapes_fail_contextually(mutation):
    spell = base_spell()
    mutation(spell)
    with pytest.raises(migrate_spells.MigrationError) as exc_info:
        migrate_one(spell)
    assert "spell 999 'Fixture Spell' at" in str(exc_info.value)


def test_cli_help():
    result = run_cli("--help")
    assert result.returncode == 0
    assert "--write" in result.stdout
    assert "--check" in result.stdout


def test_cli_write_requires_explicit_output(tmp_path):
    source = tmp_path / "source.json"
    write_source(source)
    result = run_cli("--source", source, "--write")
    assert result.returncode != 0
    assert "--output is required" in result.stderr


def test_cli_write_never_overwrites_source(tmp_path):
    source = tmp_path / "source.json"
    write_source(source)
    before = source.read_bytes()
    result = run_cli("--source", source, "--write", "--output", source)
    assert result.returncode != 0
    assert "distinct" in result.stderr
    assert source.read_bytes() == before


def test_cli_write_matches_pure_transform_bytes(tmp_path):
    source = tmp_path / "source.json"
    output = tmp_path / "output.json"
    rows = [base_spell()]
    write_source(source, rows)

    result = run_cli("--source", source, "--write", "--output", output)

    assert result.returncode == 0, result.stderr
    expected = migrate_spells._serialize(migrate_spells.migrate(copy.deepcopy(rows)))
    assert output.read_text(encoding="utf-8") == expected


def test_cli_check_succeeds_for_exact_generated_output(tmp_path):
    source = tmp_path / "source.json"
    output = tmp_path / "output.json"
    write_source(source)
    assert run_cli("--source", source, "--write", "--output", output).returncode == 0
    before_source = source.read_bytes()
    before_output = output.read_bytes()

    result = run_cli("--source", source, "--check", "--output", output)

    assert result.returncode == 0, result.stderr
    assert source.read_bytes() == before_source
    assert output.read_bytes() == before_output


@pytest.mark.parametrize("comparison_state", ["missing", "different"])
def test_cli_check_fails_for_missing_or_different_output(tmp_path, comparison_state):
    source = tmp_path / "source.json"
    output = tmp_path / "output.json"
    write_source(source)
    if comparison_state == "different":
        output.write_text("[]\n", encoding="utf-8")

    result = run_cli("--source", source, "--check", "--output", output)

    assert result.returncode == 1
    assert "CHECK FAILED" in result.stderr


def test_cli_check_requires_explicit_source(tmp_path):
    result = run_cli("--check", "--output", tmp_path / "output.json")
    assert result.returncode != 0
    assert "--source is required" in result.stderr
