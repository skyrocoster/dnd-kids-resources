# Full test and repair process

This is the repository's complete local maintenance run. It is deliberately different from focused feature
proof: it runs all currently defined tests, builds, and quality checks, stops at the first problem, and remembers
where to continue after that problem is fixed.

The OpenCode primary agent for this job is **`test-fixer`** (`.opencode/agents/test-fixer.md`). It works alone and
cannot invoke subagents or create Plans.

## Start or resume

Run from the repository root with the project virtual environment:

```bash
# Show the authoritative ordered inventory without running it.
.venv/Scripts/python.exe src/tools/full_test_process.py --list

# Start at check 1, or automatically resume at the remembered failure.
.venv/Scripts/python.exe src/tools/full_test_process.py
```

The runner writes ignored, machine-local state under `.stage-check/full-test/` (already listed in `.gitignore`):

- `state.json` identifies the next check. It points to the running check before that process starts, so an
  interruption safely reruns that check.
- `latest-failure.log` contains the complete stdout and stderr for the first failed check.

On a failure, fix that one issue and run the same command again. The failed check runs again; after it passes, the
remaining checks continue. A completed run deletes the checkpoint and failure log.

Use these controls only when needed:

```bash
# Deliberately discard progress and start at check 1.
.venv/Scripts/python.exe src/tools/full_test_process.py --fresh

# Restart at one exact or uniquely matching check after a fix invalidates earlier proof.
.venv/Scripts/python.exe src/tools/full_test_process.py --from "Ruff lint"
```

If the check inventory changes while a checkpoint exists, the runner rejects the old checkpoint and starts from
check 1.

## Ordered inventory

The `--list` output is authoritative. The process currently covers:

1. Docker Compose configuration parsing (`docker compose config --quiet`).
2. Installed Python dependency integrity (`pip check`).
3. `pip-audit` against `backend/requirements.txt`, as documented in the README.
4. The complete installed npm dependency tree (`npm ls --all` from `frontend/`).
5. Ruff lint (`.venv/Scripts/python.exe -m ruff check backend`).
6. Ruff formatting (`.venv/Scripts/python.exe -m ruff format --check backend`).
7. Prettier formatting (`npm run format:check` from `frontend/`).
8. oxlint (`npm run lint` from `frontend/`).
9. ESLint with zero warnings allowed (`npm run lint:eslint -- --max-warnings 0` from `frontend/`).
10. TypeScript project checking (`npm run typecheck` from `frontend/`).
11. All Python tests under `backend/tests` with `.venv/Scripts/python.exe -m pytest`, including the read-only
    integration tests against the frozen `data/seeds/*.json`, with Python warnings converted to errors, pytest
    stopping at its first failure, and the 97% coverage gate from `pyproject.toml`.
12. Frontend Vitest unit tests (`npm test` from `frontend/`), stopping at the first failure.
13. Shared development-service health through `dev.ps1 status`.
14. Frontend real-backend API tests (`npm run test:api -- --bail 1` from `frontend/`). This entrypoint creates a
    temporary SQLite database and starts a bounded Uvicorn process; it does not test the persistent Compose database.
15. The production frontend build (`npm run build` from `frontend/`).
16. Storybook browser tests in Chromium (`npm run test:storybook` from `frontend/`), including story interactions.
17. The production Storybook build (`npm run build-storybook` from `frontend/`).
18. Every Playwright end-to-end spec in Chromium (`npm run test:e2e` from `frontend/`), stopping at the first
    failure.

Every child process has a finite timeout. The real-seed integration tests are part of the default pytest suite;
they build a temporary SQLite database from the frozen seed files and check GET serialization without a 500. They
do not connect to the persistent campaign database.
The full process does not install optional external scanners, refresh generated seed exports or schema manifests,
commit changes, or add CI. Those are separate operations rather than repository-defined test commands.

## Failure and warning policy

The runner stops immediately for:

- a nonzero exit;
- a timeout;
- warning output, even when the command exits successfully.

Pytest runs with `-W error`, ESLint runs with `--max-warnings 0`, and pytest, Vitest, and Playwright use their
fail-fast options. The runner also scans stdout and stderr so successful builds cannot silently leave warnings
behind. The full process treats every test as required to pass; it does not consult
`frontend/known-test-failures.json` — that known-failure list is a work-order tool, not a carve-out for this run.

The runner implements two narrow warning exceptions and no others:

1. the local npm `EBADENGINE` warning when the installed Node version is outside the repository's Node 24 pin
   (the `engines` field in `frontend/package.json`);
2. the exact known Windows Storybook libuv teardown assertion, only after Storybook says the production build
   completed successfully.

For the Storybook production-build check, that same success marker also allows the matching teardown assertion to
exit nonzero, but only when no other warning was found.
These exceptions are implemented in `src/tools/full_test_process.py`; they are not documented in `AGENTS.md`.
Do not suppress a new warning. Repair its cause. Do not skip, weaken, or delete a valid test to move the
checkpoint.

## Repair loop and proof

1. Run the process until it stops.
2. Read the terminal output and, if needed, `latest-failure.log`.
3. Repair only the first failure or warning.
4. Run the same command to resume at that check.
5. If the repair could affect a previously passed check, use `--from` with the earliest affected check. For
   example, changing Python source after Ruff passed invalidates the Ruff checks; changing only a Storybook story
   does not invalidate Python tests.
6. Finish only when the runner prints `PASS complete full-test process` against the final worktree.

Before the service preflight or browser/E2E work, follow `docs/DEVELOPMENT_SERVICES.md`: reuse healthy shared
services and inspect logs before restarting an unhealthy service. Playwright can reuse an existing backend at
port 8000, or start a short-lived host Uvicorn process if none is available; its app profile also starts or reuses
Vite at 5173, and the complete run starts or reuses Storybook at 6006. Do not manually start competing processes.
The health E2E spec calls the live backend through Vite's `/api` proxy. Weapon CRUD E2E specs intercept the API
and do not prove database writes.

## Coverage boundaries and policy ownership

The runner in `src/tools/full_test_process.py` is the authoritative 18-check inventory. Its API check (`test:api`)
uses its own temporary database and bounded Uvicorn process, not the shared persistent service. The browser suite
does use a real backend for its health request, but weapon CRUD routes are intercepted; neither pass proves
persistent-database write behavior, pagination completeness, or nested player-spell response values.

Other maintenance checks in the inventory:

- The source stack enforced 500-line source and 700-line test limits; this repository has no equivalent check.
  Adopt one deliberately or consciously skip it — do not assume either.
- This repository keeps two checks the source inventory lacked: `pip-audit` and oxlint.

Warning-exception policy is encoded in the runner; long-term documentation ownership remains unresolved. Do not
alter the exceptions or assign a policy owner as part of correcting this guide.
