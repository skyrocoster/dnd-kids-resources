# Frontend data flow

**Review date:** 2026-09-24  
**Scope:** Frontend structure, routes/screens, component/state ownership, API boundary, request-to-render flows, Storybook, configuration, and focused code candidates. This is observed source/caller evidence, not a product, visual, or complete dead-code review.

Evidence labels and snapshot limits are defined in the [review overview](README.md#how-to-read-the-findings). Source links identify inspected files and lines, not a fresh runtime verification.

## Summary

The browser entry is `frontend/index.html`, which mounts `src/main.tsx`; the React entry renders a `RouterProvider` using the route tree in `src/router.tsx`. The normal application routes share `AppShell`. The separate `/play` route tree has a player shell and its own map and spellbook screens. Routed screen components are loaded through the route helper; `AppShell` itself is the synchronous parent element for the main route tree. **Verified:** [index.html:9-12](../../../frontend/index.html#L9-L12), [main.tsx:1-11](../../../frontend/src/main.tsx#L1-L11), [router.tsx:5-9, 11-146](../../../frontend/src/router.tsx#L5-L146).

Feature screens call functions from the handwritten `src/api/client.ts` facade. That facade delegates to generated Hey API SDK operations and uses generated OpenAPI-backed models through `src/api/types.ts`. Most inspected screen-level data state is held in React hooks/reducers rather than a shared query provider. Special flows (encounter running, Map Lab, Loom, and the player-facing views) have their own loading, persistence, and refresh behavior. **Verified:** [api/client.ts:1-3, 48-80, 82-305](../../../frontend/src/api/client.ts#L1-L3), [api/types.ts:1-5](../../../frontend/src/api/types.ts#L1-L5); representative flows are described below.

## Runtime shells and route inventory

`main.tsx` mounts the router inside `StrictMode`; the root route renders `AppShell`, which provides the main navigation and an `Outlet`. `/play` is a sibling route with `PlayerShell`, not a child of `AppShell`. **Verified:** [main.tsx:7-11](../../../frontend/src/main.tsx#L7-L11), [router.tsx:11-16, 125-146](../../../frontend/src/router.tsx#L11-L16), [AppShell.tsx:11-21, 80-83](../../../frontend/src/layout/AppShell.tsx#L11-L21).

| URL | Route component | Notes |
| --- | --- | --- |
| `/` | `HomePage` | Main shell index screen. |
| `/demo` | `ComponentDemoPage` | Included only when `import.meta.env.DEV` is true; it is not in the main navigation. |
| `/spells` | `SpellBrowserPage` | Spell browsing, editing, and player assignment. |
| `/monsters` | `MonsterBrowserPage` | Monster browser. |
| `/monsters/new`, `/monsters/:id/edit` | `MonsterEditor` | Create/edit routes share an editor component. |
| `/weapons` | `WeaponBrowserPage` | Weapon browser. |
| `/items` | `ItemBrowserPage` | Item browser. |
| `/loot` | `LootBundleBrowserPage` | Loot bundle browser. |
| `/players` | `PlayerBrowserPage` | Player browser and assignment flows. |
| `/npcs` | `NPCBrowserPage` | NPC browser. |
| `/loom` | `LoomPage` | Campaign Loom screen. |
| `/encounters` | `EncounterBrowserPage` | Encounter browser. |
| `/encounters/:id/run` | `EncounterRunnerPage` | Encounter runner screen. |
| `/dungeons` | `DungeonBrowserPage` | Dungeon browser. |
| `/dungeons/:dungeonId` | `DungeonShell` → `MapLabPage` | Nested Map Lab view route. |
| `/dungeons/:dungeonId/edit` | `DungeonShell` → `MapLabEditorPage` | Nested Map Lab editor route. |
| `/play` | `PlayerShell` → `PlayerHome` | Player-facing destination screen. |
| `/play/map` | `PlayerShell` → `PlayerMapRoute` | Player-facing map. |
| `/play/spells` | `PlayerShell` → `PlayerSpellbookRoute` | Player-facing spellbook. |

The source of this inventory is the route array and its lazy imports in [router.tsx:11-146](../../../frontend/src/router.tsx#L11-L146). Main navigation sections are separately listed in [navSections.ts:27-56](../../../frontend/src/layout/navSections.ts#L27-L56); consequently, a route can exist without being a navigation entry, as with the development-only demo and nested routes. **Verified:** `router.tsx` has no app-defined wildcard route. The behavior of unmatched routes is not evaluated here.

`AppShell` renders navigation, a main outlet, and identity/tabs slots used by nested application surfaces ([AppShell.tsx:20-35, 54-83](../../../frontend/src/layout/AppShell.tsx#L20-L35)). `DungeonShell` loads and provides the selected dungeon route context around its nested outlet ([DungeonShell.tsx:13-18, 90-118](../../../frontend/src/features/dungeons/maplab/DungeonShell.tsx#L13-L18)). `PlayerShell` wraps player child routes in `PlayerSpellbookSessionProvider` ([PlayerShell.tsx:7-15](../../../frontend/src/player/PlayerShell.tsx#L7-L15)).

## Component and feature ownership

- **Shared layout and UI:** `src/layout/` owns the main shell/navigation. `src/components/` contains cross-feature components such as `BrowserLayout`, `SplitPane`, `SearchList`, `PageHeader`, dialogs, form controls, and feedback. `BrowserLayout` composes a header and split list/detail surface and can host editor/dialog content ([BrowserLayout.tsx:7-18, 21-84](../../../frontend/src/components/BrowserLayout.tsx#L7-L18)). `StatePanel` offers common loading, empty, filtered-empty, error, and no-selection states ([StatePanel.tsx:4-29](../../../frontend/src/components/StatePanel.tsx#L4-L29)).
- **Feature-owned UI and transformations:** `src/features/` groups screens, editors, and domain helpers/models by domain (`spells`, `monsters`, `weapons`, `items`, `loot`, `players`, `npcs`, `encounters`, `dungeons`, and `loom`). The route table identifies screen entry components; reusable details remain owned by their feature folders unless imported from `src/components/` or `src/map/`.
- **Map Lab and map primitives:** `src/features/dungeons/maplab/` owns dungeon view/edit routes and map editing/session orchestration; `src/model/maplabModel.ts` owns shared map data structures and transformations, with reusable map drawing utilities in `src/map/`. The view and editor are distinct route children under `DungeonShell` ([router.tsx:102-122](../../../frontend/src/router.tsx#L102-L122)).
- **Player-facing screens:** `src/player/` owns the `/play` shell, map/spellbook routes, map renderer, session context, and presentation/filtering logic ([router.tsx:127-142](../../../frontend/src/router.tsx#L127-L142)).
- **Development and placeholder pages:** `ComponentDemoPage` is a development-only route outside shipped navigation ([router.tsx:20-27](../../../frontend/src/router.tsx#L20-L27), [ComponentDemoPage.tsx:27-38](../../../frontend/src/pages/ComponentDemoPage.tsx#L27-L38)). `StubPage.tsx` is not mounted by the inspected router. The [candidate evidence below](#frontend-code-candidates) distinguishes intentional development-only usage from placeholders with unresolved ownership.

## API boundary and contract ownership

### Frontend request boundary

`src/api/client.ts` is the handwritten frontend API facade. It configures one generated client with `VITE_API_BASE_URL` or the page origin, sets field-style responses and thrown errors, translates failures into `ApiError`, and unwraps generated `{ data }` results ([client.ts:35-80](../../../frontend/src/api/client.ts#L35-L80)). The rest of the facade wraps generated operations by domain, including reference data, spells, players/assignments, encounters, dungeon layout/session state, Loom, and the shared at-the-table pointer ([client.ts:82-305](../../../frontend/src/api/client.ts#L82-L305)).

`src/api/types.ts` re-exports the generated models and adds UI compatibility names or refinements. For example, it completes optional monster feature data for a view and refines the known display fields for a nested weapon attack while retaining the generated API type ([types.ts:1-5, 72-77, 79-110](../../../frontend/src/api/types.ts#L1-L5)).

`frontend/openapi-ts.config.ts` names `src/api/generated/openapi.json` as generator input and `src/api/generated` as output; the plugins generate TypeScript models, SDK/client code, and TanStack Query query-key/options helpers ([openapi-ts.config.ts:3-22, 24-43](../../../frontend/openapi-ts.config.ts#L3-L22)). **Verified:** this is a checked-in contract input. **Unknown:** this review did not establish when it was last synchronized with the running backend schema.

The `generate:api` package script generates from that snapshot; output cleaning is disabled so the input remains in the output directory (`openapi-ts.config.ts:6-15`). Generation and snapshot refresh are different operations. The review did not establish the process or owner that refreshes `openapi.json`, so it does not claim automatic backend synchronization or supply an unverified refresh command.

Vite proxies `/api` to `VITE_API_PROXY_TARGET` or `http://127.0.0.1:8000` ([vite.config.ts:5-15](../../../frontend/vite.config.ts#L5-L15)). The checked-in OpenAPI input contains `/api/...` operations, including `GET /api/abilities` ([openapi.json:8-16](../../../frontend/src/api/generated/openapi.json#L8-L16)). The narrow backend boundary check found a FastAPI app registering the reference, entity, campaign, dungeon, and Loom routers, plus an `/api/{full_path:path}` not-found handler before the SPA fallback ([backend/app/main.py:33-41, 65-93, 95-107](../../../backend/app/main.py#L33-L41)). No router implementation or backend data layer was reviewed.

### Request-to-render examples

1. **Browser and editor pattern (spells):** `SpellBrowserPage` loads the players and a spell’s assigned players in parallel, stores the response and editable ID set locally, then submits the replacement assignment through the API facade. The parent handles a successful save by closing the editor and reloading the list; deleting a spell also reloads the list ([SpellBrowserPage.tsx:40-61, 82-97, 204-216](../../../frontend/src/features/spells/SpellBrowserPage.tsx#L40-L61)). The browser composes `BrowserLayout`, `SearchList`, and a detail card ([SpellBrowserPage.tsx:218-252](../../../frontend/src/features/spells/SpellBrowserPage.tsx#L218-L252)). This is a representative flow, not a claim that every feature has identical refresh behavior.
2. **Encounter runner:** `useEncounterRunner` fetches an encounter and hydrates `encounterRunnerReducer`; user actions update local runner state. A 600 ms debounced save serializes current combatants and calls `updateEncounter`, with a separate sync status for saving/success/error ([useEncounterRunner.ts:15-17, 42-77, 91-109](../../../frontend/src/features/encounters/useEncounterRunner.ts#L15-L17)). The hook is shared by the runner screen and encounter dock per its source comment ([useEncounterRunner.ts:1-3](../../../frontend/src/features/encounters/useEncounterRunner.ts#L1-L3)).
3. **Map Lab:** `DungeonShell` resolves the dungeon and supplies route context. The viewer separately loads layout and session state; `useMapLabLayout` treats a missing layout as empty and normalizes received data ([dungeonRouteContext.ts:23-74](../../../frontend/src/features/dungeons/maplab/dungeonRouteContext.ts#L23-L74), [useMapLabLayout.ts:17-64](../../../frontend/src/features/dungeons/maplab/useMapLabLayout.ts#L17-L64)). The session-state hook loads fixture overrides, writes state changes, and rolls back to confirmed values after a failed write ([useMapLabSessionState.ts:57-77, 83-140, 142-186](../../../frontend/src/features/dungeons/maplab/useMapLabSessionState.ts#L57-L77)). The editor keeps layout and dungeon content as separate dirty/save channels and debounces saves to the layout and dungeon update operations ([useMapLabEditor.ts:71-103, 114-146, 158-180](../../../frontend/src/features/dungeons/maplab/useMapLabEditor.ts#L71-L103)). Some map blobs cross the typed API boundary using `unknown` casts before normalization; this is a confirmed implementation detail, not evidence of a runtime defect ([useMapLabLayout.ts:38-42](../../../frontend/src/features/dungeons/maplab/useMapLabLayout.ts#L38-L42)).
4. **Loom:** `useLoomTapestry` loads the whole tapestry into a local `RemoteState` and exposes an explicit reload function ([useLoomTapestry.ts:13-35](../../../frontend/src/features/loom/useLoomTapestry.ts#L13-L35)). `LoomPage` owns selection/editor state, invokes mutation functions, and reloads after successful commands or node saves ([LoomPage.tsx:48-67, 128-153](../../../frontend/src/features/loom/LoomPage.tsx#L48-L67)).
5. **Player map:** `usePlayerMapData` polls the at-the-table pointer, then loads that dungeon’s layout and session state, transforms the map for player display, and updates the rendered frame. It schedules a five-second poll, responds to page visibility changes, and retains the last good frame for some failures ([usePlayerMapData.ts:6-19, 33-45, 47-79, 117-168, 171-193](../../../frontend/src/player/usePlayerMapData.ts#L6-L19)). The player spellbook has a separate polling hook with similar timing/visibility behavior ([usePlayerSpellbook.ts:5-14, 22-94](../../../frontend/src/player/usePlayerSpellbook.ts#L5-L14)).

## State, cache, and error ownership

**Verified:** `src/components/remoteState.ts` defines a small tagged union (`idle`, `loading`, `success`, `error`) used by screens and hooks ([remoteState.ts:1-37](../../../frontend/src/components/remoteState.ts#L1-L37)). `StatePanel` is one shared rendering primitive for several status classes, but domain hooks also define bespoke status models: for example, player map uses `loading/ready/empty/error`, encounter runner tracks loading and sync separately, and Map Lab has separate route/layout/session states (citations above).

**Verified in the inspected source search:** React Query is a declared runtime dependency ([package.json:27-35](../../../frontend/package.json#L27-L35)), and query keys/invalidation helpers exist ([queryKeys.ts:1-53](../../../frontend/src/api/queryKeys.ts#L1-L53), [queryInvalidation.ts:1-103](../../../frontend/src/api/queryInvalidation.ts#L1-L103)). No `QueryClientProvider`, `useQuery`, or `useMutation` usage was found in `frontend/src` TypeScript/TSX during this review. The generator configuration also specifies query options/keys rather than generated hooks ([openapi-ts.config.ts:17-22, 33-43](../../../frontend/openapi-ts.config.ts#L17-L22)). **Inferred:** current feature request state and refresh ownership is primarily screen/hook-local; the helpers do not establish a shared application cache by themselves.

Error handling is also distributed: the API facade standardizes transport errors as `ApiError`, while callers decide how to display, suppress, retry, or retain state. For example, the player map keeps its last good frame and Map Lab reports a failed session write and reverts local state ([client.ts:35-75](../../../frontend/src/api/client.ts#L35-L75), [usePlayerMapData.ts:135-168](../../../frontend/src/player/usePlayerMapData.ts#L135-L168), [useMapLabSessionState.ts:157-176](../../../frontend/src/features/dungeons/maplab/useMapLabSessionState.ts#L157-L176)).

## Storybook and app routes

Storybook searches for `src/**/*.mdx` and `src/**/*.stories.*`; this is a component/story discovery rule, not a router configuration ([.storybook/main.ts:38-46](../../../frontend/.storybook/main.ts#L38-L46)). The discovered story files in this review are the generic [Button](../../../frontend/src/stories/Button.stories.ts), [Header](../../../frontend/src/stories/Header.stories.ts), and [Page](../../../frontend/src/stories/Page.stories.ts) examples, plus [AdvancedFormControls.stories.tsx](../../../frontend/src/components/form/AdvancedFormControls.stories.tsx). The latter imports production form controls ([AdvancedFormControls.stories.tsx:1-16](../../../frontend/src/components/form/AdvancedFormControls.stories.tsx#L1-L16)); the generic Button story is titled `Example/Button` ([Button.stories.ts:5-16](../../../frontend/src/stories/Button.stories.ts#L5-L16)). No routed application screen was found represented as a Storybook route. This section records observed story structure; it is not a Storybook test/coverage audit.

## Frontend configuration and dependencies

- `frontend/package.json` sets Node `>=24.15 <25`, declares React 19 and React Router 7, TanStack Query 5, and the Vite/TypeScript, Hey API, Storybook, Vitest, and Playwright development toolchain ([package.json:1-7, 27-67](../../../frontend/package.json#L1-L7)). This is dependency/configuration context, not a dependency audit.
- Vite enables the React plugin and the `/api` development proxy described above ([vite.config.ts:5-15](../../../frontend/vite.config.ts#L5-L15)). `main.tsx` imports the global `index.css` before mounting ([main.tsx:1-5](../../../frontend/src/main.tsx#L1-L5)).
- **Storybook launch contexts:** Compose uses `6007`; the local frontend script and Playwright profile use `6006`. The [service overview](README.md#service-lifecycle-and-operational-entrypoints) records the configuration evidence. This is not a confirmed port defect.

## Frontend code candidates

These are bounded caller/search findings, not removal approvals. **Test-only** means the observed in-tree consumer is a test; it does not mean safe to delete. **Development-only** and **manual maintenance** are intentional usage classes. Router lazy loading uses explicit module paths with string export lookup (`frontend/src/router.tsx:5-8`), so the route search establishes only the inspected app's reachability, not external use or future intent.

### Placeholders and deferred query helpers

| Candidate | Source and caller evidence | Decision boundary |
| --- | --- | --- |
| `StubPage` | Defines a title and “Not built yet” text (`frontend/src/pages/StubPage.tsx:1-12`). Its component test is the only import found in `frontend/src` (`pages/__tests__/StubPage.test.tsx:1-10`); the explicit route table has no entry (`router.tsx:11-144`). Confidence is high within that search scope. | Confirm an owner/current purpose before removing the component and its test. Do not invent a route merely to retain it. |
| `deriveTokensStub` | Throwing TypeScript placeholder described as a contract for tests/future consumers (`frontend/src/utils/theme-tokens.ts:18-29`). A bounded `frontend/` search found no references to it, `DerivedTokens`, or `TokenSet` outside their definitions. `src/__tests__/theme-tokens.test.mjs` checks CSS without importing the module. | No current caller was found, but the explicit future-use comment leaves retention/removal intent unresolved. Do not silently replace it with a new contract during cleanup. |
| Query key/invalidation helpers | `queryKeys.ts:1-53` and `queryInvalidation.ts:1-103` are re-exported by `api/client.ts:32-33`. Observed imports are API tests (`api/__tests__/queryInvalidation.test.ts:1-4,13-40`; `generatedSurface.test.ts:3,25-31`). As noted above, no app query provider/hooks were found. | Decide whether deliberately deferred. Helper tests do not prove production caching. Adoption, public-surface removal, and dependency removal are separate architecture/ownership decisions. |

### Player polling duplication

Both `usePlayerMapData` and `usePlayerSpellbook` use a five-second timer, visibility wake-up, abortable requests, cleanup, and last-good-state handling (`frontend/src/player/usePlayerMapData.ts:6,37-49,171-193`; `usePlayerSpellbook.ts:5,22-39,71-92`). Both have production callers: `PlayerShell.tsx:3-5,36-37` uses map data; `PlayerSpellbookRoute.tsx:3-10` uses the spellbook hook.

Separate tests cover timing/visibility and failures (`player/__tests__/usePlayerMapData.test.ts:106-126,128-166`; `usePlayerSpellbook.test.ts:36-56,71-100`). Repetition is verified, but an extraction's value and safety are not. If approved, share only scheduling/visibility mechanics; preserve the map's pointer/layout/session pipeline, 404/frame behavior, and spellbook-specific loading/error semantics. Verify both hook suites.

### Intentional development surfaces

`ComponentDemoPage` is not an unreachable production feature: `/demo` is gated by `import.meta.env.DEV`, and `frontend/src/__tests__/router.test.tsx:9-20` checks development inclusion and production exclusion.

Theme generation also has a documented purpose. `frontend/src/theme.css:1-7,71-91` references `src/tools/generate-md3-tokens.mjs`; `theme.css:313-316` references `derive-kid-palette.mjs`, whose implementation is imported by `src/__tests__/derive-kid-palette.test.mjs:4-12`. These are manual tools, not routed components. The active `src/tools/test-check.mjs` entrypoint is wired through `frontend/package.json:17-18` and described in the [test inventory](test-baseline.md#test-entrypoints).

## Risks and ownership questions (not conclusions of defects)

1. **Data/cache ownership:** React Query is installed and helper infrastructure exists, while inspected feature flows use local hook state and explicit reloads. Is the query layer intentionally reserved for later use, or should current ownership be documented as local per feature? No change is proposed here.
2. **State/error consistency:** `RemoteState` is reusable, but specialized flows have different state machines, error fallbacks, cancellation, and retry/last-good-data rules. The cited examples make those differences visible; this review does not judge them.
3. **Contract freshness:** the generator input is the checked-in OpenAPI snapshot. This review did not compare it with a live backend schema or establish a generation/update owner.
4. **Story ownership:** Storybook currently discovers component stories and examples rather than the route tree. The relationship between story ownership and app-screen ownership is not established.
5. **Cleanup ownership:** the placeholders and query helpers above need purpose decisions, while polling extraction needs a behavior-preserving justification. None authorizes broad refactoring or dependency removal.

## Scope limits

This source review did not exercise the UI or assess visual quality, security, test coverage, or generated-contract synchronization. Its backend inspection stopped at application routing; [backend and data](backend-and-data.md) covers endpoint behavior and cross-layer pagination/spell-projection findings. No tests were run for this map or candidate search. The [findings list](findings-and-next-actions.md#ranked-follow-up) sets follow-up priority.
