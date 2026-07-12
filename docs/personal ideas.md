## To be planned later:
- visual dungeon buildings/construction
- NPC relationship trees
- campaign notes
- child specific pages with carefully pruned information. These are pages designed for playing the game rather than managing it. Made this work as part of a system where they can do things like open doors and go throug them, I can show hidden doors etc.
- surface incomplete DB data
- side panels being completely collapsable
-portal door type

# Dungeon Editor & Session Tools Roadmap

This document outlines planned improvements to the Dungeon Editor and related DM tools. The focus is on making dungeon preparation faster while keeping the editor intuitive for younger DMs, parents, and teachers.

---

# Dungeon Editor

## Room Labels

### Centre room names correctly

Room names do not always appear centred within irregularly shaped rooms.

### Goals

* Calculate the visual centre of a room rather than using the first selected tile.
* Ensure labels remain readable regardless of room shape.
* Avoid labels overlapping walls or doors where possible.

---

## Doors

### Support multiple door icons

Doors should support multiple states or properties instead of a single icon.

Multiple indicators allow a DM to see all relevant information at a glance without opening the editor.

---

## Edit room and door names

Allow room and door names to be edited directly after placement.

---

## Place Items

Allow decorative and interactive objects to be placed on dungeon squares.

Objects should optionally support wall attachment rather than always occupying the centre of a square.

Objects become the foundation for interactive dungeon content such as loot, searchable locations and environmental details.

---

## Ghost Objects

Provide a toggle to display objects from lower floors as ghosted overlays.

This assists when designing multi-level dungeons by making it easier to align connected features.

Ghost objects should be visually distinct and never be interactive while editing the current floor.

---

## Encounter and NPC Markers

Allow encounters and NPCs to be attached directly to dungeon squares.

The editor should display small chips indicating associated content without cluttering the map.

Selecting a chip opens the associated editor.

---

## Multiple Floors

Extend the dungeon editor to support multiple floors.

Each floor contains its own:

* Tiles
* Walls
* Doors
* Objects
* Fog of war
* Encounters
* NPC placements

Floors remain independent while belonging to the same dungeon.

---

## Staircases

Provide staircase objects that link floors together.

Each staircase links directly to a destination floor while preserving map position.

---

## Terrain Overlays

Introduce lightweight visual overlays to make maps more expressive without increasing gameplay complexity.

Overlays are decorative only. They do not affect movement, line of sight, encounters, lighting or any game mechanics.

### Path Overlays

Path overlays are drawn directly onto the map using a paint-style tool.

### Wall Overlays

Wall overlays attach to existing walls to provide additional environmental detail.

### Design Goals

* Paint-and-erase workflow.
* Decorative only.
* Stored independently of floor tiles and wall geometry.
* Easily extended with additional overlay types.
* Consistent rendering in both the editor and Dungeon View.

---

## Search Difficulty

Interactive objects should optionally include a Search DC.

The Search DC is informational only and is never rolled automatically.

---

## Loot Links

Objects should be capable of referencing reusable loot entries.

This removes duplicated treasure information and allows the same loot entry to be reused across multiple dungeons and campaigns.

---

## Lighting

Allow rooms or individual objects to specify lighting conditions.

Lighting is entered manually.

The editor deliberately does not calculate light propagation, visibility or line of sight.

---

## Drag Selection

Support drag-to-select for multiple tiles and objects.

Operations should include:

* Move
* Copy
* Delete
* Paint
* Assign properties

This greatly improves editing speed for larger maps.

---

## Fog of War Editor

Expand fog of war into a dedicated editing mode.

Features include:

* Paint hidden areas.
* Paint visible areas.
* Reveal by room.
* Reset an entire floor.

This defines the dungeon's initial visibility before a session begins.

---

# Dungeon View

Create a dedicated Dungeon View separate from the editor.

This page is designed for running live sessions rather than building maps.

## DM Controls

The DM can control the visibility of:

* Rooms
* NPCs
* Encounters
* Hidden content
* Notes

Content marked as hidden remains invisible until revealed.

### Fog of War

During play, the DM progressively reveals the dungeon without modifying the original map.

---

# Loot

Introduce a dedicated Loot page alongside the existing Encounter system.

Loot becomes a reusable resource that can be attached to dungeon objects and reused across multiple dungeons and campaigns.

---

# Session Logging

Provide lightweight session logging for campaign history.

Each session can record:

* Date
* Notes
* Images

The aim is not to replace campaign notes, but to maintain a chronological history of each play session that can be easily referenced later.
