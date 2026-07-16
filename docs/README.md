# Documentation Manifest — D&D Kids Resources

This is the complete documentation inventory and task router. Read [../CLAUDE.md](../CLAUDE.md) first, then use this manifest instead of exploring source to find the smallest relevant context packet.

## Task Router

| Task | Owning plan / current stage | Read first |
|---|---|---|
| Documentation maintenance | Create a focused active plan | `PLAN_TEMPLATE.md`, `scripts/check_docs.py`, `TESTING.md`, and existing GitHub workflow files |
| Visual consistency work | [visual_consistency_plan.md: VF0](visual_consistency_plan.md#vf0-foundation-scaffolding-next-up) | `visual_consistency_plan.md`, `DESIGN_SYSTEM.md`, `ARCHITECTURE.md`, `TESTING.md` |
| Existing dungeon, encounter, monster, spell, or loot behavior | Its listed feature plan, if applicable | `ARCHITECTURE.md`, `API_REFERENCE.md`, `DATA_MODEL.md`, `TESTING.md`, then the feature plan |
| API route or client contract | A focused active plan, creating one if absent | `API_REFERENCE.md`, `ARCHITECTURE.md`, `TESTING.md` |
| Database schema, seed, import, or export | A focused active plan, creating one if absent | `DATA_MODEL.md`, `ARCHITECTURE.md`, `TESTING.md` |
| Shared UI, tokens, icons, or accessibility | A focused active plan, creating one if absent | `DESIGN_SYSTEM.md`, `ARCHITECTURE.md`, `TESTING.md` |
| Test tooling, fixtures, coverage, or CI | A focused active plan, creating one if absent | `TESTING.md`, `ARCHITECTURE.md` |

An implementation must update its owning plan and every exact reference document named by that plan's documentation-impact requirement. Each executable plan stage declares **Read first**, **Expected touch set**, **Documentation impact**, **Tests**, **Gate**, and **Completion edit**; `None` requires a specific reason. Historical documents are context only; they do not define current behavior.

## Document Inventory

Authority: **Canonical** documents define current contracts. **Working** documents direct planned work. **Historical** documents record prior analysis or decisions and are not active facts. **Redirect** documents preserve links to moved material. **Template** documents define required form.

| Document | Type | Authority | Status | Read trigger | Update trigger |
|---|---|---|---|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Reference | Canonical | Active | Folder layout, request flow, registration, or conventions | A structural convention, route tree, or shared architecture changes |
| [API_REFERENCE.md](API_REFERENCE.md) | Reference | Canonical | Active | API methods, paths, parameters, schemas, or responses | An API contract changes |
| [DATA_MODEL.md](DATA_MODEL.md) | Reference | Canonical | Active | Tables, relationships, seeds, JSON storage, or database rebuilds | DDL, seed shape, importer, or exporter changes |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | Reference | Canonical | Active | Shared tokens, icons, visual primitives, or accessibility | A shared design contract changes |
| [TESTING.md](TESTING.md) | Reference | Canonical | Active | Commands, fixtures, coverage, or test locations | A test command, fixture topology, coverage gate, or CI contract changes |
| [PLAN_TEMPLATE.md](PLAN_TEMPLATE.md) | Template | Canonical | Active | Creating, executing, or closing a plan | Plan execution or lifecycle requirements change |
| [documentation_rework_plan.md](documentation_rework_plan.md) | Redirect | Redirect | Complete | Following documentation-contract history | Only if the archived target moves again |
| [visual_consistency_plan.md](visual_consistency_plan.md) | Plan | Working | VF0 next | Cross-cutting visual consistency work | Its active stage ships or its declared docs change |
| [dungeon_plan.md](dungeon_plan.md) | Redirect | Redirect | Complete | Following legacy dungeon-plan links | Only if the archived target moves again |
| [encounters_plan.md](encounters_plan.md) | Redirect | Redirect | Complete | Following legacy encounter-plan links | Only if the archived target moves again |
| [monsters_plan.md](monsters_plan.md) | Redirect | Redirect | Complete | Following legacy monster-plan links | Only if the archived target moves again |
| [spells_plan.md](spells_plan.md) | Redirect | Redirect | Complete | Following legacy spell-plan links | Only if the archived target moves again |
| [design_plan.md](design_plan.md) | Redirect | Redirect | Complete | Following legacy design-plan links | Only if the archived target moves again |
| [loot_plan.md](loot_plan.md) | Redirect | Redirect | Complete | Following legacy loot-plan links | Only if the archived target moves again |
| [spell_schema_decision.md](spell_schema_decision.md) | Decision | Historical | Accepted | Spell-contract provenance | Supersede with a new decision; do not edit past rationale |
| [monster_schema_decision.md](monster_schema_decision.md) | Decision | Historical | Accepted | Monster-contract provenance | Supersede with a new decision; do not edit past rationale |
| [seed_spells_analysis.md](seed_spells_analysis.md) | Analysis | Historical | Complete | Spell migration provenance | Do not update; add a new analysis if needed |
| [personal ideas.md](personal%20ideas.md) | Ideas | Historical | Backlog | Considering unplanned product work | Promote an approved item into a focused plan |
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
python scripts/check_docs.py --check
python scripts/check_docs.py --check --base <base-ref>
```

GitHub Actions runs the `documentation-contract` workflow on every pull request and push to `main`; it must be enabled as a required branch-protection check in GitHub settings. The [PR template](../.github/pull_request_template.md) requires each author to confirm that a fresh reader can route the change to its owning plan and minimum context.
