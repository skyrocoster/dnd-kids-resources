from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator
from typing import Annotated, Literal, Optional, List, Dict, Any, TypeAlias
from datetime import datetime


class Ability(BaseModel):
    id: int
    code: str
    name: str
    description: Optional[str] = None


class Condition(BaseModel):
    id: int
    name: str
    description: Optional[str] = None


class DamageType(BaseModel):
    id: int
    code: str
    name: str
    description: Optional[str] = None


class WeaponProperty(BaseModel):
    id: int
    code: str
    name: str
    description: Optional[str] = None


class Spell(BaseModel):
    id: int
    spell_name: str
    icon: Optional[str] = None
    level: Optional[str] = None
    school: Optional[str] = None
    spell_text: Optional[str] = None
    spell_alt_text: Optional[str] = None
    damage: Optional[List[Dict[str, Any]]] = None
    heal: Optional[Dict[str, Any]] = None
    heal_at_spell_slots: Optional[Dict[str, Any]] = None
    range: Optional[str] = None
    higher_levels: Optional[str] = None
    damage_at_higher_levels: Optional[str] = None
    casting_time: Optional[str] = None
    duration: Optional[str] = None
    concentration: Optional[bool] = None
    ritual: Optional[bool] = None
    components: Optional[List[str]] = None
    materials: Optional[str] = None
    attack_type: Optional[List[Dict[str, Any]]] = None
    area_of_effect: Optional[Dict[str, Any]] = None
    action: Optional[str] = None
    classes: Optional[List[str]] = None
    subclasses: Optional[List[str]] = None


class SpellCreate(BaseModel):
    spell_name: str
    icon: Optional[str] = None
    level: Optional[str] = None
    school: Optional[str] = None
    spell_text: Optional[str] = None
    spell_alt_text: Optional[str] = None
    damage: Optional[List[Dict[str, Any]]] = None
    heal: Optional[Dict[str, Any]] = None
    heal_at_spell_slots: Optional[Dict[str, Any]] = None
    range: Optional[str] = None
    higher_levels: Optional[str] = None
    damage_at_higher_levels: Optional[str] = None
    casting_time: Optional[str] = None
    duration: Optional[str] = None
    concentration: Optional[bool] = None
    ritual: Optional[bool] = None
    components: Optional[List[str]] = None
    materials: Optional[str] = None
    attack_type: Optional[List[Dict[str, Any]]] = None
    area_of_effect: Optional[Dict[str, Any]] = None
    action: Optional[str] = None
    classes: Optional[List[str]] = None
    subclasses: Optional[List[str]] = None


class SpellUpdate(SpellCreate):
    pass


class Skill(BaseModel):
    name: str
    ability: str
    description: Optional[str] = None


class SpellComponent(BaseModel):
    code: str
    name: str
    description: Optional[str] = None


AbilityName: TypeAlias = Literal["str", "dex", "con", "int", "wis", "cha"]
CreatureSize: TypeAlias = Literal["tiny", "small", "medium", "large", "huge", "gargantuan"]
MovementMode: TypeAlias = Literal["walk", "burrow", "climb", "fly", "swim"]
AttackKind: TypeAlias = Literal[
    "melee_weapon",
    "ranged_weapon",
    "melee_spell",
    "ranged_spell",
    "melee_or_ranged_spell",
]
NonEmptyString: TypeAlias = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
AudioFileName: TypeAlias = Annotated[
    str,
    StringConstraints(strip_whitespace=True, pattern=r"^[a-z0-9][a-z0-9_-]*\.mp3$"),
]
AbilityScoreValue: TypeAlias = Optional[int]
WINDOWS_RESERVED_AUDIO_STEMS = {
    "con", "prn", "aux", "nul",
    *(f"com{number}" for number in range(1, 10)),
    *(f"lpt{number}" for number in range(1, 10)),
}


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


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


class Weapon(BaseModel):
    id: int
    name: str
    base_weapon: Optional[str] = None
    rarity: Optional[str] = None
    weapon_category: Optional[str] = None
    weight: Optional[float] = None
    req_attune: Optional[str] = None
    property: Optional[List[str]] = None
    focus: Optional[List[str]] = None
    attack: Optional[List[Dict[str, Any]]] = None
    entries: Optional[List[Any]] = None


class WeaponCreate(BaseModel):
    name: str
    base_weapon: Optional[str] = None
    rarity: Optional[str] = None
    weapon_category: Optional[str] = None
    weight: Optional[float] = None
    req_attune: Optional[str] = None
    property: Optional[List[str]] = None
    focus: Optional[List[str]] = None
    attack: Optional[List[Dict[str, Any]]] = None
    entries: Optional[List[Any]] = None


class WeaponUpdate(WeaponCreate):
    pass


class Item(BaseModel):
    id: int
    name: str
    value_gp: float = 0
    category: Optional[str] = None
    description: Optional[str] = None


class ItemCreate(BaseModel):
    name: str
    value_gp: float = 0
    category: Optional[str] = None
    description: Optional[str] = None


class ItemUpdate(ItemCreate):
    pass


class LootBundle(BaseModel):
    id: int
    name: str
    gold: float = 0
    contents: Optional[List[Dict[str, Any]]] = None


class LootBundleCreate(BaseModel):
    name: str
    gold: float = 0
    contents: Optional[List[Dict[str, Any]]] = None


class LootBundleUpdate(LootBundleCreate):
    pass


class Player(BaseModel):
    id: int
    name: str
    class_: Optional[str] = None
    level: Optional[int] = None


class PlayerCreate(BaseModel):
    name: str
    class_: Optional[str] = None
    level: Optional[int] = None


class PlayerUpdate(PlayerCreate):
    pass


class NPC(BaseModel):
    id: int
    name: str
    race: Optional[str] = None
    gender: Optional[str] = None
    background: Optional[str] = None
    size: Optional[str] = None
    stats: Optional[Dict[str, Any]] = None
    armor_class: Optional[int] = None
    hit_points: Optional[int] = None
    speed: Optional[str] = None
    saving_throws: Optional[Dict[str, Any]] = None
    skills: Optional[Dict[str, Any]] = None
    senses: Optional[List[Dict[str, Any]]] = None
    languages: Optional[str] = None
    appearance: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None


class NPCCreate(BaseModel):
    name: str
    race: Optional[str] = None
    gender: Optional[str] = None
    background: Optional[str] = None
    size: Optional[str] = None
    stats: Optional[Dict[str, Any]] = None
    armor_class: Optional[int] = None
    hit_points: Optional[int] = None
    speed: Optional[str] = None
    saving_throws: Optional[Dict[str, Any]] = None
    skills: Optional[Dict[str, Any]] = None
    senses: Optional[List[Dict[str, Any]]] = None
    languages: Optional[str] = None
    appearance: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None


class NPCUpdate(NPCCreate):
    pass


class Quest(BaseModel):
    id: int
    title: str
    summary: Optional[str] = None
    reward: Optional[List[str]] = None
    objectives: Optional[List[str]] = None
    details: Optional[List[str]] = None
    quest_giver: Optional[int] = None
    dungeon_id: Optional[int] = None
    location: Optional[str] = None


class QuestCreate(BaseModel):
    title: str
    summary: Optional[str] = None
    reward: Optional[List[str]] = None
    objectives: Optional[List[str]] = None
    details: Optional[List[str]] = None
    quest_giver: Optional[int] = None
    dungeon_id: Optional[int] = None
    location: Optional[str] = None


class QuestUpdate(QuestCreate):
    pass


class Encounter(BaseModel):
    id: int
    title: str
    creatures: Optional[List[Dict[str, Any]]] = None
    active_index: Optional[int] = None


class EncounterCreate(BaseModel):
    title: str
    creatures: Optional[List[Dict[str, Any]]] = None
    active_index: Optional[int] = None


class EncounterUpdate(EncounterCreate):
    pass


class Dungeon(BaseModel):
    id: int
    title: str
    data: Dict[str, Any]


class DungeonCreate(BaseModel):
    title: str
    data: Dict[str, Any]


class DungeonUpdate(DungeonCreate):
    pass


class MapLayoutBlob(BaseModel):
    data: Dict[str, Any]
