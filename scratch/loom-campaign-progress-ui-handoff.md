# Loom Campaign Progress UI/UX Handoff — design approved

Temporary discovery record for resuming the Loom UI/UX planning discussion after a context reset.

> **Status:** Grilling complete. The design direction is approved and has been written into the
> active Plan. Stage 1 is next to compile; no implementation work has started.

## Authoritative repository state

- Active Plan: `docs/plans/active/loom-campaign-progress-ui.md`
- Owning area guide: `docs/areas/loom.md`
- Binding interaction guidance: `docs/UX_PATTERNS.md`
- Binding visual guidance: `docs/DESIGN_SYSTEM.md`
- Reviewed screenshot: `C:\Users\skyro\AppData\Local\Temp\codex-clipboard-rI4CCu.png`
- Scope boundary: UI/UX presentation and interaction hierarchy only. Do not add campaign capabilities or change API/data-model behaviour.
- Documentation validation passed after creating the active Plan and routing the Loom area guide to it.

## User goal

Patch the Loom board so it works as an at-table campaign-progress workspace. Major failures include the apparent inability to advance the current session, the Beat Bank overflowing its rail, excessive empty board space, unclear current/next markers, and competing scroll regions. Existing capabilities must be surfaced and reorganized rather than replaced or expanded.

## Screenshot component map

1. Global icon navigation rail on the far left.
2. Central Loom board with pinned thread labels, session columns, node cards, and a current-position divider.
3. Timeline header showing session ordinal/name columns and a `Warp` region.
4. Thread lanes containing recorded-session cards and future beats.
5. Board navigation comprising inner scrollbars and small arrow controls near the inspector boundary.
6. Right inspector rail containing empty-selection prose, a node/state key, and the Beat Bank.
7. Beat Bank accordion containing banked beats plus restore controls.

## Screenshot review

- No visible primary play action. The command for progressing play has scrolled out of view.
- No single focal point. Timeline, cards, key, empty inspector, and Beat Bank compete at similar weight.
- Current and next state require decoding. The key's `N` and arrow do not map clearly to the board, while the strong divider is only indirectly explained.
- Lane height is excessive. Large blank vertical bands separate useful content while cards remain cramped.
- Scroll ownership is unclear. The route/page, board, and inspector can all scroll; several thumbs and small arrow controls appear together.
- Earlier sessions are clipped without a strong recovery affordance.
- Thread labels are truncated and visually detached from much of their rows.
- Card titles, tags, and fulfilment provenance are clipped or crowded; historical cards have weak contrast.
- The empty inspector consumes prime space with decorative prose and a legend.
- Beat Bank entries compress title, destination label, select, and action into insufficient width.
- Several compact controls appear below the play-mode 48px touch floor.
- Nested borders and panels add framing without clarifying task groups.

## Verified implementation facts

- `LoomPage.tsx` already provides the session flow. `Record Session` opens `LoomSessionLogDialog`; it is absent from the screenshot because the page header has scrolled away.
- The existing page-header command bar contains `Record Session`, `Add Beat`, and `Manage Threads`.
- `LoomCanvas.css` gives the grid `overflow: auto`, the inspector `overflow-y: auto`, and the route a viewport-derived minimum height, while the document itself can also scroll.
- The grid pins thread labels horizontally, but session headers are not yet pinned vertically.
- The future `Warp` region is a wrapping flex container. Planned nodes can wrap and increase an entire thread row's height.
- Beat Bank cards are already draggable and emit an existing restore drag payload.
- The Beat Bank also exposes a destination dropdown after clicking `Restore`; this is the overflow-heavy UI the user wants removed.
- The inspector currently substitutes `LoomLegend` when nothing is selected.
- A selected beat can expose `Edit`, `Fulfil Beat`, `Bank Beat`, `Replace Beat`, and `Delete` together at similar visual weight.

## Settled decisions

1. Prioritize advancing the campaign at the table.
2. Replace the scrolled-away page command bar with a compact sticky Loom toolbar.
3. Toolbar commands remain the existing capabilities: primary `Advance Campaign`, then secondary `Add Beat` and `Manage Threads`.
4. Rename the existing `Record Session` entry point to `Advance Campaign`; do not change the session-log workflow.
5. Remove the inspector key/legend entirely.
6. Make the Loom a viewport-contained workspace below the sticky toolbar.
7. The page itself should not vertically scroll during normal Loom use.
8. The board owns timeline/thread navigation. The inspector owns only its own vertical overflow.
9. Preserve access to the complete campaign timeline through horizontal board scrolling.
10. Open focused on the current campaign position rather than the beginning of history.
11. Provide an icon-only `Jump to current` control with a tooltip after the user pans away.
12. Pin session headers vertically and thread labels horizontally.
13. Each thread is one compact, stable-height row.
14. Planned beats continue horizontally after the current divider and never wrap.
15. Preserve all existing campaign actions and lifecycle behaviour.
16. Replace cryptic `N`/arrow markers with explicit in-card `Current` and `Next` labels.
17. Label the timeline divider `Current position`.
18. Board cards show title plus essential metadata only: `Session` or `Beat`, optional session tag, and `Current`/`Next`.
19. Use stable card heights and allow up to three wrapped title lines.
20. Move fulfilment provenance and secondary details to the inspector.
21. Allow pinned thread names to wrap to two lines in a stable responsive-width column.
22. The no-selection inspector copy is exactly: `Select a thread or node to inspect and edit it.`
23. Remove the decorative empty-inspector Loom prose.
24. Keep the board primary at constrained widths; present the inspector as a toggleable side drawer rather than stacking it below the timeline.
25. Preserve the 48px play-mode touch-target floor.
26. Beat Bank entries are cards, not restore forms.
27. Dragging a banked-beat card to a valid lane gap is the primary restore interaction.
28. Clicking, touching, or keyboard-activating a banked-beat card enters placement mode, highlights valid gaps, and allows direct placement.
29. Remove the Beat Bank destination dropdown.
30. The inspector shows one contextually primary selected-item action plus `Edit`.
31. Put less frequent actions such as `Bank`, `Replace`, `Undo fulfil`, and `Delete` in a labelled overflow menu; remove no action.
32. Preserve existing destructive confirmation behaviour.
33. Collapse the Beat Bank by default in desktop play mode while keeping its count visible in a 48px header.
34. Rename the future timeline region `Planned beats`; retire `Warp` as visible UI language.
35. At 768px and below, move the inspector and Beat Bank into a temporary overlay drawer that does not reduce the board's layout width and closes by its control or Escape.
36. Use the existing `FocusIcon` for `Jump to current`. Show it whenever the `Current position` divider is outside or clipped by the horizontal board viewport; hide it when the divider is fully visible.
37. Keep the Beat Bank in the inspector at every desktop width above 768px; it travels with the inspector into the constrained-width drawer.
38. Use a 56px timeline header, 112px thread rows, 160×96px board cards, 160px session columns, a `clamp(10rem, 18vw, 13rem)` pinned label column, and 48px placement-gap slots.
39. Use exact empty/error copy and command-matched action failures as recorded below.
40. Add general TARGET rules to `docs/UX_PATTERNS.md` for persistent play actions and explicit scroll ownership, then assess promotion to IN FORCE during reconciliation.
41. Do not add an End/Reach Ending action that pulls an End node into the active session. That would require new lifecycle/API behaviour and remains out of this UI-only Plan.

## Superseded proposals

- Do not call the main action `Record Session`, `Progress Campaign`, or `Continue Campaign`; use `Advance Campaign`.
- Do not place the primary campaign action in the inspector.
- Do not use a Beat Bank destination dropdown.
- Do not rely on drag as the sole restore path.
- Do not retain the inspector key.
- Do not wrap future beats vertically.
- Do not hide or truncate old sessions to achieve viewport containment.

## Agreed low-fidelity sketch

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ THE LOOM                         [＋ Advance Campaign]  [Add Beat]  [Manage Threads]  [◎]     │
│ sticky toolbar                                                                  jump current │
├──────────────────────────────────────────────────────────────────────┬───────────────────────┤
│                         horizontally scrollable board                 │ INSPECTOR             │
│ ┌───────────────┬──────────┬──────────┬──────────┆──────────────────┐ │                       │
│ │ THREAD        │ Session 6│ Session 7│ Session 8┃ PLANNED          │ │ No selection          │
│ │ pinned        │          │          │          ┃                  │ │ Select a thread or     │
│ ├───────────────┼──────────┼──────────┼──────────╂──────────────────┤ │ node to inspect and    │
│ │ ● Lost Puppy  │   card   │          │   card   ┃ beat → beat     │ │ edit it.              │
│ ├───────────────┼──────────┼──────────┼──────────╂──────────────────┤ │                       │
│ │ ● Goblin      │          │   card   │   card   ┃ beat → beat     │ │                       │
│ │   Trouble     │          │          │          ┃                  │ ├───────────────────────┤
│ ├───────────────┼──────────┼──────────┼──────────╂──────────────────┤ │ BEAT BANK (3)          │
│ │ ● Wizard      │   card   │   card   │          ┃ beat → beat →   │ │ [banked beat card]    │
│ ├───────────────┼──────────┼──────────┼──────────╂──────────────────┤ │ [banked beat card]    │
│ │ ● Thread 4    │          │   card   │          ┃ beat             │ │ [banked beat card]    │
│ └───────────────┴──────────┴──────────┴──────────┸──────────────────┘ │                       │
│  ◀ complete campaign history                         current ─────▶   │ inspector scrolls here │
└──────────────────────────────────────────────────────────────────────┴───────────────────────┘
```

## Repository UX guidance applied

- The persistent board follows play-mode rules: glanceability, few steps, large targets, and no loss of place.
- Existing authoring dialogs remain prep-mode surfaces.
- Board-context changes stay direct or in the adjacent inspector rather than behind a new modal.
- Load failure replaces the failed region; action failure stays beside the action and must not blank the board.
- Introduce no toast system.
- Existing semantic tokens, shared controls, icon barrel, focus behaviour, and accessibility floor remain binding.
- One focal point per surface: `Advance Campaign` for the workspace and the selected item for the inspector.
- Stable dimensions are required for rows, cards, headers, labels, and toolbar controls.

## Active Plan stages

1. Reframe the Loom as a viewport-contained workspace with the sticky toolbar, `Advance Campaign` hierarchy, current-position focus/navigation, pinned headers and labels, and unambiguous scroll ownership.
2. Make every thread a compact horizontal lane, simplify board cards, label current/next state directly, and turn the Beat Bank into a drag-first card tray with accessible board placement.
3. Simplify the inspector hierarchy, add its constrained-width drawer treatment, finish empty/error/keyboard/touch states, and reconcile the two recorded `UX_PATTERNS.md` TARGET rules against shipped behaviour.

## Final inspector action matrix

| Selected item | Primary action | Adjacent action | `More actions` order |
|---|---|---|---|
| Start node | none | none | no menu |
| End node | `Change Ending` | none | no menu |
| Placed Beat | `Fulfil Beat` | `Edit` | `Reorder planned beats…`; `Bank Beat`; `Replace Beat…`; separator; `Delete Beat…` |
| Banked Beat | `Place Beat` | `Edit` | `Delete Beat…` |
| Session | `Spawn Thread` | `Edit` | `Delete thread entry…` |
| Fulfilled Session | `Spawn Thread` | `Edit` | `Undo fulfilment`; separator; `Delete thread entry…` |
| Thread selection | none | `Edit Thread` | no new actions |

- Start nodes remain detail-only because they are lifecycle-managed.
- `Change Ending` is the End node's sole action; a separate Edit button would duplicate it.
- `Reorder planned beats…` preserves the intended thread-scoped keyboard fallback.
- `Delete thread entry…` avoids implying that the full campaign session column will be deleted.
- Destructive actions retain `Delete "<name>"? This cannot be undone.`

## Final geometry

| Element | Approved dimension |
|---|---|
| Timeline header | `3.5rem` / 56px high |
| Thread row | `7rem` / 112px high |
| Board card | `10rem` / 160px wide and `6rem` / 96px high |
| Session column | `10rem` / 160px wide |
| Pinned thread-label column | `clamp(10rem, 18vw, 13rem)` / 160–208px |
| Placement-gap slot | `3rem` / 48px wide |
| Card vertical padding | `--space-2` / 8px |

Cards allow three title lines at the existing 1.25rem body-small line height plus one fixed metadata
line. Thread names allow two lines. Planned beats never wrap into another vertical band.

## Final state and error copy

| State | Exact contract |
|---|---|
| No selection | `Select a thread or node to inspect and edit it.` |
| Empty workspace | `No story threads found` / `Create a thread to start tracking campaign progress.` / `Create Thread` |
| Load failure | `The Loom couldn’t load` / specific returned error or `Failed to load the tapestry.` / `Retry` |
| Empty Beat Bank | `No banked beats.` |
| Placement without Threads | `Create a thread before placing this beat.` / `Manage Threads` |

Action failure stays beside the failed control with `role="status"` and uses a plain-language summary
matching the visible verb: `Failed to place the beat.`, `Failed to fulfil the beat.`,
`Failed to delete the thread entry.`, and equivalents. Specific server detail may follow but does not
replace that summary.

## Responsive and navigation contract

- Desktop above 768px: fixed inspector rail with the Beat Bank inside it at every width; Beat Bank
  collapsed by default with count visible.
- At 768px and below: 48px `Inspector` control opens a temporary overlay drawer containing inspector
  and Beat Bank. The board retains its underlying width; Escape closes the drawer.
- The route/document does not vertically scroll during normal Loom use. The board owns timeline/thread
  navigation; the inspector owns its independent vertical overflow.
- `FocusIcon` is the icon-only `Jump to current` control. It appears only when the current-position
  divider is not fully visible and hides when the divider returns fully into view.

## Unresolved decisions

None. The ten-item grilling queue and all node-kind branches are resolved.

## Deferred follow-up outside this Plan

The user considered an `End`/`End Thread` action that would pull an End node into the active session,
then chose to preserve this Plan's presentation-only scope. The current lifecycle and API cannot perform
that operation. Revisit it only through a separate focused Plan that explicitly owns the required
campaign behaviour and contracts.

## Recommended resume sequence

1. Read `CLAUDE.md`, `docs/README.md`, the active Plan, the Loom area guide, and this handoff.
2. Treat the active Plan as the implementation contract and this handoff as its discovery/decision record.
3. Use `to-orders` to compile Stage 1 only. Do not implement code during planning.
4. After each stage ships, use `reconcile`; assess the two new `UX_PATTERNS.md` TARGET rules when Stage 3 closes.
