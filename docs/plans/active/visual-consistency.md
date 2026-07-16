# Visual Consistency Plan — Cross-Cutting Aesthetic Remediation

> **Status:** VF0-VF5, VW0-VW6, VT0-VT2 shipped. VT3 - Map Lab editor is next.

- **Area guide:** [Visual Design](../../areas/visual-design.md).

---

## What this phase is

This plan repairs the visual and interaction consistency of the existing D&D Kids Resources application. It
turns a collection of independently styled CRUD pages and specialist table tools into one coherent tabletop
field guide: fast to scan during play, clear on touch devices, and visibly organized around the campaign domains
it serves.

This is an incremental frontend remediation, not a product rewrite. It standardizes shared framing, controls,
states, dialogs, responsive behavior, and typographic hierarchy while preserving the distinctive domain anatomy
of the bestiary field card, NPC dossier, encounter runner, and Map Lab.

---

## Key facts / visual baseline

- The frontend is React + Vite + TypeScript. Shared primitives live in `frontend/src/components/`; routed pages
  live in `frontend/src/pages/` and `frontend/src/features/`; site chrome lives in
  `frontend/src/layout/AppShell.tsx` and `AppShell.css`.
- The application has ten list/detail browser routes. Most independently compose a toolbar, `SplitPane`,
  `SearchList`, detail region, editor, and deletion confirmation. Only the monster browser currently supplies a
  complete narrow-screen list/detail layout.
- Eight domain editors independently implement modal backdrops, headers, status messages, actions, and close
  controls. Monster editing is intentionally a routed full-page editor and must remain one.
- `SearchList` currently treats an unresolved request, a truly empty collection, and a filtered-empty result as
  the same state. Browser routes generally initialize with an empty array and have no loading state.
- **VF4 confirmed shell composition:** the desktop side rail (`useNavCollapse()`-persisted) now only renders
  above `768px`; below that it's hidden and replaced by a `Dialog`-based mobile drawer opened from an
  `.app-nav-mobile-trigger`-wrapped `IconButton` in the header (see `docs/DESIGN_SYSTEM.md`'s "Shell and
  entry-point contract (VF4)" section for the full contract). The nav-section → route map that drives both the
  rail/drawer and `HomePage`'s chapter tabs lives in `frontend/src/layout/navSections.ts` — extend it once for
  a new feature route rather than duplicating the list per consumer. `SplitPane` is still horizontal by default;
  feature-level CSS still owns its own responsive behavior (VF4 did not touch `SplitPane`).
- **Gotcha:** `IconButton` (`components/IconButton.tsx`) hardcodes `className="icon-btn"` and spreads `...rest`
  after it, so passing a `className` prop silently replaces `"icon-btn"` instead of merging. Wrap it in a
  container element for any positioning/responsive class instead.
- The documented 48px touch-target floor is now met by the VF1/VF2 shared primitives (`Button` normal size,
  `IconButton`, `SearchList`'s input/item rows, and the shared `form/form.css` controls). It is still not met by
  many older feature-owned controls outside those files. Map Lab SVG marker geometry is the documented exception;
  ordinary controls are not.
- **VF1 confirmed token scale** (`frontend/src/theme.css`, documented in `docs/DESIGN_SYSTEM.md`'s "Foundation
  token scale" section): `--space-1..7` (0.25rem→3rem), `--radius-sm/md/lg/full` (0.25rem/0.375rem/0.75rem/999px),
  `--control-height`/`--control-height-compact` (48px/32px), `--elevation-shadow`/`--backdrop-color`,
  `--motion-fast`/`--motion-normal` (0.15s/0.2s ease), `--z-editor`/`--z-floating`/`--z-dialog` (100/150/200).
  `--md-surface-variant` now aliases `--md-surface-3`, resolving the prior undefined reference in
  `MapLabPage.css` (not touched this stage; VW/VT stages adopting that file inherit the fix automatically).
  `Button.css`, `IconButton.css`, `PageHeader.css`, `StatePanel.css`, `Dialog.css`, `SearchList.css`,
  `form/form.css`, and `Card.css` (radius only) consume the new tokens so far — every other component CSS file
  still carries pre-VF1 ad-hoc values and should migrate to the scale as its owning VW/VT stage touches it, not
  as a standalone sweep. `SplitPane.css`'s `0.5rem` outer-corner radius is a documented one-off, not migrated.
- **VF5 confirmed token migration status:** `AppShell.css` now fully consumes foundation tokens (spacing,
  radius, control-height, motion-normal for the nav transition). `SearchList.css` input now has a
  `focus-visible` outline (`2px solid var(--md-primary)` + `2px offset`) matching the accessibility floor.
  `FloatingWindow.css` no longer carries a redundant local `@media (prefers-reduced-motion)` block — it relies
  on the global `!important` reset in `theme.css`. All shared foundation CSS files (Button, IconButton,
  PageHeader, StatePanel, Dialog, SearchList, Card, AppShell) now consume tokens; `SplitPane.css`'s
  documented one-off radius remains unchanged.
- **VF1 responsive breakpoint convention** (documented, not CSS custom properties — media features can't consume
  `var()`): `520px` (narrow phone) and `768px` (tablet), matching the majority existing `@media` usage (Monster
  routes). `DungeonShell.css`/`MapLabPage.css` still use `38rem`/`56rem`; reconcile only when a VT stage already
  has that file in its touch set.
- **VF1 font-role decision:** no bundled display typeface was adopted. Evaluating, sourcing, licensing, and
  offline-bundling a new face wasn't proportional to this stage's scope; route headings keep using
  `--type-face`. A future stage may revisit this only if it stays offline-safe and license-compatible.
- **VW0 confirmed browser composition:** all ten browser pages follow an identical structural pattern:
  toolbar/header with `<h2>` title + "New" button, error `<p>`, `SplitPane` with `SearchList` left and detail
  right, optional modal editor, optional `ConfirmDialog`. `BrowserLayout` (`components/BrowserLayout.tsx`) now
  wraps this pattern: `title`, `actions?`, `error?`, `list`, `detail`, `editor?`, `dialog?`, `listLabel?` — it
  uses `SplitPane` internally so consumers don't re-import it. `BrowserLayout.css` uses foundation tokens
  (`--space-2`, `--md-error`). The component is currently unused (scaffolding only); VW1 will wire it into the
  standard browser routes. **API naming gotcha:** `api.listNPCs` uses capital NPC (not `listNpcs`). All other
  list methods use lowercase entity names (`listSpells`, `listWeapons`, `listMonsters`, `listItems`,
  `listLootBundles`, `listQuests`, `listEncounters`, `listDungeons`, `listPlayers`). Type fixtures must use
  structured types for Monster (`ArmorClass { value, note, alternatives }`, `HitPoints { average, formula }`,
  `MovementSpeed { mode, feet, note, hover }`, `CreatureSize` lowercase strings), `Record<string, unknown>` for
  NPC `stats` and `appearance`, and `string | null` for `Weapon.req_attune`.
- The existing palette is broadly token-compliant. The material issue is composition and interaction drift:
  duplicated component families, conflicting responsive breakpoints outside the VF1 convention above, and
  inconsistent state/action hierarchy.
- The intended visual language is a **tabletop field guide**: dark, calm, and legible at table speed. Existing
  role colors identify content domains; page structure, iconography, and direct language communicate function.
- Each content domain gets a restrained icon-and-text chapter tab in its route header. This is the plan's
  signature device: it makes the app's campaign structure visible without adding fantasy ornament or relying on
  hue alone.
- **VW3 confirmed action-flow routing:** Encounter browser primary action is Run → `/encounters/:id/run` (the
  encounter runner route). Dungeon browser primary actions are Enter → `/dungeons/:id` (the dungeon viewer, a
  `DungeonShell` layout route) and Edit → `/dungeons/:id/edit` (the Map Lab editor, a child of `DungeonShell`).
  Dungeon creation uses `api.createDungeon({ title, data })` → `/dungeons/:id/edit` with an `Untitled Dungeon [n]`
  title-disambiguation algorithm. DungeonBrowserPage's `react-router-dom` mock (`useNavigate` → `mockNavigate`) is
  preserved in the dedicated test file; VW0 seam tests use `MemoryRouter` with `Routes` instead.
- **VW6 confirmed workspace pass:** `SearchList` reserves `emptyMessage` for ready empty/filtered-empty states,
  retaining default error copy on failures. `Dialog` pending content is disabled and inert, including links and
  other non-form focusables. Item/Loot first-run panes render only after a successful empty response; loot catalog
  pickers use `RemoteState` with `SearchList` status so loading/error never masquerades as an empty catalog. The
  touched authoring/picker controls meet the 48px floor, LootBundleEditor uses the 520px narrow breakpoint, and
  MonsterEditor withholds edit fields until loading completes, passes delete pending state to ConfirmDialog, and
  derives its accents from tertiary tokens.
- **VT1 confirmed runner/dock controls and error recovery:** All interactive controls in `CombatantCard.tsx`, `EncounterRunnerBoard.tsx`, and `ConditionPicker.tsx` now use `var(--control-height)` (48px) ensuring uniform touch-target floor. Table-time actions (active toggle, HP, status, conditions) are semantically separated from roster-management actions (reorder, duplicate, remove) via aria-labeled `role="group"` containers in the card header for accessibility and visual clarity. `useEncounterRunner` hook now exposes `loadError: string | null` with try/catch around `getEncounter()` (set on error, cleared on success/retry), and `EncounterRunnerPage` renders error state via `StatePanel` with a retry button. `FloatingWindow.tsx` now clamps position to viewport bounds via `clampPosition(x, y, width, height)` helper, keeping the window accessible at narrow widths. Dock/compact-mode spacing preserved (`CombatantCard.css` compact class remains unchanged); all controls meet 48px floor in all modes.
- All user-facing primary controls and prose use the existing token system. This plan may add a bundled display
  typeface for route headings only after VF1 verifies package/licensing/build implications; body and utility text
  remain optimized for legibility.

---

## Design system in force

`docs/DESIGN_SYSTEM.md` remains the canonical reference. This plan extends it only for durable site-wide
contracts.

- Preserve the MD3 dark surface model and semantic `--md-*` role tokens. Do not introduce hand-picked component
  colors, themed textures, parchment treatments, or generic decorative gradients.
- Preserve the existing type tokens and icon-barrel policy. VF1 may add named display, body, and utility font
  roles only when the fonts are bundled locally and work offline; never add a runtime CDN dependency.
- Introduce a compact token scale for spacing, radius, control size, elevation, motion, z-index, and responsive
  breakpoints. Token values must be derived from the dominant existing values where possible, so the foundation
  pass does not become a surprise visual redesign.
- Use `PageHeader` to establish one routed-page `h1`. `AppShell` branding becomes a home link, not a competing
  page heading.
- Use `Button` and `IconButton` for ordinary actions. Default interactive controls are at least 48px; compact
  density is allowed only for documented desktop-only inspector controls and requires an equivalent accessible
  target.
- Use `StatePanel` for loading, empty collection, filtered-empty, error, and no-selection states. Copy must say
  what happened and name the next action.
- Use `Dialog` for modal focus, Escape, focus restoration, saving state, and backdrop policy. `ConfirmDialog`
  becomes a consumer of that contract.
- Respect the existing accessibility floor: visible focus, reduced motion, semantic labels, no hue-alone cues,
  and touch targets of at least 48px outside documented canvas exceptions.

---

## Reusable pieces (do not rebuild)

- `frontend/src/theme.css` and `frontend/src/index.css` — token source and global accessibility baseline.
- `frontend/src/layout/AppShell.tsx` / `AppShell.css` and `hooks/useNavCollapse.ts` — site navigation state;
  preserve the intentionally separate dungeon room-rail collapse behavior.
- `frontend/src/components/Card.tsx`, `SearchList.tsx`, `SplitPane.tsx`, `ConfirmDialog.tsx`,
  `FloatingWindow.tsx`, `DiceText.tsx`, and `components/form/` — evolve their contracts; do not create parallel
  versions.
- **Confirmed VF2 contracts** — `SearchList` takes an additive `status?: 'ready' | 'loading' | 'error'` prop
  (default `'ready'`) and renders the shared `StatePanel` for its loading/error/empty/filtered-empty states;
  its item rows are plain buttons (`aria-current="true"` marks the selected row, not `aria-selected`/
  `role="option"`). `StatePanel` renders a `.state-panel-spinner` only when `status="loading"`. `SplitPane`'s
  visible divider is unchanged (4px); its pointer hit target is widened via `.split-pane-handle::before`
  (14px each side, absolutely positioned) rather than by resizing the element. `.form-control` and
  `.form-field-checkbox` (in `form/form.css`) meet the 48px `--control-height` floor; `TextField`/
  `SelectField`/`CheckboxField`/`MultiSelectField` inherit this for free since they all render those classes.
  `.visually-hidden` now lives only in `index.css` (global) — do not redefine it in feature or component CSS.
- **Confirmed VF3 contracts** — `Dialog` (`components/Dialog.tsx`) is the one modal accessibility contract:
  `open`/`title`/`description?`/`onClose`/`children?`/`footer?`/`pending?` (default `false`)/`role?`
  (`'dialog' | 'alertdialog'`, default `'dialog'`). It handles title/description `useId()` association,
  initial focus (first focusable element, else the dialog surface), Tab/Shift+Tab focus containment,
  Escape and backdrop dismissal (both call `onClose`, both suppressed while `pending`), focus restoration
  to the pre-open active element, and a `<fieldset disabled={pending}>` (styled `display: contents`)
  wrapping body+footer so pending disables every interactive descendant in one place; the dialog surface
  also carries `aria-busy` while pending. `ConfirmDialog` (`components/ConfirmDialog.tsx`) is now a thin
  `Dialog` consumer: same public API (`message`, `confirmLabel` default `'Delete'`, `onConfirm`,
  `onCancel`) plus an additive `pending?` prop; it passes `role="alertdialog"` and `title={message}` (no
  duplicate body text) and renders shared `Button`s (`variant="secondary"` Cancel,
  `variant="danger"` confirm with `loading={pending}`) as the footer. `ConfirmDialog.css` was deleted —
  all dialog styling lives in `Dialog.css` now.
- **Confirmed VF4 contracts** — `layout/navSections.ts` exports `navSections: NavSection[]`
  (`{ label, icon: LucideIcon, links: { to, label, linkIcon: LucideIcon }[] }`), the single source of truth
  for the nav-section → route map; `AppShell`'s desktop rail, its mobile drawer, and `HomePage`'s chapter tabs
  all read from it. `AppShell`'s `.app-brand` is a `react-router-dom` `Link to="/"` (not an `h1`); its mobile
  nav drawer is a `Dialog` (`title="Navigate"`) opened by an `IconButton` (`aria-label="Open navigation"`)
  wrapped in a `.app-nav-mobile-trigger` container — the container carries the responsive class because
  `IconButton` does not merge a passed `className` (see the `IconButton` gotcha in `Key facts`). The rail/drawer
  swap happens at the shared `768px` breakpoint. `HomePage` renders one `PageHeader` `chapterTabs` entry per
  `navSections` group (local `useState`, no URL state) over a `.home-page-grid` of `Link`-based icon+label
  cards. `router.tsx` exports a `routes` array (consumed to build the exported `router`); the `demo` route is
  spliced in only when `import.meta.env.DEV` is true, so it's dead-code-eliminated from production builds.
- `frontend/src/components/icons/index.ts` — only import point for Lucide icons.
- **Confirmed VW0 contract** — `BrowserLayout` (`components/BrowserLayout.tsx`) wraps toolbar + error +
  `SplitPane` (list left, detail right) + editor + dialog slots. Props: `title`, `actions?: ReactNode`,
  `error?: string | null`, `list: ReactNode`, `detail: ReactNode`, `editor?: ReactNode`, `dialog?: ReactNode`,
  `listLabel?: string`. VW1 extends this initial slot API with routed-header and narrow-detail support.
- **Confirmed VW1 contract** — `BrowserLayout` now owns the routed `PageHeader`, including an optional one-tab
  icon-and-text chapter marker. Its additive `chapterIcon?: ReactNode` and `detailOpen?: boolean` props retain the
  original slot API; `detailOpen` activates the `520px` detail-only styling and `.browser-layout-back` display.
  Standard detail actions use shared `Button` variants, while content details remain feature-owned.
- `MonsterStatBlock`, `NPCStatCard`, `CombatantCard`, `MapCanvas`, Map Lab marker components, and the Map Lab
  reducer/hooks — feature signatures to frame consistently, not genericize.
- **Confirmed VW6 shared semantics** — use `SearchList`'s `status` for picker loading/error states rather than
  rendering empty collection copy; empty-browser creation panes require a successful empty response. Pending
  `Dialog` content is inert as well as disabled. These contracts are covered by focused regression tests.
- **Confirmed VT2 viewer composition** — `DungeonShell` wraps the dungeon viewer (`MapLabPage`) and editor (`MapLabEditorPage`) routes, providing a consistent `h1` title, View/Edit mode toggle, and shell error/loading states. At the VF1 breakpoints, `DungeonShell.css` now uses `768px` for header flex-direction wrap; `MapLabPage.css` and its `.maplab-canvas` layout use `768px` for rail/canvas/sidebar wrap and `520px` for compact room button sizing and horizontal room rail. The responsive layout is entirely CSS-driven: at 520px, `flex-wrap` naturally stacks the viewer rail (room navigation), canvas (map), and sidebar (inspector/details) vertically. Room buttons meet the 48px floor via `var(--control-height)` (from VT1). No narrow-screen toggles or drawer patterns are needed — the stacked layout keeps all navigation reachable via scroll. Encounter dock remains draggable within viewport via VT1's `clampPosition()` helper.
- **Confirmed VW2 contracts** — Monster/NPC/Items/Loot now follow the VW1 `RemoteState<T>` + `BrowserLayout`
  `detailOpen`/Back-to-list pattern exactly. Monster keeps its routed `/monsters/new` and `/monsters/:id/edit`
  flow (no browser-level delete) and still honors `location.state.selectedId` on return from the editor.
  NPC/Items/Loot keep local modal CRUD with `ConfirmDialog`; each now tracks a `deleting` boolean passed as
  `ConfirmDialog`'s `pending` prop (this was previously undone for Quest/Spell/Weapon/Player too — VW1 added
  the prop plumbing on `ConfirmDialog` but never wired a per-page pending state, so no shipped browser route
  showed dialog pending/busy state before VW2). **Card/SearchList variant decision:** kept NPC on the existing
  `neutral` `Card`/`SearchList` variant rather than adding a typed `npc` variant — `NPCStatCard` already renders
  its own dossier markup (not `Card`) and already carries `data-variant="npc"` directly, so a typed union entry
  would have no consumer; `Card.tsx`/`SearchList.tsx`/`theme.css`/`docs/DESIGN_SYSTEM.md` were not touched.
  `MonsterStatBlock.css`'s literal teal (`rgb(160 208 190 / …)`, `rgb(188 236 217 / …)`, `rgb(29 79 64 / 0.72)`)
  is now derived via `color-mix(in srgb, var(--md-tertiary) …%, …)` — no visual change intended, just
  token-sourced instead of hand-picked hex.
- **Confirmed VW3 contracts** — Encounter and Dungeon browsers now follow the VW1 `RemoteState<T>` +
  `BrowserLayout` `detailOpen`/Back-to-list pattern. Encounter uses `ShieldIcon` as its chapter marker, Run
  as the primary action (`variant="primary"`), and Edit/Delete as secondary/danger; creature roster HP/AC/status
  detail is preserved. Dungeon uses `DoorIcon` as its chapter marker, Enter as `variant="secondary"` (navigates
  to `/dungeons/:id`), Edit navigates to `/dungeons/:id/edit`, and Delete is `variant="danger"`; the
  `Untitled Dungeon [n]` creation algorithm and immediate `createDungeon` → editor navigation are preserved.
  Both track a `deleting` boolean passed as `ConfirmDialog`'s `pending` prop. DungeonBrowserPage's
  `react-router-dom` mock (`useNavigate` → `mockNavigate`) is preserved in the dedicated test file; VW0 seam
  tests use `MemoryRouter` with `Routes` instead.
- **Confirmed VW4 contracts** — all seven modal editors (`SpellEditor`, `WeaponEditor`, `PlayerEditor`,
  `NPCEditor`, `QuestEditor`, `ItemEditor`, `EncounterEditor`) render the shared `Dialog` directly instead of a
  duplicated backdrop/modal implementation: `title` is the editor's existing `Edit ${x}` / `Add New X` string
  (now also the dialog's accessible name via `aria-labelledby` — no separate `aria-label`), `onClose`,
  `pending={saving}`, and a `footer` of a `variant="secondary"` Cancel `Button` plus a
  `type="submit" form={formId}` Save `Button` (`formId` from `useId()`) that submits the editor's own
  `<form id={formId}>` rendered as the Dialog's `children`, even though the Save button sits outside that
  `<form>` in the DOM (the standard HTML `form` attribute bridges this). `Dialog` gained an additive
  `className?` prop (merged onto `.dialog`, not replacing it) so each editor keeps one small width-override
  class instead of Dialog imposing a single fixed width: `spell-editor-dialog`/`encounter-editor-dialog`
  `min(760px, 96vw)`, `npc-editor-dialog` `min(720px, 96vw)`, `weapon-editor-dialog` `min(680px, 96vw)`,
  `quest-editor-dialog` `min(640px, 96vw)`, `item-editor-dialog` `min(580px, 96vw)`, `player-editor-dialog`
  `min(520px, 96vw)`. Each editor's save-status paragraph gained `role="status"`. No editor needed a bespoke
  dirty-close policy — `Dialog`'s existing pending-suppressed Escape/backdrop dismissal covered all seven.
  Full contract recorded in `docs/DESIGN_SYSTEM.md`'s "Standard editor contract (VW4)" section.
- `ToolbarTray`, `InspectorPanel`, `RoomDetailsPanel`, and Map Lab's fixture/form model — retain their existing
  behavior and domain-specific information density.
- Existing Vitest/React Testing Library suites colocated with components and features — extend them rather than
  replacing behavior coverage with visual snapshots.
- **VT0 confirmed touch-target gap:** All encounter runner controls use `min-height: 2.75rem` (44px), below the
  48px `--control-height` floor. Worst offenders: `.combatant-reorder-button` (28×22px), `.combatant-condition-chip`
  (32px), `ConditionPicker` trigger/checkbox (2.75rem). The documented SVG marker exception does not apply to
  ordinary controls.
- **VT0 confirmed load-error gap:** `useEncounterRunner` has no `try/catch` around `getEncounter()` and no
  `loadError` in its return type. An API failure would throw unhandled. `EncounterRunnerPage` only handles
  NaN `id`; no error state exists.
- **VT0 confirmed breakpoint mismatches:** `DungeonShell.css` uses `38rem` and `MapLabPage.css` uses `56rem`,
  neither matching the VF1 convention (`520px` narrow / `768px` tablet). Reconcile when a VT stage already
  has that file in its touch set.
- **VT0 confirmed `FloatingWindow` gap:** `FloatingWindow.tsx` has no viewport-edge clamping for narrow screens;
  the floating surface can clip off-screen at small widths.

---

## Known debt / deferred work (NOT yet built)

- No light theme, backend/data-contract change, game-rule engine, data curation, or campaign feature expansion
  belongs in this plan.
- Spell class/source curation and executable spell mechanics require a focused plan under the [Spells area guide](../../areas/spells.md).
- Monster curation, sound playback, deep-linking, and stat calculations remain outside this plan.
- Encounter budgeting, templates, quick-add, player HP, and initiative remain owned by future encounter work.
- Dungeon cross-reference pop-outs and persisted passage-session state require a focused plan under the [Dungeons area guide](../../areas/dungeons.md).
- Do not replace Map Lab geometry, marker behavior, autosave, zoom/pan, fullscreen, fixture reducers, or layout
  persistence while improving its framing and control hierarchy.
- Do not introduce a global state library, CSS framework, runtime styling library, or component-library migration.

---

## Design Phase VT — Live Table Surfaces

Apply the shared system to the high-density surfaces used during play without simplifying away their domain
affordances. Changes are deliberately separated from geometry, reducer, and persistence work.
**Depends on:** VF5 committed; VW completion is recommended but not required for existing live-feature behavior.
**Depended on by:** no queued phase.

| Stage | Required strength | Summary | Deliverables |
|-------|-------|---------|--------------|
| **VT0 — Live-surface scaffolding** | Light | Add non-rendering style/test seams. | Skipped touch and narrow-layout tests. |
| **VT1 — Encounter runner** | Standard | Clarify combat priority and repair ordinary control targets. | Runner/dock hierarchy and failure state. |
| **VT2 — Dungeon viewer** | Standard | Align shell/viewer framing and narrow-screen room access. | Viewer layout and responsive tests. |
| **VT3 — Map Lab editor** | Standard | Improve editor control hierarchy without touching map mechanics. | Compact-field contract and inspector actions. |
| **VT4 — Final design pass** | High | Validate the entire routed product as one system. | Site-wide fixes and verification matrix. |

**Sequencing:** VT0 → VT1 → VT2 → VT3 → VT4. Do not combine Map Lab CSS refactoring with fixture/geometry/model
changes in the same stage.

**VT1 (collapsed)** — Encounter runner is shipped. See Shipped stages table above.

#### VT2 — Dungeon viewer (completed)

- **Read first:** `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/TESTING.md`,
  `frontend/src/features/dungeons/maplab/DungeonShell.tsx` (uses `38rem` breakpoint, not the VF1 `520px`
  convention), `frontend/src/features/dungeons/maplab/MapLabPage.css` (uses `56rem` breakpoint,
  not the VF1 `768px` convention), `frontend/src/features/dungeons/maplab/MapLabPage.tsx` (viewer
  composition — 4 VT0 seams added for narrow viewer, room rail, details, dock), and
  `frontend/src/features/dungeons/maplab/__tests__/DungeonShell.test.tsx` (2 VT0 seams for responsive
  regions and narrow room access), `frontend/src/features/dungeons/maplab/__tests__/MapLabPage.test.tsx`
  (4 VT0 seams for narrow viewer/rail/details/dock).
- **Build:** Align `DungeonShell`, `MapLabPage`, room rail, room-details panel, and viewer toolbar with the shared
  route-header and spacing contracts. Reconcile `DungeonShell.css`'s `38rem` and `MapLabPage.css`'s `56rem`
  breakpoints to the VF1 convention where the VT2 touch set already owns those files. Remove avoidable nested
  page padding, preserve the selected-room surface, and make room rail, map, and details reachable in a
  deliberate narrow-screen order. Keep canvas, markers, session passage state, docks, inspector behavior, and
  Map Lab responsive exceptions intact.
- **Inherits:** current DungeonShell route context, MapLabPage composition, viewer rail, RoomDetailsPanel, and all
  layout/marker behavior. VT1's confirmed runner/dock control fixes: 48px touch-target floor via `var(--control-height)`,
  aria-labeled action-group semantics, viewport-edge clamping for FloatingWindow, and load-error recovery pattern
  (hook try/catch + StatePanel rendering). All runner controls tested at narrow widths (520px) and compact modes;
  apply same sizing/semantic pattern to viewer toolbar, room-rail, and details-panel in VT2.
- **Expected touch set:** `DungeonShell.tsx`/`.css`, `MapLabPage.tsx`/`.css`, room rail and details components,
  viewer toolbar, dungeon viewer and Map Lab tests, `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, and this plan.
- **Documentation impact:** `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, and this plan record durable viewer composition conventions.
- **Tests:** Unskip all 2 `DungeonShell.test.tsx` VT0 seams (responsive regions, narrow room access) and all 4
  `MapLabPage.test.tsx` VT0 seams (narrow viewer, narrow room rail, narrow details, dock at narrow widths).
  Preserve existing Map Lab viewer, room selection, floor, marker, dock, and fullscreen tests; add responsive
  composition tests for selected-room reachability, mode navigation, and ordinary control targets.
- **Gate:** Run frontend test/typecheck/build gates. User manually verifies room selection by rail and map,
  encounter/NPC docks, floor changes, fullscreen, and a narrow viewport without changing authored data.
- **Discovery consolidation:** Update `Reusable pieces` with confirmed viewer composition contracts. Revise
  VT3-VT4 blocks with exact shell/viewer layout findings and responsive exceptions.
- **Completion edit:** Collapse VT2, set VT3 as next, and point the manifest to VT3's anchor.

#### VT3 — Map Lab editor (planned)

- **Read first:** `docs/DESIGN_SYSTEM.md`, `docs/TESTING.md`, `frontend/src/features/dungeons/maplab/MapLabEditorPage.tsx`
  (inspector selection actions need grouping into a shared component, compact fields need documentation,
  toolbar narrow layout needs work — 5 VT0 seams added), `frontend/src/features/dungeons/maplab/InspectorPanel.tsx`
  (selection actions repeated in Delete/Close region), `frontend/src/features/dungeons/maplab/MapLabEditor.css`,
  `frontend/src/features/dungeons/maplab/__tests__/MapLabEditorPage.test.tsx` (5 VT0 seams for inspector
  actions, compact fields, narrow toolbar, viewer responsive, dock responsive).
- **Build:** Adopt foundation spacing/radius/elevation tokens in `MapLabEditor.css` only where visual geometry is
  unaffected; make its compact field density an explicit documented exception with accessible targets; extract the
  repeated inspector Delete/Close region into a feature-local selection-action component; improve toolbar-tray,
  placement-mode, save-status, and inspector hierarchy. Keep SVG dimensions, strokes, marker state precedence,
  fixture form semantics, reducer actions, dual save, zoom/pan, fullscreen, and autosave unchanged.
- **Inherits:** VT2 framing and responsive breakpoints; the VW6-confirmed 520px narrow-editor breakpoint convention
  already used by LootBundleEditor; VT1's 48px touch-target floor and action-grouping patterns; existing ToolbarTray,
  MapLabEditorPage, FixturePropertiesForm, RoomContentEditor, maplab model/reducer/hooks, and visual marker contracts.
  Apply same control-height and semantic grouping to inspector action buttons, toolbar controls, and compact field
  labeling where accessibility targets are needed.
- **Expected touch set:** `MapLabEditorPage.tsx`, `InspectorPanel.tsx`, `MapLabEditor.css`, selection-action
  component, Map Lab editor tests, `docs/DESIGN_SYSTEM.md` (compact-field accessibility exception), and this plan.
- **Documentation impact:** `docs/DESIGN_SYSTEM.md` and this plan record the compact-field accessibility exception.
- **Tests:** Unskip all 5 `MapLabEditorPage.test.tsx` VT0 seams (inspector action grouping, compact fields,
  narrow toolbar, viewer responsive, dock responsive). Preserve all editor reducer, geometry, fixture,
  keyboard, save, zoom, and fullscreen tests. Add focused tests for compact field labeling, selection actions,
  save status, and narrow layout ordering.
- **Gate:** Run frontend test/typecheck/build gates. User manually verifies every editor tool family, room and
  fixture placement, editing, undo-free persistence path, fullscreen, and keyboard footprint editing.
- **Discovery consolidation:** Update `Key facts` and `Reusable pieces` with confirmed compact-field
  exceptions and inspector action contracts. Revise VT4 block with exact editor findings. Update
  `docs/DESIGN_SYSTEM.md` with the compact-field accessibility exception.
- **Completion edit:** Collapse VT3, set VT4 as next, and point the manifest to VT4's anchor.

#### VT4 — Final design pass (planned)

- **Read first:** `docs/DESIGN_SYSTEM.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md`, public route components, and relevant regression tests.
- **Build:** Perform a final `/frontend-design` review across every public route and all loading, empty, error,
  no-selection, modal, and narrow-screen states. Fix confirmed visual, accessibility, copy, density, and
  interaction regressions without adding feature scope.
- **Inherits:** all VF, VW, and VT components including: VT1's 48px touch-target floor, action-grouping semantics,
  viewport clamping, and load-error recovery patterns; VW6's SearchList error/empty-copy distinction and pending-Dialog
  inertness; every specialized feature identity and existing data contract. Validate these patterns work consistently
  across all routes at 320px, 375px, 520px, 768px, and desktop widths; verify keyboard focus, reduced-motion, and
  absence of horizontal overflow.
- **Expected touch set:** confirmed route defects/tests, canonical design or architecture references for durable corrections, and this plan.
- **Documentation impact:** This plan; update `docs/DESIGN_SYSTEM.md` or `docs/ARCHITECTURE.md` only for confirmed durable contract corrections.
- **Tests:** Add regression tests for each defect fixed. Run `npm run test`, `npm run lint`, `npm run typecheck`,
  and `npm run build`; run backend tests only if an unrelated backend change is included.
- **Gate:** User performs the final manual matrix at 320px, 375px, 768px, 1024px, and desktop: navigation,
  browser selection, create/edit/delete, dialogs, encounter runner, dungeon viewer, and Map Lab editor. Verify
  keyboard focus, touch targets, reduced motion, role-color meaning, and absence of horizontal overflow.
- **Discovery consolidation:** Update `Key facts` and `Design system in force` with all confirmed
  site-wide contracts and regression findings. Update `docs/DESIGN_SYSTEM.md` and `docs/ARCHITECTURE.md`
  for any durable corrections discovered across the final review.
- **Completion edit:** Collapse VT4, remove the completed VT phase, set the Plan Closeout as next, and
  point the manifest to the Plan Closeout's anchor.

---

## Plan Closeout — Documentation Update

| Stage | Required strength | Summary | Deliverables |
|-------|-------------------|---------|--------------|
| **VT5 — Documentation update** | Standard | Reconcile accumulated plan context and complete the documentation workflow. | Canonical references, routing, validation, and archival complete. |

#### VT5 — Documentation update (final stage of the plan)

- **Read first:** `CLAUDE.md`, `docs/README.md`, the owning area guide (`docs/areas/visual-design.md`), this plan, `docs/PLAN_TEMPLATE.md`,
  `docs/TESTING.md`, `scripts/check_docs.py`, every reference named by prior stages, and relevant workflow/PR files.
- **Build:** Reconcile the plan's accumulated Key facts, reusable pieces, debt, shipped rows, and future-stage
  handoffs with the code that shipped. Complete every outstanding named canonical-reference update, refresh
  generated inventories when their source contracts changed, update area-guide and manifest routing, and prepare
  the plan archive.
- **Inherits:** all prior-stage documentation-impact edits and discovery consolidations; this stage verifies and
  closes them, rather than deferring implementation-stage documentation.
- **Expected touch set:** this plan, its area guide (`docs/areas/visual-design.md`), `docs/README.md`, every outstanding named canonical reference,
  generated references when applicable, and the archive/redirect location.
- **Documentation impact:** `docs/README.md`, `docs/areas/visual-design.md`, `docs/DESIGN_SYSTEM.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md`, and this plan.
- **Tests:** run `python scripts/check_docs.py --check`; run `python scripts/check_docs.py --check --base <base-ref>`
  when a valid base ref is available; run any documentation-validator tests changed by this outcome.
- **Gate:** A fresh reader can route from `CLAUDE.md` through `docs/README.md`, the area guide, and the current plan
  context without rediscovering essential facts. Documentation checks and applicable tests pass.
- **Discovery consolidation:** promote remaining durable facts to the appropriate canonical reference or retained
  plan top matter before archival; no unprocessed discovery remains only in a shipped-stage block or commit.
- **Completion edit:** collapse this stage, mark the outcome complete, archive the plan under `docs/complete/visual-consistency.md`,
  update the area guide and manifest, and create a redirect only for a known inbound link.

---

## Shipped stages

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| **VF0** | Created compile-safe stubs for `Button`, `IconButton`, `PageHeader`, `StatePanel`, and `Dialog` with placeholder CSS and `it.skip` test seams. Added `remoteState.ts` types for later browser migrations. All gates green; production UI unchanged. |
| **VF1** | Added the spacing/radius/control-size/elevation/motion/z-index token scale to `theme.css`, resolved undefined `--md-surface-variant`, and normalized `color-scheme`/native-control font inheritance/body typography in `index.css`. Migrated `Button.css`, `IconButton.css`, `PageHeader.css`, `StatePanel.css`, and `Dialog.css` to the new tokens; unskipped the VF1-tagged Button/IconButton/PageHeader tests; deferred bundling a display typeface. 753 frontend tests, typecheck/build/lint clean. |
| **VF2** | Added a `StatePanel` loading spinner and unskipped its five VF2 tests; gave `SearchList` a `status` prop (`ready`/`loading`/`error`) rendering the shared `StatePanel` and replaced its listbox semantics with ordinary buttons (`aria-current` for selection); expanded `SplitPane`'s pointer hit target via an invisible `::before` without changing its visible 4px divider; migrated `Card.css`/`form/form.css`/`SearchList.css` radius and the 48px control-height floor onto foundation tokens; consolidated `visually-hidden` into `index.css`. Updated 7 downstream browser/panel tests that asserted the old `role="option"` semantics. 769 frontend tests (13 skipped for VF3+), typecheck/build/lint clean. |
| **VF3** | Finalized `Dialog` into a full accessibility contract (title/description association, initial focus, Tab-trap, Escape/backdrop dismissal suppressed while pending, focus restoration, a `<fieldset disabled={pending}>` wrapping body+footer, `role` prop); unskipped and expanded its 7 VF3 test seams into 12 passing tests. Refactored `ConfirmDialog` into a thin `Dialog` consumer (`role="alertdialog"`, `title={message}`, shared `Button` footer) preserving its public API plus an additive `pending?` prop; deleted `ConfirmDialog.css`. 778 frontend tests (6 pre-existing skips unrelated to VF3), typecheck/build/lint clean. |
| **VF4** | Made the `AppShell` brand a home `Link` (no route `h1`); added a `768px`-breakpoint mobile nav drawer using the `Dialog` contract, opened via an `IconButton`; extracted `layout/navSections.ts` as the shared nav-section map for both the rail/drawer and the new `HomePage`. Replaced `HomePage`'s API proof screen with a `PageHeader`-chapter-tabbed field-guide link grid; gated `ComponentDemoPage`'s route behind `import.meta.env.DEV` (confirmed excluded from the production bundle). 786 frontend tests, typecheck/build/lint clean. |
| **VF5** | Conducted a foundation design review and repaired three defects: migrated `AppShell.css` ad-hoc spacing to foundation tokens, added a missing `focus-visible` outline to `SearchList` input, and removed a redundant local `prefers-reduced-motion` override from `FloatingWindow.css`. 789 frontend tests (3 new regression tests), typecheck/build/lint/documentation-check clean. |
| **VW0** | Created `BrowserLayout` component (wraps toolbar + error + `SplitPane` + editor/dialog slots) with foundation-token CSS; added 28 `it.skip` scaffolding tests across all 10 browser cohorts with real assertion bodies in `components/__tests__/BrowserLayout.vw0.test.tsx`. Confirmed browser-route file paths, API naming (`listNPCs` capital NPC), and type shapes for later stages. 789 tests, typecheck/build/lint clean. |
| **VW1** | Migrated Spells, Weapons, Players, and Quests to `BrowserLayout` with remote loading/empty/error states, nav-aligned chapter tabs, shared actions, and a 520px Back-to-list detail flow while retaining local editors, confirmations, sorting, and Quest references. Activated 15 VW0 standard/layout assertions and added focused remote-state/filter/return coverage. |
| **VW2** | Migrated Monsters (routed New/Edit, no browser delete), NPCs, Items, and Loot to `BrowserLayout`/`RemoteState<T>`/Back-to-list, token-derived `MonsterStatBlock.css` (removed literal teal `rgb()` values), and added a `deleting`/`pending` confirm state to NPC/Items/Loot delete dialogs. Kept NPC on the `neutral` Card/SearchList variant (no typed `npc` variant added). Activated 7 VW0 role-rich seam tests (fixing two pre-existing test bugs: missing `initialEntries` and an ambiguous `getByText` match) and added deferred/empty/filtered-empty/error/chapter/back/pending-confirm coverage. 841 frontend tests, typecheck/build/lint clean. |
| **VW3** | Migrated Encounters and Dungeons to `BrowserLayout`/`RemoteState<T>`/`Button`/foundation tokens with creature roster, Run/Enter primary flows, `Untitled Dungeon` creation, and pending delete state. Activated 5 VW0 action browser seam tests and added 22 focused coverage tests. 861 frontend tests, typecheck/build clean. |
| **VW4** | Migrated all seven modal editors (Spell, Weapon, Player, NPC, Quest, Item, Encounter) onto the shared `Dialog`, replacing each duplicated backdrop/modal/header/action-row implementation; added an additive `className?` prop to `Dialog` for per-editor width overrides and a `role="status"` save-status region to each editor. Added new direct component test suites for Weapon/Player/NPC/Quest (previously mapping-only) and a Dialog-contract block (focus, Cancel/Escape, pending, save-status) to all seven; updated 8 browser-page tests whose `getByRole('dialog', …)` name assertions had relied on a pre-VW4 `aria-label` that differed from the visible heading. 900 frontend tests (6 pre-existing skips), typecheck/build/lint clean. |
| **VW5** | Migrated LootBundleEditor's outer modal framing to the shared `Dialog` contract; preserved EncounterEditor's existing Dialog contract and focused on CreatureRowCard/picker/condition composition with re-pick HP/AC reset and hand-edit persistence tests; added MonsterEditor routed heading/action/save/delete return navigation tests; added long-bundle, duplicate-increment, and "Value pending" tests for Loot. 913 frontend tests (6 skipped), typecheck/build/lint clean. |
| **VW6** | Repaired workspace state semantics, pending-dialog inertness, catalog-picker loading/error handling, empty-browser gating, ordinary control floors, and responsive/editor token consistency. 919 frontend tests passed (6 skipped). |
| **VT0** | Added 17 inert `it.skip` test seams across 5 test files: 5 in `EncounterRunnerPage.test.tsx` (load-error, touch targets, action groups, narrow reachability, dock), 1 in `useEncounterRunner.test.ts` (load-error), 2 in `DungeonShell.test.tsx` (responsive regions, narrow room access), 5 in `MapLabEditorPage.test.tsx` (inspector actions, compact fields, narrow toolbar, viewer responsive, dock responsive), and 4 in `MapLabPage.test.tsx` (narrow viewer, room rail, details, dock). Confirmed touch-target measurements (all 2.75rem / 44px, below 48px floor), confirmed load-error gap (no `loadError` in `useEncounterRunner`), confirmed breakpoint mismatches (`38rem`/`56rem` vs VF1 convention), and confirmed `FloatingWindow` narrow-viewport gap. 919 tests + 17 skipped, typecheck/build/lint/documentation-check clean. |
| **VT1** | Restored 48px touch-target floor across runner, dock, picker, and reorder controls by migrating `CombatantCard.css`, `EncounterRunnerBoard.css`, and `ConditionPicker.css` to use `var(--control-height)` token. Added `loadError: string | null` to `useEncounterRunner` with try/catch around `getEncounter`, and `StatePanel` error rendering to `EncounterRunnerPage`. Separated table-time actions from roster-management in `CombatantCard` via aria-labeled groups. Added viewport-edge clamping to `FloatingWindow.tsx` via `clampPosition()` helper. Unskipped all 6 VT0 test seams (load-error recovery, touch targets, action groups, narrow reachability, dock targets). 925 frontend tests (17 pre-existing skips), typecheck/build/lint clean. |
| **VT2** | Reconciled viewer breakpoints from non-standard `38rem`/`56rem` to VF1 convention `520px`/`768px` in `DungeonShell.css` and `MapLabPage.css`. Responsive layout naturally stacks room rail, canvas, and sidebar vertically at 520px via existing `flex-wrap` structure — all regions remain reachable via scroll. Encounter dock remains accessible with VT1's viewport-edge clamping. Unskipped all 6 VT0 seams: 2 in `DungeonShell.test.tsx` (responsive regions, room access) and 4 in `MapLabPage.test.tsx` (narrow viewer, room access, details, dock). 931 frontend tests passed, typecheck/build/lint clean. |

---

## Cross-references

- `docs/DESIGN_SYSTEM.md` — canonical tokens, component anatomy, icon policy, and accessibility floor.
- `docs/ARCHITECTURE.md` — frontend ownership and route/component conventions.
- `docs/TESTING.md` — frontend/backend gate requirements.
- `../../areas/visual-design.md` — durable visual-design routing and active-plan pointer.
- `../../areas/spells.md`, `../../areas/monsters.md`, `../../areas/encounters.md`, `../../areas/dungeons.md`, and
  `../../areas/loot.md` — feature-specific preservation and deferred-work boundaries.

---

## Next:

**VT2 — Dungeon viewer** is next. It may begin now that VT1's encounter runner control fixes and load-error
recovery patterns are shipped and VT0/VT1's responsive and viewport findings are consolidated.
