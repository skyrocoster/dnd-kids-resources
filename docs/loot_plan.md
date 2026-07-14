# Loot System — Plan Doc

> **Status:** L0→L5 shipped (catalog + bundles authored). Design Phase M (loot on the dungeon map)
> is shipped (M0→M3).

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
- **Awarding loot to players / encounters.** Attaching a bundle to a **map prop / token** on the dungeon
  map is now **in scope as Design Phase M** (below). Still deferred: encounter-reward links and a player's
  inventory.
- **Randomized loot tables / dice-driven generation.** Bundles are hand-authored only.
- **Bundle-specific item editing.** A future editor may let a catalog item snapshot be edited into a unique
  item for just that loot bundle, without changing the source catalog item.

---

## Shipped stages (collapsed history)

Phase L (items catalog + loot bundles, end to end) is complete; each stage's authoring detail lives in
its git commit. Reusable outputs are promoted to the top-matter **Reusable pieces** / **Key facts**.

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| L0 — Scaffolding | Added item and loot schemas, tables, seed-pipeline hooks, typed client stubs, placeholder pages, routes, navigation, category icons, and skipped frontend tests. |
| L1 — Items backend | Implemented item catalog CRUD with duplicate names permitted, seeded three sample items, added API tests, and documented the new items/loot domains. |
| L2 — Items browser + editor | Replaced the placeholder with searchable catalog browser and CRUD editor, added validated form state and full category-icon mapping, and converted the skipped tests to browser, editor, form, and icon coverage. |
| L3 — Loot bundle backend | Implemented loot-bundle CRUD with JSON snapshot round-tripping, seeded a mixed item/weapon bundle, added API and real-data tests, and documented the router and data model. |
| L4 — Loot bundle browser + editor | Added searchable bundle browsing with computed totals and a snapshot-based editor with item/weapon pickers, quantities, gold, and live totals; added focused reducer, selector, picker, editor, and browser tests. |
| L5 — Design pass | Activated the MD3-harmonized loot accent across item and bundle surfaces, added actionable empty states, and raised loot controls to the 48px touch-target floor; added regression coverage for the new variant and empty states. |
| M2 — Inspector contents + marker badge | Replaced the prop loot placeholder with a live, soft-referenced bundle summary covering loading, missing, and failed requests; added the loot glyph badge and Map Lab regression coverage. |
| M3 — Design pass | Refined the Map Lab loot identity with a high-contrast coin badge and treasure-ledger summary, raised the bundle picker to the 48px touch-target floor, and added explicit loading, unavailable, removed, and gold-only states with regression coverage. |

---

## Design Phase M — Loot on the Map

Ties an authored loot bundle to a **prop/token on the dungeon map**: the DM points a chest (or any prop)
at a bundle in the Map Lab editor, and the inspector then shows that bundle's treasure live — name, total
gp, and the item/weapon list — replacing the inert "Contents — added with the loot system" placeholder row
shipped in dungeon Phase F4. Frontend-only and self-contained to `frontend/src/features/dungeons/maplab/`
(+ the shared loot helpers): the link round-trips inside the existing `map_layout` blob, so **no backend,
schema, seed, or router change**. **Depends on:** L2 (item client/types) + L4 (`lootTotals.ts`,
`itemCategories.ts`, `listLootBundles`/`getLootBundle`) — all shipped. **Depended on by:** any future
"reveal loot at the table" / award-to-player flow.

### Key facts (an executor needs these; don't re-derive)

- **Fill the reserved seam — don't add a new one.** Dungeon Phase F reserved exactly two slots for this:
  the empty `PropLoot` interface on `MapProp.loot?` (`maplab/maplabModel.ts` ~line 83–99) and the
  `aria-disabled` `.maplab-loot-hook-row` in `maplab/InspectorPanel.tsx` (~line 70–75, CSS in
  `MapLabPage.css` ~line 349). This phase types `PropLoot` and replaces that row's content — it does not
  introduce a parallel field, row, or model.
- **Soft-reference, NOT snapshot** — this is the deliberate exception to the loot system's snapshot rule.
  A bundle's *own* entries snapshot their catalog rows (`LootEntry.ref_id`), but a **map prop links to a
  bundle by id and renders it live** — a chest should reflect the bundle's current contents, and a bundle
  is re-editable in its own browser. Shape: `PropLoot = { bundle_id: number; bundle_name?: string }`.
  `bundle_name` is a cached label for display before/if the bundle list resolves (and a breadcrumb if the
  bundle is later deleted); the authoritative contents come from `getLootBundle(bundle_id)` at render time.
- **Copy the encounter-picker pattern verbatim.** The prop already links to an encounter the exact way
  this needs to link to a bundle: the `encounterPicker` `FieldSpec` type (`fixtureTypes.ts`), the
  `encounter_id` entry in `PROP_FIELDS`, and `EncounterPickerField` (`FixturePropertiesForm.tsx`, options
  from `listEncounters()`). Add a parallel `lootBundlePicker` field type, a `loot` entry in `PROP_FIELDS`,
  and a `LootBundlePickerField` populated from `listLootBundles()`. Gate it with
  `showWhen: (v) => v.kind !== 'encounter'` (an encounter prop uses `encounter_id`, not loot).
- **Nested-object field precedent exists.** The picker writes a nested object under the `loot` key, exactly
  as the portal/stair `destinationPicker` writes `{ z, cell }` under the `to` key — the generic
  `FixturePropertiesForm`/reducer already round-trip a nested value, so no form rewrite is needed.
- **Reuse the loot render helpers, don't rebuild.** Total via `computeBundleTotal(gold, contents)` +
  `formatGp` (`features/loot/lootTotals.ts`); per-entry category icon via `features/loot/itemCategories.ts`
  (weapons use the weapon/swords glyph). Client calls `listLootBundles`/`getLootBundle` already exist in
  `api/client.ts` — import, don't add.
- **Loot accent already banked.** `--md-loot` (DP1) is the harmonized treasure accent — use it for the
  loot-bearing prop's marker badge and the inspector loot summary. No new hue; the marker must stay
  distinguishable by glyph, not hue alone (accessibility floor).
- **No `normalizeLayout` change required** — `loot` is optional on `MapProp`; legacy props simply lack it.

### Design system in force

Reuse the loot identity established in Phase L: the `--md-loot` accent from `theme.css`, category line
icons from the shared registry at the established sizes, and the `DESIGN_SYSTEM.md` accessibility floor
(48px touch targets on the picker/reveal control, `aria-hidden` on decorative icons, focus visibility,
`prefers-reduced-motion`, never hue-alone).

### Reusable pieces (do not rebuild)

- `features/loot/lootTotals.ts` (`computeBundleTotal`, `formatGp`), `features/loot/itemCategories.ts`
  (category → icon+label), `api/client.ts` (`listLootBundles`, `getLootBundle`).
- `maplab/FixturePropertiesForm.tsx` `EncounterPickerField` (the catalog-`<select>` picker to mirror),
  `maplab/fixtureTypes.ts` (`FieldSpec`/`PROP_FIELDS`/`FIXTURE_TYPES` registry seam),
  `maplab/InspectorPanel.tsx` (the panel + the reserved loot row to replace), `maplab/PropMarker.tsx`
  (the marker that gains a loot badge).

| Stage | Model | Summary | Deliverables |
|-------|-------|---------|--------------|
| **M0 — Scaffolding** | Haiku | Shipped the typed `PropLoot` seam, `lootBundlePicker` registry field, inspector shell, placeholder CSS, and test stubs. | Map Lab behavior unchanged. |
| **M1 — Editor bundle picker** | Sonnet | Shipped the bundle selector backed by `listLootBundles`; it writes or clears the nested soft-reference with its cached name and preserves it through the prop reducer/layout serialization. | Picker and reducer round-trip tests. |
| **M2 — Inspector contents + marker badge** | Sonnet | Shipped live soft-referenced bundle summary states, category/weapon entry icons, and the distinguishable `--md-loot` marker glyph. | Inspector/marker coverage in the Map Lab suite. |
| **M3 — Design pass** | Sonnet | `/frontend-design` review, distinct loot identity on the map, a11y, empty/loading/deleted states, zero-bug. | Fixes + design/regression tests. |

**Sequencing:** M0 (Haiku, first) → then **M1 ∥ M2** (write-side editor vs. read-side inspector/marker
both need only M0's `PropLoot` shape; no dependency between them) → M3 (needs M1+M2 live).

<!-- ============================================================================================= -->

---

## Cross-references

- Patterns copied: `docs/dungeon_plan.md` (encounter authoring shape), `backend/app/routers/encounters.py`,
  `backend/app/routers/weapons.py`, `frontend/src/features/encounters/`.
- Reference docs this phase writes into (update in the same commit as the structural stage):
  `docs/ARCHITECTURE.md` (router + feature-folder tables), `docs/API_REFERENCE.md` (Items + Loot Bundles
  router sections + response shapes), `docs/DATA_MODEL.md` (seed→table rows, `loot_bundle.contents` JSON
  column, snapshot/soft-ref relationships).
- Design: `docs/DESIGN_SYSTEM.md` (loot accent via MD3 harmonization).
- Phase M consumes the dungeon Map Lab: `docs/dungeon_plan.md` (the reserved `MapProp.loot` slot + F4
  inert "Contents" row this phase fills), `frontend/src/features/dungeons/maplab/` (`maplabModel.ts`,
  `fixtureTypes.ts`, `FixturePropertiesForm.tsx`, `InspectorPanel.tsx`, `PropMarker.tsx`). Frontend-only —
  no reference-doc (`ARCHITECTURE/API_REFERENCE/DATA_MODEL`) change, since it round-trips in `map_layout`.

## Next:

No loot-system stage is currently planned.
