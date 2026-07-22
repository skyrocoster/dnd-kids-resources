WORK ORDER 04 — Compact stat strip + collapsed Full Profile
GOAL: a `PlayerCombatSummary` component showing an always-visible compact AC/HP/Speed/Initiative stat
strip, plus a collapsed "Full Profile" disclosure that reveals the shared monster statblock structure
(abilities, saves, skills, senses, languages, features) only when the player has that data.
DEPENDS ON: 01 (needs `playerModel.ts`'s `hasCombatStats`, `hasStatblock`, `playerToMonsterView`)

KNOWN STATE (already true — do NOT redo or re-derive):
- Plan UX decision: "show a compact stat strip" then, after Spells and Weapons, "a collapsed Full
  Profile using the shared statblock structures." Touch: 48px floor applies to the disclosure control
  too (see order 02's KNOWN STATE for the exact copy).
- The compact stat strip markup/CSS pattern already ships in
  `frontend/src/features/npcs/NPCStatCard.tsx` lines 55-76 (`npc-stat-card-strip` /
  `-strip-item` / `-strip-label` / `-strip-value`, one item per AC/HP/Speed, each only rendered when
  present) — mirror this markup, not the "pull from monster" empty-state button below it (that's
  NPC-specific and does not apply to Players).
- `playerModel.ts` (order 01) exports `hasCombatStats(player)` (true if any of ac/hp/speed present),
  `hasStatblock(player)` (true if any statblock field beyond the strip is present — abilities, saves,
  skills, senses, languages, features, damage modifiers, condition immunities), and
  `playerToMonsterView(player): Monster`.
- `Player` also carries `initiative?: number | null` — NPC has no equivalent field, so this strip needs
  one more item than NPCStatCard's: Initiative, rendered only when `player.initiative != null`.
- `MonsterStatBlock` (`frontend/src/features/monsters/MonsterStatBlock.tsx`) takes `{ monster: Monster,
  showIdentity?: boolean, showStrip?: boolean }` and renders abilities/saves/skills/senses/
  languages/features sections, each only when present on the monster. `NPCStatCard.tsx` line 79 already
  calls it as `<MonsterStatBlock monster={npcToMonsterView(npc)} showIdentity={false}
  showStrip={false} />` to avoid duplicating identity/strip — do the same with `playerToMonsterView`.
- The disclosure toggle pattern (aria-expanded/aria-controls, chevron swap, parent-owned collapsed
  state) is in `frontend/src/features/encounters/CreatureRowCard.tsx` lines 39-48;
  `ChevronDownIcon`/`ChevronUpIcon` import from `../../components/icons`. Label the toggle "Full
  Profile" (this is the plan's own term for this section — do not invent another label).
- No component currently exists for this in `frontend/src/features/players/`.

START IN:
- frontend/src/features/players/playerModel.ts (order 01's output — read it, do not modify)
- frontend/src/features/npcs/NPCStatCard.tsx (compact strip markup to mirror)
- frontend/src/features/monsters/MonsterStatBlock.tsx (Full Profile content)
- frontend/src/features/encounters/CreatureRowCard.tsx (disclosure toggle pattern)

DO:
- Create `frontend/src/features/players/PlayerCombatSummary.tsx` accepting `{ player: Player }`.
  Render the compact strip (AC/HP/Speed/Initiative, each conditional) only when `hasCombatStats(player)`
  is true. Render a "Full Profile" disclosure button below it only when `hasStatblock(player)` is true;
  expanding it renders `<MonsterStatBlock monster={playerToMonsterView(player)} showIdentity={false}
  showStrip={false} />`. When neither is true, render nothing (no empty-state copy needed here — the
  plan only asks for this section "when present").
- Add `frontend/src/features/players/PlayerCombatSummary.css`.
- Add `frontend/src/features/players/__tests__/PlayerCombatSummary.test.tsx` covering: strip renders
  present fields only, Full Profile stays collapsed until toggled, toggled state reveals ability
  scores, component renders nothing when the player has no combat data.

STOP WHEN: `npm test PlayerCombatSummary` passes. Then stop — do not wire this into
PlayerBrowserPage.tsx.

STATUS: <-- executor writes DONE, or FAILED - <one-line reason>
