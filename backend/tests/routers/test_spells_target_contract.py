"""Schema construction tests for the canonical spell contract."""

import pytest

from backend.app.schemas import (
    SpellAreaOfEffect,
    SpellAttack,
    SpellDamage,
    SpellHealing,
    SpellHigherLevels,
    Spell,
    SpellCreate,
    SpellUpdate,
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
    "alternate_description": None,
    "damage": [{"name": "primary", "formula": "1d6", "damage_types": []}],
    "healing": {"amount": None, "temp_hp": False, "max_hp": False},
    "range": "Self",
    "higher_levels": {
        "text": "When you cast this spell using a spell slot of 2nd level or higher...",
        "damage_by_slot": {
            "1": "1d6", "2": "2d6", "3": "3d6", "4": "4d6",
            "5": "5d6", "6": "6d6", "7": "7d6", "8": "8d6", "9": "9d6",
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
    """Nested sub-models construct from plain dicts."""

    def test_damage_model(self):
        d = SpellDamage(name="primary", formula="2d6", damage_types=["fire"])
        assert d.name == "primary"
        assert d.damage_types == ["fire"]

    def test_damage_empty_types(self):
        d = SpellDamage(name="primary", formula="1d6")
        assert d.damage_types == []

    def test_healing_defaults(self):
        h = SpellHealing()
        assert h.amount is None
        assert h.temp_hp is False
        assert h.max_hp is False

    def test_healing_populated(self):
        h = SpellHealing(amount="1d8+4", temp_hp=True, max_hp=False)
        assert h.amount == "1d8+4"

    def test_higher_levels_empty(self):
        hl = SpellHigherLevels()
        assert hl.text is None
        assert hl.damage_by_slot == {}

    def test_higher_levels_with_slot_data(self):
        hl = SpellHigherLevels(text="Do more.", damage_by_slot={"1": "1d6", "2": "2d6"})
        assert hl.damage_by_slot["2"] == "2d6"

    def test_attack_defaults(self):
        a = SpellAttack()
        assert a.kind is None
        assert a.saving_throws == []

    def test_attack_melee_with_save(self):
        a = SpellAttack(kind="melee", saving_throws=["str"])
        assert a.kind == "melee"

    def test_area_of_effect_defaults(self):
        aoe = SpellAreaOfEffect()
        assert aoe.shape is None
        assert aoe.size is None

    def test_area_of_effect_populated(self):
        aoe = SpellAreaOfEffect(shape="cube", size=30)
        assert aoe.shape == "cube"
        assert aoe.size == 30


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
        assert len(spell.damage) == 1
        assert spell.damage[0].formula == "1d6"
        assert spell.healing.amount is None
        assert spell.higher_levels.damage_by_slot["9"] == "9d6"
        assert spell.casting_times == ["1 reaction"]
        assert spell.components == ["S", "M"]
        assert spell.attacks == []

    def test_minimal_create(self):
        minimal = {
            "name": "Min",
            "level": 0,
            "description": "A cantrip.",
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

    def test_create_round_trip(self):
        create = SpellCreate(**_SAMPLE_CREATE)
        as_dict = create.model_dump()
        restored = SpellCreate(**as_dict)
        assert restored == create

    def test_update_inherits_create(self):
        update = SpellUpdate(**_SAMPLE_CREATE)
        assert isinstance(update, SpellCreate)
        assert update.name == "Test Spell"

    def test_strict_forbids_extra_fields(self):
        with pytest.raises(Exception):
            Spell(**_SAMPLE_CANONICAL, bogus_field="nope")


class TestEdgeCaseShapes:
    """Representative edge cases from the 525-row corpus."""

    def test_plant_growth_two_casting_times(self):
        """Plant Growth has casting_times: ['1 action', '8 hours']."""
        spell = Spell(
            id=99, name="Plant Growth", level=3,
            school="transmutation", description="Overgrow.",
            range="150 feet", duration="Instantaneous",
            concentration=False, ritual=False,
            casting_times=["1 action", "8 hours"],
        )
        assert spell.casting_times == ["1 action", "8 hours"]

    def test_empty_collections_from_seed(self):
        """A spell with no damage/healing/attacks still has empty lists, not None."""
        spell = Spell(
            id=1, name="Shield", level=1, school="abjuration",
            description="An invisible barrier.", range="Self",
            duration="1 round", concentration=False, ritual=False,
        )
        assert spell.damage == []
        assert spell.attacks == []
        assert spell.components == []
        assert spell.casting_times == []
        assert spell.healing.amount is None
        assert spell.area_of_effect.shape is None
