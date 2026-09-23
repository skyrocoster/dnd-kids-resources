#!/usr/bin/env python3
"""Draft conservative weapon quick rules from canonical seed data."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend"))

from app.reference_text import validate_reference_text, weapon_value_reference_registry  # noqa: E402

DEFAULT_SEED_FILE = REPO_ROOT / "data" / "seeds" / "seed_weapons.json"
DEFAULT_REVIEW_FILE = REPO_ROOT / "data" / "seeds" / "weapon_quick_rules_review.json"


def _format_review(weapon: dict[str, Any], reasons: list[str]) -> dict[str, Any]:
    return {
        "id": weapon.get("id"),
        "name": weapon.get("name"),
        "reasons": reasons,
    }


def _range_suffix(attack: dict[str, Any]) -> str:
    r = attack.get("range")
    if isinstance(r, dict) and "min" in r and "max" in r:
        return f" (range {r['min']}/{r['max']} ft)"
    return ""


def _classify_attacks(attacks: list[dict[str, Any]]) -> tuple[str | None, list[str]]:
    reasons: list[str] = []

    if not attacks:
        return None, ["no attack entries"]

    for a in attacks:
        if "special" in a and a.get("damage") is None:
            return None, ["special attack without structured damage facts"]

    if len(attacks) > 2:
        return None, ["more than 2 attack entries"]

    if len(attacks) == 2:
        a0, a1 = attacks[0], attacks[1]

        if a0.get("damage_type") != a1.get("damage_type"):
            return None, ["attack entries have different damage types"]

        if a0.get("type") != a1.get("type"):
            return None, ["attack entries have different types (melee/ranged)"]

        has_mods_0 = "attack_mod" in a0 and "damage_mod" in a0
        has_mods_1 = "attack_mod" in a1 and "damage_mod" in a1
        if has_mods_0 != has_mods_1:
            return None, ["one attack entry has mods but the other does not"]
        if has_mods_0:
            if a0.get("attack_mod") != a1.get("attack_mod") or a0.get("damage_mod") != a1.get("damage_mod"):
                return None, ["attack entries have different attack/damage mod values"]

        if a0.get("range") != a1.get("range"):
            return None, ["attack entries have different range values"]

    return "ok", reasons


def _build_attack_text(attack: dict[str, Any]) -> str:
    dice = attack.get("damage")
    dtype = attack.get("damage_type")
    if dice is not None and dtype is not None:
        return f"{dice} {dtype} damage"
    if dice is not None:
        return f"{dice} damage"
    return "damage"


def draft_weapon_quick_rules(weapon: dict[str, Any]) -> tuple[str | None, list[str]]:
    attacks = weapon.get("attack") or []

    label, reasons = _classify_attacks(attacks)
    if label is None:
        return None, reasons

    has_mods = all("attack_mod" in a and "damage_mod" in a for a in attacks)

    if len(attacks) == 1:
        a = attacks[0]
        rtext = _range_suffix(a)
        dtext = _build_attack_text(a)
        text = f"Attack +{{weapon_attack_bonus}}, deal {dtext} +{{weapon_damage_bonus}}{rtext}."
    else:
        a0, a1 = attacks[0], attacks[1]
        dice0 = a0.get("damage")
        dice1 = a1.get("damage")
        dtype = a0.get("damage_type")
        rtext = _range_suffix(a0)
        if dtype:
            damage_clause = f"{dice0} ({dice1} two-handed) {dtype} damage"
        else:
            damage_clause = f"{dice0} ({dice1} two-handed) damage"
        text = f"Attack +{{weapon_attack_bonus}}, deal {damage_clause} +{{weapon_damage_bonus}}{rtext}."

    return text, reasons


def _validate_draft(quick_rules: str) -> list[str]:
    reasons: list[str] = []
    result = validate_reference_text(quick_rules, weapon_value_reference_registry)
    if not result["valid"]:
        reasons.append(f"reference validation failed: {result['errors']}")
    if len(quick_rules) > 320:
        reasons.append(f"{len(quick_rules)} chars exceeds 320 limit")
    if "\n" in quick_rules or "\r" in quick_rules:
        reasons.append("multiline quick_rules")
    if "  " in quick_rules:
        reasons.append("repeated spaces")
    if not quick_rules or quick_rules[-1] not in ".!)":
        reasons.append("missing sentence terminator")
    return reasons


def generate_quick_rules(weapons: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    drafts: list[dict[str, Any]] = []
    review: list[dict[str, Any]] = []

    for weapon in sorted(weapons, key=lambda item: (item.get("id") is None, item.get("id") or 0)):
        quick_rules, reasons = draft_weapon_quick_rules(weapon)

        if quick_rules is not None:
            validate_reasons = _validate_draft(quick_rules)
            if validate_reasons:
                review.append(_format_review(weapon, validate_reasons))
                continue
            drafts.append(
                {
                    "id": weapon.get("id"),
                    "name": weapon.get("name"),
                    "quick_rules": quick_rules,
                },
            )
        else:
            review.append(_format_review(weapon, reasons))

    return {"drafts": drafts, "review": review}


def load_weapons(path: Path) -> list[dict[str, Any]]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def apply_drafts_to_weapons(weapons: list[dict[str, Any]], drafts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_id = {draft["id"]: draft["quick_rules"] for draft in drafts}
    updated: list[dict[str, Any]] = []
    for weapon in weapons:
        copied = dict(weapon)
        if copied.get("id") in by_id:
            copied["quick_rules"] = by_id[copied.get("id")]
        updated.append(copied)
    return updated


def main() -> int:
    parser = argparse.ArgumentParser(description="Draft weapon quick_rules from seed_weapons.json")
    parser.add_argument("--seed-file", type=Path, default=DEFAULT_SEED_FILE)
    parser.add_argument("--review-output", type=Path, default=DEFAULT_REVIEW_FILE)
    parser.add_argument("--draft-output", type=Path)
    parser.add_argument(
        "--write-seeds",
        action="store_true",
        help="Mutate the seed file by applying non-ambiguous quick_rules drafts.",
    )
    args = parser.parse_args()

    weapons = load_weapons(args.seed_file)
    generated = generate_quick_rules(weapons)

    write_json(args.review_output, generated["review"])
    if args.draft_output is not None:
        write_json(args.draft_output, generated["drafts"])
    if args.write_seeds:
        write_json(args.seed_file, apply_drafts_to_weapons(weapons, generated["drafts"]))

    print(
        f"Drafted {len(generated['drafts'])} quick_rules; "
        f"{len(generated['review'])} weapons need review.",
    )
    print(f"Review: {args.review_output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
