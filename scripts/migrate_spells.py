#!/usr/bin/env python3
"""Transform legacy spell seed rows to the canonical target shape."""

from __future__ import annotations

import argparse
import ast
import json
import sys
from pathlib import Path
from typing import Any, NoReturn

SEEDS_DIR = Path(__file__).parent.parent / "data" / "seeds"
DEFAULT_SOURCE = SEEDS_DIR / "seed_spells.json"

SOURCE_FIELDS = {
    "id",
    "spell_name",
    "icon",
    "level",
    "school",
    "spell_text",
    "spell_alt_text",
    "damage",
    "heal",
    "heal_at_spell_slots",
    "range",
    "higher_levels",
    "damage_at_higher_levels",
    "casting_time",
    "duration",
    "concentration",
    "ritual",
    "components",
    "materials",
    "attack_type",
    "action",
    "area_of_effect",
    "classes",
    "subclasses",
}
SAVING_THROWS = {"str", "dex", "con", "int", "wis", "cha"}


class MigrationError(ValueError):
    """Raised when a source spell cannot be safely migrated."""


class _SpellContext:
    def __init__(self, spell: dict[str, Any]) -> None:
        self.id = spell.get("id", "<missing id>")
        self.spell_name = spell.get("spell_name", "<missing spell_name>")

    def fail(self, path: str, message: str) -> NoReturn:
        raise MigrationError(
            f"spell {self.id} {self.spell_name!r} at {path}: {message}"
        )

    def is_spell(self, spell_id: int, name: str) -> bool:
        return self.id == spell_id and self.spell_name == name


def migrate(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Purely transform legacy spell rows to the accepted target shape."""
    if not isinstance(rows, list):
        raise MigrationError("source root: expected a JSON array")

    result: list[dict[str, Any]] = []
    ids: set[int] = set()
    names: set[str] = set()
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            raise MigrationError(
                f"source row {index}: expected object, got {type(row).__name__}"
            )
        migrated = _migrate_spell(row)
        if migrated["id"] in ids:
            raise MigrationError(
                f"spell {migrated['id']} {migrated['name']!r} at id: duplicate id"
            )
        if migrated["name"] in names:
            raise MigrationError(
                f"spell {migrated['id']} {migrated['name']!r} at spell_name: duplicate name"
            )
        ids.add(migrated["id"])
        names.add(migrated["name"])
        result.append(migrated)
    return result


def _migrate_spell(spell: dict[str, Any]) -> dict[str, Any]:
    ctx = _SpellContext(spell)
    _validate_source_shape(spell, ctx)

    spell_id = _positive_int(spell["id"], ctx, "id")
    name = _required_text(spell["spell_name"], ctx, "spell_name")
    level = _level(spell["level"], ctx)
    school = _optional_text(spell["school"], ctx, "school")
    if school is not None:
        school = school.strip().lower()
        if not school:
            ctx.fail("school", "expected a non-empty string or null")

    _validate_dropped_fields(spell, ctx)

    return {
        "id": spell_id,
        "name": name,
        "level": level,
        "school": school,
        "description": _required_text(spell["spell_text"], ctx, "spell_text"),
        "alternate_description": _optional_text(
            spell["spell_alt_text"], ctx, "spell_alt_text"
        ),
        "damage": _damage(spell["damage"], ctx),
        "healing": _healing(spell["heal"], ctx),
        "range": _required_text(spell["range"], ctx, "range"),
        "higher_levels": {
            "text": _optional_text(spell["higher_levels"], ctx, "higher_levels"),
            "damage_by_slot": _damage_by_slot(
                spell["damage_at_higher_levels"], ctx
            ),
        },
        "casting_times": _casting_times(spell["casting_time"], ctx),
        "duration": _required_text(spell["duration"], ctx, "duration"),
        "concentration": _source_bool(
            spell["concentration"], ctx, "concentration"
        ),
        "ritual": _source_bool(spell["ritual"], ctx, "ritual"),
        "components": _components(spell["components"], ctx),
        "materials": _optional_text(spell["materials"], ctx, "materials"),
        "attacks": _attacks(spell["attack_type"], ctx),
        "area_of_effect": _area_of_effect(spell["area_of_effect"], ctx),
    }


def _validate_source_shape(spell: dict[str, Any], ctx: _SpellContext) -> None:
    fields = set(spell)
    missing = sorted(SOURCE_FIELDS - fields)
    extra = sorted(fields - SOURCE_FIELDS)
    if missing:
        ctx.fail(missing[0], "required source field is missing")
    if extra:
        ctx.fail(extra[0], "unrecognized source field")


def _validate_dropped_fields(spell: dict[str, Any], ctx: _SpellContext) -> None:
    if spell["heal_at_spell_slots"] is not None:
        ctx.fail("heal_at_spell_slots", "expected null legacy field")
    if spell["subclasses"] is not None:
        ctx.fail("subclasses", "expected null legacy field")

    is_flashdaggers = ctx.is_spell(525, "Flashdaggers")
    expected_action = '{"action": "Action"}' if is_flashdaggers else None
    expected_classes = "Wizard" if is_flashdaggers else None
    if spell["action"] != expected_action:
        ctx.fail("action", "unrecognized legacy value")
    if spell["classes"] != expected_classes:
        ctx.fail("classes", "unrecognized legacy value")


def _positive_int(value: Any, ctx: _SpellContext, path: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        ctx.fail(path, "expected a positive integer")
    return value


def _required_text(value: Any, ctx: _SpellContext, path: str) -> str:
    if not isinstance(value, str) or not value:
        ctx.fail(path, "expected a non-empty string")
    return value


def _optional_text(value: Any, ctx: _SpellContext, path: str) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str) or not value:
        ctx.fail(path, "expected a non-empty string or null")
    return value


def _level(value: Any, ctx: _SpellContext) -> int:
    if not isinstance(value, str) or len(value) != 1 or value not in "0123456789":
        ctx.fail("level", "expected a decimal string from 0 through 9")
    return int(value)


def _source_bool(value: Any, ctx: _SpellContext, path: str) -> bool:
    if isinstance(value, bool) or not isinstance(value, int) or value not in (0, 1):
        ctx.fail(path, "expected integer 0 or 1")
    return bool(value)


def _decode_object(value: Any, ctx: _SpellContext, path: str) -> dict[str, Any]:
    if not isinstance(value, str):
        ctx.fail(path, "expected a JSON-encoded object string")
    try:
        decoded = json.loads(value)
    except json.JSONDecodeError as exc:
        ctx.fail(path, f"malformed JSON ({exc.msg})")
    if not isinstance(decoded, dict):
        ctx.fail(path, "embedded JSON must decode to an object")
    return decoded


def _components(value: Any, ctx: _SpellContext) -> list[str]:
    if value == "V, S" and ctx.is_spell(525, "Flashdaggers"):
        decoded: Any = value.split(",")
    else:
        if not isinstance(value, str) or not value.startswith("["):
            ctx.fail("components", "expected a JSON-encoded string array")
        try:
            decoded = json.loads(value)
        except json.JSONDecodeError as exc:
            ctx.fail("components", f"malformed JSON ({exc.msg})")
    if not isinstance(decoded, list):
        ctx.fail("components", "embedded JSON must decode to an array")

    result: list[str] = []
    for index, component in enumerate(decoded):
        if not isinstance(component, str) or not component.strip():
            ctx.fail(f"components[{index}]", "expected a non-empty string")
        normalized = component.strip().upper()
        if normalized in result:
            ctx.fail(f"components[{index}]", "duplicate component")
        result.append(normalized)
    if not result:
        ctx.fail("components", "migrated source spell must have a component")
    return result


def _healing(value: Any, ctx: _SpellContext) -> dict[str, Any]:
    if value is None:
        return {"amount": None, "temp_hp": False, "max_hp": False}
    decoded = _decode_object(value, ctx, "heal")
    expected = {"amount", "temp_hp", "max_hp"}
    if set(decoded) != expected:
        ctx.fail("heal", "expected exactly amount, temp_hp, and max_hp")
    amount = decoded["amount"]
    if not isinstance(amount, str) or not amount:
        ctx.fail("heal.amount", "expected a non-empty string")
    for key in ("temp_hp", "max_hp"):
        if not isinstance(decoded[key], bool):
            ctx.fail(f"heal.{key}", "expected boolean")
    return {
        "amount": amount,
        "temp_hp": decoded["temp_hp"],
        "max_hp": decoded["max_hp"],
    }


def _damage(value: Any, ctx: _SpellContext) -> list[dict[str, Any]]:
    if value is None:
        return []
    if not isinstance(value, list):
        ctx.fail("damage", "expected array or null")
    result = []
    for index, entry in enumerate(value):
        path = f"damage[{index}]"
        if not isinstance(entry, dict):
            ctx.fail(path, "expected object")

        ordinary_keys = {"name", "damage", "type"}
        absorb_keys = {"name", "damage"}
        flashdaggers_keys = {"name", "damage", "damage_type"}
        if set(entry) == ordinary_keys:
            raw_types = entry["type"]
            if not isinstance(raw_types, list):
                ctx.fail(f"{path}.type", "expected string array")
        elif set(entry) == absorb_keys and ctx.is_spell(2, "Absorb Elements"):
            raw_types = []
        elif set(entry) == flashdaggers_keys and ctx.is_spell(525, "Flashdaggers"):
            if entry["damage_type"] != "peircing":
                ctx.fail(f"{path}.damage_type", "expected exact legacy value 'peircing'")
            raw_types = ["piercing"]
        else:
            ctx.fail(path, "unrecognized damage object shape")

        damage_types = _normalized_string_list(raw_types, ctx, f"{path}.type")
        result.append(
            {
                "name": _required_text(entry.get("name"), ctx, f"{path}.name"),
                "formula": _required_text(
                    entry.get("damage"), ctx, f"{path}.damage"
                ),
                "damage_types": damage_types,
            }
        )
    return result


def _attacks(value: Any, ctx: _SpellContext) -> list[dict[str, Any]]:
    if value is None:
        return []
    if not isinstance(value, list):
        ctx.fail("attack_type", "expected array or null")
    result = []
    for index, entry in enumerate(value):
        path = f"attack_type[{index}]"
        if not isinstance(entry, dict):
            ctx.fail(path, "expected object")
        if not set(entry).issubset({"name", "type", "save"}) or "name" not in entry:
            ctx.fail(path, "unrecognized attack object shape")
        if entry["name"] != "initial":
            ctx.fail(f"{path}.name", "expected invariant value 'initial'")

        kind = entry.get("type") or None
        if kind not in {None, "melee", "ranged"}:
            ctx.fail(f"{path}.type", "expected melee, ranged, empty, or absent")

        raw_saves = entry.get("save", [])
        if raw_saves == "DEX" and ctx.is_spell(525, "Flashdaggers"):
            raw_saves = ["dex"]
        elif not isinstance(raw_saves, list):
            ctx.fail(f"{path}.save", "expected string array")
        saves = _normalized_string_list(raw_saves, ctx, f"{path}.save")
        for save_index, saving_throw in enumerate(saves):
            if saving_throw not in SAVING_THROWS:
                ctx.fail(
                    f"{path}.save[{save_index}]", "unrecognized saving throw"
                )
        result.append({"kind": kind, "saving_throws": saves})
    return result


def _normalized_string_list(
    value: list[Any], ctx: _SpellContext, path: str
) -> list[str]:
    result: list[str] = []
    for index, item in enumerate(value):
        if not isinstance(item, str) or not item.strip():
            ctx.fail(f"{path}[{index}]", "expected a non-empty string")
        normalized = item.strip().lower()
        if normalized in result:
            ctx.fail(f"{path}[{index}]", "duplicate value")
        result.append(normalized)
    return result


def _casting_times(value: Any, ctx: _SpellContext) -> list[str]:
    if ctx.is_spell(348, "Plant Growth"):
        if value != "['1 action', '8 hour']":
            ctx.fail("casting_time", "unrecognized Plant Growth list literal")
        try:
            decoded = ast.literal_eval(value)
        except (SyntaxError, ValueError) as exc:
            ctx.fail("casting_time", f"malformed list literal ({exc})")
        if not isinstance(decoded, list) or not all(
            isinstance(item, str) and item for item in decoded
        ):
            ctx.fail("casting_time", "expected a list of non-empty strings")
        return ["8 hours" if item == "8 hour" else item for item in decoded]
    if not isinstance(value, str) or not value:
        ctx.fail("casting_time", "expected a non-empty string")
    if value.startswith("["):
        ctx.fail("casting_time", "list literals are only accepted for Plant Growth")
    return [value]


def _damage_by_slot(value: Any, ctx: _SpellContext) -> dict[str, str]:
    if value is None:
        return {}
    decoded = _decode_object(value, ctx, "damage_at_higher_levels")
    result: dict[str, str] = {}
    for key, formula in decoded.items():
        if not isinstance(key, str) or len(key) != 1 or key not in "0123456789":
            ctx.fail(
                f"damage_at_higher_levels.{key}",
                "expected a decimal slot key from 0 through 9",
            )
        if not isinstance(formula, str) or not formula:
            ctx.fail(
                f"damage_at_higher_levels.{key}", "expected a non-empty string"
            )
        result[key] = formula
    return result


def _area_of_effect(value: Any, ctx: _SpellContext) -> dict[str, Any]:
    if value is None:
        return {"shape": None, "size": None}
    decoded = _decode_object(value, ctx, "area_of_effect")
    if not decoded:
        return {"shape": None, "size": None}
    if len(decoded) != 1:
        ctx.fail("area_of_effect", "expected zero or one shape member")
    raw_shape, size = next(iter(decoded.items()))
    shape = raw_shape.strip().lower()
    if not shape:
        ctx.fail("area_of_effect", "shape must be a non-empty string")
    if size is not None and (
        isinstance(size, bool) or not isinstance(size, int) or size <= 0
    ):
        ctx.fail(f"area_of_effect.{raw_shape}", "expected positive integer or null")
    return {"shape": shape, "size": size}


def _serialize(rows: list[dict[str, Any]]) -> str:
    return json.dumps(rows, indent=2, ensure_ascii=False) + "\n"


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Migrate legacy spell seed rows to the canonical target shape."
    )
    parser.add_argument("--source", type=Path, help="Legacy source JSON path")
    parser.add_argument(
        "--output", "-o", type=Path, help="Distinct output/comparison JSON path"
    )
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument(
        "--check", action="store_true", help="Compare output without modifying files"
    )
    modes.add_argument(
        "--write", action="store_true", help="Write migrated records to output"
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)

    if args.output is None:
        parser.error("--output is required for --write and --check")
    if args.check and args.source is None:
        parser.error("--source is required for --check")

    source = args.source or DEFAULT_SOURCE
    if source.resolve() == args.output.resolve():
        parser.error("--output must be distinct from --source")

    try:
        raw = json.loads(source.read_text(encoding="utf-8"))
        migrated = migrate(raw)
        generated = _serialize(migrated)
    except (OSError, json.JSONDecodeError, MigrationError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    if args.write:
        try:
            args.output.write_text(generated, encoding="utf-8")
        except OSError as exc:
            print(f"ERROR: {exc}", file=sys.stderr)
            return 2
        print(f"Migrated {len(migrated)} spells to {args.output}.")
        return 0

    try:
        comparison = args.output.read_text(encoding="utf-8")
    except OSError as exc:
        print(f"CHECK FAILED: {exc}", file=sys.stderr)
        return 1
    if comparison != generated:
        print(f"CHECK FAILED: {args.output} differs from generated output.", file=sys.stderr)
        return 1
    print(f"Check passed for {len(migrated)} spells against {args.output}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
