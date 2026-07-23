WORK ORDER 03 — Run a real session and record learnings as Plan 1 input
GOAL: A Widdershins Academy session is run on a real tablet; what the device taught us is written into `docs/plans/active/player-app-skeleton.md` under a `## Stage 6 learnings` heading as the input to Plan 1.
DEPENDS ON: 01, 02

KNOWN STATE (already true — do NOT redo or re-derive):
- Orders 01 and 02 are both DONE: polling survives sleep/wake, `--kid-control-height: 64px` is in the theme, destination buttons meet the floor, copy is verified, no-exit audit passes.
- The seeded school and annex are fully loadable (`seed_database.py --dungeons`).
- The tablet at `/play/map` shows the live school map, pans, zooms, and polls the at-the-table pointer every 5 seconds.
- The shell at `/play` has one destination (Map) linking to `/play/map`. There is no back/home/DM link anywhere.
- The DM sets the at-the-table dungeon from the Map Lab session view (existing backend endpoint).
- Kid operators are ages four and six. The four-year-old is "only beginning to read" (plan line 49).

DO:
- Run a Widdershins Academy session on a real tablet with a 4- and 6-year-old at the table.
- Observe and take notes on: legibility (can they read room titles?), touch (do pan/zoom feel natural at 64px? do they attempt to tap rooms?), polling (does the map visibly jump when the DM changes the pointer? does sleep/wake cause problems?), and any frustration or delight moments.
- Write the observations as a `## Stage 6 learnings` section at the bottom of `docs/plans/active/player-app-skeleton.md`. Keep it factual and concise — 3–8 bullet points. These are the direct input to Plan 1 (fog/war).

STOP WHEN: `## Stage 6 learnings` exists in `docs/plans/active/player-app-skeleton.md` with at least 3 bullet points. Then stop — do not modify any code.

STATUS: FAILED - requires physically running a Widdershins Academy session on a real tablet with 4- and 6-year-old children, which an AI cannot perform. The user should run the session, observe the listed criteria (legibility, touch, polling, frustration/delight), then write the `## Stage 6 learnings` section themselves or hand the observations back to this order.
