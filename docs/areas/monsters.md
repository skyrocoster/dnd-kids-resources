# Monsters Area Guide

> **Active plan:** None.

## Scope

Owns the monster catalog, stat blocks, monster editor, and monster data consumed by encounters. It does not own encounter-runner state.

## Domain vocabulary

**Monster**:
A D&D 5e creature with a full stat block: ability scores, HP, AC, speed, senses, features, and attacks.
_Avoid_: creature, except when referring to encounter participants generically; npc, which is runtime-authored character data.

**Creature Size**:
Size category: Tiny, Small, Medium, Large, Huge, or Gargantuan.
_Avoid_: size_category

**Creature Type**:
Classification of a monster, such as dragon, undead, or fiend, with optional subtype tags and swarm size.
_Avoid_: monster_type, category

**Swarm**:
A creature type representing a mass of smaller creatures, with `swarm_size` indicating the individual unit size.
_Avoid_: swarm_creature

**Family**:
Monster family grouping, such as a Goblin family, for thematic clustering.
_Avoid_: group, lineage

**Challenge Rating**:
A numeric difficulty rating for monsters, stored as text with a sortable float and optional note.
_Avoid_: CR as a field name; abbreviation is fine in conversation, but the field is `cr`.

**Ability Scores**:
The six core D&D attributes: Strength, Dexterity, Constitution, Intelligence, Wisdom, and Charisma.
_Avoid_: stats, except for NPC ability score dictionaries; attributes.

**Feature**:
A named trait, action, bonus action, reaction, legendary action, or mythic action of a monster.
_Avoid_: ability, which conflicts with ability scores; special.

**Trait**:
A passive monster feature that is always active.
_Avoid_: passive_feature, innate

**Action**:
A standard-action monster feature used on the creature's turn.
_Avoid_: attack_action, because attacks are a sub-structure within actions.

**Bonus Action**:
A monster feature usable on the creature's bonus action.
_Avoid_: extra_action

**Reaction**:
A monster feature triggered in response to another creature's action.
_Avoid_: triggered_action

**Legendary Actions**:
Special limited actions for powerful monsters, with intro text and a per-round count.
_Avoid_: la_actions, boss_actions

**Mythic Actions**:
Ultra-powerful actions triggered when a monster drops below an HP threshold.
_Avoid_: mythic_trait, phase_two

**Attack**:
An offensive action with kind, bonus, damage, range, and target count.
_Avoid_: strike, hit

**Damage Type**:
The category of elemental or magical damage. Reference data.
_Avoid_: dmg_type

**Damage Modifier**:
A structured entry for resistances, immunities, or vulnerabilities, with optional conditional text.
_Avoid_: resistance_entry, immunity_entry

**Armor Class**:
A creature's defensive value, with optional note and ordered alternatives.
_Avoid_: defense, block_value

**Hit Points**:
A creature's health as average value plus optional dice formula.
_Avoid_: health, hp_value

**Spellcasting Block**:
A monster's structured spellcasting feature: ability used, resource type, and grouped spell lists.
_Avoid_: spellcasting_feature

**Spell Reference**:
A named reference to a spell within a Spellcasting Block, with an optional hidden flag.
_Avoid_: spell_link, spell_entry

**Spell Group**:
A labelled collection of Spell References within a Spellcasting Block, such as "At will" or "3/day each".
_Avoid_: spell_list, casting_group

## Read first

`../ARCHITECTURE.md`, `../API_REFERENCE.md`, `../DATA_MODEL.md`, `../TESTING.md`, and `../DESIGN_SYSTEM.md` for UI work.

## Source map

- Backend: `backend/app/routers/monsters.py`.
- Frontend: `frontend/src/features/monsters/`.
- Tests: monster router tests and colocated monster frontend tests.

## Invariants

- Preserve the routed full-page Monster Editor and its stat-card presentation unless a focused plan explicitly changes them.
- Keep catalog contracts canonical in the API and data-model references.

## Work queue

- Create a focused plan for monster curation, sound playback, deep links, or stat calculations.

## Cross-references

`../API_REFERENCE.md`, `../DATA_MODEL.md`, `../complete/monsters_plan.md`, and `encounters.md`.
