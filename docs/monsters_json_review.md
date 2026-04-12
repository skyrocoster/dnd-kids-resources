# 5eAPI Monsters JSON Review

This document breaks down `data/5eAPI/monsters.json` so you can review the monster data structure and inspect the monster list.

## Summary

- Source file: `data/5eAPI/monsters.json`
- Total monster entries: `334`
- Generated review list: `data/5eAPI/monsters-list.txt`

## Top-level fields in each monster entry

The 5eAPI monster objects in this file contain the following top-level keys:

- `index` (string)
- `name` (string)
- `size` (string)
- `type` (string)
- `alignment` (string)
- `armor_class` (list)
- `hit_points` (integer)
- `hit_dice` (string)
- `hit_points_roll` (string)
- `speed` (object)
- `strength` (integer)
- `dexterity` (integer)
- `constitution` (integer)
- `intelligence` (integer)
- `wisdom` (integer)
- `charisma` (integer)
- `proficiencies` (list)
- `damage_vulnerabilities` (list)
- `damage_resistances` (list)
- `damage_immunities` (list)
- `condition_immunities` (list)
- `senses` (object)
- `languages` (string)
- `challenge_rating` (integer)
- `proficiency_bonus` (integer)
- `xp` (integer)
- `special_abilities` (list)
- `actions` (list)
- `legendary_actions` (list)
- `image` (string)
- `url` (string)
- `updated_at` (string)
- `forms` (list)
- `reactions` (list)
- `subtype` (string, optional)
- `desc` (string, optional)

## Notes on field usage

- `subtype` appears on a subset of monsters.
- `desc` appears on a subset of monsters.
- `forms` is a list of alternate or related forms.
- `armor_class` is typically a list of objects such as `{ "type": "natural", "value": 17 }`.
- `speed` is a dictionary of movement modes like `walk`, `fly`, `swim`, `burrow`, and `climb`.
- `proficiencies` contains proficiency objects with `value` and `proficiency` details.
- `special_abilities`, `actions`, `legendary_actions`, and `reactions` are lists of nested action objects.

## Recommended review strategy

1. Open `data/5eAPI/monsters-list.txt` to review the monster names and API indices quickly.
2. Pick a handful of monsters by name/index to inspect the raw JSON objects in `data/5eAPI/monsters.json`.
3. Check the nested lists for `actions`, `special_abilities`, and `legendary_actions` to confirm the layout you want to support.
4. Verify whether `subtype` and `desc` are required for your use case.

## Example monster structure

A typical monster entry contains:

- core metadata: `index`, `name`, `size`, `type`, `alignment`
- combat stats: `armor_class`, `hit_points`, `hit_dice`, `speed`
- ability scores: `strength`, `dexterity`, `constitution`, `intelligence`, `wisdom`, `charisma`
- resistances and immunities: `damage_vulnerabilities`, `damage_resistances`, `damage_immunities`, `condition_immunities`
- special features and actions: `special_abilities`, `actions`, `legendary_actions`, `reactions`

## File references

- JSON source: `data/5eAPI/monsters.json`
- Review list: `data/5eAPI/monsters-list.txt`
