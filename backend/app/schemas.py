from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class Ability(BaseModel):
    id: int
    name: str
    description: Optional[str] = None


class Condition(BaseModel):
    id: int
    name: str
    description: Optional[str] = None


class DamageType(BaseModel):
    id: int
    name: str
    description: Optional[str] = None


class WeaponProperty(BaseModel):
    id: int
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


class Monster(BaseModel):
    id: int
    name: str
    ac: Optional[Dict[str, Any]] = None
    hp: Optional[Dict[str, Any]] = None
    speed: Optional[Dict[str, Any]] = None
    stats: Optional[Dict[str, Any]] = None
    senses: Optional[List[Dict[str, Any]]] = None
    languages: Optional[List[str]] = None
    cr: Optional[str] = None
    action: Optional[List[Dict[str, Any]]] = None


class MonsterCreate(BaseModel):
    name: str
    ac: Optional[Dict[str, Any]] = None
    hp: Optional[Dict[str, Any]] = None
    speed: Optional[Dict[str, Any]] = None
    stats: Optional[Dict[str, Any]] = None
    senses: Optional[str] = None
    languages: Optional[str] = None
    challenge: Optional[str] = None
    action: Optional[List[Dict[str, Any]]] = None


class MonsterUpdate(MonsterCreate):
    pass


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
    role: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None


class NPCCreate(BaseModel):
    name: str
    role: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None


class NPCUpdate(NPCCreate):
    pass


class Quest(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    status: Optional[str] = None
    reward: Optional[str] = None
    notes: Optional[str] = None


class QuestCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = None
    reward: Optional[str] = None
    notes: Optional[str] = None


class QuestUpdate(QuestCreate):
    pass


class Encounter(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    difficulty: Optional[str] = None
    creatures: Optional[List[str]] = None
    notes: Optional[str] = None


class EncounterCreate(BaseModel):
    title: str
    description: Optional[str] = None
    difficulty: Optional[str] = None
    creatures: Optional[List[str]] = None
    notes: Optional[str] = None


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
