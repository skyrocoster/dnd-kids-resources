# Repo Infra Area Guide

> **Active plan:** [Backend Test Coverage](../plans/active/backend-test-coverage.md).

## Scope

Owns work that is generic to the repository rather than owned by one product area: shared backend
infrastructure (`backend/app/db.py`, `backend/app/main.py`), cross-cutting test coverage and test
tooling, and other repo-wide plumbing that does not belong to a single feature's area guide. It does
not own any product behavior, API contract, or data model — those stay with their owning area guide.

## Read first

`../TESTING.md`, `../ARCHITECTURE.md`, and `../README.md`.

## Source map

- Backend infra: `backend/app/db.py`, `backend/app/main.py`.
- Tests: `backend/tests/` broadly, plus `pytest.ini`.

## Invariants

- This guide never claims ownership of a router or feature that already has an owning area guide;
  it only covers what's genuinely cross-cutting or otherwise homeless.
- Create a focused plan before repo-wide tooling or coverage work.

## Work queue

- Create a focused plan before changing shared backend infra or repo-wide test tooling.

## Cross-references

`../TESTING.md` and `../README.md`.
