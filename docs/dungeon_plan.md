# Dungeon Room Navigation — Staged Build Plan

## Context

The dungeon feature today is a single flat browser (`DungeonBrowserPage.tsx`): a `SplitPane`
with a dungeon list on the left and one read-only `Card` on the right that dumps every room's
title/entries and a "Door → rooms 2,1" line. There is no way to *be inside* a dungeon and move
from room to room — which is how a DM actually uses it at the table.

We want a **room-per-page experience**: enter a dungeon, land on a room, read its full detail,
and move to connected rooms through **clearly-shown door choices**, with a **breadcrumb trail**
and a **room-index rail** for orientation. This mirrors the v1 dungeon (two-pane, clickable
"→ Room" door links) but evolves it — v1 used a dropdown and had no breadcrumbs or prominent
exits, and its map was a dead static image.

**Priority: get navigation right first. Do NOT expand the editor yet** — editing rooms comes in a
later phase (see "Out of scope" and the editor-debt note). Each stage below is a self-contained
work packet with its own test gate, sized to hand to one model at a time, in order.

**Note: when completing a stage, explain to the user what they should be abel to view as a test visually**

### Design decisions already made (from the user)
- **Layout:** collapsible room-index / mini-map **rail** on the left, full **room page** on the right, breadcrumb bar on top. (Closest to v1, plus breadcrumbs.)
- **Exits:** prominent **choice cards** — `🚪 Great Oak Door → Portal Room`. This is the page's signature affordance. Hidden doors are shown to the DM, marked with a DC.
- **Typography:** stay within the existing Material Design 3 Roboto system — **no new fonts.**

---

## Key facts the executor needs (assume no other repo knowledge)

**Data is an opaque JSON blob.** Backend (`schemas.py` `Dungeon.data: Dict[str, Any]`) and
frontend (`types.ts` `Dungeon.data: Record<string, unknown>`) both treat it untyped. **No backend
change is needed for any stage here** — this is entirely frontend work against `getDungeon(id)`.

**The real shape** (from `data/seeds/seed_dungeons.json`, two dungeons: id 4 "Isly Castle",
id 5 "Greenhouse", both single-floor):
```jsonc
data = {
  general_info: { title, size, walls, floor, temperature, illumination },  // mostly null
  rooms: [ { room_id: 3, title: "Portal Room", entries: [Entry…], npcs?: [4] } ],
  doors: [ { door_id, entry_type:"door", title, content, leads_to:[2,1],
             is_hidden, hidden_dc, door_mechanics, trap_ids:[] } ],
  corridors: [], map_image: null, map_image_length: 0
}
// Entry (inside a room): { entry_type: "feature"|"trap"|"encounter"|…, title, content,
//   is_hidden, hidden_dc, container, container_mechanics, count, monster_id,
//   encounter_id?, trap_ids:[], treasure_contents:[] }
```
**Room connectivity = the door edge list.** A door's `leads_to` is a 2-element array of the two
`room_id`s it joins (an undirected edge). To find a room's exits: scan `data.doors`, keep doors
whose `leads_to` contains the current `room_id`, and the *other* id is the destination. Data is
human-authored and slightly messy — `leads_to` can repeat a room (`[9,7]`, `[9,8]`), be a scalar
in older records, and `door_id`s can skip numbers. Selectors must tolerate this.

**How v1 did it (reference):** two-pane, left = room dropdown + static map, right = current room.
Doors/stairs rendered as inline `<a class="room-link" onclick="goToRoom(id)">→ Room Name</a>`;
`goToRoom` resolved the target by `room_id`, switched floor if needed, and re-rendered the detail.
Entries were bucketed by type under emoji headers. Current room tracked by array index; dungeon
deep-linked via `#dungeon/<id>` URL hash. We keep the grouping + clickable exits, add real routes,
breadcrumbs, and choice-cards; we drop the dropdown and the dead map.

**Reusable pieces (do not rebuild):**
- `frontend/src/api/client.ts`: `getDungeon(id)`, `listDungeons()`.
- `frontend/src/components/`: `Card` (`variant="neutral"`), `SplitPane`, `SearchList`, `DiceText` (wrap any prose that may contain `2d6+3`), `ConfirmDialog`.
- Defensive `asRecord`/`asArray` helpers already exist inline in `DungeonBrowserPage.tsx` and `dungeonForm.ts` — extract to the new model module rather than copy a third time.
- `frontend/src/theme.css`: M3 dark tokens. Neutral surfaces for the shell; **secondary (old-gold) container tokens** (`--md-secondary-container` / `--md-on-secondary-container`) are the one accent, used *only* on exit choice-cards.

---

## Design direction (grounded, reconciled with the M3 system)

- **Palette:** neutral M3 surfaces throughout the dungeon shell (rail = `surface-1`, room page = base `surface`, breadcrumb bar = `surface-2` — same tone-step elevation the app shell uses). The **single accent is old-gold** on the exit choice-cards. Justification: the gold seed was chosen for "physical objects at the table — dice, brass fittings"; doors/keys/navigation *are* that register, so the accent is earned, not decorative. Hidden-door cards use `--md-outline-variant` dashed borders + muted gold text. No new hues.
- **Type (M3 scale as-is):** room title = Headline Small; entry-group labels = Label Small caps; body = Body Large (wrapped in `DiceText`); exit-card door name = Label Large, destination room = Title Medium. Reuse the gold dice-pill motif in prose.
- **Layout:** rail + room page + breadcrumb, per the chosen wireframe.
- **Signature:** the **gold exit choice-card** — it turns the door edge-list into the primary way you move, evoking a gamebook while staying fully inside M3. Everything else stays quiet neutral so the exits are the one bold thing (spend boldness once; restraint everywhere else).
- **Self-critique / what was cut:** a storybook display font and a full-screen gamebook layout were both considered and dropped to stay cohesive with the spells/monsters/weapons pages and honor "closer to the old design." The gold exit-card is where the risk is spent.
- **Accessibility floor (every stage):** visible focus rings on rail rows / exit cards / breadcrumb links; don't rely on hue alone (exit cards pair the gold with the 🚪 icon + text; hidden doors add a 🗝 + "DC N" label); respect `prefers-reduced-motion` on rail collapse / any transition.

---

## ✅ Stage 1 — Typed read-model + selectors (foundation, no UI) [COMPLETE]

**Goal:** one tested module that turns the opaque blob into typed rooms/doors/exits. Everything
else reads this; it is verifiable with zero browser.

**Built** `frontend/src/features/dungeons/dungeonModel.ts` with:
- Interfaces: `GeneralInfo`, `DungeonEntry`, `DungeonRoom`, `DungeonDoor`, `DungeonData`, `ThreatHints`,
  and normalized `RoomExit = { door: DungeonDoor; toRoomId: number; toRoom?: DungeonRoom; isHidden: boolean; hiddenDc: number | null }`.
- Shared helpers extracted from dungeonForm: `asRecord`, `asArray`, `str`.
- Pure selectors: `parseDungeonData(data)`, `getRooms(d)`, `getRoomById(d, roomId)`,
  `getExitsFromRoom(d, roomId)` (handles scalar/array `leads_to`, self-loops, deduplicates by destination),
  `groupEntriesByType(room)` (7 emoji-labeled buckets + "Other"), `getRoomThreatHints(room)`.

**Graph structure** (normalized, renderer-agnostic):
- `DungeonGraph = { nodes: RoomNode[]; edges: DoorEdge[] }` with optional geometry slots (`position`, `floorId`).
- `getRoomGraph(d)` — single source of truth for connectivity (rail, exits, future map all consume it).
- `getExitsFromRoom` derives from graph to ensure consistency; deduplicates first door per destination.
- `getAdjacentRoomIds(d, roomId)` convenience function.

**Test gate** (`src/features/dungeons/__tests__/dungeonModel.test.ts`): 31 tests pass, covering:
- Parsing opaque data; room/exit queries; hidden doors + DC; graph structure + threat hints.
- Scalar/array `leads_to`, self-loops, deduplication, edge cases (null inputs, missing keys).
- End-to-end dungeon traversal (BFS from entry room reaches all rooms).
- Graph edges match exit queries (exits derive from graph edges).

**Updated** `dungeonForm.ts` to use `parseDungeonData` (no more duplication).

All 119 frontend tests pass. Stage 1 complete; ready for Stage 2.

---

## ✅ Stage 2 — Routes + dungeon shell (deep-linkable room pages) [COMPLETE]

**Goal:** URLs that land on a dungeon and a specific room; the rail + room region shell.

**Built:**
- `router.tsx`: added `/dungeons/:dungeonId` and `/dungeons/:dungeonId/rooms/:roomId` routes → `DungeonViewPage`.
- `DungeonViewPage.tsx` + `.css`: room-per-page experience with:
  - **Rail** (left, `surface-dim`): room list with threat hints (⚠️ trap, 👹 monster, 👥 encounter); current room highlighted with `●`.
  - **Room panel** (right): full room detail (title, entries grouped by type with emoji buckets), exit choice-cards (gold old-gold on `secondary-container`, hidden with 🗝 + DC label + dashed border).
  - **Error handling**: friendly "not found" messages for unknown dungeons/rooms; auto-navigate to first room when no roomId specified.
  - **Navigation**: rail clicks + exit card clicks navigate via `useNavigate`.
  
- `DungeonBrowserPage.tsx`: added "Enter" button (gold, in footer) → navigates to `/dungeons/:id`.

**Styling:**
- Rail: `surface-dim` background, button-style rows, threat hint icons on right.
- Room panel: entry groups with emoji labels, exit cards with gold old-gold accent (old-gold), hidden doors with dashed outline-variant.
- Responsive: exit cards flex-wrap on mobile, DC label moves below.

**All 119 frontend tests pass.** DungeonBrowserPage tests wrapped in `<BrowserRouter>` to support `useNavigate`.

**Manual verification (next):** Enter dungeon from browser, land on first room, follow exit cards, rail stays in sync, refresh preserves position.

---

## Stage 3 — Room detail rendering (full content)

**Goal:** a room page that shows *everything* the seed holds, not just title + flat content.

**Build** a `RoomPanel` (in `DungeonViewPage.tsx` or its own file): room title (Headline), then
`groupEntriesByType` rendered under the emoji group labels; each entry = title + content wrapped in
`DiceText`. Surface the rich fields already in the data: `is_hidden`/`hidden_dc` badge on hidden
entries, `container`/`container_mechanics`, `treasure_contents` (qty × name (value)), `count`.
Cross-reference ids (`monster_id`, `encounter_id`, room `npcs[]`) render as clearly-marked chips
(e.g. "Encounter: #1", "NPC #4") — **name resolution + hover pop-outs are deferred to Stage 7**,
this stage just shows the ref, not a raw dump. `variant="neutral"`, existing `Card`/surface styles.

**Test gate:** a room with a trap + encounter + feature shows all three groups with content; a
hidden entry shows the hidden badge; `2d6`-style notation renders as gold pills. Component test +
live check on a real seed room. **Done when** a room page reads as a usable DM room brief.

---

## Stage 4 — Exit choice-cards (the signature navigation)

**Goal:** move between rooms through prominent, clearly-labelled door choices.

**Build:** below the room content, an **"Exits →"** region rendering `getExitsFromRoom(d, roomId)`
as choice cards — `🚪` + door title + `→` destination **room name**, each a `Link` to
`/dungeons/:id/rooms/:destId`. Style with the **secondary old-gold container** tokens (the one
accent). Hidden doors: `🗝` marker + "(DC N)" + dashed `outline-variant` border, muted gold — the
DM sees them; they're the reveal affordance. Dead-end rooms show a quiet "No visible exits."

**Test gate:** from a known room, every door on it appears as a card pointing to the correct
destination title; clicking lands on that room and the rail highlight moves; a hidden door shows
its DC + marker. **Live reachability walk:** starting at the entry room and only following exit
cards, every room in each seed is reachable (parity with v1 `goToRoom`). **Done when** the dungeon
is fully traversable by clicking exits alone.

---

## Stage 5 — Breadcrumb trail + rail orientation

**Goal:** always know where you are and how you got here; jump anywhere.

**Build:**
- **Breadcrumb bar** (`surface-2`, above the room): `Dungeon Title › … › Current Room`. Track the
  visited path in a pure reducer (`trailReducer(trail, roomId)` — append, and collapse when you
  revisit an earlier room, since the graph has cycles). Persist per-dungeon in `sessionStorage` so
  refresh keeps position + trail. Clicking a crumb navigates back and truncates the trail.
- **Rail:** room-index list with the current room highlighted (`●`); each row shows at-a-glance
  threat hints from `getRoomThreatHints` (⚠️ trap, 👹 monster, 👥 encounter). Collapsible (v1 had a
  `.collapsed` rail + a `→` re-open button; the rebuild plan's open item "side panels being
  completely collapsable" backs this). If `data.map_image` is ever non-null, show it above the list;
  both current seeds are null, so guard the conditional (no empty box).

**Test gate:** unit-test `trailReducer` (append, revisit-collapse, truncate-on-crumb-click);
walking 3 rooms builds a 3-crumb trail, clicking crumb 1 resets it, refresh preserves position;
rail highlights the current room and collapses/expands. **Done when** orientation + jump-anywhere
work and survive refresh.

---

## Out of scope (later phases — do NOT build now)

- **Stage 6 — Editor round-trip fix (first task of the future *editing* phase).** The current
  `dungeonForm.ts` / `DungeonEditor.tsx` are **lossy**: on save they force every entry to
  `entry_type: "feature"` and **drop** room `npcs[]`, `entry.monster_id`, `encounter_id`,
  `trap_ids`, `treasure_contents`, `hidden_dc`, `container*`. Before any per-room editing ships,
  rework `dungeonForm` to round-trip the full entry shape, and make the Stage-1 `dungeonModel.ts`
  types the shared source the editor and viewer both use. "Rooms individually editable" then hangs
  an Edit affordance off each room page. Flagged here so it isn't forgotten; **not planned in detail
  per the user's instruction.**
- **Stage 7 — Cross-reference hover pop-outs (later enhancement).** Turn the Stage-3 ref chips
  (monster / NPC / encounter) into hover/click stat-card pop-outs (v1 had `showMonsterCardPopup` /
  `showNpcCardPopup`), fetching via the monster/npc/encounter API. Needs its own data-fetch layer;
  kept out of the core navigation stages deliberately.
- **Floors & stairs:** v1 supported multi-floor dungeons (floor dropdown, ↑/↓ stair links). The two
  current seeds are single-floor and have no `floors`/`stairs` keys, so Stages 1–5 build flat and
  **degrade gracefully**; full floor/stair navigation is a later add if multi-floor dungeons are
  authored.
- **Stage 8 — Clickable programmatic map (later; the reason Stage 1 emits `DungeonGraph`).** A
  visual map where rooms are clickable hotspots that navigate to the room page, drawn *from the
  data*. It consumes Stage 1's `getRoomGraph` unchanged: auto-layout the nodes (e.g. dagre / a
  force-directed pass) when `RoomNode.position` is absent, or honor stored coordinates once a map
  editor writes them. **Not planned in detail now** — the only requirement this plan enforces is
  that the graph structure + optional geometry slots exist so this becomes purely additive UI, not a
  data-model rework.

---

## Verification (whole feature)

- **Per stage:** the stage's own gate above (vitest unit/component tests + a live check).
- **End-to-end (after Stage 5):** run backend `uvicorn app.main:app` (from repo root or `backend/`)
  + `npm run dev`; drive with browser automation. Enter Isly Castle from `/dungeons`, land on the
  entry room, read full detail, follow exit cards through the whole dungeon confirming every room is
  reachable, watch the breadcrumb trail build and collapse on revisit, jump via the rail, collapse
  the rail, refresh mid-dungeon and confirm position/trail persist. Run `npm run test` (frontend)
  and `pytest` (backend, unchanged) — both green. No console errors.
