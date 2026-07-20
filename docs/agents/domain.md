# Domain Docs — Scoped Context

This repository uses a **scoped-context** layout:

- **CONTEXT.md** — one root file at the repo root for shared, cross-area vocabulary only
- **Area guides** — `docs/areas/*.md` files for area-specific vocabulary, ownership, source maps, invariants, and active-plan routing
- **Architecture decisions** — `docs/adr/` directory (one ADR per file, named `NNNN-title.md`)

## Consumer rules

Skills and agents read `CONTEXT.md` as the authoritative reference for shared repo vocabulary. They read the owning area guide for area-specific terms and invariants before exploring source. The task router in `docs/README.md` defines the minimum reference packet for each task.

Canonical references remain authoritative for contract facts:

- `docs/ARCHITECTURE.md` for structure, request flow, registration, and conventions
- `docs/API_REFERENCE.md` for API methods, paths, parameters, schemas, and responses
- `docs/DATA_MODEL.md` for tables, relationships, seeds, JSON storage, and database rebuilds
- `docs/DESIGN_SYSTEM.md` for shared tokens, icons, visual primitives, and accessibility
- `docs/TESTING.md` for commands, fixtures, coverage, and CI

When you change architecture, a contract, or design, update the owning canonical reference. If the change records a durable decision, update or create an ADR in `docs/adr/`. Summarize only cross-area vocabulary changes in `CONTEXT.md`; summarize area-specific vocabulary changes in the owning area guide.

## Next step

Keep root `CONTEXT.md` short. If a term only matters inside one product area, move it to that area guide instead of expanding the root context file.
