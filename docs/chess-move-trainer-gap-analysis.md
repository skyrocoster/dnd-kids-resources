# Gap analysis: D&D Kids Resources vs. ChessMoveTrainer

**Reference:** `G:\ChessMoveTrainer`, as inspected on 2026-09-23.<br>
**Scope:** reusable repository conventions, declared packages, developer tools,
and test tooling. This compares project setup, not product features. It does not
recommend copying chess-specific dependencies into the D&D application.

## Summary

The core stacks and most of the shared development tools are already aligned.
The existing [tooling parity note](tooling-parity-chess-move-trainer.md)
records the package and version alignment. Both projects use FastAPI and a
React/Vite TypeScript frontend, and both have Docker-managed local services,
Ruff, ESLint, Prettier, Vitest, Storybook, and API client generation.

The clearest reusable testing gap at inspection time was not a total lack of
browser coverage: this project had a fixed runner for one weapon-edit workflow,
but no general multi-case Playwright test suite comparable to ChessMoveTrainer's.
That gap is now closed by the frontend Playwright suite described below.
Other differences are mainly optional maintenance choices: explicit runtime
and Python lock-file declarations, dependency auditing, automated
accessibility assertions, a code-map catalogue, and test/documentation indexes.
These are opportunities to consider, not requirements for matching the other
application.

## Already in place

| Area | D&D Kids Resources | Comparison |
| --- | --- | --- |
| Application stack | FastAPI backend and Vite/React frontend (`README.md`, `backend/README.md`, `frontend/README.md`) | Same broad stack as ChessMoveTrainer. |
| Shared package versions | FastAPI, Uvicorn, Pydantic, HTTPX, pytest and Ruff; React, React DOM, React Router, Lucide, Vite, Vitest, TypeScript, Playwright, Storybook, ESLint and Prettier | The shared versions are recorded as aligned in `docs/tooling-parity-chess-move-trainer.md`; local manifests are `backend/requirements.txt` and `frontend/package.json`. |
| Python quality checks | Ruff uses a 100-character line length, Python 3.12 target, and E/F/I rules (`pyproject.toml`). Pytest has a 97% coverage floor. | The Ruff settings match the reference. The D&D project has the stricter explicit coverage floor. |
| Frontend checks | Vitest, Testing Library, a headless browser-backed Storybook test project, ESLint, Oxlint, and Prettier (`frontend/package.json`, `frontend/vitest.config.ts`) | Most shared frontend test and code-quality tooling is already present. |
| API client generation | `@hey-api/openapi-ts` and its config (`frontend/package.json`, `frontend/openapi-ts.config.ts`) | The same generator is used in the reference project. |
| Local services | Docker Compose services managed through `dev.ps1`; documentation covers persistent SQLite, service health, ports, and safe database handling (`docs/DEVELOPMENT_SERVICES.md`) | The service-management approach is already comparable. Service names and ports differ and should remain project-specific. |

## Gaps and how important they are

### 1. No general-purpose Playwright end-to-end suite — addressed

Playwright is installed and used by Vitest's browser provider for Storybook
scenarios. `npm run test:e2e` starts Vite on a dedicated local port and the
tests stub API responses in the browser, so this suite does not depend on the
database or Docker services. It covers Field Guide navigation, weapon search
and detail selection, weapon creation and editing, and quick-rule validation.

The former fixed-case Python evidence runner and its contract tests have been
retired; no separate screenshot or print runner remains.

**Evidence:** local `frontend/package.json`, `frontend/playwright.config.ts`,
and `frontend/tests/e2e/`; reference `G:\ChessMoveTrainer\package.json`,
`G:\ChessMoveTrainer\tests\e2e\playwright.config.ts`, and `G:\ChessMoveTrainer\AGENTS.md`.

### 2. Python and Node support ranges are not declared in the app manifests

The local `pyproject.toml` configures Ruff and pytest, but does not declare a
supported Python range or Python package metadata. Python packages are pinned
in `backend/requirements.txt`, but there is no Python resolution lock file like
the reference project's `uv.lock`. `frontend/package.json` also does not
declare a Node `engines` range. The existing tooling-parity note records the
versions used during that work, but a note about the current environment is not
the same as a manifest-enforced supported range.

ChessMoveTrainer declares Python `>=3.12,<3.13`, Node `>=24.15 <25`, and its
Python dependencies through `pyproject.toml` plus `uv.lock`. Those declarations
make the intended runtime and resolved Python environment easier to reproduce.
The D&D project already pins its direct Python requirements and has a frontend
`package-lock.json`, so the gap is not a complete absence of version pins; it
is the lack of a declared supported runtime range and a locked Python
resolution.

**Assessment:** useful for onboarding and repeatable installs. Decide first
which Python environment manager and lock-file approach to support; adopting
`uv` itself is not required just to document the supported versions.

**Evidence:** local `pyproject.toml`, `requirements.txt`,
`backend/requirements.txt`, and `frontend/package.json`; reference
`G:\ChessMoveTrainer\pyproject.toml`, `G:\ChessMoveTrainer\uv.lock`,
`G:\ChessMoveTrainer\package.json`, and `G:\ChessMoveTrainer\frontend\package.json`.

### 3. No declared Python dependency-audit tool

ChessMoveTrainer includes `pip-audit` in its development dependencies. The
D&D project's Python requirements and `pyproject.toml` do not declare an
equivalent dependency-audit tool or audit command.

**Assessment:** a reasonable, low-cost maintenance improvement if local
dependency vulnerability checks are wanted. The reference declaration does
not by itself mean audits run automatically; this analysis does not propose
adding application CI.

**Evidence:** local `requirements.txt`, `backend/requirements.txt`, and
`pyproject.toml`; reference `G:\ChessMoveTrainer\pyproject.toml`.

### 4. Accessibility tooling is present, but automated assertions differ

The local frontend includes Storybook's accessibility addon. ChessMoveTrainer
also declares axe-based test integrations (`@chialab/vitest-axe` and
`@axe-core/playwright`). The local manifests do not declare those test
integrations.

This is a partial gap, not an absence of accessibility tooling. The difference
is that local component or end-to-end tests do not have the same explicit axe
assertion packages. Add them only if the project wants accessibility
violations to fail specific tests rather than relying on Storybook review.

**Evidence:** local `frontend/package.json`; reference
`G:\ChessMoveTrainer\package.json` and `G:\ChessMoveTrainer\frontend\package.json`.

### 5. No documented code-map catalogue

ChessMoveTrainer maintains a Graphify catalogue with separate code maps for
its repository, backend, frontend, core data, tests, and workflow. No
equivalent catalogue is documented in the D&D project's top-level README,
`pyproject.toml`, or `src/README.md`.

**Assessment:** optional navigation help for a codebase with many backend
routers, data tools, and tests. It adds a tool and generated documentation to
maintain; it is not needed for ordinary edits in already-known files.

**Evidence:** local `README.md`, `pyproject.toml`, and `src/README.md`;
reference `G:\ChessMoveTrainer\docs\graphify\README.md`.

### 6. Test and documentation indexes are less centralized

The reference has `tests/README.md` and `docs/README.md` to orient readers to
those areas. Here, test commands and locations are split between the root
instructions, `pyproject.toml`, and `frontend/README.md`; there is no
`tests/README.md` or `docs/README.md` in the current project tree. The root
README does already map the backend, frontend, Python tools, and development
services.

**Assessment:** a small discoverability difference. A concise test index could
document the backend pytest command, frontend Vitest/Storybook commands, and
which checks cover the full application. A docs index is only useful if the
documentation grows beyond the current root links.

**Evidence:** local `README.md`, `frontend/README.md`, and `pyproject.toml`;
reference `G:\ChessMoveTrainer\tests\README.md` and
`G:\ChessMoveTrainer\docs\README.md`.

## Differences that are not gaps

Do not treat every ChessMoveTrainer package or service as something this
application is missing. The following serve chess-specific functionality and
have no direct reason to be added here:

- Python chess and analysis libraries such as `chess`, NumPy, pandas, SciPy,
  and statsmodels.
- Chessboard UI packages such as `chess.js` and `react-chessboard`.
- SQLAlchemy, Stockfish worker services, opening/game data, and chess-analysis
  worker settings. The D&D app has its own SQLite/database setup and domain
  data; a different persistence implementation is not automatically a gap.
- Other feature UI libraries in either app (for charts, calendars, or
  resizable panels) unless a D&D feature has that requirement.

The reference also uses a root npm workspace for its frontend and experiments.
This project keeps the frontend package and lock file under `frontend/`.
That is an organization choice, not a defect unless shared JavaScript tooling
or multiple product workspaces become difficult to manage.

## Suggested order if closing gaps

1. Decide whether to add app-level Playwright coverage for important user
   workflows; this is the largest testing-capability difference.
2. Declare supported Python and Node ranges, then choose whether Python
   dependencies also need a full resolution lock.
3. Consider a local dependency-audit command and explicit axe assertions if
   those checks would be used regularly.
4. Add Graphify or more test/documentation indexes only if they solve a real
   navigation problem.

This document records findings only. It does not change application packages,
tool versions, runtime services, or test behavior.
