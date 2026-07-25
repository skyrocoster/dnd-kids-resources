# Work-order telemetry log

Auto-appended by `scripts/order_telemetry.py` after each dispatched work order reports
back. One entry per order run; order files are deleted at reconcile, so this log is the
durable record. Reviewed periodically (every ~10-15 dispatches) to tighten the
plan/to-orders/implement-order rules — look for repeated large reads, duplicate reads,
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
chain — far more than the token spread between a clean run and a verbose one. Read the
token lines as a diagnosis of *why* an order thrashed, not as the target.

"order shape (compiled)" measures the order rather than the executor: how many files
START IN named, how many lines they hold, how many were left unscoped, and how many
behaviours DO asked for. Nearly every compiler note below concludes the order was at
fault, so this is the column to correlate an expensive run against — and it is only
capturable now, since order files are deleted at reconcile.

Entries marked "(reconcile)" are stage-level, written once per stage by the `reconcile`
skill rather than per order. Their "escaped targeted checks" lines are the ones to read
first in a review pass: each is a defect that passed an order's own STOP WHEN and was
only caught by the full suites, the typecheck or the contract checks. A repeat across
stages means the fix belongs in the `to-orders` template, not in another one-off note.


## Closed cycle — 2026-07-25 (12 order runs, Map Lab UX stages 7-8)

The log's first full cycle has been reviewed and its lessons converted into enforcement,
so the individual entries were retired. What that cycle bought, and where each finding
now lives:

- **Order-shape faults are now lint errors,** not notes a future compiler may skip:
  unresolvable paths, files named in DO but absent from START IN, bare filenames or
  symbols, conditional instructions, unscoped large files in START IN, fixtures without
  the cast idiom plus a typecheck, and several behaviours aimed at one large integrated
  suite. `scripts/check_orders.py` carries one rule per fault with the run that paid for
  it; `scripts/check_docs.py` gates them in CI.
- **The `src/model/` layering rule** — prose in `ARCHITECTURE.md`, breached once by an
  executor handed an architecture decision — is now an `oxlint` `no-restricted-imports`
  override, so it fails at stop-check time rather than at reconcile.
- **Carried test failures** moved out of every order's KNOWN TEST FAILURES block into
  `frontend/known-test-failures.json`, judged by `npm run test:check`.
- **Telemetry mis-attribution** (a newest-match lookup returning the dispatcher's own
  session when the executor left no child record) is fixed in `order_telemetry.py` —
  the search is restricted to sessions with a parent, and refuses rather than guesses.

Two findings from that cycle are *not* mechanically enforced and are carried forward
deliberately:

- **The cheapest run in the log described its precedent's shape in prose** — the state
  hook, the effect, the exact `onChange` coercion, the placeholder copy — instead of
  pointing at the precedent file. One logical change, one precedent, every likely-wrong
  fact pre-answered, 33 turns and nothing read outside START IN. Copy that shape; no
  linter can require it.
- **Async session-state orders around `useMapLabSessionState` must name the initial-load
  save-suppression seam.** A save-error test has to establish one settled transition
  before mocking the next PUT rejection, or the hook's post-404 suppression swallows it.
  The one order abandoned at both Light and Standard strength died on this: it asked for
  seven integrated async behaviours inside a ~1,700-line page test without naming the
  seam. Split hook error reporting from page-level placement.

Reset here for the next cycle. Nothing below this line predates 2026-07-25.

## 2026-07-25 21:17 — docs-restructure/01-folder-aware-tooling.md
- status: DONE
- first pass: yes
- order shape (compiled): START IN 4 files / 2,657 lines | DO 3 behaviour(s)
- model: deepseek-v4-flash | turns: 40 | wall: 5m10s
- tokens: output 29,706 | fresh input 49,288 | cache read 2,372,224 | cost $0.0219
- tool calls: edit x21, read x18, glob x3, bash x2, skill x1, grep x1
- largest tool results: read scripts\order_telemetry.py (~8,966 tok); read scripts\check_docs.py (~4,809 tok); read scripts\check_orders.py (~4,718 tok)
- duplicate reads: docs/plans/active/orders/docs-restructure/01-folder-aware-tooling.md x2, scripts/check_docs.py x4, scripts/order_telemetry.py x4, backend/tests/test_docs_contract.py x7
- reads outside START IN: none
- deviations (executor): opened beyond START IN: backend/tests/test_docs_contract.py (lines 1-132, 370-547) read to verify change safety; scripts/check_docs.py lines 1-171 and 527-919 read for run_all_checks and _is_redirect context | KNOWN STATE re-verified or wrong: Verified directory layout with glob — current tree is mixed old-flat and new-feature-folders as expected during transition
- compiler note: Light sufficed and the stop-check passed after one corrective attempt. The executor overreached START IN by reading broad portions of check_docs.py and the test file; the order named narrow line ranges, though the _is_redirect archive-path change required nearby context that KNOWN STATE did not anchor precisely.
- source: opencode session ses_065181e67ffepELjP1Ctonh3ff

## 2026-07-25 21:20 — 02-active-plan-folders.md
- status: DONE
- first pass: yes
- order shape (compiled): START IN 2 files / 43 lines | DO 2 behaviour(s)
- model: deepseek-v4-flash | turns: 29 | wall: 2m18s
- tokens: output 10,678 | fresh input 34,294 | cache read 890,112 | cost $0.0103
- tool calls: read x24, bash x15, edit x10, skill x1
- largest tool results: read docs\plans\active\player-app-skeleton.md (~3,823 tok); read docs\plans\active\production-nightly-deploys.md (~2,306 tok); read docs\plans\active\docs-restructure.md (~1,858 tok)
- duplicate reads: docs/plans/active/orders/docs-restructure/02-active-plan-folders.md x2, opencode.jsonc x2, docs/plans/active/docs-restructure/02-active-plan-folders.md x2
- reads outside START IN: docs/plans/_example/99-creature-row-ac.md, docs/plans/active
- deviations (executor): opened beyond START IN: none | KNOWN STATE re-verified or wrong: none
- compiler note: Light was sufficient with no retries or declared deviations. The feature-directory START IN scope held; no files were opened beyond it and KNOWN STATE required no re-verification.
- source: opencode session ses_06512dfc2ffetDrBqNdIwDoKft

## 2026-07-25 21:22 — 03-workflow-path-contract.md
- status: DONE
- first pass: yes
- order shape (compiled): START IN 6 files / 865 lines | DO 1 behaviour(s)
- model: deepseek-v4-flash | turns: 24 | wall: 2m12s
- tokens: output 11,276 | fresh input 28,422 | cache read 757,760 | cost $0.0093
- tool calls: edit x17, read x9, bash x2, skill x1
- largest tool results: read .agents\skills\to-orders\SKILL.md (~3,946 tok); read docs\PLAN_TEMPLATE.md (~3,630 tok); read .agents\skills\reconcile\SKILL.md (~2,335 tok)
- duplicate reads: docs/plans/active/docs-restructure/03-workflow-path-contract.md x2, .agents/skills/reconcile/SKILL.md x2
- reads outside START IN: none
- deviations (executor): opened beyond START IN: none | KNOWN STATE re-verified or wrong: none
- compiler note: Light was sufficient and completed the mechanical path-contract replacements without retries. No declared deviations or KNOWN STATE re-verification; the narrow named anchors held.
- source: opencode session ses_06510495fffeuxSmVKvgEoAjJC

## 2026-07-25 21:29 — 04-done-plan-folders.md
- status: DONE
- first pass: yes
- order shape (compiled): START IN 5 files / 459 lines | DO 2 behaviour(s)
- model: deepseek-v4-flash | turns: 37 | wall: 5m31s
- tokens: output 28,311 | fresh input 69,714 | cache read 2,253,568 | cost $0.0240
- tool calls: read x37, bash x12, edit x9, skill x1
- largest tool results: read scripts\check_docs.py (~10,708 tok); read docs\README.md (~4,977 tok); read docs\README.md (~4,823 tok)
- duplicate reads: docs/plans/active/docs-restructure/04-done-plan-folders.md x3, docs/README.md x3, docs/areas/dungeons.md x2, docs/areas/encounters.md x2, docs/areas/loot.md x2, docs/areas/monsters.md x2, docs/areas/spells.md x2, docs/areas/visual-design.md x2
- reads outside START IN: docs/areas, docs/areas/documentation.md, docs/areas/dungeons.md, docs/areas/encounters.md, docs/areas/loom.md, docs/areas/loot.md, docs/areas/monsters.md, docs/areas/player-app.md, docs/areas/players.md, docs/areas/reference-catalogs.md, docs/areas/repo-infra.md, docs/areas/spells.md, docs/areas/visual-design.md, docs/complete, docs/plans/active, docs/plans/done, docs/table-tests, docs/table-tests/2026-07-23-player-app-skeleton-stage-6.md, docs/table-tests/_example, docs/table-tests/_example/README.md, docs/table-tests/_example/session-template.md, scripts/check_docs.py, scripts/check_orders.py
- deviations (executor): opened beyond START IN: scripts/check_docs.py, scripts/check_orders.py (investigating STOP WHEN failure) | KNOWN STATE re-verified or wrong: verified active plan directory structure; all KNOWN STATE correct
- compiler note: Light ultimately sufficed, but the self-invalidating START IN entry for docs/complete/ caused one STOP WHEN repair after that directory was intentionally removed. Reads of scripts/check_docs.py and scripts/check_orders.py were in-scope diagnosis of that compiler fault rather than executor wandering; future move-and-delete orders should name the post-move path or exempt the source path from final lint.
- source: opencode session ses_0650dc78bffeFyMuj08prj1vVo

## 2026-07-25 21:35 — docs-restructure stage 1 (reconcile)
- stage checks: pytest: 503 passed, coverage 97.25%; npm run test:check -- --strict: 1342 tests, 11 known failures, pass; npm run lint: pass with pre-existing warnings; npm run build: pass; check_docs --check and --base HEAD: pass
- escaped targeted checks: Order 01 changed default discovery to require NN-<slug>.md but its STOP WHEN omitted backend/tests/test_check_orders.py, whose tree-walk fixture still created 01.md; this defect has not happened before and was fixed at reconcile by renaming the fixture to 01-broken.md.
- reconcile note: When an order changes a tool's discovery contract, to-orders must include that tool's own test module in START IN and STOP WHEN, not only the higher-level contract tests.

## 2026-07-25 22:13 — 05-area-queue-and-ownership-checks.md
- status: DONE
- first pass: yes
- order shape (compiled): START IN 4 files / 1,992 lines | DO 3 behaviour(s)
- model: deepseek-v4-pro | turns: 40 | wall: 7m15s
- tokens: output 31,511 | fresh input 50,876 | cache read 2,074,368 | cost $0.0571
- tool calls: read x39, bash x10, edit x7, grep x3, skill x1, glob x1
- largest tool results: read backend\tests\test_docs_contract.py (~3,988 tok); read backend\tests\test_docs_contract.py (~2,314 tok); read docs\areas\loom.md (~1,959 tok)
- duplicate reads: docs/plans/active/docs-restructure/05-area-queue-and-ownership-checks.md x2, scripts/check_docs.py x13, backend/tests/test_docs_contract.py x3, backend/app/main.py x2, frontend/src/router.tsx x2, docs/areas/loom.md x2, docs/areas/dungeons.md x2, docs/areas/player-app.md x2, docs/areas/monsters.md x2
- reads outside START IN: docs/areas, docs/areas/documentation.md, docs/areas/dungeons.md, docs/areas/encounters.md, docs/areas/loom.md, docs/areas/loot.md, docs/areas/monsters.md, docs/areas/player-app.md, docs/areas/players.md, docs/areas/reference-catalogs.md, docs/areas/repo-infra.md, docs/areas/spells.md, docs/areas/visual-design.md
- deviations (executor): opened beyond START IN: none | KNOWN STATE re-verified or wrong: none
- compiler note: Standard completed first pass, but the order omitted representative area guides from START IN even though the new parser depended on their real declaration shapes; that compiler fault caused reads across all twelve guides. Repeated reads of scripts/check_docs.py and the contract test accompanied two corrective attempts; Pro was sufficient, but future validator orders must name the concrete documents whose syntax they parse.
- source: opencode session ses_064e66aecffe5C6Q5PRTYjfnVZ

## 2026-07-25 22:17 — 06-reference-area.md
- status: DONE
- first pass: yes
- order shape (compiled): START IN 4 files / 159 lines | DO 2 behaviour(s)
- model: deepseek-v4-flash | turns: 17 | wall: 2m29s
- tokens: output 15,175 | fresh input 38,010 | cache read 564,864 | cost $0.0112
- tool calls: read x13, glob x7, bash x4, edit x4, write x2, skill x1
- largest tool results: read backend\tests\test_docs_contract.py (~8,765 tok); read docs\README.md (~5,230 tok); read docs\areas\dungeons.md (~2,384 tok)
- duplicate reads: docs/plans/active/docs-restructure/06-reference-area.md x2, docs/areas/players.md x3
- reads outside START IN: backend/tests/test_docs_contract.py, docs/README.md, docs/areas, docs/areas/dungeons.md, docs/areas/monsters.md
- deviations (executor): opened beyond START IN: docs/areas/monsters.md, docs/areas/dungeons.md, backend/tests/test_docs_contract.py, docs/README.md | KNOWN STATE re-verified or wrong: none
- compiler note: Flash completed first pass, but the order's consolidation scope omitted the neighboring guide context needed to preserve cross-area links and verify the new contract, causing reads of Monsters, Dungeons, the contract test, and README. Those deviations were in-scope diagnosis of an under-specified documentation merge; future merge orders should include every cross-reference destination they require.
- source: opencode session ses_064def7dbffezoHL8Z5KsSE9Y0

## 2026-07-25 22:17 — 07-encounters-area.md
- status: DONE
- first pass: yes
- order shape (compiled): START IN 3 files / 53 lines | DO 2 behaviour(s)
- model: deepseek-v4-flash | turns: 24 | wall: 3m04s
- tokens: output 17,916 | fresh input 37,685 | cache read 837,120 | cost $0.0126
- tool calls: read x18, grep x7, glob x5, bash x4, write x2, skill x1, edit x1
- largest tool results: read backend\tests\test_docs_contract.py (~8,765 tok); read docs\plans\active\docs-restructure\docs-restructure.md (~1,905 tok); skill (~1,651 tok)
- duplicate reads: docs/plans/active/docs-restructure/07-encounters-area.md x2, docs/areas/encounters.md x2, docs/plans/active/docs-restructure/06-reference-area.md x2, scripts/check_docs.py x3
- reads outside START IN: backend/tests/test_docs_contract.py, docs/areas, docs/areas/encounters.words.md, scripts/check_docs.py
- deviations (executor): opened beyond START IN: backend/tests/test_docs_contract.py, scripts/check_docs.py, docs/plans/active/docs-restructure/05-area-queue-and-ownership-checks.md, docs/plans/active/docs-restructure/06-reference-area.md, docs/plans/active/docs-restructure/09-retained-area-glossaries.md, docs/plans/active/docs-restructure/docs-restructure.md | KNOWN STATE re-verified or wrong: verified order 05 was DONE to confirm checker supports Plan queue format, companion glossaries, and duplicate-route validation — all accurate
- compiler note: Flash completed first pass, but the compiler incorrectly ran orders 06 and 07 concurrently even though both consume Reference Catalogs; the executor read sibling orders and the Plan to resolve that shared-input race. The overreach was understandable but real, and future orders sharing a source document must carry an explicit dependency.
- source: opencode session ses_064def796ffe0Ad6wY3AHymXhb

## 2026-07-25 22:17 — 08-players-area.md
- status: DONE
- first pass: yes
- order shape (compiled): START IN 2 files / 159 lines | DO 2 behaviour(s)
- model: deepseek-v4-flash | turns: 7 | wall: 1m02s
- tokens: output 7,104 | fresh input 13,362 | cache read 94,976 | cost $0.0041
- tool calls: read x3, bash x2, skill x1, write x1, edit x1
- largest tool results: read docs\areas\player-app.md (~1,657 tok); skill (~1,651 tok); read docs\areas\players.md (~788 tok)
- duplicate reads: none
- reads outside START IN: none
- deviations (executor): opened beyond START IN: none | KNOWN STATE re-verified or wrong: none
- compiler note: Flash initially passed the targeted test with no exploration beyond START IN, but omitted the goal-required companion glossary because the STOP WHEN did not assert its existence. The mandatory downstream lint exposed the missing path; resuming the same Flash session completed it without a cold start, so future structural-doc orders need a stop-check that directly asserts every created/deleted artifact.
- source: opencode session ses_064def74bffewF5Yl6Hq49HTvm

## 2026-07-25 22:17 — 09-retained-area-glossaries.md
- status: DONE
- first pass: yes
- order shape (compiled): START IN 4 files / 112 lines | DO 2 behaviour(s)
- model: deepseek-v4-flash | turns: 12 | wall: 2m09s
- tokens: output 16,237 | fresh input 29,617 | cache read 365,312 | cost $0.0097
- tool calls: read x9, write x8, bash x3, skill x1, edit x1
- largest tool results: read backend\tests\test_docs_contract.py (~8,765 tok); read docs\areas\loom.md (~2,755 tok); read docs\areas\dungeons.md (~2,384 tok)
- duplicate reads: docs/plans/active/docs-restructure/09-retained-area-glossaries.md x2, docs/areas x2
- reads outside START IN: backend/tests/test_docs_contract.py, docs/areas
- deviations (executor): opened beyond START IN: `backend/tests/test_docs_contract.py` (read to understand the area-guide contract format the test validates) and `docs/areas/` (directory listing to confirm naming conventions) | KNOWN STATE re-verified or wrong: none
- compiler note: Flash completed first pass; it opened the contract test and listed the area directory because the order named the queue syntax and rename targets without providing a concrete post-order fixture. The reads were useful but outside the leash; future structural doc orders should include the validating fixture or state its exact accepted shape.
- source: opencode session ses_064def736ffe3ZQlnha5ITKWqc

## 2026-07-25 22:21 — 10-active-plan-area-links.md
- status: DONE
- first pass: yes
- order shape (compiled): START IN 5 files / 571 lines | DO 1 behaviour(s)
- model: deepseek-v4-flash | turns: 7 | wall: 0m59s
- tokens: output 6,805 | fresh input 22,306 | cache read 126,720 | cost $0.0054
- tool calls: edit x7, read x6, skill x1, glob x1, bash x1
- largest tool results: read docs\plans\active\player-app-skeleton\player-app-skeleton.md (~3,829 tok); read docs\plans\active\production-nightly-deploys\production-nightly-dep... (~2,313 tok); read docs\plans\active\docs-restructure\docs-restructure.md (~1,905 tok)
- duplicate reads: none
- reads outside START IN: none
- deviations (executor): opened beyond START IN: docs/areas/*.md (globbed to resolve area guide file names; no source/test/doc content read) | KNOWN STATE re-verified or wrong: none
- compiler note: Flash completed the five narrow Plan-link edits first pass with no content reads outside START IN. It globbed the area directory to re-verify filenames already given by KNOWN STATE; that was unnecessary but low-cost, and Light was sufficient.
- source: opencode session ses_064d99cb3ffehwmfZSgcbwFayM

## 2026-07-25 22:24 — 11-routing-cutover.md
- status: DONE
- first pass: yes
- order shape (compiled): START IN 3 files / 209 lines | DO 3 behaviour(s)
- model: deepseek-v4-flash | turns: 15 | wall: 2m55s
- tokens: output 20,918 | fresh input 24,754 | cache read 451,712 | cost $0.0106
- tool calls: edit x16, read x9, bash x3, skill x1
- largest tool results: read docs\README.md (~5,230 tok); read docs\README.md (~2,981 tok); read CLAUDE.md (~1,998 tok)
- duplicate reads: docs/plans/active/docs-restructure/11-routing-cutover.md x2, docs/README.md x3, CLAUDE.md x3
- reads outside START IN: none
- deviations (executor): opened beyond START IN: none | KNOWN STATE re-verified or wrong: none
- compiler note: Flash completed the final routing cutover first pass with no reads beyond START IN and no facts re-derived. The three-file bounded cleanup held and Light was sufficient; the real-tree documentation checker remains intentionally deferred to reconcile after deletion of spent orders.
- source: opencode session ses_064d8519cffe7UAisyYxo33FYI

## 2026-07-25 22:31 — docs-restructure stage 2 (reconcile)
- stage checks: pytest: 511 passed, coverage 97.25%; npm run test:check -- --strict: 1342 tests, 11 known failures, pass; npm run lint: pass with pre-existing warnings; npm run build: pass; check_docs --check and --base HEAD: pass after reconciliation repairs
- escaped targeted checks: Order 08 omitted the required players.words.md artifact while its pytest-only STOP WHEN passed; first occurrence for a missing created artifact, repaired by resuming the executor before reconcile.
- escaped targeted checks: Orders 06-11 left stale old-guide links, manifest rows, and Players' old Active plan syntax while every targeted pytest run passed; first occurrence of this routing-cutover escape, repaired at reconcile from check_docs output.
- escaped targeted checks: Order 11 deleted docs/areas/documentation.md while retaining it in START IN, so check_orders failed inside check_docs; repeat of the Stage 1 move/delete self-invalidation class, repaired by naming the surviving post-move destination.
- reconcile note: Structural documentation orders must include a stop-check that asserts required created/deleted artifacts and runs the real documentation checker against the resulting tree. The repeated move/delete self-invalidation now warrants template or linter support for post-move START IN paths rather than another compiler note.

## 2026-07-25 22:46 — 12-product-change-maps.md
- status: DONE
- first pass: yes
- order shape (compiled): START IN 3 files / 194 lines | DO 2 behaviour(s)
- model: deepseek-v4-flash | turns: 10 | wall: 1m53s
- tokens: output 10,258 | fresh input 15,109 | cache read 175,616 | cost $0.0055
- tool calls: read x6, edit x4, skill x1, bash x1
- largest tool results: skill (~1,651 tok); read docs\areas\dungeons.md (~951 tok); read docs\plans\active\docs-restructure\12-product-change-maps.md (~746 tok)
- duplicate reads: docs/plans/active/docs-restructure/12-product-change-maps.md x3
- reads outside START IN: none
- deviations (executor): opened beyond START IN: none | KNOWN STATE re-verified or wrong: none
- compiler note: Light completed the three-guide table authoring first pass and the structural assertion plus documentation checker passed. The executor reported no need to leave the bounded guide sections, so the explicit ownership and intent cuts were sufficient.
- source: opencode session ses_064c37026ffefzg1C9xnOcCRy3

## 2026-07-25 22:46 — 13-player-and-loom-change-maps.md
- status: DONE
- first pass: yes
- order shape (compiled): START IN 2 files / 186 lines | DO 2 behaviour(s)
- model: deepseek-v4-flash | turns: 9 | wall: 1m51s
- tokens: output 11,045 | fresh input 17,448 | cache read 165,120 | cost $0.0060
- tool calls: read x8, edit x4, skill x1, bash x1
- largest tool results: read docs\areas\loom.md (~2,023 tok); skill (~1,651 tok); read docs\areas\players.md (~1,524 tok)
- duplicate reads: docs/plans/active/docs-restructure/13-player-and-loom-change-maps.md x2, docs/areas/players.md x3, docs/areas/loom.md x3
- reads outside START IN: none
- deviations (executor): opened beyond START IN: none | KNOWN STATE re-verified or wrong: none
- compiler note: Light completed both guide tables first pass and passed the structural assertion plus documentation checker. The DM/kid and Loom intent cuts were concrete enough for the executor to finish without a corrective dispatch.
- source: opencode session ses_064c36fecffeAiFgTOGdIKEyoH

## 2026-07-25 22:46 — 14-shared-change-maps.md
- status: DONE
- first pass: yes
- order shape (compiled): START IN 2 files / 124 lines | DO 2 behaviour(s)
- model: deepseek-v4-flash | turns: 7 | wall: 1m23s
- tokens: output 7,766 | fresh input 14,244 | cache read 94,208 | cost $0.0044
- tool calls: read x6, edit x3, skill x1, bash x1
- largest tool results: skill (~1,651 tok); read docs\areas\infra.md (~803 tok); read docs\plans\active\docs-restructure\14-shared-change-maps.md (~738 tok)
- duplicate reads: docs/plans/active/docs-restructure/14-shared-change-maps.md x2, docs/areas/design.md x2, docs/areas/infra.md x2
- reads outside START IN: none
- deviations (executor): opened beyond START IN: none | KNOWN STATE re-verified or wrong: none
- compiler note: Light completed the two shared-area tables first pass and passed the structural assertion plus documentation checker. The explicit ownership list prevented broad source-tree exploration; the executor reported the requested categories were covered.
- source: opencode session ses_064c36fc9ffeD16THbg8haQhJC

## 2026-07-25 23:01 — 15-enforce-change-map-coverage.md
- status: DONE
- first pass: yes
- order shape (compiled): START IN 6 files / 2,515 lines | DO 2 behaviour(s)
- model: deepseek-v4-pro | turns: 78 | wall: 13m22s
- tokens: output 52,902 | fresh input 65,727 | cache read 5,622,784 | cost $0.0950
- tool calls: read x38, edit x35, bash x21, grep x4, skill x1
- largest tool results: bash .venv\Scripts\python.exe -m pytest backend/tests/test_docs_contract... (~12,825 tok); read scripts\check_docs.py (~3,466 tok); read backend\tests\test_docs_contract.py (~2,534 tok)
- duplicate reads: docs/plans/active/docs-restructure/15-enforce-change-map-coverage.md x3, scripts/check_docs.py x14, backend/tests/test_docs_contract.py x11, docs/areas/players.md x2, docs/areas/infra.md x3
- reads outside START IN: docs/areas/design.md, docs/areas/encounters.md, docs/areas/loom.md
- deviations (executor): opened beyond START IN: docs/areas/encounters.md (change map table), docs/areas/design.md (change map table), docs/areas/loom.md (change map table) — fixed cross-guide duplicates and added coverage entries; also checked feature directories on disk | KNOWN STATE re-verified or wrong: area guide change maps needed substantial updates to achieve full coverage; baseline test count 53 increased to 60 with new tests and fixed pre-existing test guides
- compiler note: Standard completed first pass with 60 targeted tests and the real documentation checker green. The executor edited all seven guide tables to satisfy full-tree coverage even though DO named only the checker and test; this was an in-scope response to order 15's atomic coverage goal, but it exposes a compiler fault: the final enforcement order should have listed every guide as an edit site or the earlier table orders should have been prevalidated against the exact coverage universe.
- source: opencode session ses_064c15ac7ffeK8TLEpGEgtRX3t

## 2026-07-25 23:06 — docs-restructure stage 3 (reconcile)
- stage checks: pytest: 518 passed, coverage 97.25%; npm run test:check -- --strict: 1342 tests, 11 known failures, pass; npm run lint: pass with pre-existing warnings; npm run build: pass; check_docs --check and --base HEAD: pass
- escaped targeted checks: none — every defect was caught by an order's own STOP WHEN
- reconcile note: Nothing escaped the targeted checks at reconcile. The final checker order itself exposed and repaired guide-coverage overlaps before reporting DONE; future compilation should pre-expand proposed globs against the exact implementation universe so the documentation orders land checker-ready and the enforcement order does not need to edit their files.

## 2026-07-25 23:24 — 16-plan-touch-overlap-contract.md
- status: CANCELLED - manually stopped after the executor looped on the targeted tests without writing STATUS
- first pass: yes
- order shape (compiled): START IN 3 files / 2,797 lines | DO 3 behaviour(s)
- transport: manual (chat UI — no parseable local record)
- model: opencode-go/deepseek-v4-pro
- reported: no usage figures available for this cancelled child session
- deviations (executor): not recorded
- compiler note: The user manually cancelled the first Standard run after observing repeated targeted-test reruns. Later diagnosis found the fixture helper created touched files under the temporary docs directory rather than the temporary repository root, while the assertion hid the actionable CheckError; the partial implementation also drifted from Markdown dependency links to backtick feature names. The missing child id left this first run's usage figures unavailable.
- missing (not measurable in this transport): tokens, tool calls, turns, largest tool results, duplicate reads, reads outside START IN

## 2026-07-25 23:27 — 16-plan-touch-overlap-contract.md
- status: CANCELLED - manually stopped after repeated test reruns, no STATUS written
- first pass: no
- order shape (compiled): START IN 3 files / 2,797 lines | DO 3 behaviour(s)
- model: deepseek-v4-pro | turns: 3 | wall: 0m17s
- tokens: output 966 | fresh input 10,802 | cache read 8,064 | cost $0.0056
- tool calls: read x13, skill x1
- largest tool results: skill (~1,651 tok); read scripts\check_docs.py (~1,385 tok); read docs\plans\active\docs-restructure\16-plan-touch-overlap-contract.md (~952 tok)
- duplicate reads: scripts/check_docs.py x7, backend/tests/test_docs_contract.py x2, docs/PLAN_TEMPLATE.md x2
- reads outside START IN: none
- deviations (executor): not recorded
- compiler note: The executor was manually cancelled after looping on the same targeted suite. Diagnosis found an order-induced test seam omission: _setup_active_plan used parent.parent.parent, creating fixture files under tmp/docs while the checker expanded globs from tmp; the assertion hid the CheckError, and the executor reran instead of exposing it. The partial implementation also replaced the specified Markdown dependency link with a backtick feature name, so the corrected reissue must preserve the existing worktree, fix the helper root to parent.parents[2], and restore link resolution.
- source: opencode session ses_0649ea3faffev4VvkQLs8wgk9V

## 2026-07-25 23:31 — 16-plan-touch-overlap-contract.md
- status: DONE
- first pass: no
- order shape (compiled): START IN 3 files / 2,823 lines | DO 3 behaviour(s)
- model: deepseek-v4-pro | turns: 21 | wall: 2m58s
- tokens: output 12,792 | fresh input 22,336 | cache read 534,272 | cost $0.0228
- tool calls: read x11, edit x10, bash x5, grep x2, skill x1
- largest tool results: read backend\tests\test_docs_contract.py (~2,416 tok); read scripts\check_docs.py (~1,687 tok); skill (~1,651 tok)
- duplicate reads: scripts/check_docs.py x5, docs/PLAN_TEMPLATE.md x4
- reads outside START IN: none
- deviations (executor): opened beyond START IN: none | KNOWN STATE re-verified or wrong: none
- compiler note: The diagnosed Standard reissue completed cleanly with no reads outside START IN and no KNOWN STATE re-verification. Naming the exact failing node, wrong temporary-root expression, settled replacement, and dependency-link drift prevented the prior blind test loop; Standard was sufficient once the order carried the root cause.
- source: opencode session ses_0649b1b3effemgiTI7snnCkU2M

## 2026-07-25 23:34 — 17-backfill-plan-touches.md
- status: DONE
- first pass: yes
- order shape (compiled): START IN 5 files / 607 lines | DO 2 behaviour(s)
- model: deepseek-v4-flash | turns: 12 | wall: 2m07s
- tokens: output 13,086 | fresh input 29,812 | cache read 326,144 | cost $0.0088
- tool calls: edit x10, read x9, grep x5, bash x2, skill x1
- largest tool results: read docs\PLAN_TEMPLATE.md (~3,936 tok); read docs\plans\active\player-app-skeleton\player-app-skeleton.md (~3,827 tok); read docs\plans\active\production-nightly-deploys\production-nightly-dep... (~2,329 tok)
- duplicate reads: docs/plans/active/docs-restructure/17-backfill-plan-touches.md x2
- reads outside START IN: docs/PLAN_TEMPLATE.md
- deviations (executor): opened beyond START IN: docs/PLAN_TEMPLATE.md, docs/plans/active/docs-restructure/16-plan-touch-overlap-contract.md (pre-existing broken links blocked STOP WHEN; fixed placeholder local links to self-anchors) | KNOWN STATE re-verified or wrong: none
- compiler note: Light completed the five-Plan backfill and real documentation checker in one corrective attempt. The two reads/edits outside START IN were an in-scope response to Order 16 leaving placeholder Markdown links that the real checker rejected; this exposes a compiler fault in Order 16's pytest-only STOP WHEN, which did not validate the template prose it changed.
- source: opencode session ses_0649816a7ffehqcujtDMvQx4Zu

## 2026-07-25 23:39 — 18-reject-inactive-plan-dependencies.md
- status: DONE
- first pass: yes
- order shape (compiled): START IN 2 files / 2,595 lines | DO 2 behaviour(s)
- model: deepseek-v4-flash | turns: 14 | wall: 1m27s
- tokens: output 7,894 | fresh input 19,227 | cache read 262,144 | cost $0.0056
- tool calls: read x10, edit x3, grep x2, skill x1, bash x1
- largest tool results: read backend\tests\test_docs_contract.py (~2,341 tok); skill (~1,651 tok); read backend\tests\test_docs_contract.py (~1,130 tok)
- duplicate reads: docs/plans/active/docs-restructure/18-reject-inactive-plan-dependencies.md x2, scripts/check_docs.py x4, backend/tests/test_docs_contract.py x4
- reads outside START IN: none
- deviations (executor): opened beyond START IN: backend/tests/test_docs_contract.py (lines 1-31, 404) for imports, `cd` fixture, and `_write_docs_tree` helper needed to write the new test; scripts/check_docs.py (lines 285-297) `_local_link_target` to verify the resolution chain | KNOWN STATE re-verified or wrong: none
- compiler note: Light completed the reconcile-found contract correction first pass with no reads outside START IN and no KNOWN STATE re-verification. The exact silent ValueError path and existing downstream validation made this a bounded two-file repair; the missing archived-target fixture belonged in Order 16's original test matrix.
- source: opencode session ses_06492438cffeOG08DYtdJ9vgej

## 2026-07-25 23:42 — docs-restructure stage 4 (reconcile)
- stage checks: pytest: 529 passed, 97.25% coverage; npm run test:check -- --strict: 1342 tests, 11 known failures, pass; npm run lint: pass with existing warnings; npm run build: pass; check_docs --check and --base HEAD: pass
- escaped targeted checks: Order 16 silently accepted dependency links outside docs/plans/active because its parser discarded the resolved target; the original 70-test STOP WHEN omitted an archived-target fixture. First occurrence; caught during reconcile skim and repaired by Order 18.
- reconcile note: Validator orders must enumerate every rejected target class stated in KNOWN STATE, not collapse missing and archived links into one generic dependency test. Any order editing PLAN_TEMPLATE.md should also include the real documentation checker in STOP WHEN so placeholder links cannot escape into a dependent order.

## 2026-07-26 — docs-restructure stage 5 compiler-process note
- compiler note: The Stage 5 compilation context ballooned before dispatch because the compiler read broad chunks of the telemetry log, `scripts/check_docs.py`, `backend/tests/test_docs_contract.py`, `docs/README.md`, `docs/PLAN_TEMPLATE.md`, `CLAUDE.md`, and the Plan. The workflow required the recent telemetry and real checker/test contracts, but the expensive part was reading large files by range before first locating exact symbols. Future documentation-tooling compilers should grep for target symbols first, then read only narrow ranges; keep settled future-created paths in KNOWN STATE, not START IN, until the file exists.

## 2026-07-26 00:09 — 19-archive-index-contract.md
- status: DONE
- first pass: yes
- order shape (compiled): START IN 3 files / 2,771 lines | DO 3 behaviour(s)
- model: deepseek-v4-flash | turns: 21 | wall: 3m42s
- tokens: output 15,337 | fresh input 20,359 | cache read 514,432 | cost $0.0086
- tool calls: read x17, edit x6, bash x3, grep x2, skill x1, write x1
- largest tool results: skill (~1,651 tok); bash cd F:\DND\Kids Resources; .venv\Scripts\python.exe -c " import sys,... (~1,187 tok); read scripts\check_docs.py (~744 tok)
- duplicate reads: docs/plans/active/docs-restructure/19-archive-index-contract.md x2, scripts/check_docs.py x6, backend/tests/test_docs_contract.py x6
- reads outside START IN: docs/plans/done, docs/plans/done/INDEX.md
- deviations (executor): opened beyond START IN: none | KNOWN STATE re-verified or wrong: none
- compiler note: Clean Light run: bounded START IN appears to have held, with no reported deviations and the focused pytest plus checker stop condition passing. Light was sufficient for the generated-section pattern because the order named the exact checker/test anchors and artifact contract.
- source: opencode session ses_064794bffffeToEjDPrJMGmtPD

## 2026-07-26 00:12 — 20-reader-router-and-inventory.md
- status: DONE
- first pass: yes
- order shape (compiled): START IN 3 files / 246 lines | DO 3 behaviour(s)
- model: deepseek-v4-flash | turns: 7 | wall: 2m56s
- tokens: output 26,787 | fresh input 18,328 | cache read 192,384 | cost $0.0106
- tool calls: read x5, edit x3, write x2, skill x1, bash x1
- largest tool results: read docs\README.md (~5,021 tok); read CLAUDE.md (~1,993 tok); skill (~1,651 tok)
- duplicate reads: docs/plans/active/docs-restructure/20-reader-router-and-inventory.md x2
- reads outside START IN: none
- deviations (executor): opened beyond START IN: none | KNOWN STATE re-verified or wrong: none
- compiler note: Clean Light run: the order's explicit section ranges and target inventory path kept the documentation split bounded, and the checker passed. Light was sufficient; duplicate/background reads, if any, come from validating link/checker behavior rather than unclear scope.
- source: opencode session ses_064759deaffe1MVAbEcMatVfnr

## 2026-07-26 00:16 — 21-inventory-manifest-checks.md
- status: DONE
- first pass: yes
- order shape (compiled): START IN 3 files / 2,791 lines | DO 2 behaviour(s)
- model: deepseek-v4-flash | turns: 29 | wall: 3m21s
- tokens: output 21,301 | fresh input 26,872 | cache read 930,944 | cost $0.0123
- tool calls: read x19, grep x9, edit x9, bash x6, skill x1
- largest tool results: read docs\INVENTORY.md (~3,557 tok); skill (~1,651 tok); read docs\README.md (~1,328 tok)
- duplicate reads: docs/plans/active/docs-restructure/21-inventory-manifest-checks.md x3, scripts/check_docs.py x9, backend/tests/test_docs_contract.py x5
- reads outside START IN: docs/INVENTORY.md
- deviations (executor): opened beyond START IN: docs/INVENTORY.md (needed to understand inventory table format), docs/areas/ (via directory listing to confirm area guide names) | KNOWN STATE re-verified or wrong: none
- compiler note: Clean Light run: the order correctly named the checker function, fixture helpers, and post-split router surface, so the executor updated the inventory-home contract without wandering. Light was sufficient for this bounded checker/test adjustment; reported verification covered both focused pytest and the full docs checker.
- source: opencode session ses_064729d2affeeOZ2I7FyZUs6Ez

## 2026-07-26 00:18 — 22-canonical-prose-sweep.md
- status: DONE
- first pass: yes
- order shape (compiled): START IN 4 files / 298 lines | DO 2 behaviour(s)
- model: deepseek-v4-flash | turns: 10 | wall: 1m53s
- tokens: output 13,351 | fresh input 19,449 | cache read 220,160 | cost $0.0071
- tool calls: read x10, edit x8, skill x1, bash x1
- largest tool results: read docs\areas\players.md (~1,735 tok); skill (~1,651 tok); read docs\README.md (~1,328 tok)
- duplicate reads: docs/plans/active/docs-restructure/22-canonical-prose-sweep.md x3, docs/README.md x2, docs/areas/infra.md x2, docs/areas/reference.md x2
- reads outside START IN: none
- deviations (executor): opened beyond START IN: none | KNOWN STATE re-verified or wrong: none
- compiler note: Clean Light run: the prose sweep was bounded to four canonical files and the specific matches named in KNOWN STATE, so no stronger model was needed. The declared no-op on docs/areas/players.md was in scope because the order explicitly allowed keeping only concrete deferred work there.
- source: opencode session ses_0646f4913ffezh51DxXMe0x7OX

## 2026-07-26 00:21 — docs-restructure stage 5 (reconcile)
- stage checks: pytest: 531 passed; npm run test:check -- --strict: PASS, 1342 tests with 10 known failures and no new failures; npm run lint: PASS with existing warnings; npm run build: PASS with existing Vite chunk-size warning
- escaped targeted checks: none — every defect was caught by an order's own STOP WHEN
- reconcile note: Clean stage-level reconcile: no defects escaped the targeted STOP WHEN commands. The Stage 5 orders correctly included check_docs in structural documentation changes, so no to-orders template change is needed from this stage.
