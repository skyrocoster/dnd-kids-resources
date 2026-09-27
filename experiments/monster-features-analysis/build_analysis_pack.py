"""Generate read-only analysis views from the local monster seed."""

from __future__ import annotations

import csv
import json
from collections import Counter, OrderedDict
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
SOURCE_PATH = ROOT / "data" / "seeds" / "seed_monsters.json"
OUTPUT_DIRECTORY = Path(__file__).resolve().parent
SOURCE_LABEL = "data/seeds/seed_monsters.json"

SAMPLE_MONSTERS = {
    1: "Aarakocra",
    4: "Aartuk Elder",
    12: "Abjurer Wizard",
    39: "Adult Red Dragon",
    106: "Ancient Dragon Turtle",
    402: "Bugbear",
    403: "Bugbear Chief",
    1372: "Icewind Kobold Zombie",
}


def _json_bytes(value: Any) -> str:
    return json.dumps(
        value,
        ensure_ascii=False,
        allow_nan=False,
        sort_keys=True,
        separators=(",", ":"),
    )


def _write_json(path: Path, value: Any) -> None:
    path.write_text(
        json.dumps(
            value,
            ensure_ascii=False,
            allow_nan=False,
            indent=2,
            sort_keys=True,
        )
        + "\n",
        encoding="utf-8",
        newline="\n",
    )


def _type_name(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, str):
        return "string"
    if isinstance(value, (int, float)):
        return "number"
    if isinstance(value, list):
        return "array"
    if isinstance(value, dict):
        return "object"
    return type(value).__name__


def _sample_records(monsters: list[Any]) -> list[dict[str, Any]]:
    found = {monster.get("id"): monster for monster in monsters if isinstance(monster, dict)}
    selected: list[dict[str, Any]] = []
    for monster_id, expected_name in SAMPLE_MONSTERS.items():
        monster = found.get(monster_id)
        if monster is None:
            raise ValueError(f"Sample monster ID {monster_id} was not found")
        if monster.get("name") != expected_name:
            raise ValueError(
                f"Monster ID {monster_id} is {monster.get('name')!r}, "
                f"expected {expected_name!r}"
            )
        features = monster.get("features")
        if not isinstance(features, dict):
            raise ValueError(f"Monster {expected_name} has no object-valued features")
        selected.append(
            {"id": monster["id"], "name": monster["name"], "features": features}
        )
    return selected


def _feature_occurrences(
    source_records: list[dict[str, Any]],
) -> dict[str, Any]:
    occurrences: list[dict[str, Any]] = []
    contexts: list[dict[str, Any]] = []
    for monster in source_records:
        features = monster["features"]
        contexts.append(
            {
                "monster_id": monster["id"],
                "monster_name": monster["name"],
                "feature_list_lengths": {
                    key: len(value)
                    for key, value in features.items()
                    if isinstance(value, list)
                },
                "feature_container_non_list_values": {
                    key: value
                    for key, value in features.items()
                    if not isinstance(value, list)
                },
            }
        )
        for category, values in features.items():
            if not isinstance(values, list):
                continue
            for feature_index, feature in enumerate(values):
                occurrences.append(
                    {
                        "monster_id": monster["id"],
                        "monster_name": monster["name"],
                        "feature_category": category,
                        "feature_index": feature_index,
                        "feature": feature,
                    }
                )
    return {
        "source": SOURCE_LABEL,
        "scope": "All list-valued feature categories for the curated sample only.",
        "monster_feature_context": contexts,
        "occurrences": occurrences,
    }


def _sample_action_facets(
    source_records: list[dict[str, Any]],
) -> dict[str, Any]:
    rows: list[dict[str, Any]] = []
    for monster in source_records:
        actions = monster["features"].get("actions", [])
        if not isinstance(actions, list):
            raise ValueError(f"{monster['name']} features.actions is not a list")
        for action_index, action in enumerate(actions):
            if not isinstance(action, dict):
                attack = None
            else:
                attack = action.get("attack")
            attack_fields = (
                {key: value for key, value in attack.items() if key != "damage"}
                if isinstance(attack, dict)
                else None
            )
            rows.append(
                {
                    "source": {
                        "monster_id": monster["id"],
                        "monster_name": monster["name"],
                        "feature_category": "actions",
                        "feature_index": action_index,
                    },
                    "name_present": isinstance(action, dict) and "name" in action,
                    "action_name": action.get("name") if isinstance(action, dict) else None,
                    "description_present": isinstance(action, dict)
                    and "description" in action,
                    "action_description": action.get("description")
                    if isinstance(action, dict)
                    else None,
                    "attack_present": isinstance(action, dict) and "attack" in action,
                    "attack_is_null": attack is None
                    if isinstance(action, dict) and "attack" in action
                    else None,
                    "attack_fields": attack_fields,
                    "damage_present": isinstance(attack, dict) and "damage" in attack,
                    "damage_value": attack.get("damage")
                    if isinstance(attack, dict)
                    else None,
                    "source_action": action,
                }
            )
    return {
        "source": SOURCE_LABEL,
        "scope": "Every curated-sample features.actions occurrence.",
        "rows": rows,
    }


def _action_occurrences(monsters: list[Any]) -> list[dict[str, Any]]:
    occurrences: list[dict[str, Any]] = []
    for monster_position, monster in enumerate(monsters):
        if not isinstance(monster, dict):
            raise ValueError(f"Monster at position {monster_position} is not an object")
        features = monster.get("features") or {}
        if not isinstance(features, dict):
            raise ValueError(f"Monster at position {monster_position} has invalid features")
        actions = features.get("actions", [])
        if not isinstance(actions, list):
            raise ValueError(f"Monster at position {monster_position} has invalid actions")
        for action_index, action in enumerate(actions):
            if isinstance(action, dict) and action.get("name") == "Javelin":
                occurrences.append(
                    {
                        "monster_id": monster.get("id"),
                        "monster_name": monster.get("name"),
                        "action_index": action_index,
                        "action": action,
                    }
                )
    return occurrences


def _javelin_review(occurrences: list[dict[str, Any]]) -> dict[str, Any]:
    variants_by_action: OrderedDict[str, dict[str, Any]] = OrderedDict()
    for occurrence in occurrences:
        action = occurrence["action"]
        identity = _json_bytes(action)
        variant = variants_by_action.get(identity)
        provenance = {
            "monster_id": occurrence["monster_id"],
            "monster_name": occurrence["monster_name"],
            "action_index": occurrence["action_index"],
        }
        if variant is None:
            variant = {
                "variant_index": len(variants_by_action) + 1,
                "action": action,
                "occurrence_count": 0,
                "occurrences": [],
            }
            variants_by_action[identity] = variant
        variant["occurrence_count"] += 1
        variant["occurrences"].append(provenance)
    return {
        "source": SOURCE_LABEL,
        "selection": "Action name exactly equals the string 'Javelin'.",
        "equality": (
            "Whole parsed action JSON value; object-key order ignored, all values "
            "and array order retained. This grouping does not establish equivalence."
        ),
        "occurrence_count": len(occurrences),
        "strict_variant_count": len(variants_by_action),
        "occurrences": occurrences,
        "strict_variants": list(variants_by_action.values()),
    }


def _csv_cell(value: Any) -> str:
    if isinstance(value, str):
        return value
    return json.dumps(value, ensure_ascii=False, allow_nan=False, sort_keys=True)


def _write_javelin_csv(path: Path, occurrences: list[dict[str, Any]]) -> None:
    columns = [
        "monster_id",
        "monster_name",
        "action_index",
        "name",
        "description",
        "attack_present",
        "attack_is_null",
        "attack_kind",
        "attack_bonus",
        "automatic_hit",
        "range_ft",
        "long_range_ft",
        "targets",
        "damage_components_json",
        "full_action_json",
    ]
    with path.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=columns, lineterminator="\n")
        writer.writeheader()
        for occurrence in occurrences:
            action = occurrence["action"]
            attack = action.get("attack")
            attack_object = attack if isinstance(attack, dict) else {}
            row = {
                "monster_id": occurrence["monster_id"],
                "monster_name": occurrence["monster_name"],
                "action_index": occurrence["action_index"],
                "name": action.get("name"),
                "description": action.get("description"),
                "attack_present": "attack" in action,
                "attack_is_null": attack is None if "attack" in action else None,
                "attack_kind": attack_object.get("kind"),
                "attack_bonus": attack_object.get("attack_bonus"),
                "automatic_hit": attack_object.get("automatic_hit"),
                "range_ft": attack_object.get("range_ft"),
                "long_range_ft": attack_object.get("long_range_ft"),
                "targets": attack_object.get("targets"),
                "damage_components_json": attack_object.get("damage"),
                "full_action_json": action,
            }
            writer.writerow({key: _csv_cell(value) for key, value in row.items()})


def _shape_profile(monsters: list[Any]) -> dict[str, Any]:
    feature_values: dict[str, list[Any]] = {}
    action_rows: list[Any] = []
    feature_container_count = 0
    for monster_position, monster in enumerate(monsters):
        if not isinstance(monster, dict):
            raise ValueError(f"Monster at position {monster_position} is not an object")
        features = monster.get("features")
        if not isinstance(features, dict):
            continue
        feature_container_count += 1
        for key, value in features.items():
            feature_values.setdefault(key, []).append(value)
        actions = features.get("actions", [])
        if isinstance(actions, list):
            action_rows.extend(actions)

    feature_field_profile: dict[str, Any] = {}
    for key, values in sorted(feature_values.items()):
        type_counts = Counter(_type_name(value) for value in values)
        feature_field_profile[key] = {
            "monster_records_with_field": len(values),
            "monster_records_without_field": feature_container_count - len(values),
            "value_type_counts": dict(sorted(type_counts.items())),
            "nonempty_array_monster_records": sum(
                isinstance(value, list) and bool(value) for value in values
            ),
            "array_item_count": sum(
                len(value) for value in values if isinstance(value, list)
            ),
        }

    action_object_keys: Counter[str] = Counter()
    action_value_types: dict[str, Counter[str]] = {}
    attack_types: Counter[str] = Counter()
    attack_object_keys: Counter[str] = Counter()
    attack_kinds: Counter[str] = Counter()
    damage_lengths: Counter[str] = Counter()
    damage_component_keys: Counter[str] = Counter()
    attack_object_count = 0
    for action in action_rows:
        if isinstance(action, dict):
            for key, value in action.items():
                action_object_keys[key] += 1
                action_value_types.setdefault(key, Counter())[_type_name(value)] += 1
            if "attack" not in action:
                attack_types["missing"] += 1
                continue
            attack = action["attack"]
        else:
            attack_types[_type_name(action)] += 1
            continue

        attack_types[_type_name(attack)] += 1
        if not isinstance(attack, dict):
            continue
        attack_object_count += 1
        for key in attack:
            attack_object_keys[key] += 1
        if "kind" in attack:
            attack_kinds[_json_bytes(attack["kind"])] += 1
        if isinstance(attack.get("damage"), list):
            damage = attack["damage"]
            damage_lengths[str(len(damage))] += 1
            for component in damage:
                if isinstance(component, dict):
                    for key in component:
                        damage_component_keys[key] += 1

    return {
        "source": SOURCE_LABEL,
        "monster_count": len(monsters),
        "monster_records_with_object_features": feature_container_count,
        "monster_records_without_object_features": len(monsters) - feature_container_count,
        "feature_fields": feature_field_profile,
        "actions": {
            "occurrence_count": len(action_rows),
            "root_field_presence_counts": dict(sorted(action_object_keys.items())),
            "root_field_value_type_counts": {
                key: dict(sorted(counts.items()))
                for key, counts in sorted(action_value_types.items())
            },
            "attack_value_type_counts": dict(sorted(attack_types.items())),
            "attack_object_count": attack_object_count,
            "attack_field_presence_counts": dict(sorted(attack_object_keys.items())),
            "attack_kind_value_counts": dict(sorted(attack_kinds.items())),
            "damage_component_count_per_action": dict(sorted(damage_lengths.items())),
            "damage_component_field_presence_counts": dict(
                sorted(damage_component_keys.items())
            ),
        },
    }


def build_analysis_pack(
    source_path: Path = SOURCE_PATH,
    output_directory: Path = OUTPUT_DIRECTORY,
) -> dict[str, int]:
    monsters = json.loads(source_path.read_text(encoding="utf-8"))
    if not isinstance(monsters, list):
        raise ValueError("The monster seed must contain a JSON list")

    sample = _sample_records(monsters)
    javelins = _action_occurrences(monsters)
    output_directory.mkdir(parents=True, exist_ok=True)

    _write_json(
        output_directory / "seed-sample.json",
        {"source": SOURCE_LABEL, "monsters": sample},
    )
    _write_json(
        output_directory / "feature-occurrences.json",
        _feature_occurrences(sample),
    )
    action_facets = _sample_action_facets(sample)
    _write_json(output_directory / "sample-action-facets.json", action_facets)
    _write_json(
        output_directory / "javelin-name-review.json",
        _javelin_review(javelins),
    )
    _write_javelin_csv(output_directory / "javelin-occurrences.csv", javelins)
    _write_json(
        output_directory / "feature-shape-profile.json",
        _shape_profile(monsters),
    )
    return {
        "monster_count": len(monsters),
        "sample_monster_count": len(sample),
        "sample_action_count": len(action_facets["rows"]),
        "javelin_occurrence_count": len(javelins),
    }


def main() -> None:
    counts = build_analysis_pack()
    print(
        "Wrote analysis pack: "
        f"{counts['monster_count']:,} seed monsters, "
        f"{counts['sample_monster_count']} sample monsters, "
        f"{counts['sample_action_count']} sample actions, "
        f"{counts['javelin_occurrence_count']} Javelin occurrences."
    )


if __name__ == "__main__":
    main()
