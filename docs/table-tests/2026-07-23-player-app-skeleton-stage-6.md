# Table Test — 2026-07-26 — Player App Skeleton Stage 6

> **Status:** historical — legacy Plan-coupled record; not an authoritative current-contract record

- **Legacy Plan:** [Player App Skeleton](../plans/done/player-app-skeleton/player-app-skeleton.md) — Stage 6, work order `03-session-run` (historical routing only)
- **Build:** `e1687738c650095fade7a50a03072c479d53eab5`
- **Device:** tablet browser over the LAN to the Vite dev server; DM on the laptop at
  `http://127.0.0.1:5173/dungeons/4`. Tablet model not recorded.
- **Operators:** Pip (6), Lark (4)
- **Content:** Untitled Dungeon (`dungeon_id` 4) — NOT WIDDERSHINS. I SELF AUTHORED. 51 rooms,
  32 doors, 5 stairs, four floors holding 38 / 11 / 1 / 1 rooms; 12 rooms carry no squares and 13
  carry no title.
- **Previous record:** none — this is the first table test.

**What is deliberately absent, so it is not recorded as a fault:** there is no fog — the curtain is a
documented pass-through, so the tablet shows the entire school, all floors, every room title. There
is no per-object knowledge: hidden doors draw as ordinary doors and no lock, trap, or DC is rendered
at all. Nothing is tappable. Stairs, props, portals, room entries and NPCs are not drawn. There is no
identity, no spells, no gear. This session tests **the device**, not the ratchet.

## Setup

**Before anything else**

- [ x] Commit the working tree. Stage 5.4, the `0.0.0.0` host changes in `vite.config.ts`,
      `start_server.ps1` and `demo_up.ps1`, and the doc edits are all uncommitted.
- [ ] Paste the resulting sha into **Build** above.

**Serving to the tablet**

- [ x] Backend bound to `0.0.0.0`; Vite `server.host` is `0.0.0.0`.
- [ x] **If serving the built app** (`demo_up.ps1` serves `frontend/dist`), rebuild the frontend first —
      otherwise `dist` contains no `/play` app and no "Put at the table" button.
- [ x] Windows firewall allows inbound on the port. *(The classic silent failure: laptop fine, tablet
      times out.)*
- [ x] Tablet and laptop on the same wifi; laptop LAN IP noted.
- [ x] Database seeded — `seed_database.py --dungeons` — and Widdershins Academy opens in Map Lab.

**Set the table**

- [ x] Map Lab → Widdershins Academy → Session tray → **Put at the table**. The control should switch
      to "At the table" and disable.
- [ x] Tablet browses to `http://<laptop-ip>:<port>/play`, taps Map, and the school appears.

**Tablet hygiene**

- [ N] Auto-lock set to Never or long. -- **didn't set this, there was a reload animation when changing tab or reopening**
- [ N] Fullscreen / added to home screen, plus Guided Access (iPad) or Screen Pinning (Android). The
      in-app no-exit audit does not cover the browser's own back button and address bar — that is the
      only real exit, and a six-year-old will find it.
- [ N] Brightness up. The map is thin lines on a flat fill. **left at standard**

**Hand-verify before the children touch it** — unit tests are green and have missed a real-glass hit
target before.

- [ x] One-finger pan moves the map on real glass.
- [ x] Two-finger pinch zooms and does not fight browser page zoom.
- [ N] A room title is readable at a comfortable zoom, at arm's length, from a child's seat. **they're also not centred inside rooms and become orphaned**
- [ x] Switch the at-the-table dungeon to The Underlake Annex on the laptop; the tablet follows within
      ~5s. Switch back.
- [ N] Lock the tablet, wait 30s, unlock — map is present and current, no blank frame. **some reloading was seen at times**
- [ N/A] Kill the laptop's wifi for 10s — the last good map stays on screen, no blank and no error. **not concerned ,we can drop this**

## Watching for

| # | Question | What the answer would change | What happened |
|---|---|---|---|
| 1 | Can the six-year-old read room titles unaided? Can the four-year-old identify anything without reading — shape, position, colour? | Legibility is the floor everything else stands on. A no here outranks every other finding and reshapes the renderer before Plan 1. | No - doors particularly and room titles. |
| 2 | Does the map read as a **place** — do they orient, "we came from there", "that's next to the library"? | This is the core thesis of the whole project. Fog cannot fix it if it is false, and Plan 1 would be building on sand. | Yes, they can follow the room shapes. |
| 3 | Do they pan and zoom without instruction? Do they get lost in empty space with no way back? | A recentre affordance is the one control I would consider adding that is not an exit. | yes but attempted to double click many times. |
| 4 | How many times does a child tap a room expecting something to happen? | That count is the mandate — or the refusal — for Plan 2's room detail. | Only for zoom but there were no tokens so it doesn't invoke that indicidation. |
| 5 | Does anyone notice the 5s poll lag, or ask you to refresh? | Polling is the whole of liveness. If it is invisible, that decision is settled; if not, push is a swap behind the same read model. | I opened a door and it didn't appear their end. |
| 6 | All three floors render side by side in one viewBox, scaled to fit, with no floor switcher. Is that usable on a tablet? | My strongest prediction for what this session teaches. Fog may quietly solve it by revealing one floor at a time — worth not solving twice. | It is usable but definitly not preferred. I think we may need to a revisit a "you're in this room highlight" but NOT square based positions. |
| 7 | Who holds the tablet? Do they fight over it? | Tests the shared-device assumption that the two-zone model (party-shared map, personal spells) rests on. | No - the older one was pretty much in control and willing to put it down. |
| 8 | Does anyone act on knowledge the fiction never gave them? | Guaranteed this session — the whole school is visible. Record it as **confirmation of Plan 1's premise**, not as a bug. | No. Not seemingly but detail is limited atm. |

## Standing questions

| # | Question | Answer |
|---|---|---|
| 1 | Did anyone pick the device up unprompted? | Yes, but I just moved it away. This is a parening thing/|
| 2 | Did it pull attention **off** the table? | No. |
| 3 | Could the older child use it without help? The younger? | Yes for older, younger didn't need to which is ideal.|
| 4 | Did anyone ask you to refresh it, or say it was wrong? | No. |
| 5 | Did anyone know something the fiction never told them? | No. |
| 6 | *(answered in the **next** record)* Did they remember something because of the app? | |

## Observed

Size & colour needs to be more obvious; room highlighting looks pretty much necessary just so they don't have to search around. Doors are a MAJOR problem and stairs definitely need implementing. This was, however, they're most imaginative session with hte castle and I think because I was able to give direct ideas of line of sight, who would be likely to appear etc. 

-

## Asked afterwards

Ask Pip first, then Lark separately. **decided against the 4yo for this level of implemetentation**

| Question | Pip (6) | Lark (4) |
|---|---|---|
| Show me on the tablet where we started tonight. | Yes - but took some doing | |
| Point to the room where `<thing that happened>` happened. | yes, "where's the windows" in response to doing something otuside a window (which I hadn't added)| |
| What's this room called? *(pick three, one small)* | Easily| |
| How would you get from here to here? | Struggled to see doors| |
| Was there anything you wanted to touch, but nothing happened? | Double-tap to zoom/centre| |
| Was there anything on there you didn't understand? | No| |
| Did you want to look at it, or did you want to be looking at the table? | No - not once they had info (but I did have to show spells on my version)| |

## Verdict

- **Worked:** Navigation room to room, and corridors. Acorss floors.  
- **Broke:** Doors. Room name scanning (not reading)
- **Surprised me:** More consideration for overall space (they went outside the castle to under a window even though the window wasn't actually a token)

## Actions

Every finding routes to [Kid Map Viewer](../plans/done/kid-map-viewer/kid-map-viewer.md)
(originally to [Kid Map Legibility](../plans/done/kid-map-legibility/kid-map-legibility.md),
closed 2026-07-27 and superseded),
written from this record. Measurements taken afterwards against the exported layout for
`dungeon_id` 4 and `frontend/src/theme.css`.

| What | Where it went |
|---|---|
| Doors invisible — a door draws as a 7px coloured line on the wall, 0.8px on screen at the default fit and 3.2px at maximum zoom | Plan 0.5 Stage 3 — doors break the wall, leaf closed, swing arc open, never sub-pixel |
| Room names unreadable by scanning — 15px in user units is 1.7px on screen at the default fit and 6.8px at maximum zoom | Plan 0.5 Stage 2 — constant on-screen size with a fade threshold |
| Names "not centred inside rooms and become orphaned" — two causes: the label anchor is the cells' centroid, which falls outside L- and U-shaped rooms, and 12 of 51 rooms carry no squares yet still draw their name | Plan 0.5 Stage 2 (shared label anchor, and rooms with no squares draw nothing); ghosts collected at source by [Map Lab Editor Usability](../plans/done/maplab-editor-usability/maplab-editor-usability.md) Stage 7 |
| "Size & colour needs to be more obvious" — a room's fill measures 1.08:1 against the ground it sits on, and 1.49:1 against its own outline | Plan 0.5 Stage 1 — kid-map contrast rules of its own |
| Stairs not drawn at all | Plan 0.5 Stage 3 — numbered up/down badges at both ends |
| "I opened a door and it didn't appear their end" — not poll lag: door state lives in `map_session_state` and the tablet only ever fetched the at-the-table pointer and the layout | Plan 0.5 Stage 5 — poll the session blob alongside the layout |
| Room highlight wanted, "but NOT square based positions" | Plan 0.5 Stages 4–5 — a per-room party marker set by the DM, drawn filled, named and pinned |
| Double-tap attempted repeatedly | Plan 0.5 Stage 5 — double-tap anywhere re-centres on the party |
| Four floors side by side "usable but definitely not preferred" — two of the four plates hold one room each and eat half the width | Plan 0.5 Stages 5–6 — the party's floor by default, with a fold-out strip showing two floors at a time for route planning |
| Tablet reloaded on tab switch / reopen | Deferred — device plumbing, not the map. No plan yet |
| Auto-lock, fullscreen/pinning and brightness were not set up | Setup checklist for the next test; carried into Plan 0.5 Stage 7 |
| Wifi-drop check dropped as not a concern | Removed from the next record's setup |
