# Kid Spellbook — Give children a read-only assigned-spell reference

> **Status:** Stages 1–2 shipped — categorized spell data and constrained DM category editing are complete; Stage 3 kid spellbook routing, bootstrap, and resilient polling are next.

- **Areas:** players, reference, design
- **Read trigger:** When changing the kid spellbook route, assigned-spell payload, spell categories, or the DM spell editor's category assignment.

## What we're building & why

Add `/play/spells` as a personal, read-only play surface for the two children sharing the tablet. It shows only the active character's assigned spells, organized around what a spell helps accomplish in play, while retaining the canonical reference text for adjudication by the DM. A persistent character switch and Map action make the surface safe to leave and resume during a session.

The shared spell catalog gains a fixed, validated action-category field. AI supplies the initial seed labels and the DM can correct them in the existing Spell editor; the kid app only reads them. Polling must refresh DM changes without blanking the last good frame or interrupting a child who is reading an expanded spell.

## Stages

1. Extend the spell data contract with the fixed ten-category vocabulary, persisted multi-category values, validation, seed assignment, and assigned-spell API serialization; preserve seed export/rebuild round-tripping.
2. Add DM category editing to the existing Spell editor as a constrained multi-select, including request/response typing and focused persistence/validation coverage.
3. Add the `/play/spells` route, kid API client contract, two-character bootstrap, polling, last-good-frame behavior, Map navigation, and per-character sticky view state without crossing the `player/` import boundary.
4. Build the kid spellbook browse surface: Actions by default, Spell Slot and Damage Type alternate modes, one-open category/slot/spell behavior, assigned-only scope, inline canonical details, disabled/hidden empty groups, and the first-pass icon-plus-word treatment.
5. Complete focused frontend/backend regression coverage, typecheck/build, generated API/data documentation, area-guide routing, and the repository documentation checker.

## Shipped
| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| 1 | Added the fixed normalized spell-category contract across schema, SQLite storage, CRUD and assigned-spell responses, plus `GET /api/players/spellbook`. All 525 canonical spell seeds now carry semantic categories that survive rebuild/export round-tripping. |
| 2 | Added the fixed category vocabulary to frontend spell response, request, and form contracts, then exposed `Categories` in the existing DM Spell editor as a constrained multi-select. Focused form and create/update serialization coverage verifies selections pass through the existing Save flow. |

## Touches
- `backend/app/routers/spells.py`
- `backend/app/routers/players.py`
- `backend/app/schemas.py`
- `backend/app/db.py`
- `scripts/init_database.py`
- `scripts/seed_database.py`
- `scripts/export_db_seeds.py`
- `data/seeds/seed_spells.json`
- `data/seeds/seed_players.json`
- `data/seeds/seed_player_spells.json`
- `frontend/src/api/**`
- `frontend/src/player/**`
- `frontend/src/features/spells/**`
- `frontend/src/features/players/**`
- `frontend/src/router.tsx`
- `backend/tests/routers/**`
- `backend/tests/test_b1_persistence.py`
- `backend/tests/test_db_helpers.py`
- `frontend/src/player/__tests__/**`
- `frontend/src/features/spells/__tests__/**`
- `frontend/src/features/players/__tests__/**`
- `frontend/src/components/__tests__/BrowserLayout.vw0.test.tsx`
- `frontend/src/__tests__/router.test.tsx`
- `docs/areas/players.md`
- `docs/API_REFERENCE.md`
- `docs/DATA_MODEL.md`
- `docs/TESTING.md`

## UX decisions — Kid Spellbook

Surface:      Kid Spellbook, owned by the Players area; its shared spell data is supplied by Reference.
Mode:         play
Operator:     kid
Focal:        the active character's assigned spells; the open category and spell content get the visual weight, while tabs, Browse by, and Map remain persistent navigation chrome.
Route shape:  bespoke read-only reference surface; it is not a DM Browser, Viewer, or Editor because it has no catalog selection, creation, or mutation flow.
Edit style:   no kid editing; DM category editing remains the existing Spell editor modal.
Save:         no kid save; DM category changes use the existing explicit Spell editor Save action.
Empty:        StatePanel `empty`/player-owned equivalent with `No spells assigned yet.`
Filtered empty: `No spells in this group.`
No selection: `Choose a character to see their spells.` (only reachable while the character bootstrap has no active tab.)
Load failure: the spellbook content region, with `The spellbook didn't load. Ask your DM.`; keep the last good frame during a failed background poll.
Action failure: beside the failed character, browse-mode, category, slot, spell, or Map control, with `role="status"`; do not blank the reading surface.
Destructive:  none on the kid surface; no exit to the DM app.
Keyboard:     DOM-order Tab traversal through character tabs, Map, Browse by, category/slot/spell buttons, and links; Enter/Space activate native buttons; Escape closes no persistent layer and never changes route.
Touch:        64px minimum for every kid control, as required by the Kid UX contract; no smaller exception.

## Compiler handoff

### Stage 3
- **Verified edit sites:** `frontend/src/router.tsx` — `/play` is a top-level route outside `AppShell`; `frontend/src/player/PlayerShell.tsx` — shell owns `/play` destinations and `/play/map`; `frontend/src/player/usePlayerMapData.ts` — existing 5-second polling, visibility refresh, AbortController, and last-good-frame pattern; `frontend/src/player/__tests__/importRule.test.ts` — `player/` cannot import from `features`, `components`, `layout`, or `pages`.
- **Verified tests:** `frontend/src/__tests__/router.test.tsx` protects the top-level kid route boundary; `frontend/src/player/__tests__/PlayerShell.test.tsx` protects native kid navigation and the 64px floor; existing player poll tests are the model for stale-frame behavior.
- **Settled contracts:** `/play/spells` remains outside `AppShell`, has a persistent Map link to `/play/map`, and has exactly two explicit character tabs sourced from the current two seeded player records in stable API order. Reopening the route restores the last character and each character's category, slot section, expanded spell, and scroll position. Polls update quietly and retain the last good frame on failure.
- **Constraints:** Keep `player/` imports within `api/`, `theme.css`, and pure model modules; no local writes, no DM exit, no manual refresh, no browser automation required by this contract.
- **Open questions:** Determine the least fragile in-memory state owner across route unmount/remount; do not introduce persistence beyond the agreed last-place behavior without a new decision.

### Stage 4
- **Verified edit sites:** `frontend/src/features/players/PlayerSpellSection.tsx` — existing assigned spells group by level but is feature-side and cannot be imported by `player/`; `frontend/src/api/types.ts` — canonical spell fields include quick rules, damage, slot level, and full reference fields; `docs/UX_PATTERNS.md` — kid controls require icon-plus-word, automatic polling, no exit, and a 64px floor.
- **Verified tests:** `frontend/src/features/players/__tests__/PlayerSpellSection.test.tsx` covers level grouping and spell context; new player tests must cover assigned-only scope, all three browse modes, one-open behavior, sticky state, details, navigation, and no recommendations.
- **Settled contracts:** Actions is default with the ten fixed categories, one category open at a time, disabled empty categories, hidden empty slot levels, and category headers showing icon plus word. Open categories group by collapsible Spell Slot level. Alternate modes are Spell Slot then categories, and Damage Type then slot level; multi-type spells appear under every applicable type. Rows show only name and `quick_rules`; one inline detail may expand with quick rules followed by casting time, range, duration, components, concentration/ritual, description, and higher-level text. No rankings, counts, recommendations, rules calculations, or child rewrite.
- **Constraints:** Use canonical rendered reference text; do not add school/concentration/ritual/range/duration/casting-time browse modes; keep first-pass icons simple and defer polish; preserve the last readable DOM while polling.
- **Open questions:** Confirm whether the existing reference-text renderer can be imported by `player/` or whether a pure player-local renderer/model adapter is required by the import rule.

### Stage 5
- **Verified edit sites:** `docs/API_REFERENCE.md`, `docs/DATA_MODEL.md`, and `docs/TESTING.md` contain generated inventories that must be regenerated rather than hand-edited; `docs/areas/players.md` owns the kid surface row and change map.
- **Verified tests:** `.venv\\Scripts\\python.exe scripts/check_docs.py --check` is the repository documentation gate; frontend focused checks use `npm run test:check -- <path>`, and the final stage uses `stage_check.py` plus frontend typecheck/build as applicable.
- **Settled contracts:** Verification must cover category validation, multi-category persistence, AI-seeded values, DM edits, assigned-only responses, seed export/rebuild, all required kid interactions, typecheck/build, and documentation freshness. Browser automation is not required.
- **Constraints:** Generated blocks are refreshed with `--write-generated`; never hand-edit generated indexes or inventories; reconcile owns closeout, order deletion, documentation updates, and the authorized commit.
- **Open questions:** None.
