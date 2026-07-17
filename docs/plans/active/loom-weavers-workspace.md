# The Loom — Weaver's Workspace (UI/UX Pass)

> **Status:** LU0–LU2 shipped. LU3 (woven canvas & thread focus) next up.

- **Area guide:** [The Loom](../../areas/loom.md).

---

## What this outcome is

The Loom's backend and full DM loop already ship (LM0–LM8); this is a **presentation-only** pass that
gives the tapestry a distinctive, self-explanatory visual identity and a calmer information architecture.
It changes no API, schema, seed, or graph semantics — only the React canvas, its surrounding chrome, and the
tokens/CSS they consume.

**Design brief (subject-grounded).** The Loom *is* a weaver's loom, and the DAG canvas *is* the cloth on it.
Recorded past nodes (updates + reached anchors) read as **woven** — solid, filled cards. Planned anchors read
as **warped-but-unwoven** — translucent gold **beacons** waiting to be reached. Each **head** is where the
shuttle currently rests: the live weaving edge. The page's single job is to let a DM, between sessions, see at
a glance *where every thread currently is* and weave the next update onto it.

Three concrete UX problems this pass fixes:

1. **No orientation.** The route has no `PageHeader`/`h1` and no legend, so gold-vs-slate, "Now"/"Next", and
   thread colors are unexplained. (Every other route establishes an `h1` via `PageHeader`.)
2. **A jumpy, information-poor inspector.** Selection surfaces as a transient `.loom-inspector` strip *above*
   the canvas (`LoomPage.tsx:310–362`) that shifts the canvas down when it appears and shows only a title plus
   buttons — never the node's kind, status, threads, session tag, or body.
3. **Threads are invisible as a set.** Threads are the organizing concept, but nothing lists them, their
   colors, or their counts, and there's no way to focus one amid a busy tapestry.

The signature moment (the one deliberate risk) is that **the canvas reads as cloth on a loom**: a subtle warp
texture behind the graph, plus **"live warp" edges** — animated only on the edges from each head toward its
nearest future anchor (the threads *currently being woven*, already computed in `loomFlow`/`loomGraph`) — and a
strengthened shuttle glow on heads. Everything else stays quiet.

---

## Key facts / data facts (surveyed 2026-07-17)

### Current UI shape (what exists to change)

- **`LoomPage.tsx`** is the whole page: a flex row of `.loom-canvas-column` (error banner +
  `.loom-canvas-area` React Flow) and `LoomWeaverPanel` (persistent right rail). It still owns all
  selection/dialog state and every mutation handler; LU2 only re-homed what that state renders.
- **Toolbar** now lives in `PageHeader.actions` as a wrapped `loom-command-bar`: `New Update` is the one
  `variant="primary"` command and `New Anchor` / `Manage Threads` stay `secondary`, all with Loom icons.
- **Selection chrome** now lives in the Weaver's panel instead of a transient strip. The rail's top section
  renders the bridge-in-progress hint, selected-node details/actions, selected-edge delete action, or the
  legend when nothing is selected.
- **Node cards** (`nodes/AnchorNode.tsx`, `nodes/UpdateNode.tsx`, styled in `LoomCanvas.css:58–147`):
  anchor = gold container/border with `data-status` treatments (planned = glow, reached = filled, abandoned =
  dashed + dim); update = slate container. Both show a `Now` badge when `isHead`; anchors show a `Next` badge
  when `isNextAnchor`. `ThreadChips` renders 8×8px dots (`aria-hidden`), and each is the *only* thread cue on
  the card body today.
- **LU1 identity decisions (implemented 2026-07-17):** eyebrow copy = `TAPESTRY · CONTINUITY`; subtitle copy =
  "Track where every story thread stands between sessions."; command-bar icons = `PlusIcon` (New Update),
  `MapPinIcon` (New Anchor), `WaypointsIcon` (Manage Threads). `PageHeader` actions wrap normally once the
  viewport narrows, so LU4's responsive pass only needs to preserve that wrap behavior while keeping the canvas
  flex height owned by `.loom-route`/`.loom-page`.
- **LU2 rail contract (implemented 2026-07-17):** `LoomWeaverPanel` props are `selectedNode`, `selectedEdge`,
  `threads`, `vaultNodes`, `canBridgeFromSelected`, `bridgeSource`, `deletingEdge`, `onBridge`,
  `onMarkReached`, `onMarkAbandoned`, `onEdit`, `onDeleteNode`, `onDeleteEdge`, `onSelectVaultNode`,
  `onOpenThreadManager`, and `onCancelBridge`. Section order is **Selection/Legend → Threads → Idea Vault**.
  `LoomVaultPanel` survives as the embedded vault subsection; it was not folded into a monolith. LU3's
  thread-focus hooks live on
  `.loom-weaver-threads`, `.loom-weaver-thread-list`, `.loom-weaver-thread-row`, `.loom-weaver-thread-swatch`,
  and `.loom-weaver-vault`.
- **`LoomVaultPanel.tsx`** is a self-contained collapsible list of degree-0 nodes; clicking one calls
  `rfInstance.setCenter(node.x, node.y, …)` via `onSelectNode`.
- **Derived presentation data already available** (no new computation needed): `FlowNodeData` carries
  `isHead` and `isNextAnchor` per node (`loomFlow.ts:16–23`); `loomGraph.ts` exposes `headsByThread`,
  `nearestFutureAnchors`, `edgeThreads`, `vaultNodes`, `isPast`, `isFuture`. The "live warp" edge set is
  exactly `{ head → nearestFutureAnchor }` pairs, derivable from these without a server change.

### Shared pieces to consume (do not rebuild)

- **`PageHeader`** (`components/PageHeader.tsx`): props `title`, `subtitle?`, `chapterTabs?`, `activeTab?`,
  `onTabSelect?`, `actions?`. Renders `<header><h1>` + optional `<p class="page-header-subtitle">` + an
  `actions` slot. The Loom uses `title`, `subtitle`, and `actions` (the command bar buttons); **no**
  `chapterTabs`. There is no eyebrow slot — an eyebrow, if used, is a Loom-local element rendered above/beside,
  not a `PageHeader` feature.
- **`Button`** (`components/Button.tsx`): `variant` (`primary` default | `secondary` | `danger`), `size`
  (`normal` | `compact`), `loading`. Use `variant="primary"` for the one emphasized command (New Update) and
  `secondary` for the rest; keep `size="compact"` for the dense inspector actions.
- **`icons`** barrel (`components/icons/index.ts`): the Loom nav icon is `WaypointsIcon`
  (`navSections.ts:43`). Pull any node/action glyphs (e.g. plus, shuttle/anchor, thread) from this barrel — no
  direct `lucide-react` import, no emoji.
- **`StatePanel`**, **`ConfirmDialog`**, **`Dialog`**, **`LoomNodeEditor`**, **`LoomThreadManager`**,
  **`LoomBridgeDialog`**, **`LoomErrorBanner`** are unchanged by this pass (behavior identical; only the
  chrome that hosts them moves).
- **Design tokens**: all loom identity colors already exist as generated MD3 sets
  (`--md-loom-anchor`, `--md-loom-update`, `--md-loom-thread-1..6` and their `on-`/`-container` variants) plus
  the foundation scale (`--space-*`, `--radius-*`, `--motion-*`, `--z-*`, `--control-height*`). This pass adds
  **no new seeded colors** — the warp texture and node spine derive from existing tokens via `color-mix`/
  gradients.

### Hard constraints (from `CLAUDE.md` and `DESIGN_SYSTEM.md`)

- **No hand-picked hex, ever.** Reuse existing tokens or generate a set via
  `scripts/generate-md3-tokens.mjs`. Any *new* token added to `frontend/src/theme.css` requires a
  `docs/DESIGN_SYSTEM.md` edit in the same change set (checker-enforced). This pass aims to add at most a small
  number of Loom-scoped *non-color* CSS variables (e.g. a warp opacity, a node-spine width); route each through
  `DESIGN_SYSTEM.md`'s Loom section.
- **No new bundled font.** VF1 deliberately deferred bundling a display face (offline/license/legibility cost
  out of proportion). Distinctive Loom typography must come from **Roboto Flex's variable axes** (`wght`,
  `wdth`, `opsz` via `font-variation-settings`) on the already-bundled `--type-face`, plus the existing type
  scale — not a new file.
- **Accessibility floor holds:** never hue-alone (thread chips stay non-sole cues; keep text/icon labels for
  status), visible `:focus-visible`, `prefers-reduced-motion` neutralizes the warp animation and any reveal,
  48px touch targets for ordinary controls (`compact` remains the documented desktop-only inspector exception).
- **React Flow attribution** is restyled, never removed (license). Keep `proOptions={{ hideAttribution:
  false }}`.
- **jsdom canvas limits:** clicking/dragging a React Flow node throws under jsdom (documented in the completed
  plan and `TESTING.md`). Cover new logic in **pure modules** and **isolated component render** tests; the
  full canvas interaction (drag, connect, bridge picking, live-warp animation) is verified at the **live
  browser gate**, not in Vitest.

---

## Design system in force

`docs/DESIGN_SYSTEM.md` is canonical; this pass extends its **Loom section** only, and only with the
minimum below. Compact token/type/layout/signature system for this outcome:

- **Color** — existing tokens only. Woven past = `--md-loom-update(-container)`; beacon/future =
  `--md-loom-anchor(-container)`; thread accents = `--md-loom-thread-N`; "Now" = `--md-primary`; "Next" =
  `--md-secondary`; surfaces/outlines from the neutral scale. Warp texture and node spine are computed from
  `--md-outline-variant` / the thread accent via `color-mix`, not new seeds.
- **Type** — `--type-*` scale unchanged. The Loom adds one treatment: a **wide, tracked eyebrow** and a
  headline set via `font-variation-settings` on `--type-face` (Roboto Flex). Body/caption unchanged.
- **Layout** — canvas (flex-1) + persistent **Weaver's panel** rail (right). The rail replaces both the
  transient top inspector strip and the standalone vault panel with one stacked, sectioned surface:
  *Selection* (or a default *Legend*), *Threads*, *Idea Vault*.
- **Signature** — the woven-cloth canvas: warp-textured `Background`, animated **live-warp edges**
  (head → nearest future anchor only), strengthened head "shuttle" glow, and beacon treatment for planned
  anchors. This is the one bold element; the rail and command bar stay quiet and disciplined.

```
┌──────────────────────────────────────────────────────┬──────────────────┐
│ eyebrow: TAPESTRY · CONTINUITY                        │  Weaver's panel   │
│ h1  The Loom            [＋ New Update] New Anchor …   │  ┌────────────┐   │
├──────────────────────────────────────────────────────┤  │ Selection  │   │
│ ┌──────────────────────────────────────────────────┐ │  │  or Legend │   │
│ │        canvas — warp texture, live-warp edges     │ │  ├────────────┤   │
│ │        heads glow (shuttle), beacons for future    │ │  │ Threads    │   │
│ │                                                    │ │  ├────────────┤   │
│ └──────────────────────────────────────────────────┘ │  │ Idea Vault │   │
└──────────────────────────────────────────────────────┴──└────────────┘───┘
```

---

## Reusable pieces (do not rebuild)

`PageHeader`, `Button`, `Dialog`/`ConfirmDialog`, `StatePanel`, the `icons` barrel, and every existing Loom
dialog (`LoomNodeEditor`, `LoomThreadManager`, `LoomBridgeDialog`, `LoomErrorBanner`). All loom color token
sets, the foundation scale, `loomGraph.ts` derivations, and `loomFlow.ts`'s `isHead`/`isNextAnchor` per-node
flags. `LoomPage.tsx`'s existing selection/mutation state model, plus LU2's `LoomWeaverPanel`, `LoomLegend`,
and embedded `LoomVaultPanel` section.

## Known debt / deferred (NOT built here)

- Canvas **auto-layout** and **undo** (already deferred at the area level) — out of scope; this pass keeps
  manual positioning.
- **Node links to NPCs/dungeons/encounters** — deferred until after playtesting; the rail's Selection section
  is structured to accommodate them later but adds none now.
- A **server-side heads endpoint** — not needed; all derivation stays client-side.
- No new **seeded color** tokens or **bundled fonts**.

---

## Required model strength

| Stage | Strength | Why |
|-------|----------|-----|
| LU0 — Scaffolding | Light | Inert stubs, CSS placeholders, `it.skip` seams, survey. |
| LU1 — Identity & command bar | Standard | Bounded `PageHeader`/toolbar work over a known touch set. |
| LU2 — Weaver's panel | High | Structural re-home of the inspector + vault; touches selection rendering and existing tests. |
| LU3 — Woven canvas & threads focus | High | Cross-component (rail ↔ canvas) interaction, animation, node-card contract, token/DESIGN_SYSTEM change. |
| LU4 — Motion, first-run, a11y & live gate | Standard | Polish + responsive + the browser gate over an already-built surface. |
| LU5 — Documentation update | Standard | Reconcile + archive. |

---

## Phase LU — Weaver's Workspace

Delivers the full presentation pass in dependency order: identity first, then the persistent rail, then the
signature canvas + thread focus that depends on the rail existing, then the motion/a11y/first-run sweep and the
live gate. **Depends on / Depended on by:** LU3 must not start before LU2 is committed (thread-focus lives in
the rail); LU4's live gate covers the whole surface and runs last.

| Stage | Required strength | Summary | Deliverables |
|-------|-------------------|---------|--------------|
| **LU0 — Scaffolding** | Light | New component/CSS stubs, Loom eyebrow/rail classes, `it.skip` seams; app renders unchanged. | Stubs compile; canvas unchanged; later stages handed exact numbers. |
| **LU1 — Identity & command bar** | Standard | `PageHeader` (eyebrow + `h1` "The Loom" + subtitle), command bar with a primary New Update + iconography. | Header renders; toolbar restyled; tests updated. |
| **LU2 — Weaver's panel** | High | Replace the transient inspector strip and standalone vault with one persistent right rail: Selection/Legend + Idea Vault. | Rail renders selection details + actions + legend + vault; layout shift gone. |
| **LU3 — Woven canvas & thread focus** | High | Warp texture, beacon/woven node hierarchy with thread spine, animated live-warp edges, and a Threads section with click-to-focus dimming. | Signature canvas + thread focus; tokens + DESIGN_SYSTEM updated. |
| **LU4 — Motion, first-run, a11y & live gate** | Standard | Reduced-motion-safe reveal, first-run/empty polish, responsive rail, focus/contrast sweep, live DM-loop browser gate. | Whole surface verified live; a11y floor confirmed. |

**Sequencing:** LU0 → LU1 → LU2 → LU3 → LU4 → LU5 (Plan Closeout). LU1 and LU2 could overlap only at the
seam of the command bar vs. the rail; keep them sequential to avoid churn in `LoomPage.tsx`.

<!-- ===== VERBOSE BLOCKS — one per un-shipped stage ===== -->

### Shipped Stages

| Stage | What shipped |
|-------|-------------|
| **LU0** | Scaffolding: component/CSS stubs, `it.skip` seams in `LoomPage.test.tsx` and `LoomWeaverPanel.test.tsx`, `LoomWeaverPanelProps` interface finalized. App renders unchanged. Gate ✅. |
| **LU1** | Added the Loom route shell, eyebrow, `PageHeader`, and primary/secondary command-bar hierarchy using `PlusIcon`, `MapPinIcon`, and `WaypointsIcon`; un-skipped the header seam in `LoomPage.test.tsx`. Frontend `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`, and the docs check via `.venv\Scripts\python.exe scripts/check_docs.py --check` all passed. Gate ✅. |
| **LU2** | Replaced the transient inspector strip and standalone vault with a persistent `LoomWeaverPanel` rail that renders Selection/Legend, Threads, and embedded Idea Vault sections while preserving the existing selection/mutation handlers. Frontend `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`, and `.venv\Scripts\python.exe scripts/check_docs.py --check` passed. Gate ✅. |

#### LU3 — Woven canvas & thread focus (next up)

- **Read first:** this plan, `LoomCanvas.css` (full), `nodes/AnchorNode.tsx`, `nodes/UpdateNode.tsx`,
  `nodes/ThreadChips.tsx`, `loomFlow.ts`, `loomGraph.ts` (`headsByThread`, `nearestFutureAnchors`,
  `edgeThreads`), `LoomPage.tsx` (edge/node building at lines 81–117 and `LoomWeaverPanel` wiring),
  `docs/DESIGN_SYSTEM.md` (Loom section + accessibility floor), `scripts/generate-md3-tokens.mjs` (only if a
  new non-color variable is truly needed).
- **Build:** deliver the signature and the thread-focus interaction.
  - **Warp-textured canvas:** replace the plain `Background` dots with a subtle directional warp pattern built
    from existing neutral tokens (React Flow `Background` `variant`/`gap`, or a CSS layer under `.react-flow`);
    keep it low-contrast so nodes/edges stay dominant.
  - **Node hierarchy:** add a thread-colored **spine** (`.loom-node-spine`, thread accent from the node's
    primary thread) to each card so thread identity reads without relying on the 8×8 chips; strengthen the
    beacon (planned anchor) vs woven (update/reached) vs abandoned treatments already in `LoomCanvas.css`; make
    the head "shuttle" glow more prominent than the current `0 0 0 3px` ring. Keep every status legible without
    color (icon/shape + the existing badges).
  - **Live-warp edges:** compute the set `{ head → nearestFutureAnchor }` (heads from `headsByThread`, targets
    from `nearestFutureAnchors`; both already used by `loomFlow`) and mark those edges (e.g. `data-live-warp`
    / a class) so `LoomCanvas.css` gives them an animated dashed "being woven" treatment. Animation is
    **disabled under `prefers-reduced-motion`** (falls back to a static distinct style).
  - **Thread focus:** add a **Threads** section to `LoomWeaverPanel` (swatch + name + node count per thread,
    swatch never the sole cue) with click-to-focus. Focusing a thread sets Loom-local state that dims
    non-member nodes/edges on the canvas (a `data-dimmed` attribute + CSS opacity), with a clear "clear focus"
    affordance; focus is presentation-only (no persistence, no server call).
  - Route any genuinely new CSS variable (warp opacity, spine width, dim opacity) through `theme.css`'s Loom
    area and document it; **add no new seeded color**.
- **Inherits:** LU2's persistent rail (`LoomWeaverPanel` section order = Selection/Legend → Threads → Idea
  Vault, with stable hooks `.loom-weaver-threads`, `.loom-weaver-thread-list`, `.loom-weaver-thread-row`,
  `.loom-weaver-thread-swatch`, and `.loom-weaver-vault`); `loomGraph`/`loomFlow` derivations; existing node
  components and token sets.
- **Expected touch set:** `LoomCanvas.css`, `nodes/AnchorNode.tsx`, `nodes/UpdateNode.tsx` (spine element),
  `loomFlow.ts` or a small helper for the live-warp edge set (+ its unit test), `LoomPage.tsx` (edge data/
  attributes + thread-focus state + dim wiring), `LoomWeaverPanel.tsx` (Threads section), `frontend/src/
  theme.css` (only if a new non-color var is added), `docs/DESIGN_SYSTEM.md` (Loom section: node spine, warp
  background, live-warp edges, thread-focus dimming, eyebrow type treatment from LU1), and the affected loom
  tests (`__tests__/loomFlow.test.ts`, `__tests__/AnchorNode.test.tsx`, `__tests__/UpdateNode.test.tsx`,
  `__tests__/LoomWeaverPanel.test.tsx`). **Contract survey:** if the node DOM gains a spine element or the
  `data-live-warp` attribute, grep the node tests for the asserted DOM shape and list them here before coding.
- **Documentation impact:** `docs/DESIGN_SYSTEM.md` — Loom section gains the node-spine, warp-background,
  live-warp-edge, thread-focus, and Roboto-Flex eyebrow contracts; if `theme.css` changes, that edit is
  **required in the same change set** (checker-enforced). Regenerate the design inventory block if variables
  were added.
- **Tests:** unit — live-warp edge-set helper (heads→nearest-anchor pairs on the demo tapestry: `{3→4, 3→6}`);
  node render tests assert the spine reflects the primary thread and status classes are intact. `npm run test/
  lint/typecheck/build` green.
- **Gate:** **live browser pass required** here or deferred to LU4 — the warp animation, live-warp edges, head
  glow, and thread-focus dimming are canvas-visual and cannot be verified in jsdom. Prefer verifying them as
  part of LU4's single DM-loop gate to avoid two browser sessions; state which in the completion edit.
- **Discovery consolidation:** into `DESIGN_SYSTEM.md` (the durable visual contract) and this plan (final
  variable names/values, the live-warp helper's location and signature); revise LU4's a11y-sweep checklist with
  the exact motion/contrast items introduced here.
- **Completion edit:** collapse to a Shipped row; Status → "LU4 next up".

#### LU4 — Motion, first-run, a11y & live gate (planned)

- **Read first:** this plan (all prior handoffs), `docs/DESIGN_SYSTEM.md` accessibility floor + responsive
  breakpoint convention (520/768px), `LoomPage.tsx`, `LoomCanvas.css`, `LoomEditor.css`, the empty/first-run
  branch (`LoomPage.tsx:260–274`), `docs/TESTING.md` (jsdom boundary + browser-gate policy),
  `docs/areas/loom.md` (the outstanding live DM-loop gate).
- **Build:** the finishing sweep over the already-built surface.
  - **Motion:** a restrained page-load reveal for the rail/header (respecting `prefers-reduced-motion` via the
    global reset); confirm the warp/live-warp animations honor reduced motion.
  - **First-run/empty:** polish the empty-tapestry state (`StatePanel`) copy/visuals to match the new identity;
    ensure the legend is discoverable on first load (rail default).
  - **Responsive:** at ≤768px the Weaver's panel collapses/moves (e.g. below the canvas or into a toggle) so the
    canvas stays usable; command bar wraps gracefully; use the documented 520/768 breakpoints.
  - **A11y sweep:** visible focus on every new control, thread-focus reachable by keyboard, contrast of spine/
    warp/dim against surfaces, all status/kind cues backed by text or icon (never hue-alone), 48px targets on
    ordinary controls (compact only where already sanctioned).
- **Inherits:** the full LU1–LU3 surface.
- **Expected touch set:** `LoomPage.tsx`, `LoomCanvas.css`, `LoomEditor.css`, possibly `LoomWeaverPanel.tsx`
  (responsive toggle), the empty-state markup, and relevant `__tests__` (empty-state + responsive-structure
  assertions that are jsdom-safe).
- **Documentation impact:** `docs/DESIGN_SYSTEM.md` — note the Loom responsive behavior if it introduces a
  pattern worth sharing; otherwise `None:` with the specific reason (reuses the documented 520/768 convention).
  Update `docs/areas/loom.md` work queue to mark the live DM-loop gate satisfied.
- **Tests:** `npm run test/lint/typecheck/build` green; jsdom-safe assertions for the empty state and rail
  presence.
- **Gate:** **live browser pass required.** Run the full DM loop on the demo tapestry (`scripts/seed_database.py
  --loom`): create/edit an update and an anchor, drag nodes, connect an edge, run the Anchor-and-Bridge flow,
  mark an anchor reached/abandoned, focus a thread, and confirm the warp/live-warp/head visuals and reduced-
  motion behavior. This satisfies the area guide's outstanding live gate.
- **Discovery consolidation:** fold any live-gate findings into this plan and, if they change a durable
  contract, into `DESIGN_SYSTEM.md`/`docs/areas/loom.md` before closeout.
- **Completion edit:** collapse to a Shipped row; delete the Phase LU section per template; promote durable
  facts to top matter/`DESIGN_SYSTEM.md`; Status → "LU5 (closeout) next up".

### Plan Closeout — Documentation Update

Sole final stage; runs after Phase LU has shipped and been removed.

| Stage | Required strength | Summary | Deliverables |
|-------|-------------------|---------|--------------|
| **LU5 — Documentation update** | Standard | Reconcile accumulated context, finish canonical edits, archive the plan. | References, routing, validation, archival complete. |

#### LU5 — Documentation update (final stage of the plan)

- **Read first:** `CLAUDE.md`, `docs/README.md`, `docs/areas/loom.md`, this plan, `docs/PLAN_TEMPLATE.md`,
  `docs/DESIGN_SYSTEM.md`, `docs/TESTING.md`, `scripts/check_docs.py`.
- **Build:** reconcile this plan's Key facts / reusable pieces / debt with what shipped; complete any
  outstanding `DESIGN_SYSTEM.md` Loom-section edits and regenerate the design inventory if tokens changed;
  update the Loom area guide (source map + work queue: live gate satisfied, active plan → None) and the
  manifest routing; prepare the archive.
- **Inherits:** all prior-stage documentation-impact edits and discovery consolidations.
- **Expected touch set:** this plan, `docs/areas/loom.md`, `docs/README.md`, `docs/DESIGN_SYSTEM.md` (if
  outstanding), and `docs/complete/loom-weavers-workspace.md` (archive destination).
- **Documentation impact:** reconciles `docs/DESIGN_SYSTEM.md`, `docs/areas/loom.md`, and `docs/README.md`.
  `None` is invalid for this final stage.
- **Tests:** `.venv\Scripts\python.exe scripts/check_docs.py --check`; `.venv\Scripts\python.exe scripts/check_docs.py --check --base <base-ref>`
  when a valid base ref is available.
- **Gate:** a fresh reader routes `CLAUDE.md` → `docs/README.md` → `docs/areas/loom.md` without rediscovering
  essential facts; documentation checks pass.
- **Discovery consolidation:** promote remaining durable facts to `DESIGN_SYSTEM.md`/area guide before
  archival; no discovery remains only in a shipped-stage block or commit.
- **Completion edit:** mark the outcome complete, move this doc to `docs/complete/loom-weavers-workspace.md`,
  set the Loom area guide's active plan to None, update `docs/README.md` in the same change set.

<!-- ============================================================================================= -->

---

## Known debt / deferred work (NOT yet built)

- Canvas auto-layout and undo (area-level deferral).
- Node links to NPCs/dungeons/encounters (post-playtest).
- Server-side heads endpoint.
- No new seeded color tokens or bundled display fonts (variable-axis type only).

## Cross-references

[The Loom area guide](../../areas/loom.md), [completed tracker plan](../../complete/loom-tapestry-tracker.md),
`../../DESIGN_SYSTEM.md`, `../../TESTING.md`, and `../../README.md`.

## Next:

**LU3 — Woven canvas & thread focus** (unblocked): add the warp-textured canvas, thread spines, live-warp edges, and interactive thread focus on the LU2 rail hooks.
