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

Icon count: 520 TTRPG aliases + all 3,990 Lucide native icons available. Visually reviewed
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
  visually and textually distinct. `emptyMessage` overrides the `StatePanel` message for whichever of those two
  states is showing. The search input and each item row meet the 48px control-height floor.
- **`SplitPane`** — the visible divider stays 4px wide (unchanged), but `.split-pane-handle::before` adds an
  absolutely positioned, invisible hit-target region (14px on each side) so pointer users get a much larger
  resize target without any layout shift or visual width change. Keyboard resizing (arrow/Home/End on the
  focused separator) was already implemented in VF1 and is unchanged.
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
  `pending?` (default `false`), `role?` (`'dialog' | 'alertdialog'`, default `'dialog'`).
- **Title/description association** — `title` renders as an `<h2>` wired via `aria-labelledby`; `description`
  (optional) renders as a `<p>` wired via `aria-describedby`, both using `useId()`.
- **Initial focus** — on open, focus moves to the first focusable element inside the dialog (in DOM order across
  body and footer); if none exists, focus moves to the dialog surface itself (`tabIndex={-1}`).
- **Focus containment** — Tab/Shift+Tab cycle only through focusable elements inside the dialog; tabbing past the
  last element wraps to the first, and Shift+Tab off the first wraps to the last.
- **Focus restoration** — the element focused immediately before open is refocused when the dialog closes.
- **Escape and backdrop dismissal** — both call `onClose`, but neither fires while `pending` is `true` ("Escape
  dismissal where allowed").
- **Pending state** — body and footer content sit inside a `<fieldset disabled={pending}>` (styled
  `display: contents` so it doesn't affect layout), disabling every interactive descendant in one place; the
  dialog surface also carries `aria-busy="true"` while pending.
- **`ConfirmDialog`** (`components/ConfirmDialog.tsx`) keeps its existing public API (`message`, `confirmLabel`
  default `'Delete'`, `onConfirm`, `onCancel`) plus an additive `pending?` prop, and renders `Dialog` with
  `role="alertdialog"` and `title={message}` (no separate body text — the title *is* the question). Its footer
  renders shared `Button`s: `variant="secondary"` Cancel and `variant="danger"` confirm (`loading={pending}`).
  `ConfirmDialog.css` was removed; there is no dialog-specific stylesheet left outside `Dialog.css`.

---

## Shell and entry-point contract (VF4)

- **`AppShell`** (`layout/AppShell.tsx`) — the site brand (`.app-brand`) is a `Link to="/"`, not a route `h1`;
  each routed page establishes its own `h1` via `PageHeader`. The persisted desktop rail (`useNavCollapse()`,
  `.app-nav`) is unchanged from VF1-VF3. At the `768px` breakpoint the rail is hidden (`display: none`) and an
  `.app-nav-mobile-trigger` `IconButton` (`aria-label="Open navigation"`) appears in the header, opening a
  `Dialog`-based drawer (`title="Navigate"`) that lists the same nav sections; selecting a link closes the
  drawer. `IconButton` does not merge a passed `className` (it hardcodes `className="icon-btn"` and spreads
  `...rest` after it, so a caller `className` silently replaces it) — wrap it in a container element for any
  responsive/positioning class instead of passing `className` directly to `IconButton`.
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
there is no universal gold pill.

### InspectorPanel + Inspectable (`maplab/`)

Generic hover/focus details panel in Map Lab:
- Driven by `inspectableDescriptor(target)` which resolves any map fixture (room, door, stair, portal, prop)
  to a uniform `{title, typeLabel, icon, token, lines, chips}` shape
- **Panels** — icon+text chips for passage state, detail lines, session toggle controls
- **Session layer** — `effectivePassageState` computed from authored flags + runtime toggles

### Map Lab markers (`maplab/`)

- **On-square markers** — props, stairs, and portals retain neutral marker bodies with stable fixture-identity
  ring/icon color. One bounded status disc appears inside the owning cell: the specific status icon for one
  active state, or the `MultipleStatusesIcon`/Layers alias for two or more; inspector chips and ARIA labels
  still enumerate every independent state.
- **Doors** — the leaf and identity glyph always use `--md-door`; door state is communicated by its
  icon-bearing badges, distributed alongside the current leaf in a trailing SVG layer.

### Collapsible nav rail (`layout/AppShell.tsx`)

Site-wide navigation shell:
- **Expanded** — 200px fixed-width nav with section headers (Reference, Campaign), link labels, icons
- **Collapsed** — 64px icon-only rail, section headers become `visually-hidden`, sections separated by
  `border-top` dividers, links center icons without labels
- **Toggle** — 48×48px button at top of rail, `PanelLeftCloseIcon`/`PanelLeftOpenIcon`, persisted to
  `localStorage` via `useNavCollapse()` (key: `dnd-kids-nav-collapsed`, private-browsing-safe)
- **Active link** — `--md-primary-container` background + `--md-on-primary-container` text
- **Links** — ≥48px min-height touch targets, `aria-label` always visible (even collapsed), `title`
  attribute on every link
- **CSS transition** — `width 0.2s ease`; `prefers-reduced-motion` disables via root reset
- **`visually-hidden` class** — `position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0)`

### ToolbarTray (`maplab/MapLabPage.tsx`)

Independently collapsible toolbar group in Map Lab:
- **Structure** — label text + chevron toggle button + controls container
- **Collapse** — per-group via `useToolbarTrayCollapse(groupKey)`, persisted to `localStorage` under
  key `dnd-kids-maplab-tray-collapsed:{groupKey}`, default expanded
- **Controls hidden** via width/overflow when collapsed (never `display:none`, so group structure stays
  legible)
- **Toggle** — `ChevronUpIcon`/`ChevronDownIcon`, `aria-expanded` reflects state, `aria-label` includes
  group name and expand/collapse action
- **Reused by** — `MapLabPage` (Session group) and `MapLabEditorPage` (Create/Session/View/Status groups)

---

## Accessibility floor

- **Visible focus rings** — `:focus-visible` with `2px solid var(--md-primary)` + `2px offset`, applied
  globally
- **Never hue-alone** — icons and text always back color cues; no information conveyed solely by color
- **`prefers-reduced-motion`** — all animations/transitions set to `0.001ms` duration via root CSS reset
- **Touch targets** — ≥48px (`--control-height`) on all interactive controls. Documented exceptions: canvas SVG
  glyphs in Map Lab, following a marker-radius convention instead, and `Button`'s `compact` size
  (`--control-height-compact`, 32px), reserved for documented desktop-only inspector controls per the visual
  consistency plan's design-system-in-force contract.

<!-- GENERATED:DESIGN_SYSTEM:START -->
### Generated Design Inventory

CSS custom properties: `--backdrop-color`, `--control-height`, `--control-height-compact`, `--elevation-shadow`, `--md-arcane`, `--md-arcane-container`, `--md-boss`, `--md-boss-container`, `--md-cold`, `--md-cold-container`, `--md-divine`, `--md-divine-container`, `--md-door`, `--md-door-container`, `--md-error`, `--md-error-container`, `--md-fire`, `--md-fire-container`, `--md-lightning`, `--md-lightning-container`, `--md-loot`, `--md-loot-container`, `--md-nature`, `--md-nature-container`, `--md-npc`, `--md-npc-container`, `--md-on-arcane`, `--md-on-arcane-container`, `--md-on-boss`, `--md-on-boss-container`, `--md-on-cold`, `--md-on-cold-container`, `--md-on-divine`, `--md-on-divine-container`, `--md-on-door`, `--md-on-door-container`, `--md-on-error`, `--md-on-error-container`, `--md-on-fire`, `--md-on-fire-container`, `--md-on-lightning`, `--md-on-lightning-container`, `--md-on-loot`, `--md-on-loot-container`, `--md-on-nature`, `--md-on-nature-container`, `--md-on-npc`, `--md-on-npc-container`, `--md-on-passage-hidden`, `--md-on-passage-hidden-container`, `--md-on-passage-locked`, `--md-on-passage-locked-container`, `--md-on-poison`, `--md-on-poison-container`, `--md-on-primary`, `--md-on-primary-container`, `--md-on-psychic`, `--md-on-psychic-container`, `--md-on-secondary`, `--md-on-secondary-container`, `--md-on-skill`, `--md-on-skill-container`, `--md-on-surface`, `--md-on-surface-variant`, `--md-on-tertiary`, `--md-on-tertiary-container`, `--md-outline`, `--md-outline-variant`, `--md-passage-hidden`, `--md-passage-hidden-container`, `--md-passage-locked`, `--md-passage-locked-container`, `--md-poison`, `--md-poison-container`, `--md-primary`, `--md-primary-container`, `--md-psychic`, `--md-psychic-container`, `--md-secondary`, `--md-secondary-container`, `--md-skill`, `--md-skill-container`, `--md-surface`, `--md-surface-1`, `--md-surface-2`, `--md-surface-3`, `--md-surface-4`, `--md-surface-5`, `--md-surface-variant`, `--md-tertiary`, `--md-tertiary-container`, `--motion-fast`, `--motion-normal`, `--radius-full`, `--radius-lg`, `--radius-md`, `--radius-sm`, `--space-1`, `--space-2`, `--space-3`, `--space-4`, `--space-5`, `--space-6`, `--space-7`, `--type-body-line`, `--type-body-size`, `--type-body-sm-line`, `--type-body-sm-size`, `--type-body-sm-weight`, `--type-body-weight`, `--type-caption-line`, `--type-caption-size`, `--type-caption-tracking`, `--type-caption-weight`, `--type-face`, `--type-face-mono`, `--type-headline-line`, `--type-headline-size`, `--type-headline-weight`, `--type-label-line`, `--type-label-size`, `--type-label-weight`, `--type-title-line`, `--type-title-size`, `--type-title-weight`, `--variant-accent`, `--variant-container`, `--variant-on-accent`, `--variant-on-container`, `--z-dialog`, `--z-editor`, `--z-floating`.

Supported `data-variant` values: `arcane`, `boss`, `cold`, `divine`, `fire`, `lightning`, `loot`, `monster`, `nature`, `neutral`, `npc`, `poison`, `psychic`, `skill`, `spell`, `weapon`.
<!-- GENERATED:DESIGN_SYSTEM:END -->
