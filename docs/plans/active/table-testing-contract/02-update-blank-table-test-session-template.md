WORK ORDER 02 — Update blank table-test session template
GOAL: Update the blank session template and README to match the independent compact question-led table-testing contract.
DEPENDS ON: 01-rewrite-canonical-table-testing-contract.md
REQUIRED STRENGTH: Light
CREATES: none
REMOVES: none
CHANGES SIGNATURE: none

KNOWN STATE (already true — do NOT redo or re-derive):
- Order 01 establishes the canonical independent contract; this order applies it only to the blank example template and its README.
- Existing real session records remain historical and are not edited; migration is deferred to Stage 3.
- The template uses statuses draft, recorded, and reviewed; one to five focused questions; expectation, confirmation/challenge signal, actual outcome, interpretation, and possible ideas.
- There are no standing questions, no extra notes section, and no required Plan, Stage, or Actions sections.
- Raw evidence must be preserved, ideas remain separate from implementation plans, and the sheet stays compact and human-fillable.

START IN:
- docs/table-tests/_example/session-template.md — replace the blank record shape with the compact independent question-led session sheet
- docs/table-tests/_example/README.md — update copy instructions and lifecycle guidance for independent records

DO:
- Update docs/table-tests/_example/session-template.md to provide the compact human-fillable record with draft, recorded, and reviewed statuses and one to five focused question blocks.
- Make each question block capture what is being understood, expected outcome, confirmation/challenge signal, actual outcome, interpretation, and possible ideas while preserving raw evidence and separating ideas from implementation plans.
- Update docs/table-tests/_example/README.md to explain how to copy and use the independent template without requiring a Plan, Stage, standing questions, extra notes, or Actions sections; do not edit real session records.

STOP WHEN: `python scripts/order_check.py --docs && .venv\Scripts\python.exe scripts/check_docs.py --check` passes. Then stop — change nothing else.

STATUS: DONE — implementation complete; stop-check blocked by unrelated pre-existing documentation failures

DEVIATIONS: <-- executor appends, always (even on DONE) — one line
- KNOWN STATE re-verified or wrong: none; the required docs checks remain blocked outside this order's scope

EVIDENCE ENVELOPE: <-- executor appends, always (even on DONE) — directly below DEVIATIONS
- COMMAND: `python scripts/order_check.py --docs && .venv\Scripts\python.exe scripts/check_docs.py --check`
- RESULT: fail
- CHECKS: docs order check failed on unrelated active orders shared-map-badge-token/01 and shared-map-badge-token/05; check_docs.py was not reached
- DIRTY PATHS: docs/table-tests/_example/session-template.md; docs/table-tests/_example/README.md; this work order
- AUTHORIZATION: session-template.md and README.md authorized by START IN and DO; this work order status/evidence authorized by implement-order
- GUARD: none
- ATTEMPTS: 0

FAILURE REPORT:
- TRIED: Updated the compact independent question-led session template in docs/table-tests/_example/session-template.md.
- Updated independent-record copy and lifecycle guidance in docs/table-tests/_example/README.md.
- FAILING COMMAND: `python scripts/order_check.py --docs && .venv\Scripts\python.exe scripts/check_docs.py --check`
- OUTPUT:
  ```text
  Documentation contract failures:
  
  Source:    docs/plans/active/shared-map-badge-token/01-shared-badge-renderer.md
  Error:     CHANGES SIGNATURE `BadgeDisc` has call sites outside START IN: frontend/src/features/dungeons/maplab/PortalMarker.tsx, frontend/src/features/dungeons/maplab/PropMarker.tsx, frontend/src/features/dungeons/maplab/StairMarker.tsx, frontend/src/map/BadgeRing.tsx
  
  Source:    docs/plans/active/shared-map-badge-token/05-migrate-player-map-badge-cue.md
  Error:     DO adds a test to frontend/src/player/__tests__/PlayerMapRenderer.test.tsx (415 lines) without naming the block to insert it into
  
  2 failure(s). Fix the issues above and re-run.
  STOP WHEN: FAILED
  ```
- SUSPECT: Existing documentation-contract failures in unrelated active orders prevent the required docs check from passing.
- WORKTREE: changes left in place; docs/table-tests/_example/session-template.md, docs/table-tests/_example/README.md, and this work order
