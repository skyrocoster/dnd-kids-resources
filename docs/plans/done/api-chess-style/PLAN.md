# API Chess-style migration - backend and frontend APIs match ChessMoveTrainer handling

> **Status:** done - all six stages accepted; LAN CORS origin retained by user decision.

- **Read trigger:** before implementing any stage of this migration.
- **Upstream:** user API review 2026-09-23 (`F:\DND\Kids Resources` vs `G:\ChessMoveTrainer\`); `docs/tooling-parity-chess-move-trainer.md` for the shared tooling baseline. That doc's note excluding TanStack Query as Chess-app-only is superseded for this migration by the user's explicit install confirmation.

## Outcome

Every API endpoint in this repo is declared, typed, cached, and consumed the way ChessMoveTrainer does it: explicit `operation_id` on each route, structured `{code, message}` errors, a `create_app()` factory with tight CORS, `cachetools` read caching, a checked-in `openapi.json` contract, a generated TypeScript SDK as the only frontend client, and guard tests that keep it that way. This removes the hand-written fetch wrapper and hand-mirrored types that can drift from the backend.

## Scope

- **Included:** route declarations (`operation_id`, error shape, app factory, CORS, DB-path injection), read caching, the checked-in OpenAPI contract plus generated SDK, frontend adoption of the generated client with canonical query keys and guard tests.
- **Expected areas:** `backend/app/routers/*.py`, `backend/app/main.py`, `backend/app/schemas/*.py`, `backend/app/db.py`, `backend/requirements.txt`, `frontend/openapi-ts.config.ts`, `frontend/src/api/**`, `frontend/package.json`.
- **Excluded:** Chess domain libraries (`chess`, SQLAlchemy, numpy/pandas/scipy/statsmodels, typer, `chess.js`, `react-chessboard`, FullCalendar, headless-tree, and similar); pagination reshape (`limit`/`offset` to `page`/`page_size` — breaking change, needs its own decision); production CORS tightening (would drop the LAN origin `http://192.168.1.175:5173` the table setup uses); new endpoints such as `GET /api/health`; any visual or UI change. The worktree already holds 100+ unrelated changes — preserve them and do not commit unless asked.

## Stages

1. **done** - Pin and install the three API-style packages and establish the contract workflow.
2. **done** - Backend slice 1: explicit `operation_id` on all 96 route decorators; hide the SPA catch-all from the schema; re-export and regenerate.
3. **done** - Backend slice 2: structured per-feature error responses (`{code, message}` with `Literal` codes, `responses={...}` on each route) instead of plain `HTTPException(detail=...)` strings.
4. **done** - Backend slice 3: `create_app()` factory, `Depends`-injected DB path, `strict=True` on `StrictModel`.
5. **done** - Backend slice 4: read caching for safe repeated GETs following the Chess `caching.py` pattern (`TTLCache` namespaces, single-flight, write invalidation).
6. **done** - Frontend adoption: central `client.ts` over the generated SDK with `VITE_API_BASE_URL`, canonical `queryKeys`/`queryInvalidation`, guard tests (`generatedSurface`, `noAdoption`, live `healthClient`-style), then retire the hand-written fetch wrapper feature by feature.

Every stage has ordered actions, focused proof, an escalation boundary, and any human or visual breakpoint. Stages are sequential; no parallel stages. A passing proof item remains valid until a later change affects its command, inputs, exercised behavior, configuration, dependencies, or environment; later stages run only missing or invalidated proof.

## Progress and decisions

- **Stage 1:** done - proof: `.venv/Scripts/python.exe -c "import cachetools"` prints `7.2.0`; `npm ls` shows `@tanstack/react-query@5.103.1` and `@hey-api/openapi-ts@0.99.0`; `npm run generate:api` emits the SDK; `openapi.json` holds 54 paths; breakpoint: none.
- **Stage 2:** done - 96 unique API operation IDs, no non-API schema paths, and regenerated SDK exports `listSpells`/`getSpell`; `timeout 180s .venv/Scripts/python.exe -m pytest backend/tests/test_openapi_contract.py -q --no-cov` passed (repo root, tool timeout 200000 ms; focused run needs coverage override). Contract export and `timeout 150s npm run generate:api` passed (frontend, tool timeout 180000 ms). No breakpoint.
- **Stage 3:** done - focused router and contract tests passed for documented 400/404/409/422 domain errors (repo root, `timeout 180s ... pytest ... -q --no-cov`, tool timeout 200000 ms); OpenAPI export and SDK generation passed (frontend generation tool timeout 180000 ms). Scope correction: the schema-excluded `/api/{full_path}` fallback now also emits `{code, message}`; focused `backend/tests/test_api_errors.py` passed, 3 tests (repo root, command timeout 180s, tool timeout 200000 ms). Built-in request-validation 422 retains FastAPI's `detail` body. No breakpoint.
- **Stage 4:** done - user approved retaining `http://192.168.1.175:5173`; factory, DB-path override, strict-model, CORS and affected route tests passed (`timeout 180s .venv/Scripts/python.exe -m pytest backend/tests/test_app_factory.py backend/tests/test_main.py backend/tests/test_db_helpers.py -q --no-cov` and `timeout 180s .venv/Scripts/python.exe -m pytest backend/tests/routers backend/tests/test_api_errors.py backend/tests/test_openapi_contract.py -q --no-cov`, repo root, tool timeout 200000 ms). OpenAPI output matched checked-in contract, so no regeneration needed.
- **Stage 5:** done - all 41 router GET handlers use bounded, per-DB TTL caches with single-flight; focused tests prove cache hits, argument and DB-path isolation, successful-write invalidation, and concurrency. `timeout 180s .venv/Scripts/python.exe -m pytest backend/tests/test_caching.py backend/tests/test_app_factory.py backend/tests/test_api_errors.py backend/tests/test_openapi_contract.py backend/tests/routers -q --no-cov` passed (repo root, tool timeout 200000 ms). No breakpoint; external DB edits may remain stale until the 60-second TTL expires.
- **Stage 6:** done - user approved switching every feature. All production API requests now pass through the generated-SDK-backed central client; guard tests passed (10 passed, 1 skipped). Feature-focused run passed 1,261 tests with one spell-audit Windows-path failure; after a path-specific repair, that audit and the client tests passed together (9 tests; `timeout 180s npm run test -- src/features/spells/__tests__/SpellContract.audit.test.ts src/api/__tests__/client.test.ts`, frontend, tool timeout 200000 ms). A live generated-client test against an isolated, bounded FastAPI server passed (`VITE_LIVE_API_TEST=1 VITE_API_BASE_URL=http://127.0.0.1:18765 timeout 180s npm run test -- src/api/__tests__/healthClient.test.ts`, frontend, tool timeout 200000 ms); server stopped afterward. No UI changes or new health endpoint.

## Proof

- `timeout 60s .venv/Scripts/python.exe -c "import cachetools; print(cachetools.__version__)"` (bash-tool timeout 30000 ms).
- `npm ls @tanstack/react-query @hey-api/openapi-ts --depth=0` in `frontend/` (bash-tool timeout 60000 ms).
- `timeout 60s .venv/Scripts/python.exe -c "import json; from pathlib import Path; from backend.app.main import app; out=Path('frontend/src/api/generated/openapi.json'); out.parent.mkdir(parents=True, exist_ok=True); out.write_text(json.dumps(app.openapi(), indent=2)+chr(10), encoding='utf-8')"` (bash-tool timeout 60000 ms).
- `npm run generate:api` in `frontend/` (bash-tool timeout 180000 ms).
- `.venv/Scripts/python.exe -m pytest backend/tests -q` from the repo root (bash-tool timeout 300000 ms; add `--no-cov` only if the 97% coverage gate, not a test, fails).
- `npm run test --workspace frontend` equivalent already configured here is `npm run test` in `frontend/` (bash-tool timeout 300000 ms) once guard tests exist.

## Escalation boundaries

- Pagination reshape (`limit`/`offset` to Chess-style `page`/`page_size`/`total`/`total_pages`/`has_next`) — changes every list response shape; separate user decision.
- Production CORS tightening — drops the LAN origin the table setup relies on; separate user decision.
- New endpoints (for example `GET /api/health`) — new product surface, not style alignment.
- New dependencies beyond the three pinned here (`cachetools==7.2.0`, `@tanstack/react-query@5.103.1`, `@hey-api/openapi-ts@0.99.0`).
- Committing, pushing, or any destructive git operation.

## Visible result

> The API list, its errors, and its frontend calls all follow the ChessMoveTrainer pattern, proven by the generated client and guard tests.
