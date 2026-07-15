from __future__ import annotations

import copy
import importlib.util
import json
import subprocess
import sys
from pathlib import Path
from typing import Literal

import pytest
from pydantic import BaseModel, ConfigDict, Field, ValidationError

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
DROPPED_LEGACY_KEYS = {
    "spell_name", "icon", "spell_text", "spell_alt_text", "heal",
    "heal_at_spell_slots", "damage_at_higher_levels", "casting_time",
    "attack_type", "action", "classes", "subclasses",
}

spec = importlib.util.spec_from_file_location("migrate_spells", SCRIPT_PATH)
migrate_spells = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(migrate_spells)


# ---------------------------------------------------------------------------
# Migration-only Pydantic v2 models (strict, for test validation only)
# ---------------------------------------------------------------------------

class Damage(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1)
    formula: str = Field(min_length=1)
    damage_types: list[str]


class Healing(BaseModel):
    model_config = ConfigDict(extra="forbid")
    amount: str | None = None
    temp_hp: bool = False
    max_hp: bool = False


class HigherLevels(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str | None = None
    damage_by_slot: dict[str, str] = {}


class Attack(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: Literal["melee", "ranged"] | None = None
    saving_throws: list[str] = []


class AreaOfEffect(BaseModel):
    model_config = ConfigDict(extra="forbid")
    shape: str | None = None
    size: int | None = Field(default=None, ge=1)


class CanonicalSpell(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: int = Field(gt=0)
    name: str = Field(min_length=1)
    level: int = Field(ge=0, le=9)
    school: str | None = None
    description: str = Field(min_length=1)
    alternate_description: str | None = None
    damage: list[Damage] = []
    healing: Healing = Field(default_factory=Healing)
    range: str = Field(min_length=1)
    higher_levels: HigherLevels = Field(default_factory=HigherLevels)
    casting_times: list[str] = []
    duration: str = Field(min_length=1)
    concentration: bool
    ritual: bool
    components: list[str] = []
    materials: str | None = None
    attacks: list[Attack] = []
    area_of_effect: AreaOfEffect = Field(default_factory=AreaOfEffect)


# ---------------------------------------------------------------------------
# Fixtures and helpers
# ---------------------------------------------------------------------------

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
def canonical_spells():
    return json.loads(SEED_PATH.read_text(encoding="utf-8"))


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


# ---------------------------------------------------------------------------
# Explicit legacy fixture rows (for edge-case transform tests)
# ---------------------------------------------------------------------------

def legacy_plant_growth():
    return base_spell(
        id=348,
        spell_name="Plant Growth",
        level="3",
        school="transmutation",
        spell_text="This spell channels vitality into plants within a specific area.",
        damage=None,
        heal=None,
        range="150 feet",
        higher_levels=None,
        damage_at_higher_levels=None,
        casting_time="['1 action', '8 hour']",
        duration="Instantaneous",
        concentration=0,
        ritual=0,
        components='["V", "S"]',
        materials=None,
        attack_type=None,
        area_of_effect="{}",
    )


def legacy_absorb_elements():
    return base_spell(
        id=2,
        spell_name="Absorb Elements",
        level="1",
        school="abjuration",
        spell_text="The spell captures some of the incoming energy.",
        damage=[{"name": "primary", "damage": "1d6"}],
        heal=None,
        range="Self",
        higher_levels="When you cast this spell using a spell slot of 2nd level or higher.",
        damage_at_higher_levels='{"1": "1d6", "2": "2d6", "3": "3d6", "4": "4d6", "5": "5d6", "6": "6d6", "7": "7d6", "8": "8d6", "9": "9d6"}',
        casting_time="1 reaction",
        duration="1 round",
        concentration=0,
        ritual=0,
        components='["S"]',
        materials=None,
        attack_type=None,
        area_of_effect="{}",
    )


def legacy_flashdaggers():
    return base_spell(
        id=525,
        spell_name="Flashdaggers",
        school="Conjuration",
        spell_text="You summon a spray of knives.",
        damage=[{"name": "initial", "damage": "5d4", "damage_type": "peircing"}],
        heal=None,
        range="60",
        higher_levels=None,
        damage_at_higher_levels=None,
        casting_time="1 action",
        duration="Instantaneous",
        concentration=0,
        ritual=0,
        components="V, S",
        materials=None,
        attack_type=[{"name": "initial", "save": "DEX"}],
        action='{"action": "Action"}',
        area_of_effect=None,
        classes="Wizard",
    )


# ---------------------------------------------------------------------------
# S2 transform tests (retained)
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Edge-case tests using explicit legacy fixtures
# ---------------------------------------------------------------------------

def test_plant_growth_preserves_both_casting_times():
    result = migrate_one(legacy_plant_growth())
    assert result["casting_times"] == ["1 action", "8 hours"]
    assert result["area_of_effect"] == {"shape": None, "size": None}


def test_absorb_elements_preserves_variable_damage_type():
    result = migrate_one(legacy_absorb_elements())
    assert result["damage"] == [
        {"name": "primary", "formula": "1d6", "damage_types": []}
    ]


def test_flashdaggers_applies_only_enumerated_repairs():
    result = migrate_one(legacy_flashdaggers())
    assert result["name"] == "Flashdaggers"
    assert result["school"] == "conjuration"
    assert result["components"] == ["V", "S"]
    assert result["damage"] == [
        {"name": "initial", "formula": "5d4", "damage_types": ["piercing"]}
    ]
    assert result["attacks"] == [{"kind": None, "saving_throws": ["dex"]}]


# ---------------------------------------------------------------------------
# S2 contextual error tests (retained)
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# S2 CLI tests (retained)
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# S3: Canonical seed shape and identity
# ---------------------------------------------------------------------------

def test_canonical_seed_shape_and_identity(canonical_spells):
    assert len(canonical_spells) == 525
    assert len({spell["id"] for spell in canonical_spells}) == 525
    assert all(isinstance(spell["id"], int) and spell["id"] > 0 for spell in canonical_spells)
    assert len({spell["name"].casefold() for spell in canonical_spells}) == 525
    assert all(list(spell.keys()) == TARGET_FIELDS for spell in canonical_spells)
    union_keys = set()
    for spell in canonical_spells:
        union_keys.update(spell.keys())
    assert not union_keys & DROPPED_LEGACY_KEYS
    assert "icon" not in union_keys
    assert "spell_name" not in union_keys
    assert "heal" not in union_keys
    assert "attack_type" not in union_keys
    assert "classes" not in union_keys
    assert "subclasses" not in union_keys


# ---------------------------------------------------------------------------
# S3: Strict model validation
# ---------------------------------------------------------------------------

def test_strict_model_validation_accepts_canonical_rows(canonical_spells):
    for spell in canonical_spells:
        validated = CanonicalSpell.model_validate(spell)
        assert type(validated.id) is int
        assert type(validated.level) is int
        assert type(validated.concentration) is bool
        assert type(validated.ritual) is bool
        assert isinstance(validated.damage, list)
        assert isinstance(validated.healing, Healing)
        assert isinstance(validated.higher_levels, HigherLevels)
        assert isinstance(validated.area_of_effect, AreaOfEffect)


def test_strict_model_rejects_extra_legacy_key():
    bad = {
        "id": 999, "name": "X", "level": 1, "school": None, "description": "X",
        "alternate_description": None, "damage": [], "healing": Healing(),
        "range": "Self", "higher_levels": HigherLevels(), "casting_times": ["1 action"],
        "duration": "Instantaneous", "concentration": False, "ritual": False,
        "components": ["V"], "materials": None, "attacks": [],
        "area_of_effect": AreaOfEffect(), "icon": "✨",
    }
    with pytest.raises(ValidationError):
        CanonicalSpell.model_validate(bad)


def test_strict_model_rejects_string_level():
    bad = {
        "id": 999, "name": "X", "level": "3", "school": None, "description": "X",
        "alternate_description": None, "damage": [], "healing": Healing(),
        "range": "Self", "higher_levels": HigherLevels(), "casting_times": ["1 action"],
        "duration": "Instantaneous", "concentration": False, "ritual": False,
        "components": ["V"], "materials": None, "attacks": [],
        "area_of_effect": AreaOfEffect(),
    }
    with pytest.raises(ValidationError):
        CanonicalSpell.model_validate(bad, strict=True)


def test_strict_model_rejects_integer_boolean():
    bad = {
        "id": 999, "name": "X", "level": 1, "school": None, "description": "X",
        "alternate_description": None, "damage": [], "healing": Healing(),
        "range": "Self", "higher_levels": HigherLevels(), "casting_times": ["1 action"],
        "duration": "Instantaneous", "concentration": 0, "ritual": 0,
        "components": ["V"], "materials": None, "attacks": [],
        "area_of_effect": AreaOfEffect(),
    }
    with pytest.raises(ValidationError):
        CanonicalSpell.model_validate(bad, strict=True)


def test_strict_model_rejects_null_collection():
    bad = {
        "id": 999, "name": "X", "level": 1, "school": None, "description": "X",
        "alternate_description": None, "damage": None, "healing": Healing(),
        "range": "Self", "higher_levels": HigherLevels(), "casting_times": ["1 action"],
        "duration": "Instantaneous", "concentration": False, "ritual": False,
        "components": ["V"], "materials": None, "attacks": [],
        "area_of_effect": AreaOfEffect(),
    }
    with pytest.raises(ValidationError):
        CanonicalSpell.model_validate(bad)


def test_strict_model_rejects_invalid_attack_kind():
    bad_attack = {"kind": "invalid", "saving_throws": []}
    bad = {
        "id": 999, "name": "X", "level": 1, "school": None, "description": "X",
        "alternate_description": None, "damage": [], "healing": Healing(),
        "range": "Self", "higher_levels": HigherLevels(), "casting_times": ["1 action"],
        "duration": "Instantaneous", "concentration": False, "ritual": False,
        "components": ["V"], "materials": None, "attacks": [bad_attack],
        "area_of_effect": AreaOfEffect(),
    }
    with pytest.raises(ValidationError):
        CanonicalSpell.model_validate(bad)


def test_strict_model_rejects_non_positive_aoe_size():
    bad_aoe = {"shape": "sphere", "size": 0}
    bad = {
        "id": 999, "name": "X", "level": 1, "school": None, "description": "X",
        "alternate_description": None, "damage": [], "healing": Healing(),
        "range": "Self", "higher_levels": HigherLevels(), "casting_times": ["1 action"],
        "duration": "Instantaneous", "concentration": False, "ritual": False,
        "components": ["V"], "materials": None, "attacks": [],
        "area_of_effect": bad_aoe,
    }
    with pytest.raises(ValidationError):
        AreaOfEffect.model_validate(bad_aoe)


# ---------------------------------------------------------------------------
# S3: Defaults and normalized members
# ---------------------------------------------------------------------------

def test_canonical_defaults_and_normalized_members(canonical_spells):
    for spell in canonical_spells:
        assert isinstance(spell["components"], list)
        assert isinstance(spell["healing"], dict)
        assert isinstance(spell["higher_levels"], dict)
        assert isinstance(spell["area_of_effect"], dict)
        assert "amount" in spell["healing"]
        assert "temp_hp" in spell["healing"]
        assert "max_hp" in spell["healing"]
        assert "text" in spell["higher_levels"]
        assert "damage_by_slot" in spell["higher_levels"]
        assert "shape" in spell["area_of_effect"]
        assert "size" in spell["area_of_effect"]
    populated_healing = [
        s for s in canonical_spells if s["healing"]["amount"] is not None
    ]
    for spell in populated_healing:
        assert isinstance(spell["healing"]["amount"], str)
        assert spell["healing"]["amount"]
    populated_hl = [
        s for s in canonical_spells if s["higher_levels"]["text"] is not None
    ]
    for spell in populated_hl:
        assert isinstance(spell["higher_levels"]["text"], str)
        assert spell["higher_levels"]["text"]
    schools = [s["school"] for s in canonical_spells if s["school"] is not None]
    assert all(s == s.lower() for s in schools)
    for spell in canonical_spells:
        for dtype in spell["damage"]:
            for dt in dtype["damage_types"]:
                assert dt == dt.lower()
        for attack in spell["attacks"]:
            for save in attack["saving_throws"]:
                assert save == save.lower()
    for spell in canonical_spells:
        for comp in spell["components"]:
            assert comp == comp.strip() and comp == comp.upper()
        assert len(spell["components"]) == len(set(spell["components"]))
    for spell in canonical_spells:
        slot_map = spell["higher_levels"]["damage_by_slot"]
        for key in slot_map:
            assert len(key) == 1 and key in "0123456789"
            assert slot_map[key]


# ---------------------------------------------------------------------------
# S3: Corpus acceptance totals
# ---------------------------------------------------------------------------

def test_canonical_corpus_acceptance_totals(canonical_spells):
    assert len(canonical_spells) == 525
    assert sum(len(spell["damage"]) for spell in canonical_spells) == 103
    assert sum(bool(spell["damage"]) for spell in canonical_spells) == 97
    assert sum(len(spell["damage"]) == 2 for spell in canonical_spells) == 6
    assert sum(len(spell["attacks"]) for spell in canonical_spells) == 249
    assert sum(
        bool(spell["higher_levels"]["damage_by_slot"]) for spell in canonical_spells
    ) == 74
    for spell in canonical_spells:
        if spell["higher_levels"]["damage_by_slot"]:
            assert spell["higher_levels"]["text"] is not None
    levels = {spell["level"] for spell in canonical_spells}
    assert levels == set(range(10))


# ---------------------------------------------------------------------------
# S3: Known repairs present in canonical data
# ---------------------------------------------------------------------------

def test_canonical_plant_growth_repairs(canonical_spells):
    pg = next(s for s in canonical_spells if s["id"] == 348)
    assert pg["casting_times"] == ["1 action", "8 hours"]
    assert pg["area_of_effect"] == {"shape": None, "size": None}


def test_canonical_absorb_elements_repairs(canonical_spells):
    ae = next(s for s in canonical_spells if s["id"] == 2)
    assert ae["damage"] == [
        {"name": "primary", "formula": "1d6", "damage_types": []}
    ]


def test_canonical_flashdaggers_repairs(canonical_spells):
    fd = next(s for s in canonical_spells if s["id"] == 525)
    assert fd["school"] == "conjuration"
    assert fd["components"] == ["V", "S"]
    assert fd["damage"] == [
        {"name": "initial", "formula": "5d4", "damage_types": ["piercing"]}
    ]
    assert fd["attacks"] == [{"kind": None, "saving_throws": ["dex"]}]


def test_canonical_no_icon_field(canonical_spells):
    for spell in canonical_spells:
        assert "icon" not in spell


# ---------------------------------------------------------------------------
# S3: Reproducibility and CLI safety
# ---------------------------------------------------------------------------

def test_canonical_source_order_preserves_legacy(canonical_spells):
    ids = [s["id"] for s in canonical_spells]
    names = [s["name"] for s in canonical_spells]
    assert len(ids) == 525
    assert len(set(ids)) == 525
    assert len(set(names)) == 525


def test_cli_check_succeeds_for_migrated_corpus(tmp_path):
    source = tmp_path / "source.json"
    output = tmp_path / "output.json"
    rows = [base_spell(), legacy_plant_growth(), legacy_absorb_elements(), legacy_flashdaggers()]
    write_source(source, rows)
    assert run_cli("--source", source, "--write", "--output", output).returncode == 0

    before_source = source.read_bytes()
    before_output = output.read_bytes()

    result = run_cli("--check", "--source", source, "--output", output)
    assert result.returncode == 0, result.stderr
    assert source.read_bytes() == before_source
    assert output.read_bytes() == before_output


def test_cli_check_fails_when_output_is_altered(tmp_path):
    source = tmp_path / "source.json"
    output = tmp_path / "output.json"
    write_source(source, [base_spell()])
    assert run_cli("--source", source, "--write", "--output", output).returncode == 0

    altered = tmp_path / "altered.json"
    altered.write_text(
        output.read_text(encoding="utf-8").replace('"level": 3', '"level": 9'),
        encoding="utf-8",
    )

    before_source = source.read_bytes()
    before_altered = altered.read_bytes()

    result = run_cli("--check", "--source", source, "--output", altered)
    assert result.returncode == 1
    assert "CHECK FAILED" in result.stderr
    assert source.read_bytes() == before_source
    assert altered.read_bytes() == before_altered


def test_migration_is_pure_and_deterministic(tmp_path):
    rows = [base_spell(), legacy_plant_growth(), legacy_flashdaggers()]
    first = migrate_spells.migrate(copy.deepcopy(rows))
    second = migrate_spells.migrate(copy.deepcopy(rows))
    assert first == second
    assert migrate_spells._serialize(first) == migrate_spells._serialize(second)
