# Encounters Glossary

Domain vocabulary for the consolidated Encounters area, covering encounters, monsters, and NPCs.

**Encounter**:
A named combat setup holding a roster of participants and tracking turn order.
_Avoid_: battle, combat

**Unit**:
A single participant in an encounter roster entry, either a monster reference or a player reference.
_Avoid_: participant, combatant, which is live runner state.

**Creature**:
The API-facing name for encounter roster units. The database column is `units`; the API surface renames it to `creatures`.
_Avoid_: unit, except for database-level references.

**Combatant**:
A live encounter participant during encounter-runner playback, enriched with client ID, current HP, and conditions.
_Avoid_: active_unit, runner_participant

**Active Index**:
Zero-based index into the creature roster indicating whose turn it currently is.
_Avoid_: current_turn, turn_index

**Round**:
A counter incremented each time all combatants have taken a turn.

**Turn**:
One combatant's action within a round. The runner advances via nextTurn.
_Avoid_: step, phase

**Conditions**:
Status effects applied to combatants during encounters, such as Poisoned, Charmed, or Frightened. Reference data.
_Avoid_: status_effects, debuffs

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

**NPC**:
A non-player character with richer detail than monsters: race, gender, background, appearance, and notes. Runtime-authored, not from seeds.
_Avoid_: monster, which is for stat-block creatures; character.

**Appearance**:
An NPC's visual description: hair, eyes, height, and distinctive features.
_Avoid_: description, look
