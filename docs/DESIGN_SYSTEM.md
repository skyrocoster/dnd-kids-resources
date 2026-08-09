# Design System — D&D Kids Resources

Canonical reference for the site-wide design system: color tokens, type scale, icons, spacing, elevation,
component anatomy, and accessibility floor. Consume these tokens and patterns rather than hand-picking colors,
sizes, or inventing new component structures.

Generated token sets live in `frontend/src/theme.css`; the generator script is
`scripts/generate-md3-tokens.mjs`. Never use the `--md-sys-color-*` namespace (it does not exist here).

---

## Color token table

All tokens are Material Design 3 dark-theme values. Each content role maps to a semantic intent and exposes
four tokens: `--md-{role}`, `--md-on-{role}`, `--md-{role}-container`, `--md-on-{role}-container`.

| Token | Role meaning | `--md-{role}` (accent) | `--md-on-{role}` | `--md-{role}-container` | `--md-on-{role}-container` |
|-------|-------------|------------------------|-------------------|------------------------|-----------------------------|
| `--md-primary` | Spells | `#d0bcff` | `#381e72` | `#4f378b` | `#eaddff` |
| `--md-secondary` | Weapons, exit choice-cards | `#e0c568` | `#3f2e00` | `#5c4600` | `#ffe08a` |
| `--md-tertiary` | Monsters, healthy HP | `#a0d0be` | `#05372a` | `#1d4f40` | `#bcecd9` |
| `--md-error` | Errors, traps, critical HP | `#f2b8b5` | `#601410` | `#8c1d18` | `#f9dedc` |
| `--md-npc` | NPCs (rose, hue 340.6/chroma 40) | `#fbafe3` | `#521b46` | `#6c325e` | `#ffd7ef` |
| `--md-passage-locked` | Map Lab locked passages | `#C5C0FF` | `#2C2767` | `#433F7F` | `#E3DFFF` |
| `--md-passage-hidden` | Map Lab hidden passages | `#C7C6C6` | `#2F3031` | `#464747` | `#E3E2E2` |
| `--md-door` | Map Lab door leaf and identity glyph | `#F9B79F` | `#4E2515` | `#683B29` | `#FFDBCE` |
| `--md-loot` | Items catalog and loot bundles | `#F6B994` | `#4C270C` | `#663C20` | `#FFDBC7` |
| `--md-divine` | Healing, radiant (banked) | `#FBBA73` | `#492900` | `#683D00` | `#FFDCBC` |
| `--md-arcane` | Arcane/eldritch magic (banked) | `#90CDFE` | `#00344F` | `#004B71` | `#CBE6FF` |
| `--md-nature` | Nature, druid, ranger (banked) | `#86D5C1` | `#00382E` | `#005143` | `#A2F2DD` |
| `--md-fire` | Fire damage, heat (banked) | `#FFB3AE` | `#5A1B1A` | `#77302E` | `#FFDAD7` |
| `--md-cold` | Cold damage, frost (banked) | `#73D5E1` | `#00363B` | `#004F56` | `#90F2FD` |
| `--md-lightning` | Lightning/thunder (banked) | `#ECBF79` | `#432C00` | `#5F4104` | `#FFDEAD` |
| `--md-poison` | Poison, acid, necrotic (banked) | `#9BD594` | `#01390A` | `#1D511F` | `#B7F2AE` |
| `--md-psychic` | Psychic, mind, illusion (banked) | `#DFB7FF` | `#41215D` | `#593876` | `#F1DAFF` |
| `--md-boss` | Boss enemies, legendary (banked) | `#FFB1C1` | `#59192C` | `#753042` | `#FFD9DF` |
| `--md-skill` | Skills, ability checks (banked) | `#A6C8FF` | `#00315F` | `#18477D` | `#D5E3FF` |

**Neutral surface tokens** (elevation via tone step):

| Token | Value | Usage |
|-------|-------|-------|
| `--md-surface` | `#1c1b1f` | Page background |
| `--md-surface-1` | `#232128` | Nav rail, card surfaces |
| `--md-surface-2` | `#28262e` | Header, floating windows |
| `--md-surface-3` | `#2e2b35` | Elevated surfaces, hover state |
| `--md-surface-4` | `#302d38` | Higher elevation |
| `--md-surface-5` | `#34313c` | Highest elevation |
| `--md-on-surface` | `#e6e1e6` | Primary text |
| `--md-on-surface-variant` | `#cac4d0` | Secondary text, neutral variant accents |
| `--md-outline` | `#948f99` | Borders |
| `--md-outline-variant` | `#49454f` | Subtle borders |

**Kid map family colours** (solved via `scripts/derive-kid-palette.mjs` — no hand-picked hexes; glyph colour computed per family for WCAG contrast):

| Family | `--kid-{family}` (disc) | Meaning | Hue band | `--kid-on-{family}` (glyph) |
|--------|------------------------|---------|----------|-----------------------------|
| Transition | `--kid-transition` | Stairs/portals (green) | 100–140° | `--kid-on-transition` |
| Opening | `--kid-opening` | Doors/windows (yellow) | 45–75° | `--kid-on-opening` |
| Fixture | `--kid-fixture` | Fixtures (blue) | 210–260° | `--kid-on-fixture` |
| People | `--kid-people` | People/pets (pink) | 315–350° | `--kid-on-people` |

**Content-role variants** are applied via `data-variant="spell|monster|weapon|loot|neutral"` on `Card` and
`SearchList` components, mapping to `--variant-*` custom properties. Add a new content role by:
1. Generating tokens via `scripts/generate-md3-tokens.mjs --seed <hex> --role <name>`
2. Adding the four `--md-{role}` tokens to `theme.css`
3. Adding a `[data-variant='{role}']` block mapping `--variant-*` to the new tokens

**Banked variants** (ready to adopt, no components use them yet):
`divine|arcane|nature|fire|cold|lightning|poison|psychic|boss|skill` — tokens and `data-variant` blocks
already exist in `theme.css`. To adopt one, extend the `CardVariant` / `SearchListVariant` union types
in their respective component files (`Card.tsx`, `SearchList.tsx`) and start using the variant string.

---

## Type scale

One mapping, no ad-hoc rem/px. Consume via `--type-{name}-{size|line|weight}` tokens.

| Token | Size | Line height | Weight | Usage |
|-------|------|-------------|--------|-------|
| `--type-headline` | 1.5rem | 2rem | 400 | Page/room/NPC names |
| `--type-title` | 1rem | 1.5rem | 500 | Door/stair/ability/stepper labels |
| `--type-body` | 1rem | 1.5rem | 400 | Prose, body text |
| `--type-body-sm` | 0.875rem | 1.25rem | 400 | Secondary detail, floor-for-prose |
| `--type-label` | 0.875rem | 1.25rem | 500 | Rail, breadcrumb, section headings |
| `--type-caption` | 0.6875rem | 1rem | 500 | Eyebrows, chips, badges; 0.05em tracking |

Font families: `--type-face` = `'Roboto Flex', 'Segoe UI', system-ui, sans-serif`;
`--type-face-mono` = `'Roboto Mono', ui-monospace, 'Consolas', monospace`.

---

## Icon-registry policy

All Lucide line icons are available via a single barrel export from
`frontend/src/components/icons/index.ts`. No component imports `lucide-react` directly.

**How it works:**
- `export * from 'lucide-react'` makes every Lucide icon available by its native PascalCase name
  (e.g. `import { DoorOpen, AlertTriangle } from '../components/icons'`)
- TTRPG-specific aliases are provided on top with descriptive names and usage comments,
  organized by domain (dungeon, combat, magic, items, characters, etc.)

**Using an icon:**
- Prefer the TTRPG alias when one exists: `import { DoorIcon } from '../components/icons'`
- Use the native Lucide name otherwise: `import { DoorOpen } from '../components/icons'`

**Adding a new alias:**
1. Add an export alias in `components/icons/index.ts` in the appropriate domain section
2. Use the pattern: `export { LucideName as AppAlias } from 'lucide-react'`
3. Include a TTRPG usage comment

Icon count: 524 TTRPG aliases + all 3,990 Lucide native icons available. Visually reviewed
at 16px. Icons inherit `currentColor` for seamless theming. No icon fonts, no CDN, no emoji.

---

## Foundation token scale (VF1)

Named tokens in `theme.css` for spacing, radius, control size, elevation/backdrop, motion, and z-index. Values
are derived from the dominant ad-hoc values already in use across the app, not invented — this pass formalizes
the existing visual language rather than redesigning it. `Button.css`, `IconButton.css`, `PageHeader.css`,
`StatePanel.css`, `Dialog.css`, `SearchList.css`, `form/form.css`, and `Card.css` (radius only) consume these
tokens; other component CSS still carries pre-VF1 ad-hoc values and adopts the scale incrementally as VW/VT
stages touch it. `SplitPane.css`'s outer-corner `0.5rem` radius is a documented one-off (VF2) rather than
rounded onto `--radius-md`/`--radius-lg`, since either would visibly shrink or grow that specific corner
treatment.

| Token | Value | Notes |
|-------|-------|-------|
| `--space-1` … `--space-7` | `0.25rem, 0.5rem, 0.75rem, 1rem, 1.5rem, 2rem, 3rem` | General padding/gap/margin scale. |
| `--radius-sm` / `--radius-md` / `--radius-lg` / `--radius-full` | `0.25rem / 0.375rem / 0.75rem / 999px` | Control, panel/dialog, and pill radii. |
| `--control-height` / `--control-height-compact` | `48px / 32px` | Normal (touch-floor) and compact interactive control height. |
| `--kid-control-height` | `64px` | Raised touch floor for kid surfaces (`/play`). All interactive elements on kid surfaces must meet this minimum height. |
| `--elevation-shadow` | `0 8px 32px rgb(0 0 0 / 0.4)` | Dialog/floating-surface drop shadow. |
| `--backdrop-color` | `rgb(0 0 0 / 0.55)` | Modal backdrop scrim. |
| `--motion-fast` / `--motion-normal` | `0.15s ease / 0.2s ease` | Control-state transitions vs. layout-affecting transitions (e.g. nav rail width). |
| `--z-editor` / `--z-floating` / `--z-dialog` | `100 / 150 / 200` | Editor modal backdrops, floating docks, `Dialog`. |

`--md-surface-variant` (previously referenced but undefined) now aliases `--md-surface-3`, the existing
elevated/hover surface tone.

### Responsive breakpoint convention

Two widths cover the majority of existing `@media` usage (Monster routes): **520px** (narrow phone) and **768px**
(tablet). Use these literal pixel values in `@media (max-width: …)` queries — CSS custom properties are not
usable inside media features, so these are a documented convention rather than consumable tokens. A few existing
surfaces (Dungeon shell, Map Lab) use `38rem`/`56rem` instead; reconcile them to this convention only when a VW/VT
stage already has that file in its touch set, not as a standalone sweep.

### Font roles

No new display typeface is bundled in this pass. Bundling requires vetting license terms, shipping font files
offline-safe with the build, and confirming legibility at the `--type-headline` size before it touches every
route heading — that evaluation work doesn't have a payoff proportional to VF1's scope. Route headings continue
to use `--type-face` (`'Roboto Flex', 'Segoe UI', system-ui, sans-serif`). A future stage may revisit a bundled
display face for headings only if it stays offline-safe and license-compatible.

## Spacing & layout convention

Ad-hoc rem values remain in most component CSS outside the VF1 touch set (see the token table above). Padding
values cluster around 0.5rem–1.5rem in practice. VW/VT stages adopt the spacing scale as they touch each file.

---

## Shared control and state contracts (VF2)

- **`Button`/`IconButton`** — normal size (`.btn--normal`, `.icon-btn`) consumes `--control-height` (48px) for
  both width and height, meeting the touch-target floor. `Button`'s `compact` size remains the documented
  desktop-only exception.
- **`StatePanel`** — `loading` status renders a `.state-panel-spinner` (a `--md-primary`-colored spinning ring,
  `prefers-reduced-motion`-safe via the global animation-duration reset). All five statuses (`loading`, `empty`,
  `filteredEmpty`, `error`, `noSelection`) have distinct default copy; `action` renders an arbitrary interactive
  element; the root always carries `role="status" aria-live="polite"`.
- **`SearchList`** — item rows use ordinary button-list semantics (`<ul><li><button>`, no `role="listbox"`/
  `role="option"`), with the selected row marked via `aria-current="true"` rather than `aria-selected`. A new
  `status?: 'ready' | 'loading' | 'error'` prop (default `'ready'`) renders the shared `StatePanel` for loading
  and error states; when `status` is `'ready'`, an empty `items` array renders `StatePanel`'s `empty` state and
  a non-empty `items` array with an empty filtered result renders its `filteredEmpty` state — these are now
   visually and textually distinct. `emptyMessage` overrides the `StatePanel` message only for those ready empty
   states; an error always retains `StatePanel`'s error copy. The search input and each item row meet the 48px
   control-height floor.
- **`SplitPane`** — the visible divider stays 4px wide (unchanged), but `.split-pane-handle::before` adds an
  absolutely positioned, invisible hit-target region (14px on each side) so pointer users get a much larger
  resize target without any layout shift or visual width change. Keyboard resizing (arrow/Home/End on the
  focused separator) remains available when expanded and is absent while collapsed. When enabled by
  `BrowserLayout`'s `listCollapsible` prop, the list rail has labelled icon buttons to collapse/restore, keeps
  children mounted so search/selection/scroll state survives, and persists collapse state plus last expanded width in
  `localStorage` under `dnd-kids-browser-rail` with an in-memory fallback. At the 520px mobile breakpoint the
  shared collapse controls are suppressed so existing list/detail navigation owns the narrow layout.
- **Shared form controls** (`form/form.css`'s `.form-control`, consumed by `TextField`/`SelectField`) — meet the
  48px floor via `min-height: var(--control-height)`; `.form-field-checkbox` (consumed by `CheckboxField` and
  `MultiSelectField`) does the same for its checkbox+label row. `.form-textarea`'s explicit `6rem` min-height
  (already above the floor) is unaffected.
- **`visually-hidden`** — consolidated to a single definition in `index.css` (global, always loaded via
  `main.tsx`). The previous duplicate definitions in `SearchList.css` and `AppShell.css` are removed; all
  consumers (`SearchList`, `AppShell`, `CombatantCard`, and future components) share the one utility.

---

## Dialog contract (VF3)

- **`Dialog`** (`components/Dialog.tsx`) is the one modal accessibility contract; `ConfirmDialog` is a consumer of
  it, not a parallel implementation. Props: `open`, `title`, `description?`, `onClose`, `children?`, `footer?`,
  `pending?` (default `false`), `role?` (`'dialog' | 'alertdialog'`, default `'dialog'`), `className?` (merged
  onto the `.dialog` element, e.g. for a per-consumer width override — see the Standard editor contract (VW4)
  below).
- **Title/description association** — `title` renders as an `<h2>` wired via `aria-labelledby`; `description`
  (optional) renders as a `<p>` wired via `aria-describedby`, both using `useId()`.
- **Initial focus** — on open, focus moves to the first focusable element inside the dialog (in DOM order across
  body and footer); if none exists, focus moves to the dialog surface itself (`tabIndex={-1}`).
- **Focus containment** — Tab/Shift+Tab cycle only through focusable elements inside the dialog; tabbing past the
  last element wraps to the first, and Shift+Tab off the first wraps to the last.
- **Focus restoration** — the element focused immediately before open is refocused when the dialog closes.
- **Escape and backdrop dismissal** — both call `onClose`, but neither fires while `pending` is `true` ("Escape
  dismissal where allowed").
- **Pending state** — body and footer content sit inside a `<fieldset disabled={pending} inert={pending}>`
  (styled `display: contents` so it doesn't affect layout), disabling form controls and making links or other
  non-form focusable descendants inert in one place; the dialog surface also carries `aria-busy="true"` while
  pending.
- **`ConfirmDialog`** (`components/ConfirmDialog.tsx`) keeps its existing public API (`message`, `confirmLabel`
  default `'Delete'`, `onConfirm`, `onCancel`) plus an additive `pending?` prop, and renders `Dialog` with
  `role="alertdialog"` and `title={message}` (no separate body text — the title *is* the question). Its footer
  renders shared `Button`s: `variant="secondary"` Cancel and `variant="danger"` confirm (`loading={pending}`).
  `ConfirmDialog.css` was removed; there is no dialog-specific stylesheet left outside `Dialog.css`.

---

## Shell and entry-point contract (VF4)

- **`AppShell`** (`layout/AppShell.tsx`) — owns the DM app's operational identity row. The site brand
  (`.app-brand`) remains a `Link to="/"`, not a route `h1`, and is the first item in the persisted desktop
  rail (`useNavCollapse()`, `.app-nav`); each routed page establishes its own visible `h1` via `PageHeader`.
  `useAppShellRowSlots()` exposes shell-local identity and chapter-tab portal targets: `PageHeader` contributes
  title, optional context, and actions to the operational row, while chapter tabs remain in a separate in-flow
  row immediately below it that spends no height when empty. At the `768px` breakpoint the rail is hidden
  (`display: none`) and an `.app-nav-mobile-trigger` `IconButton` (`aria-label="Open navigation"`) leads the
  operational row, opening a `Dialog`-based drawer (`title="Navigate"`) that lists the same nav sections;
  selecting a link closes the drawer. `IconButton` does not merge a passed `className` (it hardcodes
  `className="icon-btn"` and spreads
  `...rest` after it, so a caller `className` silently replaces it) — wrap it in a container element for any
  responsive/positioning class instead of passing `className` directly to `IconButton`.
- The routed encounter runner (`/encounters/:id/run`) adds the temporary `.app-nav--play` compact wide-screen presentation without changing `dnd-kids-nav-collapsed`; preparation routes remain controlled by the persisted preference, and constrained navigation remains the labelled trigger/drawer path.
- **`navSections`** (`layout/navSections.ts`) — the single source of truth for the nav-section → route mapping
  (`{ label, icon, links: { to, label, linkIcon }[] }`), consumed by both `AppShell`'s desktop rail/mobile
  drawer and `HomePage`'s chapter tabs. Add a new feature route's nav entry here once, not per-consumer.
- **`HomePage`** (`pages/HomePage.tsx`) — a field-guide start page, not an API proof screen. Uses `PageHeader`
  (`title="Field Guide"`) with one `chapterTabs` entry per `navSections` group (local `useState` selects the
  active chapter, no route/URL state) and renders that chapter's routes as a `.home-page-grid` of icon+label
  link cards (`.home-page-card`, `Link` to each route).
- **`ComponentDemoPage`** — excluded from the production route tree. `router.tsx` exports a `routes` array
  (consumed by `createBrowserRouter` to produce the exported `router`) that only includes the `demo` route when
  `import.meta.env.DEV` is true; Vite dead-code-eliminates the disabled branch (and `ComponentDemoPage`'s
  content) out of the production bundle. Test the route list via the exported `routes` array with
  `vi.stubEnv('DEV', …)` + `vi.resetModules()` + dynamic `import()`, not by instantiating `router` (a data
  router instance does not expose its route config for inspection).

---

## Standard editor contract (VW4)

- All six modal editors (`SpellEditor`, `WeaponEditor`, `PlayerEditor`, `NPCEditor`,
  `ItemEditor`, `EncounterEditor`) render the shared `Dialog` (VF3) instead of a duplicated fixed backdrop/modal
  implementation. Each keeps its own `<form>` (with a `useId()`-generated `id`) as the Dialog's `children`; the
  Dialog `footer` holds a `variant="secondary"` Cancel `Button` and a `variant="primary"` (default) Save `Button`
  with `type="submit" form={formId}` — this lets the Save button live in the Dialog footer (outside the `<form>`
  element in the DOM) while still submitting it, per the standard HTML `form` attribute. `Dialog`'s `pending`
  prop is passed the editor's existing `saving` boolean, so the shared `<fieldset disabled={pending}>` disables
  every field and both footer buttons during save, and Escape/backdrop dismissal is suppressed — no editor needed
  a bespoke dirty-close policy beyond what `Dialog` already provides.
- **Title** — each editor's existing `Edit ${x.name}` / `Add New X` string becomes the Dialog `title` verbatim
  (no separate `aria-label`); the Dialog's `aria-labelledby` makes this string the dialog's accessible name, so
  tests must assert `getByRole('dialog', { name: 'Add New Spell' })`, not the pre-VW4 lowercase `aria-label`
  text (`'Add new spell'`) that some editors used to carry separately from their visible heading.
- **Width** — Dialog's own `.dialog` rule (`width: min(480px, 90vw)`) is a default, not a ceiling. Each editor
  keeps a single feature-owned width override class passed via Dialog's additive `className?` prop (merged onto
  `.dialog`, not replacing it): `spell-editor-dialog`/`encounter-editor-dialog` `min(760px, 96vw)`,
  `npc-editor-dialog` `min(720px, 96vw)`, `weapon-editor-dialog` `min(680px, 96vw)`,   `item-editor-dialog` `min(580px, 96vw)`, `player-editor-dialog` `min(520px, 96vw)`. No new
  breakpoints were added — `Dialog.css`'s existing `dialog-body` scroll/`max-height: 85vh` already supplies
  narrow/overflow behavior for every width.
- **Save status** — each editor's existing status paragraph (`{editor}-status`, success/error `kind` modifier)
  gained `role="status"` so assistive tech announces save results; no other markup changed.
- **Removed per-editor chrome** — each editor's own backdrop, modal surface, header (`<h2>` + close button),
  and Cancel/Save action-row markup and CSS were deleted (all now supplied by `Dialog`); `ItemEditor` and
  `EncounterEditor` dropped their unused `CloseIcon` import as part of this. `EncounterEditor`'s outer
  `data-variant="monster"` attribute was also dropped: every consumer of the `--variant-*` custom properties it
  scoped (`.encounter-editor-add`, `CreatureRowCard`) already specifies the same tertiary values as its
  `var(--variant-x, var(--md-tertiary...))` fallback, so removing the ancestor attribute is visually inert.

---

## Component anatomy

### CombatantCard (`features/encounters/`)

HP meter + controls for encounter runner:
- **HP meter** — colored by tier (teal ≥75%, gold ≥25%, red <25%, `SkullIcon` at 0)
- **6-button stepper rail** — adjust HP in fixed increments
- **Drag handle** with ▲/▼ accessible keyboard fallback
- **Status chips** — condition badges

### NPCStatCard (`features/npcs/`)

NPC stat display with `compact` prop for dock use:
- **Monogram** + name + identity line
- **Appearance sentence** — composed from structured fields
- **Conditional stat strip** — AC/HP/Speed (shown only when present)
- **Six-ability block** — STR/DEX/CON/INT/WIS/CHA with modifier
- **Conditional sections** — saving throws, skills, senses, languages (each hidden when absent)
Consumes `data-variant="npc"`.

### FloatingWindow (`components/FloatingWindow.tsx`)

Generic draggable/touch dock for overlays:
- **Grip header** — `GripIcon` drag handle, title, minimize (−/▢), close (×)
- **Position and size persisted** to `sessionStorage` per `storageKey`
- **Resize handle** — pointer drag and arrow-key operation, clamped to the viewport
- **Body** — scrollable content area
- **`role="dialog"`**, `aria-label` via title prop
- **Minimized state** collapses body but keeps header visible
Used verbatim by encounter runner dock and NPC dossier dock; multiple can be open simultaneously.

### DiceText (`components/DiceText.tsx`)

Renders dice notation as a rollable-die chip. The optional `role` applies the surrounding content-role variant;
there is no universal gold pill. Non-dice segments also pass through the bundled rule glossary matcher, so
known terms render with `GlossaryTerm` while unmatched text remains plain; `ReferenceText` inherits the same
behavior because its resolved output delegates to `DiceText`.

### InspectorPanel + Inspectable (`maplab/`)

Generic hover/focus details panel in Map Lab:
- Driven by `inspectableDescriptor(target)` which resolves any map fixture (room, door, stair, portal, prop, feature)
  to a uniform `{title, typeLabel, icon, token, lines, chips}` shape
- **Obstacle panel** — one shared labelled-checkbox panel renders Open, Concealment, Lock, and Trap with
  independent Armed/Shown controls, authored/effective adapters, obstacle DC rows, and local action failures.
  DM View supplies immediate sparse session writes, rollback, and fixture reset; DM Edit supplies authored
  reducer updates through layout autosave.
- **Session layer** — `effectiveFixtureState` resolves authored baselines with sparse runtime leaves; no
  player-knowledge controls or source badges are rendered in the inspector.

### Map Lab markers (`map/` shared primitives, `maplab/` DM consumers)

- **On-square markers** — props, stairs, and portals retain neutral marker bodies with stable fixture-identity
  icon/color. One shared bounded status token appears inside the owning cell: the specific status icon for one
  active state, or the `MultipleStatusesIcon`/Layers alias for two or more; inspector chips and ARIA labels
  still enumerate every independent state. DM and player map consumers use the same token renderer, geometry,
  sizing, and placement.
- **Doors** — the leaf and identity glyph always use `--md-door`; door state is communicated by its
  icon-bearing badges, distributed alongside the current leaf in a trailing SVG layer.
- **Audience policy** — DM maps show active Concealment, Trap, and Lock tokens regardless of `Shown`, retain
  the Multiple-statuses collapse, and keep Loot DM-only. The kid map is read-only and shows at most one
  icon-only active-and-shown Trap-or-Lock cue per fixture, with Trap winning over Lock and no fixture title
  or visible status text.

### Collapsible nav rail (`layout/AppShell.tsx`)

Site-wide navigation shell:
- **Expanded** — 200px fixed-width nav with the home/brand action first, followed by the collapse toggle,
  section headers (Reference, Campaign), link labels, and icons
- **Collapsed** — 64px icon-only rail, section headers become `visually-hidden`, sections separated by
  `border-top` dividers, links center icons without labels
- **Toggle** — 48×48px button at top of rail, `PanelLeftCloseIcon`/`PanelLeftOpenIcon`, persisted to
  `localStorage` via `useNavCollapse()` (key: `dnd-kids-nav-collapsed`, private-browsing-safe)
- **Active link** — `--md-primary-container` background + `--md-on-primary-container` text
- **Links** — ≥48px min-height touch targets, `aria-label` always visible (even collapsed), `title`
  attribute on every link
- **CSS transition** — `width 0.2s ease`; `prefers-reduced-motion` disables via root reset
- **`visually-hidden` class** — `position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0)`

### Map Lab viewer room rail (`maplab/MapLabViewerCanvas.tsx`)

- **Desktop (>768px)** — the room rail has an independent labelled seam control with a 12px visual
  affordance inside a 48px pointer target. Selecting a room does not collapse the rail.
- **Tablet (<=768px)** — the seam does not render; the labelled Rooms toggle and backdrop own the
  overlay drawer, and selecting a room closes it.
- **Floor selection** — the viewer floor tablist is the final control group inside the toolbar and
  remains outside the room drawer.

### ToolbarTray (`maplab/MapLabToolbar.tsx`)

Independently collapsible toolbar group in Map Lab:
- **Structure** — label text + chevron toggle button + controls container
- **Collapse** — per-group via `useToolbarTrayCollapse(groupKey)`, persisted to `localStorage` under
  key `dnd-kids-maplab-tray-collapsed:{groupKey}`, default expanded
- **Controls hidden** via width/overflow when collapsed (never `display:none`, so group structure stays
  legible)
- **Toggle** — `ChevronUpIcon`/`ChevronDownIcon`, `aria-expanded` reflects state, `aria-label` includes
  group name and expand/collapse action
- **Reused by** — `MapLabPage` (Session group) and `MapLabEditorPage` (Primary and Active tool
  options groups, wrapping the tool palette below — Session/View/Status groups were replaced by
  popovers and a header portal, see below)

### Tool palette + popovers (`maplab/MapLabEditorPage.tsx`, `maplab/MapLabPage.tsx`)

Editor chrome for arming tools and adjusting view/map settings without a five-tray toolbar:
- **Tool palette** — five sticky slots (Select, Room, Passages, Prop, Terrain) inside the `Primary`
  `ToolbarTray`; active-tool options are presented in a separate labelled `Active tool options`
  group. One `armedTool` stays armed until another tool or Esc is chosen. Group slots
  (Passages, Terrain) remember their last-used sub-tool — tap re-arms it, the chevron button opens a
  `role="menu"` flyout (`maplab-tool-palette-flyout`) to pick a specific sub-tool.
- **Options slot** — while a brush tool is armed, an Erase toggle (`maplab-tool-options-erase`)
  appears; while Prop is armed, a row of kind chips from `PROP_KIND_OPTIONS` appears instead — the two
  never show together.
- **Brush stroke model** — Room, River, and Trees use `useCanvasStroke` pointer capture plus
  coordinate hit-testing rather than per-cell hover handlers. Room strokes can create a new room when
  no room is selected, extend the selected room, or erase selected-room cells; terrain strokes create,
  extend, or erase the selected/owning feature.
- **Door placement targets** — while Door is armed, placeable walls render a visual edge plus a
  separate `.maplab-door-placement-hitband` rect about 40px deep. The hitband owns the button role and
  click target; the line is visual-only and highlights with the hitband on hover/focus.
- **View / Map popovers** — trigger buttons (`maplab-pill-button maplab-editor-toolbar-button`,
  `aria-haspopup="true"`, `aria-expanded`) each open a `role="menu"` panel
  (`maplab-view-popover`/`maplab-map-popover`) via local open state, closed on click-outside or Escape
  (`window` `mousedown`/`keydown` listeners, ref-scoped). View holds the four layer toggles, Ghost
  lower floor, and density; Map holds the four padding inputs and "Reset unsaved changes" (opens
  `ConfirmDialog` rather than firing instantly).
- **Viewer View popover** — `MapLabPage` uses the same local trigger/panel and click-outside/Escape
  dismissal pattern for its four layer toggles and three density choices. Live Session controls stay
  directly visible in their `ToolbarTray`.
- **Save status** — portals from `MapLabEditorPage` through
  `DungeonShellStatusSlotContext`/`useDungeonShellStatusSlot()` (`dungeonRouteContext.ts`) into Map
  Lab's contribution to the shared AppShell operational row, instead of the editor toolbar.

---

### Loom — Session grid renderer

The Loom uses a purpose-built static grid renderer in `LoomSwimlanes.tsx`, `LoomLane.tsx`,
and `LoomNodeCard.tsx`. No graph library; no edges; no focus-gating. Every Thread is always visible.

**Layout structure:** The tapestry renders as a session-column grid: pinned thread labels (swatch + name)
on the left, session column headers (ordinal + name) across the top, and cells at each thread×session
intersection. Beats with null `session_id` appear in the warp area after the last session column.
Cells have three states: **real** (a node exists at that intersection, rendering `LoomNodeCard`),
**quiet** (thread is alive but no card at that session — faint background tint), and
**outside-life** (thread not yet started or already ended — blank space). The stitch overlay, card-rect
tracking, and cross-lane stitch geometry are retired.

**Node cards (`.loom-node`):** Base fill by kind — Start/End on `--md-primary-container`, beat on
`--md-tertiary-container`, session on `--md-secondary-container`. Every threaded node carries a
`.loom-node-spine` left strip colored by `data-color="thread-N"` → `--md-loom-thread-N`. Status cues:
played nodes (sessions and fulfilled beats) render solid; upcoming beats render ghosted
(`.loom-node--ghosted`, 0.58 opacity, dashed border). Selected cards get `.loom-node--selected` outline.

**Thread palette:** `--md-loom-thread-1`…`--md-loom-thread-6` (+ `-container`/`-on-*`), stored in DB
as token keys (`thread-1`…`thread-6`). `--md-loom-anchor` (+ `-container`/`-on-*`) is the warm beacon
gold accent for planned milestones. **There is no `--md-loom-update` token set** and no `anchor`/`update`
node kinds — only start/end/beat/session.

**Inspector rail (`LoomRail.tsx`):** Fixed right rail composing inspector, thread list, and beat bank.
Shows selection details (title, kind pill with icon+text glyph, thread name, body excerpt) and lifecycle
actions (Edit, Fulfil Beat, Bank Beat, Spawn Thread, Change Ending, Undo Fulfil, Delete). When nothing
is selected it renders the thread list and `LoomLegend` (glyph+label legend so kind cues never rely on
hue alone). The rail contract is `{ selectedNode, threads, nodes, sessions, … }` — no focus state.

**Beat Bank tray (`LoomBeatBankTray.tsx`):** Collapsible tray listing banked beats (nodes with null
`thread_id`). Each entry shows the beat title and a Restore button. Accessible label pattern:
`Beat Bank (N)`.

**Grid styling:** Cells use theme tokens and thread colors. Quiet cells render with a subtle background
tint; outside-life cells render as blank space. Thread label column is sticky-left with dimmed states
for non-selected threads. Responsive and reduced-motion adaptations use `@media (prefers-reduced-motion)`
to suppress transitions.

**Accessibility:** `.loom-node` cards have `role="button"`, `tabIndex={0}`, `aria-pressed`, and
`aria-label="{kind}: {title}"`. Every kind pill in the rail and legend carries a glyph
(◇ Start, ◆ Beat, ● Session, ■ End, N Now, → Next) so no semantic information relies on color alone.
`:focus-visible` rings (`2px solid var(--md-primary)`, 2–3px offset) on all interactive elements.
Touch targets ≥48px where feasible.

---

## Accessibility floor

- **Visible focus rings** — `:focus-visible` with `2px solid var(--md-primary)` + `2px offset`, applied
  globally
- **Never hue-alone** — icons and text always back color cues; no information conveyed solely by color
- **`prefers-reduced-motion`** — all animations/transitions set to `0.001ms` duration via root CSS reset
- **Kid map contrast** — the kid map (`/play/map`) uses the shared Map Lab canvas geometry and
  quiet-fill/loud-wall treatment: room cells have no grid stroke, walls use the shared real-pixel
  treatment, and the surface uses the shared neutral variant rather than a separate figure/ground
  renderer. Kid-specific marker and stair aliases remain available for later stages.
- **Touch targets** — ≥48px (`--control-height`) on all interactive controls. Documented exceptions: canvas SVG
  glyphs in Map Lab, following a marker-radius convention instead; `Button`'s `compact` size
  (`--control-height-compact`, 32px), reserved for documented desktop-only inspector controls per the visual
  consistency plan's design-system-in-force contract; and Map Lab editor compact property inputs/selects/
  checkboxes inside `.maplab-field-row`, where each compact control is paired with a visible label and the row
  itself keeps the 48px target footprint; and inline glossary term triggers, whose native inline text buttons
  retain the global visible focus ring but cannot reach 48px high without breaking running-prose layout. The
  ordinary catalog authoring and picker controls touched by VW6 also consume this floor.

<!-- GENERATED:DESIGN_SYSTEM:START -->
### Generated Design Inventory

CSS custom properties: `--backdrop-color`, `--control-height`, `--control-height-compact`, `--elevation-shadow`, `--feature-river-fill`, `--feature-trees-fill`, `--kid-control-height`, `--kid-fixture`, `--kid-map-door`, `--kid-map-floor`, `--kid-map-party-fill`, `--kid-map-room-fill`, `--kid-map-room-title`, `--kid-map-stair-badge`, `--kid-map-stair-badge-edge`, `--kid-map-stair-badge-on`, `--kid-on-fixture`, `--kid-on-opening`, `--kid-on-people`, `--kid-on-transition`, `--kid-opening`, `--kid-people`, `--kid-transition`, `--maplab-outside-fill`, `--md-arcane`, `--md-arcane-container`, `--md-boss`, `--md-boss-container`, `--md-cold`, `--md-cold-container`, `--md-divine`, `--md-divine-container`, `--md-door`, `--md-door-container`, `--md-error`, `--md-error-container`, `--md-fire`, `--md-fire-container`, `--md-lightning`, `--md-lightning-container`, `--md-loom-anchor`, `--md-loom-anchor-container`, `--md-loom-thread-1`, `--md-loom-thread-1-container`, `--md-loom-thread-2`, `--md-loom-thread-2-container`, `--md-loom-thread-3`, `--md-loom-thread-3-container`, `--md-loom-thread-4`, `--md-loom-thread-4-container`, `--md-loom-thread-5`, `--md-loom-thread-5-container`, `--md-loom-thread-6`, `--md-loom-thread-6-container`, `--md-loot`, `--md-loot-container`, `--md-nature`, `--md-nature-container`, `--md-npc`, `--md-npc-container`, `--md-on-arcane`, `--md-on-arcane-container`, `--md-on-boss`, `--md-on-boss-container`, `--md-on-cold`, `--md-on-cold-container`, `--md-on-divine`, `--md-on-divine-container`, `--md-on-door`, `--md-on-door-container`, `--md-on-error`, `--md-on-error-container`, `--md-on-fire`, `--md-on-fire-container`, `--md-on-lightning`, `--md-on-lightning-container`, `--md-on-loom-anchor`, `--md-on-loom-anchor-container`, `--md-on-loom-thread-1`, `--md-on-loom-thread-1-container`, `--md-on-loom-thread-2`, `--md-on-loom-thread-2-container`, `--md-on-loom-thread-3`, `--md-on-loom-thread-3-container`, `--md-on-loom-thread-4`, `--md-on-loom-thread-4-container`, `--md-on-loom-thread-5`, `--md-on-loom-thread-5-container`, `--md-on-loom-thread-6`, `--md-on-loom-thread-6-container`, `--md-on-loot`, `--md-on-loot-container`, `--md-on-nature`, `--md-on-nature-container`, `--md-on-npc`, `--md-on-npc-container`, `--md-on-passage-hidden`, `--md-on-passage-hidden-container`, `--md-on-passage-locked`, `--md-on-passage-locked-container`, `--md-on-poison`, `--md-on-poison-container`, `--md-on-primary`, `--md-on-primary-container`, `--md-on-psychic`, `--md-on-psychic-container`, `--md-on-secondary`, `--md-on-secondary-container`, `--md-on-skill`, `--md-on-skill-container`, `--md-on-surface`, `--md-on-surface-variant`, `--md-on-tertiary`, `--md-on-tertiary-container`, `--md-outline`, `--md-outline-variant`, `--md-passage-hidden`, `--md-passage-hidden-container`, `--md-passage-locked`, `--md-passage-locked-container`, `--md-poison`, `--md-poison-container`, `--md-primary`, `--md-primary-container`, `--md-psychic`, `--md-psychic-container`, `--md-secondary`, `--md-secondary-container`, `--md-skill`, `--md-skill-container`, `--md-surface`, `--md-surface-1`, `--md-surface-2`, `--md-surface-3`, `--md-surface-4`, `--md-surface-5`, `--md-surface-variant`, `--md-tertiary`, `--md-tertiary-container`, `--motion-fast`, `--motion-normal`, `--radius-full`, `--radius-lg`, `--radius-md`, `--radius-sm`, `--space-1`, `--space-2`, `--space-3`, `--space-4`, `--space-5`, `--space-6`, `--space-7`, `--type-body-line`, `--type-body-size`, `--type-body-sm-line`, `--type-body-sm-size`, `--type-body-sm-weight`, `--type-body-weight`, `--type-caption-line`, `--type-caption-size`, `--type-caption-tracking`, `--type-caption-weight`, `--type-face`, `--type-face-mono`, `--type-headline-line`, `--type-headline-size`, `--type-headline-weight`, `--type-label-line`, `--type-label-size`, `--type-label-weight`, `--type-title-line`, `--type-title-size`, `--type-title-weight`, `--variant-accent`, `--variant-container`, `--variant-on-accent`, `--variant-on-container`, `--wall-natural-stroke`, `--wall-open-stroke`, `--z-dialog`, `--z-editor`, `--z-floating`.

Supported `data-variant` values: `arcane`, `boss`, `cold`, `divine`, `fire`, `lightning`, `loot`, `monster`, `nature`, `neutral`, `npc`, `poison`, `psychic`, `skill`, `spell`, `weapon`.
<!-- GENERATED:DESIGN_SYSTEM:END -->
