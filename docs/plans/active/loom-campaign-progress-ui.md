# Loom Campaign Progress UI — keep campaign advancement visible and the tapestry readable

> **Status:** Stages 1-2 shipped (sticky toolbar, scroll containment, pinned headers, current-position
> focus, stable board geometry, trimmed card content, Beat Bank cards, and click/touch/keyboard
> placement mode). Stage 3 (inspector action matrix, constrained-width drawer, and remaining
> interaction/copy coverage) is not yet compiled into work orders.

- **Area guide:** [The Loom](../../areas/loom.md)

## What we're building & why

Reshape the existing Loom board into a viewport-contained campaign workspace. The patch changes
presentation and interaction hierarchy only: every campaign action, data contract, and lifecycle
remains as it is today. The existing session-log flow becomes the persistent `Advance Campaign`
action so the DM can always move play forward without scrolling back to a page header.

The board will favour at-table scanning: compact one-thread-per-row lanes, complete history available
by horizontal navigation, planned beats continuing without wrapping, and a contextual inspector that
no longer spends space on decorative copy or a decoding key. The Beat Bank remains the existing
bank/restore system, presented as a compact placement tray rather than a cramped destination form.

This Plan intentionally retains the full approved UX contract. Its extra detail prevents later work
orders from having to rediscover or reinterpret the decisions already made.

## Scope boundaries

- Preserve all existing Loom actions and lifecycle behaviour; add no API route, schema field, database
  behaviour, or campaign capability.
- Rename and reposition existing actions only where this Plan says to do so.
- Keep the existing session-log, node-editor, thread-manager, confirmation, and persistence workflows.
- Do not add an `End Thread`/`Reach Ending` action that pulls an End node into the active session. The
  current model cannot do that; it is deferred follow-up work requiring its own focused Plan.
- Do not hide or truncate old sessions, wrap planned beats, add a Beat Bank destination dropdown, or
  make drag the only placement path.

## UX decisions — Loom board and inspector

Surface:      Loom board and inspector rail, owned by the Loom area guide
Mode:         both; the persistent board and campaign progression follow play rules, while existing authoring dialogs follow prep rules
Operator:     DM
Focal:        `Advance Campaign` in a compact sticky workspace toolbar; the current campaign position is the board's visual anchor
Route shape:  bespoke board because the tapestry is a timeline workspace, not a record browser
Edit style:   existing node/thread editors remain unchanged; board placement is direct and selection properties/actions stay in the inspector
Save:         unchanged by this visual patch; existing create/edit flows retain their current persistence behaviour
Empty:        StatePanel empty fills the workspace with title `No story threads found`, message `Create a thread to start tracking campaign progress.`, and action `Create Thread`
Filtered empty: not applicable because this board has no filtering
No selection: the inspector shows `Select a thread or node to inspect and edit it.`
Load failure: StatePanel error fills the workspace below the sticky toolbar with title `The Loom couldn’t load`, the specific returned error or fallback `Failed to load the tapestry.`, and action `Retry`
Action failure: inline beside the toolbar, inspector action, dialog action, Beat Bank, or board placement control that failed, with `role="status"`; never replace the board
Destructive:  existing ConfirmDialog with `Delete "<name>"? This cannot be undone.`
Keyboard:     toolbar first, then board navigation, pinned thread controls, cards, placement gaps, inspector, and Beat Bank; Enter/Space activates controls; Escape exits placement mode or closes the responsive inspector
Touch:        48px minimum targets with no new play-mode exceptions; the inspector becomes a toggleable drawer at 768px and below, and banked-beat activation provides a non-drag placement path

## Approved workspace composition

```text
sticky:  The Loom | Advance Campaign | Add Beat | Manage Threads | Jump to current | Inspector (constrained only)
board:   pinned two-line thread names | complete session history | Current position | Planned beats
lanes:   one compact row per thread; planned cards continue horizontally and never wrap
rail:    compact no-selection/selection inspector | collapsed-by-default Beat Bank (count always visible)
```

### Toolbar and campaign position

- Replace the scrolled-away page command bar with a compact sticky Loom toolbar.
- Rename the existing `Record Session` entry point to `Advance Campaign`; it opens the unchanged
  session-log workflow and is the toolbar's sole primary action.
- Keep `Add Beat` and `Manage Threads` as secondary actions.
- Open the board focused on the current campaign position while preserving horizontal access to the
  complete timeline.
- Label the timeline divider `Current position` and the future region `Planned beats`; retire `Warp`
  as visible UI language.
- Use the existing `FocusIcon` in a 48px icon-only control with accessible label and tooltip
  `Jump to current`. Hide it while the `Current position` divider is fully visible; show it whenever
  the divider is outside or clipped by the board's horizontal viewport. Activating it restores the
  divider to full view, at which point the control hides again.

### Scroll and responsive ownership

- Contain the Loom workspace in the viewport below its sticky toolbar. The route/document does not
  vertically scroll during normal Loom use.
- The board owns timeline navigation and any vertical overflow required for its thread rows. The
  desktop inspector owns only its own vertical overflow. Do not create competing page, board, lane,
  or Beat Bank scroll regions.
- Pin session headers vertically and thread labels horizontally within the board.
- Above 768px, keep the inspector as the desktop rail and keep the Beat Bank inside it at every
  desktop width.
- At the existing 768px tablet breakpoint and below, replace the fixed rail with a temporary overlay
  drawer opened by a 48px `Inspector` control. The drawer overlays part of the board rather than
  reducing its layout width, closes through its control or Escape, and includes the Beat Bank.

### Stable board geometry

| Element | Approved dimension |
|---|---|
| Timeline header | `3.5rem` / 56px high |
| Thread row | `7rem` / 112px high |
| Board card | `10rem` / 160px wide and `6rem` / 96px high |
| Session column | `10rem` / 160px wide |
| Pinned thread-label column | `clamp(10rem, 18vw, 13rem)` / 160–208px |
| Placement-gap slot | `3rem` / 48px wide |
| Card vertical padding | `--space-2` / 8px |

- Allow pinned thread names to wrap to two lines inside their stable responsive-width column.
- Give card titles at most three lines at the existing body-small 1.25rem line height, followed by
  one fixed metadata line. Stable dimensions win over showing secondary detail on the board.
- Show only `Session` or `Beat`, an optional session tag, and explicit `Current`/`Next` state on board
  cards. Move fulfilment provenance and other secondary detail into the inspector.
- Replace cryptic `N` and arrow markers with the literal in-card labels `Current` and `Next`.
- Every thread remains one stable-height row. Planned beats continue horizontally after the current
  divider and never wrap or make a row taller.

## Approved inspector action hierarchy

The inspector shows at most one contextual primary action plus `Edit`. Less-frequent actions live in
a labelled `More actions` menu. Start and End remain lifecycle-managed, and every destructive action
retains the existing confirmation.

| Selected item | Primary action | Adjacent action | `More actions` order |
|---|---|---|---|
| Start node | none | none | no menu |
| End node | `Change Ending` | none; a separate Edit would duplicate this flow | no menu |
| Placed Beat | `Fulfil Beat` | `Edit` | `Reorder planned beats…`; `Bank Beat`; `Replace Beat…`; separator; `Delete Beat…` |
| Banked Beat | `Place Beat` | `Edit` | `Delete Beat…` |
| Session | `Spawn Thread` | `Edit` | `Delete thread entry…` |
| Fulfilled Session | `Spawn Thread` | `Edit` | `Undo fulfilment`; separator; `Delete thread entry…` |
| Thread selection | none | `Edit Thread` | no new actions |

- `Reorder planned beats…` opens the existing thread-scoped accessible reorder fallback so keyboard
  users retain parity with drag reordering.
- `Delete thread entry…` deliberately avoids implying that the whole campaign session column will
  be deleted.
- `Undo fulfilment` restores the Beat in place and remains separate from destructive deletion.
- Remove the inspector key/legend and all decorative empty-inspector Loom prose.

## Beat Bank and placement mode

- Keep the Beat Bank in the inspector/drawer and collapse it by default in desktop play mode. Its
  48px header always shows `Beat Bank (<count>)`.
- Expanded banked-beat entries are cards, not restore forms. Remove the destination dropdown.
- Dragging a banked-beat card to a valid lane gap is the primary placement interaction.
- Clicking, touching, or keyboard-activating a banked-beat card—or using its inspector `Place Beat`
  action—enters the same placement mode. Highlight valid 48px gaps and allow direct placement.
- Escape cancels placement mode without moving the Beat.
- When expanded with no entries, show `No banked beats.` with no action.
- If no Threads exist, do not enter an unusable placement mode. Show
  `Create a thread before placing this beat.` beside the Beat Bank with a `Manage Threads` action.

## Copy and failure contract

| State | Exact contract |
|---|---|
| No selection | `Select a thread or node to inspect and edit it.` |
| Empty workspace | `No story threads found` / `Create a thread to start tracking campaign progress.` / `Create Thread` |
| Load failure | `The Loom couldn’t load` / returned detail or `Failed to load the tapestry.` / `Retry` |
| Empty Beat Bank | `No banked beats.` |
| Placement without Threads | `Create a thread before placing this beat.` / `Manage Threads` |

- Action-failure fallback copy mirrors the visible command using `Failed to <action>.`, such as
  `Failed to place the beat.`, `Failed to fulfil the beat.`, and
  `Failed to delete the thread entry.`
- Specific server detail may follow the plain-language summary but does not replace it.
- Do not introduce toasts. Load failure replaces only the failed workspace region; action failure
  stays local and never blanks the board.

## Documentation impact

- `docs/UX_PATTERNS.md` records two general TARGET rules agreed during planning: persistent play
  actions and explicit single-owner scrolling for viewport-contained workspaces.
- During reconciliation, assess those TARGET rules against the shipped implementation and promote
  them to IN FORCE only when the repository contract is actually true.
- No API, data-model, architecture, design-token, setup, or area-surface contract changes are planned.

## Stages

1. **Make campaign progression persistent and establish workspace ownership.** Replace the page header
   command bar with the sticky Loom toolbar, rename `Record Session` to `Advance Campaign`, contain the
   workspace below it, establish the board/inspector scroll contract, focus initial horizontal position
   on `Current position`, add the conditional `FocusIcon` jump control, pin headers and thread labels,
   and rename the future region `Planned beats`.
2. **Make the tapestry compact and placement legible.** Enforce the approved stable geometry, keep one
   row per Thread, prevent planned-beat wrapping, reduce cards to their agreed metadata, replace encoded
   markers with `Current`/`Next`, and rebuild the Beat Bank as a collapsed-by-default card tray with
   drag placement plus click/touch/keyboard placement mode and its exact empty/failure states.
3. **Finish contextual actions, constrained-width behaviour, and interaction coverage.** Apply the
   inspector action/overflow matrix, remove the legend and decorative prose, implement the 768px overlay
   drawer without shrinking the board, complete focus/Escape/touch/error behaviour, verify every 48px
   target and exact copy string, and reconcile the new `UX_PATTERNS.md` TARGET rules after the shipped
   behaviour is proven.

## Verification expectations for compiled work orders

- Focused frontend component tests cover toolbar wiring, initial current-position focus, jump-control
  visibility, pinned/stable layout contracts, explicit card labels, inspector action matrices, Beat Bank
  default state, placement-mode keyboard behaviour, drawer Escape behaviour, and exact state/error copy.
- Drag calculations and placement eligibility stay in focused unit helpers; jsdom is not treated as a
  visual-layout oracle.
- Each implementation order runs the checks named in its stop condition. Before reconciliation, run the
  complete frontend test, lint, typecheck, and build gates plus the documentation checker.
- Browser automation remains manual verification unless the user explicitly requests it in that turn.

## Shipped

| Stage | What shipped |
|-------|--------------|
| 1 | Sticky Loom toolbar renames `Record Session` to `Advance Campaign`; `.loom-route` is viewport-contained with `.loom-grid` as the single board scroll owner; session headers pin vertically and the divider/future-region labels read `Current position`/`Planned beats`; the board opens focused on the current position with a conditional 48px `Jump to current` control. |
| 2 | Board rows, cards, session columns, and gap slots hold the Plan's fixed geometry (112px rows, 160x96px cards, 160px session columns, 48px gap slots) instead of growing with content; board cards show only the spelled-out `Beat`/`Session` kind, an optional session tag, and explicit `Current`/`Next` labels, with planned beats laid out in one non-wrapping row; the Beat Bank tray defaults collapsed and its entries are plain draggable cards with the destination dropdown removed; activating a banked-beat card by click, tap, or Enter/Space now enters a placement mode that highlights every valid gap for direct restore (Escape cancels), and a `Create a thread before placing this beat.` guard with a `Manage Threads` action covers the no-Threads case. |
