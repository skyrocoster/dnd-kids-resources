# Plan & Work-Order Template

This repo splits planning from implementation across two roles, defined by model strength rather than
by vendor:

- **The planner** — the **more powerful model**. Runs `plan`, `to-orders`, `dispatch-orders`, and
  `reconcile`. It is the only role that reads the Plan and explores the wider codebase.
- **The executor** — the **cheaper, weaker model**. Runs `implement-order`: one work order at a time,
  in a fresh context window, seeing only what its order names.

Either role can be filled by any provider or product that is strong enough for it — Claude, opencode,
ChatGPT, a local model. Which ones fill them is an open experiment, so the docs and skills name the
**role**, never a vendor. Where a specific product genuinely matters (telemetry parsing, subagent
transport), that is called out as a transport detail, not as who the planner is.

The workflow is driven by five skills in `.claude/skills/`, read by whichever harness the role runs
in — Claude Code discovers project skills only there, and opencode reads that directory too:

| Skill | Role | Job |
|---|---|---|
| `plan` | planner | Write the short human **Plan** (Layer 1) and a temporary handoff of verified specifics. Intent, not code. |
| `to-orders` | planner | Turn one Plan stage into lean **work orders** (Layer 2). Guidance, not code. |
| `dispatch-orders` | planner | Send runnable orders to the right-sized model; triage failures the moment they return, so dependency chains never stall. Repairs code directly only in the narrow case its step 5 defines. |
| `implement-order` | executor | Execute **one** work order, then stop. Writes the code. |
| `reconcile` | planner | Close out finished orders: collapse the Plan, update docs, run the checker. Bookkeeping, not code. |

The three jobs: **PLAN** (the planner thinks) → **IMPLEMENT** (the executor does one order per
context) → **RECONCILE** (the planner reconciles docs). The point is to keep the planner's expensive
context clear of implementation sprawl and test output, which are cheapest in the executor's
throwaway per-order contexts. That is a cost judgement, not a ban: when a dispatch round trip would
cost more than the edit — a small, fully-determined change needing no additional exploration — the
planner may compile and complete one order directly, runs its targeted STOP WHEN, preserves its
STATUS/DEVIATIONS and telemetry lifecycle, and says so. Any failed edit, failed check, or need for
another read ends this fast path and sends the order to an executor normally.

---

## Layer 1 — the Plan (human-readable)

Lives at `docs/plans/active/<feature>/<feature>.md`, named for a concrete outcome. An area may hold more than
one active plan, but exactly one of them is **next up** — see *Lifecycle* below. Short, and free of
code — you read it to understand *what* and *why*.

```md
# <Feature> — <one-line outcome>

> **Status:** <what's done, what's next — one line, rewritten each stage>

- **Area guide:** [<Area>](../../../areas/<area>.md)

## What we're building & why
<1–2 short paragraphs.>

## Stages
1. <plain-English intent of stage 1>
2. <plain-English intent of stage 2>

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

`## Compiler handoff` is a temporary, stage-scoped machine-facing appendix. It preserves verified
answers planning already paid to discover so `to-orders` can target its exploration instead of
rereading the same source. Exact paths, symbols, tests, contracts, and constraints belong here;
unverified assumptions belong under Open questions. It is not a discovery log and contains no
implementation recipe. `to-orders` consumes the compiled stage's subsection after its orders pass
lint and removes the heading when no handoffs remain. The human-facing Plan above it stays short.

A Plan may temporarily carry a **`## Planning byproducts`** appendix: verbatim code snippets that
fell out of settling the design (verified regexes, exact expressions, type signatures). It is a
hand-off buffer, not documentation — `to-orders` moves each snippet into the relevant order's KNOWN
STATE (marked `verified snippet — use as-is:`) and deletes the appendix. Paid-for code is relayed,
never re-derived by the executor; but the appendix is not a licence to pre-write the implementation.

Every active Plan **must** declare a `## Touches` section. Each line is a repo-root-relative
backtick-quoted glob matching files the Plan's work orders may modify. When a Plan directory contains
at least one `NN-*.md` work order it is *in-flight*; only in-flight Plans participate in overlap
checks. If two in-flight Plans expand to the same file, the overlap is reported as an error unless
one Plan directly depends on the other via `- **Depends on:** [Label](#)`
pointing to the depending Plan's Markdown file under `docs/plans/active/`.

## Layer 2 — the Work Order (one focused task)

Lives at `docs/plans/active/<feature>/NN-<slug>.md`. One work order = one logical change,
roughly one screen. The planner fills KNOWN STATE and START IN with verified facts so the executor never
re-explores; the executor writes the code and the STATUS line.

```
WORK ORDER <NN> — <short title>
GOAL: <one sentence — what "done" looks like>
DEPENDS ON: <order NN that must be DONE first, or "none">
REQUIRED STRENGTH: Light   <-- the default for every order; Standard/High need "— <why Light can't>"
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
```

**Anchors, and why a bare line number is not allowed.** A line range tells the executor
where to stop reading; the `@"..."` anchor is what keeps that range true. Line numbers rot
the moment an upstream order edits the same file — in one stage, order 04 shifted every
line below its edit and silently invalidated the ranges orders 05 and 06 had been compiled
against. With an anchor that is a repairable condition rather than a discovery the executor
makes mid-run: `scripts/check_orders.py` re-checks that the anchor still sits in its range,
and `--fix` moves the range to wherever the anchor went. `--fix` will also resolve a
backticked symbol into a real range, so the compiler never has to reopen a large file to
find one. Bounding a large file by symbol name or by a bare line number is rejected: four
consecutive orders in one stage spent their only measurable waste re-locating exactly that
shape, and naming the range instead cut locating re-reads from 6 to 1.

**DEVIATIONS is one line, not two.** The executor used to declare what it opened beyond
START IN as well. That self-report was measurably unreliable — one order declared "none"
while the transcript recorded a read outside its scope — and `order_telemetry.py` derives
the same fact from the transcript more accurately and for free. What remains is the one
thing no transcript can tell you: whether the facts the order asserted were actually true.

The focus leash: **KNOWN STATE** (answers, not pointers) + **START IN** (bounded exploration, each
entry scoped to the symbol or line range needed) + **CREATES/REMOVES** (explicit artifact lifecycle)
+ **STOP WHEN** (a hard stop that ends wandering).
The path alone is not the whole START IN authorization: when an entry names a symbol or line range,
opening unrelated sections of that same file is a deviation and must be reported as such.
See `.claude/skills/to-orders/SKILL.md` for the full authoring guidance, and
[the reference order](plans/_example/99-creature-row-ac.md) for a worked example.

`scripts/check_orders.py` lints orders against these rules and is runnable on its own while
compiling a stage. Each rule is one fault the telemetry log paid to learn — a path that does not
resolve, an undeclared edit or lifecycle artifact, a bare filename, a conditional instruction, an
unscoped large file, a stale or unanchored line range, an exported signature change that does not
enumerate its call sites, a source file whose own suite is missing from STOP WHEN, a hook change
with no lint, a new test with no insertion anchor, a fixture with no cast idiom or typecheck,
several behaviours aimed at one big integrated suite, structural documentation without the real
checker, validator tests omitted from the order, or unsafe parallel edits.

Three scripts keep the workflow's own costs off a model:

- `scripts/check_orders.py --fix` repairs what is mechanical — bare filenames, stale ranges,
  symbol-scoped entries — so the compiler does not reopen files to re-verify line numbers.
- `scripts/order_check.py` runs a STOP WHEN and prints pass/fail plus the failing test names
  instead of the whole runner output, which was routinely the largest single tool result in an
  executor's context.
- `scripts/stage_check.py` runs all five reconcile checks and prints ~10 lines plus the
  `- stage checks:` telemetry line verbatim.

And one rule is enforced by the harness rather than by wording. `scripts/read_guard.py` denies a
read of a file the session has already edited, once that session has invoked `implement-order`;
a failing check unlocks everything, and `--unlock <path> --reason "<why>"` is the logged override.
Claude Code reaches it through `.claude/settings.json` and opencode through
`.opencode/plugin/read-guard.js`, so the rule binds both executors identically. Post-edit
re-reading was the only waste class that survived every order-side correction in the log.

### On failure — the escalation channel back to the planner

The work-order file is also the handoff channel when things go wrong. If the executor cannot make
STOP WHEN pass (after at most two distinct fix attempts) it writes `STATUS: FAILED - <reason>`; if
the order cannot be executed as written (KNOWN STATE wrong, named file missing, DO contradicts the
code) it writes `STATUS: BLOCKED - <reason>`. Either way it appends a **FAILURE REPORT** block below
the STATUS line and **leaves its partial changes in the worktree**:

```
FAILURE REPORT:
- TRIED: <2-4 lines: what changes were made, in which files>
- FAILING COMMAND: <the exact STOP WHEN command run>
- OUTPUT: <last ~20 lines of failing output, verbatim, in a code fence>
- SUSPECT: <one line: executor's best guess at why — allowed to be wrong>
- WORKTREE: <"changes left in place" plus the list of dirty files>
```

The verbatim OUTPUT is the load-bearing field: the planner triages from it without re-running
the work from cold. A failure report is a successful outcome of an order — the executor never keeps
cycling to avoid writing one.

### Telemetry — every finished order leaves a cost record

Telemetry has three moments, and they are all run by `scripts/order_telemetry.py`:

1. **At dispatch** — `--snapshot --order <order-path>` freezes the order's compiled shape. A reissue
   overwrites the order file, so shape captured afterwards is the shape of whichever version
   survived; the snapshot also yields the reissue diff.
2. **When the order reports back** — `--order <order-path> --fault <verdict> --note "<why>"` parses
   the executor's record (token totals, turn count, largest tool results, duplicate reads, reads
   outside START IN) and folds in the executor's STATUS and DEVIATIONS lines. Two transports parse
   automatically — Claude Code subagent transcripts and opencode's local SQLite DB — and only
   *child* records count, because the dispatcher's own session names the order too and would
   otherwise be logged as if it were the executor.
3. **At reconcile** — `--reconcile "<stage>"` records stage-level checks, the defects that escaped
   the orders' own STOP WHEN commands, and **the planner's own cost for the stage**. Without that
   last figure the log measures only the cheap half of the workflow and cannot say whether
   dispatching a stage beat implementing it directly.

Entries are written to `docs/plans/telemetry.jsonl`; `docs/plans/telemetry-log.md` is **generated**
from it and must never be hand-edited. Prose bullets cannot be summed, and correlating order shape
against cost is the whole reason the log exists.

**First-pass rate is the metric worth optimising.** An executor run costs cents; a re-dispatch costs
a cold start, the planner's attention, and a stalled dependency chain. The token columns diagnose
*why* an order thrashed — they are not the target. Order shape sits beside them because nearly every
compiler note concludes the order, not the executor, was at fault; the part of shape that actually
predicts cost is how many START IN lines sat inside a **named range**, not how many lines the files
held. For anything else (e.g. ChatGPT) the `--manual "<reported usage>"` form logs whatever that
tool's UI reported. The executor-written STATUS/DEVIATIONS lines are transport-independent either
way. The record survives order deletion at reconcile — reconcile checks each order has an entry
before deleting it — and is reviewed every ~10-15 entries to tighten the
`plan`/`to-orders`/`implement-order` rules. That review ends with `--close-cycle`, which distils the
cycle into a summary, tags each lesson as `enforced` or `judgement`, and archives the raw entries to
`docs/plans/telemetry-archive/` so the log stays readable. Executors never self-report token
numbers; models can't see their own counters, so numbers come only from transcripts or the other
tool's UI.

Triage happens **the moment the failure returns**, in `dispatch-orders` — not at reconcile time —
because downstream orders `DEPENDS ON` the failed one and stall until it's reissued and passes. A
`DONE` order needs nothing further; only failures pull the planner back in. `reconcile` triages
only what is still unresolved at closeout (typically orders that need a human, or an abandoned
batch).

Two rules keep failure knowledge flowing forward so work is never repeated:

- **The planner always tells the executor what already fails.** Whoever compiles an order (`to-orders`
  or a `reconcile` reissue) runs the relevant test command first and records any pre-existing failures
  verbatim under **KNOWN TEST FAILURES**. The executor treats those as background noise: it never
  tries to fix them, never counts them as its own breakage, and STOP WHEN is judged with those
  failures still present.
- **A reissued order carries what was already tried.** Whoever reissues a FAILED order (normally
  `dispatch-orders` mid-flight, `reconcile` at closeout) folds the previous FAILURE REPORT's TRIED
  and SUSPECT lines into the new order's KNOWN STATE as "already attempted, did not work:
  <approach>" so the next executor starts past them, not over.

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
   `plans/active/`. An area may have several: a design can be fully settled and written up long
   before there is capacity to build it, and writing it down is how the reasoning survives.

   Exactly one active plan per area is **next up** — the one work should start from. The area
   guide's `Active plan` line lists every active plan it owns, in order, marking the first
   `(next up)`. Only the next-up plan may have work orders in its feature directory; the others
   carry a Status line stating plainly that they are not next and what unblocks them. When the
   next-up plan completes, the following one inherits the slot and the guide's line is reordered.
2. **Shipped** — as each stage's orders finish, `reconcile` collapses them into the Plan's **Shipped**
   table (one ≤2-sentence row per stage) and deletes the spent order files. The commit history is the
   record of *how* each thing was built — never duplicate that prose into the Plan.
3. **Complete** — when the whole feature ships, move the Plan to `docs/plans/done/<feature>/`, set the
   area guide back to "no active plan" (or its next plan), and update `docs/README.md` in the same
   change set. Leave a redirect stub only if a known inbound link must survive.

## Required model strength (per work order)

State a capability, not a model name. **Light**: bounded/mechanical (rename, stub, narrow test).
**Standard**: ordinary implementation across a small touch set. **High**: broad synthesis, contract
decisions, tricky migration. `to-orders` picks the lowest strength that can safely execute the order
after reading only what it names.

---

## The documentation checker

`scripts/check_docs.py` is aligned with this workflow. For an active Plan it requires only a
`> **Status:**` line (stages are plain-English list items, not `(next up)` execution blocks). It lints
work orders under `plans/active/<feature>/` by delegating to `scripts/check_orders.py` — the
load-bearing fields (`GOAL:`, `DEPENDS ON:`, `REQUIRED STRENGTH:`, `CREATES:`, `REMOVES:`,
`START IN:`, `STOP WHEN:`, `STATUS:`), a `FAILURE REPORT:`
block whenever a STATUS line reads FAILED or BLOCKED, and the compiling rules above — validates
area-guide↔Plan ownership — every active plan must be linked
from its owning guide's `Plan queue`, which may list several — requires every area guide's
`## Change map` to map recognizable change types to repo-relative source globs, rejecting
placeholders, unmatched globs, uncovered implementation files, and files claimed across multiple
areas — enforces the `## Touches` overlap contract: every active Plan must declare a
`## Touches` section with repo-root-relative globs, undeclared file overlap between in-flight
Plans is an error, and a `- **Depends on:** [Label](#)` dependency in either
Plan's `## Touches` section accepts the overlap — and keeps
the workflow-agnostic safety net: local links/anchors, manifest completeness, plan-redirect lifecycle,
AI-entry precedence, configured test commands, banned legacy references, and the auto-generated
reference inventories. It no longer couples a per-diff code change to a Plan edit, so the executor's
work-order commits pass without touching the Plan; the Plan is updated in batches by `reconcile`.

An earlier plan format (a `(next up)` heading with eight labeled fields) is no longer enforced. The
last plan still written that way may remain until it is naturally retired; it validates fine because
only the Status line is required.
