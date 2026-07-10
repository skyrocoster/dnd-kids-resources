from fastapi import APIRouter, HTTPException
from typing import List
import json

from ..db import get_db, dict_from_row, parse_json_value
from ..schemas import Ability, Condition, DamageType, WeaponProperty, Skill, SpellComponent

router = APIRouter(prefix="/api", tags=["reference"])


@router.get("/abilities", response_model=List[Ability])
def get_abilities():
    """Get all ability scores (Strength, Dexterity, etc.)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name FROM abilities ORDER BY name")
        rows = cursor.fetchall()
        return [dict_from_row(row) for row in rows]


@router.get("/conditions", response_model=List[Condition])
def get_conditions():
    """Get all conditions (Poisoned, Charmed, etc.)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, title as name FROM conditions ORDER BY title")
        rows = cursor.fetchall()
        return [dict_from_row(row) for row in rows]


@router.get("/damage_types", response_model=List[DamageType])
def get_damage_types():
    """Get all damage types (Fire, Cold, Poison, etc.)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name FROM damage_types ORDER BY name")
        rows = cursor.fetchall()
        return [dict_from_row(row) for row in rows]


@router.get("/weapon_properties", response_model=List[WeaponProperty])
def get_weapon_properties():
    """Get all weapon properties (Finesse, Versatile, etc.)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, description FROM weapon_properties ORDER BY name")
        rows = cursor.fetchall()
        return [dict_from_row(row) for row in rows]


@router.get("/skills", response_model=List[Skill])
def get_skills():
    """Get all skills mapped to abilities."""
    # Standard D&D 5e skills
    skills = [
        Skill(name="Acrobatics", ability="Dexterity", description="Balance, tumbling, and athletics"),
        Skill(name="Animal Handling", ability="Wisdom", description="Caring for and controlling animals"),
        Skill(name="Arcana", ability="Intelligence", description="Knowledge of spells and magical creatures"),
        Skill(name="Athletics", ability="Strength", description="Climbing, jumping, and swimming"),
        Skill(name="Deception", ability="Charisma", description="Lying and misdirection"),
        Skill(name="History", ability="Intelligence", description="Knowledge of past events"),
        Skill(name="Insight", ability="Wisdom", description="Understanding and reading others"),
        Skill(name="Intimidation", ability="Charisma", description="Frightening and threatening"),
        Skill(name="Investigation", ability="Intelligence", description="Finding hidden objects and details"),
        Skill(name="Medicine", ability="Wisdom", description="Diagnosis and treatment of injuries"),
        Skill(name="Nature", ability="Intelligence", description="Knowledge of plants, animals, and terrain"),
        Skill(name="Perception", ability="Wisdom", description="Noticing details in your surroundings"),
        Skill(name="Performance", ability="Charisma", description="Entertaining an audience"),
        Skill(name="Persuasion", ability="Charisma", description="Convincing others through reasoning"),
        Skill(name="Religion", ability="Intelligence", description="Knowledge of gods and religious practices"),
        Skill(name="Sleight of Hand", ability="Dexterity", description="Picking pockets and palming objects"),
        Skill(name="Stealth", ability="Dexterity", description="Moving quietly and hiding"),
        Skill(name="Survival", ability="Wisdom", description="Tracking and surviving in the wilderness"),
    ]
    return skills


@router.get("/spell-components", response_model=List[SpellComponent])
def get_spell_components():
    """Get all spell component types (V, S, M)."""
    components = [
        SpellComponent(code="V", name="Verbal", description="A verbal component is a spoken incantation"),
        SpellComponent(code="S", name="Somatic", description="A somatic component is a gesture or motion"),
        SpellComponent(code="M", name="Material", description="A material component is a physical object"),
    ]
    return components
