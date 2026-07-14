# Repository Guidelines

This file defers to `CLAUDE.md`. Read `CLAUDE.md` first; if anything here conflicts with it, follow `CLAUDE.md`.

## Project Structure & Module Organization

The application has a React/TypeScript frontend in `frontend/src/` and a FastAPI backend in `backend/app/`. Frontend pages are grouped by domain under `frontend/src/features/`; shared UI belongs in `components/`, API bindings in `api/`, and global styling in `theme.css`. Backend endpoints live in `backend/app/routers/`, with schemas and database helpers alongside them. Tests mirror these areas in `frontend/src/**/__tests__/` and `backend/tests/`. Treat `data/seeds/` as the canonical data source; the root SQLite database is generated and must not be committed. Use `docs/` for architecture, API, data-model, and active planning material; `archive/` is retained legacy tooling, not current application code.

## Build, Test, and Development Commands

- `python scripts/init_database.py` then `python scripts/seed_database.py`: rebuild the local database from frozen seeds.
- `cd backend; uvicorn app.main:app --reload`: run the API at `http://localhost:8000`.
- `cd frontend; npm install; npm run dev`: install dependencies and start Vite at `http://localhost:5173`.
- `pytest`: run backend tests from the repository root and enforce 90% coverage.
- `cd frontend; npm run test`: run the Vitest suite once.
- `cd frontend; npm run lint`: run Oxlint.
- `cd frontend; npm run build`: type-check with project references and create the production bundle. Use `npm run typecheck`, not `tsc --noEmit`, for a type-only gate.

## Coding Style & Naming Conventions

Follow existing local patterns: four-space indentation and `snake_case` for Python; two-space indentation, `camelCase` identifiers, and `PascalCase` React components/types for TypeScript. Name component files after their exported component (for example, `SearchList.tsx`) and colocate matching CSS and tests. Keep routers domain-focused and use typed request/response schemas. Reuse design tokens from `frontend/src/theme.css` rather than hard-coded colors.

## Testing Guidelines

Name Python tests `test_*.py` and frontend tests `*.test.ts` or `*.test.tsx`. New endpoints need happy-path and error-branch unit tests; endpoints returning seeded data must also participate in the real-data integration sweep. Run a focused backend test with `pytest path/to/test.py --no-cov`; run integration tests with `pytest -m integration --no-cov`. Do not duplicate production SQL schema in fixtures.

## Commit & Pull Request Guidelines

Recent history uses imperative, stage-prefixed subjects such as `Stage H4: Map Lab design pass`. Keep commits independently verifiable and include related plan/reference-document updates in the same commit. Pull requests should summarize behavior, list test/build commands run, link the relevant issue or plan stage, and include screenshots for visible UI changes. Never commit databases, logs, PID files, `.env`, `node_modules/`, or `frontend/dist/`.
