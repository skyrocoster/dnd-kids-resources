# Plan Doc Template & Lifecycle

Copy this to `docs/plans/active/<area>-<outcome>.md` when starting an implementation outcome or cross-cutting phase.
It encodes the staged methodology from `CLAUDE.md` **plus the collapse discipline that keeps a plan
doc from growing unbounded**. An area guide is the durable router for a domain; this execution plan is
the temporary, forward-looking authorization to change it.

**The core rule:** the plan doc is a *forward-looking* working document, not a changelog. Detail is
verbose while a stage is being built, condensed to one row the moment it ships, and removed with its phase
when that phase is done. **The durable record of *how* a stage was built is its git
commit — never duplicate that prose into the plan doc permanently.**

---

## The three states of a plan doc

Every stage in a plan doc is always in one of three states. **Every stage that has not yet shipped —
the next one and all planned stages after it — carries a full verbose block. The moment a stage ships,
its verbose block is deleted and replaced by a single Shipped-table row.** So a plan is a stack of
verbose future-stage blocks on top of a thin table of shipped rows; nothing in between.

| State | What the doc looks like | Detail budget |
|---|---|---|
| **① Reference (top matter)** | Stable context an executor reads *before* touching code — never a log of what happened. | Long-lived, edited only when the structure itself changes. |
| **② Future stage (not yet shipped)** | Every un-shipped stage — the next one *and* all later planned ones. Full spec each: what to build, what it inherits, tests, gate. | Verbose — this is where all forward detail lives. |
| **③ Shipped (collapsed)** | Everything already done. One short table row per stage; completed phase sections are deleted. | ≤2 sentences per stage row. |

**As work moves forward, content flows ①→②→③ and *shrinks* at the ②→③ step.** A stage that just shipped
gets its verbose block deleted and replaced by a single row in the Shipped table; the still-future stages
keep their verbose blocks until their own turn to ship.

---

## Area guides and focused plans

Each domain has one durable guide in `docs/areas/`. It records scope, minimum references, source/test map,
invariants, work queue, and a link to at most one active execution plan. Keep it short and update it when
the domain's signposting changes; it is not a stage log or implementation authorization.

Every execution plan starts with this line immediately after its status block:

```md
- **Area guide:** [Dungeons](../../areas/dungeons.md)
```

Use one active plan per area at most. Name the plan for a concrete outcome, such as
`dungeon-passage-session.md`, rather than the whole domain. The manifest links directly to the current-stage
anchor; the area guide links to the same plan. If the guide says `None`, create a focused plan before changing
implementation code.

---

## What to look at during a phase (the Reference top-matter)

These sections sit at the top and answer "what does an executor need to know before building?" They
are **not** a history of the phase. Keep them current; don't append to them per stage.

- **Status line** — one blockquote: which stages shipped, which is next. Rewrite it each stage; never
  append. Good: `> **Status:** F0–F3 shipped. F4 (design pass) queued next.`
- **What the feature is** — 1–2 paragraphs. The user-facing shape and signature affordance.
- **Key facts / data facts** — the non-obvious truths an executor would otherwise re-derive (data
  shapes, existing patterns to reuse, naming conventions, gotchas). Assume no other repo knowledge.
- **Design system in force** — only if the phase has visual surface; otherwise link to
  `docs/DESIGN_SYSTEM.md` and delete this section.
- **Reusable pieces (do not rebuild)** — the selectors/components/hooks already built that this phase
  extends. This is what stops parallel re-implementations.
- **Known debt / deferred (NOT built)** — explicit non-goals, so scope doesn't creep.

> **Discipline:** if you catch yourself adding a *stage's* implementation detail to any of these
> sections, stop — that belongs in that stage's verbose block (while un-shipped) or the commit (after).

---

## The phase plan (the forward-looking core)

One section per phase. While the phase is active, it holds the **stage table** and a **verbose block
for every stage that has not yet shipped** (the next stage and all planned stages after it). Shipped
stages have no block here — only a row in the Shipped table.

### Design Phase <X> — <Name>

One paragraph: what this phase delivers and why. **Depends on / Depended on by:** name the cross-doc
sequencing constraints ("do not start J3 before DP1 is committed").

| Stage | Model | Summary | Deliverables |
|-------|-------|---------|--------------|
| **X0 — Scaffolding** | Haiku | Types/stubs/placeholder CSS/`it.skip` tests, no implementation. One context. | Stubs compile; app renders unchanged. |
| **X1 — <name>** | Sonnet | One-line intent. | Reducer/component/tests named. |
| **X2 — <name>** | Sonnet | One-line intent. | … |
| **X3 — Design pass** | Sonnet | `/frontend-design` review, a11y, zero-bug. | Fixes + design tests. |

**Sequencing:** X0 (Haiku, first) → X1 → X2 → X3. Note any parallelism.

<!-- ===== VERBOSE BLOCKS — one per un-shipped stage, in order. Delete a block and collapse it to a
     Shipped row the moment that stage ships; the remaining blocks stay until their own turn. ===== -->

#### X<n> — <name> (next up)

- **Read first:** the smallest exact set of plans, references, source files, and tests required before exploring.
- **Build:** concrete algorithms, reducer actions, component shapes, exact file paths.
- **Inherits:** what earlier stages already provide that this one builds on (don't re-derive).
- **Expected touch set:** exact files or directories expected to change; state why any broad directory is necessary.
- **Documentation impact:** exact reference and plan documents to update, or `None: <specific reason>`.
- **Tests:** unit (reducer/selector/render) + integration (full flow) to write, including exact commands.
- **Gate:** the live end-to-end confirmation that proves it works — not just test-green. State whether a browser
  pass is required (per `CLAUDE.md`'s browser-automation policy) or the suite suffices.
- **Completion edit:** the Shipped-table row, status line, next-stage target, and any archival edit required when
  this stage ships.

#### X<n+1> — <name> (planned)

- **Read first / Build / Inherits / Expected touch set / Documentation impact / Tests / Gate / Completion edit:**
  same eight-part shape as above, one block per remaining stage. Keep each as specific as the next-up block —
  future stages earn full detail, not a placeholder.

<!-- ============================================================================================= -->

---

## When a stage is complete

A stage is done only when its **🚦 gate is met live**, tests are green, and typecheck/build are clean.
On completion, do all of this in the stage's own commit:

1. **Delete this stage's verbose block.** Replace it with **one row** in the Shipped table (see below),
   ≤2 sentences. The detailed authoring narrative goes in the **commit message**, not the doc. Leave the
   verbose blocks of the still-un-shipped stages untouched.
2. **Rewrite the Status line** to show this stage shipped and name the next one.
3. **Make the declared documentation-impact edit** — never use subjective wording such as "if needed." Update
   every named reference in the same change set, or retain the stage's explicit `None: <specific reason>`.
4. **Commit code + plan-doc edit together**, referencing the stage ID and test counts.

### Shipped stages table (the collapsed record)

Everything done lives here as thin rows. This table only grows by one short row per stage — it must
never carry the paragraph that was in the stage's verbose block.

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| **X0** | Scaffolding: types + stubs + `it.skip` tests. Gate ✅. |
| **X1** | <what shipped, briefly>. NNN tests, typecheck/build clean. Gate ✅ (live-verified YYYY-MM-DD). |

> **Anti-bloat rule:** if a row needs more than two sentences to be useful, the missing detail is
> almost always "how it was implemented" — which belongs in the commit, reachable via `git log`. The
> plan doc answers *what exists* and *what's next*, not *how each thing was built*.

---

## How to complete a phase

When every stage in a phase has shipped, remove the phase completely so the plan is clean for the next
forward-looking phase. Its concise stage rows remain in the Shipped-stages table; the commit history is the
record of implementation detail.

1. **Delete the phase section.** Remove its overview, stage table, sequencing, and any active-stage block.
   Do not leave a shipped-phase summary section behind.
2. **Promote durable facts to top matter or a reference doc.** Keep only facts a future executor needs in
   `Reusable pieces`, `Key facts`, or the appropriate `DESIGN_SYSTEM.md` / `DATA_MODEL.md` /
   `API_REFERENCE.md` reference.
3. **Move deferred items to the shared "Known debt" list** so they are not buried in a completed phase.
4. **Update the Status line and the `## Next:` section** to point at the next phase.

### When the *whole feature* is complete

When there are no more planned phases:

1. Reduce the entire doc to: the Reference top-matter (still useful as living context), the Shipped-stages
   table, and a final **Verification** section (how to confirm the whole feature end-to-end).
2. Move the doc to `docs/plans/complete/<area>-<outcome>.md`. Update the area guide to `None` or its next active
   plan, and update `docs/README.md` in the same change set. Leave a redirect stub only when a known inbound link
   must survive.

---

## Standing sections (bottom matter)

- **## Known debt / deferred work (NOT yet built)** — the running non-goals list, added to as phases
  surface deferred work.
- **## Cross-references** — links to sibling plan docs and the reference docs this one writes into.
- **Area guide line** — immediately after the status block, linking to the guide that owns this work.
- **## Next:** — one line naming the next queued stage/phase and whether it's unblocked.

---

## Quick checklist per stage

- [ ] 🚦 gate met live (or suite-sufficient per policy); tests green; `npm run typecheck`/`npm run build` clean (`tsc -b`, not `--noEmit` — [it checks nothing here](DESIGN_SYSTEM.md)); `pytest` from repo root, ≥85% coverage.
- [ ] This stage's verbose block **deleted**, collapsed to one Shipped-table row (≤2 sentences); the
       un-shipped stages' verbose blocks left in place.
- [ ] Status line rewritten; `## Next:` updated.
- [ ] Exact documentation-impact requirement completed, or its specific `None:` rationale remains valid.
- [ ] Code + plan-doc edit committed together, stage ID + test counts in the message.
- [ ] If this was the phase's last stage: phase section deleted; durable facts promoted to top matter or
       reference docs; deferred items moved to the Known-debt list.
