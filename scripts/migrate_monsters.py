#!/usr/bin/env python3
"""Transform legacy 5etools monster seed rows to the M1 target shape."""

from __future__ import annotations

import json
import re
from fractions import Fraction
from pathlib import Path
from typing import Any

SEEDS_DIR = Path(__file__).parent.parent / "data" / "seeds"

ABILITY_KEYS = ("str", "dex", "con", "int", "wis", "cha")
MOVEMENT_MODES = ("walk", "burrow", "climb", "fly", "swim")
FEATURE_DEFAULTS = {
    "traits": [],
    "spellcasting": [],
    "actions": [],
    "bonus_actions": [],
    "reactions": [],
    "reaction_intro": None,
    "legendary_actions": [],
    "legendary_intro": None,
    "legendary_actions_per_round": None,
    "mythic_actions": [],
}
TAG_RE = re.compile(r"\{@(?P<tag>[A-Za-z][A-Za-z0-9]*)(?:\s+(?P<payload>[^{}]*))?\}")
AUDIO_RE = re.compile(r"^bestiary/audio/([a-z0-9][a-z0-9_-]*\.mp3)$")
AUDIO_NAME_RE = re.compile(r"^[a-z0-9][a-z0-9_-]*\.mp3$")
WINDOWS_RESERVED_AUDIO_STEMS = {
    "con",
    "prn",
    "aux",
    "nul",
    *(f"com{number}" for number in range(1, 10)),
    *(f"lpt{number}" for number in range(1, 10)),
}


class MigrationError(ValueError):
    """Raised when a source monster cannot be safely migrated."""


class _MonsterContext:
    def __init__(self, monster: dict[str, Any]) -> None:
        self.id = monster.get("id", "<missing id>")
        self.name = monster.get("name", "<missing name>")

    def fail(self, path: str, message: str) -> None:
        raise MigrationError(f"monster {self.id} {self.name!r} at {path}: {message}")


def migrate(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Transform legacy monster rows to the accepted M1 target shape."""
    return [_migrate_monster(row) for row in rows]


def _migrate_monster(monster: dict[str, Any]) -> dict[str, Any]:
    ctx = _MonsterContext(monster)
    cr, cr_sort, cr_note, cr_xp = _migrate_cr(monster.get("cr"), ctx, "cr")
    detail_xp = _migrate_cr_details(monster.get("cr_details", {}), ctx)
    if cr_xp is not None and detail_xp is not None and cr_xp != detail_xp:
        ctx.fail("cr_details.xp", "conflicts with cr.xp")

    features = _migrate_features(monster, ctx)

    return {
        "id": _required(monster, "id", ctx),
        "name": _clean_text(_required(monster, "name", ctx), ctx, "name"),
        "aliases": _dedupe_clean_list(monster.get("alias", []), ctx, "alias"),
        "sizes": _dedupe_clean_list(monster.get("size", []), ctx, "size"),
        "family": _single_optional(monster.get("group", []), ctx, "group"),
        "alignment": _migrate_alignment(monster.get("alignment"), ctx),
        "creature_type": _migrate_creature_type(monster.get("type"), ctx),
        "ac": _migrate_ac(monster.get("ac"), ctx),
        "hp": _migrate_hp(monster.get("hp"), ctx),
        "speed": _migrate_speed(monster.get("speed", {}), ctx),
        "abilities": _migrate_abilities(monster.get("stats"), ctx),
        "saving_throws": _sparse_bonus_map(monster.get("save", {}), ctx, "save"),
        "skills": _migrate_skills(monster.get("skill", {}), ctx)[0],
        "passive_perception": _migrate_skills(monster.get("skill", {}), ctx)[1],
        "damage_resistances": _migrate_resist(monster.get("resist", []), ctx)[0],
        "damage_immunities": _migrate_resist(monster.get("resist", []), ctx)[1],
        "damage_vulnerabilities": _migrate_vulnerable(monster.get("vulnerable", []), ctx),
        "condition_immunities": _migrate_resist(monster.get("resist", []), ctx)[2],
        "senses": _migrate_senses(monster.get("senses", []), ctx),
        "languages": _dedupe_clean_list(_language_values(monster.get("languages", [])), ctx, "languages"),
        "audio_path": _migrate_audio(monster.get("soundClip", {}), ctx),
        "features": features,
        "cr": cr,
        "cr_sort": cr_sort,
        "cr_note": cr_note,
        "experience_points": cr_xp if cr_xp is not None else detail_xp,
    }


def _required(monster: dict[str, Any], key: str, ctx: _MonsterContext) -> Any:
    if key not in monster:
        ctx.fail(key, "required field is missing")
    return monster[key]


def _clean_text(value: Any, ctx: _MonsterContext, path: str) -> str:
    if not isinstance(value, str):
        ctx.fail(path, f"expected string, got {type(value).__name__}")

    def replace(match: re.Match[str]) -> str:
        tag = match.group("tag")
        payload = match.group("payload") or ""
        parts = payload.split("|") if payload else []
        return _replace_tag(tag, parts, ctx, path)

    result = TAG_RE.sub(replace, value.replace("\xa0", " "))
    if "{@" in result:
        ctx.fail(path, "contains residual or malformed markup")
    result = re.sub(r"\bDC(?=\d)", "DC ", result)
    result = re.sub(r" {2,}", " ", result).strip()
    return result


def _replace_tag(tag: str, parts: list[str], ctx: _MonsterContext, path: str) -> str:
    reference_tags = {"action", "creature", "disease", "hazard", "item", "sense", "skill", "status", "table"}
    if tag in reference_tags:
        _arity(tag, parts, {1, 2, 3}, ctx, path)
        return parts[2] if len(parts) == 3 and parts[2] else parts[0]
    if tag in {"adventure", "book"}:
        _arity(tag, parts, {4}, ctx, path)
        return parts[0]
    if tag == "filter":
        _arity(tag, parts, {3, 4}, ctx, path)
        return parts[0]
    if tag == "quickref":
        _arity(tag, parts, {3, 5}, ctx, path)
        return parts[4] if len(parts) == 5 and parts[4] else parts[0]
    if tag == "chance":
        _arity(tag, parts, {1, 3}, ctx, path)
        return parts[1] if len(parts) >= 2 and parts[1] else f"{parts[0]} percent"
    if tag in {"dice", "damage", "i", "note"}:
        _arity(tag, parts, {1}, ctx, path)
        return parts[0]
    if tag == "hit":
        _arity(tag, parts, {1}, ctx, path)
        return parts[0] if parts[0].startswith("-") else f"+{parts[0]}"
    if tag == "recharge":
        _arity(tag, parts, {0, 1}, ctx, path)
        return "(Recharge 6)" if not parts else f"(Recharge {parts[0]}-6)"
    if tag == "atk":
        _arity(tag, parts, {1}, ctx, path)
        labels = {
            "mw": "Melee Weapon Attack:",
            "rw": "Ranged Weapon Attack:",
            "ms": "Melee Spell Attack:",
            "rs": "Ranged Spell Attack:",
            "mw,rw": "Melee or Ranged Weapon Attack:",
        }
        if parts[0] not in labels:
            ctx.fail(path, f"unknown atk payload {parts[0]!r}")
        return labels[parts[0]]
    if tag == "skillCheck":
        _arity(tag, parts, {1}, ctx, path)
        number = parts[0].split()[-1]
        return number if number.startswith("-") else f"+{number}"
    if tag == "h":
        _arity(tag, parts, {0}, ctx, path)
        return "Hit: "
    if tag == "hom":
        _arity(tag, parts, {0}, ctx, path)
        return "Hit or Miss: "
    ctx.fail(path, f"unknown markup tag {tag!r}")


def _arity(tag: str, parts: list[str], expected: set[int], ctx: _MonsterContext, path: str) -> None:
    if len(parts) not in expected:
        ctx.fail(path, f"unexpected {tag} tag arity {len(parts)}")


def _dedupe_clean_list(values: Any, ctx: _MonsterContext, path: str) -> list[str]:
    if values is None:
        return []
    if not isinstance(values, list):
        ctx.fail(path, "expected list")
    result: list[str] = []
    for index, value in enumerate(values):
        cleaned = _clean_text(value, ctx, f"{path}[{index}]")
        if cleaned and cleaned not in result:
            result.append(cleaned)
    return result


def _single_optional(values: Any, ctx: _MonsterContext, path: str) -> str | None:
    cleaned = _dedupe_clean_list(values, ctx, path)
    if len(cleaned) > 1:
        ctx.fail(path, "expected zero or one value")
    return cleaned[0] if cleaned else None


def _migrate_alignment(value: Any, ctx: _MonsterContext) -> str | None:
    if not value:
        return None
    if not isinstance(value, list):
        ctx.fail("alignment", "expected list")
    if len(value) == 1 and isinstance(value[0], str):
        return _alignment_code(value[0])
    if all(isinstance(item, str) for item in value):
        codes = tuple(value)
        wildcard = {
            ("L", "NX", "C", "E"): "any evil alignment",
            ("L", "NX", "C", "NY", "E"): "any non-good alignment",
            ("NX", "C", "G", "NY", "E"): "any non-lawful alignment",
            ("C", "G", "NY", "E"): "any chaotic alignment",
        }
        if codes in wildcard:
            return wildcard[codes]
        return " ".join(_alignment_code(item) for item in value)
    if all(isinstance(item, dict) and "alignment" in item and "chance" in item for item in value):
        choices = []
        for index, item in enumerate(value):
            choices.append(f"{item['chance']}% {_migrate_alignment(item['alignment'], ctx)}")
        return " or ".join(choices)
    if len(value) == 1 and isinstance(value[0], dict) and "special" in value[0]:
        return _clean_text(value[0]["special"], ctx, "alignment[0].special")
    ctx.fail("alignment", "unsupported alignment shape")


def _alignment_code(code: str) -> str:
    return {
        "L": "lawful",
        "N": "neutral",
        "NX": "neutral",
        "C": "chaotic",
        "G": "good",
        "E": "evil",
        "NY": "neutral",
        "U": "unaligned",
        "A": "any alignment",
    }.get(code, code.lower())


def _migrate_creature_type(value: Any, ctx: _MonsterContext) -> dict[str, Any] | None:
    if value is None:
        return None
    if isinstance(value, str):
        return {"category": _clean_text(value, ctx, "type"), "tags": [], "swarm_size": None}
    if not isinstance(value, dict):
        ctx.fail("type", "expected string or object")
    raw_type = value.get("type")
    if isinstance(raw_type, dict) and "choose" in raw_type:
        category = " or ".join(raw_type["choose"])
    elif isinstance(raw_type, str):
        category = _clean_text(raw_type, ctx, "type.type")
    else:
        ctx.fail("type.type", "expected string or choose object")
    tags = []
    for index, tag in enumerate(value.get("tags", [])):
        if isinstance(tag, str):
            tags.append(_clean_text(tag, ctx, f"type.tags[{index}]"))
        elif isinstance(tag, dict) and tag.get("tag") == "drow":
            tags.append("elf")
        elif isinstance(tag, dict) and "tag" in tag:
            tags.append(_clean_text(tag["tag"], ctx, f"type.tags[{index}].tag"))
        else:
            ctx.fail(f"type.tags[{index}]", "unsupported tag shape")
    if "sidekickType" in value:
        tags.append(f"{_clean_text(value['sidekickType'], ctx, 'type.sidekickType')} sidekick")
    swarm_size = None
    if value.get("swarmSize") is not None:
        swarm_size = {"T": "tiny", "S": "small", "M": "medium"}.get(value["swarmSize"])
        if swarm_size is None:
            ctx.fail("type.swarmSize", "unsupported swarm size")
    return {"category": category, "tags": _unique(tags), "swarm_size": swarm_size}


def _migrate_ac(value: Any, ctx: _MonsterContext) -> dict[str, Any] | None:
    if value in (None, {}):
        return None
    if not isinstance(value, dict):
        ctx.fail("ac", "expected object")
    entries = []
    for raw_value, note in value.items():
        try:
            ac_value = int(raw_value)
        except (TypeError, ValueError):
            ctx.fail(f"ac.{raw_value}", "AC key is not an integer")
        entries.append({"value": ac_value, "note": _optional_text(note, ctx, f"ac.{raw_value}")})
    primary_index = 0
    null_note_indexes = [index for index, entry in enumerate(entries) if entry["note"] is None]
    if len(null_note_indexes) == 1:
        primary_index = null_note_indexes[0]
    else:
        for index, entry in enumerate(entries):
            note = (entry["note"] or "").lower()
            if "natural armor" in note or "natural armour" in note:
                primary_index = index
                break
    primary = dict(entries[primary_index])
    primary["alternatives"] = [entry for index, entry in enumerate(entries) if index != primary_index]
    return primary


def _migrate_hp(value: Any, ctx: _MonsterContext) -> dict[str, Any] | None:
    if value is None:
        return None
    if not isinstance(value, dict):
        ctx.fail("hp", "expected object")
    return {"average": value.get("average"), "formula": _optional_text(value.get("formula"), ctx, "hp.formula")}


def _migrate_speed(value: Any, ctx: _MonsterContext) -> list[dict[str, Any]]:
    if not value:
        return []
    if not isinstance(value, dict):
        ctx.fail("speed", "expected object")
    result = []
    hover = bool(value.get("canHover"))
    for mode in MOVEMENT_MODES:
        if mode in value:
            result.append(_speed_entry(mode, value[mode], hover if mode == "fly" else False, ctx, f"speed.{mode}"))
    alternate = value.get("alternate", {})
    if alternate:
        if not isinstance(alternate, dict):
            ctx.fail("speed.alternate", "expected object")
        for mode in MOVEMENT_MODES:
            for index, item in enumerate(alternate.get(mode, [])):
                result.append(_speed_entry(mode, item, hover if mode == "fly" else False, ctx, f"speed.alternate.{mode}[{index}]"))
    return result


def _speed_entry(mode: str, value: Any, hover: bool, ctx: _MonsterContext, path: str) -> dict[str, Any]:
    if isinstance(value, int):
        return {"mode": mode, "feet": value, "note": None, "hover": hover}
    if isinstance(value, dict) and "number" in value:
        return {
            "mode": mode,
            "feet": value["number"],
            "note": _optional_text(value.get("condition"), ctx, f"{path}.condition"),
            "hover": hover,
        }
    ctx.fail(path, "expected integer or {number, condition}")


def _migrate_abilities(value: Any, ctx: _MonsterContext) -> dict[str, int | None] | None:
    if value is None:
        return None
    if not isinstance(value, dict):
        ctx.fail("stats", "expected object")
    return {key: value.get(key) for key in ABILITY_KEYS}


def _sparse_bonus_map(value: Any, ctx: _MonsterContext, path: str) -> dict[str, int]:
    if not value:
        return {}
    if not isinstance(value, dict):
        ctx.fail(path, "expected object")
    return {key.replace(" ", "_"): bonus for key, bonus in value.items() if bonus is not None}


def _migrate_skills(value: Any, ctx: _MonsterContext) -> tuple[dict[str, int], int | None]:
    skills = _sparse_bonus_map(value, ctx, "skill")
    passive = skills.pop("passive_perception", None)
    return skills, passive


def _migrate_resist(value: Any, ctx: _MonsterContext) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[str]]:
    if not value:
        return [], [], []
    if not isinstance(value, list):
        ctx.fail("resist", "expected list")
    resistances: list[dict[str, Any]] = []
    immunities: list[dict[str, Any]] = []
    condition_immunities: list[str] = []
    for index, item in enumerate(value):
        if not isinstance(item, dict):
            ctx.fail(f"resist[{index}]", "expected object")
        kind = item.get("type")
        if kind == "conditionImmune":
            condition_immunities.append(_clean_text(item.get("immune_type"), ctx, f"resist[{index}].immune_type"))
            continue
        target = resistances if kind == "resist" else immunities if kind == "damageImmune" else None
        if target is None:
            ctx.fail(f"resist[{index}].type", "unsupported defense type")
        target.append(_damage_modifier(item, ctx, f"resist[{index}]", "condition"))
    return resistances, immunities, condition_immunities


def _migrate_vulnerable(value: Any, ctx: _MonsterContext) -> list[dict[str, Any]]:
    if not value:
        return []
    if not isinstance(value, list):
        ctx.fail("vulnerable", "expected list")
    result = []
    for index, item in enumerate(value):
        if isinstance(item, str):
            result.append({"damage_type": _clean_text(item, ctx, f"vulnerable[{index}]"), "note": None, "conditional": False})
        elif isinstance(item, dict) and isinstance(item.get("vulnerable"), list):
            for nested_index, damage_type in enumerate(item["vulnerable"]):
                result.append(
                    {
                        "damage_type": _clean_text(damage_type, ctx, f"vulnerable[{index}].vulnerable[{nested_index}]"),
                        "note": _optional_text(item.get("note"), ctx, f"vulnerable[{index}].note"),
                        "conditional": bool(item.get("cond")),
                    }
                )
        elif isinstance(item, dict):
            result.append(_damage_modifier(item, ctx, f"vulnerable[{index}]", "cond"))
        else:
            ctx.fail(f"vulnerable[{index}]", "unsupported vulnerability shape")
    return result


def _damage_modifier(item: dict[str, Any], ctx: _MonsterContext, path: str, condition_key: str) -> dict[str, Any]:
    return {
        "damage_type": _clean_text(item.get("damage_type", "special"), ctx, f"{path}.damage_type"),
        "note": _optional_text(item.get("note"), ctx, f"{path}.note"),
        "conditional": bool(item.get(condition_key)),
    }


def _migrate_senses(value: Any, ctx: _MonsterContext) -> list[dict[str, Any]]:
    if not value:
        return []
    if not isinstance(value, list):
        ctx.fail("senses", "expected list")
    result = []
    for index, item in enumerate(value):
        if not isinstance(item, dict):
            ctx.fail(f"senses[{index}]", "expected object")
        result.append(
            {
                "type": _clean_text(item.get("type"), ctx, f"senses[{index}].type"),
                "range": item.get("range"),
                "note": _optional_text(item.get("note"), ctx, f"senses[{index}].note"),
            }
        )
    return result


def _language_values(value: Any) -> list[str]:
    if isinstance(value, list):
        return [item for item in value if item not in {"—", "-"}]
    return value


def _migrate_audio(value: Any, ctx: _MonsterContext) -> str | None:
    if not value:
        return None
    if not isinstance(value, dict):
        ctx.fail("soundClip", "expected object")
    path = value.get("path")
    if not path:
        return None
    if not isinstance(path, str):
        ctx.fail("soundClip.path", "expected string")
    match = AUDIO_RE.match(path)
    if not match:
        ctx.fail("soundClip.path", "unsafe audio path")
    filename = match.group(1)
    if not AUDIO_NAME_RE.match(filename) or filename.removesuffix(".mp3") in WINDOWS_RESERVED_AUDIO_STEMS:
        ctx.fail("soundClip.path", "unsafe audio filename")
    return filename


def _migrate_features(monster: dict[str, Any], ctx: _MonsterContext) -> dict[str, Any]:
    features = {key: (value.copy() if isinstance(value, list) else value) for key, value in FEATURE_DEFAULTS.items()}
    features["traits"] = _migrate_feature_list(monster.get("traits", []), ctx, "traits")
    features["actions"] = _migrate_feature_list(monster.get("action", []), ctx, "action")
    features["bonus_actions"] = _migrate_feature_list(monster.get("bonus", []), ctx, "bonus")
    features["reactions"] = _migrate_feature_list(monster.get("reaction", []), ctx, "reaction")
    features["reaction_intro"] = _join_text(monster.get("reactionRules", []), ctx, "reactionRules")
    features["spellcasting"] = _migrate_spellcasting(monster.get("spellcasting", []), ctx)
    legendary, per_round = _migrate_legendary(monster.get("legendary", []), ctx)
    features["legendary_actions"] = legendary
    features["legendary_actions_per_round"] = per_round
    features["legendary_intro"] = _join_text(monster.get("legendaryHeader"), ctx, "legendaryHeader")
    features["mythic_actions"] = _migrate_feature_list(monster.get("mythic", []), ctx, "mythic")
    return features


def _migrate_legendary(value: Any, ctx: _MonsterContext) -> tuple[list[dict[str, Any]], int | None]:
    if not value:
        return [], None
    if isinstance(value, dict):
        raw_actions = value.get("actions", []) or value.get("entries", [])
        per_round = value.get("actionsPerRound", value.get("actions_per_round", 3 if raw_actions else None))
        return _migrate_feature_list(raw_actions, ctx, "legendary.actions"), per_round
    actions = _migrate_feature_list(value, ctx, "legendary")
    return actions, 3 if actions else None


def _migrate_feature_list(value: Any, ctx: _MonsterContext, path: str) -> list[dict[str, Any]]:
    if not value:
        return []
    if not isinstance(value, list):
        ctx.fail(path, "expected list")
    result = []
    for index, item in enumerate(value):
        if not isinstance(item, dict):
            ctx.fail(f"{path}[{index}]", "expected object")
        result.append(
            {
                "name": _clean_text(item.get("name"), ctx, f"{path}[{index}].name"),
                "description": _entry_text(item, ctx, f"{path}[{index}]"),
                "attack": _migrate_attack(item.get("attack"), ctx, f"{path}[{index}].attack"),
            }
        )
    return result


def _entry_text(item: dict[str, Any], ctx: _MonsterContext, path: str) -> str | None:
    if "notes" in item:
        return _join_text(item["notes"], ctx, f"{path}.notes")
    if "entries" in item:
        return _join_text(item["entries"], ctx, f"{path}.entries")
    return None


def _join_text(value: Any, ctx: _MonsterContext, path: str) -> str | None:
    if not value:
        return None
    if isinstance(value, str):
        return _clean_text(value, ctx, path) or None
    if not isinstance(value, list):
        ctx.fail(path, "expected string or list")
    parts = [_node_text(item, ctx, f"{path}[{index}]") for index, item in enumerate(value)]
    parts = [part for part in parts if part]
    return "\n\n".join(parts) if parts else None


def _node_text(value: Any, ctx: _MonsterContext, path: str) -> str:
    if isinstance(value, str):
        return _clean_text(value, ctx, path)
    if isinstance(value, list):
        return "\n\n".join(_node_text(item, ctx, f"{path}[]") for item in value)
    if isinstance(value, dict) and value.get("type") == "list":
        lines = []
        for index, item in enumerate(value.get("items", [])):
            if isinstance(item, str):
                lines.append(f"- {_clean_text(item, ctx, f'{path}.items[{index}]')}")
            elif isinstance(item, dict):
                name = _optional_text(item.get("name"), ctx, f"{path}.items[{index}].name")
                entry_value = item.get("entry", item.get("entries", []))
                entry = _node_text(entry_value, ctx, f"{path}.items[{index}].entry") if entry_value else ""
                if name:
                    suffix = "" if name.endswith(":") else ":"
                    lines.append(f"- {name}{suffix} {entry}".rstrip())
                else:
                    lines.append(f"- {entry}".rstrip())
            else:
                ctx.fail(f"{path}.items[{index}]", "unsupported list item")
        return "\n".join(lines)
    if isinstance(value, dict) and "entries" in value:
        name = _optional_text(value.get("name"), ctx, f"{path}.name")
        entries = _join_text(value.get("entries", []), ctx, f"{path}.entries") or ""
        return f"{name}: {entries}" if name else entries
    ctx.fail(path, "unsupported prose node")


def _migrate_attack(value: Any, ctx: _MonsterContext, path: str) -> dict[str, Any] | None:
    if not value:
        return None
    if not isinstance(value, dict):
        ctx.fail(path, "expected object")
    kinds = {
        "melee": "melee_weapon",
        "ranged": "ranged_weapon",
        "melee spell": "melee_spell",
        "ranged spell": "ranged_spell",
        "melee spell or ranged spell": "melee_or_ranged_spell",
    }
    if value.get("type") not in kinds:
        ctx.fail(f"{path}.type", "unsupported attack type")
    automatic = value.get("mod") == "auto"
    return {
        "kind": kinds[value["type"]],
        "attack_bonus": None if automatic else value.get("mod"),
        "automatic_hit": automatic,
        "range_ft": value.get("range"),
        "long_range_ft": value.get("max_range"),
        "targets": value.get("targets"),
        "damage": _migrate_attack_damage(value, ctx, path),
    }


def _migrate_attack_damage(value: dict[str, Any], ctx: _MonsterContext, path: str) -> list[dict[str, Any]]:
    result = []
    if value.get("damage") is not None:
        result.append(
            {
                "formula": _clean_text(value["damage"], ctx, f"{path}.damage"),
                "bonus": value.get("damage_mod", 0),
                "damage_types": _damage_types(value, "damage_type", "damage_choice", ctx, path),
            }
        )
    if value.get("secondary_damage") is not None:
        result.append(
            {
                "formula": _clean_text(value["secondary_damage"], ctx, f"{path}.secondary_damage"),
                "bonus": 0,
                "damage_types": _damage_types(value, "secondary_damage_type", "secondary_damage_choice", ctx, path),
            }
        )
    return result


def _damage_types(value: dict[str, Any], type_key: str, choice_key: str, ctx: _MonsterContext, path: str) -> list[str]:
    if value.get(choice_key):
        return [_clean_text(item, ctx, f"{path}.{choice_key}[]") for item in value[choice_key]]
    damage_type = value.get(type_key)
    return [] if damage_type is None else [_clean_text(damage_type, ctx, f"{path}.{type_key}")]


def _migrate_spellcasting(value: Any, ctx: _MonsterContext) -> list[dict[str, Any]]:
    if not value:
        return []
    if not isinstance(value, list):
        ctx.fail("spellcasting", "expected list")
    return [_migrate_spellcasting_block(block, ctx, f"spellcasting[{index}]") for index, block in enumerate(value)]


def _migrate_spellcasting_block(block: Any, ctx: _MonsterContext, path: str) -> dict[str, Any]:
    if not isinstance(block, dict):
        ctx.fail(path, "expected object")
    return {
        "name": _clean_text(block.get("name"), ctx, f"{path}.name"),
        "ability": block.get("ability"),
        "description": _join_text(block.get("headerEntries", []), ctx, f"{path}.headerEntries"),
        "resource": _spell_resource(block, ctx, path),
        "groups": _spell_groups(block, ctx, path),
        "footer": _join_text(block.get("footerEntries", []), ctx, f"{path}.footerEntries"),
    }


def _spell_resource(block: dict[str, Any], ctx: _MonsterContext, path: str) -> str | None:
    item = block.get("chargesItem")
    if not item:
        return None
    return _clean_text(str(item).split("|")[0], ctx, f"{path}.chargesItem")


def _spell_groups(block: dict[str, Any], ctx: _MonsterContext, path: str) -> list[dict[str, Any]]:
    groups: list[dict[str, Any]] = []
    hidden_buckets = set(block.get("hidden", []) or [])
    if "will" in block:
        groups.append(_spell_group("At will", block["will"], "will" in hidden_buckets, ctx, f"{path}.will"))
    for key, spells in (block.get("daily") or {}).items():
        groups.append(_spell_group(_daily_label(key), spells, "daily" in hidden_buckets, ctx, f"{path}.daily.{key}"))
    for level_text, spell_data in sorted((block.get("spells") or {}).items(), key=lambda item: int(item[0])):
        groups.append(_spell_level_group(level_text, spell_data, "spells" in hidden_buckets, ctx, f"{path}.spells.{level_text}"))
    for bucket_name, prefix in (("recharge", "Recharge"), ("rest", None), ("charges", None)):
        for key, spells in (block.get(bucket_name) or {}).items():
            label = _resource_label(bucket_name, key, prefix)
            groups.append(_spell_group(label, spells, bucket_name in hidden_buckets, ctx, f"{path}.{bucket_name}.{key}"))
    if "ritual" in block:
        groups.append(_spell_group("Rituals", block["ritual"], "ritual" in hidden_buckets, ctx, f"{path}.ritual"))
    return groups


def _spell_group(label: str, spells: Any, hidden: bool, ctx: _MonsterContext, path: str) -> dict[str, Any]:
    if not isinstance(spells, list):
        ctx.fail(path, "expected spell list")
    return {
        "label": label,
        "spells": [_spell_reference(spell, ctx, f"{path}[{index}]") for index, spell in enumerate(spells)],
        "hidden": hidden,
    }


def _spell_level_group(level_text: str, data: Any, hidden: bool, ctx: _MonsterContext, path: str) -> dict[str, Any]:
    if not isinstance(data, dict):
        ctx.fail(path, "expected spell level object")
    level = int(level_text)
    if level == 0:
        label = "Cantrips (at will)"
    elif data.get("lower") is not None:
        slots = data.get("slots")
        label = f"{_ordinal(data['lower'])}-{_ordinal(level)} level ({slots} {_ordinal(level)}-level {_plural('slot', slots)})"
    else:
        slots = data.get("slots")
        label = f"{_ordinal(level)} level"
        if slots is not None:
            label += f" ({slots} {_plural('slot', slots)})"
    return _spell_group(label, data.get("spells", []), hidden, ctx, f"{path}.spells")


def _spell_reference(value: Any, ctx: _MonsterContext, path: str) -> dict[str, Any]:
    if isinstance(value, str):
        return {"name": _clean_text(value, ctx, path), "hidden": False}
    if isinstance(value, dict) and "entry" in value:
        return {"name": _clean_text(value["entry"], ctx, f"{path}.entry"), "hidden": bool(value.get("hidden"))}
    ctx.fail(path, "unsupported spell reference")


def _daily_label(key: str) -> str:
    each = key.endswith("e")
    count = key.removesuffix("e")
    return f"{count}/day{' each' if each else ''}"


def _resource_label(bucket: str, key: str, prefix: str | None) -> str:
    each = key.endswith("e")
    count = key.removesuffix("e")
    if prefix:
        return f"{prefix} {count}"
    noun = "charge" if bucket == "charges" else "rest"
    return f"{count} {_plural(noun, int(count))}{' each' if each else ''}" if bucket == "charges" else f"{count}/rest"


def _ordinal(number: int) -> str:
    if 10 <= number % 100 <= 20:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(number % 10, "th")
    return f"{number}{suffix}"


def _plural(noun: str, count: int) -> str:
    return noun if count == 1 else f"{noun}s"


def _migrate_cr(value: Any, ctx: _MonsterContext, path: str) -> tuple[str | None, float | None, str | None, int | None]:
    if value is None:
        return None, None, None, None
    note = None
    xp = None
    if isinstance(value, dict):
        base = value.get("cr")
        if value.get("lair") is not None:
            note = f"{value['lair']} in lair"
        if value.get("coven") is not None:
            note = f"{value['coven']} in coven"
        xp = value.get("xp")
    else:
        base = value
    cr = str(base).strip() if base is not None else None
    return cr, _cr_sort(cr, ctx, path), note, xp


def _cr_sort(value: str | None, ctx: _MonsterContext, path: str) -> float | None:
    if value is None or value == "Unknown":
        return None
    try:
        if "/" in value:
            fraction = Fraction(value)
            if fraction.denominator == 0:
                ctx.fail(path, "invalid CR denominator")
            return float(fraction)
        return float(value)
    except (ValueError, ZeroDivisionError):
        if "/" in value:
            ctx.fail(path, "invalid CR fraction")
        return None


def _migrate_cr_details(value: Any, ctx: _MonsterContext) -> int | None:
    if not value:
        return None
    if not isinstance(value, dict):
        ctx.fail("cr_details", "expected object")
    return value.get("xp")


def _optional_text(value: Any, ctx: _MonsterContext, path: str) -> str | None:
    if value is None:
        return None
    text = _clean_text(value, ctx, path)
    return text or None


def _unique(values: list[str]) -> list[str]:
    result = []
    for value in values:
        if value not in result:
            result.append(value)
    return result


if __name__ == "__main__":
    seed_path = SEEDS_DIR / "seed_monsters.json"
    monsters = json.loads(seed_path.read_text(encoding="utf-8"))
    result = migrate(monsters)
    seed_path.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Migrated {len(result)} monsters.")
