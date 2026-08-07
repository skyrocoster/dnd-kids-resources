# Documentation Manifest — D&D Kids Resources

This is the documentation task router. The full documentation inventory (canonical docs, area guides, entry points, plan archive, and analysis records) is in [INVENTORY.md](INVENTORY.md). Use the router below to find the right area guide and context for your task. It routes to areas, not to plans: which plans are in flight, what each is waiting on, and which areas each touches is the global active index's job — [plans/active/INDEX.md](plans/active/INDEX.md) is the sole queue/status view.

Read [../AGENTS.md](../AGENTS.md) first, then use this manifest instead of exploring source to find the smallest relevant context packet. Use the owning area guide for area-specific vocabulary and invariants.

`../scratch/` is deliberately outside this inventory and documentation contract. AI must not explore it unless the user explicitly names a path there.

Detailed master design plans under `master-plans/` define a cross-cutting destination and the small,
human-visible slices that may implement it. They are not execution status or implementation authority:
when a slice is selected, `to-plan` autonomously routes it either to direct quick delivery or a focused
Plan under `plans/active/`. Only focused Plans appear in the generated active index. A master plan's
slice delivery receipts preserve route-independent implementation and human-acceptance evidence without
becoming a queue. Create master plans with
[MASTER_PLAN_TEMPLATE.md](MASTER_PLAN_TEMPLATE.md).

Each `docs/plans/active/<feature>/` directory holds its Plan and the lean, disposable **work orders** compiled from that Plan's stages and deleted by `reconcile` once shipped. These are regenerated from source plans/maps; no manifest row needed. The Plan → Implement → Reconcile workflow and its `.opencode/skills/` entry points are defined in [PLAN_TEMPLATE.md](PLAN_TEMPLATE.md) and [../AGENTS.md](../AGENTS.md).

## Task Router

| Task | Area | Read first |
|---|---|---|
| Documentation maintenance | [Infra](areas/infra.md) | `PLAN_TEMPLATE.md`, `scripts/check_docs.py`, `TESTING.md`, and existing GitHub workflow files |
| Creating or refining a cross-cutting master plan | Relevant owning areas | `MASTER_PLAN_TEMPLATE.md`, related canonical references, and any existing master plan for the destination |
| Creating a focused Plan directly or from one master-plan slice | Relevant owning areas | `PLAN_TEMPLATE.md`, `plans/active/INDEX.md`, owning area guides, and the selected master plan when using `to-plan` |
| Running or recording a real session at the table | [Infra](areas/infra.md) | `TABLE_TESTING.md`, `docs/table-tests/_example/session-template.md`, then the plan the session serves |
| Capturing a candidate idea from table-testing evidence | [Infra](areas/infra.md) | `TABLE_TESTING.md`, then `ideas/README.md` and the example idea card |
| Designing or changing any UI surface | [Design](areas/design.md) | `UX_PATTERNS.md`, `DESIGN_SYSTEM.md`, the owning area guide's `## Surfaces` table |
| Planning cross-route DM layout work or compiling a frontend-layout slice | [Design](areas/design.md) | `UX_PATTERNS.md`, `DESIGN_SYSTEM.md`, `master-plans/frontend-layout-redesign.md`, then every owning area guide named by the slice |
| Visual consistency work | [Design](areas/design.md) | `areas/design.md`, `DESIGN_SYSTEM.md`, `ARCHITECTURE.md`, `TESTING.md` |
| Story threads, Loom tapestry, beats, or session nodes | [Loom](areas/loom.md) | `areas/loom.md`, `DESIGN_SYSTEM.md`, `ARCHITECTURE.md`, `API_REFERENCE.md`, `DATA_MODEL.md`, `TESTING.md` |
| Existing dungeon, encounter, monster, spell, or loot behavior | Relevant area guide | `ARCHITECTURE.md`, `API_REFERENCE.md`, `DATA_MODEL.md`, `TESTING.md` |
| Wall kinds, map extent/padding, outside features, or map layer and density controls | [Dungeons](areas/dungeons.md) | `UX_PATTERNS.md`, `DESIGN_SYSTEM.md`, `DATA_MODEL.md`, `TESTING.md`, then the plan |
| Map Lab editor/viewer chrome, canvas gestures, brushes, undo, or tablet layout | [Dungeons](areas/dungeons.md) | `UX_PATTERNS.md`, `DESIGN_SYSTEM.md`, `TESTING.md`, `master-plans/frontend-layout-redesign.md`, then archived Plans only for history |
| Map Lab tool palette and flyouts, editor vertical layout, fit/zoom framing, room finding, viewer rail, or rooms with no squares | [Dungeons](areas/dungeons.md) | `UX_PATTERNS.md`, `DESIGN_SYSTEM.md`, `TESTING.md`, `master-plans/frontend-layout-redesign.md`, then archived Plans only for history |
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

Implementation uses the smallest safe route described in [../AGENTS.md](../AGENTS.md) and [PLAN_TEMPLATE.md](PLAN_TEMPLATE.md). `create-plan` writes a focused Plan directly. For one selected master-plan slice, `to-plan` autonomously chooses direct `implement-quick` → `quick-reconcile` delivery or creates a focused Plan. Planned stages then use quick execution or self-contained work orders, followed by `reconcile`. Both reconcile routes update canonical references and the linked master-plan slice receipt. Area guides are durable routing documents, not plans. Historical documents are context only; they do not define current behavior.
