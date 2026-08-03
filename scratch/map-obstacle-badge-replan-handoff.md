# Map Obstacle Badge Replan Handoff

Date: 2026-08-03

## Why This Handoff Exists

The `map-obstacle-state` plan was treated as complete, but its visual contract was planned too
narrowly. The current DM-side marker still shows the badge composition that the product owner
recognizes as the old badge system. The earlier diagnosis focused on `/play` receiving the shared
descriptor and missed that the DM marker itself was not visually rebuilt to the intended token
system.

This document is a re-planning handoff, not an implementation authorization.

## Corrected Observation

The supplied DM screenshot is the authoritative symptom for this follow-up:

- A fixture marker has an outer peach identity ring/body.
- A smaller pink status disc is nested inside it.
- The result still reads as the old DM badge treatment, despite the Stage 5 claim that the badge
  system had been rebuilt.
- This is not a browser-cache or production-rebuild diagnosis. The current source intentionally
  renders this composition.

The previous screenshot from `/play` was a separate player surface and was incorrectly treated as
the primary problem.

## Verified Current Code

- `frontend/src/features/dungeons/maplab/PropMarker.tsx` renders a fixture identity marker and a
  `BadgeRing` status disc.
- `frontend/src/features/dungeons/maplab/StairMarker.tsx` and `PortalMarker.tsx` use the same
  identity-marker-plus-status-ring composition.
- `frontend/src/features/dungeons/maplab/DoorMarker.tsx` renders a status `BadgeDisc` alongside
  the door leaf.
- `frontend/src/map/markerBadges.ts` contains both the nested fixture-state descriptors and the
  older flat `markerBadges()` vocabulary.
- `frontend/src/features/dungeons/maplab/maplabPresentation.ts` still contains legacy
  `passagePresentation`, `passageStateChips`, and related flat-passage presentation code.
- `/play` now uses `playerFixtureBadge` and the shared `BadgeDisc`; that path is not the remaining
  visual mismatch identified by the screenshot.

## Contract Error To Correct

The plan conflated these two requirements:

1. Share a descriptor/renderer implementation between audiences.
2. Make the DM and player marker visuals express the same rebuilt token language.

It implemented the first partially, while retaining the old DM identity-ring/status-disc
composition and calling that a successful visual migration. Audience-specific activation rules are
valid, but they do not justify retaining an obsolete DM badge anatomy if the product intent is a
full token-system rebuild.

## Replanning Questions

These decisions must be settled before another implementation stage:

- Should the DM status token replace the fixture identity ring, or should both remain with a new
  visual relationship?
- Should the DM and player status discs use the same size, placement, and shape, with only active
  state filtering differing?
- Is the peach outer ring still a required fixture identity cue, or is it itself part of the old
  badge system to remove?
- Should multiple DM statuses remain collapsed into one disc, or should the DM surface show the
  individual active statuses using the new token language?
- Which flat legacy presentation functions are still required for non-marker inspector behavior,
  and which should be deleted as part of the replan?

## Evidence And Checks Already Run

- Focused player, curtain, and badge tests passed: 77 tests.
- Frontend typecheck passed.
- Frontend production build passed.
- Frontend lint passed with existing unrelated warnings.
- Documentation checking is currently blocked by a stale generated block in `docs/TESTING.md`.

## Current Worktree Note

The badge fix work is uncommitted and mixed with other pre-existing worktree changes. Do not
revert or clean the worktree as part of the replan. Treat this document as the handoff point for a
new product/UX decision and a replacement plan stage.
