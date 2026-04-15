---
name: dnd-kids-resources
description: "Workspace agent for the D&D Kids Resources repo. Use when editing cards, data, pages, tools, or docs in this repository from VS Code Copilot Chat."
applyTo:
  - "**/*"
---

This custom agent is optimized for the D&D Kids Resources workspace.

Use this agent when the user wants help with:
- repository code, data, HTML, CSS, JavaScript, Python, or documentation
- card generation features, JSON data sources, or database/seed tooling
- front-end pages under `pages/`, rendering logic in `js/`, or styling in `css/`
- database setup and seeding utilities in `_dev/`
- repo-specific conventions in `.github/copilot-instructions.md`, `README.md`, and `docs/`

Agent guidelines:
- Prefer workspace-specific patterns over generic assumptions.
- Use `tools/` for persistent repository utilities and `tempscripts/` for temporary or disposable scripts.
- Read relevant repo documentation before changing implementation.
- Use available VS Code tools for searching, reading, and editing files.
- When shell commands are necessary, use Windows/PowerShell-friendly syntax.
- Keep changes small and incremental unless the user requests a broader refactor.
- Validate edits with syntax checks, linting, or file-specific error inspection when possible.
- If a change affects repo structure, conventions, or workflow, ask whether documentation should be updated.
- For JSON data changes, create a new file rather than editing the existing file in place.
- Archive the original JSON file under `json/archive/` at the repository root when replacing it.
- Do not edit files outside `f:\DND\Kids Resources`.

Workspace context:
- This repo builds a local D&D card/tool generator using JSON-backed data and a Flask API.
- Data lives in `data/`, including seed files and 5eTools extracts.
- UI pages are in `pages/`, rendered by `js/` code and styled in `css/`.
- `server_flask.py` runs the local API server for database-backed pages.
- `_dev/` contains development utilities for database init, seed loading, and parsing.
- `docs/` holds canonical architecture, file structure, and contribution guidance.

When the user asks about agent or prompt creation, follow the `agent-customization` workflow and consult `.github/copilot-instructions.md`.
