# WORK ORDER 01 — Browser validation harness

- **OUTPUT:** `docs/plans/active/browser-validation-harness/orders/01-browser-validation-harness.md`
- **GOAL:** Implement and prove the isolated Python Playwright browser-validation harness and its experimental invocation contracts.
- **REQUIRED STRENGTH:** Standard — The runner lifecycle, source-read enforcement, Vite proxy, tests, and experimental contracts must remain coherent.
- **DEPENDS ON:** none

## Authorization

### Creates
- `scripts/browser_validation.py`
- `backend/tests/test_browser_validation.py`
- `.opencode/skills/browser-validation-invoke/SKILL.md`

### Edits
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

### Removes
- none

## Context inputs
1. `docs/plans/active/browser-validation-harness/browser-validation-harness.md` — anchor `### Stage 1`
   - Purpose: Authoritative settled compiler handoff and exclusions.
2. `scripts/read_guard.py` — anchor `ARMING_SKILLS`
   - Purpose: Existing skill-arming contract to extend.
3. `frontend/vite.config.ts` — whole file
   - Purpose: Existing fixed API proxy default to preserve while adding the run-supplied override.
4. `backend/tests/test_read_guard.py` — whole file
   - Purpose: Existing unarmed-access and plugin-hook contract tests.

## Known facts
- The standalone runtime is Python Playwright from the repository virtual environment; Playwright MCP remains agent-only tooling.
- Every run starts owned Uvicorn and Vite children on dynamic ports, polls /openapi.json and /, and never reuses an existing server.
- backend/tests/test_browser_validation.py is the single test location for runner and invocation-skill/agent-contract assertions.
- The initial scenario is fixed to monster-printing; future scenario addition is the sole open decision.
- Independent Windows live invocation belongs to coordinator or validator acceptance, not executor proof.

## Ordered actions
1. **file** (`scripts/browser_validation.py`) — Create the fixed monster-printing runner with owned Windows-safe Uvicorn and Vite process trees, dynamic ports, readiness polling, isolated profile and lock, case artifacts, desktop/narrow/print evidence, safe print interception, console/network capture, PASS/PRODUCT_FAIL/INFRA_FAIL output, and ownership-scoped cleanup.
2. **file** (`backend/tests/test_browser_validation.py`) — Cover lifecycle, port/profile/lock isolation, duplicate cases, readiness, cleanup, artifacts, print interception, evidence capture, result classification, and invocation-contract assertions.
3. **file** (`frontend/vite.config.ts`) — Read VITE_API_PROXY_TARGET for isolated runs while preserving http://127.0.0.1:8000 as the ordinary development default.
4. **file** (`scripts/read_guard.py`, `.opencode/plugin/read-guard.js`, `backend/tests/test_read_guard.py`) — Arm browser-validation invocation sessions and deny reads of scripts/browser_validation.py while preserving unarmed maintainer access and existing plugin transport semantics.
5. **file** (`.opencode/skills/browser-validation-invoke/SKILL.md`, `.opencode/agents/browser-automation-luna.md`, `.opencode/agents/coordinator-test-validator.md`, `.opencode/agents/coordinator-test-quick-executor.md`) — Create the mandatory invoke-only validation skill and require it before browser runs without granting source-read, implementation, or production-agent authority.
6. **file** (`.opencode/skills/assess-case-test/SKILL.md`, `.opencode/skills/deliver-direct-test/SKILL.md`, `.opencode/skills/coordinator-test-workflow/SKILL.md`) — Replace improvised browser lifecycle handoffs with the named browser-validation invocation contract and structured scenario fields.
7. **file** (`docs/areas/infra.md`, `docs/TESTING.md`) — Document ownership and the invoke-only command/result contract while leaving future scenario authoring explicitly open.

## Exact proof commands

### Proof 1 — Runner and source-read contract regression proof.
Working directory: `.`

```text
.venv\Scripts\python.exe -m pytest backend/tests/test_browser_validation.py backend/tests/test_read_guard.py --no-cov
```

### Proof 2 — Vite proxy configuration type proof.
Working directory: `frontend`

```text
npm run typecheck
```

### Proof 3 — Refresh generated documentation after contract changes.
Working directory: `.`

```text
.venv\Scripts\python.exe scripts/check_docs.py --write-generated
```

### Proof 4 — Documentation contract proof.
Working directory: `.`

```text
.venv\Scripts\python.exe scripts/check_docs.py --check
```

## Acceptance handoff

### Coordinator
- Confirm the runner owns and cleans up only its processes, profile, lock, logs, and artifacts.
- Confirm PASS, PRODUCT_FAIL, and INFRA_FAIL remain distinguishable and no existing server is reused.
- Confirm future scenario addition remains an open decision and no plugin, registry, or DSL was introduced.

### Validator
- Invoke the new command independently on Windows for desktop, narrow, and print-media evidence.
- Confirm safe print interception, console/network artifacts, cleanup, and infrastructure/product classification.

## Exclusions
- No product UI, API, data, schema, or seed changes.
- No existing server or global browser-profile reuse.
- No scenario registry, plugin system, DSL, or generalized authoring API.
- No committed runtime artifacts, profiles, locks, logs, databases, or screenshots.
- No production-agent redesign, reconcile, commit, or push.

## Escalate if
- A path outside authorization or a new product/runtime contract is required.
- Owned process-tree cleanup cannot be made deterministic on Windows.
- The fixed monster-printing scenario requires a generalized scenario architecture.
- A proof failure requires new diagnosis rather than one deterministic in-scope repair.

## Canonical compile packet

```json
{
  "output_path": "docs/plans/active/browser-validation-harness/orders/01-browser-validation-harness.md",
  "identity": {
    "number": "01",
    "slug": "browser-validation-harness",
    "title": "Browser validation harness",
    "goal": "Implement and prove the isolated Python Playwright browser-validation harness and its experimental invocation contracts."
  },
  "depends_on": [],
  "required_strength": {
    "level": "Standard",
    "reason": "The runner lifecycle, source-read enforcement, Vite proxy, tests, and experimental contracts must remain coherent."
  },
  "authorization": {
    "creates": [
      "scripts/browser_validation.py",
      "backend/tests/test_browser_validation.py",
      ".opencode/skills/browser-validation-invoke/SKILL.md"
    ],
    "edits": [
      "scripts/read_guard.py",
      ".opencode/plugin/read-guard.js",
      ".opencode/agents/browser-automation-luna.md",
      ".opencode/agents/coordinator-test-validator.md",
      ".opencode/agents/coordinator-test-quick-executor.md",
      ".opencode/skills/assess-case-test/SKILL.md",
      ".opencode/skills/deliver-direct-test/SKILL.md",
      ".opencode/skills/coordinator-test-workflow/SKILL.md",
      "frontend/vite.config.ts",
      "docs/areas/infra.md",
      "docs/TESTING.md",
      "backend/tests/test_read_guard.py"
    ],
    "removes": []
  },
  "context": [
    {
      "path": "docs/plans/active/browser-validation-harness/browser-validation-harness.md",
      "scope": {
        "kind": "anchor",
        "value": "### Stage 1"
      },
      "purpose": "Authoritative settled compiler handoff and exclusions."
    },
    {
      "path": "scripts/read_guard.py",
      "scope": {
        "kind": "anchor",
        "value": "ARMING_SKILLS"
      },
      "purpose": "Existing skill-arming contract to extend."
    },
    {
      "path": "frontend/vite.config.ts",
      "scope": {
        "kind": "whole_file"
      },
      "purpose": "Existing fixed API proxy default to preserve while adding the run-supplied override."
    },
    {
      "path": "backend/tests/test_read_guard.py",
      "scope": {
        "kind": "whole_file"
      },
      "purpose": "Existing unarmed-access and plugin-hook contract tests."
    }
  ],
  "known_facts": [
    "The standalone runtime is Python Playwright from the repository virtual environment; Playwright MCP remains agent-only tooling.",
    "Every run starts owned Uvicorn and Vite children on dynamic ports, polls /openapi.json and /, and never reuses an existing server.",
    "backend/tests/test_browser_validation.py is the single test location for runner and invocation-skill/agent-contract assertions.",
    "The initial scenario is fixed to monster-printing; future scenario addition is the sole open decision.",
    "Independent Windows live invocation belongs to coordinator or validator acceptance, not executor proof."
  ],
  "actions": [
    {
      "kind": "file",
      "paths": [
        "scripts/browser_validation.py"
      ],
      "instruction": "Create the fixed monster-printing runner with owned Windows-safe Uvicorn and Vite process trees, dynamic ports, readiness polling, isolated profile and lock, case artifacts, desktop/narrow/print evidence, safe print interception, console/network capture, PASS/PRODUCT_FAIL/INFRA_FAIL output, and ownership-scoped cleanup."
    },
    {
      "kind": "file",
      "paths": [
        "backend/tests/test_browser_validation.py"
      ],
      "instruction": "Cover lifecycle, port/profile/lock isolation, duplicate cases, readiness, cleanup, artifacts, print interception, evidence capture, result classification, and invocation-contract assertions."
    },
    {
      "kind": "file",
      "paths": [
        "frontend/vite.config.ts"
      ],
      "instruction": "Read VITE_API_PROXY_TARGET for isolated runs while preserving http://127.0.0.1:8000 as the ordinary development default."
    },
    {
      "kind": "file",
      "paths": [
        "scripts/read_guard.py",
        ".opencode/plugin/read-guard.js",
        "backend/tests/test_read_guard.py"
      ],
      "instruction": "Arm browser-validation invocation sessions and deny reads of scripts/browser_validation.py while preserving unarmed maintainer access and existing plugin transport semantics."
    },
    {
      "kind": "file",
      "paths": [
        ".opencode/skills/browser-validation-invoke/SKILL.md",
        ".opencode/agents/browser-automation-luna.md",
        ".opencode/agents/coordinator-test-validator.md",
        ".opencode/agents/coordinator-test-quick-executor.md"
      ],
      "instruction": "Create the mandatory invoke-only validation skill and require it before browser runs without granting source-read, implementation, or production-agent authority."
    },
    {
      "kind": "file",
      "paths": [
        ".opencode/skills/assess-case-test/SKILL.md",
        ".opencode/skills/deliver-direct-test/SKILL.md",
        ".opencode/skills/coordinator-test-workflow/SKILL.md"
      ],
      "instruction": "Replace improvised browser lifecycle handoffs with the named browser-validation invocation contract and structured scenario fields."
    },
    {
      "kind": "file",
      "paths": [
        "docs/areas/infra.md",
        "docs/TESTING.md"
      ],
      "instruction": "Document ownership and the invoke-only command/result contract while leaving future scenario authoring explicitly open."
    }
  ],
  "proof": [
    {
      "cwd": ".",
      "command": ".venv\\Scripts\\python.exe -m pytest backend/tests/test_browser_validation.py backend/tests/test_read_guard.py --no-cov",
      "purpose": "Runner and source-read contract regression proof."
    },
    {
      "cwd": "frontend",
      "command": "npm run typecheck",
      "purpose": "Vite proxy configuration type proof."
    },
    {
      "cwd": ".",
      "command": ".venv\\Scripts\\python.exe scripts/check_docs.py --write-generated",
      "purpose": "Refresh generated documentation after contract changes."
    },
    {
      "cwd": ".",
      "command": ".venv\\Scripts\\python.exe scripts/check_docs.py --check",
      "purpose": "Documentation contract proof."
    }
  ],
  "acceptance_handoff": {
    "coordinator": {
      "requirements": [
        "Confirm the runner owns and cleans up only its processes, profile, lock, logs, and artifacts.",
        "Confirm PASS, PRODUCT_FAIL, and INFRA_FAIL remain distinguishable and no existing server is reused.",
        "Confirm future scenario addition remains an open decision and no plugin, registry, or DSL was introduced."
      ]
    },
    "validator": {
      "requirements": [
        "Invoke the new command independently on Windows for desktop, narrow, and print-media evidence.",
        "Confirm safe print interception, console/network artifacts, cleanup, and infrastructure/product classification."
      ]
    }
  },
  "exclusions": [
    "No product UI, API, data, schema, or seed changes.",
    "No existing server or global browser-profile reuse.",
    "No scenario registry, plugin system, DSL, or generalized authoring API.",
    "No committed runtime artifacts, profiles, locks, logs, databases, or screenshots.",
    "No production-agent redesign, reconcile, commit, or push."
  ],
  "escalate_if": [
    "A path outside authorization or a new product/runtime contract is required.",
    "Owned process-tree cleanup cannot be made deterministic on Windows.",
    "The fixed monster-printing scenario requires a generalized scenario architecture.",
    "A proof failure requires new diagnosis rather than one deterministic in-scope repair."
  ]
}
```
STATUS: PENDING

EXECUTOR RESULT:
- DEVIATIONS: none
- PROOF RESULTS: pending
- DIRTY PATHS: pending
- AUTHORIZATION AUDIT: pending
- GUARD EVENTS: none
- ATTEMPTS: 0
- ESCALATION: none
