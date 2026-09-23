# Frontend component migration map

This is a comparison of the reusable components in `frontend/src/components/`
with the reference components staged under
`scratch/chess-move-trainer/frontend/src/features/design-system/`. It maps all
18 shared React component files; it is not a recommendation to move the scratch
copy wholesale or import from `scratch/`.

Pages and product-specific components under `frontend/src/pages/`,
`frontend/src/features/`, and `frontend/src/player/` are app compositions, not
generic design-system replacements. Keep those in place and migrate their shared
building blocks selectively. `remoteState.ts`, `referenceText.ts`, and
`glossaryTerms.ts` are supporting modules rather than UI components. The
`components/icons/index.ts` barrel is also app-owned: it exports Lucide icons
and D&D-specific aliases, and has no matching scratch barrel.

## Component-by-component map

Current-component paths are relative to `frontend/src/`; scratch paths are
relative to `scratch/chess-move-trainer/frontend/src/`.

| Current component | Scratch component to use as a migration reference | Recommendation |
| --- | --- | --- |
| `components/Button.tsx` | `features/design-system/Button.tsx` | **Already adapted.** Keep the local component and API. It adds `danger` and `loading` behavior beyond the scratch variants; preserve those. |
| `components/Tooltip.tsx` | `features/design-system/overlays/Tooltip.tsx` | **Already adapted.** Keep the local component and colocated `Tooltip.css`; the provider and tooltip APIs already closely match. |
| `components/Dialog.tsx` | `features/design-system/overlays/Dialog.tsx` | **Not migrated (2026-09-23).** A Base UI attempt did not preserve the current focus-on-open, focus-return, and focus-trap tests for controlled dialogs without a trigger. The working custom Dialog remains in place pending a focus strategy that passes those checks. |
| `components/ConfirmDialog.tsx` | Compose `features/design-system/overlays/Dialog.tsx` with `features/design-system/Button.tsx` | There is no scratch `ConfirmDialog`. Keep this app-level wrapper. Move it onto the migrated Dialog only after the dialog path preserves the current `alertdialog` role and pending behavior. The scratch Button also lacks the local `danger` variant and `loading` prop; retain or port those before using it for this confirmation action. |
| `components/form/TextField.tsx` | `features/design-system/form-controls/Field.tsx` + `features/design-system/form-controls/TextInput.tsx` | **Migrated (2026-09-23).** Uses Base UI Field and Input primitives following the scratch Field/TextInput pattern. It keeps the current API and local `.form-control` styling, including numeric input attributes; the multiline textarea remains native. |
| `components/form/SelectField.tsx` | `features/design-system/form-controls/Field.tsx` + `features/design-system/form-controls/Select.tsx` | **Near match.** The scratch Select is a custom Base UI control; adapt its `value`/`onValueChange` contract to the current native-select API and retain label, placeholder, and error behavior. |
| `components/form/MultiSelectField.tsx` | `features/design-system/form-controls/CheckboxGroup.tsx` | **Migrated (2026-09-23).** Uses Base UI CheckboxGroup/Checkbox with its existing `label`, `options`, `selected`, and one-argument `onChange` API. It uses local plain CSS and keeps the current horizontal option layout. |
| `components/form/CheckboxField.tsx` | No direct scratch equivalent; `form-controls/Field.tsx` can supply field labeling | Keep a native single checkbox. Do not substitute `CheckboxGroup`, `Switch`, or `Toggle`: they have different control semantics. |
| `components/StatePanel.tsx` | `features/design-system/feedback/PanelFeedback.tsx` | **Partial match.** PanelFeedback can cover static error/information messages after mapping the local status to a severity. It does not provide the current loading/empty states, action slot, default copy, or `role="status"` live-region defaults; preserve those with an app adapter or keep those cases local. |
| `components/SearchList.tsx` | Nearest, but not equivalent: `form-controls/Combobox.tsx` or `form-controls/Autocomplete.tsx`; `ScrollArea.tsx` may help with scrolling | Keep SearchList as its own composite. The scratch controls are popup form inputs, while SearchList is an always-visible, selectable results list with metadata, variants, and status panels. Reuse a scratch control only if a particular use case is intentionally changing to a dropdown. |
| `components/IconButton.tsx` | `features/design-system/Button.tsx` | **Migrated (2026-09-23).** Now composes the local migrated Button as a compact ghost button and retains the icon-only `icon-btn` styling, accessibility label, and public props. |
| `components/Card.tsx` | No direct match. `features/design-system/overlays/PreviewCard.tsx` is **not** a replacement. | Keep the app's titled content card. PreviewCard is a link-triggered hover preview, not a static card with title, subtitle, variant, body, and footer. |
| `components/GlossaryTerm.tsx` | No direct match; `features/design-system/overlays/Tooltip.tsx` is only a conceptual neighbor | Keep the glossary behavior. It is an interactive D&D term definition (hover, focus, and click), not merely a sighted-user tooltip. Consider Tooltip only for short hint content if behavior and accessibility remain appropriate. |
| `components/DiceText.tsx` | No scratch equivalent | Keep it app-specific. Dice-notation parsing, dice pills, and glossary integration are D&D behavior. |
| `components/PageHeader.tsx` | `features/design-system/Tabs.tsx` for the tab control only | No full page-header equivalent. Keep the AppShell portal/header integration; evaluate Tabs only for the chapter-tab portion if its panel/selection behavior fits. |
| `components/SplitPane.tsx` | No direct match. `ScrollArea.tsx` and `Separator.tsx` are lower-level primitives only. | Keep the resizable, collapsible, persisted split pane. Neither a scrollbar nor a separator implements its sizing, keyboard, responsive, and persistence behavior. |
| `components/BrowserLayout.tsx` | No direct match | Keep as app composition: it combines PageHeader, SplitPane, list/detail behavior, error display, editor, and dialog slots. Migrate its child primitives independently rather than replacing the layout. |
| `components/FloatingWindow.tsx` | No direct match | Keep the custom draggable/resizable/minimizable window and session-storage behavior. Scratch Dialog and PreviewCard have different interaction models. |

## Migration guardrails

- The scratch tree is a read-only reference copy, is not wired into this app,
  and must not be imported from. See `scratch/chess-move-trainer/README.md`.
- Migrate one component at a time into `frontend/src/components/`, keeping this
  repo's colocated plain CSS pattern (`<Name>.tsx` plus `<Name>.css`) rather
  than copying CSS Modules as-is.
- Preserve existing local component APIs and behavior unless a deliberate
  change is approved. Several scratch controls are useful foundations, but are
  not drop-in replacements for current props or accessibility behavior.
- Translate scratch tokens to this app's tokens using the mapping in the
  scratch README, and keep using `frontend/src/theme.css`; do not import the
  scratch theme files.

## Migration log

- 2026-09-23 — Migrated `MultiSelectField` using the scratch
  `CheckboxGroup` as the reference. Updated `MultiSelectField.tsx` to use Base UI
  CheckboxGroup/Checkbox and added the adapted styles to `form.css`. Existing
  local props and option layout are unchanged.
- 2026-09-23 — Adapted the three component test queries to target visible
  `role="checkbox"` controls. The first run showed that Base UI's accessible
  checkbox and its visually hidden form input both match `getByLabelText`.
- 2026-09-23 — Wrapped Base UI's `onValueChange` so only the selected-values
  array reaches the existing one-argument `onChange` callback. The focused test
  exposed Base UI's additional event-details argument.
- 2026-09-23 — Verification passed: `timeout 60s npm exec -- vitest run
  src/components/form/__tests__/MultiSelectField.test.tsx --reporter=verbose
  --testTimeout=20000 --pool=threads --maxWorkers=1` (3 tests).
- 2026-09-23 — Migrated `TextField` using the scratch Field/TextInput
  pattern. Single-line inputs now use Base UI Input inside Base UI Field; textarea
  stays native, existing props and local styles remain, and a regression test
  covers the `type="number"` attributes used by feature forms.
- 2026-09-23 — Verification passed: `timeout 60s npm exec -- vitest run
  src/components/form/__tests__/TextField.test.tsx --reporter=verbose
  --testTimeout=20000 --pool=threads --maxWorkers=1` (5 tests).
- 2026-09-23 — Migrated `IconButton` by composing the local Button (already
  adapted from the scratch Button) as a compact ghost control. The existing
  icon-only CSS and public props remain. The first test run exposed that local
  Button lets a supplied `className` replace its default classes, so IconButton
  supplies the full base/ghost/compact/icon class set and appends any consumer
  class without changing the existing Button implementation.
- 2026-09-23 — Verification passed: `timeout 60s npm exec -- vitest run
  src/components/__tests__/IconButton.test.tsx --reporter=verbose
  --testTimeout=20000 --pool=threads --maxWorkers=1` (5 tests).
- 2026-09-23 — Assessed a Base UI Dialog migration and found that its controlled,
  triggerless use did not pass this app's focus-on-open, focus-return, or
  focus-trap tests, including after enabling explicit initial/final focus and
  restoring the local focus effect. Reverted the component, CSS, and test
  changes; the working Dialog implementation remains unchanged.
- 2026-09-23 — Verified the retained Dialog implementation after the rollback:
  `timeout 60s npm exec -- vitest run
  src/components/__tests__/Dialog.test.tsx --reporter=verbose
  --testTimeout=20000 --pool=threads --maxWorkers=1` (13 tests passed).
