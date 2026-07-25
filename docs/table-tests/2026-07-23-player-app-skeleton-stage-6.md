# Table Test — 2026-07-23 — Player App Skeleton Stage 6

> **Status:** planned

- **Plan:** [Player App Skeleton](../plans/active/player-app-skeleton.md) — Stage 6, work order `03-session-run`
- **Build:** `<git sha — commit before the session and paste it here>`
- **Device:** `<tablet, browser, how it was launched>`
- **Operators:** Pip (6), Lark (4)
- **Content:** Widdershins Academy
- **Previous record:** none — this is the first table test.

*Rename this file to the date you actually play if it is not the 23rd.*

**What is deliberately absent, so it is not recorded as a fault:** there is no fog — the curtain is a
documented pass-through, so the tablet shows the entire school, all floors, every room title. There
is no per-object knowledge: hidden doors draw as ordinary doors and no lock, trap, or DC is rendered
at all. Nothing is tappable. Stairs, props, portals, room entries and NPCs are not drawn. There is no
identity, no spells, no gear. This session tests **the device**, not the ratchet.

## Setup

**Before anything else**

- [ ] Commit the working tree. Stage 5.4, the `0.0.0.0` host changes in `vite.config.ts`,
      `start_server.ps1` and `demo_up.ps1`, and the doc edits are all uncommitted.
- [ ] Paste the resulting sha into **Build** above.

**Serving to the tablet**

- [ ] Backend bound to `0.0.0.0`; Vite `server.host` is `0.0.0.0`.
- [ ] **If serving the built app** (`demo_up.ps1` serves `frontend/dist`), rebuild the frontend first —
      otherwise `dist` contains no `/play` app and no "Put at the table" button.
- [ ] Windows firewall allows inbound on the port. *(The classic silent failure: laptop fine, tablet
      times out.)*
- [ ] Tablet and laptop on the same wifi; laptop LAN IP noted.
- [ ] Database seeded — `seed_database.py --dungeons` — and Widdershins Academy opens in Map Lab.

**Set the table**

- [ ] Map Lab → Widdershins Academy → Session tray → **Put at the table**. The control should switch
      to "At the table" and disable.
- [ ] Tablet browses to `http://<laptop-ip>:<port>/play`, taps Map, and the school appears.

**Tablet hygiene**

- [ ] Auto-lock set to Never or long.
- [ ] Fullscreen / added to home screen, plus Guided Access (iPad) or Screen Pinning (Android). The
      in-app no-exit audit does not cover the browser's own back button and address bar — that is the
      only real exit, and a six-year-old will find it.
- [ ] Brightness up. The map is thin lines on a flat fill.

**Hand-verify before the children touch it** — unit tests are green and have missed a real-glass hit
target before.

- [ ] One-finger pan moves the map on real glass.
- [ ] Two-finger pinch zooms and does not fight browser page zoom.
- [ ] A room title is readable at a comfortable zoom, at arm's length, from a child's seat.
- [ ] Switch the at-the-table dungeon to The Underlake Annex on the laptop; the tablet follows within
      ~5s. Switch back.
- [ ] Lock the tablet, wait 30s, unlock — map is present and current, no blank frame.
- [ ] Kill the laptop's wifi for 10s — the last good map stays on screen, no blank and no error.

## Watching for

| # | Question | What the answer would change |
|---|---|---|
| 1 | Can the six-year-old read room titles unaided? Can the four-year-old identify anything without reading — shape, position, colour? | Legibility is the floor everything else stands on. A no here outranks every other finding and reshapes the renderer before Plan 1. |
| 2 | Does the map read as a **place** — do they orient, "we came from there", "that's next to the library"? | This is the core thesis of the whole project. Fog cannot fix it if it is false, and Plan 1 would be building on sand. |
| 3 | Do they pan and zoom without instruction? Do they get lost in empty space with no way back? | A recentre affordance is the one control I would consider adding that is not an exit. |
| 4 | How many times does a child tap a room expecting something to happen? | That count is the mandate — or the refusal — for Plan 2's room detail. |
| 5 | Does anyone notice the 5s poll lag, or ask you to refresh? | Polling is the whole of liveness. If it is invisible, that decision is settled; if not, push is a swap behind the same read model. |
| 6 | All three floors render side by side in one viewBox, scaled to fit, with no floor switcher. Is that usable on a tablet? | My strongest prediction for what this session teaches. Fog may quietly solve it by revealing one floor at a time — worth not solving twice. |
| 7 | Who holds the tablet? Do they fight over it? | Tests the shared-device assumption that the two-zone model (party-shared map, personal spells) rests on. |
| 8 | Does anyone act on knowledge the fiction never gave them? | Guaranteed this session — the whole school is visible. Record it as **confirmation of Plan 1's premise**, not as a bug. |

## Standing questions

| # | Question | Answer |
|---|---|---|
| 1 | Did anyone pick the device up unprompted? | |
| 2 | Did it pull attention **off** the table? | |
| 3 | Could the older child use it without help? The younger? | |
| 4 | Did anyone ask you to refresh it, or say it was wrong? | |
| 5 | Did anyone know something the fiction never told them? | |
| 6 | *(answered in the **next** record)* Did they remember something because of the app? | |

## Observed

*Ugly bullets, within 24 hours. Paper at the table, transcribe after.*

-

## Asked afterwards

Ask Pip first, then Lark separately.

| Question | Pip (6) | Lark (4) |
|---|---|---|
| Show me on the tablet where we started tonight. | | |
| Point to the room where `<thing that happened>` happened. | | |
| What's this room called? *(pick three, one small)* | | |
| How would you get from here to here? | | |
| Was there anything you wanted to touch, but nothing happened? | | |
| Was there anything on there you didn't understand? | | |
| Did you want to look at it, or did you want to be looking at the table? | | |

## Verdict

- **Worked:**
- **Broke:**
- **Surprised me:**

## Actions

| What | Where it went |
|---|---|
| | |
