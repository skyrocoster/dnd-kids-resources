"""Spell request and response contracts."""

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import Field, field_validator

from ..reference_text import spell_value_reference_registry, validate_reference_text
from .common import StrictModel


class SpellDamage(StrictModel):
    name: str = Field(min_length=1)
    formula: str = Field(min_length=1)
    damage_types: List[str] = Field(default_factory=list)


class SpellHealing(StrictModel):
    amount: Optional[str] = None
    temp_hp: bool = False
    max_hp: bool = False


class SpellHigherLevels(StrictModel):
    text: Optional[str] = None
    damage_by_slot: Dict[str, str] = Field(default_factory=dict)


class SpellAttack(StrictModel):
    kind: Optional[Literal["melee", "ranged"]] = None
    saving_throws: List[str] = Field(default_factory=list)


class SpellAreaOfEffect(StrictModel):
    shape: Optional[str] = None
    size: Optional[int] = None


SPELL_CATEGORY_ORDER = (
    "Damage",
    "Heal",
    "Protect",
    "Control",
    "Move",
    "Detect",
    "Influence",
    "Create",
    "Summon",
    "Other",
)


def normalize_spell_categories(value: Any) -> List[str]:
    if value is None:
        return ["Other"]
    if not isinstance(value, list):
        raise ValueError("categories must be a list")
    if any(not isinstance(category, str) for category in value):
        raise ValueError("categories must contain only strings")
    unknown = [category for category in value if category not in SPELL_CATEGORY_ORDER]
    if unknown:
        raise ValueError("categories contains an unknown value")
    return [category for category in SPELL_CATEGORY_ORDER if category in value] or ["Other"]


class Spell(StrictModel):
    """Response model for the 18-field canonical spell contract."""

    id: int
    name: str
    level: int
    school: Optional[str] = None
    description: str
    quick_rules: Optional[str] = None
    alternate_description: Optional[str] = None
    damage: List[SpellDamage] = Field(default_factory=list)
    healing: SpellHealing = Field(default_factory=SpellHealing)
    range: str
    higher_levels: SpellHigherLevels = Field(default_factory=SpellHigherLevels)
    casting_times: List[str] = Field(default_factory=list)
    duration: str
    concentration: bool
    ritual: bool
    components: List[str] = Field(default_factory=list)
    materials: Optional[str] = None
    attacks: List[SpellAttack] = Field(default_factory=list)
    area_of_effect: SpellAreaOfEffect = Field(default_factory=SpellAreaOfEffect)
    categories: List[str] = Field(default_factory=lambda: ["Other"], validate_default=True)

    @field_validator("categories", mode="before")
    @classmethod
    def validate_categories(cls, value: Any) -> List[str]:
        return normalize_spell_categories(value)


class SpellCreate(StrictModel):
    """Create model for the 18-field canonical spell contract (no id)."""

    name: str
    level: int
    school: Optional[str] = None
    description: str
    quick_rules: str
    alternate_description: Optional[str] = None
    damage: List[SpellDamage] = Field(default_factory=list)
    healing: SpellHealing = Field(default_factory=SpellHealing)
    range: str
    higher_levels: SpellHigherLevels = Field(default_factory=SpellHigherLevels)
    casting_times: List[str] = Field(default_factory=list)
    duration: str
    concentration: bool
    ritual: bool
    components: List[str] = Field(default_factory=list)
    materials: Optional[str] = None
    attacks: List[SpellAttack] = Field(default_factory=list)
    area_of_effect: SpellAreaOfEffect = Field(default_factory=SpellAreaOfEffect)
    categories: List[str] = Field(default_factory=lambda: ["Other"], validate_default=True)

    @field_validator("quick_rules")
    @classmethod
    def validate_quick_rules(cls, value: str) -> str:
        if value.strip() == "":
            raise ValueError("quick_rules must not be blank")

        validation = validate_reference_text(value, spell_value_reference_registry)
        if not validation["valid"]:
            raise ValueError("quick_rules contains invalid reference text")
        return value

    @field_validator("categories", mode="before")
    @classmethod
    def validate_categories(cls, value: Any) -> List[str]:
        return normalize_spell_categories(value)


class SpellUpdate(SpellCreate):
    pass


class SpellPlayerAssignments(StrictModel):
    player_ids: List[int] = Field(default_factory=list)


class PlayerSpellAssignments(StrictModel):
    spell_ids: List[int] = Field(default_factory=list)


class PlayerWeaponAssignments(StrictModel):
    weapon_ids: List[int] = Field(default_factory=list)
