# Map knowledge & obstacles — settled decisions and handoff

**What this is.** The output of grilling sessions on 2026-07-29 and 2026-07-30, triggered by reviewing
the map viewer/editor and `/play` after the **Player Map Knowledge** plan shipped all 5 stages
(`docs/plans/done/player-map-knowledge/player-map-knowledge.md`). The user reported three symptoms —
lost token language, info that no longer displays, and inspector overflow — plus a general unease
about how `hidden` / `locked` / `trapped` are tracked. Investigation found all three, plus a
model-level redesign the user then settled.

It is a planning input, not a plan. No work orders here.

**What it supersedes.** Parts of the shipped `player-map-knowledge` plan:

- The **"World now" / "Players know"** two-heading inspector layout (Stage 4 UX block). Replaced by
  the shared three-obstacle panel in §3.2.
- The entire separate **knowledge layer**, including `exists`, lock/trap facts and `roomEntries`.
  Shown becomes authored state with a persisted session override; see §2.3 and §5.2.
- The Stage 5 claim that the kid map and DM preview "share a common `PlayerVisibleMap` renderer with
  lock and trap icon-text cues." The renderer is shared; the **cue vocabulary is not**, and the cues
  are wrong in four ways. Preview is removed and cues are replaced; see §3.1 and §4.

**Reading order.** §1 is verified current-state fact — do not re-derive it. §2 defines the settled
persisted model. §3 defines the three product surfaces and the exact inspector behavior. §4 defines
badge and player-curtain behavior. §5 is the cleanup and planning constraint list. There are no open
product decisions and no proposed stages in this document.

---

## 1. Verified facts

All measured on 2026-07-29 against `main` at commit `3425919` (worktree clean) and the exported
seeds in `data/seeds/`. Do not re-derive these.

### 1.1 The three layers as actually built

| Layer | Stored where | Covers | Persisted? |
| --- | --- | --- | --- |
| **Authored truth** | `map_layouts` blob | doors, stairs, props, portals | yes |
| **Session state** | `map_session_state` blob | doors, stairs, portals, `partyRoomId` — **no props** | **yes, fully** |
| **Knowledge** | `map_knowledge` blob | doors, stairs, props, portals, roomEntries | yes |

**The session layer already persists.** `useMapLabSessionState.ts:87-98` writes through to
`PUT /dungeons/:id/session-state` on every toggle with no debounce, reloads on mount
(`:59-85`), and `DELETE`s the row on Reset dungeon (`:100-113`). The user's "I need persistence"
concern was already satisfied — the real gap is that **props were never admitted to the session
document**, so nothing the party does to a chest can be recorded anywhere.

The two documents that are supposed to be parallel cover **different sets of object kinds**. That
asymmetry is the root of the props problem.

### 1.2 The player map's lock/trap cues are wrong in four independent ways

`frontend/src/map/PlayerVisibleMap.tsx:203-258` hand-rolls its cues instead of using the DM's badge
system:

1. **Doors only.** The loop is `for (const door of doors)`. Stairs, props and portals pass `locked`
   and `trapped` through the curtain (`curtain.ts:171-175`) and render **nothing**.
2. **Not zoom-scaled.** Positions are fixed pixel offsets (`cx + 4`, `cy - 12`, `cx + 18`). Every
   other element in the file divides by `zoom.scale`. The cues drift and mis-size at every zoom
   level other than 1.0.
3. **Ignores the shared vocabulary.** Inline `<rect>`/`<polygon>` padlock and hazard shapes with
   hardcoded `currentColor`, rather than `markerBadges.ts` icons and `PASSAGE_STATE_TOKENS`.
4. **Text has no halo.** `.player-map-cue-text` will collide illegibly with walls and room fills.
   Room titles solve this with `LABEL_HALO_RATIO`; the cues don't.

### 1.3 The DM already has a real badge vocabulary; the player map doesn't use it

`frontend/src/features/dungeons/maplab/markerBadges.ts` provides: ordered badge descriptors in fixed
precedence (**trapped ▸ locked ▸ hidden**, then loot, then trap-disarmed), each with a design token,
an `on-` token and a spoken label; `collapsedStatusDescriptor()` (single "Multiple statuses" disc
past one badge); `collapsedStatusLabel()` for assistive tech; `boundedBadgeLayout()` and
`linearBadgeLayout()` for placement; and `BadgeRing.tsx` to draw them. Used by `DoorMarker`,
`StairMarker`, `PortalMarker`, `PropMarker`. **Not used by `PlayerVisibleMap` at all.**

### 1.4 Three control languages for the same three booleans

| Fact | Editor (authored) | Viewer → "World now" | Viewer → "Players know" |
| --- | --- | --- | --- |
| `hidden` | checkbox **Hidden** (+ Perception DC, Search DC) | *nothing* | pill **Revealed / Hidden** |
| `locked` | checkbox **Locked** (+ Break DC, Pick DC) | pill **Lock / Unlock** | pill **Known: Lock / Unknown: Lock** |
| `trapped` | checkbox **Trapped** | pill **Disarm trap** (one-way) | pill **Known: Trap / Unknown: Trap** |

Sources: `fixtureTypes.ts:34-42, 68-81, 102-124`; `InspectorPanel.tsx:113-193`.

Three widget shapes (checkbox, verb-pill, state-pill) and four label grammars in one panel: a state
pair, a verb pair, a one-shot verb, and a prefixed state.

**"Hidden" means two opposite things.** In the editor it means "this is a secret door." In the
viewer's knowledge toggle it means "the players don't know it exists."

### 1.5 Opposite polarity for the same idea

`PassageSessionState` (`maplabModel.ts:600-605`) stores `isLocked: true` = obstacle **ON**, and
`trapDisarmed: true` = obstacle **OFF**. Same concept, inverted. `trapSprung?: boolean` is declared
and **used nowhere** — dead field.

### 1.6 ID reuse silently transplants knowledge onto new objects

`nextDoorId` / `nextPropId` / `nextStairId` / `nextPortalId` (`maplabModel.ts:731-756`) are all
`Math.max(0, ...ids) + 1`. Deleting the highest-numbered object and placing a new one **reuses the
dead object's ID**. Neither `backend/app/routers/knowledge.py` nor the session blob prunes on delete.

Failure case: reveal a secret door to the kids → delete it → place a fresh secret door → **it is
born already revealed**, with nothing in the UI explaining why. The same mechanism hands a new chest
a stale disarmed trap.

### 1.7 Two independent, drifted representations of "hidden"

| Where | Field | Read by |
| --- | --- | --- |
| Dungeon prose blob (`seed_dungeons.json`) | `DungeonDoor.is_hidden`, `hidden_dc` | `dungeonGraph()` in `dungeonModel.ts:380, 400` |
| Map layout blob | `MapDoor.hidden`, `MapDoor.hiddenDc` | the map, the curtain, the inspector, `/play` |

Nothing reconciles them. Measured drift in the real seeds: **prose has 4 `is_hidden: true` out of
102 fields; the layout has 6 `hidden: true` out of 153.** Different counts, different object sets
(prose covers doors/stairs/room-entries; the layout covers doors/stairs/props/portals).

**Resolution is free:** `dungeonGraph()` and `exitsFromRoom()` — the only readers of the prose
`is_hidden` — have **no callers in production code** (tests only). The layout blob is already
canonical in practice. The prose fields are inert legacy data; no migration is needed.

### 1.8 Curtain leaks: two fields cross that shouldn't

`frontend/src/player/curtain.ts`:

- **`loot: 'always'`** (`:77`) — every player client already receives `bundle_id` and `bundle_name`
  for every prop. Nothing renders it, so it's invisible, but the treasure inventory is sitting in
  the kids' network response.
- **`hidden: 'whenKnown'`** (`:80, 45, 66, 96`) — once existence is disclosed, `hidden: true` is
  sent, telling the client "this was a secret." Nothing renders it, and its only honest use (the
  filter) already happens before the pick.

### 1.9 The inspector overflows because its container is a fixed box with no scroll

`MapLabPage.css` — `.maplab-inspector-panel-container { flex: 0 0 15rem; }` with **no
`overflow-y`**. Stages 4 and 5 added two headed sections and up to six wrapping pill buttons into
that fixed 15rem box, on top of the header, chips, DC lines and the async loot summary. There is
also a dead empty ruleset: `.maplab-knowledge-toggle-wrapper .maplab-knowledge-error {}`.

### 1.10 Three preview-mode defects

`MapLabPage.tsx`:

- **Frozen snapshot.** `enterPreviewMode` (`:639-668`) fetches knowledge once and freezes
  `previewKidLayout`. Toggling a disclosure afterwards does not update the preview.
- **The toggle can't exit.** The button carries `aria-pressed={previewMode}` (`:714`) but calls
  `enterPreviewMode`, which early-returns when already in preview (`:640`). Only Escape exits
  (`:378-384`). The pressed-toggle affordance lies. (Escape-only *is* the shipped UX spec — the bug
  is the button pretending to be a toggle.)
- **Wrong empty copy, always.** `:1148` renders *"The players cannot see any map objects yet."* in
  the sidebar unconditionally while previewing, true or not. The genuine empty state at `:828` can
  never fire, because `playerViewTransform` always returns an object.

### 1.11 The knowledge feature has never been used

`data/seeds/seed_map_knowledge.json` is `[]`. No disclosure has ever been saved and exported. This
is consistent with the user's sense that the feature shipped but never worked end to end.

### 1.12 A trap has no DC anywhere in the model

Concealment owns `hiddenDc` + `searchDc`; the lock owns `breakDc` + `pickDc`; the trap owns
**nothing** (`fixtureTypes.ts:34-42`).

---

## 2. The settled model: authored state plus one persisted session overlay

The first grilling session described three persisted layers: authored truth, session state and
knowledge. The continuation settled a simpler model. There are now **two persisted layers only**:

| Layer | Persisted where | Written by | Meaning |
| --- | --- | --- | --- |
| **Authored state** | `map_layouts` | DM Edit | The reusable starting state of the dungeon |
| **Session overrides** | `map_session_state` | DM View | Sparse changes made during the current run |

This is not browser-local session state. `map_session_state` remains a server-side persisted record.
Closing a browser, changing browser, refreshing, or opening the player map on another device must
not lose Open, Armed, Shown or party-room values. Browsers read the same persisted session record
through the API. The word "session" means **the persisted current run**, not React state, local
storage or an in-memory cache.

The separate `map_knowledge` layer is deleted. What the players have been shown is mutable state,
and therefore belongs in the same persisted session overlay as what doors are open and which
obstacles remain armed. Dungeon reset becomes exact and cheap: delete one persisted session record,
then every field falls back to authored state.

### 2.1 One effective-value rule

Every runtime-mutable leaf follows this rule independently:

```text
effective leaf = session leaf when present
                 otherwise authored leaf
```

This is a **per-leaf recursive overlay**, not a fixture snapshot. If the session contains only
`lock.shown`, every other lock field still comes from authored state. Changing one checkbox must not
copy its siblings into the session document and thereby freeze them against later authoring.

The authored and session fixture-state nodes have the same names and nesting. Authored state is
complete; session state is a deep partial of that shape. Identity, geometry and descriptive content
are not part of this overlay and remain exclusively in the layout fixture.

An illustrative contract, not implementation syntax that must be copied blindly:

```ts
interface FixtureState {
  // Present only for doors. Position is state, but not an obstacle.
  open?: boolean

  obstacles: {
    concealment: {
      armed: boolean
      perceptionDc?: number
    }
    lock: {
      armed: boolean
      shown: boolean
      breakDc?: number
      pickDc?: number
    }
    trap: {
      armed: boolean
      shown: boolean
      disarmDc?: number
    }
  }
}

interface AuthoredFixture {
  // Exact identity and geometry differ by fixture kind and stay layout-only.
  id: number
  title: string
  cellOrEndpoints: unknown
  state: FixtureState
}

type SessionFixtureState = DeepPartial<FixtureState>

interface MapSessionState {
  doors?: Record<string, SessionFixtureState>
  stairs?: Record<string, SessionFixtureState>
  props?: Record<string, SessionFixtureState>
  portals?: Record<string, SessionFixtureState>
  partyRoomId?: number | null
}
```

The corresponding persisted blobs should be recognisably parallel. For example, an authored chest
could contain:

```json
{
  "prop_id": 17,
  "kind": "chest",
  "cell": [8, 4],
  "z": 0,
  "title": "Oak Chest",
  "state": {
    "obstacles": {
      "concealment": { "armed": false, "perceptionDc": 13 },
      "lock": { "armed": true, "shown": false, "breakDc": 15, "pickDc": 12 },
      "trap": { "armed": true, "shown": false, "disarmDc": 14 }
    }
  }
}
```

If the party learns about the trap and unlocks the chest, the persisted session record needs only:

```json
{
  "props": {
    "17": {
      "obstacles": {
        "lock": { "armed": false },
        "trap": { "shown": true }
      }
    }
  },
  "partyRoomId": 6
}
```

The resulting effective chest has authored Concealment, authored Lock DCs, session Lock Armed,
authored Lock Shown, authored Trap Armed and session Trap Shown. The player sees a trapped icon:
Trap is armed and shown, while Lock is disarmed and therefore a null badge state.

**Absence and `false` are different.** A missing session leaf means "fall back to authored." A
present `false` is an intentional runtime override and must survive JSON parsing, normalization and
persistence. Code must test property presence/nullishness rather than truthiness. Removing an
override deletes the leaf; it must not write the authored value into the session as a replacement.

`door_id`, `prop_id`, `stair_id`, `portal_id`, cells, sides, endpoints, destinations, kinds, titles,
notes, loot references, NPC references and encounter references remain layout-only. A session entry
is located by fixture kind and ID and contains state overrides only. It never duplicates placement
or identity.

DC fields use the same structural nesting so authored and session state have one recognisable shape,
but they are **authored-only by policy**. DM View has no DC editor. If a malformed, hand-written or
legacy session record contains a DC override, resolution ignores it and persistence prunes it. The
only valid runtime override leaves are `open`, obstacle `armed`, obstacle `shown`, and
`partyRoomId`.

### 2.2 Three obstacles, one polarity

The same lifecycle vocabulary applies to all three obstacles:

| Obstacle | Armed means | Authored DCs | Disarmed means |
| --- | --- | --- | --- |
| **Concealment** | the fixture is secret | Perception | found and present on the player map |
| **Lock** | the fixture is locked | Break, Pick | unlocked; no active lock obstacle |
| **Trap** | the trap is live | Disarm | disarmed; no active trap obstacle |

Stored/model language is `armed: boolean` for every obstacle. This removes the current polarity
inversion between `isLocked: true` and `trapDisarmed: true`. `trapSprung` is deleted rather than
becoming a third state. If sprung traps are wanted later, they require their own gameplay and UI
decision rather than entering this binary lifecycle accidentally.

Search DC is also deleted. Concealment has one Perception DC, used whether the DM treats the moment
as passive noticing or an active attempt to find the fixture. Existing Search DC values do not need
preservation.

DC values remain stored in authored state while an obstacle is disarmed, but are dormant: they do
not apply and do not display in DM View. This makes authoring reversible and allows session reset to
restore the exact authored challenge. "The obstacle loses its DCs when disarmed" means the DCs are
inactive, not destructively erased.

### 2.3 Shown is authored state with a session override

Lock and Trap each have a `shown` leaf. It means the players are allowed to see that obstacle's active
badge whenever it is armed. Concealment has no Shown leaf because finding the fixture and putting it
on the player map are the same event.

Shown has an authored baseline. This lets DM Edit describe the complete starting situation: a lock
or trap may begin known to the players. DM View may override that value during play. Reset removes
the override and returns to the authored Shown value.

The checkboxes are independent data points:

- Changing Concealment Armed does not alter Lock Armed, Trap Armed, Lock Shown or Trap Shown.
- Changing Armed does not alter the matching Shown value.
- Changing Shown does not arm or disarm anything.
- Lock and Trap Shown remain editable while Concealment is armed.
- Re-concealing a fixture suppresses it from the player map but retains all other state. Revealing it
  again restores whatever Lock/Trap Armed and Shown combination was already stored.

There is an order to **rendering**, not an interdependency between controls. Concealment gates the
fixture first; if it passes, the player badge selector considers Trap and then Lock. No checkbox
automatically writes another checkbox.

### 2.4 Player-visible state is deliberately smaller than stored state

Concealment gates the fixture:

| Concealment | Player result |
| --- | --- |
| **Armed** | Fixture is not rendered at all. Its Lock and Trap state are irrelevant to rendering. |
| **Disarmed** | Fixture renders normally; Lock and Trap may contribute one active badge. |

Lock and Trap each have four stored combinations, but disarmed is a null map state:

| Armed | Shown | Player result |
| --- | --- | --- |
| yes | no | plain fixture; active obstacle remains secret |
| yes | yes | active obstacle badge is eligible |
| no | no | plain fixture |
| no | yes | plain fixture; Shown remains stored in case the obstacle is re-armed |

There are **no Unlocked or Disarmed badges on either map**. The user explicitly changed the earlier
decision that a beaten obstacle should leave a celebratory marker. Positive states are null map
values. Their words may belong in a future tap panel, but that panel is out of scope.

### 2.5 Default state

All existing obstacle authoring is disposable. The user has not intentionally authored these
details for play, including on dungeon 4. Conversion therefore resets existing authored obstacle
state rather than interpreting experimental flat flags as canonical:

```text
Concealment Armed = false
Lock Armed        = false
Lock Shown        = false
Trap Armed        = false
Trap Shown        = false
all DCs           = absent
door Open         = false
```

New fixtures use the same defaults. They begin visible, plain, closed where applicable, and without
DCs. The DM deliberately opts into every complication.

Existing `map_session_state` and `map_knowledge` records are also disposable and are reset during
the transition. There is no compatibility migration for existing disclosures, open doors, party
position or obstacle overrides. Layout identity, geometry, titles, notes, kinds, destinations, loot
and other non-obstacle authored content are preserved.

---

## 3. Settled surface behavior

### 3.1 Exactly three product spaces

The product has three relevant spaces:

| Space | Reads | Writes | Purpose |
| --- | --- | --- | --- |
| **Player** | effective filtered state | nothing | The children's map |
| **DM View** | effective state | persisted session overrides | Run the dungeon now |
| **DM Edit** | authored state | layout/authored state | Define the reusable starting dungeon |

The DM-side player preview is deleted in full. It is a redundant fourth mode when the real Player
space already exists. Remove its button, frozen snapshot state, preview-only rendering branches,
Escape handling, `aria-pressed` behavior, empty copy and tests. Do not repair or redesign preview;
remove it.

### 3.2 One shared inspector state panel

DM View and DM Edit use one shared component, not duplicated panels that merely resemble each other.
The component receives a read/write adapter:

- In **DM Edit**, values and writes point at authored fixture state.
- In **DM View**, values are effective values and writes create/remove persisted session leaves.

The shared component guarantees one ordering, one set of labels, one checkbox grammar, one DC
presentation and one accessibility implementation. Contextual differences are explicit props, not
forked markup.

The non-door shape is:

```text
┌─ Oak Chest ─────────────────── Prop ─┐
│                                      │
│  World now          Armed    Shown   │  DM View
│  ─────────────────────────────────   │
│  Concealment          ☐        —     │
│    Perception 13                     │  only while effectively armed
│  Lock                 ☑        ☑     │
│    Break 15 · Pick 12                │  only while effectively armed
│  Trap                 ☑        ☐     │
│    Disarm 14                         │  only while effectively armed
│                                      │
│  Loot: Bandit Stash (42 gp)      ▸   │
│  Note: lid creaks                    │
│                                      │
│  ⟲ Reset to authored                 │  DM View only
└──────────────────────────────────────┘
```

In DM Edit, `World now` becomes `Authored`. The three rows, Armed/Shown columns and surrounding
inspector information remain in the same positions. DC lines become editable number inputs in DM
Edit and read-only text in DM View.

A door adds one state control above the obstacle grid:

```text
┌─ North Door ────────────────── Door ─┐
│                                      │
│  World now                           │
│  Open                         ☑       │
│                                      │
│                      Armed    Shown   │
│  ─────────────────────────────────   │
│  Concealment          ☐        —     │
│  Lock                 ☑        ☑     │
│    Break 15 · Pick 12                │
│  Trap                 ☐        ☐     │
│                                      │
│  ⟲ Reset to authored                 │
└──────────────────────────────────────┘
```

Open is a labelled checkbox but is not forced into the obstacle grid. It is position, not an
obstacle, and has no Shown concept. The editor can author a door Open or Closed. DM View can override
that position during play.

Concealment's Shown cell is always a dash, never a disabled checkbox. Lock and Trap Shown checkboxes
remain enabled regardless of Armed or Concealment values because the controls are independent.

### 3.3 Checkbox and persistence behavior

Every state toggle is a labelled checkbox. A checkbox says "this is true"; a command button such as
today's ambiguous **Lock** or one-way **Disarm trap** says "do this." The DM is recording current
truth, so stateful checkboxes are the correct grammar.

DM View writes persist immediately to the server-side `map_session_state` record. There is no Save
button and no debounce. These are deliberate, low-frequency table actions. A successful write must
survive reloads and appear in another browser/device on its next API read.

Persistence preserves sparsity. If the DM changes a viewer checkbox to a value different from its
authored leaf, write that explicit override, including `false`. If the DM changes it back to the
authored value, remove the session leaf instead of storing a duplicate. Then remove empty parent
objects up through fixture, kind and dungeon-record levels where applicable.

If persistence fails:

- revert the checkbox to the last server-confirmed effective value;
- show an inline inspector error;
- do not leave optimistic state that the player map or a reload will contradict.

The existing player polling interval remains five seconds. A genuine missing session record (`404`)
means there are no overrides and authored state is effective. Any other transient session-read
failure retains the player's last good rendered frame rather than falling back to authored state;
falling back could reveal a session-concealed fixture or revert a disclosure.

### 3.4 DC behavior

DC ownership is strict:

| Surface | DC behavior |
| --- | --- |
| **DM Edit** | editable authored values |
| **DM View** | read-only effective display while the obstacle is armed |
| **Player** | never rendered |

DC rows are absent while their obstacle is disarmed. When armed, each expected DC is named even if
missing. Examples:

```text
Perception: DC not set
Break 15 · Pick: DC not set
Disarm 14
```

Arming without complete DCs is allowed. DM Edit shows a warning rather than blocking the checkbox or
save. This supports unfinished authoring and obstacles resolved narratively while making omissions
obvious during play.

### 3.5 Fixture-local reset

**Reset to authored** appears only in DM View. It remains visible but disabled when the selected
fixture has no session override, keeping panel geometry stable and confirming that the viewer
already matches authored state.

When enabled, it removes the selected fixture's entire session entry. That resets Open, all Armed
values and both Shown values together by allowing every leaf to fall back to authored state. It does
not edit the authored baseline. If removing that entry leaves no fixture overrides and no party room,
the empty session row is deleted rather than persisted as `{}`.

DM Edit does not show Reset to authored: it is already editing the authored target.

### 3.6 Dungeon reset

**Reset dungeon** deletes the one persisted server-side `map_session_state` record. It therefore:

- restores every Open, Armed and Shown value to its authored baseline;
- removes every fixture override;
- clears `partyRoomId`;
- leaves the authored layout untouched;
- prepares the same dungeon to be run again for different children.

There is no second knowledge record to clear.

### 3.7 Re-authoring during a session

Changing authored state invalidates only the corresponding runtime override, not the whole session:

- Editing authored `lock.armed` removes session `lock.armed` for that fixture.
- Editing authored `lock.shown` removes session `lock.shown` for that fixture.
- Editing authored `open` removes session `open` for that door.
- Editing one leaf does not remove sibling overrides.
- Changing fixture geometry clears that fixture's complete session entry because its runtime state
  was attached to the previous authored object shape/location.
- Deleting a fixture removes its complete session entry.
- Editing layout-only descriptive content such as title, note or loot does not clear obstacle or
  Open overrides; those state values still refer to the same fixture identity.

This is required by the user's rule: authoring any one thing resets only that one thing. It also
means the newly authored value becomes effective immediately for that leaf, rather than remaining
hidden behind an older session override.

The backend enforces pruning while saving the layout. It must not depend on one editor callback,
because imports or future clients can also alter layouts. An empty session record is removed.

The viewer does not annotate every checkbox as "authored" or "session." It shows effective values
only. Per-field source badges would recreate the two-altitude clutter the redesign removes. The
enabled fixture-reset button is the single indication that at least one runtime override exists.

### 3.8 Inspector overflow

The three-row grid removes most of the current height pressure by subtraction, but the fixed
inspector still contains variable notes and asynchronous loot summaries. Add `overflow-y: auto` as
a safety floor. Scrolling is not the primary redesign and should not justify retaining redundant
controls. Remove the dead empty `.maplab-knowledge-toggle-wrapper .maplab-knowledge-error {}` rule
as part of deleting the old knowledge UI.

---

## 4. Settled map badge and curtain behavior

### 4.1 Shared module boundary

Move `markerBadges.ts` and `BadgeRing.tsx` from
`frontend/src/features/dungeons/maplab/` to neutral `frontend/src/map/`, beside the already-shared
`markerShape.tsx` and `PlayerVisibleMap.tsx`.

This is a narrow revision to `scratch/kid-map-rethink-handoff.md` §3.1. That earlier decision kept
marker semantics DM-side because no player-facing status vocabulary existed yet. Lock and Trap are
now explicitly player-facing, so badge descriptors and drawing primitives are shared map domain
code. Audience policies still remain outside the primitive:

- DM policy decides which complete badge list to build and when to collapse it.
- Player policy filters to player-legal active statuses and selects one winner.

### 4.2 Armed-only badge vocabulary

Map badges communicate active problems only. The user explicitly rejected positive-state badges.

| Badge | DM map | Player map | Gate |
| --- | --- | --- | --- |
| Concealed/Hidden | yes | no | concealment armed |
| Trapped | yes | yes | DM: trap armed; Player: trap armed + trap shown |
| Locked | yes | yes | DM: lock armed; Player: lock armed + lock shown |
| Unlocked | **never** | **never** | null map state |
| Trap disarmed | **never** | **never** | null map state |
| Loot | yes, existing DM policy | no | DM-only |

Remove the existing trap-disarmed badge behavior. Do not add an unlocked badge. Shown remains stored
while disarmed, but produces no map output. If that obstacle is re-armed, its retained Shown value
makes the active badge eligible again.

### 4.3 Player single-badge rule

The player map shows at most one state badge per fixture:

```text
Trapped (armed and shown)  >  Locked (armed and shown)
```

The reason Trap wins is concrete: an unlocked chest may still be trapped. Danger outranks
obstruction. There is no "Multiple statuses" player glyph and no side-by-side enumeration. A
four-year-old has no inspector to tap, so an abstract multiplicity disc has no useful meaning.

The badge is **icon-only**. Do not render visible `Trapped` or `Locked` text beside or inside the
token. The earlier decision to pair words with icons is superseded. Status text may belong in a
future player tap panel, but that panel is explicitly out of scope. The icon's accessible label
names only the winning status, so visual and assistive output expose the same prioritized fact rather
than different lists.

Marker titles such as "Oak Chest" and "North Door" also remain absent from the player map canvas.
They may stay available to player-side UI data for a future panel, but are not drawn now.

### 4.4 DM badge rule

The DM map always shows active Concealment, Lock and Trap badges regardless of Shown, because the DM
sees world truth. Its existing collapse-to-"Multiple statuses" strategy remains valid: the DM can
open the inspector for detail. DM and player maps share icon/token descriptors but legitimately use
different selection/layout policies.

### 4.5 Fix all current cue defects by replacement

The player map must stop hand-rolling door-only lock/trap shapes. Use the shared descriptor and
drawing vocabulary for doors, stairs, props and portals. The implementation must resolve every defect
in §1.2:

- all supported fixture kinds participate, not doors only;
- icon geometry and placement obey the shared absolute zoom/constant-pixel strategy;
- icons and colours come from the shared vocabulary and design tokens;
- no hardcoded `currentColor` padlock/hazard duplicates remain;
- accessible labels come from the descriptor;
- there is no visible cue text requiring a halo because the settled player badge is icon-only.

### 4.6 Client-side curtain is an accepted boundary

The player app currently fetches complete layout/session data and filters it in the browser. The user
explicitly accepts that a child could inspect API responses or browser developer tools. Building a
server-side player-map endpoint is out of scope. The product requirement is what renders, not secrecy
from a technically curious player.

The browser-side curtain must still produce a player rendering model with these rules:

- concealment-armed fixtures are omitted from rendering;
- only active, shown Trap/Lock facts are available to player badge selection;
- loot, notes, DCs, encounter pins and authoring-only concealment state do not render;
- encounter markers remain absent under the standing kid-map decision;
- Open/Closed geometry uses effective authored-plus-session state;
- props now participate in session resolution exactly like doors, stairs and portals.

`loot` and raw concealment/authoring fields should no longer be selected into `KidMapLayout`, even
though the unfiltered API response remains available in the browser. The curtain is a rendering
contract, not a security boundary.

---

## 5. Settled data cleanup and planning constraints

This section is deliberately **not a staged plan**. It records non-negotiable outcomes and ordering
constraints so a later use of the `plan` skill can reference this handoff directly without reopening
product decisions.

### 5.1 One plan, model before surfaces

The obstacle model and UI repairs belong in **one plan**, not separate model and surface plans. They
form one end-to-end outcome, and the surfaces cannot be correct until they consume the new model.
The eventual plan may divide the work into stages and work orders, but model/data contracts must
land before consumers are switched.

The model refactor is necessary repair work, not a rethinking of the gameplay idea. Surface-only
patches would preserve incompatible state documents, opposite polarity and missing prop overrides.

### 5.2 Delete the knowledge subsystem completely

Because Shown now lives in authored state with persisted session overrides, remove the obsolete
knowledge subsystem rather than leaving compatibility husks:

- `map_knowledge` database table;
- knowledge router and API endpoints;
- backend request/response schemas;
- frontend API client methods and `MapKnowledge` types;
- `seed_map_knowledge.json` and export-schema entries;
- knowledge hooks, controls and tests;
- `MapKnowledge.roomEntries`;
- `roomEntryIdentity()` and its tests;
- the `exists`, `lock` and `trap` knowledge document fields.

No existing knowledge data needs migration. Reset it.

Leave a durable note for a future Fog plan that room-entry prose was deliberately removed from map
disclosure because no current player surface renders it.

### 5.3 Remove rival prose concealment

The layout state is the sole canonical concealment model. Remove the inert dungeon-prose
`is_hidden` and `hidden_dc` fields from schemas and seed data. Delete `dungeonGraph()` and
`exitsFromRoom()` and their tests; they have no production callers and otherwise preserve a rival
interpretation of concealment.

No migration of prose concealment values is required.

### 5.4 Remove old state vocabulary

Delete, rather than alias or retain for compatibility:

- flat authored `hidden`, `locked`, `trapped` flags;
- `hiddenDc` and `searchDc`;
- session `isLocked`, `trapDisarmed` and `trapSprung`;
- effective-state aliases such as `sessionLocked` and `trapDisarmed`;
- positive badge states for Unlocked and Trap disarmed where they exist only for map cues.

Convert layout fixtures to the nested authored `state` shape in §2.1 and reset the obstacle leaves
to §2.5 defaults. Existing geometry/content survives; existing obstacle values do not.

### 5.5 Props become first-class session fixtures

The persisted session document covers doors, stairs, props and portals with the same partial state
contract. Props are not a special case. A chest can be concealed, locked, trapped, revealed,
unlocked or disarmed during a run and retain that current state across browsers and reloads.

The accepted universal-authoring rule is broader than common usage: Concealment, Lock and Trap
controls remain available on every fixture kind and every prop kind, including unusual fantasy cases
such as trapped stairs, locked portals or concealed NPC pins. Irrelevant obstacles simply remain
unchecked and unshown. Do not introduce an applicability matrix.

### 5.6 Monotonic IDs and pruning

Both protections are required:

- Store per-kind next-ID counters in layout metadata. Never allocate a deleted ID again.
- Initialise counters for existing layouts from the maximum current ID for that kind.
- Keep counters monotonic across delete, save, export and import.
- On layout save, backend comparison prunes session entries for deleted fixtures.
- Geometry changes clear the affected fixture's session entry.
- Authored state-leaf changes clear only matching session leaves.
- Remove empty fixture entries, empty kind maps and finally empty dungeon session rows.

Monotonic allocation prevents stale state transplant at source. Pruning is still required data
hygiene so orphans do not accumulate in persisted rows or seed exports.

### 5.7 Required final-state invariants

A future planner should turn these into automated stop conditions rather than reinterpret them:

- There is no `map_knowledge` table, endpoint, seed or frontend type.
- There is one server-persisted runtime override document per dungeon at most.
- Session fixture entries are sparse and contain state only.
- Every fixture kind uses the same obstacle nesting.
- DCs can be written only through DM Edit and are ignored/pruned from session data.
- Reset fixture removes one fixture entry; Reset dungeon deletes one session row.
- Editing one authored leaf clears only its matching session leaf.
- Deleting a fixture cannot leave a session orphan.
- Deleting and replacing a highest-numbered fixture cannot reuse its ID.
- Player rendering never draws a concealment-armed fixture.
- Player rendering never draws Unlocked, Disarmed, Hidden, Loot or status text.
- Player rendering draws at most one active status icon, Trap before Lock.
- DM rendering shows active obstacles regardless of Shown.
- Player and DM badge icons/tokens come from one neutral shared module.
- DM Edit and DM View state controls come from one shared panel component.
- A reload or second browser sees persisted session overrides.
- A transient session-read failure cannot replace the last good player frame with authored state.
- DM-side player preview no longer exists.

---

## 6. Where the evidence lives

Files read during the session, for whoever picks this up:

- `frontend/src/player/curtain.ts` — the field-visibility declarations and `pickKnown`
- `frontend/src/map/PlayerVisibleMap.tsx` — the shared renderer and the hand-rolled cues (`:203-258`)
- `frontend/src/player/PlayerMapRenderer.tsx` — the kid wrapper
- `frontend/src/features/dungeons/maplab/InspectorPanel.tsx` — the current control soup
- `frontend/src/features/dungeons/maplab/markerBadges.ts` — the DM badge vocabulary
- `frontend/src/features/dungeons/maplab/fixtureTypes.ts` — authored field definitions
- `frontend/src/features/dungeons/maplab/useMapLabSessionState.ts` — proof the session layer persists
- `frontend/src/features/dungeons/maplab/MapLabPage.tsx` — `knowledgeControls` (`:573-589`),
  `enterPreviewMode` (`:639-668`), preview render branches (`:804-830`, `:1145-1165`)
- `frontend/src/model/maplabModel.ts` — `PassageSessionState` (`:600`), `effectivePassageState`
  (`:621`), ID allocators (`:731-756`)
- `frontend/src/features/dungeons/dungeonModel.ts` — the prose blob's rival `is_hidden`
- `backend/app/routers/knowledge.py`, `session_state.py` — both store opaque `Dict[str, Any]`
- `data/seeds/seed_map_knowledge.json` (empty), `seed_map_session_state.json`, `seed_map_layouts.json`
