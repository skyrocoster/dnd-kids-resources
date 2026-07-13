# Plan Doc Template & Lifecycle

Copy this to `docs/<feature>_plan.md` when starting a new feature or cross-cutting design phase.
It encodes the staged methodology from `CLAUDE.md` **plus the collapse discipline that keeps a plan
doc from growing unbounded**. `design_plan.md` is the reference for how a healthy doc reads;
`dungeon_plan.md` (933 lines, every shipped stage still carrying its full authoring paragraph) is the
failure mode this template exists to prevent.

**The core rule:** the plan doc is a *forward-looking* working document, not a changelog. Detail is
verbose while a stage is being built, condensed to one row the moment it ships, and folded to a short
summary when the whole phase is done. **The durable record of *how* a stage was built is its git
commit — never duplicate that prose into the plan doc permanently.**

---

## The three states of a plan doc

Every plan doc is always in one of three states. The bulk of a doc's content should be pointer-thin;
only the *one* stage currently in flight earns verbose treatment.

| State | What the doc looks like | Detail budget |
|---|---|---|
| **① Reference (top matter)** | Stable context an executor reads *before* touching code — never a log of what happened. | Long-lived, edited only when the structure itself changes. |
| **② Active stage** | The single stage being built right now. Full spec: what to build, what it inherits, tests, gate. | Verbose — this is the one place detail lives. |
| **③ Shipped (collapsed)** | Everything already done. One table row per stage; one short summary per completed phase. | ≤2 sentences per stage row. |

**As work moves forward, content flows ①→②→③ and *shrinks* at each step.** A stage that just shipped
gets its verbose "Active" block deleted and replaced by a single row in the Shipped table.

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
> sections, stop — that belongs in the Active-stage block (while in flight) or the commit (after).

---

## The phase plan (the forward-looking core)

One section per phase. While the phase is active, it holds the **stage table** and the **verbose
block for the one active stage only**.

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

<!-- ===== ACTIVE STAGE BLOCK — delete and collapse to a Shipped row the moment it ships ===== -->

#### X<n> — <name> (⏳ active)

- **Build:** concrete algorithms, reducer actions, component shapes, exact file paths.
- **Inherits:** what earlier stages already provide that this one builds on (don't re-derive).
- **Tests:** unit (reducer/selector/render) + integration (full flow) to write.
- **🚦 Gate:** the live end-to-end confirmation that proves it works — not just test-green. State
  whether a browser pass is required (per `CLAUDE.md`'s browser-automation policy) or the suite suffices.

<!-- ============================================================================================= -->

---

## When a stage is complete

A stage is done only when its **🚦 gate is met live**, tests are green, and typecheck/build are clean.
On completion, do all of this in the stage's own commit:

1. **Delete the verbose Active-stage block.** Replace it with **one row** in the Shipped table (see
   below), ≤2 sentences. The detailed authoring narrative goes in the **commit message**, not the doc.
2. **Rewrite the Status line** to show this stage shipped and name the next one.
3. **Update reference docs if structure changed** — a new router/endpoint/table/folder means
   `ARCHITECTURE.md` / `API_REFERENCE.md` / `DATA_MODEL.md` updates in the *same* commit (per `CLAUDE.md`).
4. **Commit code + plan-doc edit together**, referencing the stage ID and test counts.

### Shipped stages table (the collapsed record)

Everything done lives here as thin rows. This table only grows by one short row per stage — it must
never carry the paragraph that was in the Active block.

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| **X0** | Scaffolding: types + stubs + `it.skip` tests. Gate ✅. |
| **X1** | <what shipped, briefly>. NNN tests, typecheck/build clean. Gate ✅ (live-verified YYYY-MM-DD). |

> **Anti-bloat rule:** if a row needs more than two sentences to be useful, the missing detail is
> almost always "how it was implemented" — which belongs in the commit, reachable via `git log`. The
> plan doc answers *what exists* and *what's next*, not *how each thing was built*.

---

## How to collapse a phase when it's complete

When every stage in a phase has shipped, the phase is no longer forward-looking — it's context.
Collapse it so the doc stays oriented toward the *next* phase:

1. **Fold the phase to a summary section.** Replace the phase's stage table + any remaining prose with
   a single **`## Design Phase <X> reference — <Name> (shipped)`** section: one paragraph on what the
   phase delivered, and a pointer to the Shipped-stages table rows for stage detail. Keep only facts a
   *future* phase needs to build on (schema, reusable selectors, decisions locked).
2. **Promote anything durable to a reference doc.** If the phase established stable structure (a design
   token contract, a data-model addition, an API surface), move that into `DESIGN_SYSTEM.md` /
   `DATA_MODEL.md` / `API_REFERENCE.md` and leave a one-line pointer. Reference docs outlive plan docs.
3. **Move deferred items to the shared "Known debt" list** so they aren't buried in a collapsed phase.
4. **Update the Status line and the `## Next:` section** to point at the next phase.

### When the *whole feature* is complete

When there are no more planned phases:

1. Reduce the entire doc to: the Reference top-matter (still useful as living context), the collapsed
   per-phase summaries, and a final **Verification** section (how to confirm the whole feature
   end-to-end).
2. Consider moving the doc to `docs/complete/<feature>_plan.md` (the repo's convention for superseded/
   done plan docs) and leaving a pointer, so `docs/` shows only *active* plans.
3. Record the completion in project memory (`MEMORY.md`) with a one-line pointer to the plan doc's
   collapsed summary — so future sessions get the outcome without loading 900 lines.

---

## Standing sections (bottom matter)

- **## Known debt / deferred work (NOT yet built)** — the running non-goals list, added to as phases
  surface deferred work.
- **## Cross-references** — links to sibling plan docs and the reference docs this one writes into.
- **## Next:** — one line naming the next queued stage/phase and whether it's unblocked.

---

## Quick checklist per stage

- [ ] 🚦 gate met live (or suite-sufficient per policy); tests green; `npm run typecheck`/`npm run build` clean (`tsc -b`, not `--noEmit` — [it checks nothing here](DESIGN_SYSTEM.md)); `pytest` from repo root, ≥85% coverage.
- [ ] Verbose Active block **deleted**, collapsed to one Shipped-table row (≤2 sentences).
- [ ] Status line rewritten; `## Next:` updated.
- [ ] Reference docs updated *if* structure changed (same commit).
- [ ] Code + plan-doc edit committed together, stage ID + test counts in the message.
- [ ] If this was the phase's last stage: phase folded to a `(shipped)` summary; durable facts promoted
      to reference docs; deferred items moved to the Known-debt list.
