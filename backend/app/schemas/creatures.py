"""Shared creature, monster, and NPC contracts."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import Field, field_validator

from .common import (
    AbilityName,
    AbilityScoreValue,
    AudioFileName,
    AttackKind,
    CreatureSize,
    MovementMode,
    NonEmptyString,
    StrictModel,
    WINDOWS_RESERVED_AUDIO_STEMS,
)


class CreatureType(StrictModel):
    category: NonEmptyString
    tags: List[str] = Field(default_factory=list)
    swarm_size: Optional[CreatureSize] = None


class ArmorClassEntry(StrictModel):
    value: int
    note: Optional[str] = None


class ArmorClass(ArmorClassEntry):
    alternatives: List[ArmorClassEntry] = Field(default_factory=list)


class HitPoints(StrictModel):
    average: int
    formula: Optional[str] = None


class MovementSpeed(StrictModel):
    mode: MovementMode
    feet: int
    note: Optional[str] = None
    hover: bool = False


class AbilityScores(StrictModel):
    str: AbilityScoreValue = None
    dex: AbilityScoreValue = None
    con: AbilityScoreValue = None
    int: AbilityScoreValue = None
    wis: AbilityScoreValue = None
    cha: AbilityScoreValue = None


class DamageModifier(StrictModel):
    damage_type: NonEmptyString
    note: Optional[str] = None
    conditional: bool = False


class Sense(StrictModel):
    type: NonEmptyString
    range: int
    note: Optional[str] = None


class AttackDamage(StrictModel):
    formula: NonEmptyString
    bonus: int = 0
    damage_types: List[str] = Field(default_factory=list)


class Attack(StrictModel):
    kind: AttackKind
    attack_bonus: Optional[int] = None
    automatic_hit: bool = False
    range_ft: Optional[int] = None
    long_range_ft: Optional[int] = None
    targets: Optional[int] = None
    damage: List[AttackDamage] = Field(default_factory=list)


class Feature(StrictModel):
    name: NonEmptyString
    description: Optional[str] = None
    attack: Optional[Attack] = None


class SpellReference(StrictModel):
    name: NonEmptyString
    hidden: bool = False


class SpellGroup(StrictModel):
    label: NonEmptyString
    spells: List[SpellReference] = Field(default_factory=list)
    hidden: bool = False


class SpellcastingBlock(StrictModel):
    name: NonEmptyString
    ability: Optional[AbilityName] = None
    description: Optional[str] = None
    resource: Optional[str] = None
    groups: List[SpellGroup] = Field(default_factory=list)
    footer: Optional[str] = None


class MonsterFeatures(StrictModel):
    traits: List[Feature] = Field(default_factory=list)
    spellcasting: List[SpellcastingBlock] = Field(default_factory=list)
    actions: List[Feature] = Field(default_factory=list)
    bonus_actions: List[Feature] = Field(default_factory=list)
    reactions: List[Feature] = Field(default_factory=list)
    reaction_intro: Optional[str] = None
    legendary_actions: List[Feature] = Field(default_factory=list)
    legendary_intro: Optional[str] = None
    legendary_actions_per_round: Optional[int] = None
    mythic_actions: List[Feature] = Field(default_factory=list)


class MonsterFields(StrictModel):
    name: NonEmptyString
    aliases: List[str] = Field(default_factory=list)
    sizes: List[CreatureSize] = Field(default_factory=list)
    family: Optional[str] = None
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
    audio_path: Optional[AudioFileName] = None
    features: MonsterFeatures = Field(default_factory=MonsterFeatures)
    cr: Optional[str] = None
    cr_note: Optional[str] = None
    experience_points: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    @field_validator("audio_path")
    @classmethod
    def reject_windows_device_name(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and value.removesuffix(".mp3") in WINDOWS_RESERVED_AUDIO_STEMS:
            raise ValueError("audio_path uses a reserved Windows device name")
        return value


class MonsterCreate(MonsterFields):
    pass


class MonsterUpdate(MonsterCreate):
    pass


class Monster(MonsterFields):
    id: int
    cr_sort: Optional[float] = None


class NPCFields(StrictModel):
    name: NonEmptyString
    race: Optional[str] = None
    gender: Optional[str] = None
    background: Optional[str] = None
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
    cr: Optional[str] = None
    cr_note: Optional[str] = None
    experience_points: Optional[int] = None
    appearance: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None


class NPC(NPCFields):
    id: int


class NPCCreate(NPCFields):
    pass


class NPCUpdate(NPCCreate):
    pass
