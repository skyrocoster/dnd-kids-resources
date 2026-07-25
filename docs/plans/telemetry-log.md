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
Entries before 2026-07-25 19:06 predate the field.


## 2026-07-25 18:27 — _example/99-difficulty-label.md
- status: not recorded
- transport: manual (opencode/ChatGPT — no Claude transcript)
- reported: seed entry — example order, illustrating the manual (opencode/ChatGPT) form
- deviations (executor): not recorded

## 2026-07-25 18:42 — maplab-ux-pass/01-tablet-navigation-drawer.md
- status: DONE
- transport: manual (opencode/ChatGPT — no Claude transcript)
- reported: spawned executor transcript unavailable; no usage figures available
- deviations (executor): opened beyond START IN: CLAUDE.md (required repository instruction); .agents/skills/implement-order/SKILL.md (required execution skill) | KNOWN STATE re-verified or wrong: none

## 2026-07-25 18:47 — maplab-ux-pass/02-responsive-inspector-sheet.md
- status: DONE
- transport: manual (opencode/ChatGPT — no Claude transcript)
- reported: spawned executor transcript unavailable; no usage figures available
- deviations (executor): opened beyond START IN: CLAUDE.md; frontend/src/features/dungeons/maplab/MapLabPage.css | KNOWN STATE re-verified or wrong: selection chain was re-read to extract its shared actions; no state was wrong

## 2026-07-25 18:49 — maplab-ux-pass/03-editor-touch-target-sweep.md
- status: DONE
- transport: manual (opencode/ChatGPT — no Claude transcript)
- reported: spawned executor transcript unavailable; no usage figures available
- deviations (executor): opened beyond START IN: CLAUDE.md; .agents/skills/implement-order/SKILL.md | KNOWN STATE re-verified or wrong: none

## 2026-07-25 18:52 — maplab-ux-pass/04-build-unused-test-binding.md
- status: DONE
- transport: manual (chat UI — no parseable local record)
- reported: spawned executor transcript unavailable; no usage figures available
- deviations (executor): opened beyond START IN: none | KNOWN STATE re-verified or wrong: none
- missing (not measurable in this transport): tokens, model, tool calls, turns, largest tool results, duplicate reads, reads outside START IN

## 2026-07-25 19:06 — maplab-ux-pass/01-npc-prop-kind.md
- status: DONE
- model: claude-haiku-4-5-20251001 | turns: 59 | wall: 2m21s
- tokens: output 9,941 | fresh input 144,181 | cache read 2,290,056
- tool calls: Edit x12, Read x9, Skill x1, Glob x1, Bash x1
- largest tool results: Read frontend\src\components\icons\index.ts (~4,340 tok); Read frontend\src\features\dungeons\maplab\fixtureTypes.ts (~1,642 tok); Read frontend\src\model\maplabModel.ts (~1,344 tok)
- duplicate reads: docs/plans/active/orders/maplab-ux-pass/01-npc-prop-kind.md x2
- reads outside START IN: frontend/src/components/icons/index.ts, frontend/src/features/dungeons/maplab/__tests__/FixturePropertiesForm.test.tsx, frontend/src/features/dungeons/maplab/__tests__/PropMarker.test.tsx
- deviations (executor): opened beyond START IN: none | KNOWN STATE re-verified or wrong: none
- compiler note: Clean run; Light/haiku was right and should stay the default for registry-shaped work. All three reads outside START IN were the order's fault, not wandering: it named `UserIcon` without saying it lives in `components/icons/index.ts` (a ~4.3k-token barrel read to find one export — name the symbol's file), and it told the executor to edit two test files that START IN never listed. Rule both ways: if DO says touch a file, START IN must list it. The "this mirrors `encounter` exactly, here are the five sites with line numbers" framing worked — zero KNOWN STATE corrections across a 6-file change.
- source: claude transcript agent-a34261ee9b819c789.jsonl

## 2026-07-25 19:07 — maplab-ux-pass/02-npc-picker-field.md
- status: DONE
- model: claude-haiku-4-5-20251001 | turns: 33 | wall: 1m20s
- tokens: output 5,035 | fresh input 78,490 | cache read 1,065,397
- tool calls: Edit x5, Read x4, Skill x1, Bash x1
- largest tool results: Read frontend\src\features\dungeons\maplab\FixturePropertiesForm.tsx (~4,070 tok); Read frontend\src\api\client.ts (~1,613 tok); Read frontend\src\features\dungeons\maplab\__tests__\FixturePropertiesFo... (~1,609 tok)
- duplicate reads: none
- reads outside START IN: none
- deviations (executor): opened beyond START IN: none | KNOWN STATE re-verified or wrong: none
- compiler note: The reference run for this batch — cheapest by every measure (33 turns, 5k output), no duplicate reads, nothing outside START IN, no deviations. What made it work: the order described the precedent component's *shape* in prose (state hook, effect, label/select, placeholder copy, the exact onChange coercion) instead of pointing at it, pre-answered the two facts most likely to be got wrong (NPCs have `name` not `title`; follow the encounter picker, not the loot picker), and named the test file's existing mocking idiom. One logical change, one precedent, every fact answered — copy this shape. Light/haiku was ample.
- source: claude transcript agent-aee770e9e3ca8119c.jsonl

## 2026-07-25 19:13 — maplab-ux-pass/03-derived-room-npcs.md
- status: DONE
- model: claude-haiku-4-5-20251001 | turns: 82 | wall: 7m36s
- tokens: output 19,631 | fresh input 212,883 | cache read 6,037,839
- tool calls: Edit x15, Bash x9, Read x8, Skill x1, Glob x1
- largest tool results: Read frontend\src\features\dungeons\maplab\__tests__\maplabModel.test.ts (~11,689 tok); Read frontend\src\features\dungeons\maplab\MapLabPage.tsx (~9,688 tok); Read frontend\src\model\maplabModel.ts (~8,455 tok)
- duplicate reads: docs/plans/active/orders/maplab-ux-pass/03-derived-room-npcs.md x2
- reads outside START IN: frontend/src/features/dungeons/maplab/__tests__/maplabModel.test.ts, frontend/src/model/__tests__/maplabModel.test.ts
- deviations (executor): opened beyond START IN: none | KNOWN STATE re-verified or wrong: none
- compiler note: 4x order 02's output for a comparable amount of code — the cost is in the three whole-file reads (test file ~11.7k, `MapLabPage.tsx` ~9.7k, `maplabModel.ts` ~8.5k), and it probed `model/__tests__/` before finding the real path because DO said "a unit test in `maplabModel.test.ts`" with no directory. Always give the full path; a bare filename is a search instruction. Deeper lesson: START IN entries that are 1000+ line files get read whole. `MapLabPage.tsx` was needed for a one-line prop pass at a known line — say "the `<RoomDetailsPanel>` render at line 873, nothing else in this file" and the same instruction costs ~200 tokens instead of 9.7k. Still fine on Light; it was verbose, not lost.
- source: claude transcript agent-ad462b67254c61d39.jsonl

## 2026-07-25 19:20 — maplab-ux-pass/04-room-rail-npc-hint.md
- status: DONE
- model: claude-haiku-4-5-20251001 | turns: 110 | wall: 6m06s
- tokens: output 28,711 | fresh input 165,859 | cache read 5,546,826
- tool calls: Read x17, Edit x12, Grep x8, Bash x6, Skill x1, Glob x1
- largest tool results: Bash cd "F:\DND\Kids Resources\frontend" && npm test -- ViewerRoomRail R... (~2,510 tok); Read frontend\src\features\dungeons\maplab\maplabPresentation.ts (~2,174 tok); Read frontend\src\model\maplabModel.ts (~1,985 tok)
- duplicate reads: frontend/src/features/dungeons/maplab/__tests__/ViewerRoomRail.test.tsx x2, frontend/src/model/maplabModel.ts x5, frontend/src/features/dungeons/maplab/RoomDetailsPanel.tsx x2, frontend/src/features/dungeons/dungeonModel.ts x3
- reads outside START IN: frontend/src/features/dungeons/dungeonModel.ts, frontend/src/features/dungeons/maplab/RoomDetailsPanel.tsx, frontend/src/features/dungeons/maplab/__tests__/RoomDetailsPanel.test.tsx, frontend/src/features/dungeons/maplab/maplabPresentation.ts, frontend/src/model/maplabModel.ts
- deviations (executor): opened beyond START IN: frontend/src/model/maplabModel.ts (needed to add getNpcUnion shared function) | KNOWN STATE re-verified or wrong: none
- compiler note: Most expensive of the batch (110 turns, 28.7k output, `maplabModel.ts` read 5x, `dungeonModel.ts` 3x) and the cause is one line I wrote: "if order 03 left that union inline, lift it into a shared function". A conditional in KNOWN STATE is not a fact — it makes the executor go read a sibling order's output and take a design decision, which is exactly the exploration to-orders is supposed to have already paid for. Compile dependent orders knowing where shared code will live and state it flatly. The declared deviation (adding `getNpcUnion` to `maplabModel.ts`) is in scope — it is the branch the order described — so this is an order-authoring cost, not executor overreach. Light/haiku still landed it; do not escalate strength for this, fix the order. Same missing-scope issue as 03: START IN listed whole files for what were localised edits.
- source: claude transcript agent-ad35d6bfc91fc7bdf.jsonl

## 2026-07-25 19:30 — maplab-ux-pass/05-restore-model-layer-and-typecheck.md
- status: DONE
- model: claude-haiku-4-5-20251001 | turns: 56 | wall: 1m46s
- tokens: output 5,856 | fresh input 144,312 | cache read 2,127,171
- tool calls: Read x8, Edit x7, Bash x2, Skill x1
- largest tool results: Read frontend\src\model\maplabModel.ts (~8,985 tok); Read docs\plans\active\orders\maplab-ux-pass\05-restore-model-layer-and-... (~1,318 tok); Bash cd "F:\DND\Kids Resources\frontend" && npm test -- ViewerRoomRail R... (~507 tok)
- duplicate reads: frontend/src/features/dungeons/maplab/__tests__/FixturePropertiesForm.test.tsx x2, frontend/src/features/dungeons/maplab/__tests__/RoomDetailsPanel.test.tsx x2
- reads outside START IN: frontend/src/features/dungeons/maplab/__tests__/RoomDetailsPanel.test.tsx
- deviations (executor): opened beyond START IN: none | KNOWN STATE re-verified or wrong: none
- compiler note: Corrective order, cleaning up after my own compiling of 02 and 04. Cheap and clean (18 tool calls, no deviations) because both defects were fully diagnosed before dispatch: exact file+line, the exact wrong values, the repo's existing correct idiom, and a named fix. Two lessons for to-orders, both structural. (1) A conditional in KNOWN STATE ('if 03 left it inline, lift it into a shared function') produced the architecture violation — it made a cheap model invent a shared API with no stated home or dependency budget. State where shared code lives. (2) STOP WHEN using only 'npm test' is a false green: vitest does not typecheck, so an invented NPC fixture passed tests and broke 'tsc -b'. This is a REPEAT of a Stage 5 fixture/typecheck failure, so it is now a standing rule, not an observation: any order writing a test fixture for a domain-typed API object must carry the repo's minimal-plus-cast idiom in KNOWN STATE and end its STOP WHEN with 'npm run build'.
- source: claude transcript agent-a729d381d294d7d3f.jsonl

## 2026-07-25 19:35 — maplab-ux-pass stage 7 (reconcile)
- stage checks: pytest PASS (97.25% coverage, gate met) | npm run test 1311 passed / 11 failed — same 11 pre-existing failures as stage 6, verified name-for-name, no regressions | npm run build FAILED at reconcile, fixed by corrective order 05, now passes | check_docs PASS
- escaped targeted checks: Architecture violation: getNpcUnion put 'import type { DungeonRoom } from ../features/...' into frontend/src/model/maplabModel.ts, breaching the ARCHITECTURE.md rule that src/model/ imports nothing from features/. Traces to order 04, and specifically to a CONDITIONAL in its KNOWN STATE ('if order 03 left the union inline, lift it into a shared function') that made a cheap model invent a shared API with no stated home or dependency budget. Not a repeat. No targeted STOP WHEN could have caught it: vitest does not enforce layering, and nothing in the repo does — this rule is prose in ARCHITECTURE.md only.
- escaped targeted checks: Typecheck break: order 02's NPC test fixture invented scalar statblock fields (hp: 45, ac: 12, speed: 30) where the domain types are HitPoints/ArmorClass/MovementSpeed[], giving 10 TS2322 errors under 'tsc -b' while vitest passed. Traces to order 02's STOP WHEN being 'npm test -- FixturePropertiesForm' alone. THIS IS A REPEAT — stage 5 shipped a row reading 'Repaired Stage 5 test fixtures so the full production TypeScript build accepts the domain-typed door sides and layout history fixtures'. Twice now, so a per-order note is demonstrably not holding it.
- reconcile note: Both escapes are order-authoring faults, not executor faults; all five orders honestly passed the checks they were given. Two rules to promote into the to-orders template rather than leave as notes. (1) Any order that writes or edits a test fixture for a domain-typed API object must carry the repo's minimal-plus-cast idiom in KNOWN STATE and append 'npm run build' to its STOP WHEN — vitest is a false green for types, and this has now cost two stages. (2) Never put a conditional in KNOWN STATE. If dependent orders will share code, decide where it lives while compiling and state it flatly, including which layers it may import from; a cheap model asked to make an architecture decision will make a plausible wrong one. Corollary worth considering separately: the src/model/ import rule is enforced by nothing but prose, so it will be breached again — an ESLint no-restricted-imports rule would turn a reconcile-time discovery into a stop-check-time one.

## 2026-07-25 19:53 — maplab-ux-pass/01-viewer-view-popover.md
- status: DONE
- model: deepseek-v4-flash | turns: 26 | wall: 3m31s
- tokens: output 19,257 | fresh input 44,407 | cache read 902,656 | cost $0.0141
- tool calls: read x19, edit x11, grep x4, skill x1, bash x1
- largest tool results: bash cd frontend && npm test -- src/features/dungeons/maplab/__tests__/M... (~6,106 tok); read frontend\src\features\dungeons\maplab\__tests__\MapLabPage.test.tsx (~2,077 tok); read frontend\src\features\dungeons\maplab\MapLabPage.tsx (~1,703 tok)
- duplicate reads: docs/plans/active/orders/maplab-ux-pass/01-viewer-view-popover.md x2, frontend/src/features/dungeons/maplab/MapLabPage.tsx x6, frontend/src/features/dungeons/maplab/__tests__/MapLabPage.test.tsx x5, frontend/src/features/dungeons/maplab/MapLabEditorPage.tsx x4
- reads outside START IN: frontend/src/features/dungeons/maplab/MapLabEditor.css, frontend/src/features/dungeons/maplab/MapLabEditorPage.tsx
- deviations (executor): opened beyond START IN: F:\DND\Kids Resources\frontend\src\features\dungeons\maplab\MapLabEditorPage.tsx (editor precedent for the popover pattern) and MapLabEditor.css (for popover CSS reference) | KNOWN STATE re-verified or wrong: none — all named lines and patterns matched the codebase as stated
- compiler note: The executor opened MapLabEditorPage.tsx outside START IN because KNOWN STATE explicitly required its editor precedent; MapLabEditor.css was an executor-chosen CSS reference beyond the named files, but remained in scope. Light sufficed in about 10 turns, with no retries, and the focused stop-check reached exactly the three declared failures.
- source: opencode session ses_065631fd8ffeUxO1UQPtUs02t1

## 2026-07-25 19:59 — maplab-ux-pass/02-viewer-tablet-room-drawer.md
- status: DONE
- model: deepseek-v4-flash | turns: 30 | wall: 5m43s
- tokens: output 27,623 | fresh input 84,452 | cache read 1,734,528 | cost $0.0244
- tool calls: read x23, edit x11, grep x5, bash x2, skill x1
- largest tool results: bash npm test -- src/features/dungeons/maplab/__tests__/MapLabPage.test.tsx (~12,765 tok); bash npm test -- src/features/dungeons/maplab/__tests__/MapLabPage.test.tsx (~6,193 tok); read frontend\src\features\dungeons\maplab\MapLabPage.tsx (~2,661 tok)
- duplicate reads: docs/plans/active/orders/maplab-ux-pass/02-viewer-tablet-room-drawer.md x2, frontend/src/features/dungeons/maplab/MapLabPage.tsx x6, frontend/src/features/dungeons/maplab/MapLabPage.css x5, frontend/src/features/dungeons/maplab/__tests__/MapLabPage.test.tsx x7, frontend/src/features/dungeons/maplab/MapLabEditorPage.tsx x2
- reads outside START IN: frontend/src/features/dungeons/maplab/MapLabEditorPage.tsx
- deviations (executor): opened beyond START IN: MapLabEditorPage.tsx (referenced by KNOWN STATE drawer pattern), theme.css (verified --control-height value) | KNOWN STATE re-verified or wrong: none
- compiler note: KNOWN STATE explicitly pointed to MapLabEditorPage.tsx for the shipped drawer pattern, so that outside-START-IN read was order-induced; reading theme.css to re-verify the stated control-height value was unnecessary executor re-verification. Light still sufficed, with one focused test fix for the backdrop/button accessible name before the stop-check reached exactly the declared failures.
- source: opencode session ses_0655fa0ffffezh56wHi3BaL3KP

## 2026-07-25 20:09 — maplab-ux-pass/03-viewer-session-status-chip.md
- status: not recorded
- model: deepseek-v4-flash | turns: 40 | wall: 8m49s
- tokens: output 39,206 | fresh input 117,442 | cache read 2,320,768 | cost $0.0339
- tool calls: read x29, edit x19, grep x6, bash x3, skill x1, glob x1
- largest tool results: bash npm test -- src/features/dungeons/maplab/__tests__/MapLabPage.test.... (~12,770 tok); bash npm test -- src/features/dungeons/maplab/__tests__/MapLabPage.test.... (~10,307 tok); bash npm test -- src/features/dungeons/maplab/__tests__/MapLabPage.test.... (~10,307 tok)
- duplicate reads: frontend/src/features/dungeons/maplab/useMapLabSessionState.ts x2, frontend/src/features/dungeons/maplab/MapLabPage.tsx x11, frontend/src/features/dungeons/maplab/__tests__/MapLabPage.test.tsx x8, frontend/src/features/dungeons/maplab/MapLabEditor.css x2
- reads outside START IN: frontend/src/features/dungeons/maplab/MapCanvas.tsx, frontend/src/features/dungeons/maplab/MapLabEditor.css, frontend/src/features/dungeons/maplab/MapLabEditorPage.tsx, frontend/src/features/dungeons/maplab/maplabData.ts, frontend/src/model/maplabModel.ts
- deviations (executor): not recorded
- compiler note: The run was manually stopped before STATUS, DEVIATIONS, or STOP WHEN because Light lost closure after producing an in-scope partial hook/page/chip implementation and seven async tests. The order contributed by asking broadly for placement, persistence, clearing, and continued API behavior without naming minimal existing test seams; preserve the partial worktree, tighten the reissue around running and repairing the focused test file, and escalate to Standard.
- source: opencode session ses_0655a1ba7ffeZzkAqyOZojySip

## 2026-07-25 20:20 — maplab-ux-pass/03-viewer-session-status-chip.md
- status: not recorded
- model: gpt-5.6-sol | turns: 15 | wall: 30m13s
- tokens: output 3,296 | fresh input 57,284 | cache read 372,736
- tool calls: read x8, bash x7, task x4, skill x1, glob x1, apply_patch x1, todowrite x1
- largest tool results: bash git diff -- "frontend/src/features/dungeons/maplab/useMapLabSession... (~10,738 tok); read docs\README.md (~4,911 tok); skill (~2,038 tok)
- duplicate reads: docs/plans/active/orders/maplab-ux-pass/01-viewer-view-popover.md x2, docs/plans/active/orders/maplab-ux-pass/02-viewer-tablet-room-drawer.md x2, docs/plans/active/orders/maplab-ux-pass/03-viewer-session-status-chip.md x2
- reads outside START IN: CLAUDE.md, docs/README.md
- deviations (executor): not recorded
- compiler note: The Standard reissue was also manually stopped without STATUS or DEVIATIONS and did not close the existing partial work. Escalating model strength did not solve the structural problem: the reissue still handed a large integrated MapLabPage test file and an unknown failing async state to an executor instead of first diagnosing the exact failure; direct diagnosis is required before any further order could be self-contained.
- source: opencode session ses_065636a3fffeYPqCL2iGW6qhOu

### Correction and direct closeout

- The 20:20 entry above is not telemetry for the cancelled Standard child executor. The script's "newest match wins" lookup selected the dispatcher parent session (`ses_065636a3fffeYPqCL2iGW6qhOu`, model `gpt-5.6-sol`) because that session also contained the Order 03 path and fixed prompt. The cancelled `implement-order-deepseek-pro` run returned no task id or parseable child record, so its model tokens, turns, and tool costs are unavailable and must not be inferred from that entry.
- Direct reproduction found 5 failures: the same 3 declared pre-existing failures plus 2 new save-error tests. The production hook/page/chip implementation was already in scope and required no redesign; both new failures came from tests asserting a rejected PUT on the first transition while `useMapLabSessionState` could still consume that transition as its existing post-404 initial-load save suppression.
- The direct fix changed only those two async test paths: establish one transition, reject the next PUT, then assert or clear the persistent chip. The focused file finished at 98 passed / 3 failed, exactly the declared failure set.
- Why the order struggled: it asked for seven integrated async behaviors in a 1,700-line page test and named the broad initial-load/persistence behavior without stating the critical `skipNextSaveRef` test seam. The Light run spent 40 turns, read `MapLabPage.tsx` 11 times and its test 8 times, and ran the full focused file three times; the Standard reissue inherited an unknown failing state rather than a diagnosed failure. Strength was not the limiting factor. Future orders around this hook must state that save-error tests need one settled state transition before mocking the next PUT rejection, and should split hook error reporting from page chip placement instead of assigning both through the full page suite.
- Extra verification: `npm run build` did not reach application typechecking because `vite.config.ts:23` uses `poolOptions`, which the installed Vitest/Vite `InlineConfig` type rejects (`TS2769`). This file was outside the order and was not changed.

## 2026-07-25 20:31 — maplab-ux-pass stage 8 (reconcile)
- stage checks: pytest PASS: 482 passed, 97.25% coverage; npm run test: 1325 passed, 11 failed, 6 skipped, same 11 carried failures as Stage 7; npm run build PASS; check_docs PASS; check_docs --base main PASS
- escaped targeted checks: none — every defect was caught by an order's own STOP WHEN
- reconcile note: No defect escaped the targeted checks: the full frontend failures matched the carried Stage 7 list name-for-name, backend coverage passed, and production typechecking/build passed. The Stage 8 compiler should retain the explicit known-failure list, but future async session-state orders must name the initial-load suppression test seam and split hook error reporting from full-page placement tests to avoid the Order 03 dispatch thrash.
