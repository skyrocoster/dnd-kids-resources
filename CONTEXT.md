# D&D Kids Resources Context

Online D&D 5th Edition tools and reference cards for kids, built for running games at the table. Non-commercial fan project.

## Context Model

`CONTEXT.md` is the repo-wide vocabulary file. Keep only cross-area terms here so a fresh AI can read it without absorbing unrelated domain details.

Area-specific vocabulary belongs in the owning area guide under `docs/areas/`:

- Loom story terms: `docs/areas/loom.md`
- Dungeon and Map Lab terms: `docs/areas/dungeons.md`
- Encounter and combat terms: `docs/areas/encounters.md`
- Spell terms: `docs/areas/spells.md`
- Monster stat-block terms: `docs/areas/monsters.md`
- Loot bundle terms: `docs/areas/loot.md`
- Weapons, items, players, and NPC terms: `docs/areas/reference-catalogs.md`

For architecture, data, API, design, and testing contracts, use the canonical references listed in `docs/README.md`.

## Shared Vocabulary

**Seed (Data)**:
Canonical JSON files in `data/seeds/` that define rebuildable reference data.
_Avoid_: fixture, initial_data, static_data

**Seed-Backed Domain**:
A table whose data originates from seed files and can be rebuilt. Contrasts with runtime-created domains.
_Avoid_: reference_table, lookup_table

**Runtime-Created**:
Data created through the API/UI at runtime, not from seeds.
_Avoid_: user_created, dynamic_data

**Browser / Viewer / Editor**:
The frontend feature pattern: BrowserPage for list/create/delete, Viewer for read, Editor for write.
_Avoid_: list_page, detail_page, form_page

**RemoteState**:
A generic pattern for tracking async API data with loading and error states.
_Avoid_: api_state, fetch_state

**Nav Section**:
A grouped navigation category, such as Reference, Campaign, or Loot.
_Avoid_: nav_group, menu_section
