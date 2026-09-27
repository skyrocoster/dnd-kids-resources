"""Build a read-only, seed-backed inventory of every monster action."""

from __future__ import annotations

import json
from collections import OrderedDict
from pathlib import Path
from typing import Any


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
SOURCE_PATH = REPOSITORY_ROOT / "data" / "seeds" / "seed_monsters.json"
OUTPUT_DIRECTORY = Path(__file__).resolve().parent
SOURCE_LABEL = "data/seeds/seed_monsters.json"


def canonical_action(action: Any) -> str:
    """Serialize an action for strict JSON-value equality.

    Object keys are sorted recursively; list order and every JSON value are
    preserved. Provenance is not part of this representation.
    """

    return json.dumps(
        action,
        ensure_ascii=False,
        allow_nan=False,
        separators=(",", ":"),
        sort_keys=True,
    )


def _action_list(monster: Any, monster_position: int) -> list[Any]:
    if not isinstance(monster, dict):
        raise ValueError(f"Monster at position {monster_position} is not a JSON object")

    features = monster.get("features") or {}
    if not isinstance(features, dict):
        raise ValueError(
            f"Monster at position {monster_position} has non-object features"
        )

    actions = features.get("actions", [])
    if not isinstance(actions, list):
        raise ValueError(
            f"Monster at position {monster_position} has non-list features.actions"
        )
    return actions


def build_inventory(
    monsters: list[Any],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Return all source occurrences and unique actions in first-seen order."""

    occurrences: list[dict[str, Any]] = []
    variants_by_identity: OrderedDict[str, dict[str, Any]] = OrderedDict()

    for monster_position, monster in enumerate(monsters):
        actions = _action_list(monster, monster_position)
        for action_index, action in enumerate(actions):
            identity = canonical_action(action)
            provenance = {
                "monster_id": monster.get("id"),
                "monster_name": monster.get("name"),
                "action_index": action_index,
            }
            occurrence = {**provenance, "action": action}
            occurrences.append(occurrence)

            variant = variants_by_identity.get(identity)
            if variant is None:
                variant = {
                    "action": action,
                    "occurrence_count": 0,
                    "occurrences": [],
                }
                variants_by_identity[identity] = variant
            variant["occurrence_count"] += 1
            variant["occurrences"].append(provenance)

    return occurrences, list(variants_by_identity.values())


def _name_review_groups(
    variants: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    groups: OrderedDict[str, dict[str, Any]] = OrderedDict()
    for variant in variants:
        action = variant["action"]
        if not isinstance(action, dict) or "name" not in action:
            continue
        name_identity = canonical_action(action["name"])
        group = groups.setdefault(
            name_identity,
            {"name": action["name"], "variants": [], "occurrence_count": 0},
        )
        group["variants"].append(variant)
        group["occurrence_count"] += variant["occurrence_count"]
    return [group for group in groups.values() if len(group["variants"]) > 1]


def _json_block(value: Any) -> str:
    return "```json\n" + json.dumps(
        value, ensure_ascii=False, indent=2, allow_nan=False, sort_keys=True
    ) + "\n```"


def render_stats(
    source_label: str,
    monster_count: int,
    occurrences: list[dict[str, Any]],
    variants: list[dict[str, Any]],
) -> str:
    review_groups = _name_review_groups(variants)
    repeated_variants = sum(len(group["variants"]) for group in review_groups)
    repeated_occurrences = sum(group["occurrence_count"] for group in review_groups)

    lines = [
        "# Monster actions inventory statistics",
        "",
        f"- **Source:** `{source_label}` (local seed data; not a live database).",
        "- **Method:** scan each monster's `features.actions` list in source order.",
        "  Each occurrence retains its original action object and source monster ID,",
        "  monster name, and zero-based action-list index.",
        "- **Equality:** compare the entire parsed action value using compact JSON",
        "  serialization with recursively sorted object keys. Arrays remain ordered;",
        "  nulls, missing fields, names, descriptions, attack data, and numbers remain",
        "  significant. Monster provenance is excluded from identity.",
        "- **Ordering:** occurrences and unique variants follow first appearance in the seed.",
        "  No timestamps or generated identifiers are included.",
        "",
        "## Counts",
        "",
        f"- Monster records scanned: **{monster_count:,}**",
        f"- Action occurrences: **{len(occurrences):,}**",
        f"- Unique full-action variants: **{len(variants):,}**",
        f"- Repeat occurrences beyond each variant's first: **{len(occurrences) - len(variants):,}**",
        f"- Exact-name groups with multiple full-action variants: **{len(review_groups):,}**",
        f"- Variants in those same-name groups: **{repeated_variants:,}**",
        f"- Occurrences in those same-name groups: **{repeated_occurrences:,}**",
        "",
        "## Same-name review groups",
        "",
    ]

    if review_groups:
        lines.append("Groups use the exact parsed `name` value; they are review aids, not merges.")
        lines.append("")
        lines.append("| Action name | Full-action variants | Occurrences |")
        lines.append("| --- | ---: | ---: |")
        for group in review_groups:
            name = json.dumps(group["name"], ensure_ascii=False, sort_keys=True)
            table_name = name.replace("|", "\\|").replace("\n", " ")
            lines.append(
                f"| `{table_name}` | {len(group['variants']):,} | "
                f"{group['occurrence_count']:,} |"
            )
    else:
        lines.append("No exact-name groups have multiple full-action variants.")

    lines.extend(
        [
            "",
            "## Concrete source examples",
            "",
            "Aarakocra (monster ID 1) is shown directly from the seed. The actions",
            "include attacks and a descriptive non-attack action; all are inventoried.",
            "",
        ]
    )
    aarakocra_occurrences = [
        occurrence for occurrence in occurrences if occurrence["monster_id"] == 1
    ]
    if aarakocra_occurrences:
        for occurrence in aarakocra_occurrences:
            action_name = (
                occurrence["action"].get("name")
                if isinstance(occurrence["action"], dict)
                else None
            )
            name = json.dumps(action_name, ensure_ascii=False, sort_keys=True)
            lines.extend(
                [
                    f"### Aarakocra action index {occurrence['action_index']}: `{name}`",
                    "",
                    _json_block(occurrence["action"]),
                    "",
                ]
            )
    else:
        lines.extend(["No monster with ID 1 was found in this input.", ""])

    if review_groups:
        lines.extend(
            [
                "## Concrete same-name variation examples",
                "",
                "For up to the first five review groups in first-appearance order, the",
                "first two full-action variants are shown. The JSON inventory contains",
                "every variant and every occurrence, including any additional variants.",
                "",
            ]
        )
        for group in review_groups[:5]:
            name = json.dumps(group["name"], ensure_ascii=False, sort_keys=True)
            lines.extend([f"### Action name `{name}`", ""])
            for variant_number, variant in enumerate(group["variants"][:2], start=1):
                first_source = variant["occurrences"][0]
                lines.extend(
                    [
                        f"Variant {variant_number}: **{variant['occurrence_count']:,}** occurrence(s); "
                        f"first seen on {first_source['monster_name']} (ID {first_source['monster_id']}, "
                        f"action index {first_source['action_index']}).",
                        "",
                        _json_block(variant["action"]),
                        "",
                    ]
                )

    lines.extend(
        [
            "## Limitations and non-goals",
            "",
            "- This report describes only the local monster seed file. It does not inspect",
            "  or claim to represent a live database.",
            "- Exact JSON-value equality measures differences; it does not decide whether",
            "  two actions are semantically equivalent or should be merged.",
            "- This is not a weapon lookup, equipment-link decision, schema proposal,",
            "  database migration, seed rewrite, or validation against external rules.",
            "- Action-name groupings are for human review only. Names do not define variant",
            "  identity, and no action category is excluded based on its attack fields.",
            "",
            "## Next review questions",
            "",
            "- Which observed differences matter for a future model, and which (if any) are",
            "  safe to consolidate after human review?",
            "- Should confirmed equipment-related actions eventually reference shared weapon",
            "  records while retaining monster-specific use details?",
            "- What separate boundaries should apply to traits, reactions, and other feature",
            "  categories?",
            "",
        ]
    )
    return "\n".join(lines)


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(
        json.dumps(payload, ensure_ascii=False, allow_nan=False, indent=2, sort_keys=True)
        + "\n",
        encoding="utf-8",
        newline="\n",
    )


def run_inventory(
    source_path: Path = SOURCE_PATH,
    output_directory: Path = OUTPUT_DIRECTORY,
    source_label: str = SOURCE_LABEL,
) -> tuple[int, int, int]:
    """Read a seed and emit full, deduplicated, then statistical artifacts."""

    monsters = json.loads(source_path.read_text(encoding="utf-8"))
    if not isinstance(monsters, list):
        raise ValueError("The monster seed must contain a JSON list")

    occurrences, variants = build_inventory(monsters)
    output_directory.mkdir(parents=True, exist_ok=True)

    full_payload = {
        "source": source_label,
        "monster_count": len(monsters),
        "occurrence_count": len(occurrences),
        "occurrences": occurrences,
    }
    _write_json(output_directory / "full.json", full_payload)

    deduped_payload = {
        "source": source_label,
        "monster_count": len(monsters),
        "occurrence_count": len(occurrences),
        "variant_count": len(variants),
        "variants": variants,
    }
    _write_json(output_directory / "deduped.json", deduped_payload)

    stats = render_stats(source_label, len(monsters), occurrences, variants)
    (output_directory / "stats.md").write_text(
        stats, encoding="utf-8", newline="\n"
    )
    return len(monsters), len(occurrences), len(variants)


def main() -> None:
    monster_count, occurrence_count, variant_count = run_inventory()
    print(
        "Wrote full.json, deduped.json, and stats.md: "
        f"{monster_count:,} monsters, {occurrence_count:,} action occurrences, "
        f"{variant_count:,} unique full-action variants."
    )


if __name__ == "__main__":
    main()
