# Loot System — Plan Doc

> **Status:** Loot system complete. Phase L (items catalog + loot bundles) and Phase M (loot on the dungeon
> map) shipped.

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
- **Map props are the exception** — a map prop links to a bundle by `bundle_id` and renders it **live**, so
  a chest reflects the bundle's current contents. Shape: `PropLoot = { bundle_id: number; bundle_name?:
  string }`. The `bundle_name` is a cached label for display before the bundle resolves (and a breadcrumb if
  the bundle is deleted); the authoritative contents come from `getLootBundle(bundle_id)` at render time.
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
- `features/loot/lootTotals.ts` (`computeBundleTotal`, `formatGp`), `features/loot/itemCategories.ts`
  (category → icon+label).
- `maplab/InspectorPanel.tsx` — the loot-hook row showing live bundle summary with loading/missing/removed
  states. `maplab/PropMarker.tsx` — gains the `--md-loot` coin badge for loot-bearing props.
- `maplab/FixturePropertiesForm.tsx` — the `LootBundlePickerField` pattern for selecting bundles in the
  prop editor, backed by `listLootBundles()`.

## Known debt / deferred (NOT built here)

- **Weapon valuation.** Weapons carry no gp value; weapon bundle-entries don't contribute to totals. A later
  stage can add `value_gp` to weapons and fold them into the sum.
- **Coin denominations / currency conversion.** Single decimal `gold`/`value_gp` only; cp/sp/ep/pp and
  conversion tables are future work.
- **Data-driven categories.** Categories live as a frontend constant. If categories ever need backend
  ownership (custom user categories, seeded reference rows with icon keys), promote to an `item_categories`
  reference table + `/api/item-categories` in `reference.py`.
- **Awarding loot to players / encounters.** Bundles can be attached to a map prop (shipped in Phase M).
  Still deferred: encounter-reward links and a player's inventory.
- **Randomized loot tables / dice-driven generation.** Bundles are hand-authored only.
- **Bundle-specific item editing.** A future editor may let a catalog item snapshot be edited into a unique
  item for just that loot bundle, without changing the source catalog item.

---

## Shipped stages (collapsed history)

Each stage's authoring detail lives in its git commit. Reusable outputs are promoted to the top-matter
**Reusable pieces** / **Key facts**.

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| L0 — Scaffolding | Added item and loot schemas, tables, seed-pipeline hooks, typed client stubs, placeholder pages, routes, navigation, category icons, and skipped frontend tests. |
| L1 — Items backend | Implemented item catalog CRUD with duplicate names permitted, seeded three sample items, added API tests, and documented the new items/loot domains. |
| L2 — Items browser + editor | Replaced the placeholder with searchable catalog browser and CRUD editor, added validated form state and full category-icon mapping, and converted the skipped tests to browser, editor, form, and icon coverage. |
| L3 — Loot bundle backend | Implemented loot-bundle CRUD with JSON snapshot round-tripping, seeded a mixed item/weapon bundle, added API and real-data tests, and documented the router and data model. |
| L4 — Loot bundle browser + editor | Added searchable bundle browsing with computed totals and a snapshot-based editor with item/weapon pickers, quantities, gold, and live totals; added focused reducer, selector, picker, editor, and browser tests. |
| L5 — Design pass | Activated the MD3-harmonized loot accent across item and bundle surfaces, added actionable empty states, and raised loot controls to the 48px touch-target floor; added regression coverage for the new variant and empty states. |
| M0 — Scaffolding | Types the `PropLoot` seam on `MapProp.loot?`, registers the `lootBundlePicker` field type, stubs the inspector loot-hook shell and CSS, and adds test stubs — Map Lab behavior unchanged. |
| M1 — Editor bundle picker | Ships the bundle selector backed by `listLootBundles`; writes or clears the nested soft-reference with its cached name and preserves it through the prop reducer and layout serialization. |
| M2 — Inspector contents + marker badge | Replaced the prop loot placeholder with a live, soft-referenced bundle summary covering loading, missing, and failed requests; added the loot glyph badge and Map Lab regression coverage. |
| M3 — Design pass | Refined the Map Lab loot identity with a high-contrast coin badge and treasure-ledger summary, raised the bundle picker to the 48px touch-target floor, and added explicit loading, unavailable, removed, and gold-only states with regression coverage. |

## Verification

The loot system is end-to-end: items catalog → bundle authoring → map prop attachment. Confirm with:
- `npm run build` / `pytest` from repo root — both green
- Add/edit/delete an item in the items browser (`/items`)
- Create a loot bundle with a mix of items + weapons + gold; verify the live total and save→reopen round-trip
- In Map Lab, select a prop, set "Loot bundle" to the bundle; verify the inspector shows the bundle summary
  and the prop marker carries the coin badge
- Delete the bundle from the loot browser; verify the inspector shows "not available" for the prop

## Cross-references

- Patterns copied: `docs/dungeon_plan.md` (encounter authoring shape), `backend/app/routers/encounters.py`,
  `backend/app/routers/weapons.py`, `frontend/src/features/encounters/`.
- Reference docs: `docs/ARCHITECTURE.md` (router + feature-folder tables), `docs/API_REFERENCE.md`
  (Items + Loot Bundles router sections + response shapes), `docs/DATA_MODEL.md` (seed→table rows,
  `loot_bundle.contents` JSON column, snapshot/soft-ref relationships).
- Design: `docs/DESIGN_SYSTEM.md` (loot accent via MD3 harmonization).
- Map Lab integration: `docs/dungeon_plan.md`, `frontend/src/features/dungeons/maplab/` (`maplabModel.ts`,
  `fixtureTypes.ts`, `FixturePropertiesForm.tsx`, `InspectorPanel.tsx`, `PropMarker.tsx`).
