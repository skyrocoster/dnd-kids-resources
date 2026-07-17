# Documentation Manifest — D&D Kids Resources

This is the complete documentation inventory and task router. Read [../CLAUDE.md](../CLAUDE.md) first, then use this manifest instead of exploring source to find the smallest relevant context packet.

`../scratch/` is deliberately outside this inventory and documentation contract. AI must not explore it unless the user explicitly names a path there.

## Task Router

| Task | Area / current stage | Read first |
|---|---|---|
| Documentation maintenance | [Documentation Governance](areas/documentation.md) | `PLAN_TEMPLATE.md`, `scripts/check_docs.py`, `TESTING.md`, and existing GitHub workflow files |
| Visual consistency work | [Visual Design: VT4](plans/active/visual-consistency.md#vt4-final-design-pass-next-up) | `areas/visual-design.md`, `DESIGN_SYSTEM.md`, `ARCHITECTURE.md`, `TESTING.md` |
| Story threads, Loom storyline refactor, beats, or session nodes | [The Loom → PA0](plans/active/loom-storyline-refactor.md#pa0-schema-seeds-and-migration-foundation-next-up) | `areas/loom.md`, `DATA_MODEL.md`, `API_REFERENCE.md`, `TESTING.md` |
| Existing dungeon, encounter, monster, spell, or loot behavior | Its area guide | `ARCHITECTURE.md`, `API_REFERENCE.md`, `DATA_MODEL.md`, `TESTING.md`, then the guide's active plan |
| API route or client contract | Relevant area guide; create a focused plan if it has none | `API_REFERENCE.md`, `ARCHITECTURE.md`, `TESTING.md` |
| Database schema, seed, import, or export | Relevant area guide; create a focused plan if it has none | `DATA_MODEL.md`, `ARCHITECTURE.md`, `TESTING.md` |
| Shared UI, tokens, icons, or accessibility | [Visual Design](areas/visual-design.md) | `DESIGN_SYSTEM.md`, `ARCHITECTURE.md`, `TESTING.md` |
| Test tooling, fixtures, coverage, or CI | Relevant area guide; create a focused plan if it has none | `TESTING.md`, `ARCHITECTURE.md` |

An implementation must update its owning active execution plan and every exact reference document named by that plan's documentation-impact requirement. Area guides are durable routing documents, not plans. Each executable plan stage declares **Read first**, **Build**, **Inherits**, **Expected touch set**, **Documentation impact**, **Tests**, **Gate**, and **Completion edit**; `None` requires a specific reason. Before a stage ships, consolidate important discoveries into the plan's durable context and every affected future stage so a fresh executor does not rediscover confirmed facts; update canonical references for durable product contracts. Historical documents are context only; they do not define current behavior.

## Document Inventory

Authority: **Canonical** documents define current contracts. **Working** documents direct planned work. **Historical** documents record prior analysis or decisions and are not active facts. **Redirect** documents preserve links to moved material. **Template** documents define required form.

| Document | Type | Authority | Status | Read trigger | Update trigger |
|---|---|---|---|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Reference | Canonical | Active | Folder layout, request flow, registration, or conventions | A structural convention, route tree, or shared architecture changes |
| [API_REFERENCE.md](API_REFERENCE.md) | Reference | Canonical | Active | API methods, paths, parameters, schemas, or responses | An API contract changes |
| [DATA_MODEL.md](DATA_MODEL.md) | Reference | Canonical | Active | Tables, relationships, seeds, JSON storage, or database rebuilds | DDL, seed shape, importer, or exporter changes |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | Reference | Canonical | Active | Shared tokens, icons, visual primitives, or accessibility | A shared design contract changes |
| [TESTING.md](TESTING.md) | Reference | Canonical | Active | Commands, fixtures, coverage, or test locations | A test command, fixture topology, coverage gate, or CI contract changes |
| [README.md](README.md) | Manifest | Canonical | Active | Routing a task or locating documentation | Documentation inventory, routing, or plan status changes |
| [PLAN_TEMPLATE.md](PLAN_TEMPLATE.md) | Template | Canonical | Active | Creating, executing, or closing a plan | Plan execution or lifecycle requirements change |
| [areas/documentation.md](areas/documentation.md) | Area guide | Canonical | No active plan | Documentation contract or validator work | Documentation routing or validation changes |
| [areas/dungeons.md](areas/dungeons.md) | Area guide | Canonical | No active plan | Dungeon behavior | Dungeon ownership, source map, or active work changes |
| [areas/encounters.md](areas/encounters.md) | Area guide | Canonical | No active plan | Encounter behavior | Encounter ownership, source map, or active work changes |
| [areas/loot.md](areas/loot.md) | Area guide | Canonical | No active plan | Loot or item-bundle behavior | Loot ownership, source map, or active work changes |
| [areas/loom.md](areas/loom.md) | Area guide | Canonical | PA0 active | Story-thread (Loom) behavior | Loom ownership, source map, or active work changes |
| [areas/monsters.md](areas/monsters.md) | Area guide | Canonical | No active plan | Monster behavior | Monster ownership, source map, or active work changes |
| [areas/reference-catalogs.md](areas/reference-catalogs.md) | Area guide | Canonical | No active plan | Weapons, items, players, or NPCs | Catalog ownership, source map, or active work changes |
| [areas/spells.md](areas/spells.md) | Area guide | Canonical | No active plan | Spell behavior | Spell ownership, source map, or active work changes |
| [areas/visual-design.md](areas/visual-design.md) | Area guide | Canonical | VT4 active | Shared UI, tokens, shell, or accessibility | Visual routing or active work changes |
| [plans/active/visual-consistency.md](plans/active/visual-consistency.md#vt4-final-design-pass-next-up) | Execution plan | Working | VT4 next | Current visual consistency work | Its active stage ships or its declared docs change |
| [plans/active/loom-storyline-refactor.md](plans/active/loom-storyline-refactor.md#pa0-schema-seeds-and-migration-foundation-next-up) | Execution plan | Working | PA0 next | Loom storyline refactor (ordered Threads, beats, session nodes) | Its active stage ships or its declared docs change |
| [complete/loom-weavers-workspace.md](complete/loom-weavers-workspace.md) | Historical plan | Historical | Complete | Loom UI/UX pass implementation history | Do not update except to repair archival metadata |
| [complete/documentation-plan-closeout-correction.md](complete/documentation-plan-closeout-correction.md) | Historical plan | Historical | Complete | Plan closeout correction history | Do not update except to repair archival metadata |
| [complete/documentation-plan-template-workflow.md](complete/documentation-plan-template-workflow.md) | Historical plan | Historical | Complete | Plan-template workflow history | Do not update except to repair archival metadata |
| [Analysis/README.md](Analysis/README.md) | Archive index | Historical | Active | Tracing analysis or decision provenance | Analysis/archive organization changes |
| [Analysis/Decisions/spell_schema_decision.md](Analysis/Decisions/spell_schema_decision.md) | Decision | Historical | Accepted | Spell-contract provenance | Supersede with a new decision; do not edit past rationale |
| [Analysis/Decisions/monster_schema_decision.md](Analysis/Decisions/monster_schema_decision.md) | Decision | Historical | Accepted | Monster-contract provenance | Supersede with a new decision; do not edit past rationale |
| [Analysis/seed_spells_analysis.md](Analysis/seed_spells_analysis.md) | Analysis | Historical | Complete | Spell migration provenance | Do not update; add a new analysis if needed |
| [complete/design-system-dark-mode.md](complete/design-system-dark-mode.md) | Historical plan | Historical | Complete | Design-system migration provenance | Do not update; `DESIGN_SYSTEM.md` owns current facts |
| [complete/design_plan.md](complete/design_plan.md) | Archived plan | Historical | Complete | Shared-design implementation history | Do not update except to repair archival metadata |
| [complete/dungeon_plan.md](complete/dungeon_plan.md) | Archived plan | Historical | Complete | Dungeon implementation history | Do not update except to repair archival metadata |
| [complete/encounters_plan.md](complete/encounters_plan.md) | Archived plan | Historical | Complete | Encounter implementation history | Do not update except to repair archival metadata |
| [complete/loot_plan.md](complete/loot_plan.md) | Archived plan | Historical | Complete | Loot-system implementation history | Do not update except to repair archival metadata |
| [complete/monsters_plan.md](complete/monsters_plan.md) | Archived plan | Historical | Complete | Monster implementation history | Do not update except to repair archival metadata |
| [complete/phase-e-recovery-plan.md](complete/phase-e-recovery-plan.md) | Archived plan | Historical | Complete | Rebuild recovery history | Do not update except to repair archival metadata |
| [complete/seed_pipeline_fix_plan.md](complete/seed_pipeline_fix_plan.md) | Archived plan | Historical | Complete | Seed-pipeline repair history | Do not update except to repair archival metadata |
| [complete/spells_plan.md](complete/spells_plan.md) | Archived plan | Historical | Complete | Spell implementation history | Do not update except to repair archival metadata |
| [complete/v2-rebuild-plan.md](complete/v2-rebuild-plan.md) | Archived plan | Historical | Complete | v2 rebuild history | Do not update except to repair archival metadata |
| [complete/documentation_rework_plan.md](complete/documentation_rework_plan.md) | Archived plan | Historical | Complete | Documentation-contract implementation history | Do not update except to repair archival metadata |

## Entry Points

| File | Role |
|---|---|
| [../CLAUDE.md](../CLAUDE.md) | Single authoritative AI instruction source |
| [../AGENTS.md](../AGENTS.md) | AI entry pointer to `CLAUDE.md` |
| [../.github/copilot-instructions.md](../.github/copilot-instructions.md) | Copilot entry pointer to `CLAUDE.md` |
| [../README.md](../README.md) | Human project overview and link to this manifest |

## Validation

Run from the repository root:

```bash
.venv\Scripts\python.exe scripts/check_docs.py --check
.venv\Scripts\python.exe scripts/check_docs.py --check --base <base-ref>
```

On POSIX shells, use `.venv/bin/python` instead of `.venv\Scripts\python.exe`. The repo-local virtualenv is the preferred route for Python-backed validation so the documentation checker imports the project's installed backend dependencies rather than whichever global interpreter happens to be first on `PATH`.

GitHub Actions runs the `documentation-contract` workflow on every pull request and push to `main`; it must be enabled as a required branch-protection check in GitHub settings. The [PR template](../.github/pull_request_template.md) requires each author to confirm that a fresh reader can route the change to its owning plan and minimum context.
