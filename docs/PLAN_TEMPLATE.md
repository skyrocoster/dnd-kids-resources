# Plan & Work-Order Template

This repo splits planning from implementation across two roles, defined by model strength rather than
by vendor: the **planner** (more powerful) runs `create-plan`, `to-plan`, `to-orders`, `dispatch-orders`,
`quick-reconcile`, and `reconcile`; the **executor** (cheaper, weaker) runs `implement-order`, one work order at a time, in a
fresh context window, seeing only what its order names. Either role can be filled by any provider or
product strong enough for it, so the docs and skills name the **role**, never a vendor.

The workflow is driven by eight skills in `.opencode/skills/`, opencode's native skill directory:

| Skill | Role | Job |
|---|---|---|
| `create-plan` | planner | Write a focused human **Plan** (Layer 1) directly for one concrete outcome. Intent, not code. |
| `to-plan` | planner | Autonomously route one selected master-plan slice to direct quick delivery or a focused **Plan**. |
| `to-orders` | planner | Turn one Plan stage into lean **work orders** (Layer 2). Guidance, not code. |
| `dispatch-orders` | planner | Send runnable orders to the right-sized model; triage failures the moment they return, so dependency chains never stall. Repairs code directly only in the narrow case its step 5 defines. |
| `implement-order` | executor | Execute **one** work order, then stop. Writes the code. |
| `implement-quick` | quick executor | Execute one fully settled atomic change from an ephemeral brief for a Plan stage, direct slice, or bounded repair. |
| `quick-reconcile` | planner | Close a directly delivered master-plan slice: update canonical docs and its slice receipt, run full checks, and remove redundant artifacts. |
| `reconcile` | planner | Close out finished orders: the `reconcile-agent` scouts and automatically repairs focused stage regressions, then collapses the Plan, updates docs, runs the checker, and commits once green. |

The coordinator delegates `to-plan` and focused Plan creation to the dedicated `plan-router`
subagent. The coordinator consumes its compact route handoff and only reads cited evidence when
the subagent reports a blocker or escalation; it does not duplicate the planning packet in its own
context.

The coordinator also delegates the complete `reconcile` closeout to `reconcile-agent`. After a clean
handoff it checks only git status, diff summary, and the reported commit; it reads cited evidence
only when closeout reports a blocker, failure, or escalation.

The split is also a context-preservation rule: when `to-orders` emits exactly one order, the creating
planner implements that order in the current context, runs its STOP WHEN, and preserves its
STATUS/DEVIATIONS/EVIDENCE ENVELOPE. Only stages emitting two or more orders use `dispatch-orders`
and fresh executor contexts.

### Stage execution routing

After settling a Plan stage, choose the smallest safe route:

- **Planned quick stage:** use `quick-executor` when the stage is one atomic change, the exact edit and
  authorized paths are known, no design/architecture/contract/diagnosis work remains, and one focused
  check can judge it. The coordinator writes the ephemeral `implement-quick` brief, dispatches it, and
  records the successful result in the Plan's Status and Shipped table. The executor never edits the
  Plan. The coordinator names this Plan explicitly when invoking `reconcile`, because no work-order
  file exists for the active-index `Next` column to discover. A failed or escalated brief becomes a
  normal `to-orders` stage; do not expand the brief.
- **Work-ordered stage:** use `to-orders` when the executor needs bounded exploration, the stage has
  dependencies, more than one logical change, or normal order evidence and sequencing.
- **Human stage:** stop and surface the decision when the stage needs a table session, unresolved
  product/design judgment, or High-strength synthesis.

The quick route is a transport optimization, not a second Plan format. The Plan remains the durable
record even though no work-order file is created.

### Master-plan slice routing

Before a focused Plan exists, `to-plan` judges transport without asking the user. It delivers a selected
slice directly only when behavior and ownership are settled, prerequisites have durable acceptance
evidence, implementation is one atomic change, exact authorized paths/facts/check are verified, no
design/architecture/API/data/migration/compatibility/diagnosis decision remains, and no queued or
multi-context coordination state is needed. File count and the presence of a human acceptance gate do
not decide this.

A qualifying slice goes directly through an `implement-quick` brief and mandatory `quick-reconcile`.
Anything unproven gets a focused Plan. An escalated direct brief also becomes a focused Plan carrying
the failed brief's evidence; it is never widened in place.

Every master-plan-backed route writes the master plan's `## Slice delivery receipts` table during
closeout. `quick-reconcile` records route `Direct`; full `reconcile` records route `Plan`. Checks may
write `Implemented; awaiting human acceptance`; only explicit human acceptance writes
`Accepted YYYY-MM-DD`. Only that accepted receipt, or equivalent accepted archived-Plan evidence,
satisfies a dependent slice.

---

## Layer 1 — the Plan (human-readable)

Lives at `docs/plans/active/<feature>/<feature>.md`, named for a concrete outcome. Many Plans may be
active at once; what a Plan waits on is a **dependency**, declared in its `## Touches` section — see
*Lifecycle* below. Short, and free of code — you read it to understand *what* and *why*.

```md
# <Feature> — <one-line outcome>

> **Status:** <what's done, what's next — one line, rewritten each stage>

- **Areas:** <area-guide slug, comma-separated>
- **Read trigger:** <when a reader should open this plan>

## What we're building & why
<1–2 short paragraphs.>

## Stages
1. <plain-English intent of stage 1>
2. <plain-English intent of stage 2>
3. <plain-English intent of stage 3> **Table test:** [YYYY-MM-DD](../../../table-tests/YYYY-MM-DD-slug.md)

## Shipped
| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|

## Touches
- `glob/pattern/**`
- **Depends on:** [Other Plan](#)

## Compiler handoff

### Stage <N>
- **Verified edit sites:** `<repo-relative path>` — `<symbol or bounded section>`; <what is already true there>
- **Verified tests:** `<repo-relative path>` — <relevant suite, fixture, or harness fact>
- **Settled contracts:** <exact behavior, ownership boundary, data shape, copy, token, or dependency decision>
- **Constraints:** <invariant or canonical reference the orders must preserve>
- **Open questions:** <what `to-orders` still must resolve, or `none`>
```

**`**Areas:**` and `**Read trigger:**` are required, and the checker enforces both.** `**Areas:**`
holds the stable area-guide slugs the Plan owns (`docs/areas/<slug>.md`), comma-separated; the active
index's `Areas` column and the manifest are generated from it, together with the Status line. Write
them once here and never restate them anywhere else — a manifest row typed by hand is the drift this
replaced. Legacy archived Plans may keep the older `**Area guide:**` link during migration; new and
active Plans use `**Areas:**`.

A stage that ends at something playable names its table test on the stage line: a `**Table test:**`
label followed by a link whose text is the session date and whose target is the record under
`../../../table-tests/`. That stage's row in `## Shipped` links the same record rather than restating
what the session found. See [TABLE_TESTING.md](TABLE_TESTING.md) for the record format, the
`planned` → `run` → `folded in` lifecycle, and the standing questions.

`## Compiler handoff` is a temporary, stage-scoped machine-facing appendix. It preserves verified
answers planning already paid to discover so `to-orders` can target its exploration instead of
rereading the same source. Exact paths, symbols, tests, contracts, and constraints belong here;
unverified assumptions belong under Open questions. `to-orders` consumes the compiled stage's
subsection after its orders pass lint and removes the heading when no handoffs remain. A Plan may
temporarily carry a **`## Planning byproducts`** appendix of verbatim code snippets that fell out of
settling the design (verified regexes, exact expressions, type signatures); `to-orders` moves each
into the relevant order's KNOWN STATE (marked `verified snippet — use as-is:`) and deletes the
appendix.

Every active Plan **must** declare a `## Touches` section. Each line is a repo-root-relative
backtick-quoted glob matching files the Plan's work orders may modify. When a Plan directory contains
at least one `NN-*.md` work order it is *in-flight*; only in-flight Plans participate in overlap
checks. If two in-flight Plans expand to the same file, the overlap is an error unless one Plan
directly depends on the other via `- **Depends on:** [Label](#)` pointing to the depending Plan's
Markdown file under `docs/plans/active/`.

## Layer 2 — the Work Order (one focused task)

Lives at `docs/plans/active/<feature>/NN-<slug>.md`. One work order = one logical change, roughly
one screen. The planner fills KNOWN STATE and START IN with verified facts so the executor never
re-explores; the executor writes the code and the STATUS line.

**Emit orders with `scripts/new_order.py`.** It renders this shape from the facts you pass it,
resolves bare filenames to their one repo path, derives a line range and anchor from `path:Symbol`
for any file over 400 lines, assembles the STOP WHEN command, and lints the result — writing nothing
if the lint fails. It also enforces the shape ceiling at the argument boundary, so an order that is
too big is refused as a sizing verdict before it is written: **4 distinct START IN files** (extra
ranges of an already-named file are free, to 6 entries), **3 DO bullets**, **2 test files in STOP
WHEN**. `check_orders.py` enforces the same three caps, so hand-writing a wider order only moves the
rejection later.

```
WORK ORDER <NN> — <short title>
GOAL: <one sentence — what "done" looks like>
DEPENDS ON: <order NN that must be DONE first, or "none">
REQUIRED STRENGTH: Light   <-- the default for every order; Standard/High need "— <why Light can't>">
CREATES: <repo-relative paths this order creates, one bullet each, or "none">
REMOVES: <repo-relative paths this order removes, one bullet each, or "none">
CHANGES SIGNATURE: <`symbol` in <path> for each exported signature this order changes, or "none">

KNOWN STATE (already true — do NOT redo or re-derive):
- <verified fact: real value, real file location, current test count>

KNOWN TEST FAILURES (pre-existing — NOT yours to fix, NOT caused by you):
- <backend only: exact pytest node id that already fails; frontend stop-checks use
  npm run test:check, which reads frontend/known-test-failures.json itself. Omit when empty.>

START IN:
- <exact path> — lines <A>-<B> @"<line A, verbatim>"   <-- files over 400 lines
- <exact path> — <what's needed>                        <-- files under 400 lines: reading it whole IS the scope
- <2–4 entries, each verified by opening it while compiling>

DO:
- <1–3 terse lines: what to change and where, with the anchor text to match — no code>

STOP WHEN: <a single runnable command that must pass, or "if X = Y, stop">

STATUS: <-- executor writes DONE, FAILED - <one-line reason>, or BLOCKED - <one-line reason>

DEVIATIONS: <-- executor appends, always (even on DONE) — one line
- KNOWN STATE re-verified or wrong: <one line, or "none">

EVIDENCE ENVELOPE: <-- executor appends, always (even on DONE) — directly below DEVIATIONS
- COMMAND: <the exact STOP WHEN command the executor ran>
- RESULT: pass | fail
- CHECKS: <what passed and what failed — one line per check>
- DIRTY PATHS: <every file the edits left changed in the worktree, or "none">
- AUTHORIZATION: <edited files matched to the START IN / DO / CREATES / REMOVES entries that authorize each>
- GUARD: <read-guard denials or `--unlock` overrides, or "none">
- ATTEMPTS: <0 if STOP WHEN passed first try, else the number of fix attempts>
```

**Anchors, and why a bare line number is not allowed.** A line range tells the executor where to stop
reading; the `@"..."` anchor is what keeps that range true when an upstream order edits the same file.
`scripts/check_orders.py` re-checks that the anchor still sits in its range, and `--fix` moves the
range to wherever the anchor went or resolves a backticked symbol into a real range. Bounding a large
file by symbol name or bare line number is rejected.

**DEVIATIONS is one line, not two.** The old second line — what the executor opened beyond START IN —
was measurably unreliable, so it is dropped.

Below DEVIATIONS the executor always appends the compact **EVIDENCE ENVELOPE** — COMMAND, RESULT,
CHECKS, DIRTY PATHS, AUTHORIZATION, GUARD, ATTEMPTS — a structured account of the run the coordinator
judges without re-deriving anything (see step 8 of `.opencode/skills/implement-order/SKILL.md`).
STATUS stays `DONE` / `FAILED` / `BLOCKED`; **clean** and **anomalous** are coordinator
classifications derived from the envelope's RESULT, GUARD, and ATTEMPTS, not executor verdicts.

The focus leash: **KNOWN STATE** (answers, not pointers) + **START IN** (bounded exploration, each
entry scoped to the symbol or line range needed) + **CREATES/REMOVES** (explicit artifact lifecycle)
+ **STOP WHEN** (a hard stop that ends wandering). When an entry names a symbol or line range, opening
unrelated sections of that same file is a deviation and must be reported as such. See
`.opencode/skills/to-orders/SKILL.md` for full authoring guidance, and
[the reference order](plans/_example/99-creature-row-ac.md) for a worked example.

`scripts/check_orders.py` lints orders against these rules and is runnable on its own while compiling
a stage. Its default relaxed mode reports findings without blocking; `--strict` is available when a
dispatch gate is wanted. Each rule is one fault — an unresolvable path, an undeclared
edit or lifecycle artifact, a bare filename, a conditional instruction, an unscoped large file, a
stale or unanchored line range, an exported signature change that does not enumerate its call sites, a
source file whose own suite is missing from STOP WHEN, a hook change with no lint, a new test with no
insertion anchor, several behaviours aimed at one big integrated suite, structural documentation
without the real checker, validator tests omitted from the order, or unsafe parallel edits.

Four scripts keep the workflow's own costs off a model: `new_order.py` writes the order so the faults
above are prevented at the argument boundary; `check_orders.py --fix` repairs what is mechanical;
`order_check.py` runs a STOP WHEN and prints pass/fail; `stage_check.py` runs all five reconcile
checks and prints ~10 lines. One rule is enforced by the harness rather than by wording:
`scripts/read_guard.py` denies a read of a file the session has already edited, once that session has
invoked `implement-order`; a failing check unlocks everything, and `--unlock <path> --reason "<why>"`
is the logged override. opencode reaches it through `.opencode/plugin/read-guard.js`.

### On failure — the escalation channel back to the planner

If the executor cannot make STOP WHEN pass — the harness allows two failed verification runs total,
the initial failure plus at most one repair after it — it writes
`STATUS: FAILED - <reason>`; if the order cannot be executed as written (KNOWN STATE wrong, named file
missing, DO contradicts the code) it writes `STATUS: BLOCKED - <reason>`. Either way it appends a
**FAILURE REPORT** block below the STATUS line and **leaves its partial changes in the worktree**:

```
FAILURE REPORT:
- TRIED: <2-4 lines: what changes were made, in which files>
- FAILING COMMAND: <the exact STOP WHEN command run>
- OUTPUT: <last ~20 lines of failing output, verbatim, in a code fence>
- SUSPECT: <one line: executor's best guess at why — allowed to be wrong>
- WORKTREE: <"changes left in place" plus the list of dirty files>
```

The verbatim OUTPUT is the load-bearing field: the planner triages from it without re-running the work
from cold. A failure report is a successful outcome of an order — the executor never keeps cycling to
avoid writing one.

### Failure triage at dispatch

Triage happens **the moment the failure returns**, in `dispatch-orders` — not at reconcile time —
because downstream orders `DEPENDS ON` the failed one and stall until it's reissued and passes. A
`DONE` order needs nothing further; only failures pull the planner back in. Two rules keep failure
knowledge flowing forward so work is never repeated:

- **The planner always tells the executor what already fails.** Whoever compiles an order runs the
  relevant test command first and records any pre-existing failures verbatim under **KNOWN TEST
  FAILURES**. The executor treats those as background noise and STOP WHEN is judged with them still
  present.
- **A reissued order carries what was already tried.** Whoever reissues a FAILED order folds the
  previous FAILURE REPORT's TRIED and SUSPECT lines into the new order's KNOWN STATE as "already
  attempted, did not work: <approach>".

### Test-run tiers

Each tier runs in the context that can afford its output:

| Tier | Who | What |
|---|---|---|
| Targeted | executor (`implement-order`) | Only the STOP WHEN command — exact test files, `--no-cov` for pytest subsets, `npm run test:check -- <file>` on the frontend. Never the full suite. `npm run typecheck` is the one stage-level check allowed in an order, and only when it writes a fixture for a domain-typed object. |
| Full | `reconcile`, once per stage | `pytest` (full suite + coverage gate), `npm run test:check -- --strict`, `npm run lint`, `npm run build` (includes `tsc -b`). Prunes `frontend/known-test-failures.json`. |
| Backstop | CI on push/PR | Everything, always. |

---

## Lifecycle

1. **Active** — the Plan carries a Status line and a plain-English Stages list, and lives under
   `plans/active/`. There may be many at once: a design can be fully settled and written up long
   before there is capacity to build it, and writing it down is how the reasoning survives.

   **Dependencies, not queues, decide what can start.** A Plan that cannot begin until another ships
   says so with a `**Depends on:**` entry in its `## Touches` section. A Plan is **blocked** while any
   Plan it depends on is still under `plans/active/`, and **ready** once they have all been archived —
   [plans/active/INDEX.md](plans/active/INDEX.md) derives both and sorts every Plan after the ones it
   depends on. Several Plans can be ready at once and nothing ranks them: which ready Plan to pick up
   is the user's call, made per session rather than recorded in a file. That index is the **sole
   queue/status view** — area guides no longer carry per-area plan tables or queues.
2. **Shipped** — as each stage's orders finish, `reconcile` collapses them into the Plan's **Shipped**
   table (one ≤2-sentence row per stage) and deletes the spent order files. The commit history is the
   record of *how* each thing was built — never duplicate that prose into the Plan.
3. **Complete** — when the whole feature ships, move the Plan to `docs/plans/done/<feature>/` and
   update `docs/README.md` in the same change set. Archiving it also unblocks every Plan that declared
   a dependency on it, so regenerate the index. Leave a redirect stub only if a known inbound link
   must survive; redirect stubs are excluded from the active index and the manifest inventory, so an
   archived plan never reads as active.

## Required model strength (per work order)

State a capability, not a model name. **Light**: bounded/mechanical (rename, stub, narrow test).
**Standard**: ordinary implementation across a small touch set. **High**: broad synthesis, contract
decisions, tricky migration. `to-orders` picks the lowest strength that can safely execute the order
after reading only what it names.

---

## The documentation checker

`scripts/check_docs.py` is aligned with this workflow. For an active Plan it requires only a
`> **Status:**` line, an `**Areas:**` and `**Read trigger:**` header (see Layer 1), and a
`## Touches` section (stages are plain-English list items, not `(next up)` execution blocks). It lints
work orders under `plans/active/<feature>/` by delegating to `scripts/check_orders.py`; requires every
area guide's `## Change map` to map recognizable change types to repo-relative source globs, rejecting
placeholders, unmatched globs, uncovered implementation files, and files claimed across multiple
areas; enforces the `## Touches` overlap contract between in-flight Plans; and keeps the
workflow-agnostic safety net: local links/anchors, manifest completeness, plan-redirect lifecycle,
AI-entry precedence, configured test commands, banned legacy references, and the auto-generated
reference inventories. The generated active index is the sole queue/status view; redirect stubs are
excluded from it and from the manifest inventory. It no longer couples a per-diff code change to a
Plan edit, so the executor's work-order commits pass without touching the Plan; the Plan is updated in
batches by `reconcile`.

An earlier plan format (a `(next up)` heading with eight labeled fields) is no longer enforced. The
last plan still written that way may remain until it is naturally retired; it validates fine because
only the Status line is required.
