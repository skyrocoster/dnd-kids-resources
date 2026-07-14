# Monsters — Data Restructure & Stat-Block Redesign

> **Status:** M0 (scaffolding) shipped. **M1 produced the binding target-schema proposal and awaits human
> acceptance.** Phase MD (data foundation) runs first — nothing in Phase MX may start until M2.3 is committed.

## What this feature is

The monster area is being **completely rebuilt**, top to bottom: the data model, the backend, the read
experience, and a new authoring flow.

- **Read view** — today's page is a generic `<dl>` + flat stats grid + action paragraphs with no hierarchy.
  It becomes a **bestiary field card**: a boxed stat block with clearly separated regions
  (Identity → Defenses → Abilities → Actions → Lore), rendered from a clean data shape.
- **Create / edit** — monsters are currently **read-only** (no POST/PUT/DELETE). A grouped authoring form
  mirroring the stat-block regions is added, backed by new CRUD endpoints.
- **Data** — the seed is a raw 5etools bestiary dump with hostile shapes. It is restructured into a clean,
  authorable model, and every consumer (encounters, the page, the form) is rewired to it.

The **signature affordance** is the stat block itself, and the app's one shared motif — dice notation — is
redesigned in the same pass (see *Visual direction*).

## Key facts (what an executor must know before touching code)

- **The seed is a 2,276-row 5etools dump** (`data/seeds/seed_monsters.json`), **30 columns per row**, most
  sparse. It was not designed for authoring or display. Concrete pain points, all confirmed:
  - **AC shape is inverted:** `ac: {"15": "natural armour"}` — the AC *value* is the object **key**, the note
    is the value; `null` when there's no note (`{"12": null}`). ~525 rows have no AC at all.
  - **`save` and `skill` are fully-null dicts** — every ability/skill listed with `null` unless proficient
    (e.g. `save: {"str": null, "dex": null, …}`, `skill: {…, "perception": 5, …}`). 1,211 rows have no saves.
  - **Prose carries raw markup** — `{@creature air elemental}`, `{@status concentration||concentrating}`,
    `{@dice 1d6}` etc. appear inside `action`/`traits`/`reaction` note strings and are rendered literally today.
  - **`cr` is a string** with fractions (`"1/4"`, `"1/8"`, `"1/2"`) — 67 distinct values; no numeric sort key.
  - **Rich fields exist but are dropped by the API:** `traits` (1,934 rows), `spellcasting` (682),
    `reaction` (288), `bonus` (321), `legendary` (255), `resist` (1,364), `vulnerable` (91), `save` (1,065),
    `skill` (2,243), `type`, `size`, `alignment`, `senses`, `soundClip` (963 rows have an audio path).
    Near-dead fields: `alias` (10), `group` (140), `mythic` (17), `legendaryHeader` (3), `mythicHeader` (0),
    `reactionRules` (15), `cr_details` (2). **M1 decides keep/drop/reshape for every one of these.**
- **API surfaces only 9 fields** — `backend/app/schemas.py::Monster` = id, name, ac, hp, speed, stats, senses,
  languages, cr, action. The router (`backend/app/routers/monsters.py`) is **read-only**: GET list / by-id /
  by-name only. `MonsterCreate`/`MonsterUpdate` exist but are **unused and wrong** (`senses`/`languages` typed
  `str`, field named `challenge` not `cr`) — replace them, don't extend.
- **The DB mirrors the seed 1:1** — `scripts/init_database.py` `CREATE TABLE monsters` has all 30 columns
  (JSON-as-TEXT); `scripts/seed_database.py::populate_monsters` inserts them positionally. Both get rewritten
  in M2. The DB is gitignored and **rebuilt from seeds** — never hand-edited.
- **The inverted AC shape has leaked into two consumers** that MUST be rewired in M2:
  - `frontend/src/features/encounters/encounterStats.ts::deriveCreatureStats` — reads
    `Object.keys(monster.ac)[0]` and `monster.hp.average`.
  - `frontend/src/features/monsters/MonsterBrowserPage.tsx::formatAc` — same `Object.keys(ac)[0]` trick.
  - `frontend/src/api/types.ts::Monster` is the shared TS type; `AddMonsterPanel.tsx` reads only `cr`.
- **Monsters own the teal identity** — `data-variant="monster"` maps to `--md-tertiary` on `Card`/`SearchList`
  (`docs/DESIGN_SYSTEM.md`). The current page consumes the variant on its `Card` but otherwise ignores the
  identity. The redesign leans into it.
- **The dice motif** — `frontend/src/components/DiceText.tsx` regex-wraps dice notation (`\d+d\d+([+-]\d+)?`)
  in `.dice-pill` (`DiceText.css`), styled `--md-secondary-container` (gold). It is used by spells, monsters,
  and weapons — **any change is site-wide**. This is the "pillbox from early development" the redesign targets.

## Design system in force

Fixed MD3 dark theme; consume tokens from `frontend/src/theme.css`, never hand-pick color. Full contract in
[`docs/DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) (palette, `--type-*` scale, Lucide icon barrel, a11y floor:
visible `:focus-visible`, never hue-alone, `prefers-reduced-motion`, ≥48px touch targets).

### Visual direction (the thesis for X1–X4)

- **Identity:** monsters are `--md-tertiary` (teal). The redesign uses the tertiary container/on-container
  pair for region accents and the stat-block frame, so the page reads as unmistakably "monster," distinct
  from spells (purple) and weapons (gold).
- **Signature — the bestiary field card.** Reinterpret the Monster Manual stat block for MD3 dark. Regions
  are separated by a **tapered teal hairline** (the Manual's orange tapered bar → `--md-tertiary`
  gradient-to-transparent), ordered the way a DM reads a creature the moment it appears:
  **Identity (name/type/size/alignment/CR) → Defenses (AC/HP/speed/resist/vulnerable/senses) → Abilities
  (the six-score line + saves/skills) → Actions (actions/bonus/reactions/legendary/spellcasting) → Lore
  (traits, languages, sound).** The divider order **encodes that reading sequence** — it is information, not
  ornament. Reuse the six-ability block pattern already established by `NPCStatCard`.
- **The one risk — retire the flat gold pill.** `.dice-pill` is always `--md-secondary` gold, which fights
  the identity of every non-weapon page. Replace it with a **role-aware "rollable die" chip**: the same
  monospace notation, but the chip inherits the **surrounding content role's** container color (teal on a
  monster, purple on a spell) and carries a small die glyph (Lucide `Dices`/`Dice5`) so `2d6+3` reads as
  *rollable*, not merely styled. Discipline: exactly one glyph, one chip shape, one motif — applied everywhere
  `DiceText` already is. This is spent in X2 as the single bold move; everything around it stays quiet.
- **Checked against defaults:** the three AI-design clichés (cream+serif+terracotta, near-black+acid accent,
  broadsheet hairlines) are ruled out by the fixed MD3 dark theme. The tapered rule + region order derive from
  the actual subject (the stat block), and the die chip is tied to the app's own established motif — both are
  choices for *this* brief, not templated defaults.

## Reusable pieces (do not rebuild)

- `components/DiceText.tsx` + `.dice-pill` — the motif to **redesign in place** (X2), not replace wholesale;
  its regex and site-wide call sites stay.
- `components/Card.tsx`, `SearchList.tsx`, `SplitPane.tsx` — list/detail shell already used by the page;
  keep the `variant="monster"` wiring.
- `features/npcs/NPCStatCard.tsx` — the six-ability block, monogram, conditional stat strip, and
  hidden-when-absent section pattern. The monster stat block should mirror its anatomy, not reinvent it.
- `features/encounters/encounterStats.ts::deriveCreatureStats` — the **single** monster→creature derivation
  point; rewire it once in M2 and both editor and runner follow.
- `components/icons/index.ts` — Lucide barrel; add a `DiceIcon`/`RollableIcon` alias for X2.

## Known debt / deferred (NOT built by this plan)

- **Curation of the 2,276-row bestiary** — whether to ship the full dump or a kid-appropriate subset is a
  **question M1 must answer**; if M1 chooses a subset, the actual curation is deferred to a follow-up and
  noted here.
- **Sound-clip playback UI** — 963 rows carry an audio path; whether the page plays them is an M1 keep/drop
  call. If kept as data, the *player control* is deferred to the X-phase design pass or later.
- **`{@tag}` deep-linking** — X1 renders tag markup as clean text (strips/derefs to display name). Turning
  `{@creature x}` into an actual link to that monster is deferred.
- **Full stat-block math/validation** (auto-deriving modifiers, proficiency bonus from CR) in the create form
  — X3 stores what's entered; computed assistance is deferred unless trivial.

---

## Design Phase MD — Data foundation (seed, schema, backend)

Restructure the monster data model from the 5etools dump into a clean, authorable shape, rebuild the DB and
backend around it, and rewire existing consumers. **Depended on by:** all of Phase MX — do not start X1 before
**M2.3** is committed. M1 is discovery-only and gates M2.1.

| Stage | Model | Summary | Deliverables |
|-------|-------|---------|--------------|
| **M0 — Scaffolding** | Haiku | Type stubs, schema/migration/CRUD stubs, placeholder CSS, `it.skip` tests. One context, no logic. | Stubs compile; app + tests render unchanged. |
| **M1 — Seed discovery & target schema** | **Opus** | **Discovery only, no code.** Deep-read the 2,276-row seed; decide keep/drop/reshape for all 30 fields; write the target-schema contract. | `docs/monster_schema_decision.md` committed. |
| **M2.1 — Deterministic migration engine** | Sonnet | Implement and fixture-test the pure source-to-target transform without changing the canonical seed or runtime contract. | Reproducible migration script + focused fixture tests. |
| **M2.2 — Atomic contract cutover** | Sonnet | Apply the migration and update the seed, DB, API, frontend types, existing consumers, and reference docs together. | Migrated seed, new schema/API/types, working legacy browser + encounter consumers. |
| **M2.3 — Corpus conformance & release verification** | Sonnet | Prove the full migrated corpus and rebuilt runtime meet the M1 acceptance contract. | Aggregate audit tests, clean DB rebuild, full green suite. |
| **M3 — Monster CRUD endpoints** | Sonnet | POST/PUT/DELETE `/monsters` + client fns + tests. | CRUD live, ≥85% coverage. |

**Sequencing:** M0 (Haiku, first) → **M1 acceptance (gates everything)** → M2.1 → M2.2 → M2.3 → M3. M3 may
overlap X0 once M2.3 lands. M2.2 is deliberately the only breaking cutover: separating its frontend rewiring
would commit a mixed, broken runtime shape.

<!-- ===== VERBOSE BLOCKS — one per un-shipped stage ===== -->

#### M1 — Seed discovery & target schema (Opus, discovery only)

- **Build:** **No production code.** A strong model reads `data/seeds/seed_monsters.json` broadly (shape
  distributions, sparsity, markup patterns, edge cases) and produces **`docs/monster_schema_decision.md`** —
  the binding contract M2 implements. It must decide, with rationale, for **every one of the 30 current
  fields**: keep as-is / reshape / drop. At minimum it must specify:
  - **AC** → `{ "value": 15, "note": "natural armour" | null }` (kill the inverted-key shape); how to handle
    the ~525 AC-less rows.
  - **save / skill** → sparse maps of only the present entries (`{ "dex": 3 }`), dropping the null padding;
    naming (`saving_throws`? `skills`?).
  - **`{@tag}` markup** → the canonical display transform (strip to display text) and whether to store raw +
    derived, or derived only. Provide the tag inventory found and the regex.
  - **CR** → keep the string, **add a numeric sort key** (`cr_sort`: fractions → 0.125/0.25/0.5), and the
    kid-facing label if any.
  - **Rich blocks** (`traits`/`reaction`/`bonus`/`legendary`/`spellcasting`) → unified "features" structure vs
    kept typed; the exact shape the page and form will consume.
  - **type / size / alignment / senses / languages / resist / vulnerable** → final shapes.
  - **`soundClip`** → keep as data or drop (963 rows have it); **note the follow-up if kept**.
  - **Curation** → ship all 2,276 or a subset? If subset, define the selection criterion and record the
    curation work as deferred in this plan's Known-debt list.
  - The **full target Pydantic/TS field list** M2 will implement (names, types, optionality), and a
    **worked before/after example** for 2–3 representative monsters (a simple beast, a spellcaster, a
    legendary boss).
- **Inherits:** M0 stubs (the migration script is where M2 will encode this decision).
- **Tests:** none (no code). The deliverable is the reviewed decision doc.
- **🚦 Gate:** `docs/monster_schema_decision.md` exists, covers all 30 fields with keep/drop/reshape + rationale,
  includes the worked examples and the final field list, and is committed. Human review of the doc is the gate —
  **do not proceed to M2 until the schema decision is accepted.**

#### M2.1 — Deterministic migration engine (Sonnet)

- **Build:** Replace `scripts/migrate_monsters.py::migrate` with the deterministic, idempotent M1 transform, but
  do **not** rewrite `seed_monsters.json` or change runtime code yet. Keep helpers private and purpose-specific:
  tag/text cleanup and validation; identity, AC, HP, movement, saves/skills/passive Perception, defenses,
  features/attacks, spellcasting, CR, and audio-path conversion. Fail with monster ID, name, and nested value path
  for unknown/residual markup, malformed source structures, unsafe audio paths, conflicting XP, or invalid CR
  denominators. The script remains the reproducible source migration.
- **Inherits:** Accepted M1 contract; M0 migration stub.
- **Tests:** Add `backend/tests/test_migrate_monsters.py`, loading the standalone script through `importlib`.
  Replace M2 skip stubs with complete fixture assertions for Wolf, Mage, Adult Red Dragon, alternate-form movement,
  conditional defenses, a CR context/explicit-XP object, unknown CR, and invalid tag/audio failure cases. Assert
  primary/alternative AC, sparse saves/skills, passive Perception, text cleanup, ordered attack damage, spell
  labels/hidden state, feature defaults, and `cr_sort`.
- **🚦 Gate:** `pytest backend/tests/test_migrate_monsters.py --no-cov` is green; the transform is deterministic
  on fixture inputs; canonical seed, DB schema, API, and frontend runtime shape are unchanged. Commit message:
  `Stage M2.1: Implement deterministic monster migration`.

#### M2.2 — Atomic contract cutover (Sonnet)

- **Build:** Run the proven migration once to rewrite `data/seeds/seed_monsters.json`, preserving all 2,276 source
  IDs and names. Replace the legacy `monsters` table in `scripts/init_database.py` with the exact M1 projection,
  its JSON defaults, nullable scalars, timestamps, `idx_monsters_cr`, and `idx_monsters_cr_sort`; rewrite
  `populate_monsters` to insert explicit IDs and only target fields. Replace Monster Pydantic schemas with the
  strict M1 nested-model contract, defaults, audio-device validation, and response-only `id`/`cr_sort`, while
  leaving M3 CRUD stubs as 501s. Update every GET select and `_parse_monster_row` for the new columns.
  
  Replace `frontend/src/api/types.ts` Monster/MonsterInput definitions with the M1 TypeScript contract. Rewire
  `deriveCreatureStats` to use `ac.value` and `hp.average`; update `MonsterBrowserPage` to consume typed AC,
  speed, senses, abilities, and `features.actions` without starting the Phase MX redesign. Grep for other legacy
  monster shape reads. Update the curated monster fixture and existing backend/frontend tests, then update
  `docs/DATA_MODEL.md` and `docs/API_REFERENCE.md` in this same commit.
- **Inherits:** M2.1's tested transform and the accepted M1 contract.
- **Tests:** Update router smoke tests for list/by-id/by-name with nested target data, frontend browser-page tests,
  and encounter stat-propagation tests. Assert Pydantic rejects unknown monster input fields and excludes computed
  `cr_sort` from Create/Update inputs. Run focused backend/frontend tests and `npm run typecheck`.
- **🚦 Gate:** `python scripts/init_database.py` then `python scripts/seed_database.py` rebuilds the DB from the
  migrated seed. The ordinary list/detail page and encounter stat derivation work against the target shape through
  automated tests; no browser automation unless requested. Commit message: `Stage M2.2: Cut over monsters to
  authorable schema`.

#### M2.3 — Corpus conformance & release verification (Sonnet)

- **Build:** Add corpus-level migration and API assertions rather than manually inspecting 2,276 records. Verify
  M1's aggregate acceptance contract: row/ID/name counts, no legacy top-level fields or residual `{@` tags,
  alternate AC retention, sparse maps/passive Perception, defense/attack/spellcasting/audio/CR totals, explicit
  IDs in SQLite, intended JSON decoding, and both CR indexes. Ensure the real-data integration sweep pages every
  monster and serializes detail responses with the target contract.
- **Inherits:** M2.2's complete seed-to-client cutover.
- **Tests:** Full migration corpus test against the canonical migrated seed; `pytest` from the repository root;
  `npm run test`, `npm run typecheck`, and `npm run build` from `frontend/`.
- **🚦 Gate:** Every M1 acceptance invariant holds; the DB rebuilds cleanly; all suites are green and backend
  coverage retains the repository's enforced 90% threshold. Suite-sufficient; no browser automation unless
  requested. Commit message: `Stage M2.3: Verify migrated monster corpus`.

#### M3 — Monster CRUD endpoints (planned)

- **Build:** Real `create_monster` (POST `/monsters`, 201), `update_monster` (PUT `/monsters/{id}`),
  `delete_monster` (DELETE `/monsters/{id}`, 204) in `routers/monsters.py`, serializing the new JSON columns via
  `json.dumps`; enforce `name` uniqueness (409 on conflict). Flesh out the `client.ts` create/update/delete stubs.
  Update `docs/API_REFERENCE.md` Monsters table (add the three rows).
- **Inherits:** M2.3 schema, parse helpers, and corpus verification.
- **Tests:** backend — create happy path + duplicate-name 409 + update round-trip + delete-then-404; assert JSON
  columns persist and re-parse. Frontend — client fn unit tests (mock fetch).
- **🚦 Gate:** create → fetch → update → delete cycle passes in tests against the seeded test DB; ≥85% coverage.
  Suite-sufficient.

<!-- ============================================================================================= -->

---

## Design Phase MX — Experience (stat block, dice motif, authoring)

Redesign the read view into the bestiary field card, redesign the dice motif site-wide, and build the authoring
form on M3's CRUD. **Depends on:** M2 committed (new shape) and M3 committed (CRUD, for X3). **Do not start X1
before M2.**

| Stage | Model | Summary | Deliverables |
|-------|-------|---------|--------------|
| **X0 — Scaffolding** | Haiku | Component/CSS/test stubs for stat block, editor, dice chip. One context. | Stubs compile; app unchanged. |
| **X1 — Stat-block redesign** | Sonnet | The separated-region read view + `{@tag}` text rendering, consuming the M2 shape. | `MonsterStatBlock` + regions + tests. |
| **X2 — Dice motif redesign** | Sonnet | Role-aware rollable-die chip replacing the flat gold pill, site-wide. | Reworked `DiceText`/`.dice-*` + tests. |
| **X3 — Create / edit form** | Sonnet | Grouped authoring form mirroring the regions, wired to M3 CRUD + routes. | `MonsterEditor` + model + tests. |
| **X4 — Design pass** | Sonnet | `/frontend-design` review, a11y, responsive/mobile, reduced-motion, zero-bug. | Fixes + design tests. |

**Sequencing:** X0 (Haiku, first) → X1 → X2 → X3 → X4. X2 may run in parallel with X1 (different files) but
merges before X4.

<!-- ===== VERBOSE BLOCKS — one per un-shipped stage ===== -->

#### X0 — Scaffolding (planned)

- **Build:** Single Haiku context, stubs only:
  - `features/monsters/MonsterStatBlock.tsx` + `.css` — component stub rendering the region `<section>`s with
    headings and placeholder tapered-rule CSS, no data logic.
  - `features/monsters/MonsterEditor.tsx` + `monsterModel.ts` — form-shell + model stubs (no submit logic).
  - `components/DiceText.tsx` — leave working; add `// TODO(X2)` marker and a `role?` prop stub (unused).
  - `components/icons/index.ts` — add `DiceIcon` alias (`Dices`).
  - Route stub for `/monsters/new` + `/monsters/:id/edit` in `router.tsx` pointing at the editor stub.
  - `it.skip` test stubs for stat block, editor, and dice chip.
- **Inherits:** M2 types (already merged).
- **Tests:** suites green; new stubs skipped.
- **🚦 Gate:** `npm run build` + `npm run test` clean; app renders unchanged. Suite-sufficient.

#### X1 — Stat-block redesign (planned)

- **Build:** `MonsterStatBlock.tsx` renders the M2 monster into five tapered-rule-separated regions in the
  reading order **Identity → Defenses → Abilities → Actions → Lore** (see *Visual direction*). Wire it into
  `MonsterBrowserPage`'s detail pane (replace the current `<dl>`/grid/paragraph markup). Mirror `NPCStatCard`
  anatomy for the six-ability block and hidden-when-absent sections. Add a small `renderStatText` helper that
  converts `{@tag x||y}` markup to clean display text (per M1's transform) and passes prose through the
  redesigned `DiceText`. Consume `data-variant="monster"` for teal identity. Each region **hides entirely when
  its data is absent** (no empty headers).
- **Inherits:** M2 shape/types; `NPCStatCard` pattern; `DiceText` (X2 refines it, X1 works with either state).
- **Tests:** render tests — full-featured monster shows all five regions in order; a bare beast hides
  Actions/Lore sub-sections; tag markup renders as text not literal `{@...}`; six-ability block shows modifiers.
- **🚦 Gate:** browser pass **is** warranted here per `CLAUDE.md` (visual region separation is the whole point) —
  but only if the user asks for automation; otherwise report the manual check: open a simple, a caster, and a
  legendary monster and confirm region order, tapered rules, teal identity, and no empty sections. Suites green.

#### X2 — Dice motif redesign (planned)

- **Build:** Redesign `DiceText`/`.dice-pill` into the **role-aware rollable-die chip** (see *Visual direction*):
  chip inherits the surrounding content role's container color via a CSS custom property set by the nearest
  `data-variant` (default neutral), and prepends the `DiceIcon` glyph. Keep the existing regex and every call
  site. Add an optional `role` prop for call sites without an ambient variant. **This is site-wide** — verify
  spells, weapons, and monsters all still read well; the chip must never reduce contrast below the a11y floor.
- **Inherits:** X0 icon alias + `role` prop stub; the existing `DiceText` regex/call-site surface.
- **Tests:** `DiceText` unit tests — notation still matched and wrapped; glyph present; role prop / ambient
  variant drives the container color class; non-dice text passes through untouched. Snapshot the three variants.
- **🚦 Gate:** suites green; contrast check on teal/purple/gold chip backgrounds. Manual: glance at a spell, a
  weapon, and a monster and confirm the motif reads as one coherent, rollable chip. Suite-sufficient unless the
  user requests a visual pass.

#### X3 — Create / edit form (planned)

- **Build:** `MonsterEditor.tsx` + `monsterModel.ts` — an authoring form grouped into fieldsets that mirror the
  stat-block regions (Identity / Defenses / Abilities / Actions / Lore), following the repo's Browser/View/
  Editor/Model convention. Add/edit via M3 CRUD (`createMonster`/`updateMonster`); delete with `ConfirmDialog`.
  Wire `/monsters/new` and `/monsters/:id/edit` routes and an "Add monster" / "Edit" entry from the browser
  page. Client-side validation for required fields (name) and well-formed numeric AC/HP/scores. On save, refresh
  the list and select the new/edited monster.
- **Inherits:** M3 CRUD + client fns; X1 region taxonomy (fieldset groups match the display regions); X2 chip
  (preview of entered dice, optional).
- **Tests:** model unit tests (form ↔ payload mapping, validation); editor render test (fieldsets present,
  required-field error shows); an integration test for create-then-appears-in-list (mocked client).
- **🚦 Gate:** create a monster through the form, see it in the list and its stat block; edit and delete it. Browser
  pass warranted **only on user request**; otherwise report the manual create/edit/delete check. Suites green,
  ≥85% backend already covered by M3.

#### X4 — Design pass (planned)

- **Build:** `/frontend-design` review of the whole monster experience: region rhythm and tapered-rule
  execution, the die-chip motif in context, type scale adherence, teal-identity consistency, responsive down to
  mobile (stat block reflows, ability block wraps), keyboard focus visibility across the form, `prefers-reduced-
  motion` respected, no emoji/flat-text, no hue-alone cues. Fix any bugs found (zero-bug exit). Add a couple of
  design regression tests (mobile reflow, focus-visible on editor fields).
- **Inherits:** X1–X3 shipped.
- **Tests:** design regression tests added; full suite green; `npm run build`/`typecheck` clean.
- **🚦 Gate:** the experience is visually reviewed and bug-free at desktop and mobile widths. Per `CLAUDE.md`,
  drive the browser only if the user asks; otherwise deliver the manual review checklist and confirm suites green.

<!-- ============================================================================================= -->

---

## Shipped stages (collapsed record)

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| **M0** | Scaffolding: TODO(M2) marker on schemas, `scripts/migrate_monsters.py` stub, 501 CRUD endpoints, `client.ts` stubs, and `it.skip`/`@pytest.mark.skip` test placeholders. Gate ✅ suite-sufficient 2026-07-14. |

---

## Cross-references

- Reference docs this plan writes into: [`DATA_MODEL.md`](DATA_MODEL.md) (M2 monster columns),
  [`API_REFERENCE.md`](API_REFERENCE.md) (M2/M3 monster endpoints), [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md)
  (X2 die-chip anatomy, if it becomes a documented component).
- Sibling plans that consume monsters: [`encounters_plan.md`](encounters_plan.md) — encounter rosters derive
  AC/HP from monsters via `deriveCreatureStats`; M2 rewires that call.
- New doc produced by M1: `docs/monster_schema_decision.md` (the binding target-schema contract).

## Next:

**M1 acceptance review — target schema decision**, pending. M0 stubs and the M1 proposal are in place. Do not
start M2.1 until `docs/monster_schema_decision.md` is reviewed and accepted.
