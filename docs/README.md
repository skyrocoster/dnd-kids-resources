# Documentation Manifest — D&D Kids Resources

This is the documentation task router. The full documentation inventory (canonical docs, area guides, entry points, plan archive, and analysis records) is in [INVENTORY.md](INVENTORY.md). Use the router below to find the right area guide and context for your task.

Read [../CLAUDE.md](../CLAUDE.md) first, then use this manifest instead of exploring source to find the smallest relevant context packet. Use [../CONTEXT.md](../CONTEXT.md) for shared vocabulary; use the owning area guide for area-specific vocabulary and invariants.

`../scratch/` is deliberately outside this inventory and documentation contract. AI must not explore it unless the user explicitly names a path there.

Each `docs/plans/active/<feature>/` directory holds its Plan and the lean, disposable **work orders** compiled from that Plan's stages and deleted by `reconcile` once shipped. These are regenerated from source plans/maps; no manifest row needed. The Plan → Implement → Reconcile workflow and its five `.agents/skills/` skills are defined in [PLAN_TEMPLATE.md](PLAN_TEMPLATE.md) and [../CLAUDE.md](../CLAUDE.md).

## Task Router

| Task | Area / current stage | Read first |
|---|---|---|
| Documentation maintenance | [Infra](areas/infra.md) — [Table Testing Records](plans/active/table-testing-records/table-testing-records.md) next | `PLAN_TEMPLATE.md`, `scripts/check_docs.py`, `TESTING.md`, and existing GitHub workflow files |
| Designing or changing any UI surface | [Design](areas/design.md) | `UX_PATTERNS.md`, `DESIGN_SYSTEM.md`, the owning area guide's `## Surfaces` table |
| Visual consistency work | [Design](areas/design.md) — plan archived | `areas/design.md`, `DESIGN_SYSTEM.md`, `ARCHITECTURE.md`, `TESTING.md` |
| Story threads, Loom tapestry, beats, or session nodes | [Loom](areas/loom.md) | `areas/loom.md`, `DESIGN_SYSTEM.md`, `ARCHITECTURE.md`, `API_REFERENCE.md`, `DATA_MODEL.md`, `TESTING.md` |
| Existing dungeon, encounter, monster, spell, or loot behavior | Relevant area guide | `ARCHITECTURE.md`, `API_REFERENCE.md`, `DATA_MODEL.md`, `TESTING.md` |
| Wall kinds, map extent/padding, outside features, or map layer and density controls | [Dungeons](areas/dungeons.md) — [Dungeon Outside](plans/done/dungeon-outside/dungeon-outside.md) shipped | `UX_PATTERNS.md`, `DESIGN_SYSTEM.md`, `DATA_MODEL.md`, `TESTING.md`, then the plan |
| Map Lab editor/viewer chrome, canvas gestures, brushes, undo, or tablet layout | [Dungeons](areas/dungeons.md) — [Map Lab UX Pass](plans/done/maplab-ux-pass/maplab-ux-pass.md) shipped | `UX_PATTERNS.md`, `DESIGN_SYSTEM.md`, `TESTING.md`, then the archived plan for history |
| Spells, weapons, items, or loot | [Reference](areas/reference.md) — no active plan | `DATA_MODEL.md`, `API_REFERENCE.md`, `UX_PATTERNS.md`, `TESTING.md` |
| Encounters, monsters, or NPCs (incl. NPC statblocks, the pull panel, or adding an NPC to an encounter) | [Encounters](areas/encounters.md) — no active plan | `DATA_MODEL.md`, `API_REFERENCE.md`, `UX_PATTERNS.md`, `TESTING.md` |
| The kid-facing app at `/play`, the curtain, fog, or what the party has earned | [Players](areas/players.md) — [Player App Skeleton](plans/active/player-app-skeleton/player-app-skeleton.md) Stage 6 next | `UX_PATTERNS.md`, `DESIGN_SYSTEM.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `TESTING.md`, then the plan |
| Players, recovery profiles, or player spell/weapon rosters | [Players](areas/players.md) — no active plan | `DATA_MODEL.md`, `API_REFERENCE.md`, `UX_PATTERNS.md`, `TESTING.md` |
| API route or client contract | Relevant area guide | `API_REFERENCE.md`, `ARCHITECTURE.md`, `TESTING.md` |
| Database schema, seed, import, or export | Relevant area guide; schema generation, migrations, and the deploy path are [Infra](areas/infra.md) — [Production Nightly Deploys](plans/active/production-nightly-deploys/production-nightly-deploys.md) | `DATA_MODEL.md`, `ARCHITECTURE.md`, `TESTING.md` |
| Shared UI, tokens, icons, or accessibility | [Design](areas/design.md) — [Glossary Term Tooltips](plans/active/glossary-term-tooltips/glossary-term-tooltips.md) next | `DESIGN_SYSTEM.md`, `ARCHITECTURE.md`, `UX_PATTERNS.md`, `TESTING.md` |
| Test tooling, fixtures, coverage, or CI | Relevant area guide, or [Infra](areas/infra.md) | `TESTING.md`, `ARCHITECTURE.md`, then the plan |

Implementation flows through the **Plan → Implement → Reconcile** workflow (see [../CLAUDE.md](../CLAUDE.md) and [PLAN_TEMPLATE.md](PLAN_TEMPLATE.md)): Claude writes a lean Plan at `plans/active/<feature>/<feature>.md` and compiles each stage into self-contained numbered work orders beside it; a small model executes one order per context window; then `reconcile` collapses the shipped orders into the Plan and updates any canonical reference whose contract changed. Area guides are durable routing documents, not plans. Historical documents are context only; they do not define current behavior.
