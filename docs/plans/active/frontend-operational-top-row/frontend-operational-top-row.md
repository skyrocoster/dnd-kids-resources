# Frontend Operational Top Row — merge global and surface identity

> **Status:** Stages 1–2 shipped the shared operational row across standard pages and Map Lab; Stage 3 Loom and encounter adoption is next.

- **Areas:** design, dungeons, loom, encounters
- **Read trigger:** When implementing or reviewing FL-02's merged DM application and surface header

## What we're building & why

Implement [FL-02](../../../master-plans/frontend-layout-redesign.md#slice-ledger): the separate
brand-only application header and padded route header become one shallow operational top row throughout
the DM app. The row identifies the current surface first and retains only context, quiet status, mode,
and the route actions already present there; `/play` remains outside this shell.

Before, every route spends one row on the application brand and another on its own title and actions.
After, wide layouts put the home/brand action at the top of the existing navigation rail while the
surface row spans the workspace; constrained layouts put the navigation trigger at the start of that
same surface row. Existing tabs, tools, finders, editors, save behavior, and live-workflow controls do
not move in this slice.

## UX decisions — shared operational top row

Surface:      DM application shell and the route-owned identity row; Design owns the shared shell, with Dungeons, Loom, and Encounters owning their contributions
Mode:         both; each route retains the mode declared by its owning area guide
Operator:     DM
Focal:        the route's existing content, canvas, board, or live state; the shallow row identifies it without taking another content row
Route shape:  bespoke shared shell around existing Browser, Viewer, Editor, and board routes; route shapes themselves do not change
Edit style:   unchanged; this slice changes framing only
Save:         unchanged; existing quiet save status may occupy the row, while all persistence behavior stays in its current owner
Empty:        unchanged within each route's content region
Filtered empty: unchanged within each route's content region
No selection: unchanged within each route's content region
Load failure: unchanged within the region that failed; the row never replaces route content with a global error
Action failure: unchanged beside the affected control or in the established canvas status chip
Destructive:  unchanged; no destructive action moves or changes behavior
Keyboard:     DOM order begins with home on wide layouts or Open navigation when constrained, then the surface row's existing interactive contributions; Enter/Space and Escape retain current contracts
Touch:        every ordinary row control retains the 48px floor; no new exception is authorized

The visible route heading remains an `h1`. Field Guide and standard browsers retain their current
surface names. Map Lab presents `Map Lab` as the surface name with the dungeon title as operational
context; its View/Edit mode and save status remain row contributions. The Loom retains `The Loom` and
its existing primary action but drops non-operational eyebrow/subtitle chrome. Encounter play retains
the encounter title and existing route action; its round, next-turn, and roster controls remain in the
live board until their later slices. Existing Field Guide/browser chapter tabs remain in their current
in-flow row below the identity row rather than being reclassified or relocated.

## Stages

1. Establish the AppShell-owned operational row and adopt it for Field Guide and shared standard-browser headers, preserving desktop rail persistence, mobile navigation, chapter tabs, route actions, and one visible route `h1`.
2. Adapt Map Lab's viewer/editor shell to contribute surface identity, dungeon context, mode, and save status to the shared row without changing canvas, toolbar, navigation, or persistence behavior.
3. Adapt Loom and encounter play to the shared row, remove only redundant descriptive header chrome, and prove all required surfaces at wide and constrained widths before stopping for human UX acceptance.

## Shipped

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| 1 | AppShell now owns one operational identity row, with the home/brand action first in the wide navigation rail and the constrained navigation trigger leading the row. Shared PageHeader identity and actions render into that row while chapter tabs retain a separate, empty-collapsing row immediately below it. |
| 2 | Map Lab now contributes its `Map Lab` heading, dungeon context, quiet save status, View/Edit mode, and Back route to the shared operational row. Its fill workspace, route states, canvas chrome, and persistence behavior remain unchanged. |

## Touches

- `frontend/src/layout/**`
- `frontend/src/components/PageHeader.*`
- `frontend/src/components/BrowserLayout.*`
- `frontend/src/components/__tests__/PageHeader.test.tsx`
- `frontend/src/components/__tests__/BrowserLayout.vw0.test.tsx`
- `frontend/src/pages/HomePage.*`
- `frontend/src/pages/__tests__/HomePage.test.tsx`
- `frontend/src/features/dungeons/maplab/DungeonShell.*`
- `frontend/src/features/dungeons/maplab/__tests__/DungeonShell.test.tsx`
- `frontend/src/features/loom/LoomPage.*`
- `frontend/src/features/loom/__tests__/LoomPage.test.tsx`
- `frontend/src/features/encounters/EncounterRunnerPage.*`
- `frontend/src/features/encounters/__tests__/EncounterRunnerPage.test.tsx`
- `docs/UX_PATTERNS.md`
- `docs/DESIGN_SYSTEM.md`
- `docs/areas/design.md`
- `docs/areas/dungeons.md`
- `docs/areas/loom.md`
- `docs/areas/encounters.md`
- `docs/master-plans/frontend-layout-redesign.md`

## Compiler handoff

### Stage 3
- **Verified edit sites:** `frontend/src/features/loom/LoomPage.tsx` — redundant eyebrow plus `PageHeader` title/subtitle/actions; `frontend/src/features/encounters/EncounterRunnerPage.tsx` — route title and Back action above the board's separate live controls.
- **Verified tests:** `frontend/src/features/loom/__tests__/LoomPage.test.tsx` covers Loom title/action framing; `frontend/src/features/encounters/__tests__/EncounterRunnerPage.test.tsx` covers header actions and 520px reachability.
- **Settled contracts:** Loom removes only its non-operational eyebrow/subtitle and contributes `The Loom` plus its current primary action. Encounter contributes its current title and route action; round, sync, Next turn, and roster controls remain where they are.
- **Constraints:** Preserve Loom board/rail behavior, encounter direct controls and persistent play action reachability, all local error handling, and 48px targets. Stop at `Implemented; awaiting human acceptance`; do not begin FL-03, FL-04, FL-06, FL-09, FL-12, FL-13, or FL-14.
- **Open questions:** none.

## Human acceptance

At representative wide and constrained widths, open Field Guide, one standard browser, Map Lab view
and edit, Loom, and encounter play. Confirm there is one operational top row rather than separate brand
and page headers; navigation remains reachable; each route has one visible `h1`; existing tabs, mode,
status, Back/primary actions, and live controls remain usable by keyboard-plus-mouse and touch; and no
content is obscured. Stop with FL-02 awaiting explicit human acceptance.
