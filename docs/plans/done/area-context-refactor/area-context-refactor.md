# Area Context Refactor — Keep AI context scoped by ownership

> **Status:** Complete. Root context now holds only shared vocabulary; area-specific vocabulary lives in the owning area guides.

- **Area guide:** [Documentation Governance](../areas/documentation.md)

## What We Built & Why

`CONTEXT.md` had become a monolithic glossary covering every product area, which forced fresh AI contexts to ingest unrelated terms before routing to the owning work area. The refactor keeps the root file useful as shared context while moving domain vocabulary to the durable area guides already used by `docs/README.md`.

This preserves the existing documentation-router model: global context is small, area guides carry ownership and area-specific facts, and canonical references continue to own architecture, API, data, design, and testing contracts.

## Stages

1. Split glossary terms by area ownership.
2. Update the documentation contract so future agents keep root context small.

## Shipped

| Stage | What shipped |
|-------|--------------|
| Context split | Moved spell, monster, reference catalog, loot, encounter, Loom, dungeon, and Map Lab vocabulary from root `CONTEXT.md` into the owning area guides. |
| Contract update | Updated `CLAUDE.md`, `docs/agents/domain.md`, and `docs/README.md` to define scoped context and list root `CONTEXT.md` in the documentation inventory. |
