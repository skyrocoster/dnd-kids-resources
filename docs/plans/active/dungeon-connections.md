# Dungeon Connections — dungeons link to each other, and a session survives the walk between them

> **Status:** Not started, and not next. Starts after [Dungeon Outside](dungeon-outside.md) completes
> — the two share `MapPortal` and `MapLayout` and must not run concurrently. First stage when it
> starts: Stage 1 — permanent session state.

- **Area guide:** [Dungeons](../../areas/dungeons.md)

## What we're building & why

Nothing in the codebase references another dungeon. A castle and the crypt beneath it are two
unrelated records, and the only way to express "the tunnel at the back of the cellar comes out in the
crypt" is to write it in prose and remember.

This plan makes that link real data. A portal gains an optional dungeon reference, so following it
takes you to another dungeon's map. Because links can now cross documents, portals also stop
requiring a destination at all — you can drop one and say "this goes somewhere, I'll decide later" —
and a **resolve list** surfaces every connection that does not yet have two ends.

Underneath that sits the change the gateway forces. Session toggle state — which doors are open,
which traps have been sprung — currently lives in `useState` inside `MapLabPage`
(`MapLabPage.tsx:170-172`). It is component-local and persisted nowhere. Navigating to another
dungeon is a different route, so `MapLabPage` unmounts and every toggle is lost. The area guide
already carries the invariant *"must never lose session toggle state"*, and cross-dungeon links would
break it the day they shipped. They also expose a bug that exists today: refresh the page mid-session
and you lose everything, gateway or no gateway.

So the first stage is not the gateway. It is making session state permanent.

### Settled decisions

**Session state is permanently stored on the backend, not in `sessionStorage`.** It survives the
browser, the machine, and a year off. That means a new per-dungeon state record with its own table
and endpoints — *not* fields inside the `map_layout` blob, because the layout is the authored map and
opening a door should not dirty the map document.

**One live state per dungeon, plus a "Reset dungeon" action.** Named runs — several independent
states so two groups of kids can play the same dungeon without spoiling each other — were considered
and deferred as far off. A run id is a column that can be added later, at which point today's single
state becomes the default run.

**Links are one-way in the data, paired in the UI.** In-dungeon portals auto-pair today, which is a
local edit to one document. Across dungeons, auto-pairing would mean the editor writing into a second
dungeon's layout blob — a document you have not opened and might have open in another tab. With one
blob row per dungeon and no locking, that is a real way to lose work. Instead, the target dungeon's
editor *shows* incoming links — "The Castle links here, at square 2,9" — with a one-click *Add the
return gateway*. Nothing is written unless you are in that dungeon.

**`to` becomes optional on a portal.** A portal with no destination is a legitimate, saveable state.

**A "to resolve" list, scoped to connections only.** Three membership rules, one test: *there is a
link here that does not have two ends*. Portals with no destination; incoming links with no return;
gateways whose target dungeon has been deleted. General map hygiene — rooms with no doors, untitled
rooms, unreachable floors — was rejected: it turns a to-do list into a linter, and linters accumulate
rules nobody agreed to and then get ignored because they are always yellow. A room with no doors
might be exactly what you meant.

**Deleting a dungeon is never blocked and never cleans up after itself.** Because links are one-way,
deleting the Crypt cannot corrupt the Castle — it turns the Castle's gateway into a row in the
resolve list with `[repoint]` and `[remove]` actions. No delete-blocking, no scanning every layout on
delete, no silent editing of another dungeon's map. Note that no database constraint could enforce
this anyway: the reference lives inside a JSON blob, and `map_layout`'s existing `ON DELETE CASCADE`
only covers a layout's own dungeon.

**No portal kinds in this pass.** A road head and a magic teleporter are distinguished by their
title. The distinction that matters — *does this leave the dungeon?* — is already in the data the
moment `to.dungeon_id` exists, and renders automatically, so it cannot be forgotten the way a kind
field can. A portal-kind registry, consistent with the wall and feature registries, stays purely
additive if playtesting asks for it.

**Not coupled to the Loom.** A `loom_sessions` table already exists and tying dungeon state to a
campaign session is a natural future hook, but doing it now would drag the Loom into this plan.

## UX decisions — gateways, resolve list, reset

```
Surface:      Map Lab session view + Map Lab editor (existing rows in
              docs/areas/dungeons.md ## Surfaces). The resolve list is a new region
              inside the editor, not a new route — it needs the map beside it.
Mode:         both. Following a gateway happens in play; resolving links and
              resetting a dungeon happen in prep.
Operator:     DM.
Focal:        in the resolve list, the unfinished connection itself — each row leads
              with what is broken, and its action button is the only emphasised
              control in the row.
Route shape:  existing dungeons/:dungeonId and /edit routes. A gateway navigates in
              the same tab; permanent state is what makes that safe.
Edit style:   inline panel. Picking a gateway's destination is a pick-from-a-list
              action in the inspector, never a typed coordinate and never a modal
              over the canvas.
Save:         autosave on edit, matching the existing Map Lab editor. Session
              toggles write through immediately — a toggle is not a form.
Empty:        resolve list with nothing to resolve —
              "Every connection has both ends. Nothing to resolve."
Filtered empty: not applicable — the list has no filter. If one is ever added it needs
              its own distinct copy per UX_PATTERNS §Data states.
No selection: inspector on a portal with no destination —
              "This portal has no destination yet. Choose where it leads."
Load failure: StatePanel error fills the resolve list region only; the canvas keeps
              its map. A failure to load link state must not blank the board
              mid-session.
Action failure: inline beside the failing control, role="status". Persists until the
              next action. No toasts — none exist and none are to be introduced.
Destructive:  "Reset dungeon" routes through ConfirmDialog. Message names the dungeon
              and states finality: 'Reset "<name>"? Every door, trap, and toggle
              returns to its authored state. This cannot be undone.'
              Removing a broken gateway uses the standard delete confirmation.
Keyboard:     DOM order. Resolve-list rows are ordinary buttons traversed with Tab,
              not a listbox. Escape closes the ConfirmDialog unless pending.
Touch:        48px floor on resolve-list actions and the reset control. No new
              exceptions.
```

## Stages

1. **Permanent session state.** Lift `doorSessions`, `stairSessions` and `portalSessions` out of
   `MapLabPage` into a per-dungeon store backed by a new table and endpoints. Add the "Reset
   dungeon" action. This stage stands on its own: it fixes the existing refresh-loses-everything bug
   with no gateway in sight. It is also the least understood stage in either plan — how tangled those
   three `useState` hooks are with the rest of that large component is the biggest unknown here, and
   `to-orders` should start by measuring that rather than assuming.

2. **Optional destinations and the resolve list.** Make `to` optional, so a portal can exist without
   a destination, and build the connections resolve list with its three row types and their actions.
   Doing this before cross-dungeon links means the list ships useful — it immediately covers
   unfinished in-dungeon portals — and the cross-dungeon rows slot into an existing surface.

3. **Gateways.** Add `to.dungeon_id`, render a portal that leaves the dungeon distinctly from one
   that does not, name the destination dungeon in the inspector, and navigate on follow. Show
   incoming links in the target dungeon's editor with the one-click return-gateway action. Broken
   gateways — target dungeon deleted — appear in the resolve list rather than failing.

## Shipped

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
