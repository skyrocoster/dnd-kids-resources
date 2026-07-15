# Spells - Data Restructure & Experience Rewire

> **Status:** S0-S3 shipped. Phase B (SQLite & API Contract Cutover) is next.

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
| **S3** | Canonical seed cutover: generated 18-field canonical seed locally via tested S2 boundary (gitignored, not committed). Refactored tests with explicit legacy fixtures, Pydantic v2 strict validation models, and corpus acceptance tests (46 total). SHA-256 byte-reproducible from legacy source. Gate ✅. |

## Cross-references

- Analysis source: [`seed_spells_analysis.md`](seed_spells_analysis.md).
- Schema precedent and migration pattern: [`monster_schema_decision.md`](monster_schema_decision.md) and
  [`monsters_plan.md`](monsters_plan.md).
- Reference docs updated in B3: [`DATA_MODEL.md`](DATA_MODEL.md) and
  [`API_REFERENCE.md`](API_REFERENCE.md).
- Test and data-rebuild contract: [`TESTING.md`](TESTING.md), [`DATA_MODEL.md`](DATA_MODEL.md), and
  [`CLAUDE.md`](../CLAUDE.md).

## Next:

B0 - Backend scaffolding: add target contract stubs and skipped API regressions for the SQLite & API
contract cutover.
