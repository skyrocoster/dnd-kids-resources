# Domain Docs — Single Context

This repository uses a **single-context** layout:

- **CONTEXT.md** — one root file at the repo root
- **Architecture decisions** — `docs/adr/` directory (one ADR per file, named `NNNN-title.md`)

## Consumer rules

Skills and agents read CONTEXT.md as the authoritative reference for:
- Architecture and design decisions
- Data models and schemas
- API contracts
- Testing strategy and conventions
- Deployment and infrastructure

When you change an architecture, contract, or design, update or create an ADR in `docs/adr/` and summarize the change in CONTEXT.md.

## Next step

Create a root `CONTEXT.md` file with sections for:
- Architecture overview
- Data models
- API contracts
- Testing and verification
- Deployment

See the repo's own CLAUDE.md and the documentation manifest (docs/README.md) for domain-specific guidance.
