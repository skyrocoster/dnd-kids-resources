"""Shared schema types used across the API's domain contracts."""

from __future__ import annotations

from typing import Annotated, Literal, Optional, TypeAlias

from pydantic import BaseModel, ConfigDict, StringConstraints


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
    "con",
    "prn",
    "aux",
    "nul",
    *(f"com{number}" for number in range(1, 10)),
    *(f"lpt{number}" for number in range(1, 10)),
}


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
