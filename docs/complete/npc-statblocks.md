# NPC Statblocks — NPCs gain a combat half, built by pulling fields from monsters

> **Status:** Complete — all five stages shipped. NPCs now carry the monster statblock shape, render
> their combat half on the dossier, can pull fields from a monster, and can be added to an encounter
> roster from their detail pane.

- **Area guide:** [Reference Catalogs](../../areas/reference-catalogs.md)

## What we're building & why

An NPC today is a roleplay record with no actions, traits, attacks or spellcasting, and no route into
the encounter runner. That is fine for the 23 of 26 NPCs that are magic-school staff, and wrong for
the ones who fight — the Combat Teacher, the Portal Guardian, Fidly the Ghost, and the two horses who
will one day be ridden into a battle. Meanwhile every statblock a DM would want to reach for already
exists among the 2,276 seeded monsters, and one of the three stat-bearing NPCs (Emery Hart, "Village
Guard", AC 16) is a hand-rolled Guard that lost the ability to swing a spear.

So NPCs get the monster statblock shape in their own table, and a **pull panel**: pick a monster,
tick the fields you want, and they land on the NPC. Ticking is field-level and repeatable across
different sources, so Fidly can take the Ghost's incorporeal movement and damage immunities without
taking Possession, then take the Mage's spellcasting on a second pull. NPCs stay a separate table
from monsters — monsters are seeded reference data, NPCs are campaign-authored and will later carry
their own links to places and loot — but they stop being a *different shape*, which is what makes the
pull a straight copy instead of a lossy translation layer.

Settled by grilling, recorded here so the reasoning is not re-litigated: separate tables (lifecycle
and foreign keys), no provenance recorded after a pull, lists add while single values overwrite,
blank-by-default NPCs with pulling always optional, and the existing `BrowserLayout` shell retained.
List grouping, portraits, NPC placement and loot links are explicitly a later sweep.

## UX decisions — NPC browser detail pane

Surface:      NPC browser (`/npcs`) detail pane — existing row in Reference Catalogs `## Surfaces`
Mode:         prep
Operator:     DM
Focal:        The NPC's identity block — monogram, name, race/gender/background, composed
              appearance sentence. It keeps the largest type and the most surrounding space; the
              statblock is demoted below the roleplay notes and never competes with the name.
Route shape:  Browser (unchanged — `BrowserLayout` + `SearchList` + detail)
Edit style:   modal `Dialog` (NPC is a record with its own identity — UX_PATTERNS §Inline versus modal)
Save:         explicit `Save` in the editor. The autosave-on-edit rule is TARGET and the six modal
              editors are declared accepted debt; migrating NPC's editor belongs to its own plan.
Empty:        `StatePanel` `empty` — `No NPCs found.`
Filtered empty: `No NPCs match your search.`
No selection: `Choose an NPC from the list to see their dossier and stat block.`
              (Replaces today's `…to see their details.`, which violates the IN FORCE rule that
              the payoff be named specifically.)
Load failure: `StatePanel` `error` fills the `SearchList` region
Action failure: inline beside the control that failed, `role="status"`, persists until next action
Destructive:  `ConfirmDialog` — `Delete "<name>"? This cannot be undone.` (unchanged)
Keyboard:     DOM order; detail actions are native buttons; Escape closes the topmost dialog
Touch:        48px floor, no new exceptions
Statless state: for the 23 NPCs with no combat stats the statblock region is not blank — it shows a
              single affordance reading `No combat stats yet.` with a `Pull from a monster…` button.

## UX decisions — Pull from monster

Surface:      NEW — `Pull from monster` dialog, opened from the NPC detail pane action row.
              Add a row to Reference Catalogs `## Surfaces` as part of Stage 4.
Mode:         prep
Operator:     DM
Focal:        The tick tree. The monster picker sits above it as a single control and yields
              visual weight once a source is chosen.
Route shape:  Editor (modal `Dialog` over the browser)
Edit style:   modal — deliberately opened from the **detail pane**, not from inside the NPC editor,
              so it never nests a dialog inside a dialog and so pulling works on any saved NPC at
              any time (not only at creation).
Save:         one explicit commit — `Pull N selected` writes the NPC in a single request. This is an
              action on an existing record, not an editing session.
Empty:        no source picked yet — `Choose a monster to see what you can pull.`
Filtered empty: monster search — `No monsters match your search.`
No selection: n/a (the dialog always has an NPC)
Load failure: `StatePanel` `error` fills the tree region; the picker stays usable
Action failure: inline beside `Pull N selected`, `role="status"`
Destructive:  **No `ConfirmDialog`.** Pulling can overwrite a single value, but every overwrite is
              disclosed in place before commit — a ticked row whose field is already set renders
              `← you have 11` beside the incoming value. The commit button is itself the confirm
              step; stacking a second confirm on it would be friction without benefit. This is a
              deliberate reading of the destructive-actions rule, stated here rather than deviated
              from quietly. The marker is text, never colour alone.
Keyboard:     DOM order through picker → section toggles → rows → commit; Space toggles a checkbox;
              Escape closes the dialog unless pending
Touch:        48px per tickable row. The Ghost's ~15 rows exceed one screen, so the dialog body owns
              vertical scroll; the picker and commit button stay fixed.
Detail:       sections render only when the source monster actually has them — the Riding Horse
              shows one action and no traits, no spellcasting, no legendary actions.

## UX decisions — Add to encounter

Surface:      NEW — `Add to encounter` picker dialog, opened from the NPC detail pane action row.
              Add a row to Reference Catalogs `## Surfaces` as part of Stage 5.
Mode:         prep
Operator:     DM
Focal:        The encounter list.
Route shape:  Editor (small modal `Dialog`)
Edit style:   modal
Save:         explicit — `Add` commits one creature to the chosen encounter
Empty:        `No encounters found.` with the dialog offering nothing further; the DM creates an
              encounter on `/encounters` first
Filtered empty: `No encounters match your search.`
No selection: n/a
Load failure: `StatePanel` `error` fills the list region
Action failure: inline beside `Add`, `role="status"`
Destructive:  none — adding is additive and undone by removing the creature in the encounter editor
Keyboard:     DOM order; Enter activates `Add`; Escape closes
Touch:        48px floor
Gating:       the action is available regardless of whether the NPC has combat stats; a statless NPC
              added to an encounter is a valid roster entry with null HP/AC, exactly as a manually
              added combatant is today.

## UX decisions — NPC dossier dock

Surface:      NPC dossier dock — existing row in Reference Catalogs `## Surfaces`
              (`FloatingWindow` in `MapLabPage`, rendering `NPCStatCard` with `compact`)
Mode:         play
Operator:     DM
Focal:        Name and appearance first — at the table this window answers "who is this person".
Route shape:  bespoke persistent overlay (`FloatingWindow`, per UX_PATTERNS §Persistent overlays)
Edit style:   read-only; no editing from the dock
Save:         n/a
Empty:        n/a (the dock only opens for a chosen NPC)
Filtered empty: n/a
No selection: n/a
Load failure: `StatePanel` `error` fills the window body
Action failure: n/a
Destructive:  none
Keyboard:     Escape closes the topmost floating window
Touch:        48px floor; play surfaces get no new exceptions
Compact rule: `compact` shows identity, appearance, notes, the AC/HP/Speed strip, ability scores,
              and traits/actions — the things you read mid-scene. Saving throws, skills, senses,
              languages and defences stay out of `compact`, because the dock is glanced at while
              three children wait. Numbers that change in place use tabular numerals.

## Stages

1. Give an encounter's roster entry a typed creature reference — a source kind (`monster` or `npc`)
   plus an id — replacing the bare monster id, and migrate the three existing encounter rows. Cross-area:
   this touches the Encounters area, which has no active plan of its own. Nothing user-visible changes;
   this is the cheapest this migration will ever be, and it unblocks Stage 5 without a rush at the end.
2. Move the NPC's stat fields onto the monster shapes and add the missing statblock columns, so that a
   monster's data can be copied onto an NPC without translation. Race, gender, background, appearance
   and notes are untouched. Blast radius includes the NPC router, schemas, seed file, form and model
   helpers, the stat card, and the Map Lab consumers of `NPCStatCard` and `NpcChip`.
3. Render the combat half on the NPC dossier — traits, actions, spellcasting, defences and immunities —
   reusing the monster statblock renderer rather than forking a second one, and give the statless
   majority an explicit affordance instead of a blank region.
4. Build the pull panel as a generic component over the shared statblock shape and wire it to the NPC
   detail pane: pick a monster, tick fields, commit once. Lists add, single values overwrite with the
   overwrite disclosed inline.
5. Let an NPC be added to an encounter from their detail pane, using the typed reference from Stage 1.

## Shipped

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| 1 | Encounter roster entries now carry a typed soft reference using `creature_id` plus `source_kind` (`monster` or `npc`), replacing the monster-only `monster_id`. The three seeded encounters and frontend form/runner mappings use the new wire shape, with NPC passthrough covered by backend tests. |
| 2 | NPC schema, table, seeds, forms, dossier, and Map Lab consumers now use the monster statblock projection (`sizes`, `ac`, `hp`, `speed`, `abilities`, saves/skills, damage/condition lists, `senses`, `languages`, `features`, CR/XP) in place of the legacy `stats`/`armor_class`/`hit_points` fields, with identity fields (race, gender, background, appearance, notes) unchanged. All 26 seeds migrated and every legacy NPC stat key removed from backend and frontend. |
| 3 | `NPCStatCard` now renders traits/actions/spellcasting/defenses/immunities via the shared `MonsterStatBlock` (embedded through new `showIdentity`/`showStrip` props) instead of a hand-rolled duplicate, using a new `npcModel.ts` adapter (`npcToMonsterView`, `hasStatblock`). The 23 statless NPCs show a `No combat stats yet.` + disabled `Pull from a monster…` affordance in the non-compact browser detail pane only; the compact dossier dock stays blank as before. |
| 4 | `npcPull.ts` adds `getPullableRows`/`applyPull`, a pure merge layer over the shared statblock shape (lists add, single values overwrite). `PullFromMonsterDialog` renders the monster picker → tick tree → commit flow from the UX decisions above and is wired into the NPC browser detail pane via a new always-available `Pull from a monster…` action-row button and the statless affordance's `onPull`, both opening the same dialog and refreshing the NPC list on a successful pull. |
| 5 | `addToEncounter.ts` adds `combatantFromNpc`/`appendCreatureToEncounter` over the widened `deriveCreatureStats` (now `Monster \| NPC`). `AddToEncounterDialog` mirrors `PullFromMonsterDialog`'s picker→commit shape for choosing an encounter and appending the NPC as a `source_kind: 'npc'` roster entry, wired into the NPC browser detail pane via a new `Add to encounter…` action-row button, available regardless of whether the NPC has combat stats. |
