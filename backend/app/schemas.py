from pydantic import BaseModel
from typing import Optional, List, Dict, Any


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
    damage: Optional[Dict[str, Any]] = None
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
    attack_type: Optional[str] = None
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
    damage: Optional[Dict[str, Any]] = None
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
    attack_type: Optional[str] = None
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
