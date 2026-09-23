# AI Instructions: D&D Kids Resources

Windows-oriented repository for D&D 5th Edition tools and reference cards for kids. Use plain English and
do not assume the user is an expert. Ground explanations in this repository's actual files, commands, and
behavior; do not use metaphors or invented analogies to explain things that can be shown directly.

## Current application

- `backend/` contains the Python backend. `frontend/` contains the Vite React TypeScript client.
- Current setup and run commands are documented in `README.md`; follow that file rather than assuming
  additional services or infrastructure.
- The README currently lists the API at `http://localhost:8000` and frontend at `http://localhost:5173`.
- Python dependencies are included through the root `requirements.txt`, which references
  `backend/requirements.txt`. Frontend scripts are defined in `frontend/package.json`.
- Pytest configuration is in `pyproject.toml`; tests are under `backend/tests/`.

## Windows shell

The agent's preferred shell is Git Bash. Use PowerShell for commands documented for Windows users. Both
shells use forward slashes (e.g. `.venv/Scripts/python.exe`), not backslashes. PowerShell commands must
use `$(...)` for subexpressions, ASCII punctuation, and no `&&` or `||` operators. If a shell command fails,
report the exact command and failure.

## Testing and checks

Run only finite tests or browser scenarios that directly prove the approved behavior. Do not run lint,
formatting, broad type/build, aggregate, or repository-hygiene checks during implementation unless the
request specifically requires them. Use the relevant project instructions and commands where applicable.

**Mandatory safety:** every `bash` invocation must set an explicit finite timeout in milliseconds, and every
test must have explicit finite command-level and tool-level timeouts. Missing, zero, or non-finite timeouts
are forbidden because commands can hang. Never run an unbounded process.

## Start here

1. Read the relevant active Plan under `docs/plans/active/` when work is Plan-backed; completed Plans are
   archived under `docs/plans/done/`.
2. Before exploring source, read only the files named by the approved work or Plan stage.
3. Keep changes within the approved scope and verify only the requested behavior.

## Workspaces

`scratch/` is a user-owned temporary workspace. Preserve unrelated content and do not read or alter unrelated
paths. Early HTML mock-ups, catalogues, optional design notes, and prototypes belong under `experiments/`.

## Working modes

This repository has two working modes: **God** and **Coordinator**.

- **God (default):** every session where the coordinator agent was not invoked. Work directly on the request
  using the application, command, and safety rules above. When a request is substantial enough that the
  role-based workflow would help, suggest moving it to the coordinator; do not assume that role yourself.
- **Coordinator:** runs only when the user explicitly invokes the coordinator agent, or when a coordinator
  session dispatches one of its subagents. Its routing, scope, Plan, direct, and design-exploration behavior
  lives in `.opencode/agents/coordinator.md` and its skills, and does not apply to God sessions.

Both modes use the `grilling` skill (`.opencode/skills/grilling/SKILL.md`): use it when the user requests an
interview or when material decisions must be settled before work continues.

## Safety

- Preserve unrelated worktree changes, completed historical Plans, grilling records, and master-plan records.
- Do not commit, push, or use destructive Git operations unless explicitly requested.
- Do not edit product source for workflow cleanup.
- Keep credentials, databases, logs, PID files, dependency directories, and generated build output out of commits.

## Workflow assets

`.opencode/` contains the Coordinator agent and its subagents and skills. Those assets belong to the
Coordinator workflow; God sessions use them only where `.opencode/agents/god.md` names them directly.

## Development rules

- Prefer modifying, reusing, and composing existing frontend components over replacing them or creating new implementations.
- When similar UI already exists, adapt or extract the existing implementation into a reusable component instead of rebuilding the same UI from scratch.
- Preserve existing component APIs, behavior, styling, and structure unless the requested change requires altering them.
- Create a new component from scratch only when no existing component can reasonably be reused, composed, adapted, or extracted.
- Do not rewrite an existing component merely to make it cleaner, more idiomatic, or more consistent unless that refactor is part of the requested work.
