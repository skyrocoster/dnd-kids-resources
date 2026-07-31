# Documentation Manifest — D&D Kids Resources

This is the documentation task router. The full documentation inventory (canonical docs, area guides, entry points, plan archive, and analysis records) is in [INVENTORY.md](INVENTORY.md). Use the router below to find the right area guide and context for your task. It routes to areas, not to plans: which plans are in flight for an area is generated into that area guide's `## Work queue` and into [plans/active/INDEX.md](plans/active/INDEX.md).

Read [../AGENTS.md](../AGENTS.md) first, then use this manifest instead of exploring source to find the smallest relevant context packet. Use [../CONTEXT.md](../CONTEXT.md) for shared vocabulary; use the owning area guide for area-specific vocabulary and invariants.

`../scratch/` is deliberately outside this inventory and documentation contract. AI must not explore it unless the user explicitly names a path there.

Each `docs/plans/active/<feature>/` directory holds its Plan and the lean, disposable **work orders** compiled from that Plan's stages and deleted by `reconcile` once shipped. These are regenerated from source plans/maps; no manifest row needed. The Plan → Implement → Reconcile workflow and its five `.opencode/skills/` skills are defined in [PLAN_TEMPLATE.md](PLAN_TEMPLATE.md) and [../AGENTS.md](../AGENTS.md).

## Task Router

| Task | Area | Read first |
|---|---|---|
| Documentation maintenance | [Infra](areas/infra.md) | `PLAN_TEMPLATE.md`, `scripts/check_docs.py`, `TESTING.md`, and existing GitHub workflow files |
| Running or recording a real session at the table | [Infra](areas/infra.md) | `TABLE_TESTING.md`, `docs/table-tests/_example/session-template.md`, then the plan the session serves |
| Designing or changing any UI surface | [Design](areas/design.md) | `UX_PATTERNS.md`, `DESIGN_SYSTEM.md`, the owning area guide's `## Surfaces` table |
| Visual consistency work | [Design](areas/design.md) | `areas/design.md`, `DESIGN_SYSTEM.md`, `ARCHITECTURE.md`, `TESTING.md` |
| Story threads, Loom tapestry, beats, or session nodes | [Loom](areas/loom.md) | `areas/loom.md`, `DESIGN_SYSTEM.md`, `ARCHITECTURE.md`, `API_REFERENCE.md`, `DATA_MODEL.md`, `TESTING.md` |
| Existing dungeon, encounter, monster, spell, or loot behavior | Relevant area guide | `ARCHITECTURE.md`, `API_REFERENCE.md`, `DATA_MODEL.md`, `TESTING.md` |
| Wall kinds, map extent/padding, outside features, or map layer and density controls | [Dungeons](areas/dungeons.md) | `UX_PATTERNS.md`, `DESIGN_SYSTEM.md`, `DATA_MODEL.md`, `TESTING.md`, then the plan |
| Map Lab editor/viewer chrome, canvas gestures, brushes, undo, or tablet layout | [Dungeons](areas/dungeons.md) | `UX_PATTERNS.md`, `DESIGN_SYSTEM.md`, `TESTING.md`, then the archived plan for history |
| Map Lab tool palette and flyouts, editor vertical layout, fit/zoom framing, viewer rail, or rooms with no squares | [Dungeons](areas/dungeons.md) | `UX_PATTERNS.md`, `DESIGN_SYSTEM.md`, `TESTING.md`, then the archived plan for history |
| Room label placement or sizing, in either app | [Players](areas/players.md) | `UX_PATTERNS.md`, `DESIGN_SYSTEM.md`, `TESTING.md`, then the active plan |
| Spells, weapons, items, or loot | [Reference](areas/reference.md) | `DATA_MODEL.md`, `API_REFERENCE.md`, `UX_PATTERNS.md`, `TESTING.md` |
| Encounters, monsters, or NPCs (incl. NPC statblocks, the pull panel, or adding an NPC to an encounter) | [Encounters](areas/encounters.md) | `DATA_MODEL.md`, `API_REFERENCE.md`, `UX_PATTERNS.md`, `TESTING.md` |
| The kid-facing app at `/play`, the curtain, fog, what the party has earned, or how the kid map draws rooms, doors, stairs, markers and names | [Players](areas/players.md) | `UX_PATTERNS.md`, `DESIGN_SYSTEM.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `TESTING.md`, then the plan |
| The kid map's colour language, the four families, or the kid palette solver | [Players](areas/players.md) | `DESIGN_SYSTEM.md`, `UX_PATTERNS.md`, then the plan; `scripts/generate-md3-tokens.mjs` stays DM-side and is not extended |
| Players, recovery profiles, or player spell/weapon rosters | [Players](areas/players.md) | `DATA_MODEL.md`, `API_REFERENCE.md`, `UX_PATTERNS.md`, `TESTING.md` |
| API route or client contract | Relevant area guide | `API_REFERENCE.md`, `ARCHITECTURE.md`, `TESTING.md` |
| Database schema, seed, import, or export | Relevant area guide; schema generation, migrations, and the deploy path are [Infra](areas/infra.md) | `DATA_MODEL.md`, `ARCHITECTURE.md`, `TESTING.md` |
| Shared UI, tokens, icons, or accessibility | [Design](areas/design.md) | `DESIGN_SYSTEM.md`, `ARCHITECTURE.md`, `UX_PATTERNS.md`, `TESTING.md` |
| Test tooling, fixtures, coverage, or CI | Relevant area guide, or [Infra](areas/infra.md) | `TESTING.md`, `ARCHITECTURE.md`, then the plan |

Implementation flows through the **Plan → Implement → Reconcile** workflow (see [../AGENTS.md](../AGENTS.md) and [PLAN_TEMPLATE.md](PLAN_TEMPLATE.md)): the planner writes a lean Plan at `plans/active/<feature>/<feature>.md` and compiles each stage into self-contained numbered work orders beside it; a small model executes one order per context window; then `reconcile` collapses the shipped orders into the Plan and updates any canonical reference whose contract changed. Area guides are durable routing documents, not plans. Historical documents are context only; they do not define current behavior.
