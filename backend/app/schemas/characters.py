"""Player and player-spellbook contracts."""

from __future__ import annotations

from typing import Dict, List, Optional

from pydantic import ConfigDict, Field, field_validator

from .common import AbilityName, CreatureSize, NonEmptyString, StrictModel
from .creatures import (
    AbilityScores,
    ArmorClass,
    CreatureType,
    DamageModifier,
    HitPoints,
    MonsterFeatures,
    MovementSpeed,
    Sense,
)
from .equipment import Weapon
from .spells import Spell


class PlayerFields(StrictModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    name: NonEmptyString
    child_name: Optional[str] = None
    class_: Optional[str] = Field(default=None, alias="class")
    subclass: Optional[str] = None
    ancestry: Optional[str] = None
    background: Optional[str] = None
    level: Optional[int] = None
    sizes: List[CreatureSize] = Field(default_factory=list)
    alignment: Optional[str] = None
    creature_type: Optional[CreatureType] = None
    ac: Optional[ArmorClass] = None
    hp: Optional[HitPoints] = None
    speed: List[MovementSpeed] = Field(default_factory=list)
    abilities: Optional[AbilityScores] = None
    saving_throws: Dict[AbilityName, int] = Field(default_factory=dict)
    skills: Dict[str, int] = Field(default_factory=dict)
    passive_perception: Optional[int] = None
    damage_resistances: List[DamageModifier] = Field(default_factory=list)
    damage_immunities: List[DamageModifier] = Field(default_factory=list)
    damage_vulnerabilities: List[DamageModifier] = Field(default_factory=list)
    condition_immunities: List[str] = Field(default_factory=list)
    senses: List[Sense] = Field(default_factory=list)
    languages: List[str] = Field(default_factory=list)
    features: MonsterFeatures = Field(default_factory=MonsterFeatures)
    initiative: Optional[int] = None
    proficiency_bonus: Optional[int] = None
    spell_attack_bonus: Optional[int] = None
    spell_save_dc: Optional[int] = None
    max_spell_slots: Dict[int, int] = Field(default_factory=dict)
    notes: Optional[str] = None

    @field_validator("max_spell_slots", mode="before")
    @classmethod
    def normalize_max_spell_slot_keys(cls, value):
        if not isinstance(value, dict):
            return value
        normalized = {}
        for key, slots in value.items():
            if isinstance(key, str):
                try:
                    key = int(key)
                except ValueError:
                    pass
            normalized[key] = slots
        return normalized


class Player(PlayerFields):
    id: int
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class PlayerDetail(Player):
    spells: List[Spell] = Field(default_factory=list)
    weapons: List[Weapon] = Field(default_factory=list)


class PlayerSpellbookCharacter(StrictModel):
    id: int
    name: str
    spells: List[Spell] = Field(default_factory=list)


class PlayerCreate(PlayerFields):
    pass


class PlayerUpdate(PlayerFields):
    pass
