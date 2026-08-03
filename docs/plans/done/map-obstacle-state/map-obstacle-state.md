# Map Obstacle State - authored baselines and one persisted run overlay

> **Status:** Complete. All six stages shipped; the player curtain emits effective, player-safe fixture facts, the player renderer consumes one Trap-before-Lock cue across all fixture kinds, and the final legacy contract removal is complete. No further work remains in this Plan.

- **Areas:** dungeons
- **Read trigger:** Map fixture concealment, locks, traps, DCs, shown state, session overrides, player-map obstacle badges, the Map Lab inspector, or removal of map knowledge and player preview

## Canonical authority

This plan implements `scratch/map-knowledge-obstacles-handoff.md`; that file is the canonical product
decision record. Its verified current-state facts are accepted without re-derivation
(`scratch/map-knowledge-obstacles-handoff.md:29-164`), its structures and diagrams are referenced
directly rather than redrawn, and its evidence index is the starting map for order compilation
(`scratch/map-knowledge-obstacles-handoff.md:794-811`). The handoff contains no open product
decisions (`scratch/map-knowledge-obstacles-handoff.md:22-25`).

The handoff supersedes the archived Player Map Knowledge plan's two-heading inspector, separate
knowledge layer, shared cue-vocabulary claim, and DM preview exactly as declared at
`scratch/map-knowledge-obstacles-handoff.md:12-20`. Nothing in the superseded plan may be used to
fill a gap in this plan where the handoff has made a replacement decision.

## What we're building & why

Every door, stair, prop, and portal gets the same nested authored obstacle state and the same sparse,
server-persisted session override shape. Runtime values resolve one leaf at a time from the session
override or authored baseline; props participate fully; reset returns to authored state; IDs are
never reused; and layout saves prune overrides made stale by authoring.

DM Edit and DM View share one obstacle panel with different adapters. The kid map consumes only the
effective, curtain-filtered state and draws at most one active shown obstacle icon. The separate map
knowledge subsystem, rival prose concealment, positive-state map badges, and DM-side player preview
are removed rather than retained as compatibility paths.

## UX decisions - shared fixture inspector

```text
Surface:      Inspector panel within Map Lab session view and Map Lab editor; the existing Dungeons
              Surfaces row remains authoritative.
Mode:         both: DM View follows play rules; DM Edit follows prep rules. Operator: DM.
Focal:        the selected fixture and its current three-obstacle state. The exact non-door and door
              compositions are canonical at scratch/map-knowledge-obstacles-handoff.md:429-478;
              do not redraw or reinterpret them during implementation.
Route shape:  bespoke inline inspector within the existing Map Lab canvas workspaces.
Edit style:   direct labelled checkboxes in one shared panel component with a read/write adapter.
Save:         DM Edit keeps layout autosave. DM View persists each low-frequency toggle immediately
              to server-side map_session_state with no Save button and no debounce.
Empty:        n/a; this is not an independently loaded collection.
Filtered empty: n/a; there is no filter.
No selection: no inspector is mounted until a fixture is selected; no replacement empty panel is added.
Load failure: the existing map/session load treatment remains in its owning region; this plan adds no
              duplicate global error.
Action failure: inline in the inspector beside the failed state controls, role="status"; revert to
              the last server-confirmed effective value.
Destructive:  Reset to authored deletes only the selected fixture override and stays disabled when
              none exists. Reset dungeon keeps its existing ConfirmDialog and deletes the session row.
Keyboard:     DOM tab order; Space toggles native checkboxes; Enter/Space activate reset buttons;
              Escape closes only the existing topmost dismissible layer and has no preview behavior.
Touch:        48px floor in DM View; existing documented compact-property exceptions may remain in
              DM Edit, with no new play-mode exception.
```

The panel label, column, DC, reset, independence, error, persistence, and overflow contracts are
exactly `scratch/map-knowledge-obstacles-handoff.md:417-585`. In particular, `World now` changes to
`Authored` in DM Edit; Concealment's Shown cell is a dash; Lock and Trap Shown remain enabled; DCs use
the exact missing-value copy examples at lines 506-527; and the inspector owns independent vertical
overflow as specified at lines 579-585.

## UX decisions - kid map obstacle presentation

```text
Surface:      Kid map (/play/map), existing Players Surfaces row.
Mode:         play. Operator: kid.
Focal:        visible rooms and fixtures; obstacle status is one secondary icon attached to a fixture.
Route shape:  Viewer, unchanged.
Edit style:   none. Read-only forever.
Save:         none; the surface polls effective persisted state every five seconds.
Empty:        unchanged - "No map yet."
Filtered empty: n/a; the kid map has no filters.
No selection: n/a; this plan adds no selectable player inspector or tap panel.
Load failure: unchanged - "The map didn't load. Ask your DM."
Action failure: n/a; a transient session-read failure retains the last good frame and retries rather
              than replacing it with authored state.
Destructive:  none.
Keyboard:     obstacle icons add no focus target; existing map keyboard behavior remains.
Touch:        existing kid controls retain the 64px floor; status icons are presentation, not controls.
```

The player map's complete badge, title, accessible-label, and curtain behavior is canonical at
`scratch/map-knowledge-obstacles-handoff.md:622-681`. No visible status text or fixture title is
added, and the future player tap panel remains out of scope.

## UX decisions - removed DM preview

```text
Surface:      DM-side player preview in Map Lab session view.
Mode:         removed, not repaired or redesigned.
Operator:     n/a after removal.
Focal:        n/a.
Route shape:  no preview mode, route, branch, or fourth product space remains.
Edit style:   n/a.
Save:         n/a.
Empty:        remove preview-only empty copy.
Filtered empty: n/a.
No selection: n/a.
Load failure: remove preview-only handling.
Action failure: n/a.
Destructive:  none.
Keyboard:     remove preview Escape handling and pressed-toggle behavior.
Touch:        remove the preview button; no replacement control.
```

Removal scope is exact at `scratch/map-knowledge-obstacles-handoff.md:402-415`, including the button,
snapshot state, render branches, Escape handling, `aria-pressed`, empty copy, and tests. The three
verified preview defects at `scratch/map-knowledge-obstacles-handoff.md:140-152` are deleted with the
mode, not fixed individually.

## Stages

1. **Replace the fixture-state contract and reset disposable state.** Atomically establish the two
   persisted layers and per-leaf recursive overlay, using the exact illustrative type shape, authored
   chest blob, sparse session blob, false-versus-absence rule, layout-only field boundary, and
   authored-only DC policy at `scratch/map-knowledge-obstacles-handoff.md:166-303`. Adopt one
   `armed` polarity and the three-obstacle lifecycle, remove Search DC and `trapSprung`, preserve
   dormant authored DCs, and implement independent authored/session Shown exactly as specified at
   `scratch/map-knowledge-obstacles-handoff.md:305-351`. Apply the player-visible truth table and null
   positive states at `scratch/map-knowledge-obstacles-handoff.md:352-372`, then reset all existing
   authored obstacle/open values and all existing session/knowledge records to the defaults and
   preservation boundary at `scratch/map-knowledge-obstacles-handoff.md:374-396`. This stage also
   admits props and every fixture/prop kind without an applicability matrix
   (`scratch/map-knowledge-obstacles-handoff.md:743-752`) and deletes the old flat/effective vocabulary
   rather than aliasing it (`scratch/map-knowledge-obstacles-handoff.md:730-741`).

2. **Make persistence sparse, durable, monotonic, and authoring-aware.** Preserve immediate
   server-side persistence across reloads/devices and the exact sparse write/removal behavior,
   rollback-on-failure rule, five-second player polling rule, 404 meaning, and last-good-frame rule at
   `scratch/map-knowledge-obstacles-handoff.md:480-505`. Implement fixture reset, dungeon reset, and
   per-leaf/geometry/delete re-authoring invalidation exactly at
   `scratch/map-knowledge-obstacles-handoff.md:529-577`. Add per-kind monotonic layout counters and
   backend layout-save pruning, including initialization, import/export survival, orphan cleanup, and
   empty-row deletion, without reusing the broken allocators documented at
   `scratch/map-knowledge-obstacles-handoff.md:97-105` and following the required contract at
   `scratch/map-knowledge-obstacles-handoff.md:754-767`. Session normalization must preserve explicit
   false, reject/prune DC overrides, store state only, cover doors/stairs/props/portals in parallel,
   and retain `partyRoomId` (`scratch/map-knowledge-obstacles-handoff.md:289-303`).

3. **Delete rival stores and switch all consumers to effective state.** Remove the entire knowledge
   subsystem and every listed database, API, schema, seed/export, client, type, hook, control, room
   entry, identity-helper, field, and test artifact at `scratch/map-knowledge-obstacles-handoff.md:701-719`;
   reset rather than migrate its unused data (`scratch/map-knowledge-obstacles-handoff.md:154-157`).
   Remove prose `is_hidden`/`hidden_dc`, `dungeonGraph()`, `exitsFromRoom()`, their tests, and their
   seed/schema fields exactly at `scratch/map-knowledge-obstacles-handoff.md:107-120` and
   `scratch/map-knowledge-obstacles-handoff.md:721-728`. Leave the required durable future-Fog note
   about deliberately removed room-entry prose (`scratch/map-knowledge-obstacles-handoff.md:718-719`).
   The final product has exactly Player, DM View, and DM Edit with the read/write ownership table at
   `scratch/map-knowledge-obstacles-handoff.md:400-415`; delete the DM preview in full in this stage.

4. **Ship one shared obstacle inspector for DM View and DM Edit.** Replace the three existing control
   languages and ambiguous opposite meanings documented at
   `scratch/map-knowledge-obstacles-handoff.md:75-90` with one shared component and contextual
   adapters. Implement the exact panel structures by directly consuming the canonical non-door and
   door diagrams at `scratch/map-knowledge-obstacles-handoff.md:417-478`; do not derive a substitute
   layout. Use labelled checkboxes, immediate persistence, independent controls, authored/effective
   adapters, exact DC display/edit/warning behavior, fixture reset behavior, and no per-field source
   badges as specified at `scratch/map-knowledge-obstacles-handoff.md:480-577`. Add
   `overflow-y: auto` only as the safety floor and remove the dead knowledge error rule exactly at
   `scratch/map-knowledge-obstacles-handoff.md:133-138` and
   `scratch/map-knowledge-obstacles-handoff.md:579-585`. A trap gains authored Disarm DC while the
   current no-DC defect at `scratch/map-knowledge-obstacles-handoff.md:159-162` is retired.

5. **Share the badge primitive and enforce audience-specific active-state policies.** Move the badge
   descriptor and ring modules to neutral shared map ownership exactly as specified at
   `scratch/map-knowledge-obstacles-handoff.md:591-604`; retain separate DM list/collapse and player
   filter/winner policies. Use only the armed-state vocabulary table at
   `scratch/map-knowledge-obstacles-handoff.md:605-620`: remove Trap disarmed, never add Unlocked,
   keep Loot DM-only, and let Shown produce no output while disarmed. DM maps show active
   Concealment/Lock/Trap regardless of Shown and retain collapse; player maps choose at most one
   icon-only status, Trap before Lock, with the winning descriptor's accessible label and no fixture
   titles (`scratch/map-knowledge-obstacles-handoff.md:622-648`). Replace the hand-rolled door-only
   cues across doors, stairs, props, and portals so every enumerated defect at
   `scratch/map-knowledge-obstacles-handoff.md:51-73` is resolved by the exact replacement checklist
   at `scratch/map-knowledge-obstacles-handoff.md:650-661`.

6. **Finish the player curtain, prove the end-to-end outcome, and reconcile canonical docs.** Keep the
   accepted client-side boundary and produce only the player rendering model declared at
   `scratch/map-knowledge-obstacles-handoff.md:663-681`: omit concealment-armed fixtures; expose only
   active shown Trap/Lock facts to badge selection; render no loot, notes, DCs, encounter pins, or
   authoring concealment state; use effective Open geometry; and resolve props exactly like every
   other fixture. Remove `loot` and raw concealment/authoring fields from `KidMapLayout` even though
   the raw API remains browser-visible; the known current loot/hidden leaks are recorded at
   `scratch/map-knowledge-obstacles-handoff.md:122-131`. Update the Dungeons and Players area guides
   plus `ARCHITECTURE.md`, `API_REFERENCE.md`, `DATA_MODEL.md`, `DESIGN_SYSTEM.md`, and `TESTING.md` so
   they describe the final contracts, including the shared inspector/badge ownership and the removed
   knowledge/prose/preview paths. Convert every final-state invariant at
   `scratch/map-knowledge-obstacles-handoff.md:769-790` into automated stop conditions and run the
   repository's full backend, frontend, build, lint, export-schema, and documentation gates.

## Handoff coverage ledger

This ledger is exhaustive. `to-orders` must preserve these references in the compiled orders rather
than replacing them with summaries or fresh design decisions.

| Canonical handoff material | Plan destination |
|---|---|
| Purpose, supersession, reading contract (`scratch/map-knowledge-obstacles-handoff.md:1-25`) | Canonical authority; all stages |
| Built persisted layers and prop asymmetry (`:29-50`) | Stages 1-2 |
| Four player cue defects and existing DM vocabulary (`:51-73`) | Stage 5 |
| Three control languages and ambiguous Hidden (`:75-90`) | Stage 4 |
| Opposite polarity and dead `trapSprung` (`:91-95`) | Stage 1 |
| ID reuse and stale-state transplant (`:97-105`) | Stage 2 |
| Rival prose concealment and measured drift (`:107-120`) | Stage 3 |
| Curtain loot/hidden leaks (`:122-131`) | Stage 6 |
| Inspector overflow and dead CSS (`:133-138`) | Stage 4 |
| Three preview defects (`:140-152`) | Stage 3 removal |
| Empty knowledge seed (`:154-157`) | Stage 3 reset/no migration |
| Missing Trap DC (`:159-162`) | Stages 1 and 4 |
| Two layers and persisted-session meaning (`:166-185`) | Stage 1 |
| Per-leaf overlay, exact state structures/examples, false/absence, field policy (`:187-303`) | Stages 1-2; referenced directly |
| Obstacles, polarity, DC lifecycle (`:305-327`) | Stage 1 |
| Authored/session Shown and independent controls (`:329-351`) | Stages 1 and 4 |
| Player visibility truth tables and null positive states (`:352-372`) | Stages 1, 5, and 6 |
| Reset conversion defaults and preserved content boundary (`:374-396`) | Stage 1 |
| Exactly three product spaces and preview deletion (`:400-415`) | Stage 3 |
| Shared inspector and exact diagrams (`:417-478`) | Stage 4; referenced directly |
| Checkbox, persistence, failure, and polling behavior (`:480-505`) | Stages 2 and 4 |
| DC behavior and exact missing-value copy (`:506-527`) | Stage 4 |
| Fixture reset, dungeon reset, re-authoring, effective-only display (`:529-577`) | Stages 2 and 4 |
| Overflow safety floor and dead-rule removal (`:579-585`) | Stage 4 |
| Shared badge module boundary (`:589-604`) | Stage 5 |
| Armed-only badge vocabulary (`:605-620`) | Stage 5 |
| Player winner/icon/title policy and DM badge policy (`:622-648`) | Stage 5 |
| Cue replacement checklist (`:650-661`) | Stage 5 |
| Accepted client curtain and exact rendering contract (`:663-681`) | Stage 6 |
| One-plan/model-first constraint (`:685-700`) | This single plan; Stages 1-2 precede surfaces |
| Complete knowledge deletion and future-Fog note (`:701-719`) | Stage 3 |
| Prose concealment deletion (`:721-728`) | Stage 3 |
| Old vocabulary deletion and nested reset conversion (`:730-741`) | Stage 1 |
| Props and universal obstacle authoring (`:743-752`) | Stage 1 |
| Monotonic IDs and pruning (`:754-767`) | Stage 2 |
| Required final-state invariants (`:769-790`) | Stage 6 automated gates |
| Evidence file index (`:794-811`) | Compiler handoff for every stage |

## Shipped

| Stage | What shipped (<=2 sentences) |
|-------|------------------------------|
| 1 | Nested `FixtureState`/`SessionFixtureState`/`MapSessionState` contract, serialization, and per-leaf `effectiveFixtureState` resolver in `maplabModel.ts`. One-time migration utility (`scripts/migrate_map_obstacle_state.py`) converts every stored fixture to nested defaults, clears session/knowledge rows. Session actions extracted to `mapLabSessionActions.ts` with four-kind `SessionMap` readers, toggles, and disarm functions. All fixture markers (`DoorMarker`, `StairMarker`, `PortalMarker`, `PropMarker`) read nested state via `fixtureDoorPresentation`/`fixtureStairPresentation`/`fixturePresentation`/`fixtureMarkerBadges`. Dotted-key editor interaction, `InspectorPanel` wiring, player curtain (`curtain.ts`/`usePlayerMapData.ts`) resolving four-kind session maps, `fixtureInspectableDescriptor`, and fixture-type `state` fields attached to all `MapDoor`/`MapStair`/`MapProp`/`MapPortal` interfaces. |
| 2 | Session-state writes now normalize to sparse four-kind runtime leaves, preserve explicit false and `partyRoomId`, and delete empty rows; layout saves prune deleted, moved, or re-authored fixture overrides while preserving descriptive edits. Per-kind monotonic layout counters survive legacy normalization, save/export/import, and deletion; focused regression coverage also restores old-layout loading and the shared Map Lab editor test fixture. |
| 3 | Removed the obsolete knowledge API/table/schema/seed paths, prose concealment fields and graph helpers, and the DM-side player preview. Player curtain, Map Lab controls, migration cleanup, and focused tests now use the remaining obstacle-state contract; stale knowledge test setup was removed as part of the consumer cleanup. |
| 4 | Replaced the legacy Map Lab command controls with one shared labelled-checkbox obstacle inspector used by DM View and DM Edit. DM View now persists sparse four-kind session leaves with rollback and fixture reset, while DM Edit autosaves authored obstacle/DC changes and warns about incomplete armed DCs. |
| 5 | Moved badge descriptors and the ring renderer to neutral shared map ownership, retained DM collapse/Loot policy with armed-only statuses, and replaced door-only player cues with one icon-only Trap-before-Lock badge across doors, stairs, props, and portals. |
| 6 | Finished the player curtain contract and runtime seam: effective authored/session state now filters concealed fixtures and emits only open/closed plus active-and-shown Trap/Lock facts, with loot and authoring fields removed from `KidMapLayout`. Added focused curtain and renderer safety coverage; backend, frontend, build, lint, and documentation gates pass. |

## Touches

- `scripts/init_database.py`
- `scripts/seed_database.py`
- `scripts/export_db_seeds.py`
- `data/seeds/**`
- `data/generated/export_schema.json`
- `backend/app/main.py`
- `backend/app/schemas.py`
- `backend/app/routers/**`
- `backend/tests/**`
- `frontend/src/api/**`
- `frontend/src/model/maplabModel.ts`
- `frontend/src/features/dungeons/dungeonModel.ts`
- `frontend/src/features/dungeons/maplab/**`
- `frontend/src/map/**`
- `frontend/src/player/**`
- `docs/ARCHITECTURE.md`
- `docs/API_REFERENCE.md`
- `docs/DATA_MODEL.md`
- `docs/DESIGN_SYSTEM.md`
- `docs/TESTING.md`
- `docs/areas/dungeons.md`
- `docs/areas/players.md`

## Compiler handoff

### All stages
- **Verified edit sites:** Use the canonical evidence index at `scratch/map-knowledge-obstacles-handoff.md:794-811`; its named files and bounded line references were verified during the settling sessions and must be the first implementation map rather than re-surveying the feature.
- **Verified tests:** Backend router suites mirror router ownership; frontend Map Lab, shared-map, and player suites are inventoried in `docs/TESTING.md:142-171`. Exact targeted files remain a `to-orders` lookup.
- **Settled contracts:** Every product/data/UX decision is in `scratch/map-knowledge-obstacles-handoff.md:166-790`; the exact state examples are lines 204-287 and the exact inspector diagrams are lines 429-478. Reference those ranges directly and do not recreate them.
- **Constraints:** One plan, model/data before surfaces (`scratch/map-knowledge-obstacles-handoff.md:685-700`); no compatibility aliases or knowledge husks (`:701-741`); all final invariants become automated stop conditions (`:769-790`).
- **Open questions:** none; order compilation may perform bounded lookups for current symbols, call sites, and exact test files only.

### Stage 1
- **Settled contracts:** `scratch/map-knowledge-obstacles-handoff.md:166-398`, `:730-752`.
- **Constraints:** Preserve layout identity, geometry, titles, notes, kinds, destinations, loot, NPCs, encounters, and other non-obstacle content while resetting disposable obstacle/open/session/knowledge state (`:374-396`).
- **Transition mechanism:** A committed one-time migration utility rewrites both a live SQLite database and the local ignored map seed exports. It converts every stored fixture to the nested defaults, resets door Open, and clears session/knowledge records; initialization and seed loading remain raw rather than hiding migration behavior in permanent import paths.

### Stage 3
- **Settled contracts:** `scratch/map-knowledge-obstacles-handoff.md:107-120`, `:140-157`, `:400-415`, `:701-728`.
- **Constraints:** Delete rather than repair preview; delete rather than migrate knowledge/prose concealment; retain the future-Fog note (`:412-415`, `:716-719`, `:728`).

### Stage 4
- **Settled contracts:** `scratch/map-knowledge-obstacles-handoff.md:417-585`; diagrams at `:429-478` are canonical and must be linked into orders as-is.
- **Constraints:** One shared component with adapters, not duplicated markup (`:417-427`); scrolling is only a safety floor (`:579-585`).

### Stage 5
- **Settled contracts:** `scratch/map-knowledge-obstacles-handoff.md:589-661`.
- **Constraints:** Shared descriptors/primitives, separate audience policies; no positive badge state and no player multiplicity glyph or visible status text (`:597-620`, `:622-648`).
