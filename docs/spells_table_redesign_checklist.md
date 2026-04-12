
# Spells Table Redesign Checklist

This document compares the fields in your current spells database table with the fields present in the 5eAPI spells JSON. Use this as a checklist to guide your redesign.

---

## 1. Fields in Current Database Table
- id
- spell_name (was `title`)
- icon
- level (integer, 0-9)
- school
- spell_text (was `explanation`)
- to_hit
- damage
- heal
- range
- special
- higher_levels (JSON list from `higher_level`)
- casting_time
- duration
- concentration
- ritual
- components (JSON list)
- materials (was `material_components`, string)
- attack_type
- classes
- created_at

## 2. Fields in 5eAPI spells.json
- index (unique spell key)
- name (title)
- desc (full description)
- higher_level (scaling description)
- range
- components (array)
- material
- ritual (bool)
- duration
- concentration (bool)
- casting_time
- level (int)
- attack_type
- damage (object: type, scaling)
- dc (object: type, success)
- school (object: index, name, url)
- classes (array of objects)
- subclasses (array of objects)
- url (API reference)
- updated_at (timestamp)

---

## 3. Field Mapping & Decisions
- `index`: Intentionally ignored, will not be added to the database schema.
- `name`: Mapped to `spell_name`.
- `desc`: Mapped to `spell_text` as a JSON list (full description preserved).
- `level`: Stored as integer 0-9, mapped directly from API `level`.
- `higher_level`: Stored as a JSON list in `higher_levels`.
- `explanation`: Renamed to `spell_text`.
- `range`: Mapped directly from API `range` to DB `range`.
- `duration`: Mapped directly from API `duration` to DB `duration` as string.
- `concentration`: Mapped directly from API `concentration` to DB `concentration` as a bool.
- `casting_time`: Mapped directly from API `casting_time` to DB `casting_time` as string.
- `school`: Mapped to `school.index` from API `school`.
- `attack_type`: Mapped to `attack_type` as a JSON list with a single object: `[{'name': 'initial', 'type': '<attack_type>', 'save': dc.dc_type.index}]`.
- `damage`: Mapped to a JSON list with an object containing `name: initial`, `type: damage.damage_type.index`, `amount: first value from damage.damage_at_slot_level`, and `save_success: dc.dc_success`.
- `heal`: Mapped to the first value from `heal_at_slot_level`; if the value contains `+ MOD`, the heal field becomes `{"amount": "<dice>", "MOD": "SAbM"}`.
- `heal_at_higher_levels`: Mapped to the full `heal_at_slot_level` value list.
- `area_of_effect`: Mapped to a formatted string `[area_of_effect.type:area_of_effect.size]`.
- `classes`: Mapped to a JSON list of class `index` values.
- `subclasses`: Mapped to a JSON list of subclass `index` values.
- `components`: Mapped to new `components` field as JSON list.
- `material`: Mapped to `materials` field as string (field renamed from `material_components`).
- `ritual`: mapped to `ritual` as a bool


---

## 4. Action Items
- [ ] Decide which new fields to add
- [ ] Decide which fields to convert to JSON/text
- [ ] Update schema and migration scripts
- [ ] Update API and card rendering logic
- [ ] Test with sample data

---

Refer to this checklist as you redesign your spells table and related code.
