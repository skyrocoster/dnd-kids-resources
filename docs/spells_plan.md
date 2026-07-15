# Spells - Data Restructure & Experience Rewire

> **Status:** S0-S2 shipped. S3 (canonical seed cutover) is next.

## What this feature is

Spells are a 525-row reference catalog whose current seed shape is an ingestion artifact rather than a
usable contract. This plan first establishes an authorable, typed canonical spell record and migrates the
seed to it. Later phases project that record into SQLite and the API, then rewire the spell and player
surfaces without preserving a parallel legacy shape.

The target is deliberately descriptive rather than a rules engine: prose, dice expressions, material text,
range, and duration remain source text. The migration fixes structure and known corruptions; it does not
invent parsed game mechanics from ambiguous prose.

## Key facts

- `data/seeds/seed_spells.json` is canonical and has 525 rows. It currently has 24 top-level fields,
  including four string-encoded JSON fields, integer booleans, string levels, and dead fields. The complete
  evidence is in [`seed_spells_analysis.md`](seed_spells_analysis.md).
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
  project the current field names. They must not be changed in Phase S, because a rebuilt database would be
  incompatible until Phase B ships.
- The current spell UI and editor share `frontend/src/api/types.ts::Spell`; the browser reads
  `spell_name`, `level`, `components`, `classes`, and prose, while player flows consume the same API model.
  Their rewiring belongs to Phase F after the backend contract is live.
- Existing tests seed small legacy spell rows in `backend/tests/conftest.py`; the test fixture must be moved
  to the canonical contract during the backend cutover, never maintained as a second schema.

## Reusable pieces (do not rebuild)

- `scripts/migrate_monsters.py` and its tests establish the expected migration pattern: pure deterministic
  transforms, fixture coverage for edge cases, check mode, and a separate canonical-seed cutover.
- `serialize_for_db` in `scripts/seed_database.py` is the JSON-to-TEXT boundary. The target seed itself must
  contain native JSON values, not serialized JSON strings.
- `backend/app/db.py::parse_spell_row` is the single spell-row deserialization boundary for both spell and
  player routes; Phase B should centralize target parsing there.
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

---

## Design Phase S - Canonical Schema & Seed Migration

This phase produces the reviewed schema contract, a deterministic source-to-target migration, and the
migrated canonical seed. It does not rebuild the database or run the app against the new seed; those are
dependent work in Phase B. **Depends on:** none. **Depended on by:** B0-B2 and F0-F2; do not start either
phase until S3 is committed.

| Stage | Model | Summary | Deliverables |
|-------|-------|---------|--------------|
| **S0 - Migration scaffolding** | Haiku | Stub the migration and focused test modules without changing canonical data. | Script entry point, fixtures, skipped contract tests. |
| **S1 - Schema decision** | Sonnet | Audit every legacy field and publish the binding source-to-target contract. | `spell_schema_decision.md`, field disposition, edge-case decisions. |
| **S2 - Deterministic migration** | Sonnet | Implement and test the target transformation against representative source rows. | `migrate_spells.py`, fixtures, check/write modes, failure context. |
| **S3 - Canonical seed cutover** | Sonnet | Replace the seed with migrated records and prove corpus conformance. | Canonical seed, corpus audit tests, migration reproducibility. |

**Sequencing:** S0 (Haiku, first) -> S1 -> S2 -> S3. S1's accepted decision unblocks S2; S3 may use only
the tested S2 transform and must not add ad hoc repair rules.

#### S3 - Canonical seed cutover (next up)

- **Build:** Make the data-only cutover through the already-tested S2 boundary; do not add transformation logic
  while changing the corpus.
  1. Before editing, copy the 815,800-byte legacy `data/seeds/seed_spells.json` to a temporary path outside the
     repository (for example `F:/TMP/seed_spells_legacy_s3.json`) and record its SHA-256. Confirm the source has
     525 rows and the exact 24 legacy keys from `scripts/migrate_spells.py::SOURCE_FIELDS` (lines 16-41); abort
     rather than attempting S3 if either precondition differs.
  2. Run `python scripts/migrate_spells.py --write --source <legacy-temp> --output
     data/seeds/seed_spells.json`. The script's `main()` (lines 420-462) must remain the only writer and
     `_serialize()` (lines 398-399) must define the checked-in bytes: UTF-8, two-space indentation,
     `ensure_ascii=False`, target-key insertion order, and one trailing newline. Do not hand-edit the generated
     JSON or make S3-only repairs.
  3. The seed is currently excluded by `.gitignore`'s `/data/` rule and is not in `git ls-files` (unlike the
     already tracked `seed_monsters.json`). Stage it explicitly with
     `git add -f data/seeds/seed_spells.json`; do not unignore or add the other local seed/data files, and do not
     retain the temporary legacy source anywhere in the repository.
  4. Refactor `backend/tests/test_migrate_spells.py` at its current corpus fixtures (lines 81-92) so the checked-in
     seed is loaded as target data after cutover. Replace the three edge-record lookups at lines 227-248 with
     small explicit legacy fixture rows derived from `base_spell()`; keep their source anomalies literal so
     Plant Growth, Absorb Elements, and Flashdaggers continue testing the transform without preserving a second
     legacy corpus. Keep every conventional transform, contextual-error, and CLI test from S2.
  5. Add migration-only Pydantic v2 models in `backend/tests/test_migrate_spells.py`, not
     `backend/app/schemas.py`: an `extra="forbid"`, strict base plus `Damage`, `Healing`, `HigherLevels`,
     `Attack`, `AreaOfEffect`, and the exact 18-field `CanonicalSpell`. Use constrained fields for positive IDs,
     level 0-9, non-empty required text/formulas, `Literal["melee", "ranged"] | None` attack kinds, nullable
     school/text/materials/area size, and native list/dict/bool members. Runtime Pydantic models remain legacy
     until B0-B2, so importing `backend.app.schemas.Spell` here would couple S3 to an intentionally incompatible
     contract.
  6. Modify only `data/seeds/seed_spells.json`, `backend/tests/test_migrate_spells.py`, and this plan's completion
     update. Do not touch `scripts/init_database.py`, `scripts/seed_database.py`, `backend/app/db.py`,
     `backend/app/schemas.py`, routers, frontend files, player-spell seeds, or the generated SQLite database.
- **Inherits:** [`spell_schema_decision.md`](spell_schema_decision.md)'s binding 18-field contract and acceptance
  totals; S2's pure `migrate()` driver (`scripts/migrate_spells.py:63`), contextual `MigrationError`, exact named
  anomaly repairs, stable `_serialize()`, and guarded `--write`/`--check` CLI; and
  `backend/tests/test_migrate_spells.py::base_spell`, `migrate_one`, `run_cli`, and `write_source` as the retained
  fixture/CLI harness. The S2 gate already proved all 525 legacy rows transform successfully and two generated
  outputs are byte-identical; S3 changes which representation is canonical, not the transformation contract.
- **Tests:** Extend/refactor `backend/tests/test_migrate_spells.py` with these explicit post-cutover cases while
  retaining the S2 fixture, failure, and CLI cases.
  1. **Canonical shape and identity:** load the checked-in seed; assert exactly 525 rows in source order, 525
     unique positive integer IDs, 525 unique names (including case-insensitive uniqueness), and exactly the 18
     ordered target keys on every row. Assert the union of keys has no intersection with the 24 legacy key set,
     explicitly including `icon`, `spell_name`, `heal`, `attack_type`, `classes`, and `subclasses`.
  2. **Strict model validation:** call `CanonicalSpell.model_validate()` for every row and assert native integers,
     booleans, arrays, and objects are accepted with no Pydantic coercion. Add negative fixture assertions for an
     extra legacy key, a string level, integer boolean, null collection, invalid attack kind, and non-positive AoE
     size so the migration-only model proves the binding types rather than merely documenting them.
  3. **Defaults and normalized members:** assert all collection/object fields are present and never null; empty
     healing, higher-level, and area objects equal the accepted null-padded defaults; schools/damage types/saves
     are lowercase; components are trimmed uppercase with no duplicates; and all higher-level slot keys are
     decimal strings 0-9 with non-empty formulas.
  4. **Corpus acceptance totals:** retain exact counts of 103 damage entries across 97 spells, six two-damage
     spells, 249 attack entries, and 74 populated higher-level damage maps, with every populated map accompanied
     by non-null higher-level prose. Also assert levels cover 0-9 and all IDs/names preserve the legacy source
     order by comparing the generated canonical list to the in-memory result before the temporary legacy copy is
     discarded.
  5. **Known repairs in canonical data:** assert Plant Growth (ID 348) has both corrected casting times and empty
     AoE; Absorb Elements (ID 2) has an empty damage-type list; Flashdaggers (ID 525) has normalized school,
     components, piercing damage, and DEX save; and no output row contains the presentation-only `icon`.
  6. **Reproducibility and CLI safety:** from the preserved temporary legacy file, assert
     `--check --source <legacy-temp> --output data/seeds/seed_spells.json` exits 0. Hash source and output before
     and after to prove check mode modifies neither. Copy the canonical output to a second temporary file, alter
     one value, and assert check exits 1 without changing either comparison file; retain S2's missing-output and
     source-equals-output regressions.
- **Gate:** `pytest backend/tests/test_migrate_spells.py --no-cov` passes with no skips. A fresh temporary output
  generated from the preserved legacy source has the same SHA-256/bytes as the staged canonical seed, and
  `--check` succeeds against it; review `git diff -- data/seeds/seed_spells.json` to confirm a mechanical
  24-to-18-field rewrite with 525 records and review `git status --short --ignored data/seeds` to confirm only
  `seed_spells.json` was force-added. The temporary legacy file is deleted only after the reproducibility check,
  and `git diff --check` passes. Do not rebuild/seed SQLite or run API/frontend/browser verification: the runtime
  intentionally remains incompatible with the canonical seed until Phase B, and no browser pass is required.

---

## Design Phase B - SQLite & API Contract Cutover

This phase projects the canonical seed into SQLite and makes the API return only the target contract. It is
the backend rewire that makes a fresh database usable again. **Depends on:** S3 committed. **Depended on by:**
F1-F2; frontend code must not consume the target API before B2 ships.

| Stage | Model | Summary | Deliverables |
|-------|-------|---------|--------------|
| **B0 - Backend scaffolding** | Haiku | Add target contract stubs and skipped API regressions. | Typed model placeholders, test scaffolds. |
| **B1 - Persistence projection** | Sonnet | Rebuild the spells table and seeder around the target fields. | SQLite schema, seed projection, row parser. |
| **B2 - API cutover** | Sonnet | Rewire spell/player endpoints and CRUD to the target model. | Schemas, routers, fixtures, API tests. |
| **B3 - Real-data verification** | Sonnet | Validate the entire canonical catalog through a rebuilt database. | Integration coverage and reference-doc updates. |

**Sequencing:** B0 -> B1 -> B2 -> B3. B1 and B2 are separate commits so the database boundary is reviewable;
B3 must run against a clean rebuild.

#### B0 - Backend scaffolding (planned)

- **Build:** Add target nested Pydantic model stubs and skipped route/real-data expectations, without making
  legacy endpoint responses ambiguous. Identify all current spell SQL projections, including players.
- **Inherits:** S3 canonical target and the legacy route inventory in `API_REFERENCE.md`.
- **Tests:** Schema construction and skipped response/CRUD tests compile without changing runtime behavior.
- **Gate:** Focused backend tests pass. No browser pass is required.

#### B1 - Persistence projection (planned)

- **Build:** Replace the `spells` table columns in `scripts/init_database.py`, `insert_spell`/diagnostics in
  `scripts/seed_database.py`, and `parse_spell_row` JSON handling with target names/types/defaults. Preserve
  explicit seed IDs so player-spell junction IDs remain stable across a rebuild; add indexes only for actual
  query paths (`name`, `level`, `school`) if missing.
- **Inherits:** S3's target field/default rules and B0 stubs.
- **Tests:** Rebuild a database from real seeds; assert all 525 records insert with IDs preserved and every
  JSON TEXT column round-trips to the target Python type. Test empty collections/objects survive storage.
- **Gate:** `python scripts/init_database.py` and `python scripts/seed_database.py` complete on a clean DB;
  focused persistence tests pass. No browser pass is required.

#### B2 - API cutover (planned)

- **Build:** Replace legacy spell Pydantic models and all spell/player route SQL with explicit target
  projections. Keep endpoint paths, including `/spells/by-title/{spell_name}`, unless API review requires a
  path rename; the response/request fields are `name` and the old fields do not serialize. Make CRUD JSON
  serialization preserve empty collections and always-present nested objects; enforce unique names with
  predictable conflict handling. Convert `level` query filtering to integer semantics.
- **Inherits:** B1 persistence projection and the schema decision's no-compatibility rule.
- **Tests:** Rewrite spell-router and player-spell tests for target responses, create/update/delete, duplicate
  name, ID/not-found, integer level/school filters, and nested JSON round trips. Replace all legacy rows in
  `backend/tests/conftest.py`; add API response-model validation for known anomaly records.
- **Gate:** Focused backend tests, `pytest` from repo root, and a clean type/import check pass. No browser
  pass is required.

#### B3 - Real-data verification (planned)

- **Build:** Update `docs/DATA_MODEL.md` and `docs/API_REFERENCE.md` to the stable target table/schema and
  response contract. Remove S0/B0 TODOs only after the data/API contract is verified.
- **Inherits:** B2's API and a database rebuilt by B1.
- **Tests:** Extend the real-data integration sweep to page all 525 spell list/detail responses and every
  player-spell response through Pydantic; verify no raw JSON strings or legacy keys reach an API response.
- **Gate:** Clean database rebuild, `pytest`, and the real-data integration suite pass. No browser pass is
  required.

---

## Design Phase F - Frontend Contract Rewire

This phase removes the frontend's dependence on legacy spell fields and restores spell browsing, editing,
and player spell displays against the target API. It intentionally preserves the existing visual layout.
**Depends on:** B3 committed. **Depended on by:** a later spell experience/design phase.

| Stage | Model | Summary | Deliverables |
|-------|-------|---------|--------------|
| **F0 - Frontend scaffolding** | Haiku | Introduce target TypeScript declarations and skipped render/form tests. | API type stubs, fixtures, test placeholders. |
| **F1 - Browser and editor rewire** | Sonnet | Use target fields in spell list, detail, and CRUD editor flows. | Page/editor/form mappings and tests. |
| **F2 - Player spell rewire** | Sonnet | Move player spell consumers and regression fixtures to target data. | Player displays/assignment tests. |
| **F3 - Contract verification** | Sonnet | Remove legacy access and prove production build behavior. | Search audit, integration tests, build gate. |

**Sequencing:** F0 -> F1 -> F2 -> F3. F1 and F2 may be parallel only after their shared target types land in F0.

#### F0 - Frontend scaffolding (planned)

- **Build:** Add exact target `Spell`, nested type, and input declarations to `frontend/src/api/types.ts`; add
  target test fixtures and skipped browser/editor/player contract tests. Do not change live legacy consumers.
- **Inherits:** B3's published API contract.
- **Tests:** Type-only fixture construction and skipped consumer tests compile.
- **Gate:** `npm run test` and `npm run typecheck` pass. No browser pass is required.

#### F1 - Browser and editor rewire (planned)

- **Build:** Update `SpellBrowserPage`, `SpellEditor`, form mapping/validation, API client inputs, and their
  tests to use `name`, numeric `level`, native components, target nested objects, and `casting_times`.
  Remove the dead Classes display rather than presenting unavailable data. Preserve the list sort and create,
  edit, and delete behavior.
- **Inherits:** F0 target types and B3 backend responses.
- **Tests:** Render list/detail metadata, casting-time alternatives, components, concentration/ritual,
  higher-level text, create/edit serialization, and API failure states using target fixtures.
- **Gate:** `npm run test`, `npm run typecheck`, and `npm run build` pass. Per repository policy, report the
  spell browser/editor manual checks rather than driving a browser.

#### F2 - Player spell rewire (planned)

- **Build:** Find every player spell label/detail/assignment consumer and switch it to the F0 model, including
  shared mocks and fixtures. Keep relationship operations ID-based.
- **Inherits:** F0 types, F1's shared form/browser mappings where applicable, and B3 player-spell responses.
- **Tests:** Player spell list/assignment render tests cover target names and representative nested data;
  existing player API client tests receive no legacy spell field.
- **Gate:** `npm run test`, `npm run typecheck`, and `npm run build` pass. No browser automation is required.

#### F3 - Contract verification (planned)

- **Build:** Remove obsolete frontend spell-field accesses, skipped scaffolds, and compatibility assumptions.
  Update any durable frontend-facing documentation only if it describes the changed API shape.
- **Inherits:** F1 and F2 rewires.
- **Tests:** Add a repository search assertion or focused audit that rejects legacy spell field accesses outside
  migration/archive/history; run spell and player flows against a real rebuilt backend where the existing test
  harness supports it.
- **Gate:** `npm run test`, `npm run typecheck`, `npm run build`, and relevant backend integration tests pass.
  Manual browser confirmation is limited to loading, editing, and assigning a spell; do not automate it unless
  explicitly requested.

---

## Shipped stages (collapsed record)

| Stage | What shipped (<=2 sentences) |
|-------|-------------------------------|
| **S0** | Migration scaffolding: `migrate_spells.py` entry point, `base_spell()` fixture, 4 passing + 3 skipped tests, `TODO(S1)` comments in db.py/schemas.py. Seed unchanged. Gate ✅. |
| **S1** | Accepted 18-field canonical contract in `spell_schema_decision.md`, covering all 24 legacy fields, strict defaults/validation, corpus totals, known repairs, and rejected alternatives; `icon` is dropped as presentation-only data. Seed and runtime contracts unchanged. Gate ✅. |
| **S2** | Deterministic 18-field transform with strict contextual validation, enumerated anomaly repairs, stable write/check CLI modes, and complete fixture/corpus coverage. 30 focused tests pass with no skips; canonical seed and runtime contracts remain unchanged. Gate ✅. |

## Cross-references

- Analysis source: [`seed_spells_analysis.md`](seed_spells_analysis.md).
- Schema precedent and migration pattern: [`monster_schema_decision.md`](monster_schema_decision.md) and
  [`monsters_plan.md`](monsters_plan.md).
- Reference docs updated in B3: [`DATA_MODEL.md`](DATA_MODEL.md) and
  [`API_REFERENCE.md`](API_REFERENCE.md).
- Test and data-rebuild contract: [`TESTING.md`](TESTING.md), [`DATA_MODEL.md`](DATA_MODEL.md), and
  [`CLAUDE.md`](../CLAUDE.md).

## Next:

S3 - Replace the canonical seed using S2's tested transform and prove the checked-in result is byte-for-byte
reproducible. Do not change database, backend, or frontend contracts in this stage.
