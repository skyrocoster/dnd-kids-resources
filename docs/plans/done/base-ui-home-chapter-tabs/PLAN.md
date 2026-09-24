# Home Chapter Tabs - Home chapter choices expose their matching links as accessible tab panels

> **Status:** done - Home chapter tabs and content association accepted.

- **Read trigger:** Before changing PageHeader, the shared Tabs integration, BrowserLayout's chapter marker, or Home's chapter content for this outcome.
- **Upstream:** The [Base UI migration master plan](../../../master-plans/base-ui-migration.md) governs the DISCLOSURES boundary and requires tabs to have associated panels while static markers retain their semantics. The [grilling record](../../../grilling-docs/2026-09-23-base-ui-full-migration.md) records the proposed Home/PageHeader disposition, not blanket implementation approval. The coordinator's approved phase packet selects only this bounded Home/PageHeader outcome.

## Outcome

Home's chapter choices are real, keyboard-operable tabs whose selected tab controls the matching chapter-links panel. BrowserLayout's single chapter marker remains static, and Home's existing icons, appearance, content, and Router links stay intact.

## Scope

- **Included:** Give Home's in-page chapter selection correct tab-list, tab, and associated tab-panel semantics with keyboard operation. Preserve the PageHeader/AppShell header-slot arrangement and current visual presentation. Keep BrowserLayout's single chapter marker noninteractive and out of tab semantics. Reuse the shared `Tabs` behavior; change its API only for a demonstrated composition or label gap needed by this outcome.
- **Expected areas:** `frontend/src/pages/HomePage.tsx`; `frontend/src/components/PageHeader.tsx`; `frontend/src/components/PageHeader.css` only if required to preserve the existing appearance; `frontend/src/components/Tabs.tsx` only for a demonstrated shared API gap; and `frontend/src/components/BrowserLayout.tsx` only if its PageHeader contract must change. Focused tests: `frontend/src/pages/__tests__/HomePage.test.tsx`, `frontend/src/components/__tests__/PageHeader.test.tsx`, and `frontend/src/components/__tests__/NavigationPrimitives.test.tsx`.
- **Excluded:** Router or route changes; changing Home's existing `<Link>` targets or converting links into buttons; turning BrowserLayout's static chapter marker into a tab; changes to other PageHeader consumers, feature behavior, or AppShell ownership; form, overlay, LoomRail, spellbook, and MapLab work; visual redesign, new dependencies, or changes to persistence. Home's selected chapter remains in-memory state.

## Stages

1. **pending - Establish the shared PageHeader/Tabs semantics and static-marker behavior.** Inspect whether the existing Tabs API can provide associated panels and keyboard behavior while PageHeader keeps its current header-slot composition and icon labels. Implement the smallest fitting shared composition; adapt the generic Tabs API only if the current label or list/panel composition is a demonstrated blocker. Render BrowserLayout's single chapter marker as a static marker, not a tab. Preserve existing PageHeader layout and appearance. Add or update focused shared tests for tab association and keyboard operation, and a PageHeader regression for the static marker. **Proof:** `timeout 120s npm test -- --testTimeout=120000 src/components/__tests__/PageHeader.test.tsx src/components/__tests__/NavigationPrimitives.test.tsx` from `frontend/` (command timeout 120 seconds; Bash tool timeout 130000 ms). **Breakpoint:** stop if the portal composition cannot be preserved without changing AppShell ownership, introducing a broad public contract change, or redesigning the layout.
2. **pending - Associate Home selection with its chapter-links panel.** Connect each existing chapter choice to the matching active links panel using the Stage 1 semantics. Preserve icon/label presentation, the initial Reference selection, existing in-page selection behavior, and every Router `<Link>` and destination. Extend the focused Home tests to prove selected-state and panel association, link content changes, and keyboard selection. **Proof:** `timeout 120s npm test -- --testTimeout=120000 src/pages/__tests__/HomePage.test.tsx` from `frontend/` (command timeout 120 seconds; Bash tool timeout 130000 ms). Re-run Stage 1 proof only if Stage 2 changes its source, tests, or other exercised inputs.

Stages are sequential. Passing behavioral proof remains valid until a later change affects its command, inputs, exercised behavior, configuration, dependencies, or environment. No parallel stages are selected.

## Progress and decisions

- **Stage 1:** accepted - `timeout 120s npm test -- --testTimeout=120000 src/components/__tests__/PageHeader.test.tsx src/components/__tests__/NavigationPrimitives.test.tsx` passed (2 files, 13 tests; `frontend/`, command timeout 120s, Bash tool timeout 130000 ms). Shared tabs have associated panels and keyboard semantics; BrowserLayout marker is static, header slot retained.
- **Stage 2:** accepted - `timeout 120s npm test -- --testTimeout=120000 src/pages/__tests__/HomePage.test.tsx` passed (5 tests; `frontend/`, command timeout 120s, Bash tool timeout 130000 ms). Selected chapter/panel association, keyboard selection and retained Router links passed; Stage 1 inputs unchanged, its proof retained.
- Decision: Home's selectable chapters control in-page content and therefore need actual tab-panel association and keyboard behavior. BrowserLayout's one-chapter marker is static. Keep Home's Router links as links and preserve the existing icon/appearance treatment.
- Decision: Reuse the shared Tabs API where it fits. Its current string label and bundled tab-list/panel composition must not be assumed to fit PageHeader's icon labels and header-slot composition; change the shared API only for a demonstrated gap and within this Plan's boundaries.

## Proof

- **Stage 1 (from `frontend/`):** `timeout 120s npm test -- --testTimeout=120000 src/components/__tests__/PageHeader.test.tsx src/components/__tests__/NavigationPrimitives.test.tsx` - Bash tool timeout: 130000 ms. Proves PageHeader's static marker remains non-tab content and the selected tab behavior exposes associated panels and keyboard operation.
- **Stage 2 (from `frontend/`):** `timeout 120s npm test -- --testTimeout=120000 src/pages/__tests__/HomePage.test.tsx` - Bash tool timeout: 130000 ms. Proves Home's selected chapter matches its accessible panel and links, including keyboard selection, without changing routes.
- Run only the focused behavioral commands above; no broad checks are part of this Plan. Preserve passing proof until an affecting change invalidates it.

## Escalation boundaries

- Stop if the existing PageHeader/AppShell slot composition cannot be retained without changing AppShell ownership, a broad public API, the Home layout, or its visual direction. Do not silently introduce a redesign or route change.
- Stop rather than converting Router links or BrowserLayout's static chapter marker into tabs, changing Home's destinations or content, adding persistence, or adding a dependency.
- If a shared Tabs API change is needed, keep it generally named and limited to the demonstrated icon-label or list/panel composition gap. Escalate if the needed change exceeds that bounded API adaptation.
- Do not change other PageHeader consumers or adjacent disclosure, action, form, overlay, or drag-and-drop behavior.

## Visible result

> On Home, choosing a chapter selects an accessible tab and shows its matching links; chapter markers on browser pages remain static.
