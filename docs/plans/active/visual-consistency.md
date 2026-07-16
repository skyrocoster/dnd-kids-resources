# Visual Consistency Plan — Cross-Cutting Aesthetic Remediation

> **Status:** VF0-VF5 shipped. VW0 (workspace scaffolding) is next.

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
- The existing palette is broadly token-compliant. The material issue is composition and interaction drift:
  duplicated component families, conflicting responsive breakpoints outside the VF1 convention above, and
  inconsistent state/action hierarchy.
- The intended visual language is a **tabletop field guide**: dark, calm, and legible at table speed. Existing
  role colors identify content domains; page structure, iconography, and direct language communicate function.
- Each content domain gets a restrained icon-and-text chapter tab in its route header. This is the plan's
  signature device: it makes the app's campaign structure visible without adding fantasy ornament or relying on
  hue alone.
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
- `MonsterStatBlock`, `NPCStatCard`, `CombatantCard`, `MapCanvas`, Map Lab marker components, and the Map Lab
  reducer/hooks — feature signatures to frame consistently, not genericize.
- `ToolbarTray`, `InspectorPanel`, `RoomDetailsPanel`, and Map Lab's fixture/form model — retain their existing
  behavior and domain-specific information density.
- Existing Vitest/React Testing Library suites colocated with components and features — extend them rather than
  replacing behavior coverage with visual snapshots.

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

## Design Phase VW — Browsers and Authoring

Migrate catalog and authoring routes in bounded cohorts after the foundation is stable. The phase standardizes
frame, state, actions, and modal behavior, while each domain retains its own content presentation.
**Depends on:** VF5 committed. **Depended on by:** VT stages inherit shared browser/editor conventions but do not
depend on individual catalog migrations.

| Stage | Required strength | Summary | Deliverables |
|-------|-------|---------|--------------|
| **VW0 — Workspace scaffolding** | Light | Create opt-in browser/editor migration seams. | `BrowserLayout` stubs and skipped route tests. |
| **VW1 — Standard browsers** | Standard | Migrate Spells, Weapons, Players, and Quests. | Responsive list/detail and remote states. |
| **VW2 — Role-rich browsers** | Standard | Migrate Monsters, NPCs, Items, and Loot. | Preserved specialist details and role consistency. |
| **VW3 — Action browsers** | Standard | Migrate Encounters and Dungeons. | Primary Run/Enter flows and browser states. |
| **VW4 — Standard editors** | Standard | Migrate six simple modal editors. | Shared dialogs, fields, and action rows. |
| **VW5 — Complex authoring** | Standard | Migrate Encounter/Loot authoring and align Monster Editor framing. | Complex picker and route-editor conformance. |
| **VW6 — Workspace design pass** | High | Review every catalog/authoring route together. | Cross-route fixes and regression tests. |

**Sequencing:** VW0 → VW1 → VW2 → VW3 → VW4 → VW5 → VW6. Do not migrate multiple cohorts in parallel because
each changes shared browser/editor CSS and contracts.

#### VW0 — Workspace scaffolding (next up)

- **Read first:** `docs/DESIGN_SYSTEM.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md`, shared browser components, and browser route tests.
- **Build:** Add unused `BrowserLayout` and remote-state scaffolding with slots for header, list, detail, primary
  action, and action footer; add placeholder classes and `it.skip` migration tests for every browser cohort. Do
  not render the scaffold from a route or alter current browser behavior.
- **Inherits:** VF primitives, `SplitPane`, `SearchList`, `Card`, and existing browser tests.
- **Expected touch set:** shared browser-layout scaffolding, skipped browser tests, and this plan only.
- **Documentation impact:** This plan only: inert scaffolding creates no durable product contract.
- **Tests:** Existing browser tests stay green; skipped tests name the loading, empty, error, selection, and
  narrow-screen contracts each later stage will satisfy.
- **Gate:** Suite-sufficient: frontend test/typecheck/build clean, production rendering unchanged.
- **Discovery consolidation:** Revise VW1-VW6 `Read first`, `Build`, and `Expected touch set` blocks with
  confirmed browser-route file paths, shared-component APIs, and test-setup findings.
- **Completion edit:** Collapse VW0, set VW1 as next, and point the manifest to VW1's anchor.

#### VW1 — Standard browsers (planned)

- **Read first:** `docs/DESIGN_SYSTEM.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md`, `BrowserLayout`, and the four named browser routes/tests.
- **Build:** Implement the `BrowserLayout` responsive master/detail contract and migrate
  `SpellBrowserPage`, `WeaponBrowserPage`, `PlayerBrowserPage`, and `QuestBrowserPage`. Add explicit loading,
  request-error, empty-collection, filtered-empty, and no-selection rendering. On narrow screens, use an
  intentional list-to-detail flow rather than a permanently compressed horizontal split. Use `PageHeader`,
  role-aware chapter tabs, and shared action buttons without changing data/API semantics. Reuse each route's
  existing icon from `frontend/src/layout/navSections.ts` (`WandIcon` spells, `SwordsIcon` weapons, `UsersIcon`
  players, `ScrollIcon` quests) for its `PageHeader` rather than picking a new one, so the nav rail/drawer and
  the route's own chapter tab stay visually consistent.
- **Inherits:** VF5 and VW0; existing sort, selection, editor, confirmation, Card, and DiceText behavior.
- **Expected touch set:** `BrowserLayout`, the Spell/Weapon/Player/Quest browser routes and tests, shared CSS, `docs/ARCHITECTURE.md`, and this plan.
- **Documentation impact:** `docs/ARCHITECTURE.md` and this plan record the shared browser and responsive navigation convention.
- **Tests:** For each route, use deferred API promises to prove loading does not flash an empty state; test empty,
  filter no-results, error, selection, action labels, and narrow-screen detail return behavior.
- **Gate:** Run frontend test/typecheck/build gates. User manually checks all four routes at phone/tablet/desktop
  widths and confirms spell/weapon/player/quest edits still reach their existing editor flows.
- **Discovery consolidation:** Update `Reusable pieces` with confirmed BrowserLayout API and migration
  patterns. Revise VW2-VW6 blocks with exact route compositions and state-rendering contracts.
- **Completion edit:** Collapse VW1, set VW2 as next, and point the manifest to VW2's anchor.

#### VW2 — Role-rich browsers (planned)

- **Read first:** `docs/DESIGN_SYSTEM.md`, `docs/TESTING.md`, `BrowserLayout`, the four named browser routes, and specialist detail components.
- **Build:** Migrate Monsters, NPCs, Items, and Loot to `BrowserLayout`. Preserve `MonsterStatBlock`, its teal
  field-card treatment, and routed monster editor; preserve `NPCStatCard` and floating-dock compatibility;
  preserve category/total affordances and useful empty-state actions for Items and Loot. Extend `Card` and
  `SearchList` variant unions only where existing token roles already support the domain. Replace literal Monster
  color reconstructions with token-derived equivalents without flattening its intentional field-card effects.
- **Inherits:** VW1 browser behavior, existing content-role tokens, and each feature's specialist detail component.
- **Expected touch set:** Monster/NPC/Item/Loot browser routes and tests, shared browser components, `docs/DESIGN_SYSTEM.md` if variant unions change, and this plan.
- **Documentation impact:** This plan; update `docs/DESIGN_SYSTEM.md` only if a supported shared visual variant changes.
- **Tests:** Extend browser tests for domain role labels, specialist detail rendering, rich empty states, loading
  and errors, responsive list/detail behavior, and Monster Editor navigation/return selection.
- **Gate:** Run frontend test/typecheck/build gates. User checks that bestiary, dossier, items, and loot remain
  visually distinguishable while their framing/actions now read as one application.
- **Discovery consolidation:** Update `Reusable pieces` with confirmed specialist component contracts and
  Card/SearchList variant unions. Revise VW3-VW6 blocks with exact domain-role and detail-rendering findings.
- **Completion edit:** Collapse VW2, set VW3 as next, and point the manifest to VW3's anchor.

#### VW3 — Action browsers (planned)

- **Read first:** `docs/DESIGN_SYSTEM.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md`, Encounter and Dungeon browser routes, and their routing tests.
- **Build:** Migrate Encounter and Dungeon browsers to the shared frame. Make Run and Enter the unambiguous
  primary detail actions; retain Edit and Delete as secondary/danger actions. Preserve direct dungeon creation
  into Map Lab edit mode and encounter-run route behavior. Add explicit loading/error/empty/no-selection states.
- **Inherits:** VW1-VW2 browser contract, existing encounter/dungeon routing and confirmation behavior.
- **Expected touch set:** Encounter and Dungeon browser routes/tests, shared browser components, `docs/ARCHITECTURE.md`, and this plan.
- **Documentation impact:** `docs/ARCHITECTURE.md` and this plan record any durable route-flow convention.
- **Tests:** Cover create, select, Run/Enter, Edit, Delete, errors, empty collections, and narrow-screen return
  navigation. Preserve current dungeon browser routing assertions and encounter runner-link tests.
- **Gate:** Run frontend test/typecheck/build gates. User manually verifies a create-to-editor and
  create-to-run workflow without data-contract changes.
- **Discovery consolidation:** Update `Key facts` with confirmed action-flow conventions for encounter and
  dungeon routes. Revise VW4-VW6 blocks with exact routing and confirmation contracts.
- **Completion edit:** Collapse VW3, set VW4 as next, and point the manifest to VW4's anchor.

#### VW4 — Standard editors (planned)

- **Read first:** `docs/DESIGN_SYSTEM.md`, `docs/TESTING.md`, shared `Dialog` and form components, and the six named editors/tests.
- **Build:** Migrate Spell, Weapon, Player, NPC, Quest, and Item editors to `Dialog`, shared fields, shared
  button/action ordering, and status messaging. Maintain each form's existing data mapping and validation. Use
  content-role accents only where they clarify the form's domain; do not make every modal heavily themed.
- **Inherits:** VF3's confirmed `Dialog` contract (`open`/`title`/`description?`/`onClose`/`children?`/
  `footer?`/`pending?`/`role?`; initial focus, Tab-trap, Escape/backdrop dismissal disabled while `pending`,
  focus restoration on close, and a `<fieldset disabled={pending}>` wrapping body+footer — see
  `docs/DESIGN_SYSTEM.md`'s "Dialog contract (VF3)" section), VF2 field/buttons, and existing editor/form
  helpers/tests.
- **Expected touch set:** six editor components/tests, shared form/dialog CSS where required, `docs/DESIGN_SYSTEM.md`, and this plan.
- **Documentation impact:** `docs/DESIGN_SYSTEM.md` and this plan record any durable shared form or dialog contract.
- **Tests:** Retain all field validation and save tests; add focus restoration, Escape/backdrop policy, pending
  save, status-message role, overflow, and dirty-close behavior where forms have unsaved editable state.
- **Gate:** Run frontend test/typecheck/build gates. User manually verifies create, edit, validation failure,
  cancel, and delete-confirmation paths for a representative editor from each migrated domain.
- **Discovery consolidation:** Update `Reusable pieces` with confirmed dialog/form editor contracts. Revise
  VW5-VW6 blocks with exact editor signatures and shared-field findings.
- **Completion edit:** Collapse VW4, set VW5 as next, and point the manifest to VW5's anchor.

#### VW5 — Complex authoring (planned)

- **Read first:** `docs/DESIGN_SYSTEM.md`, `docs/TESTING.md`, complex authoring components, `MonsterEditor`, and their tests.
- **Build:** Migrate EncounterEditor and LootBundleEditor to the shared dialog/action/field contracts while
  preserving dynamic rows, pickers, totals, and current data semantics. Extract a shared picker only if
  AddMonsterPanel, AddItemPanel, and similar panels can share one proven contract without feature-specific
  condition/selection loss. Align MonsterEditor page framing, field density, and action hierarchy with the
  foundation, but keep it routed and region-based.
- **Inherits:** VW4 editor conventions, existing complex authoring components and MonsterEditor routes.
- **Expected touch set:** Encounter/Loot authoring, MonsterEditor framing, related tests, `docs/DESIGN_SYSTEM.md` if a shared picker contract emerges, and this plan.
- **Documentation impact:** This plan; update `docs/DESIGN_SYSTEM.md` only for a proven reusable shared picker or form contract.
- **Tests:** Preserve dynamic row, picker, total, and model tests; add dialog focus/overflow coverage for
  Encounter/Loot and routed heading/action/return tests for MonsterEditor.
- **Gate:** Run frontend test/typecheck/build gates. User manually checks complex authoring at narrow desktop and
  phone widths, including a long loot bundle and an encounter with conditions.
- **Discovery consolidation:** Update `Reusable pieces` with any shared picker contract and `Key facts` with
  complex authoring conventions. Revise VW6 block with exact authoring findings.
- **Completion edit:** Collapse VW5, set VW6 as next, and point the manifest to VW6's anchor.

#### VW6 — Workspace design pass (planned)

- **Read first:** `docs/DESIGN_SYSTEM.md`, `docs/TESTING.md`, all VW-migrated routes, and their regression tests.
- **Build:** Review all browser/editor routes for hierarchy, chapter-tab discipline, action ordering, state copy,
  responsive transitions, role-color consistency, and accessibility. Repair only discovered design defects; do
  not add new feature capability.
- **Inherits:** VW0-VW5 and all legacy feature-specific rendering/data contracts.
- **Expected touch set:** confirmed browser/editor defects and tests, `docs/DESIGN_SYSTEM.md` for durable corrections, and this plan.
- **Documentation impact:** This plan; update `docs/DESIGN_SYSTEM.md` only for confirmed shared-contract corrections.
- **Tests:** Add regression tests for confirmed defects and run frontend test/lint/typecheck/build gates.
- **Gate:** User checks the full browser/editor matrix across supported widths and keyboard flows. VT work may
  begin only after all workspace regressions are resolved.
- **Discovery consolidation:** Update `Key facts` and `Reusable pieces` with confirmed browser/editor
  conventions and regression findings. Revise VT blocks with exact workspace dependencies. Update
  `docs/DESIGN_SYSTEM.md` for any durable corrections.
- **Completion edit:** Collapse VW6, remove the completed VW phase, set VT0 as next, and point the manifest to VT0's anchor.

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

#### VT0 — Live-surface scaffolding (next after applicable dependencies)

- **Read first:** `docs/DESIGN_SYSTEM.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md`, encounter runner and Map Lab tests, and shared foundation components.
- **Build:** Add inert class/test seams for encounter action groups, load failures, viewer responsive regions,
  compact Map Lab fields, and shared inspector selection actions. Do not alter runner behavior, map geometry,
  reducers, autosave, marker layout, or page rendering.
- **Inherits:** VF foundation and all current encounter/Map Lab components, hooks, models, and test suites.
- **Expected touch set:** inert live-surface style/test seams and this plan only.
- **Documentation impact:** This plan only: inert scaffolding creates no durable product contract.
- **Tests:** Add `it.skip` cases for target sizes, load-error recovery, narrow-screen reachability, and inspector
  action grouping; retain all existing behavior tests.
- **Gate:** Suite-sufficient: frontend test/typecheck/build clean and no visual production change.
- **Discovery consolidation:** Revise VT1-VT4 `Read first`, `Build`, and `Expected touch set` blocks with
  confirmed encounter-runner and Map Lab file paths, component shapes, and test-setup findings.
- **Completion edit:** Collapse VT0, set VT1 as next, and point the manifest to VT1's anchor.

#### VT1 — Encounter runner (planned)

- **Read first:** `docs/DESIGN_SYSTEM.md`, `docs/TESTING.md`, the encounter runner hook/components, Map Lab dock integration, and their tests.
- **Build:** Restore the documented 48px interaction floor for ordinary runner, dock, picker, and reorder
  controls; preserve a larger accessible target where visual compactness is needed. Separate table-time actions
  (active combatant, turn advance, HP, conditions) from roster-management actions (duplicate, reorder, remove),
  and repair compact-dock action wrapping. Add a recoverable load-error state to `useEncounterRunner`/
  `EncounterRunnerPage` without changing the encounter wire model.
- **Inherits:** existing reducer/hook, `CombatantCard`, `FloatingWindow`, condition picker, and autosave behavior.
- **Expected touch set:** encounter runner and dock components/tests, shared control CSS where required, `docs/DESIGN_SYSTEM.md`, and this plan.
- **Documentation impact:** `docs/DESIGN_SYSTEM.md` and this plan record any durable control-size or live-surface accessibility contract.
- **Tests:** Cover failed encounter load and recovery, action grouping/labels, compact mode, keyboard reorder,
  player-card behavior, and control-size class contracts. Preserve all reducer and persistence tests.
- **Gate:** Run frontend test/typecheck/build gates. User manually verifies a standalone runner and Map Lab dock
  with a touch device or touch simulation, including narrow-window resizing and condition editing.
- **Discovery consolidation:** Update `Key facts` with confirmed runner/dock control contracts and
  load-error recovery patterns. Revise VT2-VT4 blocks with exact encounter-surface findings.
- **Completion edit:** Collapse VT1, set VT2 as next, and point the manifest to VT2's anchor.

#### VT2 — Dungeon viewer (planned)

- **Read first:** `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/TESTING.md`, `DungeonShell`, `MapLabPage`, and viewer tests.
- **Build:** Align `DungeonShell`, `MapLabPage`, room rail, room-details panel, and viewer toolbar with the shared
  route-header and spacing contracts. Remove avoidable nested page padding, preserve the selected-room surface,
  and make room rail, map, and details reachable in a deliberate narrow-screen order. Keep canvas, markers,
  session passage state, docks, inspector behavior, and Map Lab responsive exceptions intact.
- **Inherits:** current DungeonShell route context, MapLabPage composition, viewer rail, RoomDetailsPanel, and all
  layout/marker behavior.
- **Expected touch set:** dungeon shell/viewer components and tests, shared layout CSS, `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, and this plan.
- **Documentation impact:** `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, and this plan record durable viewer composition conventions.
- **Tests:** Preserve existing Map Lab viewer, room selection, floor, marker, dock, and fullscreen tests; add
  responsive composition tests for selected-room reachability, mode navigation, and ordinary control targets.
- **Gate:** Run frontend test/typecheck/build gates. User manually verifies room selection by rail and map,
  encounter/NPC docks, floor changes, fullscreen, and a narrow viewport without changing authored data.
- **Discovery consolidation:** Update `Reusable pieces` with confirmed viewer composition contracts. Revise
  VT3-VT4 blocks with exact shell/viewer layout findings and responsive exceptions.
- **Completion edit:** Collapse VT2, set VT3 as next, and point the manifest to VT3's anchor.

#### VT3 — Map Lab editor (planned)

- **Read first:** `docs/DESIGN_SYSTEM.md`, `docs/TESTING.md`, `MapLabEditor.css`, Map Lab editor components, model/reducer hooks, and tests.
- **Build:** Adopt foundation spacing/radius/elevation tokens in `MapLabEditor.css` only where visual geometry is
  unaffected; make its compact field density an explicit documented exception with accessible targets; extract the
  repeated inspector Delete/Close region into a feature-local selection-action component; improve toolbar-tray,
  placement-mode, save-status, and inspector hierarchy. Keep SVG dimensions, strokes, marker state precedence,
  fixture form semantics, reducer actions, dual save, zoom/pan, fullscreen, and autosave unchanged.
- **Inherits:** VT2 framing, existing ToolbarTray, MapLabEditorPage, FixturePropertiesForm, RoomContentEditor,
  maplab model/reducer/hooks, and visual marker contracts.
- **Expected touch set:** Map Lab editor framing/components/tests, `MapLabEditor.css`, `docs/DESIGN_SYSTEM.md`, and this plan.
- **Documentation impact:** `docs/DESIGN_SYSTEM.md` and this plan record the compact-field accessibility exception.
- **Tests:** Preserve all editor reducer, geometry, fixture, keyboard, save, zoom, and fullscreen tests. Add
  focused tests for compact field labeling, selection actions, save status, and narrow layout ordering.
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
- **Inherits:** all VF, VW, and VT components; every specialized feature identity and existing data contract.
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

**VW0 — Workspace scaffolding** is unblocked. It adds unused `BrowserLayout` scaffolding and skipped route
tests without changing production UI; VW1 begins only after VW0 is committed and collapsed into the shipped-stages table.
