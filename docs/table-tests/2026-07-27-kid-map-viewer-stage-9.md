# Table Test — 2026-07-27 — Kid Map Viewer Stage 9

> **Status:** pending

- **Plan:** [Kid Map Viewer](../plans/active/kid-map-viewer/kid-map-viewer.md) — Stage 9, work order `01-second-table-test-record`
- **Build:** *(pending — record after session)*
- **Device:** *(pending — record device, browser, and network setup used)*
- **Operators:** Pip (6), Lark (4) — *(same cohort as first session; confirm ages and any new participants)*
- **Content:** Untitled Dungeon (`dungeon_id` 4) — same dungeon as the first table test. 51 rooms, 32 doors, 5 stairs, four floors holding 38 / 11 / 1 / 1 rooms; 12 rooms carry no squares and 13 carry no title.
- **Previous record:** [2026-07-23 Player App Skeleton Stage 6](2026-07-23-player-app-skeleton-stage-6.md)

**What this session tests, and what it does not:** Stage 9 tests the spoken map language — whether the four colour families (green/yellow/blue/pink) and the striped-party-room handle land with children at the table. Everything built in Stages 1–8 (shared canvas, curtain, one-floor view, slab picker, solved palette, discs and glyphs, party marker, follow-until-touched) is implemented but was not individually re-verified on glass before this session. Code defects found during the session are recorded as observations; they are not the focus.

## Setup

Checked items denote what was confirmed on real glass before the session; unchecked items were assumed working from earlier stages.

**Before anything else**

- [ ] Commit the working tree. *(Record the build SHA after commit.)*
- [ ] Paste the resulting sha into **Build** above.

**Serving to the tablet**

- [ ] Backend bound to `0.0.0.0`; Vite `server.host` is `0.0.0.0`.
- [ ] If serving the built app (`demo_up.ps1` serves `frontend/dist`), rebuild the frontend first.
- [ ] Windows firewall allows inbound on the port.
- [ ] Tablet and laptop on the same wifi; laptop LAN IP noted.
- [ ] Database seeded — `seed_database.py --dungeons` — and Untitled Dungeon opens in Map Lab.

**Set the table**

- [ ] Map Lab → Untitled Dungeon → Session tray → **Put at the table**. Confirm "At the table" state.
- [ ] Tablet browses to `http://<laptop-ip>:<port>/play`, taps Map, and the school appears.
- [ ] DM sets the party room via **Party is here** in the inspector.

**Tablet hygiene**

- [ ] Auto-lock set to Never or long.
- [ ] Fullscreen / added to home screen, plus Guided Access (iPad) or Screen Pinning (Android).
- [ ] Brightness up.

**Hand-verify before the children touch it**

- [ ] One-finger pan moves the map on real glass.
- [ ] Two-finger pinch zooms and does not fight browser page zoom.
- [ ] A room title is readable at a comfortable zoom, at arm's length, from a child's seat.
- [ ] The stripy room hatch and persistent name render on the party room.
- [ ] A coloured disc (green stair, yellow door, blue chest, pink NPC) is visible on screen and in the expected family colour.
- [ ] The stacked-slab floor picker shows all four floors and tapping a slab switches the view.
- [ ] Tapping a green stair disc changes floor.
- [ ] Switch the at-the-table dungeon to another on the laptop; the tablet follows within ~5s. Switch back.
- [ ] Lock the tablet, wait 30s, unlock — map is present and current, no blank frame.

## Watching for

| # | Question | What the answer would change | What happened |
|---|---|---|---|
| 1 | Do the four families get named out loud — "green goes somewhere", "yellow is a way through", "blue is a thing", "pink is a person"? | The colour-language thesis is the centre of this stage. If the names do not land unprompted, the fog plan inherits a failing premise and must choose between re-solving the palette, adding text labels, or abandoning the family-colour approach. | *(pending)* |
| 2 | Does a door leaf read as an open door? (Yellow disc on the wall with a leaf swung into the room.) | The leaf is the only open/closed cue on the tablet. If it is not read as "open", the fog plan must add a secondary state indicator (e.g. open badge, colour shift). | *(pending)* |
| 3 | Does the stripy room read as "us" — the spoken handle — without being pointed out? | The party-room hatch is the single non-hue signal on the plate. If it goes unnoticed, the fog plan needs a different party indicator (pulsing border, marker avatars). | *(pending)* |
| 4 | Do stairs get tapped without help? (Green disc with chevron, changes floor on tap.) | Stair tapping is the only floor-change path besides the slab picker. Unprompted use validates the disc affordance; failure to tap sends the fog plan back to stair visibility and hit area. | *(pending)* |
| 5 | Is the stacked-slab picker understood — does anyone tap a different floor slab unprompted? | The slab picker is the floor indicator and the floor control in one object. If it is not tapped unprompted, the fog plan may need a more visible floor selector or an auto-reveal heuristic. | *(pending)* |
| 6 | Are names found by scanning, or does the child search room by room? | Constant on-screen label size was the fix for Stage 6's "scanning, not reading" finding. If scanning still fails, the fog plan revisits label density and fade thresholds. | *(pending)* |
| 7 | Can the four-year-old identify anything without reading — by disc colour, shape, or position? | The four-year-old's ability to participate without literacy is a hard requirement for the whole project. A "no" here outranks every other finding and forces the fog plan to rely on colour, shape, and position alone. | *(pending)* |

## Standing questions

| # | Question | Answer |
|---|---|---|
| 1 | Did anyone name a colour family unprompted ("the green one", "the yellow dots")? | *(pending)* |
| 2 | Did the four-year-old pick up or echo any of the colour names? | *(pending)* |
| 3 | Did the stripy room get a spontaneous name before being told? | *(pending)* |
| 4 | Did anyone tap a green disc expecting it to be a stair? Did anyone not realise it was a stair after tapping? | *(pending)* |
| 5 | Did anyone try to tap a room expecting something to happen? (Inspector is not built.) | *(pending)* |
| 6 | Did anyone ask for something that was on the map but not findable? | *(pending)* |
| 7 | Did anyone ask to see a different floor without using the slab picker or stair discs? | *(pending)* |
| 8 | *(carried from first record)* Did they remember something because of the app? | *(pending)* |

## Observed

*(Record session notes, spontaneous remarks, and any unexpected behaviour here.)*

-

## Asked afterwards

Ask Pip first, then Lark separately.

| Question | Pip (6) | Lark (4) |
|---|---|---|
| What do the green things mean? / What colour are the stairs? | *(pending)* | *(pending)* |
| What do the yellow things mean? / What colour are the doors? | *(pending)* | *(pending)* |
| What colour are the people (NPCs) — the pink ones? | *(pending)* | *(pending)* |
| What colour are the chests and barrels — the blue ones? | *(pending)* | *(pending)* |
| Point to our room — the stripy one. | *(pending)* | *(pending)* |
| Show me on the tablet where we started tonight. | *(pending)* | *(pending)* |
| How would you get from here to here? *(Pick two rooms on different floors.)* | *(pending)* | *(pending)* |
| Can you find the door that is open? How can you tell? | *(pending)* | *(pending)* |
| Was there anything you wanted to touch but nothing happened? | *(pending)* | *(pending)* |
| Was there anything on there you did not understand? | *(pending)* | *(pending)* |

## Verdict

- **Worked:** *(pending — summarise what worked well for the spoken language)*
- **Broke:** *(pending — summarise what did not work or was not understood)*
- **Surprised me:** *(pending — note anything unexpected about how the children used or talked about the map)*

## Actions

Every finding routes to the [Kid Map Viewer](../plans/active/kid-map-viewer/kid-map-viewer.md) plan and feeds into the downstream fog plan (the plan that will define how knowledge is revealed to children at the table). The fog plan is the consumer of this record; it will use the findings to decide whether the colour-language premise holds, whether the party-room hatch needs reinforcement, and which affordances need revision before the fog layer is designed.

| What | Where it went |
|---|---|
| Colour-family naming — whether green/yellow/blue/pink were used unprompted by either child | Fog plan — premise validation: if the four families are named correctly, the fog plan inherits the colour language as-is. If not, it must choose between re-solving the palette and adding text labels. |
| Door leaf reading — whether the open leaf was recognised as "open" by either child | Fog plan — open/closed affordance: if the leaf is missed, the fog plan must add a secondary state indicator (e.g. open badge, colour change, or animation). |
| Stripy room recognition — whether the hatch was read as "us" without prompting | Fog plan — party-room signal: if the hatch goes unnoticed, the fog plan must consider a different party indicator (pulsing room, marker avatars, coloured ring). |
| Stair tapping — whether stairs were used unprompted by either child | Fog plan — floor-change model: unprompted use validates the disc affordance; repeated failure to tap sends the fog plan back to stair visibility and hit-target size. |
| Slab picker understanding — whether a different floor was selected unprompted | Fog plan — floor discovery: if the picker goes untouched, the fog plan may need a more visible floor selector or an auto-reveal heuristic that follows the party. |
| Name scanning — whether labels were found by scanning or room-by-room search | Fog plan — label density: if scanning still fails, the fog plan inherits a constraint on how many labels can be visible through fog. |
| Four-year-old participation — whether Lark identified anything by disc colour, shape, or position without reading | Fog plan — non-literacy requirement: a "no" here forces the fog plan to rely entirely on colour, shape, and position, which may limit what information the fog can reveal to the youngest player. |
| Spontaneous colour-family names or stripy-room handle — whether the language was adopted during play | Fog plan — spoken-language stickiness: spontaneous use confirms the language is sticky; absence means it did not survive the shift from explanation to play. |

---

## STATUS:

## DEVIATIONS:
- KNOWN STATE re-verified or wrong:
