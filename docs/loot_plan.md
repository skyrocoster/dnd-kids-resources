# Loot System — Plan Doc

> **Status:** L0→L2 shipped. **L3 (Loot bundle backend, Sonnet) queued next.** L4→L5 follow.

## What the feature is

A loot system for handing out treasure at the table. Two new domains that reuse existing patterns:

1. **Items catalog** — a reusable library of simple treasure items (a "Ruby", a "Silk Rope", a
   "Potion of Healing"). Modeled like the **weapons** catalog: a normalized reference table with its own
   full-CRUD browser page. An item is `name + value (gp) + category + description`. Built up over time and
   drawn from when assembling loot.
2. **Loot bundles** — named piles of treasure assembled from the catalog, modeled like **encounters**: a
   row holding a JSON array of entries plus a scalar. A bundle holds **catalog items** and **weapons**
   (each snapshotted with a per-entry **quantity**) plus a single **gold** amount. A bundle's total value
   is `gold + Σ(entry.value_gp × quantity)`.

The signature affordance is the **loot bundle editor**: pick items from the catalog, pick weapons from the
weapon catalog, set quantities, set a gold amount, watch the total update live — the encounter-editor flow
retargeted at treasure.

## Key facts / data facts (an executor needs these; don't re-derive)

- **Two patterns to copy, verbatim in shape:**
  - **Items catalog ≈ `weapons`** — normalized table, full CRUD router, `Item`/`ItemCreate`/`ItemUpdate`
    schemas, `features/weapons/` browser+editor shape. See `backend/app/routers/weapons.py`,
    `frontend/src/features/weapons/`.
  - **Loot bundle ≈ `encounter`** — one table row = `name` + a **JSON-array column** of snapshotted entries
    (encounters call theirs `units`; ours is `contents`) + a scalar (encounters have `active_index`; ours is
    `gold`). Copy `backend/app/routers/encounters.py` almost line-for-line (JSON parse on read via
    `parse_json_value`, `json.dumps` on write) and the `features/encounters/` editor + `AddMonsterPanel`
    picker flow.
- **Router prefix is `/api`.** Every router mounts at `APIRouter(prefix="/api", ...)`; endpoints are
  `/api/items`, `/api/loot-bundles`. (API_REFERENCE.md omits the `/api` prefix in its tables — match the
  existing docs' style there, but the real routes carry `/api`.)
- **Snapshot, not live-reference** (confirmed with user). When an item/weapon is added to a bundle, copy its
  `name` + per-unit `value_gp` (+ `category` for items) into the entry, keeping a soft `ref_id` back to the
  source row. Later edits or deletion of the catalog row do **not** mutate existing bundles — exactly how
  `encounter.units` snapshots monster HP while keeping a soft `monster_id`.
- **Gold is a decimal.** Store `gold` (bundle) and `value_gp` (item) as SQLite `REAL`, Pydantic `float`. No
  coin denominations yet — a single gp number so denomination conversion can layer on later.
- **Weapons have no gp value yet.** Weapon entries in a bundle carry `value_gp: null` (or `0`) and do **not**
  contribute to the total. Weapon valuation is deferred (see Known debt).
- **Category carries the icon, not the item** (confirmed with user). The category→icon+label mapping is a
  **frontend presentational constant** (`features/loot/itemCategories.ts`), mirroring
  `features/spells/constants.ts`. The backend stores `category` as a free TEXT slug; it does not own icons.
  Draw category icons from the already-populated **"Loot / Treasure / Economy"** and adjacent registry
  sections in `frontend/src/components/icons/index.ts` (e.g. `GemIcon`, `CoinsIcon`, `ScrollIcon`,
  `FlaskIcon`, `PaletteIcon`, `PackageIcon`/`ItemIcon`, `BackpackIcon`) — many are currently unused and this
  plan is where they get adopted.
- **Icon-key → component resolution precedent:** `DungeonViewPage.tsx`'s `getEntryTypeIcon` (a
  `Record<string, ReactNode>` with a fallback) is the pattern for resolving a category slug to a Lucide
  component. Reuse that shape.
- **Item name is NOT unique** (deliberate — allows a "Ruby" worth 50 and a "Ruby" worth 500). Weapons use
  `UNIQUE(name)`; items intentionally do not.
- **New-domain wiring checklist** (every place a domain touches): `scripts/init_database.py` (CREATE TABLE),
  `scripts/seed_database.py` (a `populate_*` fn + its registration + the module docstring list),
  `data/seeds/seed_*.json`, `backend/app/schemas.py`, `backend/app/routers/*.py`,
  `backend/app/main.py` (import + `include_router`), `frontend/src/api/types.ts`,
  `frontend/src/api/client.ts`, `frontend/src/router.tsx`, `frontend/src/layout/AppShell.tsx` (nav link).

## Design system in force

Loot is a **distinct entity type** and earns its own visual identity (per the MD3 distinct-entities
standard): a treasure/gold accent derived through MD3 custom-color **harmonization**, never a hand-picked
hex. Consume `--md-*`/`--type-*` tokens from `theme.css`; if a gold accent token doesn't exist, add it via
the documented custom-color path in `docs/DESIGN_SYSTEM.md`, not inline. Category icons are line icons from
the shared registry at the established sizes. Accessibility floor per `DESIGN_SYSTEM.md` (touch targets,
focus visibility, `aria-hidden` on decorative icons, `prefers-reduced-motion`).

## Reusable pieces (do not rebuild)

- `parse_json_value` / `dict_from_row` (`backend/app/db.py`) — JSON-column read helpers used by every router.
- `SearchList`, `Card`, `ConfirmDialog`, `SplitPane`, `FloatingWindow` (`frontend/src/components/`) — the
  browser/editor primitives every feature composes.
- `AddMonsterPanel.tsx` (`features/encounters/`) — the "search a catalog, click to add a snapshot to the
  working list" panel. `AddItemPanel`/`AddWeaponPanel` are this, retargeted at `/api/items` and `/api/weapons`.
- The weapons/encounters `*Form.ts` local-state model pattern (add/remove/update-field reducers held in
  component state) — copy for `itemForm.ts` and `lootBundleForm.ts`.
- Icon registry (`components/icons/index.ts`) — already has every icon this feature needs; import, don't add.

## Known debt / deferred (NOT built here)

- **Weapon valuation.** Weapons carry no gp value; weapon bundle-entries don't contribute to totals. A later
  stage can add `value_gp` to weapons and fold them into the sum.
- **Coin denominations / currency conversion.** Single decimal `gold`/`value_gp` only; cp/sp/ep/pp and
  conversion tables are future work.
- **Data-driven categories.** Categories live as a frontend constant. If categories ever need backend
  ownership (custom user categories, seeded reference rows with icon keys), promote to an `item_categories`
  reference table + `/api/item-categories` in `reference.py`.
- **Awarding loot to players / dungeons.** Attaching a bundle to a dungeon room, encounter reward, or a
  player's inventory is out of scope; this phase only authors bundles.
- **Randomized loot tables / dice-driven generation.** Bundles are hand-authored only.

---

## Design Phase L — Loot System

Delivers the items catalog and loot bundles end to end: schema, seeds, routers, both browser+editor
frontends, and a design pass. **Depends on:** nothing external. **Depended on by:** any future
"award loot" feature.

| Stage | Model | Summary | Deliverables |
|-------|-------|---------|--------------|
| **L0 — Scaffolding** | Haiku | Types/schemas/stub routers/CREATE TABLE stubs/empty seeds/placeholder components + nav/routes/`it.skip` tests. One context, no business logic. | Stubs compile; `pytest` collects; `npm run build` clean; new nav entries render empty pages. |
| **L1 — Items backend** | Sonnet | Implement `items` table, `/api/items` CRUD, seed sample items. | `items.py`, CREATE TABLE, `seed_items.json`, `populate_items`, backend tests, ref-doc rows. |
| **L2 — Items browser + editor** | Sonnet | `features/items/` browser+editor, category-icon constant, client+route+nav. | `ItemBrowserPage`, `ItemEditor`, `itemForm.ts`, `itemCategories.ts`, tests. |
| **L3 — Loot bundle backend** | Sonnet | Implement `loot_bundle` table, `/api/loot-bundles` CRUD, seed a sample bundle. | `loot.py`, CREATE TABLE, `seed_loot_bundles.json`, `populate_loot_bundles`, round-trip tests, ref-doc rows. |
| **L4 — Loot bundle browser + editor** | Sonnet | `features/loot/` browser (with totals) + editor with item/weapon pickers, quantities, gold, live total. | `LootBundleBrowserPage`, `LootBundleEditor`, `AddItemPanel`, `AddWeaponPanel`, `lootBundleForm.ts`, `lootTotals.ts`, client+route+nav, tests. |
| **L5 — Design pass** | Sonnet | `/frontend-design` review, distinct loot identity, a11y, empty states, zero-bug. | Fixes + design tests. |

**Sequencing:** L0 (Haiku, first) → then **L1 ∥ L3** (independent backends) → L2 (needs L1) → L4 (needs L2
for the item client/types + L3 for the bundle API) → L5 (needs L2+L4 live).

<!-- ===== VERBOSE BLOCKS — one per un-shipped stage (L3→L5). Delete a block and collapse it to a
      Shipped row the moment that stage ships; the remaining blocks stay until their own turn. ===== -->

#### L3 — Loot bundle backend (planned — Sonnet; independent of L2, may run in parallel after L1)

- **Build:**
  - `backend/app/routers/loot.py` — implement full `/api/loot-bundles` CRUD by copying `encounters.py`
    almost verbatim: `SELECT id, name, gold, contents`, parse `contents` with `parse_json_value` on read,
    `json.dumps(contents)` on write, using the L0 `LootBundle`/`LootBundleCreate`/`LootBundleUpdate` schemas.
  - `scripts/init_database.py` — the `loot_bundle` CREATE TABLE (L0 stubbed it): `id PK`, `name TEXT NOT
    NULL`, `gold REAL NOT NULL DEFAULT 0`, `contents TEXT NOT NULL DEFAULT '[]'`, `created_at`/`updated_at`.
  - `data/seeds/seed_loot_bundles.json` — one sample bundle whose `contents` mixes an **item** entry and a
    **weapon** entry (with quantities) plus a `gold` amount, to prove the round-trip and give L4 a browser row.
  - `scripts/seed_database.py` — implement `populate_loot_bundles` (L0 stub) and keep it registered.
  - Rebuild DB: `python scripts/init_database.py && python scripts/seed_database.py`.
  - **Reference docs (same commit):** API_REFERENCE.md (Loot Bundles router section + `LootBundle` shape),
    DATA_MODEL.md (`seed_loot_bundles → loot_bundle` row, `contents` JSON column, snapshot/soft-ref note),
    ARCHITECTURE.md (`loot.py` router row).
- **Inherits:** L0 schemas, `main.py` router registration, the table + empty-seed stubs.
- **Tests:** `backend/tests/routers/test_loot.py` — list/get/create/update/delete smoke **plus** a
  round-trip test asserting a bundle created with a mixed item+weapon+gold `contents` reads back byte-intact
  (JSON fidelity, snapshot fields preserved). Keep ≥85% coverage.
- **🚦 Gate:** suite suffices. `pytest` from repo root green; init+seed run clean; `GET /api/loot-bundles`
  returns the seeded bundle with `contents` parsed to objects.

#### L4 — Loot bundle browser + editor (planned — Sonnet; needs L2 for the item client + L3 for the API)

- **Build:**
  - `frontend/src/features/loot/LootBundleBrowserPage.tsx` — list + search; each row shows name and the
    **computed total** from `lootTotals.ts`. Copy `EncounterBrowserPage`.
  - `frontend/src/features/loot/LootBundleEditor.tsx` — `name` field, `gold` number input, the working
    `contents` list with per-entry **quantity steppers** + remove, `AddItemPanel` + `AddWeaponPanel` to
    append snapshots, and a **live total** (`gold + Σ value_gp×quantity`). Save via create/update. Mirror
    `EncounterEditor`.
  - `frontend/src/features/loot/AddItemPanel.tsx` — search `/api/items`, click appends a snapshot entry
    `{kind:'item', ref_id:item.id, name, value_gp, category, quantity:1}`. Copy `AddMonsterPanel`.
  - `frontend/src/features/loot/AddWeaponPanel.tsx` — search `/api/weapons`, click appends
    `{kind:'weapon', ref_id:weapon.id, name, value_gp:null, quantity:1}`.
  - `frontend/src/features/loot/lootBundleForm.ts` — reducer: `setName`, `setGold`, `addEntry` (snapshots
    at add-time), `removeEntry`, `setQuantity`.
  - `frontend/src/features/loot/lootTotals.ts` — `computeBundleTotal(gold, contents)` = `gold + Σ((value_gp
    ?? 0) × quantity)`; weapon entries (`value_gp: null`) contribute 0.
  - Point route `/loot` at the real browser; confirm the `*LootBundle` client functions and nav link.
- **Inherits:** L2's item client/types + `categoryIcon` (for entry icons); L3's `/api/loot-bundles` API and
  seeded bundle; L0 scaffolds (`LootEntry` type, route, nav, client stubs).
- **Tests:** `lootBundleForm` reducer (add/remove/quantity/gold; snapshot stays fixed when catalog would
  change); `lootTotals` selector (mixed entries, weapon-null ignored, quantity multiply, decimal gold);
  `AddItemPanel`/`AddWeaponPanel` render + add; `LootBundleEditor` render + save; browser render with total.
- **🚦 Gate:** suite suffices for logic. Manual (user): assemble a bundle mixing items + weapons + gold,
  confirm quantities multiply, the total live-updates, and save→reopen persists the snapshots.

#### L5 — Design pass (planned — Sonnet; needs L2 + L4 live)

- **Build:** `/frontend-design` review of the items and loot surfaces. Give loot its **distinct treasure
  identity** via an MD3-harmonized gold accent token (added through the `DESIGN_SYSTEM.md` custom-color path,
  never a hand-picked hex); polish category icons; add empty states for both browsers; a11y sweep
  (touch-target floor, focus visibility, `aria-hidden` on decorative icons, `prefers-reduced-motion`);
  zero-bug pass over gp decimal formatting, quantity steppers, and total rounding.
- **Inherits:** the shipped L2 + L4 UI.
- **Tests:** extend `theme-tokens.test.mjs` for any new accent token; render/regression tests for each fix.
- **🚦 Gate:** design review complete; suite green. Manual (user): visual pass over both browsers and the
  bundle editor in light + dark.

<!-- ============================================================================================= -->

### Shipped stages table (the collapsed record)

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| L0 — Scaffolding | Added item and loot schemas, tables, seed-pipeline hooks, typed client stubs, placeholder pages, routes, navigation, category icons, and skipped frontend tests. |
| L1 — Items backend | Implemented item catalog CRUD with duplicate names permitted, seeded three sample items, added API tests, and documented the new items/loot domains. |
| L2 — Items browser + editor | Replaced the placeholder with searchable catalog browser and CRUD editor, added validated form state and full category-icon mapping, and converted the skipped tests to browser, editor, form, and icon coverage. |

---

## Cross-references

- Patterns copied: `docs/dungeon_plan.md` (encounter authoring shape), `backend/app/routers/encounters.py`,
  `backend/app/routers/weapons.py`, `frontend/src/features/encounters/`.
- Reference docs this phase writes into (update in the same commit as the structural stage):
  `docs/ARCHITECTURE.md` (router + feature-folder tables), `docs/API_REFERENCE.md` (Items + Loot Bundles
  router sections + response shapes), `docs/DATA_MODEL.md` (seed→table rows, `loot_bundle.contents` JSON
  column, snapshot/soft-ref relationships).
- Design: `docs/DESIGN_SYSTEM.md` (loot accent via MD3 harmonization).

## Next:

**L3 — Loot bundle backend (Sonnet).** Unblocked; start here.
