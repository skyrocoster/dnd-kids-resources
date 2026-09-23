"""Weapon, item, and loot contracts."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, field_validator

from ..reference_text import weapon_value_reference_registry, validate_reference_text
from .common import StrictModel


class WeaponAttackEntry(StrictModel):
    type: Optional[str] = None
    damage: Optional[str] = None
    damage_type: Optional[str] = None
    hands: Optional[int] = None
    attack_mod: Optional[int] = None
    damage_mod: Optional[int] = None
    range: Optional[str] = None
    special: Optional[str] = None


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
    quick_rules: Optional[str] = None
    weapon_attack_bonus: Optional[int] = None
    weapon_damage_bonus: Optional[int] = None


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
    quick_rules: str
    weapon_attack_bonus: Optional[int] = None
    weapon_damage_bonus: Optional[int] = None

    @field_validator("quick_rules")
    @classmethod
    def validate_quick_rules(cls, value: str) -> str:
        if value.strip() == "":
            raise ValueError("quick_rules must not be blank")

        validation = validate_reference_text(value, weapon_value_reference_registry)
        if not validation["valid"]:
            raise ValueError("quick_rules contains invalid reference text")
        return value


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
