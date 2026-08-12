# Browser Validation Harness — repeatable, isolated browser evidence

> **Status:** Not started. One ordered stage remains: implement and prove the repository-owned browser-validation harness.

- **Areas:** infra
- **Read trigger:** Reusable browser validation, Playwright evidence capture, or experimental validator/executor browser contracts

## What we're building & why

Replace improvised server and Playwright commands with one repository-owned Python invocation for the
initial fixed `monster-printing` scenario. Each run owns isolated backend/frontend processes, ports,
browser profile, lock, and artifacts, and reports machine-readable infrastructure versus product outcomes.

The runner uses the repository venv's installed Python Playwright package, not the Playwright MCP server.
The MCP server remains agent-only tooling for independent live verification. Future scenario addition is
the sole open decision; this work creates no scenario plugin, registry, DSL, or extensibility architecture.

## Stages

1. **Implement and prove the browser-validation harness.** `ORDERED` — deliver the fixed scenario, owned
   lifecycle, evidence/result contract, focused tests, enforceable read-guard arming, experimental agent
   and skill contract updates, documentation, and final automated/live proof as one coherent stage.

## Shipped
| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|

## Touches

- `scripts/read_guard.py`
- `.opencode/plugin/read-guard.js`
- `.opencode/agents/browser-automation-luna.md`
- `.opencode/agents/coordinator-test-validator.md`
- `.opencode/agents/coordinator-test-quick-executor.md`
- `.opencode/skills/assess-case-test/SKILL.md`
- `.opencode/skills/deliver-direct-test/SKILL.md`
- `.opencode/skills/coordinator-test-workflow/SKILL.md`
- `frontend/vite.config.ts`
- `docs/areas/infra.md`
- `docs/TESTING.md`
- `backend/tests/test_read_guard.py`
- `docs/plans/active/browser-validation-harness/browser-validation-harness.md`

## Compiler handoff

### Stage 1

- **Verified edit sites:** `scripts/read_guard.py` — `ARMING_SKILLS`, normalized path handling, and
  pre/post event processing. `.opencode/plugin/read-guard.js` — before/after tool hooks. The plugin has
  no reliable role field, so protection must be skill-armed rather than role-detected.
  `frontend/vite.config.ts:8-15` — Vite host and hard-coded `/api` proxy target. The proxy must be changed
  to read an explicit `VITE_API_PROXY_TARGET`, preserving the current `127.0.0.1:8000` default for
  ordinary development.
  `scripts/start_server.ps1` is only a lifecycle precedent; the new runner must not invoke it because it
  writes shared PID/log paths, uses fixed ports, and has existing-server handling.

- **Verified runtime:** The repo venv contains Playwright (`.venv\Scripts\playwright.exe` and the
  `playwright` Python package). `backend/requirements.txt` supplies FastAPI/Uvicorn but does not declare
  Playwright; implementation must document or add that dependency if the focused environment check
  requires it. The standalone command is:
  `.venv\Scripts\python.exe scripts\browser_validation.py --case <case-id> --scenario monster-printing --output <artifact-dir>`.
  Browser control uses `from playwright.sync_api import sync_playwright`, an isolated
  `launch_persistent_context(user_data_dir=<profile>)`, and page event listeners. MCP is not used by
  the Python runner.

- **Verified owned start commands:** From the repository root, spawn
  `.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port <backend-port>`.
  From `frontend/`, spawn `npm.cmd run dev -- --host 127.0.0.1 --port <frontend-port>` with
  `VITE_API_PROXY_TARGET=http://127.0.0.1:<backend-port>` in that child environment. Allocate/check two
  unused ports, record exact child PIDs and command lines, reject collisions, and never call
  `start_server.ps1` or reuse an existing service.

- **Verified readiness:** Poll `http://127.0.0.1:<backend-port>/openapi.json` for the backend and
  `http://127.0.0.1:<frontend-port>/` for Vite. Require successful HTTP responses before navigation.
  A timeout, child exit, occupied port, or cleanup failure is `INFRA_FAIL`.

- **Verified tests:** `backend/tests/test_read_guard.py` proves unarmed maintainer reads, armed denial,
  and plugin argument wiring. `backend/tests/test_browser_validation.py` is the single exact location
  for port/profile/lock isolation, duplicate-case rejection, owned Windows process cleanup, readiness,
  artifact schema, print interception, console/network capture, `PASS`/`PRODUCT_FAIL`/`INFRA_FAIL`
  classification, and invocation-skill/agent-contract assertions. Do not introduce another test file.

- **Settled arming contract:** Add `.opencode/skills/browser-validation-invoke/SKILL.md` as the mandatory
  first action for `coordinator-test-validator` and `coordinator-test-quick-executor` browser runs. It
  invokes/arms the existing read-guard before any browser-validation command or repository retrieval and
  explicitly forbids reading `scripts/browser_validation.py`. Extend `scripts/read_guard.py` so this skill
  arms a protected-path rule for that script; preserve unarmed maintainer access. Update the plugin only
  as needed to preserve pre-event denial. The validator and quick-executor contracts must require this
  skill before the runner command. This is skill-based enforcement; no role-based protection is claimed.

- **Settled runner contract:** Each run owns a unique case lock, isolated temporary Playwright profile,
  backend/frontend ports, child process trees, and output directory. Duplicate case IDs fail without
  taking ownership. Cleanup terminates only recorded descendants/children and removes only the run's
  profile, lock, and temporary process logs. Windows path normalization, process-tree-safe termination,
  and already-exited-child tolerance are required.

- **Settled evidence contract:** The fixed `monster-printing` flow captures desktop, narrow, and print
  media states; screenshots; observable DOM/accessibility evidence; console messages; failed network
  requests; and print-interception status. Intercept `window.print` in page context so no system dialog
  opens, while recording that printing was reached.

- **Settled result contract:** Emit JSON with `PASS`, `PRODUCT_FAIL`, or `INFRA_FAIL`. Application
  assertions classify as `PRODUCT_FAIL`; process, port, readiness, Playwright, print-hook, artifact, or
  cleanup failures classify as `INFRA_FAIL`.

- **Constraints:** Use configured Playwright MCP only for independent agent-side live validation; it is
  not the Python runtime. Preserve ordinary Vite development by retaining the `127.0.0.1:8000` default.
  Do not commit runtime artifacts, profiles, locks, logs, databases, or screenshots. Do not reuse servers.

- **Open questions:** Sole open decision: how future browser scenarios should be added. Do not resolve
  it or introduce scenario architecture in this stage.

- **Required proof:** Run
  `.venv\Scripts\python.exe -m pytest backend/tests/test_browser_validation.py backend/tests/test_read_guard.py --no-cov`.
  From `frontend`, run `npm run typecheck` to prove the Vite proxy environment override preserves the
  frontend contract; do not invent a new Vite test surface. Then run
  `.venv\Scripts\python.exe scripts/check_docs.py --write-generated`, followed by
  `.venv\Scripts\python.exe scripts/check_docs.py --check`. Independently invoke the runner on Windows
  for desktop, narrow, and print-media evidence, including no-server-reuse, cleanup, console/network
  capture, and infrastructure/product classification; this live runner invocation is coordinator/validator
  acceptance, not executor proof.

### Exact anticipated implementation paths

- `scripts/browser_validation.py` — new invoke-only runner and fixed scenario.
- `backend/tests/test_browser_validation.py` — lifecycle and evidence contract tests.
- `.opencode/skills/browser-validation-invoke/SKILL.md` — mandatory skill-arming invocation contract.
- `docs/plans/active/browser-validation-harness/orders/01-browser-validation-harness.md` — canonical regenerated work order; compile artifact only, not implementation authorization.

These exact anticipated implementation paths authorize their creation by Stage 1 orders. They remain
outside unconditional `Touches` only because they do not yet exist and the documentation checker requires
every unconditional Touches entry to resolve.
