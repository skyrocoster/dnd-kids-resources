# Design Phase F — Room Props (static objects: chests, tables, mirrors…)

## Context

The Map Lab can author rooms, doors, and stairs, but rooms are empty shells — there's no way to place
the static furniture a DM narrates around (chests, tables, mirrors, statues, barrels). This phase adds a
**generic, flexible "prop" system**: place a static object **on a grid square** or **attached to a wall**,
give it `hidden` / `locked` / `perception` (and the rest of the proven passage flag bundle), and reserve a
**loot hook** so the future loot system can hang contents off a prop without a re-model.

**This is not a greenfield build — it lights up a seam that already exists.** The model reserves an
unrendered `MapItem` type (`{ item_id, cell, title }`), a `layout.items` array, an `Inspectable`
`kind:'item'` variant, an `inspectableDescriptor` item branch, an `ItemIcon`, and a `FIXTURE_TYPES`
registry whose comments explicitly name a future `chest`/`window` entry that "renders through the same form
with no rewrite." Nothing renders or authors items today. Phase F extends that seam into a real feature by
**mirroring the door/stair patterns** (glyph render, click-to-select, generic properties form, autosaved
reducer).

**Decisions locked with the user:**
- **Name = `prop`** (not "item"). Rename the reserved slot to `MapProp` / `layout.props` /
  `kind:'prop'` / `PropIcon` now, while it's unrendered and cheap, to avoid a permanent collision with the
  coming loot **items** system.
- **Flags = the full door bundle** — reuse `PassageFlags` wholesale (`hidden`, `locked`, `trapped`,
  `breakDc`, `pickDc`, `hiddenDc`=“Perception DC”, `note`), not just the three named. Maximum flexibility,
  zero new form code.

All work is **frontend-only** (no backend/seed change — props round-trip inside the opaque `map_layout`
blob that autosave already persists). Consume `theme.css` tokens and existing `maplabModel` helpers; never
hand-pick color or rebuild geometry. This becomes **Design Phase F** appended to `docs/dungeon_plan.md`.

---

## Design shape (the model)

```ts
// maplabModel.ts — MapItem RENAMED to MapProp and grown:
export interface PropLoot { /* reserved forward-compat slot; the future loot phase fills this */ }

export interface MapProp extends PassageFlags {   // inherits hidden/locked/trapped/breakDc/pickDc/hiddenDc/note
  prop_id: number
  kind: string                 // 'chest' | 'table' | 'mirror' | 'barrel' | 'statue' | 'other' — picks the icon
  cell: MapCell                // absolute [x,y] the prop occupies
  side?: CardinalSide          // ABSENT = sits on the square; PRESENT = attached to that wall of the cell
  title?: string
  loot?: PropLoot              // UNRENDERED, untouched by the form; round-trips via autosave
}
// MapLayout.items -> MapLayout.props: MapProp[]
// Inspectable: { kind: 'prop'; prop: MapProp } (was 'item')
```

**Placement is a single discriminator (`side`), not two tools.** One "Place prop" tool drops an on-square
prop; the inspector's **Attach to wall** select (`Off` / `N` / `S` / `E` / `W`) converts it to
wall-attached by setting `side`. Reuses `doorWallSegment`/`WallEdge` geometry for the wall case and the
stair-marker centering for the on-square case — no new geometry.

**Kind is a select field, not a registry entry per kind.** One `FIXTURE_TYPES.prop` spec with all fields;
a new `'select'` `FieldSpec` type lets the properties form pick `kind`. Icon resolves from a
`PROP_KIND_ICONS: Record<string, LucideIcon>` map. Generic and flexible — new kinds are one map + one
option entry, no new component.

**Presentation reuses the passage machinery.** The kind icon is the primary glyph; `hidden`/`locked`/
`trapped` state comes from `passagePresentation(prop)` (dashed outline + `EyeOff` for hidden, `Lock` badge
for locked, `Trap` badge for trapped) and its `token` CSS-var drives color — identical language to doors,
never hue-alone (icon + shape always). Props are static: **no session open/closed toggle** for MVP
(authored flags only); a session/disarm layer can be added later like doors have.

---

## Critical files

| File | Role in this phase |
|---|---|
| `frontend/src/features/dungeons/maplab/maplabModel.ts` | `MapProp` type, `PropLoot`, rename `items→props`, `Inspectable`/`inspectableDescriptor` prop branch, `nextPropId`, reuse `passagePresentation`/`passageDescriptorLines`/`doorWallSegment`. |
| `frontend/src/features/dungeons/maplab/fixtureTypes.ts` | `FieldSpec` gains `'select'` + `options?`; new `PROP_FIELDS`, `FIXTURE_TYPES.prop`, `PROP_KIND_ICONS`, kind option list. |
| `frontend/src/features/dungeons/maplab/maplabEditor.ts` | `selectedPropId` on `EditorState`; `addProp`/`selectProp`/`deleteProp` actions + widen `updateFixtureFlags` to `'prop'`; mutual-exclusion with room/door selection. |
| `frontend/src/features/dungeons/maplab/useMapLabEditor.ts` | Bind `addProp`/`selectProp`/`deleteProp`/`updateFixtureFlags('prop',…)` through the debounced-autosave `apply` path (selection via direct dispatch, mirroring `selectDoor`). |
| `frontend/src/features/dungeons/maplab/MapLabPage.tsx` (viewer) & `MapLabEditorPage.tsx` (editor) | Render `layout.props`; editor adds "Place prop" mode + placement overlay + inspector-rail prop branch. |
| `frontend/src/components/icons/index.ts` | Add `PropIcon` + kind/state icons (verify Lucide export names). |
| `frontend/src/features/dungeons/maplab/MapLabPage.css` / `MapLabEditor.css` | `.maplab-prop*` marker/badge/placement classes (tokens only). |
| `frontend/src/features/dungeons/maplab/maplabData.ts` | Seed one example prop so it renders before authoring exists. |
| `docs/dungeon_plan.md` | Append the Phase F section + shipped-stages rows. |

**Reused as-is (do not rebuild):** `doorWallSegment`, `WallEdge`, `passagePresentation`,
`passageDescriptorLines`, `effectivePassageState`, `roomOfCell`, `paddedBounds`; `FixturePropertiesForm`
(generic — only needs the new `'select'` field type); the door lifecycle test as a template
(`__tests__/MapLabEditorPage.test.tsx` ~147–210); the `MapCanvas` shared canvas; `.maplab-pill-button` /
`.maplab-toolbar-group` / `.maplab-inspector-rail` design system.

---

## Staging (mirrors the project's staged-plan convention)

Each stage is self-contained, adds vitest tests per `docs/TESTING.md`, and must pass the real typecheck
(`npm run typecheck` = `tsc -b`, **not** `tsc --noEmit`) + `npm run build`; `python -m pytest` stays
green/unaffected (frontend-only). Reasoning stages end with a **🚦 live gate: drive both
`/dungeons/map-lab` and `/dungeons/map-lab/edit` and get explicit user acceptance before the next stage.**

### Stage 0 — Scaffolding (Haiku 4.5, one context, mechanical only)
Pure rename + stubs + declarations; no algorithms/render/design.
- `maplabModel.ts`: rename `MapItem→MapProp`, `MapLayout.items→props`, `Inspectable` `'item'→'prop'`,
  descriptor `case 'item'→'prop'` (keep returning minimal lines for now); add `extends PassageFlags`,
  `kind`, `side?`, `loot?`, the empty `PropLoot` interface; add `nextPropId` **stub** (`throw`/placeholder).
- `fixtureTypes.ts`: add `'select'` to `FieldSpec.type` + `options?`; declare `PROP_FIELDS`,
  `FIXTURE_TYPES.prop` (defaultFlags), `PROP_KIND_ICONS`, kind option list. No form change yet.
- `maplabEditor.ts` / `useMapLabEditor.ts`: add `selectedPropId`, the three action union members + widen
  `updateFixtureFlags` type to include `'prop'`, and no-op/passthrough reducer branches + hook bindings so
  it compiles.
- `icons/index.ts`: add `PropIcon` and kind/state icons as one-line Lucide re-exports — **verify each name
  exists in the installed `lucide-react`** (e.g. chest→`Package`/`Box`/`Vault`, table→`Table`, mirror→
  `Frame`/`RectangleVertical`, barrel→`Barrel`?/fallback, statue→fallback, perception→`Eye`). Stage-0 icon
  typos bit earlier phases twice — check before relying.
- `maplabData.ts`: seed one example prop (a locked chest in the Armoury, room 23) so Stage F2 has something
  to render; update every inlined test-fixture `items: []` → `props: []` so the suite compiles.
- CSS placeholder classes; `it.skip` test stubs (`prop reducer`, `prop render` both pages, `prop authoring`).
- **Append the Phase F skeleton to `docs/dungeon_plan.md`** ("Next" section) so the doc leads the build.
- **Verify:** `npm run typecheck` clean; `npm run test` green (skips); viewer + all suites unaffected.

### Stage F1 — Model + reducer logic (Sonnet, headless)
- Implement `nextPropId` (`max(0,…prop_id)+1`); `addProp`/`selectProp`/`deleteProp` reducer branches
  mirroring `addDoor`/`selectDoor`/`deleteDoor`, seeding flags from `FIXTURE_TYPES.prop.defaultFlags`,
  selecting the new prop, and **clearing `selectedRoomId`/`selectedDoorId` on select** (three-way mutual
  exclusion); `updateFixtureFlags` `'prop'` branch (shallow-merge into the matched prop).
- `inspectableDescriptor` `'prop'` branch: title (`prop.title ?? kind`), `typeLabel:'Prop'`, icon from
  `PROP_KIND_ICONS[prop.kind]`, token from `passagePresentation(prop)`, and detail **lines from
  `passageDescriptorLines`** (State/Perception DC/Lock DC/Note) — replacing today's empty-lines item test
  assertion.
- `FixturePropertiesForm.tsx`: add `'select'` rendering (a `<select>` over `field.options`) dispatching
  like the other field types.
- **Tests:** reducer add/select/delete/updateFlags + mutual-exclusion (extend `maplabEditor.test.ts`);
  descriptor lines + kind-icon (`maplabModel.test.ts`, update the existing prop/item descriptor test);
  form select render. **Sign-off:** tests + typecheck (headless, no live gate).

### Stage F2 — Render props on both pages (Sonnet)
- A shared prop-marker render (extract a small helper/component so viewer + editor draw identically):
  **on-square** = centered marker at `((cell.x+0.5)*CELL, (cell.y+0.5)*CELL)` (stair-marker pattern) with
  the kind icon; **on-wall** (`side` present) = anchored at the `doorWallSegment` midpoint with a smaller
  marker. State from `passagePresentation`: hidden → dashed outline + `EyeOff` badge, locked → `Lock`
  badge, trapped → `Trap` badge; color via the presentation `token`. `pointer-events` + `role="button"`/
  `aria-label` like doors.
- Viewer (`MapLabPage.tsx`): render a `layout.props` `<g>` block after stairs; wire prop hover/focus/pin
  into the `Inspectable` resolver (`else if kind==='prop'`) so the existing InspectorPanel shows it.
- Editor (`MapLabEditorPage.tsx`): render props as read-only markers too (authoring lands in F3).
- Defensive: normalize `props: layout.props ?? []` in the load path so an older persisted `map_layout` row
  (which had `items`) doesn't crash the render.
- **Tests:** render tests both pages — seeded chest appears; on-square vs on-wall variant; hidden renders
  dashed.
- **🚦 Gate:** the seeded prop shows on both routes with the right glyph/state; no console errors.

### Stage F3 — Editor authoring (Sonnet)
- "Place prop" toolbar toggle in the **Create** group (page-local mode, mutually exclusive with
  `placeDoorMode` and room-paint). In place mode, room cells become clickable (reuse the paint-cell overlay
  styling); clicking dispatches `addProp(cell)`, then exits the tool and selects the new prop.
- Inspector-rail **prop branch**: `InspectorPanel` (read-only descriptor) + `FixturePropertiesForm`
  (`FIXTURE_TYPES.prop`, incl. the **kind** select and an **Attach to wall** select →
  `Off`/`N`/`S`/`E`/`W` writing `side`) + **Delete prop** / Close actions — mirroring the door branch.
- Hook wiring: `addProp`/`deleteProp`/`updateFixtureFlags('prop',…)` through `apply` (autosave);
  `selectProp` via direct dispatch (no save), like `selectDoor`.
- **Tests:** place → edit kind + a flag + attach-to-wall → assert autosaved `props[0]` → delete (mirror the
  door lifecycle test); mode mutual-exclusion.
- **🚦 Gate:** create an on-square prop and a wall-attached prop, edit kind/flags, confirm "Saved", reload
  the viewer and see them; delete works.

### Stage F4 — Front-end design pass (Sonnet + `frontend-design` skill)
- **Invoke `/frontend-design` before writing UI.** Finalize the minimal marker art so props read in the
  same line-icon language as door/stair glyphs (tokens + MD3 type scale only, no ad-hoc px/hex); consistent
  hidden/locked/trapped badge treatment (icon **and** shape, never hue-alone); accessibility floor (≥48px
  controls, focus rings, `prefers-reduced-motion`).
- Kind-picker UX polish; ensure the prop marker doesn't fight the room-paint layer for hit-testing.
- **Loot hook affordance:** the real hook is the reserved `MapProp.loot` slot (data, round-tripped). In the
  inspector, add a clearly-disabled placeholder row ("Contents — added with the loot system") so the seam is
  discoverable but obviously not wired; the form never writes `loot`. Document the seam in the Phase F doc:
  the loot phase will populate `loot`, likely gating on container kinds (`chest`/`barrel`) and `locked`.
- **Tests:** updated structure/render tests (prop marker, badges, inspector prop branch, disabled loot row).
- **🚦 Gate:** live design review both routes — props read as one system with doors/stairs, grouped,
  tokens-only, no console errors.

---

## Verification (end-to-end)

Run `scripts/start_server.ps1`.
- **Editor** (`/dungeons/map-lab/edit`): "Place prop" → click a room square → a prop marker appears and is
  selected; the inspector shows kind + flag fields + Attach-to-wall + Delete. Change kind (icon updates),
  toggle Hidden (marker goes dashed + eye badge), set Perception DC, set Attach-to-wall = a side (marker
  jumps to that wall). Status reads "Saved" after ~600ms.
- **Viewer** (`/dungeons/map-lab`): reload → the authored props render with correct glyph/state; hover/focus
  opens the InspectorPanel with the prop's title, kind, and flag lines; the seeded chest is present.
- **Both:** no emoji, no undefined-token flatness, no console errors; minimal line-icon art consistent with
  doors/stairs.
- **Regression:** `npm run test` + `npm run typecheck` + `npm run build` green; `python -m pytest`
  unaffected. `git status` shows **no change** to `seed_dungeons.json`, `backend/`, or the live dungeon
  model/pages — Phase F is confined to `maplab/` + the shared icon/theme layer, and props persist only in
  the `map_layout` blob.

## Deferred (NOT in Phase F)
- The loot system itself (Phase F only reserves the `loot` slot + a disabled affordance).
- A session/runtime layer for props (disarm-trap / reveal-hidden toggles like doors have) — authored flags
  only for now.
- Generalizing beyond the Isly Castle fixture (inherits Phase D/E's "any dungeon id" deferral).
