# Work-order telemetry log

Generated from `docs/plans/telemetry.jsonl` by `scripts/order_telemetry.py`. **Do not edit
this file by hand** — edits are overwritten on the next render. The sidecar is the record;
this is the readable view of it, so that order shape can actually be summed against cost
instead of re-read as prose.

One entry per order run. Order files are deleted at reconcile, so the sidecar is the only
durable trace. At each cycle close (`--close-cycle`) the live entries are distilled into a
summary and moved to `docs/plans/telemetry-archive/`, which is why this file stays short.

Token notes: "fresh input" = uncached input actually paid at full rate (includes cache
writes); "cache read" is cheap. "largest tool results" sizes are estimated at ~4
chars/token. Cost is the transport's own figure where it reports one and is otherwise
derived from the token counts and `scripts/model_prices.json`, marked "est"; a model with
no rate logs as "not priced" rather than as zero.

"compiler note" is the dispatcher's read of the run, written at dispatch time. It opens
with a structured `fault:` — order, executor, mixed, or none — so a note that contradicts
the measured lines is visible at a glance rather than buried in prose. When it does
contradict them, the entry carries a `flag:` line saying so.

"first pass" is the number actually worth optimising. Executor runs cost cents; a
re-dispatch costs a cold start, the planner's attention, and often a stalled dependency
chain — far more than the token spread between a clean run and a verbose one. Read the
token lines as a diagnosis of *why* an order thrashed, not as the target.

"order shape (compiled)" measures the order rather than the executor, captured at dispatch
before a reissue can overwrite the file. The number that predicts cost is **bounded** —
how many of the START IN lines sit inside a named range — not how many lines the files
hold. `scoping` breaks the entries down: `ranged` names a line range, `point-anchored`
names a bare line number inside a large file (the shape that produced every re-read loop
so far), `symbol-scoped` names a symbol to grep for, `unscoped` names nothing, and
`whole-small` is a file short enough that reading it whole *is* the scope.

"duplicate reads" splits re-reads into `locating` (the executor could not find its target —
an order-shape fault) and `post-edit` (read-back after an edit — the executor-discipline
fault that `implement-order` forbids). They have opposite fixes.

Entries marked "(reconcile)" are stage-level, written once per stage by the `reconcile`
skill rather than per order. Their "escaped targeted checks" lines are the ones to read
first in a review pass: each is a defect that passed an order's own STOP WHEN and was
only caught by the full suites, the typecheck or the contract checks. A repeat across
stages means the fix belongs in the `to-orders` template, not in another one-off note.
Those entries also carry the planner-side cost of the stage — compiling and dispatching —
without which the log cannot say whether dispatching beat implementing the change directly.

## Scoreboard — current cycle

- order runs: 7 across 7 unique order(s); DONE on one run 6 of 7 (85%), re-dispatched orders 0 (0 extra run(s))
- stages reconciled: 2 | escaped targeted checks: 0
- fault attribution: executor 3, none 4
- spend: executor $0.43 | planner not recorded
- orders dispatched with an unbounded large file in START IN: 0 of 7 measured
- escalated above Light: 0 of 7 measured

## Closed cycle - 2026-07-25 (12 order runs, Map Lab UX stages 7-8)

The log's first full cycle was reviewed and its lessons converted into enforcement:

- Order-shape faults became `scripts/check_orders.py` rules: unresolvable paths, edit
  sites absent from START IN, bare filenames or symbols, conditional instructions,
  unscoped large files, fixtures without the cast idiom plus a typecheck, and several
  behaviours aimed at one large integrated suite.
- The `src/model/` layering rule became an `oxlint` `no-restricted-imports` override.
- Carried frontend failures moved to `frontend/known-test-failures.json` and are judged by
  `npm run test:check`.
- `scripts/order_telemetry.py` stopped guessing when an executor child record is absent.

Two non-mechanical lessons remain compiler judgement:

- Describe a precedent's relevant shape in KNOWN STATE instead of sending the executor to
  read it. One logical change with likely-wrong facts pre-answered was the cheapest run.
- Async orders around `useMapLabSessionState` must name the initial-load save-suppression
  seam. Split hook error reporting from page-level placement.

## Closed cycle - 2026-07-26 (24 runs, 22 orders, docs-restructure stages 1-5)

Twenty-one of 22 unique orders completed without a cold re-dispatch. Order 16 accounted
for the two cancelled runs and completed once its fixture-root error and link contract
were diagnosed explicitly. Model escalation did not solve the under-specified order;
correct order shape did. Stages 3 and 5 reconciled with no escaped targeted checks.

The repeated findings are now enforced:

- Work orders declare `REQUIRED STRENGTH`, `CREATES`, and `REMOVES`. Lifecycle artifacts
  are authorized separately from START IN, named in DO, asserted directly by STOP WHEN,
  and checked for their final state when an order is DONE.
- Structural documentation orders run `scripts/check_docs.py --check`. This closes the
  Stage 2 class where missing artifacts, stale links, stale manifest rows, and move/delete
  self-invalidation passed targeted pytest.
- Validator changes include their direct test module in START IN and STOP WHEN. The
  Stage 1 discovery-contract escape can no longer omit `backend/tests/test_check_orders.py`.
- Independently runnable orders may not share mutable paths. A dependency is required
  when one order edits or removes a file another consumes, preventing the Orders 06/07
  shared-input race.
- The executor may edit documentation explicitly authorized by the order; the previous
  code-and-tests-only rule contradicted the successful documentation restructuring work.
- Dispatch paths now match `docs/plans/active/<feature>/NN-<slug>.md`, and model strength
  is an explicit order field rather than dispatcher inference.
- Telemetry order shape now records required strength and lifecycle artifact counts.

The cost outliers remained compiler faults, not evidence for stronger default models:

- Order 05 read all area guides because a parser order omitted representative documents.
- Order 15 repaired seven guide tables absent from its declared edit sites because earlier
  orders were not prevalidated against the exact coverage universe.
- Order 16 looped because its fixture helper wrote under the wrong temporary root and the
  assertion hid the actionable checker error.

Compiler judgement still required after this cycle:

- For validator work, name representative real documents for every accepted grammar
  shape and one fixture for every rejected target class stated in KNOWN STATE.
- Expand proposed coverage globs against the real implementation universe before writing
  the orders, so the final enforcement order verifies rather than repairs prior work.
- Locate symbols with grep before reading ranges from large checker, test, Plan, or
  telemetry files. Keep future-created paths in CREATES, not START IN.

## Closed cycle - 2026-07-26 (7 orders, Map Lab Editor Usability stages 1-3)

All seven orders completed on the first pass, including six dispatched executor runs and one direct
planner implementation. All three reconcile entries reported no escaped targeted checks. Light
remains the correct default for bounded UI work; stronger models or broader executor checks would
not improve this cycle's result.

The remaining cost and reporting issues are now reflected in the workflow instructions:

- Repeated reads were the dominant avoidable cost: source ranges were reopened up to 15 times and
  test/CSS ranges up to nine times. `implement-order` and both opencode executor agents now require
  one order read, grep only to locate named anchors, one bounded read per needed range, and no
  post-edit reread unless the edit or STOP WHEN fails.
- START IN scope now means the named symbol or range, not merely the path. DEVIATIONS reports
  out-of-scope sections within a named file, resolving the ambiguity in the floor-strip test run.
- A route-mode regression forced exploration of route-context files because the compiled order did
  not state that `MemoryRouter` rerender leaves history unchanged. `to-orders` now requires the exact
  harness transition for routing, providers, timers, and async settling in KNOWN STATE.
- Compiler notes contradicted measured duplicate/outside-read lines in several entries.
  `dispatch-orders` now requires notes to reconcile transcript metrics with executor DEVIATIONS.
- The repository described five workflow skills while `.gitignore` tracked only four;
  `dispatch-orders` is now explicitly tracked so these dispatcher rules are durable.

Raw entries for this cycle: [2026-07-26-maplab-editor-usability-stages-1-3.md](telemetry-archive/2026-07-26-maplab-editor-usability-stages-1-3.md)

## Closed cycle — 2026-07-26 22:51 — maplab-editor-usability stages 4-7

Fourteen runs across 13 orders, 12 of 13 DONE on the first pass. The single re-dispatch (order 01, fit targets) was blocked by an internally contradictory KNOWN STATE - the order derived expected SVG size from roomBounds while MapCanvas sizes from the padded bounds the same order froze - and the corrected reissue was cheaper than the original run, so model strength was never the variable. The whole stage-7 batch ran at Light and shipped first pass; 0 of 7 measured orders escalated above Light and 0 dispatched an unbounded large file, at $2.18 executor spend for the cycle. Fault attribution was 5 order, 1 mixed, 1 executor: the dominant measured cost driver in nearly every run was locating re-reads of large START IN files bounded by symbol name only, and applying the fix mid-batch cut source-file locating reads from 6 to 1 and test-file locating reads from 6 to 1 within the same stage. Three defects escaped targeted checks across four reconciles - a stale useMapCanvasZoom assertion and a missing useCallback dependency, both traceable to one order changing a shared exported signature with caller-scoped STOP WHEN, plus a hand-maintained icon count in DESIGN_SYSTEM.md that was already stale by three aliases before this cycle began. Planner-side compile and dispatch cost was recorded for none of the four stages, so this cycle still cannot say whether dispatching beat implementing directly.

- order runs: 14 across 13 unique order(s); DONE on one run 12 of 13 (92%), re-dispatched orders 1 (1 extra run(s))
- stages reconciled: 4 | escaped targeted checks: 3
- fault attribution: executor 1, mixed 1, order 5
- spend: executor $2.18 | planner not recorded
- orders dispatched with an unbounded large file in START IN: 0 of 7 measured
- escalated above Light: 0 of 7 measured

Lessons, and where each one now lives:

- **enforced** (scripts/check_orders.py) — when DO changes an exported signature, START IN must enumerate every call site and STOP WHEN must run the changed module own test suite, not just the caller test file; this single order-shape fault both blocked a run and leaked a stale hook assertion to reconcile.
- **enforced** (scripts/check_orders.py) — an order touching a React hook arguments or dependency array must include npm run lint in STOP WHEN; neither vitest nor tsc detects a missing dependency, which is how a latent stale-closure bug reached stage 5 reconcile.
- **enforced** (scripts/check_orders.py --fix) — line ranges cited by downstream orders go stale the moment an upstream order edits the same large file (04 invalidated 05 and 06, then 05 invalidated 06 again); ranges are now re-healed from their anchors instead of re-verified by hand between dispatches.
- **enforced** (scripts/check_orders.py) — START IN must name where a NEW test is inserted, not merely the fixture it reuses; diagnosing this on 05 without correcting 06 let 06 regress to 6 locating reads of a 2,000-line suite, and naming the insertion point on 07 brought it straight back to 1.
- **enforced** (scripts/check_orders.py) — symbol-scoped entries in large START IN files are resolved into explicit line ranges; symbol-name-only bounding was the sole measurable waste in orders 01, 02 and 03 and the amplifier behind the most expensive run of the cycle (04, 74 turns, $0.44).
- **enforced** (scripts/read_guard.py) — post-edit re-reads were the only waste class that survived every order-side correction (3 on order 07, 2 on 05), so executor self-verification is now denied in the harness rather than discouraged in prose.
- **judgement** — an executor DEVIATIONS block cannot be trusted on its own. Order 04 declared opened beyond START IN: none while the transcript measured a read of roomContent.ts; always reconcile the declared block against transcript metrics before writing the compiler note.
- **judgement** — DESIGN_SYSTEM.md Icon count is still hand-maintained prose (now corrected to 524). No order STOP WHEN - vitest, tsc, eslint - and no check_docs rule can catch it, and it had already drifted across at least three earlier stages undetected. Generate and staleness-check it like the other inventories or delete it from the doc; another note will not hold.
- **judgement** — planner compile and dispatch cost went unrecorded for all four reconciles because the compile sessions were prior conversations and the harness exposes no cost figure to the planner. Until that is captured at compile time, the log cannot compare dispatching against the CLAUDE.md planner fast path.
- **judgement** — writing an area guide empty plan queue as anything other than the literal "Plan queue: None." silently drops that guide whole change map from check_docs coverage - one phrasing produced 77 spurious failures.

Raw entries for this cycle: [2026-07-26-maplab-editor-usability-stages-4-7.md](telemetry-archive/2026-07-26-maplab-editor-usability-stages-4-7.md)

## 2026-07-27 09:58 — 02-skip-empty-rooms.md
- status: DONE
- first pass: yes
- order shape (compiled): Light | START IN 2 files / 271 lines / 271 bounded | scoping: 2 whole-small | DO 2 behaviour(s) | creates 0 / removes 0 [dispatch snapshot 2026-07-27T09:58:20; order file changed after dispatch]
- model: claude-haiku-4-5-20251001 | turns: 27 | wall: 1m00s
- tokens: output 2,941 | fresh input 50,516 | cache read 775,888 | cost $0.1554 est
- tool calls: Read x3, Edit x3, Skill x1, Bash x1, PowerShell x1
- largest tool results: Read frontend\src\player\PlayerMapRenderer.tsx (~2,317 tok); Read docs\plans\active\kid-map-legibility\02-skip-empty-rooms.md (~862 tok); Read frontend\src\player\__tests__\PlayerMapRenderer.test.tsx (~501 tok)
- duplicate reads: none
- reads outside START IN: none
- deviations (executor): KNOWN STATE re-verified or wrong: none
- compiler note: fault: none — Clean Light run: 9 tool calls, no exploration beyond the two START IN files. The verified-facts block did the work — inlining absoluteCells' behaviour with an explicit do-not-open, and quoting the sibling fixture verbatim, removed both reasons the executor would have opened maplabModel.ts or hunted for the fixture idiom. Repeat this pattern.
- source: claude transcript agent-acdeb505a9d4b416b.jsonl

## 2026-07-27 09:58 — 01-kid-map-palette.md
- status: DONE
- first pass: yes
- order shape (compiled): Light | START IN 2 files / 579 lines / 156 bounded | scoping: 1 ranged, 1 whole-small | DO 2 behaviour(s) | creates 0 / removes 0 [dispatch snapshot 2026-07-27T09:58:19; order file changed after dispatch]
- model: claude-haiku-4-5-20251001 | turns: 34 | wall: 1m14s
- tokens: output 4,349 | fresh input 84,198 | cache read 988,634 | cost $0.2258 est
- tool calls: Edit x7, Read x3, Skill x1, PowerShell x1
- largest tool results: Read docs\plans\active\kid-map-legibility\01-kid-map-palette.md (~1,081 tok); PowerShell .venv\Scripts\python.exe scripts/check_docs.py --write-generated &&... (~1,070 tok); Read frontend\src\player\PlayerShell.css (~783 tok)
- duplicate reads: none
- reads outside START IN: none
- deviations (executor): KNOWN STATE re-verified or wrong: none
- compiler note: fault: none — Clean Light run at 12 tool calls. The decided-palette block carried it — seven aliases given as exact token names with 'do not invent hex, do not recompute ratios' meant zero contrast arithmetic and no wandering into DESIGN_SYSTEM prose. The anchored line range on theme.css (a large shared file) held; PlayerShell.css at 142 lines was correctly left whole-small.
- source: claude transcript agent-ae54f97ec9288b58d.jsonl

## 2026-07-27 10:06 — kid-map-legibility stage 1 (reconcile)
- stage checks: pytest: pass (634 passed in 75.07s (0:01:15); Required test coverage of 97% reached. Total coverage: 97.25%) / test:check --strict: pass (test:check — 1381 tests, 11 failing, 11 of them already known.; test:check PASS — no new failures.) / lint: pass / build: pass (built in 1.32s) / check_docs --check: pass
- escaped targeted checks: none — every defect was caught by an order's own STOP WHEN
- planner cost: compile not recorded | dispatch + repair not recorded | reissues 0
- reconcile note: Planner cost not retrievable: the harness running the compile and dispatch sessions did not expose a cost readout to the model, so compile/dispatch USD are absent rather than estimated. Nothing escaped the targeted checks, so no to-orders change is indicated by this stage. One reconcile-side friction worth encoding: marking the area guide's first queued plan as 'in progress' fails check_docs, which requires the literal '(next up)' marker on the first queue entry — the queue marker tracks position, not progress, and stage progress belongs in the work-queue prose.

## 2026-07-27 10:19 — 01-room-label-anchor.md
- status: DONE
- first pass: yes
- order shape (compiled): Light | START IN 3 files / 2,953 lines / 132 bounded | scoping: 3 ranged | DO 2 behaviour(s) | creates 0 / removes 0 [dispatch snapshot 2026-07-27T10:19:41; order file changed after dispatch]
- model: deepseek-v4-flash | turns: 14 | wall: 2m56s
- tokens: output 20,744 | fresh input 17,037 | cache read 370,176 | cost $0.0092
- tool calls: read x8, grep x4, edit x4, skill x1, bash x1
- largest tool results: skill (~2,066 tok); read docs\plans\active\kid-map-legibility\01-room-label-anchor.md (~1,223 tok); read frontend\src\features\dungeons\maplab\__tests__\maplabModel.test.ts (~1,053 tok)
- duplicate reads: frontend/src/features/dungeons/maplab/maplabData.ts x3 (2 locating, 0 post-edit), docs/plans/active/kid-map-legibility/01-room-label-anchor.md x2 (0 locating, 1 post-edit), frontend/src/features/dungeons/maplab/__tests__/maplabModel.test.ts x2 (1 locating, 0 post-edit)
- reads outside START IN: frontend/src/features/dungeons/maplab/maplabData.ts
- deviations (executor): KNOWN STATE re-verified or wrong: none
- compiler note: fault: none — Light sufficed and the verified algorithm, exact expected values, and bounded START IN ranges carried the implementation without any declared deviation.
- flag: compiler note says fault: none, but the measured lines show 1 read(s) outside START IN and 1 post-edit re-read(s)
- source: opencode session ses_05d207089ffeQbMZbWAqxYtD8X

## 2026-07-27 10:24 — 02-player-uses-anchor.md
- status: DONE
- first pass: yes
- order shape (compiled): Light | START IN 2 files / 279 lines / 279 bounded | scoping: 2 whole-small | DO 1 behaviour(s) | creates 0 / removes 0 [dispatch snapshot 2026-07-27T10:23:46; order file changed after dispatch]
- model: deepseek-v4-flash | turns: 22 | wall: 3m04s
- tokens: output 10,993 | fresh input 26,921 | cache read 522,880 | cost $0.0083
- tool calls: read x7, edit x6, bash x6, grep x3, skill x1
- largest tool results: read frontend\src\player\PlayerMapRenderer.tsx (~2,420 tok); read frontend\src\player\PlayerMapRenderer.tsx (~2,310 tok); skill (~2,066 tok)
- duplicate reads: docs/plans/active/kid-map-legibility/02-player-uses-anchor.md x2 (0 locating, 1 post-edit), frontend/src/player/PlayerMapRenderer.tsx x2 (0 locating, 1 post-edit), frontend/src/features/dungeons/maplab/MapLabPage.tsx x2 (1 locating, 0 post-edit)
- reads outside START IN: frontend/src/features/dungeons/maplab/MapLabPage.tsx
- deviations (executor): KNOWN STATE re-verified or wrong: none
- compiler note: fault: executor — Light sufficed, but the executor ignored the whole-small two-file scope by reading MapLabPage.tsx and then re-read both the order and edited renderer; these were unnecessary executor scope and self-verification costs, not order defects.
- source: opencode session ses_05d1c4507ffe9XUSPm2RB2gukV

## 2026-07-27 10:24 — 03-maplab-uses-anchor.md
- status: DONE
- first pass: yes
- order shape (compiled): Light | START IN 4 files / 6,450 lines / 133 bounded | scoping: 3 ranged, 1 whole-small | DO 2 behaviour(s) | creates 0 / removes 0 [dispatch snapshot 2026-07-27T10:23:56; order file changed after dispatch]
- model: deepseek-v4-flash | turns: 8 | wall: 1m53s
- tokens: output 6,864 | fresh input 14,988 | cache read 113,280 | cost $0.0043
- tool calls: read x7, edit x7, skill x1, bash x1
- largest tool results: skill (~2,066 tok); read frontend\src\features\dungeons\maplab\GhostFloorLayer.tsx (~1,016 tok); read docs\plans\active\kid-map-legibility\03-maplab-uses-anchor.md (~1,008 tok)
- duplicate reads: frontend/src/features/dungeons/maplab/MapLabEditorPage.tsx x5 (4 locating, 0 post-edit)
- reads outside START IN: none
- deviations (executor): KNOWN STATE re-verified or wrong: none
- compiler note: fault: none — Light sufficed with nothing outside START IN and no post-edit reads; MapLabEditorPage.tsx was opened five times because the order intentionally named three separate bounded edit ranges in that large file, while the whole-small GhostFloorLayer stayed direct.
- source: opencode session ses_05d1c44a5ffepHQk4jsq17qVI9

## 2026-07-27 10:24 — 04-viewer-uses-anchor.md
- status: DONE
- first pass: yes
- order shape (compiled): Light | START IN 3 files / 3,054 lines / 54 bounded | scoping: 3 ranged | DO 1 behaviour(s) | creates 0 / removes 0 [dispatch snapshot 2026-07-27T10:24:11; order file changed after dispatch]
- model: deepseek-v4-flash | turns: 13 | wall: 3m14s
- tokens: output 4,073 | fresh input 15,644 | cache read 179,328 | cost $0.0038
- tool calls: read x6, edit x5, bash x3, skill x1, grep x1
- largest tool results: skill (~2,066 tok); grep frontend\src\features\dungeons\maplab\MapLabPage.tsx (~1,727 tok); read docs\plans\active\kid-map-legibility\04-viewer-uses-anchor.md (~757 tok)
- duplicate reads: frontend/src/features/dungeons/maplab/MapLabPage.tsx x4 (2 locating, 1 post-edit), docs/plans/active/kid-map-legibility/04-viewer-uses-anchor.md x2 (1 locating, 0 post-edit)
- reads outside START IN: none
- deviations (executor): KNOWN STATE re-verified or wrong: none
- compiler note: fault: executor — Light sufficed and nothing was read outside START IN; two locating reads reflect the three bounded MapLabPage ranges, but the additional post-edit MapLabPage read was unnecessary executor self-verification.
- source: opencode session ses_05d1c4442ffe4XAG0FaeiG4IQY

## 2026-07-27 10:29 — 05-kid-label-size-and-fade.md
- status: STALLED - user cancelled after executor looped on failing tests without writing STATUS
- first pass: yes
- order shape (compiled): Light | START IN 3 files / 409 lines / 409 bounded | scoping: 3 whole-small | DO 3 behaviour(s) | creates 0 / removes 0 [dispatch snapshot 2026-07-27T10:29:00]
- model: deepseek-v4-flash | turns: 37 | wall: 7m44s
- tokens: output 41,387 | fresh input 27,932 | cache read 1,562,880 | cost $0.0199
- tool calls: bash x14, edit x13, read x7, write x3, skill x1, glob x1
- largest tool results: read frontend\src\player\PlayerMapRenderer.tsx (~2,836 tok); read frontend\src\player\PlayerMapRenderer.tsx (~2,305 tok); skill (~2,066 tok)
- duplicate reads: frontend/src/player/PlayerMapRenderer.tsx x2 (0 locating, 1 post-edit), frontend/src/player/__tests__/PlayerMapRenderer.test.tsx x2 (0 locating, 1 post-edit)
- reads outside START IN: frontend/src/test/setup.ts
- deviations (executor): not recorded
- compiler note: fault: executor — Light implemented the scoped files but looped for 37 turns on its failing test fix, including post-edit source/test reads and an undeclared setup.ts read; the dispatcher will diagnose the dirty worktree rather than cold-redispatching.
- source: opencode session ses_05d17db0effeB005nrnwJD8ZnC

## 2026-07-27 10:43 — kid-map-legibility stage 2 (reconcile)
- stage checks: pytest: pass (634 passed in 78.96s (0:01:18); Required test coverage of 97% reached. Total coverage: 97.25%) / test:check --strict: pass (test:check — 1387 tests, 11 failing, 11 of them already known.; test:check PASS — no new failures.) / lint: pass / build: pass (✓ built in 1.56s) / check_docs --check: pass
- escaped targeted checks: none — every defect was caught by an order's own STOP WHEN
- planner cost: compile not recorded | dispatch + repair not recorded | reissues 0
- reconcile note: Planner compile/dispatch costs are unavailable from this harness and were not estimated. Nothing escaped targeted checks; the mid-dispatch repair exposed an order-authoring defect: verified SVG/viewBox arithmetic must include every bounds contributor in the named fixture, including outside features, before exact test values are compiled.
