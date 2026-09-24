"""Schema construction tests for the canonical spell contract."""

import pytest

from backend.app.schemas import (
    PlayerSpellbookCharacter,
    Spell,
    SpellAreaOfEffect,
    SpellAttack,
    SpellCreate,
    SpellDamage,
    SpellHealing,
    SpellHigherLevels,
)

# ---------------------------------------------------------------------------
# Canonical seed sample — mirrors the first record from seed_spells.json
# ---------------------------------------------------------------------------

_SAMPLE_CANONICAL = {
    "id": 2,
    "name": "Absorb Elements",
    "level": 1,
    "school": "abjuration",
    "description": "The spell captures some of the incoming energy.",
    "quick_rules": None,
    "alternate_description": None,
    "damage": [{"name": "primary", "formula": "1d6", "damage_types": []}],
    "healing": {"amount": None, "temp_hp": False, "max_hp": False},
    "range": "Self",
    "higher_levels": {
        "text": "When you cast this spell using a spell slot of 2nd level or higher...",
        "damage_by_slot": {
            "1": "1d6",
            "2": "2d6",
            "3": "3d6",
            "4": "4d6",
            "5": "5d6",
            "6": "6d6",
            "7": "7d6",
            "8": "8d6",
            "9": "9d6",
        },
    },
    "casting_times": ["1 reaction"],
    "duration": "Instantaneous",
    "concentration": False,
    "ritual": False,
    "components": ["S", "M"],
    "materials": "a spiked shield",
    "attacks": [],
    "area_of_effect": {"shape": None, "size": None},
}

_SAMPLE_CREATE = {
    "name": "Test Spell",
    "level": 2,
    "school": "transmutation",
    "description": "A test spell description.",
    "quick_rules": "Deal 1d6 force damage.",
    "alternate_description": None,
    "damage": [],
    "healing": {"amount": None, "temp_hp": False, "max_hp": False},
    "range": "30 feet",
    "higher_levels": {"text": None, "damage_by_slot": {}},
    "casting_times": ["1 action"],
    "duration": "Instantaneous",
    "concentration": False,
    "ritual": False,
    "components": ["V", "S", "M"],
    "materials": None,
    "attacks": [{"kind": None, "saving_throws": ["dex"]}],
    "area_of_effect": {"shape": "sphere", "size": 20},
}


# ---------------------------------------------------------------------------
# Schema construction tests — these PASS today (B0 delivers real models)
# ---------------------------------------------------------------------------


class TestNestedModelConstruction:
    """Nested sub-models construct from plain dicts (defaults + populated per model)."""

    def test_damage_model(self):
        d = SpellDamage(name="primary", formula="2d6", damage_types=["fire"])
        assert d.name == "primary"
        assert d.damage_types == ["fire"]
        assert SpellDamage(name="primary", formula="1d6").damage_types == []

    def test_healing_model(self):
        h = SpellHealing()
        assert h.amount is None
        assert h.temp_hp is False
        assert h.max_hp is False
        assert SpellHealing(amount="1d8+4", temp_hp=True, max_hp=False).amount == "1d8+4"

    def test_higher_levels_model(self):
        hl = SpellHigherLevels()
        assert hl.text is None
        assert hl.damage_by_slot == {}
        assert (
            SpellHigherLevels(
                text="Do more.", damage_by_slot={"1": "1d6", "2": "2d6"}
            ).damage_by_slot["2"]
            == "2d6"
        )

    def test_attack_model(self):
        a = SpellAttack()
        assert a.kind is None
        assert a.saving_throws == []
        assert SpellAttack(kind="melee", saving_throws=["str"]).kind == "melee"

    def test_area_of_effect_model(self):
        aoe = SpellAreaOfEffect()
        assert aoe.shape is None
        assert aoe.size is None
        populated = SpellAreaOfEffect(shape="cube", size=30)
        assert populated.shape == "cube"
        assert populated.size == 30


class TestSpellConstruction:
    """Spell models build from canonical seed dictionaries."""

    def test_from_sample(self):
        spell = Spell(**_SAMPLE_CANONICAL)
        assert spell.id == 2
        assert spell.name == "Absorb Elements"
        assert spell.level == 1
        assert spell.school == "abjuration"
        assert spell.concentration is False
        assert spell.ritual is False
        assert spell.quick_rules is None
        assert len(spell.damage) == 1
        assert spell.damage[0].formula == "1d6"
        assert spell.healing.amount is None
        assert spell.higher_levels.damage_by_slot["9"] == "9d6"
        assert spell.casting_times == ["1 reaction"]
        assert spell.components == ["S", "M"]
        assert spell.attacks == []
        assert spell.categories == ["Other"]

    def test_minimal_create(self):
        minimal = {
            "name": "Min",
            "level": 0,
            "description": "A cantrip.",
            "quick_rules": "A cantrip.",
            "range": "Self",
            "duration": "Instantaneous",
            "concentration": False,
            "ritual": False,
        }
        spell = SpellCreate(**minimal)
        assert spell.level == 0
        assert spell.damage == []
        assert spell.components == []
        assert spell.casting_times == []
        assert spell.area_of_effect.shape is None
        assert spell.categories == ["Other"]

    def test_categories_normalize_dedupe_and_reject(self):
        spell = SpellCreate(
            **{**_SAMPLE_CREATE, "categories": ["Other", "Damage", "Damage", "Heal"]}
        )
        assert spell.categories == ["Damage", "Heal", "Other"]
        assert SpellCreate(**{**_SAMPLE_CREATE, "categories": []}).categories == ["Other"]
        with pytest.raises(Exception):
            SpellCreate(**{**_SAMPLE_CREATE, "categories": ["Damage", 1]})
        with pytest.raises(Exception):
            SpellCreate(**{**_SAMPLE_CREATE, "categories": ["Damage", "Unknown"]})

    def test_spellbook_character_contains_only_assigned_spells(self):
        character = PlayerSpellbookCharacter(
            id=7,
            name="Talia",
            spells=[Spell(**{**_SAMPLE_CANONICAL, "categories": ["Detect"]})],
        )
        assert character.id == 7
        assert character.name == "Talia"
        assert character.spells[0].categories == ["Detect"]
        assert set(character.model_dump()) == {"id", "name", "spells"}
