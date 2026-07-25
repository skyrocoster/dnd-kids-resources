# The Loom — Weaver's Workspace (UI/UX Pass)

> **Status:** LU0–LU5 complete.

- **Area guide:** [The Loom](../areas/loom.md).

---

## What the outcome is

The Loom's backend and full DM loop already shipped (LM0–LM8); this was a **presentation-only** pass that
gave the tapestry a distinctive, self-explanatory visual identity and a calmer information architecture.
It changed no API, schema, seed, or graph semantics — only the React canvas, its surrounding chrome, and the
tokens/CSS they consumed.

Three concrete UX problems this pass fixed:

1. **No orientation.** The route had no `PageHeader`/`h1` and no legend, so gold-vs-slate, "Now"/"Next", and
   thread colors were unexplained.
2. **A jumpy, information-poor inspector.** Selection surfaced as a transient `.loom-inspector` strip *above*
   the canvas that shifted the canvas down when it appeared and showed only a title plus buttons.
3. **Threads were invisible as a set.** Threads are the organizing concept, but nothing listed them, their
   colors, or their counts, and there was no way to focus one amid a busy tapestry.

The signature moment: the **canvas reads as cloth on a loom** — a subtle warp texture behind the graph plus
**"live warp" edges** animated only on the edges from each head toward its nearest future anchor, and a
strengthened shuttle glow on heads.

---

## Key facts / data facts (surveyed 2026-07-17)

### Current UI shape (what existed to change)

- **`LoomPage.tsx`** is the whole page: a flex row of `.loom-canvas-column` (error banner +
  `.loom-canvas-area` React Flow) and `LoomWeaverPanel` (persistent right rail). It owns all
  selection/dialog state and every mutation handler.
- **Toolbar** lives in `PageHeader.actions` as a wrapped `loom-command-bar`: `New Update` is the one
  `variant="primary"` command and `New Anchor` / `Manage Threads` stay `secondary`, all with Loom icons.
- **Selection chrome** lives in the Weaver's panel instead of a transient strip. The rail's top section
  renders the bridge-in-progress hint, selected-node details/actions, selected-edge delete action, or the
  legend when nothing is selected.
- **Node cards** (`nodes/AnchorNode.tsx`, `nodes/UpdateNode.tsx`, styled in `LoomCanvas.css:58–147`):
  anchor = gold container/border with `data-status` treatments (planned = glow, reached = filled, abandoned =
  dashed + dim); update = slate container. Both show a `Now` badge when `isHead`; anchors show a `Next` badge
  when `isNextAnchor`. `ThreadChips` renders 8×8px dots (`aria-hidden`).
- **Eyebrow copy** = `TAPESTRY · CONTINUITY`; subtitle copy = "Track where every story thread stands between sessions."
- **LoomWeaverPanel** props: `selectedNode`, `selectedEdge`, `threads`, `vaultNodes`, `canBridgeFromSelected`,
  `bridgeSource`, `deletingEdge`, `onBridge`, `onMarkReached`, `onMarkAbandoned`, `onEdit`, `onDeleteNode`,
  `onDeleteEdge`, `onSelectVaultNode`, `onOpenThreadManager`, `onCancelBridge`. Section order:
  **Selection/Legend → Threads → Idea Vault**.
- **Derived presentation data** — `FlowNodeData` carries `isHead` and `isNextAnchor` per node; `loomGraph.ts`
  exposes `headsByThread`, `nearestFutureAnchors`, `edgeThreads`, `vaultNodes`, `isPast`, `isFuture`.
  The "live warp" edge set is exactly `{ head → nearestFutureAnchor }` pairs, derivable from these without a
  server change.

### Shared pieces consumed (not rebuilt)

- **`PageHeader`** (`components/PageHeader.tsx`): props `title`, `subtitle?`, `chapterTabs?`, `activeTab?`,
  `onTabSelect?`, `actions?`. The Loom uses `title`, `subtitle`, and `actions`; no `chapterTabs`.
- **`Button`** (`components/Button.tsx`): `variant`, `size`, `loading`. Primary used for New Update.
- **`icons`** barrel (`components/icons/index.ts`): Loom uses `WaypointsIcon`, `PlusIcon`, `MapPinIcon`.
- **`StatePanel`**, **`ConfirmDialog`**, **`Dialog`**, **`LoomNodeEditor`**, **`LoomThreadManager`**,
  **`LoomBridgeDialog`**, **`LoomErrorBanner`** unchanged by this pass.
- **Design tokens**: all loom identity colors already exist as MD3 sets
  (`--md-loom-anchor`, `--md-loom-update`, `--md-loom-thread-1..6`).

### Hard constraints

- **No hand-picked hex.** Reuse existing tokens or generate via `scripts/generate-md3-tokens.mjs`.
- **No new bundled font.** Roboto Flex variable axes only.
- **Accessibility floor holds:** never hue-alone, visible `:focus-visible`, `prefers-reduced-motion` neutralizes
  warp animation, 48px touch targets for ordinary controls.
- **React Flow attribution** restyled, never removed.
- **jsdom canvas limits:** clicking/dragging a React Flow node throws under jsdom. Cover new logic in
  pure modules and isolated component render tests; full canvas interaction verified at the live browser gate.

### Design system contributed

- **Woven past** = `--md-loom-update(-container)`; beacon/future = `--md-loom-anchor(-container)`;
  thread accents = `--md-loom-thread-N`; "Now" = `--md-primary`; "Next" = `--md-secondary`.
- **Warp texture** computed from `--md-outline-variant` via `color-mix`.
- **Responsive** uses documented 520/768 breakpoints; Weaver's panel collapses at ≤768px.
- **`buildLiveWarpEdgeIds(tapestry)`** exported from `loomFlow.ts`.
- **Thread focus** via `focusedThreadId` state in `LoomPage.tsx` with dimming classes and 48px `aria-pressed`
  thread-row buttons in `LoomWeaverPanel`.

---

## Shipped stages

| Stage | What shipped |
|-------|-------------|
| **LU0** | Scaffolding: component/CSS stubs, `it.skip` seams in `LoomPage.test.tsx` and `LoomWeaverPanel.test.tsx`, `LoomWeaverPanelProps` interface finalized. App renders unchanged. Gate ✅. |
| **LU1** | Added the Loom route shell, eyebrow, `PageHeader`, and primary/secondary command-bar hierarchy using `PlusIcon`, `MapPinIcon`, and `WaypointsIcon`; un-skipped the header seam in `LoomPage.test.tsx`. Gate ✅. |
| **LU2** | Replaced the transient inspector strip and standalone vault with a persistent `LoomWeaverPanel` rail that renders Selection/Legend, Threads, and embedded Idea Vault sections while preserving the existing selection/mutation handlers. Gate ✅. |
| **LU3** | Added the woven-canvas pass: warp-textured canvas layers, node thread spines, stronger head/beacon hierarchy, live-warp edge styling from `buildLiveWarpEdgeIds(tapestry)`, and presentation-only thread focus with node counts and dimming. Gate ✅ (live browser deferred to LU4). |
| **LU4** | Motion (page-load reveal, reduced-motion-safe), first-run/empty polish (legend on first load, `StatePanel` copy), responsive (Weaver's panel collapses at ≤768px, command bar wraps), a11y sweep (visible focus, thread-focus keyboard reachable, contrast, never hue-alone). Live DM-loop browser gate completed: created/edited an update and an anchor, dragged nodes, connected an edge, ran Anchor-and-Bridge, marked reached/abandoned, focused a thread, confirmed warp/live-warp/head visuals and reduced-motion behavior. |
| **LU5** | Documentation update: reconciled plan context with shipped code, updated area guide and manifest, archived plan. Docs check clean. |

---

## Verification

Seed the demo tapestry (`python scripts/seed_database.py --loom --force`), open `/loom`, and confirm the
canvas reads as cloth on a loom: warp texture visible behind nodes, planned anchors render as translucent gold
beacons, heads glow with "Now" badges and nearest future anchors show "Next." Run the full DM loop: create/edit
an update and an anchor, drag nodes, connect an edge, run Anchor-and-Bridge, mark reached/abandoned, focus a
thread, confirm live-warp animation and that `prefers-reduced-motion` falls back to static dashed. Backend:
`pytest` (≥90% coverage). Frontend: `npm run test && npm run lint && npm run typecheck && npm run build`.
Docs: `python scripts/check_docs.py --check`.

---

## Known debt / deferred (NOT built here)

- Canvas **auto-layout** and **undo** (already deferred at the area level).
- **Node links to NPCs/dungeons/encounters** — deferred until after playtesting.
- A **server-side heads endpoint** — not needed; all derivation stays client-side.
- No new **seeded color** tokens or **bundled fonts**.

## Cross-references

[The Loom area guide](../areas/loom.md), [completed tracker plan](loom-tapestry-tracker.md),
[../DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md), [../TESTING.md](../TESTING.md), [../README.md](../README.md).
