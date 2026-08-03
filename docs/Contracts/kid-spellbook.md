# Kid Spellbook Contract

> **Status:** Agreed readiness contract; implementation has not started.

## Outcome

Add a read-only kid-facing spellbook at `/play/spells` for a shared tablet used by two
children. It is a reference surface, not a recommender, rules engine, or slot tracker.
The tablet remains useful with minimal handling: a child can return to the last book,
switch characters explicitly, browse by an action, and return to the map in one tap.

## Settled behavior

- The book shows **only the active character's assigned spells**, never the full 525-spell
  catalog.
- The first pass has two explicit character tabs. Each shows the character name and a
  simple icon. The active tab is unmistakable. Character switching preserves that
  character's last category, slot section, expanded spell, and scroll position.
- A persistent `Map` control sits beside the character tabs. It links to the party map;
  reopening `Spells` returns to the last character and last place.
- The default browse mode is **Actions**, with one collapsible category open at a time.
  Empty categories are shown disabled; empty slot levels are hidden. Category headers
  use an icon and word, with a simple first-pass icon treatment and a later icon-polish
  pass.
- The fixed shared category vocabulary is:

  `Damage`, `Heal`, `Protect`, `Control`, `Move`, `Detect`, `Influence`, `Create`,
  `Summon`, and `Other`.

  Categories describe what the spell helps accomplish in play, not spell school or
  attack mechanics. A spell may have multiple categories. `Other` keeps every assigned
  spell discoverable.
- Inside an open action category, spells are grouped under collapsible **Spell slot**
  levels. This is browse grouping only: the app shows no remaining-slot counts, spent
  state, or availability decision.
- A spell row contains only its name and existing concise `quick_rules` text. No counts,
  recommendation markers, or ranking are shown.
- One spell detail may be expanded at a time, inline beneath its row. The expanded view
  starts with quick rules and then shows the full canonical reference: casting time,
  range, duration, components, concentration/ritual, description, and higher-level
  text. The app does not calculate or adjudicate the rules.
- A secondary `Browse by` control switches modes rather than adding permanent filter
  chrome. First-pass alternate modes are only:
  - **Spell Slot:** slot level first, then action categories.
  - **Damage Type:** damage type first, then slot level; multi-type spells appear under
    every applicable type.
- AI assigns the fixed shared categories in the initial pass. Those labels become
  visible immediately. The DM edits them later through a multi-select field in the
  existing shared Spell editor. The DM cannot create or rename categories in this
  first pass.
- The spellbook polls automatically for DM-side changes, preserves the last good frame
  on a failed poll, and does not interrupt an expanded spell while reading.
- The kid surface remains read-only, has no exit to the DM app, and follows the existing
  kid touch, icon-plus-word, and automatic-liveness rules.

## Explicitly out

- Tactical recommendations, a “useful now” ranking, favourites, recent-use ordering,
  or any indication of which spell the child should cast.
- Full-catalog browsing, unassigned spells, current slot tracking, rules enforcement,
  dice rolling, or computed mechanics.
- Custom or per-character category vocabularies.
- First-pass browsing by school, concentration, ritual, range, duration, casting time,
  attack/save, or other metadata beyond Spell Slot and Damage Type.
- A child-facing simplified rewrite of canonical spell text.
- Final iconography and visual polish beyond a usable first-pass icon treatment.

## Likely implementation paths

- `frontend/src/player/**` — `/play/spells`, shell navigation, sticky character/book
  state, polling, and kid presentation.
- `frontend/src/features/spells/**` — shared Spell editor category assignment.
- `frontend/src/features/players/**` — assigned-spell/detail contracts and reusable
  reference behavior where appropriate.
- `backend/app/routers/spells.py`, player routes, schemas, and related tests — shared
  category persistence and assigned-spell responses.
- `data/seeds/seed_spells.json` and player assignment seeds — canonical category and
  assignment round-tripping; the spell seed is gitignored but is still the canonical
  artifact to inspect and regenerate through the repository workflow.
- `frontend/src/api/**` and colocated tests — the kid API contract and behavior checks.

## Verification

- Focused frontend tests cover character switching, sticky per-character state, action
  and alternate browse modes, one-open category/spell behavior, assigned-only scope,
  inline details, Map navigation, and the no-recommendation contract.
- Backend/API tests cover category validation, multi-category persistence, AI-seeded
  values, DM edits, assigned-spell responses, and seed export/rebuild round-tripping.
- Run the applicable frontend/backend focused tests, typecheck/build, and the repository
  documentation checker. No browser automation is required for this contract stage.

## Deferred decisions

- Exact icon set and visual styling.
- Whether the fixed vocabulary should later change after observing children use it.
- Better source cleanup or authored child-facing explanations for malformed/awkward seed
  prose such as Flashdaggers' raw markup and unitless range.
- Any future personalized usefulness layer, favourites, or broader gear/reference
  surfaces.
