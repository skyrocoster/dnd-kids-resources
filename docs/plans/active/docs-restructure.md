# Docs Restructure — make routing cheap enough that an AI stops exploring

> **Status:** Next up for Documentation Governance. Nothing shipped. First stage: Stage 1 — plans become folders.

- **Area guide:** [Documentation Governance](../../areas/documentation.md)

## What we're building & why

The documentation contract works — plans ship, the checker holds, nothing has drifted. What it does
not do is make starting a task cheap. Routing one change currently costs a 109-line manifest, then a
146-line area guide of which 90 lines are glossary, and it ends at a source map that says
`frontend/src/features/dungeons/` — a directory holding 54 files. The AI then globs, lists, opens
three wrong files, and only then starts. That loop repeats every session, because Claude Code keeps
no repo map between them.

The guides are also miscut. `items.py` and `features/items/` are claimed by both `loot.md` and
`reference-catalogs.md`, so an item change has two canonical owners. `reference.py` and
`session_state.py` are claimed by nobody. Eleven guides exist for ten pages, and three of them own no
page at all.

So this plan re-cuts the areas around pages, splits every document by how often it is actually read,
and replaces the vague source map with a file-coverage table the checker can enforce. The test for
each change is the same: does it reduce what must be read before the first useful edit.

### Settled decisions

**An area is a candidate for the next upgrade, not a filing category.** That is the test for whether
something deserves a guide. It is why design and infra keep theirs — "next I'll do a visual pass",
"next I'll fix the deploy" are real sentences — and why documentation loses its. The doc system is
the frame the areas sit in, not one of them; its rules live in `CLAUDE.md` and `PLAN_TEMPLATE.md`,
its enforcement in `check_docs.py`, and it gets no plan queue.

**A page is the indivisible unit of ownership.** An area holds one or more whole pages. No page is
ever split across two guides, which makes the current `items` double-claim impossible to recreate
rather than merely fixed. Seven areas result: reference (`/spells` `/weapons` `/items` `/loot`),
encounters (`/encounters` `/monsters` `/npcs`), dungeons (`/dungeons`, plus layouts and session
state), players, loom, design, infra.

**Names say what they contain.** `reference.md`, not `shelf.md`. Evocative names cost a decoding hop
for a fresh reader and break the association between a page name and its guide.

**Documents split by read frequency, not by subject.** This is the single principle behind most of
the plan. The manifest's 28 archived-plan rows, the 90-line glossaries, and the checker instructions
are all read rarely but paid for constantly. Each moves to a file opened only when it is the subject.

**Structure is generated; intent is written.** No tool maps "changing what a room shows" to
`RoomDetailsPanel.tsx` — ctags gives a symbol phonebook, import graphs give blast radius, and Aider's
tree-sitter repo map ranks by reference count, none of which know product vocabulary. So the checker
enumerates files and enforces that every one is claimed, while the claim itself is hand-written. A
row claims a glob rather than a file, which keeps the repo's 148 source files down to roughly 45 rows
and lets new files land in an existing row silently.

**Parallel plans are normal; priority ordering is fiction.** Two plans have live orders on disk right
now. What matters is not which is first but whether they can safely coexist, so plans declare the
globs they touch and the checker rejects overlap between in-flight plans. This replaces the
hand-written warning in `dungeons.md` that Dungeon Outside and Dungeon Connections "must not run
concurrently" with something that cannot be forgotten.

**Areas hold an ordered plan queue, not exactly one active plan.** The current one-plan rule was a
proxy for focus, and it fails immediately under the new cut — reference inherits two live plans. An
explicit queue expresses focus better and stops areas fragmenting to dodge the rule.

## Stages

1. **Plans become folders.** A plan and its orders move into one directory named for the feature,
   with the plan file keeping the feature name so `@`-completion stays unambiguous. `docs/complete/`
   moves under `docs/plans/done/`, which makes archiving a single move and "active" mean simply *not
   under `done/`*. This stage must land atomically: 64 links point at `docs/complete/` and the
   checker validates every one, so the repo is red until all of them move together. Clear out the two
   phantom paths `docs/README.md` advertises — `plans/active/tickets/` and `plans/mapping/`, neither
   of which exists — and rehome `orders/_example/`.

2. **Areas re-cut to seven.** Collapse eleven guides into the seven above, assign every page and
   every orphan router exactly one owner, and retire `documentation.md`. Each guide splits in two:
   the guide itself keeps the routing content, and `<area>.words.md` takes the glossary. The checker
   swaps its single-active-plan rule for an ordered queue, and gains the rule that no page or router
   is claimed twice.

3. **Where things are.** Each guide gains the change-type table, with rows claiming globs. The
   checker enumerates the repo's source files, fails when any file is matched by no row or by rows in
   two different areas, and fails on unfilled TODO rows — so coverage is enforced rather than hoped
   for, and the first run tells you exactly which files still need an intent written.

4. **Plans declare what they touch.** Each plan gains a `## Touches` block of globs, and the checker
   rejects two in-flight plans claiming the same files unless one declares a dependency on the other.
   Backfill the block onto the plans already in flight and delete the hand-written concurrency
   warning it replaces.

5. **The reader-facing pass.** Split `docs/README.md` into a task router of roughly thirty lines, an
   `INVENTORY.md` for canonical docs and area guides, and a generated archive index under
   `docs/plans/done/`; fold the checker commands into `CLAUDE.md`, where they already appear. Then
   sweep the remaining canonical documents for hedged prose — replacing every "create a focused plan
   before other deferred work" with the specific deferred items, or deleting it.

### Risk to watch

`check_docs.py` is 916 lines and this plan changes five of its checks, three of which are new
enforcement rather than adjusted rules. Each stage's orders should carry the checker change together
with the documents it validates, because neither passes without the other. If a stage's checker work
turns out to exceed one work order, split the order rather than letting a small model refactor the
validator broadly.

## Shipped

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
