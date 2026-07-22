#!/usr/bin/env python3
"""Draft conservative spell quick rules from canonical seed data."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SEED_FILE = REPO_ROOT / "data" / "seeds" / "seed_spells.json"
DEFAULT_REVIEW_FILE = REPO_ROOT / "data" / "seeds" / "spell_quick_rules_review.json"

SAVE_NAMES = {
    "str": "Strength",
    "dex": "Dexterity",
    "con": "Constitution",
    "int": "Intelligence",
    "wis": "Wisdom",
    "cha": "Charisma",
}


def _clean_text(value: str) -> str:
    cleaned = re.sub(r"\s+", " ", value).strip()
    cleaned = re.sub(r"\|\|[^|]+\|\|", " ", cleaned)
    cleaned = re.sub(r"\|[^|]+(?:\|[^|]+)+", "", cleaned)
    return re.sub(r"\s+", " ", cleaned).strip()


def _first_sentence(text: str) -> str:
    cleaned = _clean_text(text)
    match = re.search(r"(?<=[.!?])\s+", cleaned)
    return cleaned if match is None else cleaned[: match.start()].strip()


def _format_damage(damage: list[dict[str, Any]]) -> str | None:
    if len(damage) != 1:
        return None

    entry = damage[0]
    formula = entry.get("formula")
    if not formula:
        return None

    damage_types = entry.get("damage_types") or []
    if len(damage_types) == 1:
        return f"{formula} {damage_types[0]} damage"
    return f"{formula} damage"


def _format_review(spell: dict[str, Any], reasons: list[str]) -> dict[str, Any]:
    return {
        "id": spell.get("id"),
        "name": spell.get("name"),
        "reasons": reasons,
    }


def draft_spell_quick_rules(spell: dict[str, Any]) -> tuple[str | None, list[str]]:
    """Return a quick-rules draft and review reasons for one spell."""

    reasons: list[str] = []
    attacks = spell.get("attacks") or []
    damage = spell.get("damage") or []
    healing = spell.get("healing") or {}
    healing_amount = healing.get("amount")

    attack_kinds = sorted({attack.get("kind") for attack in attacks if attack.get("kind")})
    saves = sorted(
        {
            save
            for attack in attacks
            for save in (attack.get("saving_throws") or [])
            if save in SAVE_NAMES
        },
    )

    if len(attack_kinds) > 1:
        reasons.append("multiple spell attack kinds")
    if len(saves) > 1:
        reasons.append("multiple saving throw abilities")
    if attack_kinds and saves:
        reasons.append("spell attack and saving throw both present")
    if len(damage) > 1:
        reasons.append("multiple damage entries")
    if damage and healing_amount:
        reasons.append("damage and healing both present")

    if reasons:
        return None, reasons

    details: list[str] = []
    if spell.get("range"):
        details.append(f"Range {spell['range']}")
    if spell.get("duration"):
        details.append(f"duration {spell['duration']}")

    detail_text = f" ({'; '.join(details)})." if details else "."
    damage_text = _format_damage(damage)

    if saves:
        save_name = SAVE_NAMES[saves[0]]
        if damage_text:
            return (
                f"Target makes a {save_name} save against {{spell_save_dc}}; "
                f"on a failure, it takes {damage_text}{detail_text}",
                reasons,
            )
        return (
            f"Target makes a {save_name} save against {{spell_save_dc}}{detail_text}",
            reasons,
        )

    if attack_kinds:
        attack_name = attack_kinds[0]
        if damage_text:
            return (
                f"Make a {attack_name} spell attack using {{spell_attack_bonus}}; "
                f"on a hit, the target takes {damage_text}{detail_text}",
                reasons,
            )
        return (
            f"Make a {attack_name} spell attack using {{spell_attack_bonus}}{detail_text}",
            reasons,
        )

    if healing_amount:
        verb = "Increase hit point maximum and current hit points by" if healing.get("max_hp") else "Restore"
        return f"{verb} {healing_amount} hit points{detail_text}", reasons

    description = spell.get("description") or ""
    sentence = _first_sentence(description)
    if sentence:
        return f"{sentence}{detail_text}", reasons

    return None, ["missing description and structured effect facts"]


def generate_quick_rules(spells: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    drafts: list[dict[str, Any]] = []
    review: list[dict[str, Any]] = []

    for spell in sorted(spells, key=lambda item: (item.get("id") is None, item.get("id") or 0)):
        quick_rules, reasons = draft_spell_quick_rules(spell)
        if quick_rules is None:
            review.append(_format_review(spell, reasons))
            continue

        drafts.append(
            {
                "id": spell.get("id"),
                "name": spell.get("name"),
                "quick_rules": quick_rules,
            },
        )

    return {"drafts": drafts, "review": review}


def load_spells(path: Path) -> list[dict[str, Any]]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def apply_drafts_to_spells(spells: list[dict[str, Any]], drafts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_id = {draft["id"]: draft["quick_rules"] for draft in drafts}
    updated: list[dict[str, Any]] = []
    for spell in spells:
        copied = dict(spell)
        if copied.get("id") in by_id:
            copied["quick_rules"] = by_id[copied.get("id")]
        updated.append(copied)
    return updated


def main() -> int:
    parser = argparse.ArgumentParser(description="Draft spell quick_rules from seed_spells.json")
    parser.add_argument("--seed-file", type=Path, default=DEFAULT_SEED_FILE)
    parser.add_argument("--review-output", type=Path, default=DEFAULT_REVIEW_FILE)
    parser.add_argument("--draft-output", type=Path)
    parser.add_argument(
        "--write-seeds",
        action="store_true",
        help="Mutate the seed file by applying non-ambiguous quick_rules drafts.",
    )
    args = parser.parse_args()

    spells = load_spells(args.seed_file)
    generated = generate_quick_rules(spells)

    write_json(args.review_output, generated["review"])
    if args.draft_output is not None:
        write_json(args.draft_output, generated["drafts"])
    if args.write_seeds:
        write_json(args.seed_file, apply_drafts_to_spells(spells, generated["drafts"]))

    print(
        f"Drafted {len(generated['drafts'])} quick_rules; "
        f"{len(generated['review'])} spells need review.",
    )
    print(f"Review: {args.review_output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
