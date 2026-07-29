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

> **Collection is paused.** See [telemetry-paused.md](telemetry-paused.md). Everything below is the record up to the pause; recording resumes with `scripts/order_telemetry.py --resume`.

## Scoreboard — current cycle

- order runs: 0 across 0 unique order(s); DONE on one run 0 of 0, re-dispatched orders 0 (0 extra run(s))
- stages reconciled: 0 | escaped targeted checks: 0
- fault attribution: none recorded
- spend: executor $0.00 | planner not recorded
- orders dispatched with an unbounded large file in START IN: 0 of 0 measured
- escalated above Light: 0 of 0 measured

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

## Closed cycle — 2026-07-27 18:52 — kid-map-legibility stages 1-3 and kid-map-viewer stages 1-6

Twenty-five runs across 24 orders, 23 of 24 DONE on the first pass, at $0.63 executor spend across nine reconciled stages; Light was the required strength for every one of them and nothing escalated, so model strength was never the variable this cycle. The finding that dominates everything else is that the read guard - recorded as 'enforced' at the last cycle close - was a complete no-op under opencode for the entire cycle. Its plugin read the arguments object off the wrong hook parameter, so every post event arrived empty, no session ever armed, and no edited file was ever locked. The measurement is unambiguous: 49 post-edit re-reads, all 49 in the 22 opencode runs and 0 in the 2 Claude-harness runs, alongside 45 locating re-reads and 29 reads outside START IN. An 'enforced' lesson that only binds one of two transports is a lesson that silently stopped applying, which is the same failure mode the guard's own test file warned about in prose while testing only the payload it built itself. Three defects escaped targeted checks across the nine reconciles, two of them one fault seen twice: an order that reshaped an exported player layout type without declaring it, whose STOP WHEN then tested one suite while three others broke, and a shared-canvas migration that dropped an accessibility landmark asserted only by a neighbouring route-shell suite. The cycle's single cancelled run was an order-shape fault with a mechanical fix - a repo-relative vitest filter that matched no test file, so the check judged an empty run - and two further undispatched orders already carried the same fault.

- order runs: 25 across 24 unique order(s); DONE on one run 21 of 24 (87%), re-dispatched orders 1 (1 extra run(s))
- stages reconciled: 9 | escaped targeted checks: 2
- fault attribution: executor 5, none 15, order 5
- spend: executor $0.63 | planner $0.03 over 3 stage(s)
- orders dispatched with an unbounded large file in START IN: 0 of 25 measured
- escalated above Light: 0 of 25 measured

Lessons, and where each one now lives:

- **enforced** (.opencode/plugin/read-guard.js) — the post hook forwarded output.args, which is empty there; args live on input.args after a tool runs and on output.args before it. The guard never armed and never locked under opencode, which is where 49 of 49 post-edit re-reads occurred. backend/tests/test_read_guard.py now asserts the plugin's transport wiring, not only the rule, because payload-level tests build the payload themselves and cannot see a transport that never fills it.
- **enforced** (scripts/read_guard.py) — arming also accepts a tool named after the arming skill, not only a skill tool carrying its name, so a harness that exposes skills as tools is bound identically.
- **enforced** (scripts/check_orders.py) — a vitest filter in STOP WHEN must be frontend-relative; order_check.py runs vitest from frontend/, so a repo-relative filter matches nothing and the check reports on an empty run. This cancelled one executor run and was already sitting undispatched in two more orders; --fix strips the prefix, and the rule reads only the --tests arguments so the repo-relative CREATES assertion beside it stays correct.
- **enforced** (scripts/order_check.py) — the wrapper resolves its test filters before running anything and fails naming the missing path, rather than handing an empty run to the runner.
- **enforced** (scripts/check_orders.py) — a type is a signature. DO that reshapes an exported type or interface must declare it in CHANGES SIGNATURE, which is what drags every consumer into START IN and the module's own suite into STOP WHEN. An undeclared exported layout type broke three player suites past a STOP WHEN scoped to one.
- **enforced** (.claude/skills/to-orders/SKILL.md) — replacing a renderer or wrapper must name the accessibility landmarks the replaced component published and run the neighbouring route-shell suite that asserts them; a shared-canvas migration dropped a map region landmark that only the full suite caught.
- **judgement** — compiler notes contradicted their own measured lines in 11 entries this cycle, every one of them a note claiming fault: none over a run that measured outside reads or post-edit re-reads. The dispatch-orders rule requiring notes to reconcile with transcript metrics was added at the last cycle close and did not hold. The flag line makes the contradiction visible after the fact; nothing prevents it, and a fault field that is 60% 'none' against 49 measured post-edit re-reads is not a usable attribution.
- **judgement** — planner compile and dispatch cost went unrecorded in 8 of 9 reconciles for the fourth cycle running, so the log still cannot say whether dispatching beat the CLAUDE.md planner fast path. This is now the oldest open question in the log and it will not close by being noted again.

Raw entries for this cycle: [2026-07-27-kid-map-legibility-stages-1-3-and-kid-map-viewer-stages-1-6.md](telemetry-archive/2026-07-27-kid-map-legibility-stages-1-3-and-kid-map-viewer-stages-1-6.md)
