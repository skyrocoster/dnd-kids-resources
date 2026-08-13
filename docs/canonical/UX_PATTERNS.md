---
title: UX Patterns
purpose: Surface behavior, interaction states, saving, feedback, and keyboard conventions.
read-when: Surface modes, route shape, data/error states, saving, destructive actions, or keyboard
---

# UX Patterns — D&D Kids Resources

Canonical reference for how the app **behaves**: surface modes, route shape, data and error states,
saving, destructive actions, feedback, and keyboard. Its sibling [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)
owns how the app **looks** — tokens, type, icons, spacing, component anatomy, accessibility floor.
When a question is "what colour, how big, which icon", that document answers it. When it is "what
happens when the user does this", this one does.

Every rule below carries a status:

- **IN FORCE** — binding now. Work orders must follow it; deviations are defects.
- **TARGET** — the agreed destination. Not yet true of the app. Existing code that predates it is
  accepted debt, not a pattern to copy. New surfaces should follow it where they can do so without
  building infrastructure that does not exist.

---

## Surface modes

The app is used in two very different situations, and the same feature can sit in either depending on
which of its surfaces you are looking at. Mode is a property of a **surface**, not of a feature.

**Prep** — authoring between games. You have time and both hands. Density, throughput, keyboard
efficiency, and precise control win. A modal that demands full attention is fine.

**Play** — running a game at the table. You are talking, three children are waiting, and you will be
interrupted mid-action. Glanceability, few steps, large targets, and never losing work win. Anything
that blanks the screen, discards state, or demands a multi-step flow is a defect here even if it
would be unremarkable in prep.

The dungeon viewer is play; the dungeon editor is prep. The Loom is both, at different moments.

**Each area guide declares the modes of the surfaces it owns**, in a `## Surfaces` table naming the
surface, its mode, and its operator. That table is the authority for which rules below apply. This
document defines what the modes mean; it does not maintain a register of routes.

Status: IN FORCE.

### Operators

Most surfaces are operated by the **DM**. A second operator now exists — **kid**, on the read-only
`/play` surfaces — and has its own rules in *Kid* below rather than exceptions retrofitted into the
prep/play rules. Nothing in this document should be written in a way that assumes the operator is
always the DM.

Status: IN FORCE.

#### Kid

The kid operator runs the read-only `/play` app (Player App area). Its surfaces serve players aged
four and six: the app is their memory, not their rulebook.

- **Read-only.** No kid surface mutates shared truth. Every mutation happens on the DM's device.
- **No exit.** No link, button, gesture, or error state leads out of `/play`. Reaching the DM app
  means typing a URL. This is temptation design, not security.
- **Two taps to an answer.** A kid picks the device up with a question and puts it down once it is
  answered. More than two taps from the shell is a failed surface.
- **Never text-alone.** Any control or state a kid must act on carries an icon or picture as well as
  words, for the same reason `Never hue-alone` exists.
- **Liveness is automatic.** Kid surfaces poll. No manual refresh gesture — pull-to-refresh is
  explicitly rejected.
- **Concealment via the curtain only.** Kid components consume the player-view transform's output and
  never raw dungeon data.
- **64px touch floor.** Kid surfaces raise the touch target floor to 64px, above the app's 48px
  `--control-height`. A raised floor, not a DESIGN_SYSTEM exception.
- **Player-owned states.** Kid surfaces do not import shared DM-app state components when that would
  violate the `player/` boundary; they may render player-local loading, empty, and error states with
  the exact copy named by their plan.

Status: IN FORCE. First applied by the `/play` shell (Player App Skeleton, Stage 1) and the `/play/map`
surface (Stage 5).

### Persistent play actions

An action required to advance the live workflow stays visible in persistent surface chrome. It does
not live only in a page header or command region that can scroll out of view while the DM is using the
play surface. Secondary authoring controls may yield space, but the action that moves play forward
remains directly reachable without first recovering a lost scroll position.

The Loom's `Advance Campaign` toolbar action is the first shipped application of this rule.

Status: IN FORCE.

### Compact play navigation

The routed encounter runner uses the compact wide-screen AppShell navigation presentation so the live
surface remains focal. This presentation is temporary: it does not write, clear, or reinterpret the
DM's persisted preparation navigation preference. The complete navigation set remains reachable, and
constrained layouts continue to use the labelled navigation trigger and drawer.

Status: IN FORCE.

---

## Route shape

The frontend uses three route shapes:

- **Browser** — a list beside a detail region, plus create and delete. Built on `BrowserLayout`
  (`PageHeader` + `SplitPane`), with `SearchList` on the left.
- **Viewer** — reads one record. May be the right pane of a Browser or its own route.
- **Editor** — writes one record. Usually a modal `Dialog` over the Browser that launched it.

A new catalog-shaped feature adopts this triad rather than inventing a layout. A feature that is not
record-shaped — the Loom board, the Map Lab canvas, the encounter runner — is not forced into it.

Status: IN FORCE.

### Viewport-contained workspace scrolling

A viewport-contained workspace assigns scroll ownership explicitly. The document, the main board,
and nested board regions do not compete to scroll the same axis. The primary workspace owns the
navigation needed to traverse its content; an adjacent inspector may own independent vertical
overflow when its content length is unrelated to the board.

Responsive drawers overlay the constrained workspace rather than silently introducing another page
scroll or reducing the board below its usable width. A surface that needs multiple scroll owners names
each region and axis in its Plan before implementation.

The Loom board/inspector redesign is the first shipped application of this rule: `.loom-grid` is the
board's sole scroll owner, the desktop inspector owns only its own vertical overflow, and at 768px and
below the inspector becomes an overlay drawer rather than a second page scroll region or a
board-shrinking column.

The Map Lab editor also applies this rule: its room navigation is a closed-by-default command-band
finder that overlays the canvas when open, while floor chips stay visible, and the selected-item
inspector becomes a peek-to-full bottom sheet. On desktop the finder is a bounded panel anchored to
its trigger and no inspector width is reserved when nothing is selected. The Map Lab session viewer
uses the same bounded finder and selection-only details contract, presenting both as contained sheets
at tablet widths while floor chips remain outside the finder.

In the editor, floor creation belongs to the labelled command-band floor controls rather than room
navigation. Selected-room deletion belongs to the selected-room inspector rather than finder rows. The
finder remains available for room navigation, and floor selection and adjacent-floor disabled behavior
remain part of the existing floor model.

The editor's connection-resolution actions belong to a separately labelled, counted command-band
utility, not the room-navigation finder. Its body opens in a bounded internally scrolling panel and is
mutually exclusive with Finder, View, and Map. The utility remains keyboard- and touch-reachable and
preserves the existing unresolved, broken, missing-return, empty, and local load-error states.

Status: IN FORCE.

### Map Lab navigation context

The Map Lab editor and viewer preserve their current floor, pan, zoom, selected target, and focus
context in browser session state keyed to the dungeon. This navigation context is local to the browser
session and never becomes authored layout or encounter session data. Selecting an off-screen target may
center it; selecting a visible target preserves the current framing. Stair and resolved portal travel
changes floor or dungeon and centers the destination, while an unresolved portal remains in place and
reports a local error. The editor's primary stair/portal click remains select-only; the viewer's remains
the travel action.

Select-mode empty space clears the active selection. Escape cancels an active stroke or preview before
clearing selection or returning to Select, and otherwise dismisses only the highest open layer. Right-click
and Context Menu/Shift+F10 select a canvas target without travel; contextual menu actions and long-press
menus are defined by the Map Lab contextual-menu slice. Double-clicking a stair or portal centers its
current connection without travel, and a browser double-click sequence never duplicates ordinary viewer
navigation.

Status: IN FORCE.

### Inline versus modal editing

Which one you get is decided by what is being edited, not by feature preference:

- **A record with its own identity** — a spell, weapon, item, player, NPC, encounter, loot bundle —
  is edited in a modal `Dialog`. It has a name, it exists independently, and editing it is a
  deliberate act with a beginning and an end.
- **Properties of something already selected on a canvas or board** — a Map Lab fixture, a Loom node's
  thread assignment — is edited inline, in a panel or rail beside the thing. Opening a modal over a
  canvas hides the context that makes the edit meaningful.
- **A value changed repeatedly during play** — combatant HP, passage state — is changed by direct
  controls on the thing itself. No form, no dialog, no save step.

Status: IN FORCE.

### Staged batch-assignment dialogs

A relationship between a selected record and a catalog (e.g. a Player's spells or weapons) is edited
via a staged multi-select dialog. The dialog shows a searchable list of all catalog items with
checkboxes; checked items are staged for assignment. One atomic Save commits via a replace endpoint;
Cancel discards the draft without calling the API. No inline add/remove controls remain on the
read-only reference list.

Status: IN FORCE.

---

## Data states

Any region that loads data has five states, supplied by `StatePanel`: `loading`, `empty`,
`filteredEmpty`, `error`, `noSelection`. All five have distinct default copy; the root carries
`role="status" aria-live="polite"`. Async data is tracked with `RemoteState<T>`
(`idle | loading | success | error`) from `components/remoteState.ts` — not with loose booleans.

`empty` and `filteredEmpty` must stay distinct. "You have no spells yet" and "no spells match
'fireba'" call for different responses from the user, and collapsing them into one message is a
defect.

Status: IN FORCE.

### Empty-state copy

Two conventions are already consistent across all nine browsers and are now rules:

- **List empty** — `No <plural noun> found.` Sentence case, terminal period, no exclamation.
- **Nothing selected** — `Choose a <singular noun> from the list to see <what you will get>.`
  Name the payoff specifically: "to see its stat block", "to see its contents and value" — not
  "to see details".

Copy is plain, quiet, and never jokes. It states the situation and, where there is one, the next
action. It never blames the user.

Status: IN FORCE.

---

## Errors

Where an error appears is decided by **what failed**, not by which feature it happened in.

**Load failure** — the region has no data to show. The `StatePanel` `error` state fills that region.
The failure replaces the content because there is no content.

**Action failure** — the data is fine; a verb failed. A message appears beside the control that
failed, marked `role="status"`, and persists until the next action. The surrounding screen is
untouched. On canvas workspaces, "beside" may be a single bottom-center chip inside the canvas; Map
Lab uses that placement for viewer session-save, reset, and at-table failures. Blanking a board
mid-session because one button failed loses the user's place.

Status: IN FORCE.

### One error, one place

A single failure is reported **once**. Today a load failure on a browser page renders twice: once as
`BrowserLayout`'s `error` prop (`<p role="alert">` under the header) and again as `SearchList`'s
`StatePanel` error inside the list. The list's `StatePanel` is the correct one — it is the region
that lost its data. `BrowserLayout`'s `error` prop is redundant and should be removed along with its
nine call sites.

Status: TARGET.

### No toasts

There is no toast, snackbar, or global notification system, and none is to be introduced. Feedback
is local to the surface that caused it. A toast that vanishes on a timer is a poor fit for a table
where the DM looked away to answer a question, and a global overlay competes with the play-mode
surfaces that need the screen.

Status: IN FORCE.

---

## Saving

### Creating a record is explicit

Nothing is persisted until the user commits it. The create flow ends in an explicit action — `Create`
or `Save` — and until then no row exists. This keeps `Cancel` honest: on a create form, `Cancel`
genuinely discards, because there is nothing yet to discard.

Status: IN FORCE.

### Editing an existing record autosaves

Once a record exists, editing it persists as you go — debounced, with a visible status indicator
moving through idle → saving → saved → error. The dismiss control reads **Close**, not Cancel,
because nothing is being cancelled. Undo is available while the editor is open.

This is how the Map Lab editor already works (`saveStatus`, session-scoped layout Undo/Redo,
`Reset unsaved changes`, and the honest first-run line *"No saved layout yet. Your first edit will
save this blank map."*). The six modal
editors — Spell, Weapon, Player, NPC, Item, Encounter — still use an explicit Save button and a
`{ message, kind }` status paragraph. **That is accepted debt, not a pattern to copy.** Migrating
them needs an undo affordance that does not exist yet and belongs to its own plan.

The reason for the rule is play-mode: at the table you will be interrupted between typing and saving,
and a Save button you never reached is work lost in front of an audience.

Status: TARGET.

---

## Destructive actions

Anything that destroys data routes through `ConfirmDialog` — never `window.confirm`. `ConfirmDialog`
renders `Dialog` with `role="alertdialog"`, uses the question itself as the title, and pairs a
`secondary` Cancel with a `danger` confirm.

The confirmation message names the specific thing and states finality:
`Delete "<name>"? This cannot be undone.`

All eleven delete sites comply and there are zero `window.confirm` calls in the codebase.

Status: IN FORCE.

Because deletion is not reversible, confirmation is the only safety net. Where a destructive action
*is* reversible — the Loom's Fulfil, which pairs with Undo Fulfil, and Map Lab fixture/feature
deletes, which show `Deleted <thing>. Undo` in the canvas status chip — offer the reverse action
instead of a confirmation. Map Lab room deletion remains confirmed because it spans both layout and
dungeon data. Do not combine confirmation with a reversible action: it is friction without benefit.

Status: IN FORCE.

---

## Dialogs

`Dialog` (`components/Dialog.tsx`) is the single modal contract; `ConfirmDialog` and all six editors
are consumers of it, not parallel implementations. Its full behavioural contract — initial focus,
focus containment and restoration, Escape and backdrop dismissal, the `pending` fieldset — is
specified in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md#dialog-contract-vf3). Do not hand-roll a modal.

Two rules on top of that contract:

- **A dialog is for a bounded task with an end.** If the user needs to refer to what is underneath it
  while working, it should not be a dialog. Use a rail, panel, or `FloatingWindow`.
- **Dismissal is suppressed while pending.** Escape and backdrop clicks do not fire mid-save. This is
  already enforced by `Dialog`; do not work around it.

Status: IN FORCE.

### Persistent overlays

`FloatingWindow` is the pattern for content that must stay visible *while* the user works elsewhere —
the encounter runner dock, the NPC dossier dock. It is draggable, resizable, minimisable, and
persists its position per `storageKey`. Multiple may be open at once. Reach for it instead of a
dialog whenever the answer to "does the user need this while doing something else?" is yes, which
during play is often.

Status: IN FORCE.

---

## Keyboard

The app relies on the platform, not on a bespoke global shortcut layer. Map Lab has editor-scoped
desktop tool, erase, and undo/redo hotkeys owned by its active plan; they are ignored from text-entry
controls. No global hotkeys should be added without a plan that owns them.

- **Focus order is DOM order.** No `tabIndex` above 0. Native `<button>`, `<a>`, and form controls do
  the work; anything given `role="button"` also gets `tabIndex={0}` and handlers for both **Enter**
  and **Space**.
- **Escape closes the topmost dismissible layer** — dialog, drawer, or floating window — unless it is
  pending.
- **Arrow keys are for continuous or spatial controls only** — the `SplitPane` divider (arrows plus
  Home/End), the `FloatingWindow` resize handle. Lists are ordinary button lists and are traversed
  with Tab; `SearchList` deliberately does not implement `role="listbox"` or roving tabindex, and
  marks its selection with `aria-current="true"`.
- **`:focus-visible` is always visible** — `2px solid var(--md-primary)` with offset, applied
  globally. Never remove a focus ring.

Status: IN FORCE.

---

## Touch and reach

Interactive controls meet a 48px floor (`--control-height`). The documented exceptions — Map Lab
canvas glyphs, `Button`'s `compact` size, and Map Lab's paired compact property inputs — are listed
in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md#accessibility-floor) and are not to be extended without adding
to that list.

Play-mode surfaces get no new exceptions. A control that is only used at the table is exactly the one
that must be hittable without looking carefully.

Status: IN FORCE.

---

## Never hue-alone

No information is conveyed by colour alone, on any surface. Every colour cue is backed by an icon,
a glyph, or text — the Loom's kind pills carry ◇ ◆ ● ■ precisely so the thread palette is decoration
rather than meaning. This is repeated from [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md#accessibility-floor)
because it constrains interaction design, not just palette: if a state can only be shown in colour,
the state needs a different representation.

Status: IN FORCE.

---

## Known gaps

Recorded so they are not mistaken for settled ground:

- **No shared undo system.** Map Lab has session-scoped layout history and the Loom has its domain
  `Undo Fulfil` action, but other autosaving editors still need an owned undo design before adopting
  the autosave TARGET.
- **No optimistic updates.** Every mutation waits for the server. Acceptable on a LAN; worth
  revisiting if any surface starts feeling slow at the table.
- **No offline story.** A dropped connection surfaces as an action failure and nothing more.
