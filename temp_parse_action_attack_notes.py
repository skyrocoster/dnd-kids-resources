from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path
import shutil

DATA_PATH = Path("data/5eTools/extracted/data/bestiary/monsters_merged.json")
BACKUP_PATH = DATA_PATH.with_name(f"{DATA_PATH.name}.{datetime.now():%Y%m%d%H%M%S}.bak")

ATTACK_TAG_RE = re.compile(r"\{\@atk\s+([^}]+)\}", re.IGNORECASE)
HIT_RE = re.compile(r"\{\@hit\s*([+-]?\d+)\}|\{\@hitYourSpellAttack\}|automatic hit", re.IGNORECASE)
RANGE_RE = re.compile(r"\b(?:reach|range|ranged)\s+(\d+)(?:\s*/\s*(\d+))?\s*ft\.?", re.IGNORECASE)
TARGET_RE = re.compile(
    r"\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b\s+(?:target|targets|creature|creatures)\b",
    re.IGNORECASE,
)
DAMAGE_CHOICE_RE = re.compile(r"of a type chosen[^:]*:\s*([^\.]+)", re.IGNORECASE)
DAMAGE_TYPE_RE = re.compile(r"([a-zA-Z ]+?)\s+damage\b", re.IGNORECASE)

WORD_NUMBER = {
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
}


def parse_attack_type(tag_text: str) -> str | None:
    mapping = {
        "mw": "melee",
        "rw": "ranged",
        "ms": "melee spell",
        "rs": "ranged spell",
    }
    parts = [p.strip().lower() for p in tag_text.split(",") if p.strip()]
    mapped = [mapping.get(p) for p in parts if mapping.get(p)]
    if not mapped:
        return None
    return " or ".join(mapped)


def parse_hit(note: str) -> tuple[int | None, bool]:
    match = HIT_RE.search(note)
    if not match:
        return None, False
    text = match.group(0).lower()
    if "automatic hit" in text:
        return None, True
    if "{@hityourspellattack}" in text.replace(" ", ""):
        return None, False
    num = match.group(1)
    if num is not None:
        return int(num), False
    return None, False


def parse_range(note: str, attack_type: str | None) -> tuple[int | None, int | None]:
    match = RANGE_RE.search(note)
    if not match:
        if attack_type in ("melee", "melee spell"):
            return 5, None
        return None, None
    low = int(match.group(1))
    high = int(match.group(2)) if match.group(2) else None
    return low, high


def parse_targets(note: str) -> int | None:
    match = TARGET_RE.search(note)
    if not match:
        return None
    raw = match.group(1).lower()
    if raw.isdigit():
        return int(raw)
    return WORD_NUMBER.get(raw, None)


def parse_damage_phrase(phrase: str) -> tuple[str | None, int, str | None]:
    dice = None
    damage_mod = 0
    damage_extra = None
    for part in re.split(r"\s*\+\s*", phrase):
        part = part.strip()
        if not part:
            continue
        if part.upper() == "PB":
            damage_extra = "PB"
            continue
        if re.fullmatch(r"\d+d\d+(?:\s*\+\s*\d+)*", part):
            dice = part.replace(" ", "")
            continue
        if part.isdigit() or re.fullmatch(r"[+-]?\d+", part):
            damage_mod += int(part)
            continue
        if re.fullmatch(r"\d+", part):
            damage_mod += int(part)
            continue
        if dice is None and re.search(r"\d+d\d+", part):
            dice = re.search(r"\d+d\d+", part).group(0)
    return dice, damage_mod, damage_extra


def parse_damage(note: str) -> tuple[str | None, int, str | None, str | None, list[str] | None, str]:
    remaining = note
    damage = None
    damage_mod = 0
    damage_extra = None
    damage_type = None
    damage_choice = None
    text_after = note

    # prefer {@damage} first, then {@dice}, then direct number
    dmg_match = re.search(r"\{\@damage\s+([^}]+)\}", note, re.IGNORECASE)
    if dmg_match:
        phrase = dmg_match.group(1).strip()
        damage, damage_mod, damage_extra = parse_damage_phrase(phrase)
        text_after = note[dmg_match.end() :].strip()
    else:
        dice_match = re.search(r"\{\@dice\s+([^}]+)\}", note, re.IGNORECASE)
        if dice_match:
            damage = dice_match.group(1).strip()
            text_after = note[dice_match.end() :].strip()
        else:
            direct_match = re.match(r"^(\d+)\b", note.strip())
            if direct_match:
                damage = direct_match.group(1)
                text_after = note[direct_match.end() :].strip()

    if damage is not None:
        choice_match = DAMAGE_CHOICE_RE.search(text_after)
        if choice_match:
            found = choice_match.group(1)
            damage_type = "variable"
            damage_choice = [item.strip().lower() for item in re.split(r",| or ", found) if item.strip()]
            remaining = note[: choice_match.start()] + note[choice_match.end() :]
        else:
            type_match = DAMAGE_TYPE_RE.search(text_after)
            if type_match:
                raw_type = type_match.group(1).strip()
                types = [item.strip().lower() for item in re.split(r",| or ", raw_type) if item.strip()]
                if len(types) > 1:
                    damage_type = "variable"
                    damage_choice = types
                else:
                    damage_type = types[0]
                remaining = note[: type_match.start()] + note[type_match.end() :]
            else:
                remaining = text_after
    else:
        remaining = note

    return damage, damage_mod, damage_extra, damage_type, damage_choice, remaining.strip()


def parse_secondary_damage(note: str) -> tuple[dict | None, str]:
    if "plus" not in note.lower():
        return None, note

    if "{@damage" not in note and "{@dice" not in note and not re.search(r"\b\d+d\d+\b", note):
        return None, note

    macro_matches = list(re.finditer(r"\{\@(?:damage|dice)\s+[^}]+\}", note, re.IGNORECASE))
    if not macro_matches:
        return None, note

    last_macro = macro_matches[-1]
    plus_pos = note.lower().rfind("plus", 0, last_macro.start())
    if plus_pos == -1:
        if not re.match(r"^\s*[a-zA-Z ]+ damage", note, re.IGNORECASE):
            return None, note
        plus_pos = 0

    suffix = note[plus_pos:]
    damage, damage_mod, damage_extra, damage_type, damage_choice, remaining = parse_damage(suffix)
    if damage is None:
        return None, note

    if damage_type is None:
        match = re.search(r"damage\s+that\s+is\s+([a-zA-Z ]+?)(?:[.,;]|$)", suffix, re.IGNORECASE)
        if match:
            damage_type = match.group(1).strip().lower()
        elif re.search(r"type.*most vulnerable to", suffix, re.IGNORECASE):
            damage_type = "variable"
        elif re.search(r"damage of a type that .*or .*", suffix, re.IGNORECASE):
            damage_type = "variable"
        else:
            alt_match = re.search(r"damage\s+that\s+is\s+([a-zA-Z]+)\s+if.*?and\s+([a-zA-Z]+)\s+if", suffix, re.IGNORECASE)
            if alt_match:
                damage_type = "variable"
                damage_choice = [alt_match.group(1).strip().lower(), alt_match.group(2).strip().lower()]

    macros_after_plus = [m for m in macro_matches if m.start() >= plus_pos]
    if not macros_after_plus:
        return None, note
    damage_macro = macros_after_plus[0]
    macro_end = damage_macro.end() - plus_pos
    damage_word = re.search(r"\bdamage\b", suffix[macro_end:], re.IGNORECASE)
    if damage_word:
        removal_end = macro_end + damage_word.end()
        post = suffix[removal_end:]
        if re.match(r"^\s+that\s+is\s+[a-zA-Z ]+?(?:[.,;]|$)", post, re.IGNORECASE):
            extra = re.match(r"^\s+that\s+is\s+[a-zA-Z ]+?(?:[.,;]|$)", post, re.IGNORECASE)
            removal_end += extra.end()
        elif re.match(r"^\s+of\s+a\s+type\b.*?(?:[.,;]|$)", post, re.IGNORECASE):
            extra = re.match(r"^\s+of\s+a\s+type\b.*?(?:[.,;]|$)", post, re.IGNORECASE)
            removal_end += extra.end()
        new_note = note[:plus_pos] + suffix[removal_end:]
    else:
        new_note = note

    new_note = re.sub(r"\s+", " ", new_note).strip(" ,.;")
    if re.match(r"^[a-zA-Z ]+ damage(?:[ ,.;]|$)", new_note, re.IGNORECASE):
        suffix_after = re.sub(r"^[a-zA-Z ]+ damage\s*[,.;]?\s*", "", new_note, flags=re.IGNORECASE)
        if not suffix_after or re.match(r"^(and|if|that|when)\b", suffix_after, re.IGNORECASE):
            new_note = re.sub(r"\s+", " ", suffix_after).strip(" ,.;")

    attack = {
        "secondary_damage": damage,
        "secondary_damage_type": damage_type,
    }
    if damage_mod:
        attack["secondary_damage_mod"] = damage_mod
    if damage_extra is not None:
        attack["secondary_damage_extra"] = damage_extra
    if damage_choice is not None:
        attack["secondary_damage_choice"] = damage_choice

    return attack, new_note


def tokenize_attack_note(note: str) -> dict | None:
    if '{@atk' not in note:
        return None
    tag_match = ATTACK_TAG_RE.search(note)
    if not tag_match:
        return None
    attack_type = parse_attack_type(tag_match.group(1))
    if attack_type is None:
        return None

    mod, auto_hit = parse_hit(note)
    rng, max_range = parse_range(note, attack_type)
    targets = parse_targets(note)
    if targets is None:
        targets = 1

    after_hit = note.split("{@h}", 1)[1].strip() if "{@h}" in note else ""
    damage, damage_mod, damage_extra, damage_type, damage_choice, post_damage = parse_damage(after_hit)

    attack = {
        "type": attack_type,
        "mod": mod,
        "range": rng,
        "targets": targets,
    }
    if max_range is not None:
        attack["max_range"] = max_range
    if auto_hit:
        attack["auto_hit"] = True
    if damage is not None:
        attack["damage"] = damage
        attack["damage_mod"] = damage_mod
    if damage_type is not None:
        attack["damage_type"] = damage_type
    if damage_extra is not None:
        attack["damage_extra"] = damage_extra
    if damage_choice is not None:
        attack["damage_choice"] = damage_choice

    # preserve any remaining text after the parsed damage description
    leftover = post_damage
    leftover = leftover.lstrip(" ,.;")
    return attack, leftover


def process_action_notes(data: list[dict]) -> tuple[int, int]:
    parsed_actions = 0
    parsed_notes = 0
    for entry in data:
        if not isinstance(entry, dict):
            continue
        actions = entry.get("action")
        if not isinstance(actions, list):
            continue
        for action in actions:
            if not isinstance(action, dict):
                continue
            notes = action.get("notes")
            if not isinstance(notes, list):
                continue

            if "attack" not in action:
                new_notes = []
                action_parsed = False
                for note in notes:
                    if not isinstance(note, str) or "{@atk" not in note:
                        new_notes.append(note)
                        continue
                    parsed = tokenize_attack_note(note)
                    if not parsed:
                        new_notes.append(note)
                        continue
                    attack, leftover = parsed
                    action["attack"] = attack
                    action_parsed = True
                    parsed_notes += 1
                    if leftover:
                        new_notes.append(leftover)

                if action_parsed:
                    parsed_actions += 1
                    if new_notes:
                        action["notes"] = new_notes
                    else:
                        action.pop("notes", None)

            elif isinstance(action["attack"], dict):
                attack = action["attack"]
                new_notes = []
                secondary_parsed = False
                for note in notes:
                    if not isinstance(note, str):
                        new_notes.append(note)
                        continue
                    secondary_attack, leftover = parse_secondary_damage(note)
                    if secondary_attack is None:
                        new_notes.append(note)
                        continue
                    if "secondary_damage" in secondary_attack and "secondary_damage" not in attack:
                        attack.update(secondary_attack)
                        secondary_parsed = True
                    if leftover:
                        new_notes.append(leftover)
                if secondary_parsed:
                    parsed_notes += 1
                    if new_notes:
                        action["notes"] = new_notes
                    else:
                        action.pop("notes", None)

    return parsed_actions, parsed_notes


def main() -> None:
    print(f"Backing up {DATA_PATH} to {BACKUP_PATH}")
    BACKUP_PATH.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(DATA_PATH, BACKUP_PATH)

    with DATA_PATH.open("r", encoding="utf-8") as handle:
        data = json.load(handle)

    parsed_actions, parsed_notes = process_action_notes(data)
    print(f"Parsed {parsed_actions} action objects and {parsed_notes} attack-note strings.")
    if parsed_actions or parsed_notes:
        with DATA_PATH.open("w", encoding="utf-8") as handle:
            json.dump(data, handle, indent=2, ensure_ascii=False)
        print("Updated JSON saved.")
    else:
        print("No action notes were parsed; JSON unchanged.")


if __name__ == "__main__":
    main()
