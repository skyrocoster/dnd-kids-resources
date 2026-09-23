# Frontend primitive migration log

This is the running record for moving the generic primitives from
`scratch/chess-move-trainer/frontend/src/features/design-system/` into the
production frontend. The scratch copy is a read-only reference; migrated
components belong under `frontend/src/components/` and use the production
theme in `frontend/src/theme.css`.

## Status

| Family | Status | Notes |
| --- | --- | --- |
| Core and content | Done | Existing `Button` reused; Accordion, Avatar, CalendarDate, Disclosure, NavigationMenu, ProgressMeter, ScrollArea, Separator, and Tabs are implemented with production tokens. |
| Overlays | Done | Existing `Dialog` and `Tooltip` APIs are preserved; compound Dialog, Toast, and PreviewCard are implemented and tested. |
| Form controls | Done | All 16 public form controls are implemented; the existing production fields remain unchanged. |
| Menus | Done | Menu, menubar, and context-menu wrappers are implemented with shared item rendering. |
| Feedback | Done | Core, inline, page, and panel feedback components use production semantic color roles. |
| Verification and inventory | Done | Component inventory updated; focused tests and a scoped TypeScript check passed. |

## Decisions and reasoning

- Keep the scratch source untouched. It is a reference copy, not an application
  entry point.
- Use regular colocated CSS, matching the existing production components,
  rather than carrying the scratch CSS-module convention into production.
- Preserve existing production component APIs when a scratch primitive has the
  same name. In particular, retain the production `Button`, `Dialog`, and
  `Tooltip` props and behavior while incorporating the reusable behavior from
  the scratch implementations.
- Use `frontend/src/theme.css` rather than importing the scratch token or
  Material export files. Map scratch spacing `4/8/12/16/24/32/48px` to
  production `--space-1` through `--space-7`; radii `4/8/12px` to
  `--radius-sm/md/lg`; focus rings to `2px solid var(--md-primary)` with a
  `2px` offset; elevation to `--elevation-shadow`; and short motion to
  `--motion-fast`.
- Use existing `--md-*` color and `--type-*` typography tokens for the
  corresponding scratch Material roles. The production theme does not have
  dedicated info/success/warning feedback roles, so map those to the closest
  existing semantic palette roles (blue `--md-skill`, green `--md-nature`,
  and gold `--md-secondary`); map error to `--md-error`. Do not reintroduce
  scratch-only color tokens to fill this gap.
- `CalendarDate` uses `react-day-picker`, which is not currently listed as a
  frontend dependency. The migrated component still requires it, so add the
  pinned runtime dependency `react-day-picker@10.0.1`.
- Use the existing shared `Dialog` implementation for the production-specific
  `open`/`onClose` API and route the scratch compound Base UI API through the
  same export only when `onClose` is absent. This avoids replacing consumers
  such as `ConfirmDialog` while making the compound primitive available.

## Running notes

- 2026-09-23: Inventory confirmed the scratch source includes core/content,
  overlay, menu, form-control, and feedback families. Production already has
  shared `Button`, `Dialog`, and `Tooltip` components, and its theme tokens use
  `--md-*` names. The migration will avoid overwriting unrelated work already
  present in the worktree.
- 2026-09-23: Completed the core/content, navigation, calendar/progress,
  overlays, menus, feedback, and all form-control families. Added the
  `react-day-picker@10.0.1` dependency for CalendarDate. No scratch source,
  scratch token, or Material export files are imported into production.
- 2026-09-23: Updated `docs/COMPONENTS.md` to include the new shared primitives.
  Migrated or added focused component tests; Storybook specimen files from the
  scratch copy were not copied because the requested work was the production
  primitives and their behavior, not a separate showcase surface.
- Verification from `frontend/`: the focused primitive suite passed (11 files,
  45 tests). A scoped TypeScript check of the migrated components and tests
  passed. A token-reference scan found no production `--cmt-*`, `--md-sys-*`,
  scratch module imports, or stale `--md-surface-container` references.
- `npm install --save-exact react-day-picker@10.0.1` completed. npm printed a
  notice that the current dependency tree has four high-severity advisories;
  no audit or dependency remediation was run as part of this migration.
