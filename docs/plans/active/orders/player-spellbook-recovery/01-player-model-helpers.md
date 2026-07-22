WORK ORDER 01 — Player statblock formatting helpers
GOAL: a `playerModel.ts` module with pure formatting helpers for Player, mirroring the existing NPC
equivalents, so later orders can render a compact stat strip and a Full Profile without duplicating
formatting logic.
DEPENDS ON: none

KNOWN STATE (already true — do NOT redo or re-derive):
- `frontend/src/api/types.ts` `Player` (line ~453) carries the exact same statblock fields as
  `NPCStatblockFields` (line ~504): `sizes, alignment, creature_type, ac, hp, speed, abilities,
  saving_throws, skills, passive_perception, damage_resistances, damage_immunities,
  damage_vulnerabilities, condition_immunities, senses, languages, features`. All are optional.
- `frontend/src/features/npcs/npcModel.ts` already implements everything needed, typed against `NPC`:
  `abilityModifier`, `formatModifier`, `getAbilityScores(npc)`, `formatMovementSpeed`,
  `formatMovementSpeeds(speeds)`, `formatSense`, `formatSenses(senses)`, `identityLine(npc)`,
  `hasCombatStats(npc)`, `hasStatblock(npc)`, `npcToMonsterView(npc): Monster`.
  `formatMovementSpeeds` and `formatSenses` already take plain `MovementSpeed[]`/`Sense[]` (not
  NPC-typed) — they can be imported and reused as-is, no duplication needed.
  `getAbilityScores`, `identityLine`, `hasCombatStats`, `hasStatblock`, `npcToMonsterView` are typed
  against `NPC` and read fields directly (e.g. `npc.abilities`, `npc.ac`) — since `Player` has the same
  field names and shapes, the Player versions are near-identical bodies with the parameter retyped.
- `npcToMonsterView` builds a full `Monster` object, filling absent NPC-only fields (`aliases: []`,
  `family: null`, `cr_sort: null`, `experience_points: npc.experience_points ?? null`, `audio_path:
  null`) with an `EMPTY_FEATURES` fallback for `features`. `Player` has no `cr`, `cr_note`, or
  `experience_points` fields at all — use `null` literals for those three in the player version instead
  of reading them off Player.
- `Player.name` and `Player.id` exist directly on the type (no NPC-style identity wrapper needed).
- There is no existing `PlayerStatblockFields` type alias; write the helper signatures against
  `Player` directly.

START IN:
- frontend/src/features/npcs/npcModel.ts (the file being mirrored)
- frontend/src/features/npcs/__tests__/npcModel.test.ts (test shape to mirror)
- frontend/src/api/types.ts (Player and Monster interfaces)

DO:
- Create `frontend/src/features/players/playerModel.ts` exporting, typed against `Player`:
  `getAbilityScores(player)`, `identityLine(player)` (class_/subclass/ancestry/background — pick a
  sensible short join, e.g. class_ + level, since Player has no race/gender/background triplet like
  NPC), `hasCombatStats(player)`, `hasStatblock(player)`, `playerToMonsterView(player): Monster`.
  Re-export/import `formatMovementSpeeds` and `formatSenses` from `../npcs/npcModel` rather than
  redefining them.
- Add `frontend/src/features/players/__tests__/playerModel.test.ts` covering `hasCombatStats`,
  `hasStatblock`, and `playerToMonsterView` on a minimal and a fully-populated Player fixture.

STOP WHEN: `npm test playerModel` passes. Then stop — do not touch PlayerBrowserPage.tsx.

STATUS: <-- executor writes DONE, or FAILED - <one-line reason>
