# Documentation Governance Area Guide

> **Active plan:** None.

## Scope

Owns the documentation contract, task routing, plan lifecycle, and documentation validation tooling. It does not own product behavior or canonical API/data/design contracts.

## Read first

`../../CLAUDE.md`, `../README.md`, `../PLAN_TEMPLATE.md`, `../TESTING.md`, and `../../scripts/check_docs.py`.

## Source map

- Contract: `../../CLAUDE.md` and `../PLAN_TEMPLATE.md`.
- Manifest: `../README.md`.
- Validator: `../../scripts/check_docs.py`.
- Automation: `.github/` workflow and pull-request template files.

## Invariants

- Area guides route work but never authorize implementation by themselves.
- Only an active execution plan authorizes implementation work; completed plans are historical records.

## Work queue

- Create a focused plan before changing the contract, manifest format, templates, or validator behavior.

## Cross-references

`../README.md`, `../PLAN_TEMPLATE.md`, and `../../CLAUDE.md`.
