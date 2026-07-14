# Monsters — Data Restructure & Stat-Block Redesign

> **Status:** M3, X0, X1, X2, X3 shipped. X4 is next: design pass.

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

**Sequencing:** X0 (Haiku, first) → X1 → X2 → X3 → X4.

<!-- ===== VERBOSE BLOCKS — one per un-shipped stage ===== -->

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
| **M1** | Seed discovery & target schema: deep-read the 2,276-row seed, decided keep/drop/reshape for all 30 fields, and committed `docs/monster_schema_decision.md` as the binding contract. Gate ✅ human review accepted. |
| **M2.1** | Deterministic migration engine: `scripts/migrate_monsters.py` now performs the accepted M1 source-to-target transform with contextual failures for markup, audio, CR, XP, and malformed structures. Fixture tests cover Wolf, Mage, Adult Red Dragon, alternate movement, conditional defenses, CR/XP/unknown CR, deterministic output, and invalid tag/audio failures; canonical seed/runtime contracts remain unchanged. |
| **M2.2** | Atomic contract cutover: canonical monster seed rewritten to the authorable target shape, SQLite projection/seed loading updated with explicit IDs and CR indexes, strict backend/frontend Monster contracts installed, and legacy browser/encounter consumers rewired to `ac.value`, `abilities`, and `features.actions`. Reference docs were updated and focused backend/frontend gates passed; browser automation was not run per repo guidance. |
| **M2.3** | Corpus conformance and release verification: canonical migrated seed audit tests now enforce row/ID/name counts, no legacy fields or residual tags, aggregate rich-data totals, Pydantic contract validation, SQLite explicit IDs/JSON projection, and both CR indexes. Real-data integration now pages every monster and serializes every detail response against the target contract; DB rebuild and full backend/frontend gates passed. |
| **M3** | Monster CRUD endpoints: backend POST/PUT/DELETE now serialize the M2 JSON columns, compute `cr_sort`, enforce unique names with 409 conflicts, and return parsed `Monster` responses. Frontend client CRUD functions were wired and backend/frontend tests cover create/fetch/update/delete and conflict behavior. |
| **X0** | Scaffolding: MonsterStatBlock/MonsterEditor/monsterModel stubs, DiceText role prop stub + TODO(X2), DiceIcon alias, route stubs for /monsters/new and /monsters/:id/edit, it.skip test stubs. Gate ✅ suite-sufficient. |
| **X1** | Stat-block redesign: MonsterStatBlock renders five region-ordered sections (Identity→Defenses→Abilities→Actions→Lore) with tapered teal rules, hidden-when-absent sections, DiceText-wired prose, and six-ability block. MonsterBrowserPage rewired from old dl/grid to MonsterStatBlock. 8 render tests pass. Gate ✅ suite-sufficient. |
| **X2** | Dice motif redesign: flat gold `.dice-pill` replaced with role-aware rollable-die chip inheriting `--variant-container`/`--variant-on-container` from ambient `data-variant` (default neutral), prepending DiceIcon glyph. Added optional `role` prop. 10 unit tests, full suite green. Gate ✅ suite-sufficient. |
| **X3** | Create/edit form: `MonsterEditor` with five fieldsets (Identity/Defenses/Abilities/Actions/Lore) wired to M3 CRUD, `monsterForm.ts` mapping/validation, Add/Edit buttons on browser page, post-save auto-select. 8 model/render tests, full suite green. Gate ✅ suite-sufficient. |

---

## Cross-references

- Reference docs this plan writes into: [`DATA_MODEL.md`](DATA_MODEL.md) (M2 monster columns),
  [`API_REFERENCE.md`](API_REFERENCE.md) (M2/M3 monster endpoints), [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md)
  (X2 die-chip anatomy, if it becomes a documented component).
- Sibling plans that consume monsters: [`encounters_plan.md`](encounters_plan.md) — encounter rosters derive
  AC/HP from monsters via `deriveCreatureStats`; M2 rewires that call.
- New doc produced by M1: `docs/monster_schema_decision.md` (the binding target-schema contract).

## Next:

**X4 — Design pass**. `/frontend-design` review, a11y, responsive/mobile, reduced-motion, zero-bug.
