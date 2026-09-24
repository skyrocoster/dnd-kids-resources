# Legacy Dialog on Base UI - Existing legacy dialogs retain their contract while the compound API continues to work

> **Status:** done - both stages accepted.

- **Read trigger:** Read before implementing the selected shared Dialog legacy-branch migration or its representative consumer regression proof.
- **Upstream:** [Base UI and Shared Interaction Migration](../../../master-plans/base-ui-migration.md) governs the FOUNDATION boundary and focused proof; [the grilling record](../../../grilling-docs/2026-09-23-base-ui-full-migration.md) records the legacy-Dialog proposal and compatibility facts; [the shared-primitives review](../../../shared-primitives-review.md) is read-only source evidence. The approved outcome here is limited to the legacy Dialog branch and one ConfirmDialog consumer; it does not select other FOUNDATION work.

## Outcome

The legacy `open`/`onClose` Dialog branch uses the already-installed Base UI Dialog behavior while retaining its existing API, styling, focus and dismissal behavior, and pending guard. The compound Dialog branch continues to work, and a pending asynchronous confirmation remains open until its operation completes.

## Scope

- **Included:** Migrate only the legacy branch behind its current props. Preserve `open`, `title`, `description`, `onClose`, `children`, `footer`, `pending`, `role`, and `className`; preserve initial focus, focus trapping and return, Escape/backdrop dismissal when not pending, blocked dismissal and disabled/inert content while pending, and the current legacy appearance. Keep the existing compound API and behavior working. Extend one representative asynchronous ConfirmDialog consumer regression test.
- **Expected areas:** Stage 1: `frontend/src/components/Dialog.tsx`, `frontend/src/components/Dialog.css`, `frontend/src/components/__tests__/Dialog.test.tsx`, and `frontend/src/components/__tests__/OverlayPrimitives.test.tsx`. Stage 2: `frontend/src/features/items/__tests__/ItemBrowserPage.test.tsx`. `ConfirmDialog.tsx` and `ItemBrowserPage.tsx` are compatibility references; their public and consumer APIs remain unchanged.
- **Excluded:** Changes to public Dialog or ConfirmDialog APIs; changes to cancellation, pending, focus, or visual policy; compound-branch redesign or rewrite; edits to ConfirmDialog or ItemBrowserPage product source; migrations of other Dialog consumers; new dependencies, Popover work, other master-plan slices, and DND-EVALUATION.

## Stages

1. **pending - Migrate and prove the shared legacy Dialog branch.** Keep the current `onClose` branch discriminator and props; use the installed Base UI Dialog for its lifecycle without changing the compound branch. Preserve the legacy role/name/description, `className`, CSS appearance, focus placement/trapping/return, inner-click behavior, and non-pending Escape/backdrop close paths. Pending must keep the dialog open on Escape and backdrop, mark it busy, and disable/inert its interactive contents. Add a focused pending-backdrop regression if needed; retain the compound default-open/close-control regression. Run Proof 1. **Breakpoint:** none for matching the approved behavior; escalate if it requires an API, policy, or visual change.
2. **pending - Prove the asynchronous ConfirmDialog consumer.** Extend only the ItemBrowser pending-delete test: while deletion is unresolved, Escape and backdrop attempts leave the alertdialog present and pending; successful completion removes it. Keep the ItemBrowser and ConfirmDialog product APIs unchanged. Run Proof 2. Run Proof 1 again only if Stage 2 changes component code, component tests, or another input that can invalidate its result. **Breakpoint:** none unless the approved pending/close behavior cannot be maintained without an excluded change.

Stages are sequential. Passing behavioral proof remains valid until a later change affects its command, inputs, exercised behavior, configuration, dependencies, or environment.

## Progress and decisions

- **Stage 1:** accepted - Proof 1 passed (2 files, 19 tests; `frontend/`, command timeout 120s, Bash tool timeout 130000 ms). Legacy and compound APIs, focus and dismissal, pending guard passed.
- **Stage 2:** accepted - Proof 2 passed (7 tests; `frontend/`, command timeout 120s, Bash tool timeout 130000 ms). Pending async confirmation resisted Escape/outside attempts and closed after completion. Stage 1 inputs were unchanged; its passing proof was retained.

## Proof

- **Proof 1 (from `frontend/`):** `timeout 120s npm test -- --testTimeout=120000 src/components/__tests__/Dialog.test.tsx src/components/__tests__/OverlayPrimitives.test.tsx` — Bash tool timeout: 130000 ms. Proves legacy API/focus/dismissal/pending regressions and continued compound-API operation.
- **Proof 2 (from `frontend/`):** `timeout 120s npm test -- --testTimeout=120000 src/features/items/__tests__/ItemBrowserPage.test.tsx` — Bash tool timeout: 130000 ms. Proves the representative async ConfirmDialog stays open during pending dismissal attempts and closes after successful completion.

No lint, formatting, broad type/build, aggregate, or repository-hygiene checks are part of acceptance.

## Escalation boundaries

- Stop if preserving the current APIs, legacy focus return, allowed/blocked close paths, pending behavior, compound-branch behavior, or legacy appearance requires a public contract, product-policy, dependency, ownership, or visual redesign decision.
- Do not broaden consumer coverage or change error/cancellation semantics to resolve an implementation detail; report the concrete conflict for approval.

## Visible result

> Existing legacy dialogs keep their current controls and dismissal behavior, pending confirmations cannot be closed while working, and the compound Dialog still opens and closes as before.
