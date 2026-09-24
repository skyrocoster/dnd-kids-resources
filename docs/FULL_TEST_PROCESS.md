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
14. The production frontend build (`npm run build` from `frontend/`).
15. Storybook browser tests in Chromium (`npm run test:storybook` from `frontend/`), including story interactions.
16. The production Storybook build (`npm run build-storybook` from `frontend/`).
17. Every Playwright end-to-end spec in Chromium (`npm run test:e2e` from `frontend/`), stopping at the first
    failure.

Every child process has a finite timeout. The real-seed integration tests are part of the default pytest suite but
are read-only; they verify that every configured GET endpoint serializes the frozen production data without a 500.
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

Two narrow exceptions come from `AGENTS.md` and no others:

1. the local npm `EBADENGINE` warning when the installed Node version is outside the repository's Node 24 pin
   (the `engines` field in `frontend/package.json`);
2. the exact known Windows Storybook libuv teardown assertion, only after Storybook says the production build
   completed successfully.

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

Before the service preflight or any browser/E2E work, follow `docs/DEVELOPMENT_SERVICES.md`: reuse healthy shared
services, inspect logs before restarting an unhealthy service, and never start Uvicorn, Vite, or Storybook
directly — the services run under Docker Compose and `dev.ps1` manages them.

## Stack parity with the source repository

The runner itself is not ported yet: `src/tools/full_test_process.py` does not exist in this repository, although
the committed `test-fixer` agent and `.gitignore` already reference it and its `.stage-check/full-test/` state.
Porting the runner is the first step. Until then, the checks can be run manually in the order above, one at a
time, with the same fail-fast rules.

Other differences from the source stack, kept visible rather than silently dropped:

- Warning-as-error flags are policy, not repository defaults: `-W error` for pytest and `--max-warnings 0` for
  ESLint are not in `pyproject.toml` or `package.json` yet; the runner must add them, or the configs adopt them.
- The source stack enforced 500-line source and 700-line test limits; this repository has no equivalent check.
  Adopt one deliberately or consciously skip it — do not assume either.
- The source stack ran Vitest API tests against the real backend service; no check here drives the live services.
  The Playwright specs start their own Vite server with controlled API responses, so the `dev.ps1 status`
  preflight currently guards the shared stack without any later check depending on it. Adding real-backend
  coverage is the remaining convergence step.
- `AGENTS.md` does not yet record the two accepted warnings above; record them there so the policy has the
  authoritative home the `test-fixer` agent already points to.
- This repository keeps two checks the source inventory lacked: `pip-audit` and oxlint.
