# D&D Kids Resources

Online D&D 5th Edition tools and reference cards for kids, built for running games at the table. Non-commercial fan project.

## Language

### Content & Reference

**Spell**:
A D&D 5e spell described by level, school, components, damage, healing, range, and casting time. Each spell has an optional kid-friendly alternate description.
_Avoid_: spell_card

**Monster**:
A D&D 5e creature with a full stat block: ability scores, HP, AC, speed, senses, features, and attacks.
_Avoid_: creature (use when referring to encounter participants generically), npc (runtime-authored characters)

**Weapon**:
A D&D 5e weapon entry, either a base mundane weapon or a magical variant with rarity and attunement requirements.
_Avoid_: armament, gear

**Item**:
A generic treasure or reference object (gems, art, coins, consumables, scrolls, trade goods, gear). Distinct from weapons.
_Avoid_: object, loot_item

**Loot Bundle**:
A named, hand-authored collection of items and weapons with a gold value. Attached to map props or awarded manually.
_Avoid_: loot_table, treasure_pack

**Challenge Rating**:
A numeric difficulty rating for monsters (e.g. "1/4", "5"), stored as text with a sortable float and optional note.
_Avoid_: CR (abbreviation is fine in conversation, but the field is `cr`)

**Ability Scores**:
The six core D&D attributes: Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma.
_Avoid_: stats (use for NPC ability scores dict), attributes

### Spells & Magic

**Spell Level**:
Numeric tier 0-9, where 0 is a Cantrip.
_Avoid_: slot_level (that refers to spell slot tracking)

**School**:
Magical school of a spell: Abjuration, Conjuration, Divination, Enchantment, Evocation, Illusion, Necromancy, Transmutation.
_Avoid_: discipline, tradition

**Spell Component**:
One of three casting requirements: Verbal (V), Somatic (S), or Material (M).
_Avoid_: component (too generic)

**Concentration**:
Whether a spell requires sustained focus to maintain.

**Ritual**:
Whether the spell can be cast as a ritual (no slot cost, longer cast time).

**Spellcasting Block**:
A monster's structured spellcasting feature: ability used, resource type, and grouped spell lists.
_Avoid_: spellcasting_feature

**Spell Reference**:
A named reference to a spell within a SpellcastingBlock, with an optional hidden flag.
_Avoid_: spell_link, spell_entry

**Spell Group**:
A labelled collection of SpellReferences within a SpellcastingBlock (e.g. "At will", "3/day each").
_Avoid_: spell_list, casting_group

**At Will**:
A flag on player-spell assignments indicating the player knows this spell without slot cost.

**Spell Slots**:
Per-player tracked spell slot usage stored as total and current counts.
_Avoid_: slots, slot_tracker

### Monsters & Creatures

**Creature Size**:
Size category: Tiny, Small, Medium, Large, Huge, Gargantuan.
_Avoid_: size_category

**Creature Type**:
Classification of a monster (dragon, undead, fiend, etc.) with optional subtype tags and swarm size.
_Avoid_: monster_type, category

**Swarm**:
A creature type representing a mass of smaller creatures, with a swarm_size indicating the individual unit size.
_Avoid_: swarm_creature

**Family**:
Monster family grouping (e.g. "Goblin" family) for thematic clustering.
_Avoid_: group, lineage

**Challenge Rating**:
See Content & Reference section.

**Feature**:
A named trait, action, bonus action, reaction, legendary action, or mythic action of a monster.
_Avoid_: ability (conflicts with ability scores), special

**Trait**:
A passive monster feature that is always active.
_Avoid_: passive_feature, innate

**Action**:
A standard-action monster feature used on the creature's turn.
_Avoid_: attack_action (attacks are a sub-structure within actions)

**Bonus Action**:
A monster feature usable on the creature's bonus action.
_Avoid_: extra_action

**Reaction**:
A monster feature triggered in response to another creature's action.
_Avoid_: triggered_action

**Legendary Actions**:
Special limited actions for powerful monsters, with an intro text and per-round count.
_Avoid_: la_actions, boss_actions

**Mythic Actions**:
Ultra-powerful actions triggered when a monster drops below a HP threshold.
_Avoid_: mythic_trait, phase_two

**Attack**:
An offensive action with kind (melee/ranged, weapon/spell), bonus, damage, range, and target count.
_Avoid_: strike, hit

**Damage Type**:
The category of elemental or magical damage (Fire, Cold, Poison, etc.). Reference data.
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

### Players & Characters

**Player**:
A player character record: name, class, level, spell slots, assigned spells and weapons.
_Avoid_: character, pc, hero

**Class**:
A player character's D&D class (Barbarian, Bard, Cleric, etc.). One of 13 supported classes.
_Avoid_: character_class, archetype

**NPC**:
A non-player character with richer detail than monsters: race, gender, background, appearance, and notes. Runtime-authored, not from seeds.
_Avoid_: monster (use for stat-block creatures), character

**Appearance**:
An NPC's visual description: hair, eyes, height, distinctive features.
_Avoid_: description, look

### Encounters & Combat

**Encounter**:
A named combat setup holding a roster of participants and tracking turn order.
_Avoid_: battle, combat

**Unit**:
A single participant in an encounter roster entry, either a monster reference or a player reference.
_Avoid_: participant, combatant (use for live runner state)

**Creature**:
The API-facing name for encounter roster units. The DB column is `units`; the API surface renames it to `creatures`.
_Avoid_: unit (use for DB-level references)

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
Status effects applied to combatants during encounters (Poisoned, Charmed, Frightened, etc.). Reference data.
_Avoid_: status_effects, debuffs

### Campaign Management (The Loom)

**The Loom**:
The campaign narrative tracker: a tapestry of ordered story threads and nodes.
_Avoid_: campaign_tracker, story_manager

**Tapestry**:
The complete snapshot of all threads and nodes in the Loom, delivered as a single read.
_Avoid_: snapshot, full_state

**Thread**:
One linear story arc with a start, ordered beats/sessions, and an end. Has a name, color, and optional origin.
_Avoid_: storyline, arc, plot_line

**Beat**:
A planned story beat: a future event that has not yet happened in-game. Thread-exclusive.
_Avoid_: event, planned_session, milestone

**Session**:
A record of a played game session. Can belong to many threads independently.
_Avoid_: play_session, game_session

**Session Tag**:
An optional label on a session node (e.g. date or session number).

**Fulfilled (Beat)**:
A beat that has been converted into a session, recording the original planned title and fulfillment time.
_Avoid_: completed_beat, realized_beat

**Banked (Beat)**:
A beat removed from a thread and placed in the vault/unplaced pool.
_Avoid_: archived_beat, orphaned_beat

**Bank / Vault**:
The pool of unplaced (banked) beats with zero thread membership.
_Avoid_: backlog, holding area

**Node**:
A point in a thread: one of start, end, beat, or session. Has title, body, canvas coordinates, and thread memberships.
_Avoid_: point, marker

**Thread Item**:
A membership row linking a node to a thread with an integer position for ordering.
_Avoid_: membership, link

**Position**:
Integer ordering of a node within a thread (ascending). The sole source of narrative order.
_Avoid_: order, index, sort_key

**Swimlane**:
Visual layout model: one thread displayed as a horizontal lane with ordered nodes and progress boundaries.
_Avoid_: lane, row, track

**Current Position**:
The node just before the first unfulfilled beat in a thread — the "you are here" marker.
_Avoid_: cursor, playback_head

**Thread Head**:
The latest realized node in a thread (last session or start before first beat).
_Avoid_: latest_node, tip

**Next Beat**:
The first unfulfilled beat in a thread's ordered sequence.
_Avoid_: upcoming_beat, pending_beat

**Live Threads**:
Threads that still have unfulfilled beats remaining.
_Avoid_: active_threads, open_threads

**Stitch Layer**:
The visual overlay connecting nodes across swimlanes on the canvas.
_Avoid_: connection_layer, edge_overlay

### Dungeons & Maps (Map Lab)

**Dungeon**:
A runtime-created record with a title and a data blob containing room-reading content (general info, rooms, doors, floors, stairs).
_Avoid_: adventure, module

**Dungeon Data**:
The JSON blob containing general_info, rooms, doors, floors, stairs, corridors, and map_image.
_Avoid_: content_blob, room_data

**Map Layout**:
The geometry and coordinate model stored separately: rooms, doors, stairs, floors, props, and portals with cell coordinates.
_Avoid_: grid_data, spatial_data

**Map Lab**:
The visual dungeon editor/viewer frontend feature.
_Avoid_: dungeon_editor, map_editor

**Room**:
A navigable space within a dungeon with content entries and NPC references. On the map: an origin cell plus a polyomino cell set.
_Avoid_: area, zone, chamber

**Entry**:
A content item within a room: trap, monster, treasure, feature, NPC, trick, door, or encounter.
_Avoid_: item (conflicts with the Item domain term), detail

**Entry Type**:
Classification of a room entry: door, feature, trap, encounter, monster, treasure, npc, trick.
_Avoid_: content_type, kind

**Floor**:
A vertical level or layer of a dungeon (z-axis). Multiple floors connected by stairs.
_Avoid_: level (conflicts with spell/character level), layer

**Door**:
A wall passage between two rooms on the same floor, with state flags (hidden, locked, trapped).
_Avoid_: passage, opening

**Passage Flags**:
Independent boolean state on doors, stairs, and props: hidden, locked, trapped, plus DC values and note.
_Avoid_: state_flags, lock_state

**DC (Difficulty Check)**:
A numeric threshold for checks: break DC, pick lock DC, perception (hidden) DC.
_Avoid_: difficulty_class, check_value

**Stair**:
A vertical passage crossing floor levels (z-axis).
_Avoid_: ladder, elevator, stairway

**Portal**:
A freestanding one-square marker linking to a non-adjacent destination (paired/two-way).
_Avoid_: teleporter, warp

**Prop**:
A static map object: chest, table, mirror, barrel, statue, window, encounter, or other. Carries PassageFlags and optional loot bundle.
_Avoid_: object (too generic), decoration

**Polyomino**:
The shape of a room defined as a set of cells relative to an origin point.
_Avoid_: footprint, shape, room_cells

**Map Cell**:
An integer [x, y] coordinate on a floor plane.
_Avoid_: coordinate, tile, grid_position

**Cardinal Side**:
N/S/E/W direction for wall segments and door placement.
_Avoid_: direction, orientation, face

**Cell Size**:
Scale constant: feet per grid cell (default 5).
_Avoid_: grid_scale, tile_size

**Threat Hints**:
Derived per-room booleans: hasTrap, hasMonster, hasEncounter. Used for rail badges.
_Avoid_: danger_flags, threat_indicators

**Dungeon Graph**:
Normalized node/edge graph of rooms connected by doors and stairs.
_Avoid_: room_graph, connectivity_map

### Architecture & Data

**Seed (Data)**:
Canonical JSON files in `data/seeds/` that define rebuildable reference data (spells, monsters, weapons, items, etc.).
_Avoid_: fixture, initial_data, static_data

**Seed-Backed Domain**:
A table whose data originates from seed files and can be rebuilt. Contrasts with runtime-created domains.
_Avoid_: reference_table, lookup_table

**Runtime-Created**:
Data created through the API/UI at runtime, not from seeds (dungeons, layouts, loom data).
_Avoid_: user_created, dynamic_data

**Browser / Viewer / Editor**:
The frontend feature pattern: BrowserPage for list/create/delete, Viewer for read, Editor for write.
_Avoid_: list_page, detail_page, form_page

**RemoteState**:
A generic pattern for tracking async API data with loading and error states.
_Avoid_: api_state, fetch_state

**Dual-Save**:
Map Lab's editor saving both content data and layout data in parallel.
_Avoid_: parallel_save, split_save

**Nav Section**:
A grouped navigation category: Reference, Campaign, Loot.
_Avoid_: nav_group, menu_section
