# Documentation Governance Area Guide

> **Active plan:** [Docs Restructure](../plans/active/docs-restructure.md) — next up; then [Table Testing Records](../plans/active/table-testing-records.md).

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

- [Docs Restructure](../plans/active/docs-restructure.md) — re-cut the areas around pages, split every
  document by how often it is read, and replace the vague source maps with checker-enforced file
  coverage. Its Stage 2 retires this guide.
- [Table Testing Records](../plans/active/table-testing-records.md) — make a real session a first-class
  document type in `../table-tests/`, hook it to the plan workflow, and check it. Not next up.
- Create a focused plan before changing the contract, manifest format, templates, or validator behavior.

## Cross-references

`../README.md`, `../PLAN_TEMPLATE.md`, and `../../CLAUDE.md`.
