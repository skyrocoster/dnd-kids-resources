# Visual Consistency Plan — Cross-Cutting Aesthetic Remediation

> **Status:** No stages shipped. VF0 (foundation scaffolding) is queued next; production UI is unchanged.

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
- The current global shell has a desktop side rail at all viewport sizes. `SplitPane` is horizontal by default;
  feature-level CSS currently owns its responsive behavior.
- The documented 48px touch-target floor is not met by several shared controls and many older feature controls.
  Map Lab SVG marker geometry is the documented exception; ordinary controls are not.
- The existing palette is broadly token-compliant. The material issue is composition and interaction drift: no
  formal spacing/radius/control/elevation scale, duplicated component families, conflicting responsive
  breakpoints, and inconsistent state/action hierarchy.
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

## Design Phase VF — Visual Foundation

Establish the shared contracts before any route family migrates. This phase makes the visual language explicit,
repairs global accessibility gaps, and delivers a responsive shell and useful entry point without changing domain
data flow. **Depends on:** no implementation stage. **Depended on by:** all VW and VT stages; do not begin their
implementation until VF5 is committed.

| Stage | Model | Summary | Deliverables |
|-------|-------|---------|--------------|
| **VF0 — Foundation scaffolding** | Haiku | Create compile-safe seams and skipped tests only. | Primitive stubs; no visual change. |
| **VF1 — System contract** | Sonnet | Formalize the missing global visual scales. | Tokens, bundled-font decision, reference-doc update, token tests. |
| **VF2 — Controls and states** | Sonnet | Make ordinary controls, fields, lists, and async states consistent and accessible. | Buttons, state panels, shared-control migrations, tests. |
| **VF3 — Dialog contract** | Sonnet | Make modal behavior one tested accessibility contract. | `Dialog`, migrated confirmation, focus tests. |
| **VF4 — Shell and entry point** | Sonnet | Establish responsive navigation, route hierarchy, and a real product start page. | App shell, home page, route tests. |
| **VF5 — Foundation design pass** | Sonnet | Review and repair the foundation as a whole. | Responsive/a11y fixes and design regression tests. |

**Sequencing:** VF0 → VF1 → VF2 → VF3 → VF4 → VF5. VF2 and VF3 may share only VF1's completed tokens; keep them
sequential to avoid conflicts in shared control CSS.

#### VF0 — Foundation scaffolding (next up)

- **Read first:** `docs/DESIGN_SYSTEM.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md`, `frontend/src/components/`, and the existing component test setup.
- **Build:** Add compile-safe, unused stubs and placeholder CSS for `Button`, `IconButton`, `PageHeader`,
  `StatePanel`, and `Dialog` under `frontend/src/components/`; add explicit remote-state types/hooks only where
  later migrations need them; add `it.skip` render/keyboard test seams. Do not render these primitives from a
  production route, alter existing CSS selectors, or add tokens with visible effects.
- **Inherits:** `theme.css`, `components/icons/index.ts`, existing shared components, and the Vitest setup.
- **Expected touch set:** `frontend/src/components/`, colocated component tests, and this plan only.
- **Documentation impact:** This plan only: this inert scaffolding stage creates no durable product contract.
- **Tests:** Confirm all stubs compile and existing suites remain green; keep only intentional skipped tests for
  VF1-VF4 behavior.
- **🚦 Gate:** Suite-sufficient. Run `npm run test`, `npm run typecheck`, and `npm run build`; the app must render
  identically in manual user verification.
- **Completion edit:** Collapse VF0, set VF1 as next, and point the manifest to VF1's anchor.

#### VF1 — System contract (planned)

- **Read first:** `docs/DESIGN_SYSTEM.md`, `docs/TESTING.md`, `frontend/src/theme.css`, `frontend/src/index.css`, and `frontend/src/__tests__/theme-tokens.test.mjs`.
- **Build:** Add named spacing, radius, control-size, elevation/backdrop, motion, z-index, and breakpoint tokens
  in `frontend/src/theme.css`; resolve the undefined `--md-surface-variant` use with a canonical token or
  replacement; normalize `color-scheme`, native-control font inheritance, and root body typography in
  `index.css`. Evaluate a locally bundled display typeface for restrained route headings; adopt it only if it is
  offline-safe, license-compatible, and does not compromise legibility. Update `docs/DESIGN_SYSTEM.md` with the
  exact token scale, font roles, responsive convention, and documented compact-control exception.
- **Inherits:** VF0 primitive seams and the existing MD3 role palette/type tokens.
- **Expected touch set:** `frontend/src/theme.css`, `frontend/src/index.css`, token tests, `docs/DESIGN_SYSTEM.md`, and this plan.
- **Documentation impact:** `docs/DESIGN_SYSTEM.md` and this plan record the durable token, typography, and compact-control contracts.
- **Tests:** Extend `frontend/src/__tests__/theme-tokens.test.mjs` for every added token family and undefined-token
  regressions; add a focused global-style test only where jsdom can verify the contract.
- **🚦 Gate:** Run frontend test/typecheck/build gates. User manually checks default text, form controls, focus,
  and representative page headings at desktop and narrow widths; no route-specific migration occurs here.
- **Completion edit:** Collapse VF1, set VF2 as next, and point the manifest to VF2's anchor.

#### VF2 — Controls and states (planned)

- **Read first:** `docs/DESIGN_SYSTEM.md`, `docs/TESTING.md`, `frontend/src/components/`, `frontend/src/theme.css`, and shared component tests.
- **Build:** Implement `Button`, `IconButton`, `PageHeader`, and `StatePanel`; evolve shared form controls and
  `SearchList` to consume foundation tokens, inherit font settings, meet the 48px floor, and distinguish loading,
  empty collection, filtered-empty, error, and no-selection states. Replace the incomplete listbox semantics in
  `SearchList` with ordinary button-list semantics unless full keyboard listbox behavior is implemented. Expand
  `SplitPane`'s pointer/keyboard resize target without changing its visible divider width. Consolidate
  `visually-hidden` to one global utility.
- **Inherits:** VF1 token and typography contracts; existing Card/SearchList/SplitPane APIs unless a migration
  contract requires an additive prop.
- **Expected touch set:** shared components and form controls, their tests, `docs/DESIGN_SYSTEM.md`, and this plan.
- **Documentation impact:** `docs/DESIGN_SYSTEM.md` and this plan record shared primitive and accessibility contracts.
- **Tests:** Render tests for button tones/kinds/loading/disabled labels, icon-button accessible names, state
  roles and actions, field/search target classes, filtered-empty versus data-empty states, and SplitPane keyboard
  operation.
- **🚦 Gate:** Run frontend test/typecheck/build gates. User checks focus visibility, touch-sized controls, and
  reduced-motion behavior on the component demo or focused test route without using it as a public product route.
- **Completion edit:** Collapse VF2, set VF3 as next, and point the manifest to VF3's anchor.

#### VF3 — Dialog contract (planned)

- **Read first:** `docs/DESIGN_SYSTEM.md`, `docs/TESTING.md`, `frontend/src/components/ConfirmDialog.tsx`, and its tests.
- **Build:** Implement a shared `Dialog` with title/description association, initial focus, Tab/Shift+Tab focus
  containment, Escape dismissal where allowed, focus restoration, pending/saving state, and explicit backdrop
  policy. Refactor `ConfirmDialog` to use it while retaining its current public API where practical. Do not yet
  migrate domain editors.
- **Inherits:** VF1 tokens and VF2 buttons/icon buttons; existing `ConfirmDialog` callers and test labels.
- **Expected touch set:** `frontend/src/components/Dialog*`, `ConfirmDialog*`, related tests, `docs/DESIGN_SYSTEM.md`, and this plan.
- **Documentation impact:** `docs/DESIGN_SYSTEM.md` and this plan record the modal accessibility contract.
- **Tests:** Add dialog unit/integration tests for dialog semantics, initial focus, focus loop, Escape,
  restoration to trigger, backdrop behavior, and pending confirmation. Preserve existing deletion-flow tests.
- **🚦 Gate:** Run frontend test/typecheck/build gates. User manually verifies keyboard-only confirmation and a
  pointer confirmation flow; no feature editor is changed in this stage.
- **Completion edit:** Collapse VF3, set VF4 as next, and point the manifest to VF4's anchor.

#### VF4 — Shell and entry point (planned)

- **Read first:** `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/TESTING.md`, `frontend/src/layout/AppShell.tsx`, and router tests.
- **Build:** Refactor `AppShell` so the site brand is a home link rather than a route `h1`; add `PageHeader` to
  establish one route heading and the icon-and-text chapter-tab signature; provide a mobile navigation drawer or
  equivalent reachable navigation while retaining the persisted desktop rail. Replace `HomePage`'s API proof
  screen with a field-guide start page linking to Dungeons, Encounters, reference catalogs, and campaign work.
  Restrict `ComponentDemoPage` to development-only routing or remove it from production router exposure.
- **Inherits:** VF1-VF3 primitives and the current `useNavCollapse()` persistence behavior. Keep the room-index
  rail separate from site navigation.
- **Expected touch set:** `frontend/src/layout/`, `frontend/src/pages/HomePage*`, router files and tests, `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, and this plan.
- **Documentation impact:** `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, and this plan record shell and route-heading conventions.
- **Tests:** Update `layout/__tests__/AppShell.test.tsx` for brand link, all navigation areas including Items and
  Loot, mobile navigation semantics, and route heading behavior; replace HomePage API assertions with user-facing
  navigation tests; add router coverage for the demo-route decision.
- **🚦 Gate:** Run frontend test/typecheck/build gates. User manually verifies navigation and route hierarchy at
  320px, 375px, 768px, and desktop widths; no browser automation is required by repository policy.
- **Completion edit:** Collapse VF4, set VF5 as next, and point the manifest to VF5's anchor.

#### VF5 — Foundation design pass (planned)

- **Read first:** `docs/DESIGN_SYSTEM.md`, `docs/TESTING.md`, the VF1-VF4 touched components, and their tests.
- **Build:** Conduct a `/frontend-design` review of the shared foundation. Repair spacing, hierarchy, wrapping,
  focus, contrast, reduced-motion, and mobile defects discovered across the shell, primitive demo, home page, and
  one representative legacy browser without beginning the browser-family migration.
- **Inherits:** VF0-VF4, the canonical design reference, and all existing user-facing content-role colors.
- **Expected touch set:** confirmed shared foundation files, their regression tests, `docs/DESIGN_SYSTEM.md` when a durable contract changes, and this plan.
- **Documentation impact:** This plan; update `docs/DESIGN_SYSTEM.md` only for a confirmed durable shared-contract correction.
- **Tests:** Add regression tests for defects fixed in this stage; run the full frontend suite, lint, typecheck,
  and production build.
- **🚦 Gate:** User verifies the documented viewport matrix and keyboard navigation. The phase is complete only
  when all frontend gates pass and no unresolved foundation defect blocks VW1.
- **Completion edit:** Collapse VF5, remove the completed VF phase, set VW0 as next, and point the manifest to VW0's anchor.

---

## Design Phase VW — Browsers and Authoring

Migrate catalog and authoring routes in bounded cohorts after the foundation is stable. The phase standardizes
frame, state, actions, and modal behavior, while each domain retains its own content presentation.
**Depends on:** VF5 committed. **Depended on by:** VT stages inherit shared browser/editor conventions but do not
depend on individual catalog migrations.

| Stage | Model | Summary | Deliverables |
|-------|-------|---------|--------------|
| **VW0 — Workspace scaffolding** | Haiku | Create opt-in browser/editor migration seams. | `BrowserLayout` stubs and skipped route tests. |
| **VW1 — Standard browsers** | Sonnet | Migrate Spells, Weapons, Players, and Quests. | Responsive list/detail and remote states. |
| **VW2 — Role-rich browsers** | Sonnet | Migrate Monsters, NPCs, Items, and Loot. | Preserved specialist details and role consistency. |
| **VW3 — Action browsers** | Sonnet | Migrate Encounters and Dungeons. | Primary Run/Enter flows and browser states. |
| **VW4 — Standard editors** | Sonnet | Migrate six simple modal editors. | Shared dialogs, fields, and action rows. |
| **VW5 — Complex authoring** | Sonnet | Migrate Encounter/Loot authoring and align Monster Editor framing. | Complex picker and route-editor conformance. |
| **VW6 — Workspace design pass** | Sonnet | Review every catalog/authoring route together. | Cross-route fixes and regression tests. |

**Sequencing:** VW0 → VW1 → VW2 → VW3 → VW4 → VW5 → VW6. Do not migrate multiple cohorts in parallel because
each changes shared browser/editor CSS and contracts.

#### VW0 — Workspace scaffolding (next after VF5)

- **Read first:** `docs/DESIGN_SYSTEM.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md`, shared browser components, and browser route tests.
- **Build:** Add unused `BrowserLayout` and remote-state scaffolding with slots for header, list, detail, primary
  action, and action footer; add placeholder classes and `it.skip` migration tests for every browser cohort. Do
  not render the scaffold from a route or alter current browser behavior.
- **Inherits:** VF primitives, `SplitPane`, `SearchList`, `Card`, and existing browser tests.
- **Expected touch set:** shared browser-layout scaffolding, skipped browser tests, and this plan only.
- **Documentation impact:** This plan only: inert scaffolding creates no durable product contract.
- **Tests:** Existing browser tests stay green; skipped tests name the loading, empty, error, selection, and
  narrow-screen contracts each later stage will satisfy.
- **🚦 Gate:** Suite-sufficient: frontend test/typecheck/build clean, production rendering unchanged.
- **Completion edit:** Collapse VW0, set VW1 as next, and point the manifest to VW1's anchor.

#### VW1 — Standard browsers (planned)

- **Read first:** `docs/DESIGN_SYSTEM.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md`, `BrowserLayout`, and the four named browser routes/tests.
- **Build:** Implement the `BrowserLayout` responsive master/detail contract and migrate
  `SpellBrowserPage`, `WeaponBrowserPage`, `PlayerBrowserPage`, and `QuestBrowserPage`. Add explicit loading,
  request-error, empty-collection, filtered-empty, and no-selection rendering. On narrow screens, use an
  intentional list-to-detail flow rather than a permanently compressed horizontal split. Use `PageHeader`,
  role-aware chapter tabs, and shared action buttons without changing data/API semantics.
- **Inherits:** VF5 and VW0; existing sort, selection, editor, confirmation, Card, and DiceText behavior.
- **Expected touch set:** `BrowserLayout`, the Spell/Weapon/Player/Quest browser routes and tests, shared CSS, `docs/ARCHITECTURE.md`, and this plan.
- **Documentation impact:** `docs/ARCHITECTURE.md` and this plan record the shared browser and responsive navigation convention.
- **Tests:** For each route, use deferred API promises to prove loading does not flash an empty state; test empty,
  filter no-results, error, selection, action labels, and narrow-screen detail return behavior.
- **🚦 Gate:** Run frontend test/typecheck/build gates. User manually checks all four routes at phone/tablet/desktop
  widths and confirms spell/weapon/player/quest edits still reach their existing editor flows.
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
- **🚦 Gate:** Run frontend test/typecheck/build gates. User checks that bestiary, dossier, items, and loot remain
  visually distinguishable while their framing/actions now read as one application.
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
- **🚦 Gate:** Run frontend test/typecheck/build gates. User manually verifies a create-to-editor and
  create-to-run workflow without data-contract changes.
- **Completion edit:** Collapse VW3, set VW4 as next, and point the manifest to VW4's anchor.

#### VW4 — Standard editors (planned)

- **Read first:** `docs/DESIGN_SYSTEM.md`, `docs/TESTING.md`, shared `Dialog` and form components, and the six named editors/tests.
- **Build:** Migrate Spell, Weapon, Player, NPC, Quest, and Item editors to `Dialog`, shared fields, shared
  button/action ordering, and status messaging. Maintain each form's existing data mapping and validation. Use
  content-role accents only where they clarify the form's domain; do not make every modal heavily themed.
- **Inherits:** VF3 dialog behavior, VF2 field/buttons, and existing editor/form helpers/tests.
- **Expected touch set:** six editor components/tests, shared form/dialog CSS where required, `docs/DESIGN_SYSTEM.md`, and this plan.
- **Documentation impact:** `docs/DESIGN_SYSTEM.md` and this plan record any durable shared form or dialog contract.
- **Tests:** Retain all field validation and save tests; add focus restoration, Escape/backdrop policy, pending
  save, status-message role, overflow, and dirty-close behavior where forms have unsaved editable state.
- **🚦 Gate:** Run frontend test/typecheck/build gates. User manually verifies create, edit, validation failure,
  cancel, and delete-confirmation paths for a representative editor from each migrated domain.
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
- **🚦 Gate:** Run frontend test/typecheck/build gates. User manually checks complex authoring at narrow desktop and
  phone widths, including a long loot bundle and an encounter with conditions.
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
- **🚦 Gate:** User checks the full browser/editor matrix across supported widths and keyboard flows. VT work may
  begin only after all workspace regressions are resolved.
- **Completion edit:** Collapse VW6, remove the completed VW phase, set VT0 as next, and point the manifest to VT0's anchor.

---

## Design Phase VT — Live Table Surfaces

Apply the shared system to the high-density surfaces used during play without simplifying away their domain
affordances. Changes are deliberately separated from geometry, reducer, and persistence work.
**Depends on:** VF5 committed; VW completion is recommended but not required for existing live-feature behavior.
**Depended on by:** no queued phase.

| Stage | Model | Summary | Deliverables |
|-------|-------|---------|--------------|
| **VT0 — Live-surface scaffolding** | Haiku | Add non-rendering style/test seams. | Skipped touch and narrow-layout tests. |
| **VT1 — Encounter runner** | Sonnet | Clarify combat priority and repair ordinary control targets. | Runner/dock hierarchy and failure state. |
| **VT2 — Dungeon viewer** | Sonnet | Align shell/viewer framing and narrow-screen room access. | Viewer layout and responsive tests. |
| **VT3 — Map Lab editor** | Sonnet | Improve editor control hierarchy without touching map mechanics. | Compact-field contract and inspector actions. |
| **VT4 — Final design pass** | Sonnet | Validate the entire routed product as one system. | Site-wide fixes and verification matrix. |

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
- **🚦 Gate:** Suite-sufficient: frontend test/typecheck/build clean and no visual production change.
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
- **🚦 Gate:** Run frontend test/typecheck/build gates. User manually verifies a standalone runner and Map Lab dock
  with a touch device or touch simulation, including narrow-window resizing and condition editing.
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
- **🚦 Gate:** Run frontend test/typecheck/build gates. User manually verifies room selection by rail and map,
  encounter/NPC docks, floor changes, fullscreen, and a narrow viewport without changing authored data.
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
- **🚦 Gate:** Run frontend test/typecheck/build gates. User manually verifies every editor tool family, room and
  fixture placement, editing, undo-free persistence path, fullscreen, and keyboard footprint editing.
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
- **🚦 Gate:** User performs the final manual matrix at 320px, 375px, 768px, 1024px, and desktop: navigation,
  browser selection, create/edit/delete, dialogs, encounter runner, dungeon viewer, and Map Lab editor. Verify
  keyboard focus, touch targets, reduced motion, role-color meaning, and absence of horizontal overflow.
- **Completion edit:** Collapse VT4, mark the plan complete, archive it under `docs/complete/`, and leave a redirect stub if links remain.

---

## Shipped stages

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|

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

**VF0 — Foundation scaffolding** is unblocked. It must remain an inert Haiku scaffolding stage; begin VF1 only
after VF0 is committed and collapsed into the shipped-stages table.
