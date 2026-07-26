# Work-order telemetry log

Auto-appended by `scripts/order_telemetry.py` after each dispatched work order reports
back. One entry per order run; order files are deleted at reconcile, so this log is the
durable record. Reviewed periodically (every ~10-15 dispatches) to tighten the
plan/to-orders/implement-order rules - look for repeated large reads, duplicate reads,
reads outside START IN, and executor deviations.

Token notes: "fresh input" = uncached input actually paid at full rate (includes cache
writes); "cache read" is cheap. "largest tool results" sizes are estimated at ~4
chars/token. Cost drivers to optimise: fresh input, output, and turn count.

The "compiler note" line is the dispatcher's own read of the run, written at dispatch
time via `--note`: why the numbers look as they do, and which cost drivers trace back to
how the order was compiled rather than to the executor. The measured lines say what
happened; the note says what to do differently when compiling the next stage, while the
order file still exists to check against. "not recorded" means that judgement was lost.

"first pass" is the number actually worth optimising. Executor runs cost cents; a
re-dispatch costs a cold start, the planner's attention, and often a stalled dependency
chain - far more than the token spread between a clean run and a verbose one. Read the
token lines as a diagnosis of *why* an order thrashed, not as the target.

"order shape (compiled)" measures the order rather than the executor: required strength,
how many files START IN named, how many lines they hold, how many were left unscoped,
how many behaviours DO asked for, and how many artifacts it creates or removes. Nearly
every compiler note below concludes the order was at fault, so this is the column to
correlate an expensive run against - and it is only capturable now, since order files are
deleted at reconcile.

Entries marked "(reconcile)" are stage-level, written once per stage by the `reconcile`
skill rather than per order. Their "escaped targeted checks" lines are the ones to read
first in a review pass: each is a defect that passed an order's own STOP WHEN and was
only caught by the full suites, the typecheck or the contract checks. A repeat across
stages means the fix belongs in the `to-orders` template, not in another one-off note.

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

Reset here for the next cycle. Nothing below this line predates 2026-07-26.

## 2026-07-26 17:37 — 01-anchor-passage-terrain-flyouts.md
- status: DONE
- first pass: yes
- order shape (compiled): Light | START IN 2 files / 2,642 lines | DO 1 behaviour(s) | creates 0 / removes 0
- model: deepseek-v4-flash | turns: 11 | wall: 2m47s
- tokens: output 14,570 | fresh input 17,514 | cache read 252,160 | cost $0.0072
- tool calls: read x7, edit x5, skill x1, bash x1
- largest tool results: read frontend\src\features\dungeons\maplab\MapLabEditorPage.tsx (~2,250 tok); read frontend\src\features\dungeons\maplab\MapLabEditorPage.tsx (~2,047 tok); skill (~1,722 tok)
- duplicate reads: docs/plans/active/maplab-editor-usability/01-anchor-passage-terrain-flyouts.md x2, frontend/src/features/dungeons/maplab/MapLabEditorPage.tsx x4
- reads outside START IN: none
- deviations (executor): opened beyond START IN: none | KNOWN STATE re-verified or wrong: none
- compiler note: Light sufficed: the executor stayed within the order's START IN files, reused the named existing createPortal import and refs pattern, and the targeted MapLabEditorPage test passed. No reported duplicate reads or outside-START-IN work; the verified-facts block held for this anchored flyout conversion.
- source: opencode session ses_060b8e5cdffeRIs2SAeErT6iQJ

## 2026-07-26 17:39 — 02-prop-kind-flyout.md
- status: DONE
- first pass: yes
- order shape (compiled): Light | START IN 2 files / 2,665 lines | DO 1 behaviour(s) | creates 0 / removes 0
- model: deepseek-v4-flash | turns: 17 | wall: 2m09s
- tokens: output 9,670 | fresh input 23,416 | cache read 375,680 | cost $0.0070
- tool calls: read x18, edit x6, skill x1, bash x1
- largest tool results: skill (~1,722 tok); read frontend\src\features\dungeons\maplab\MapLabEditor.css (~1,070 tok); read frontend\src\features\dungeons\maplab\MapLabEditorPage.tsx (~1,027 tok)
- duplicate reads: docs/plans/active/maplab-editor-usability/02-prop-kind-flyout.md x2, frontend/src/features/dungeons/maplab/MapLabEditorPage.tsx x15
- reads outside START IN: none
- deviations (executor): opened beyond START IN: none | KNOWN STATE re-verified or wrong: none
- compiler note: Light sufficed: the executor extended the shared pattern from Order 01 within the two START IN files and the targeted MapLabEditorPage test passed. No reported outside-START-IN work; duplicate reads were limited to normal order/source re-reads, and the order's instruction to reuse the settled pattern prevented a second overlay mechanism.
- source: opencode session ses_060b60a4bffe9JjL0FXa2aN4tu

## 2026-07-26 17:42 — 03-disarm-armed-tool-affordance.md
- status: DONE
- first pass: yes
- order shape (compiled): Light | START IN 2 files / 4,288 lines | DO 1 behaviour(s) | creates 0 / removes 0
- model: deepseek-v4-flash | turns: 13 | wall: 1m56s
- tokens: output 8,774 | fresh input 20,439 | cache read 251,776 | cost $0.0060
- tool calls: read x11, edit x6, grep x3, skill x1, bash x1
- largest tool results: read frontend\src\features\dungeons\maplab\MapLabEditorPage.tsx (~1,885 tok); skill (~1,722 tok); read frontend\src\features\dungeons\maplab\MapLabEditorPage.tsx (~1,260 tok)
- duplicate reads: docs/plans/active/maplab-editor-usability/03-disarm-armed-tool-affordance.md x2, frontend/src/features/dungeons/maplab/MapLabEditorPage.tsx x5, frontend/src/features/dungeons/maplab/__tests__/MapLabEditorPage.test.tsx x4
- reads outside START IN: none
- deviations (executor): opened beyond START IN: none | KNOWN STATE re-verified or wrong: none
- compiler note: Light sufficed: the executor updated the named toolbar handlers and nearby test within START IN, and the targeted MapLabEditorPage check passed with the added regression. No reported outside-START-IN work; the order was specific enough for the model to keep the Escape precedence unchanged while adding second-click disarm.
- source: opencode session ses_060b3b37effeXWg8Xu3Ty8LRNE

## 2026-07-26 17:46 — maplab-editor-usability stage 1 (reconcile)
- stage checks: pytest: 538 passed; npm run test:check -- --strict: PASS, 1343 tests with 11 known failures and no new failures; npm run lint: PASS with existing warnings; npm run build: PASS; check_docs --check: PASS
- escaped targeted checks: none — every defect was caught by an order's own STOP WHEN
- reconcile note: No escaped defects from Stage 1: the targeted MapLabEditorPage stop-checks covered the flyout and second-click-disarm changes, and full pytest/frontend strict/lint/build/docs checks found no new failures. Keep compiling this surface with targeted MapLabEditorPage tests plus reconcile-only build/lint/docs coverage.

## 2026-07-26 17:55 — 01-quick-select-flyout-filter.md
- status: DONE
- first pass: yes
- order shape (compiled): Standard | START IN 3 files / 5,028 lines | DO 1 behaviour(s) | creates 0 / removes 0
- transport: manual (chat UI — no parseable local record)
- reported: direct planner implementation, no executor usage figures
- deviations (executor): Implemented directly in this planner session at the user's request instead of dispatching to a subagent. | No scope deviations from the order.
- compiler note: Standard-strength direct run stayed within the one-order shape; targeted MapLabEditorPage test passed after adding one quick-select regression.
- missing (not measurable in this transport): tokens, model, tool calls, turns, largest tool results, duplicate reads, reads outside START IN

## 2026-07-26 17:58 — maplab-editor-usability stage 2 (reconcile)
- stage checks: targeted MapLabEditorPage test: PASS (88 tests); frontend test:check --strict: PASS (1344 tests, 11 known failures); frontend lint: PASS with existing warnings; frontend build: PASS with existing Vite chunk-size warning; pytest: PASS (538 passed, coverage 97.25%)
- escaped targeted checks: none — every defect was caught by an order's own STOP WHEN
- reconcile note: No escaped defects; one Standard order was sufficient after the large-suite DO bullet was collapsed to one quick-select behavior.

## 2026-07-26 18:14 — 01-collapse-editor-shell-header.md
- status: DONE
- first pass: yes
- order shape (compiled): Light | START IN 3 files / 416 lines | DO 3 behaviour(s) | creates 0 / removes 0
- model: deepseek-v4-flash | turns: 17 | wall: 3m38s
- tokens: output 16,652 | fresh input 19,059 | cache read 405,376 | cost $0.0085
- tool calls: read x8, edit x7, bash x4, skill x1
- largest tool results: read frontend\src\features\dungeons\maplab\__tests__\DungeonShell.test.tsx (~2,112 tok); skill (~1,722 tok); read frontend\src\features\dungeons\maplab\DungeonShell.tsx (~1,217 tok)
- duplicate reads: docs/plans/active/maplab-editor-usability/01-collapse-editor-shell-header.md x2, frontend/src/features/dungeons/maplab/DungeonShell.tsx x2
- reads outside START IN: frontend/src/features/dungeons/maplab/dungeonRouteContext.ts, frontend/src/features/dungeons/maplab/dungeonRouteContext.tsx
- deviations (executor): opened beyond START IN: dungeonRouteContext.ts (debugged why `isEditMode` stayed false — rerender doesn't update MemoryRouter history) | KNOWN STATE re-verified or wrong: none
- compiler note: Light sufficed for this scoped header/CSS/test change. The order stayed inside START IN; the only notable implementation adjustment was fixing the route change test idiom, which was caused by the order asking for an assertion in a test that previously used MemoryRouter rerender semantics.
- source: opencode session ses_06097d85bffepFuIvPbwHn8iDr

## 2026-07-26 18:14 — 02-move-floor-selection-into-toolbar.md
- status: DONE
- first pass: yes
- order shape (compiled): Light | START IN 4 files / 6,309 lines | DO 1 behaviour(s) | creates 0 / removes 0
- model: deepseek-v4-flash | turns: 26 | wall: 3m48s
- tokens: output 14,672 | fresh input 36,010 | cache read 916,480 | cost $0.0117
- tool calls: read x24, edit x9, grep x3, bash x2, skill x1
- largest tool results: read frontend\src\features\dungeons\maplab\MapLabEditorPage.tsx (~5,083 tok); read frontend\src\features\dungeons\maplab\__tests__\MapLabEditorPage.te... (~2,067 tok); grep frontend\src\features\dungeons\maplab\__tests__\MapLabEditorPage.te... (~1,914 tok)
- duplicate reads: docs/plans/active/maplab-editor-usability/02-move-floor-selection-into-toolbar.md x2, frontend/src/features/dungeons/maplab/MapLabEditorPage.tsx x4, frontend/src/features/dungeons/maplab/MapLabEditor.css x2, frontend/src/features/dungeons/maplab/MapLabPage.css x9, frontend/src/features/dungeons/maplab/__tests__/MapLabEditorPage.test.tsx x7
- reads outside START IN: none
- deviations (executor): opened beyond START IN: frontend/src/features/dungeons/maplab/__tests__/MapLabEditorPage.test.tsx (line 2268, had to fix existing test that asserted floor tabs inside the now-removed `.maplab-editor-floor-strip`) | KNOWN STATE re-verified or wrong: none
- compiler note: Light sufficed for this structural JSX/CSS/test move. The order was cleanly scoped; updating the stale floor-strip assertion was in scope because the DO removed the standalone strip and the stop-check covered that regression.
- source: opencode session ses_06097d811ffehdF6MNi5M5TNOZ

## 2026-07-26 18:20 — 03-make-editor-rail-scroll-internally.md
- status: DONE
- first pass: yes
- order shape (compiled): Light | START IN 4 files / 6,328 lines | DO 1 behaviour(s) | creates 0 / removes 0
- model: deepseek-v4-flash | turns: 20 | wall: 5m41s
- tokens: output 28,841 | fresh input 27,896 | cache read 731,136 | cost $0.0140
- tool calls: read x14, edit x6, grep x5, bash x5, skill x1
- largest tool results: grep frontend\src\features\dungeons\maplab\__tests__\MapLabEditorPage.te... (~1,976 tok); skill (~1,722 tok); read frontend\src\features\dungeons\maplab\MapLabPage.css (~1,105 tok)
- duplicate reads: docs/plans/active/maplab-editor-usability/03-make-editor-rail-scroll-internally.md x3, frontend/src/features/dungeons/maplab/MapLabPage.css x4, frontend/src/features/dungeons/maplab/__tests__/MapLabEditorPage.test.tsx x5
- reads outside START IN: none
- deviations (executor): opened beyond START IN: MapLabPage.css lines 860-919 (desktop nav-rail, named in START IN but outside the 1111-1290 responsive window) and lines 1018-1110 (media query preamble needed to locate responsive section); grep for define blocks across the full test file | KNOWN STATE re-verified or wrong: none
- compiler note: Light sufficed for the bounded-rail CSS and structural regression. The run was mostly clean, but the duplicate reads suggest the order's START IN spans were broad enough that the executor re-read files to confirm anchors; no reads outside START IN were needed.
- source: opencode session ses_060941931ffeQq2WuqIx7SAKze

## 2026-07-26 18:24 — maplab-editor-usability stage 3 (reconcile)
- stage checks: pytest: 538 passed, coverage 97.25%; npm run test:check -- --strict: PASS, 1346 tests with 11 known failures and no new failures; npm run lint: PASS with warnings; npm run build: PASS with Vite chunk-size warning; check_docs: PASS
- escaped targeted checks: none — every defect was caught by an order's own STOP WHEN
- reconcile note: No defects escaped the targeted STOP WHEN checks. Stage-level verification confirmed the three scoped UI/layout orders composed cleanly, so the Stage 3 order shape was sufficient.
