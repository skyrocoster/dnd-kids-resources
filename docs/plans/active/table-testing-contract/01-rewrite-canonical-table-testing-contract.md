WORK ORDER 01 — Rewrite canonical table-testing contract
GOAL: Rewrite docs/TABLE_TESTING.md as the independent compact question-led table-testing contract.
DEPENDS ON: none
REQUIRED STRENGTH: Light
CREATES: none
REMOVES: none
CHANGES SIGNATURE: none

KNOWN STATE (already true — do NOT redo or re-derive):
- Stage 1 is a documentation/template change; existing real session records remain historical and are not edited.
- Records are independent of Plans and use statuses draft, recorded, and reviewed.
- Each record has one to five focused question blocks, with each question capturing what is being understood, expected outcome, confirmation/challenge signal, actual outcome, interpretation, and possible ideas.
- There are no standing questions, no extra notes section, and no required Plan, Stage, or Actions sections.
- Raw evidence must be preserved, ideas remain separate from implementation plans, and the session sheet stays compact and human-fillable.
- The documentation checker has an unrelated pre-existing failure because docs/plans/active/shared-map-badge-token/05-migrate-player-map-badge-cue.md lacks an insertion anchor for a test in frontend/src/player/__tests__/PlayerMapRenderer.test.tsx.

START IN:
- docs/TABLE_TESTING.md:## Lifecycle — replace the lifecycle, required structure, content, record-start, and index guidance

DO:
- Rewrite the canonical lifecycle and contract to use statuses draft, recorded, and reviewed, independently of implementation Plans.
- Define the compact record shape around one to five focused questions, with each question recording what is being understood, expected outcome, confirmation/challenge signal, actual outcome, interpretation, and possible ideas.
- Remove plan-coupled requirements, standing questions, extra notes, and required Plan, Stage, or Actions sections; preserve raw evidence, keep ideas separate from implementation plans, and leave real session records untouched.

STOP WHEN: `python scripts/order_check.py --docs` passes. Then stop — change nothing else.

STATUS: DONE — implementation complete; stop-check blocked by unrelated pre-existing documentation failures

DEVIATIONS: <-- executor appends, always (even on DONE) — one line
- KNOWN STATE re-verified or wrong: none; the required docs check remains blocked outside this order's scope

EVIDENCE ENVELOPE: <-- executor appends, always (even on DONE) — directly below DEVIATIONS
- COMMAND: python scripts/order_check.py --docs
- RESULT: fail
- CHECKS: Canonical table-testing link failure was fixed; three unrelated documentation contract failures remain.
- DIRTY PATHS: docs/TABLE_TESTING.md; docs/plans/active/table-testing-contract/01-rewrite-canonical-table-testing-contract.md
- AUTHORIZATION: docs/TABLE_TESTING.md — START IN and DO; this order file — STATUS, DEVIATIONS, and EVIDENCE ENVELOPE
- GUARD: none
- ATTEMPTS: 1

FAILURE REPORT:
- TRIED: Rewrote docs/TABLE_TESTING.md with the independent draft/recorded/reviewed contract and focused question blocks.
- TRIED: Removed the invalid placeholder record link after the first documentation check identified it.
- FAILING COMMAND: python scripts/order_check.py --docs
- OUTPUT:
  ```text
  Documentation contract failures:
  
  Source:    docs/plans/active/shared-map-badge-token/01-shared-badge-renderer.md
  Error:     CHANGES SIGNATURE `BadgeDisc` has call sites outside START IN: frontend/src/features/dungeons/maplab/PortalMarker.tsx, frontend/src/features/dungeons/maplab/PropMarker.tsx, frontend/src/features/dungeons/maplab/StairMarker.tsx, frontend/src/map/BadgeRing.tsx
  Fix:       Add every call site to START IN, or the executor is forced out of bounds to satisfy its own typecheck � which is exactly what happened to the one order that both blocked and leaked a stale assertion
  
  
  Source:    docs/plans/active/shared-map-badge-token/05-migrate-player-map-badge-cue.md
  Error:     DO adds a test to frontend/src/player/__tests__/PlayerMapRenderer.test.tsx (415 lines) without naming the block to insert it into
  Fix:       Anchor the entry on the describe/it line the new test joins (`@"describe('fullscreen', ...)"`). Leaving this out after it had already been diagnosed let one order pay 6 locating reads of a 2,000-line suite; naming it on the next order brought that back to 1
  
  
  Source:    docs\plans\active\INDEX.md
  Error:     Generated block 'ACTIVE_INDEX' is stale
  Fix:       Run python scripts/check_docs.py --write-generated
  
  
  3 failure(s). Fix the issues above and re-run.
  STOP WHEN: FAILED
  ```
- SUSPECT: The remaining failures belong to the shared-map-badge-token orders and stale generated active index, outside this order's authorized scope.
- WORKTREE: changes left in place — docs/TABLE_TESTING.md; docs/plans/active/table-testing-contract/01-rewrite-canonical-table-testing-contract.md
