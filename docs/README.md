# Documentation — D&D Kids Resources

Documentation hub. Start with **Reference docs** if you're about to build or plan a feature; check **Feature plans** for current stage status.

## Reference Docs

Read these first to understand code structure, API surface, and data organization:

| Doc | What it covers |
|---|---|
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | Backend/frontend folder structure, conventions (no models/ or services/ layer, Browser/View/Editor/Model pattern), request flow |
| **[API_REFERENCE.md](API_REFERENCE.md)** | Endpoint inventory per router (method, path, purpose, schema names); how to add a new endpoint |
| **[DATA_MODEL.md](DATA_MODEL.md)** | Seed files, table relationships, JSON-encoded columns, how to rebuild the database |
| **[TESTING.md](TESTING.md)** | Test pass/fail contract (pytest + vitest commands, coverage gate ≥85%, where test files live) |

## Feature Plans

Each feature is documented in its own `*_plan.md` file with staged, self-contained implementation phases:

| Doc | Feature | Status |
|---|---|---|
| **[dungeon_plan.md](dungeon_plan.md)** | Dungeon room navigation, Encounter Runner, NPC Dossier, Map Lab (foundation, authoring, unified data, zoom) | All phases shipped; next design pass phase queued |
| **[encounters_plan.md](encounters_plan.md)** | Encounters feature expansion | Phase 1 complete; Phase 2/3 queued |

When asked to "do the next step," find the appropriate `*_plan.md`, read its current/next stage section, and follow its specification. Stages are sequenced so later ones build on earlier ones without re-deriving prior work.

## Archived / Superseded Docs

See `[complete/](complete/)` for finished plan docs that no longer apply (e.g., `phase-e-recovery-plan.md`, `v2-rebuild-plan.md`). The `v1` app is preserved on the `v1-archive` git branch.

## Quick Links

- **Project overview:** [../README.md](../README.md)
- **AI assistant guidance (CLAUDE.md):** [../CLAUDE.md](../CLAUDE.md) — read this for workflow, testing, and reference-doc pointers
- **Design tokens (Material Design 3):** See `dungeon_plan.md` § "Design system in force"
