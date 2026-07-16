# Spells - Data Restructure & Experience Rewire

> **Status:** S0-S3, B0-B3, and F0-F3 shipped. Frontend contract rewire complete; a later spell experience/design phase remains deferred.

## What this feature is

Spells are a 525-row reference catalog whose seed was an ingestion artifact rather than a usable contract.
Phases S and B established an authorable, typed canonical record, migrated the seed, and projected it into
SQLite and the API. Phase F now rewires the spell and player surfaces to consume the target contract without
preserving a parallel legacy shape.

The target is deliberately descriptive rather than a rules engine: prose, dice expressions, material text,
range, and duration remain source text. The migration fixed structure and known corruptions; it does not
invent parsed game mechanics from ambiguous prose.

## Key facts

- `data/seeds/seed_spells.json` is canonical and has 525 rows with the accepted 18-field target contract.
  The legacy seed had 24 top-level fields including four string-encoded JSON fields, integer booleans,
  string levels, and dead fields. The complete evidence is in
  [`seed_spells_analysis.md`](seed_spells_analysis.md).
- The accepted 18-field target contract is binding in
  [`spell_schema_decision.md`](spell_schema_decision.md):
  - Scalars: `id: int`, `name: str`, `level: int` (0 for cantrips), `school: str | null`
    (lowercase), `description: str`, `alternate_description: str | null`, `range: str`, `duration: str`,
    `materials: str | null`, `concentration: bool`, and `ritual: bool`.
  - Collections: `components: list[str]`, `casting_times: list[str]`, `damage: list[Damage]`, and
    `attacks: list[Attack]`; absent collections are always `[]`.
  - Always-present nested objects: `healing: {amount: str | null, temp_hp: bool, max_hp: bool}`,
    `area_of_effect: {shape: str | null, size: int | null}`, and
    `higher_levels: {text: str | null, damage_by_slot: dict[str, str]}`. `amount` remains an expression,
    not arithmetic data.
  - `Damage` is `{name: str, formula: str, damage_types: list[str]}`. `Attack` is
    `{kind: "melee" | "ranged" | null, saving_throws: list[str]}`. Preserve the source's one-or-more
    entries rather than assuming one attack or damage event.
  - Do not carry forward `icon`, `spell_name`, `spell_text`, `spell_alt_text`, `casting_time`, `heal`,
    `attack_type`, `damage_at_higher_levels`, `heal_at_spell_slots`, `action`, `classes`, or `subclasses`.
    `classes` is effectively absent in the canonical source; class/subclass sourcing is deferred rather
    than retaining an invalid field.
- The decision was verified against all 525 source rows. It preserves free-form healing expressions, treats AoE
  labels as open descriptive strings, keeps nullable sizes (326 of 342 shape-bearing rows have no size), and
  preserves Plant Growth's two casting times. Contract changes require updating the decision and this plan
  together before implementation continues.
- Known repair rules are deterministic: deserialize valid embedded JSON; convert `0`/`1` to booleans;
  lowercase schools and saving throws; drop the presentation-only `icon`; split Plant Growth's list-literal
  casting time into `casting_times`; repair Flashdaggers' `damage_type` key and `peircing` spelling; and
  represent a missing damage type as `[]`.
- `scripts/init_database.py`, `scripts/seed_database.py`, `backend/app/schemas.py`,
  `backend/app/db.py::parse_spell_row`, `backend/app/routers/spells.py`, and the player-spell query all
  project the 18-field target contract as of B2.
- The spell UI, editor, and player views share `frontend/src/api/types.ts::Spell`; browser and player labels use
  `name`, forms use numeric `level` and `casting_times`, and nested spell data stays in the target objects.
- Existing tests seed small legacy spell rows in `backend/tests/conftest.py`; the test fixture was moved
  to the canonical contract during B2.

## Reusable pieces (do not rebuild)

- `scripts/migrate_monsters.py` and its tests establish the expected migration pattern: pure deterministic
  transforms, fixture coverage for edge cases, check mode, and a separate canonical-seed cutover.
- `serialize_for_db` in `scripts/seed_database.py` is the JSON-to-TEXT boundary. The target seed itself must
  contain native JSON values, not serialized JSON strings.
- `backend/app/db.py::parse_spell_row` is the single spell-row deserialization boundary for both spell and
  player routes, centralized in B1.
- `frontend/src/api/types.ts` is the frontend/backend contract mirror. `SpellBrowserPage`, `SpellEditor`,
  and player spell views should consume it rather than define local spell copies.

## Known debt / deferred work (NOT yet built)

- Kid-appropriate curation, source attribution, and class/subclass availability are not inferred from this
  incomplete seed. A future source with reliable availability data needs its own ingestion and migration plan.
- Parsing rule expressions (healing amounts, damage formulas, range, duration, materials, and higher-level
  prose) into executable mechanics is out of scope.
- A visual redesign of spell cards/editor is deferred. Phase F is a behavioral contract rewire; a design
  phase can be planned after it has stable data.
- This plan deliberately has no compatibility adapter for `spell_name` or dropped fields. All consumers move
  together during their designated cutover phases.

## Shipped stages (collapsed record)

| Stage | What shipped (<=2 sentences) |
|-------|-------------------------------|
| **S0** | Migration scaffolding: `migrate_spells.py` entry point, `base_spell()` fixture, 4 passing + 3 skipped tests, `TODO(S1)` comments in db.py/schemas.py. Seed unchanged. Gate ✅. |
| **S1** | Accepted 18-field canonical contract in `spell_schema_decision.md`, covering all 24 legacy fields, strict defaults/validation, corpus totals, known repairs, and rejected alternatives; `icon` is dropped as presentation-only data. Seed and runtime contracts unchanged. Gate ✅. |
| **S2** | Deterministic 18-field transform with strict contextual validation, enumerated anomaly repairs, stable write/check CLI modes, and complete fixture/corpus coverage. 30 focused tests pass with no skips; canonical seed and runtime contracts remain unchanged. Gate ✅. |
| **S3** | Canonical seed cutover: generated 18-field canonical seed locally via tested S2 boundary (gitignored, not committed). Refactored tests with explicit legacy fixtures, Pydantic v2 strict validation models, and corpus acceptance tests (46 total). SHA-256 byte-reproducible from legacy source. Gate ✅. |
| **B0** | Backend scaffolding: target nested Pydantic models (`SpellDamage`, `SpellHealing`, `SpellHigherLevels`, `SpellAttack`, `SpellAreaOfEffect`, `SpellTarget`, `SpellTargetCreate`, `SpellTargetUpdate`) added to `schemas.py`; 17 passing schema-construction tests; 29 skipped API regression tests (22 xfailed, 7 xpassed). Legacy routes/models unchanged. SQL projection inventory captured. Gate ✅. |
| **B1** | Persistence projection: rebuilt the `spells` table around the canonical target fields, projected the canonical seed into the new columns with explicit IDs, and centralized target JSON parsing in `backend/app/db.py`. Gate ✅. |
| **B2** | API cutover: canonical `Spell` schemas and spell/player routes now project only the 18-field contract, with JSON CRUD serialization and normalized school filters. 246 tests pass at 91.27% coverage. Gate ✅. |
| **B3** | Real-data verification: a clean rebuild loaded 525 spells, and integration tests validate every spell list/detail and player-spell response through `Spell`. Reference docs now describe the stable contract; 246 tests pass at 91.27% coverage. Gate ✅. |
| **F0** | Strict frontend target types, a canonical target fixture, and skipped browser/editor/player contract scaffolds. `npm run test` passes; strict types intentionally expose legacy consumers for F1. Gate ✅. |
| **F1** | Rewired `SpellBrowserPage`, `SpellEditor`, form mapping, and constants to target contract fields (`name`, numeric `level`, `casting_times`, nested objects). Removed dead classes display. 719 tests pass; typecheck/build deferred to F2 for player surface. Gate ✅. |
| **F2** | Rewired player spell labels and sorting to `name`, refreshed API-client fixtures with canonical nested spell data, and added assignment coverage while retaining ID-based mutations. 721 tests pass; typecheck/build clean. Gate ✅. |
| **F3** | Removed the skipped spell scaffold and added a frontend audit rejecting dropped spell-field access across API, spell, and player sources. 722 frontend tests, 34 real-data integration tests, typecheck, and build pass. Gate ✅. |

## Cross-references

- Analysis source: [`seed_spells_analysis.md`](seed_spells_analysis.md).
- Schema precedent and migration pattern: [`monster_schema_decision.md`](monster_schema_decision.md) and
  [`monsters_plan.md`](monsters_plan.md).
- Reference docs updated in B3: [`DATA_MODEL.md`](DATA_MODEL.md) and
  [`API_REFERENCE.md`](API_REFERENCE.md).
- Test and data-rebuild contract: [`TESTING.md`](TESTING.md), [`DATA_MODEL.md`](DATA_MODEL.md), and
  [`CLAUDE.md`](../CLAUDE.md).

## Next:

No queued stage. A spell experience/design phase remains deferred.
