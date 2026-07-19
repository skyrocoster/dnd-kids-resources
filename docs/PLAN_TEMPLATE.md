# Plan Doc Template & Lifecycle

Copy this to `docs/plans/active/<area>-<outcome>.md` when starting an implementation outcome or cross-cutting phase.
It encodes the staged methodology from `CLAUDE.md` **plus the collapse discipline that keeps a plan
doc from growing unbounded**. An area guide is the durable router for a domain; this execution plan is
the temporary, forward-looking authorization to change it.

**The core rule:** the plan doc is a *forward-looking* working document, not a changelog. Detail is
verbose while a stage is being built, condensed to one row the moment it ships, and removed with its phase
when that phase is done. **The durable record of *how* a stage was built is its git
commit — never duplicate that prose into the plan doc permanently.** Important discoveries are different:
consolidate them into the plan's working context and affected future stages so a later context does not need
to rediscover the codebase.

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

### Discovery consolidation

Every stage informs later work before it ships. Treat the plan as the outcome-specific context packet for a
fresh executor, not a record of every command or implementation detail.

- Add durable discoveries to **Key facts / data facts**: confirmed code shapes, invariants, conventions,
  constraints, gotchas, and decisions that prevent rediscovery.
- Add confirmed extension points to **Reusable pieces (do not rebuild)** and deliberate non-work to **Known debt /
  deferred**.
- Revise every affected future stage's **Handoff facts** blockquote, **Read first**, **Build**, **Inherits**,
  **Expected touch set**, **Documentation impact**, **Tests**, or **Gate**. Do this even when the new fact comes
  from an implementation, integration, design, or documentation stage.
- Update the relevant canonical reference when the discovery establishes a durable API, data, architecture,
  design, testing, setup, or user-visible contract. Do not defer that required update to the final stage.
- Keep transient exploration, command output, and detailed implementation narrative in the commit rather than
  making the plan a diary.
- **Answer, don't point.** If a future stage's `Build` tells the executor to derive a value from the codebase
  ("the dominant existing value," "the current convention," "whatever the existing pattern is"), the stage that
  can already see that evidence must survey it and write the actual answer — the value, the count, the file list
  it came from — directly into that stage's `Build`/`Read first`/`Key facts`. A pointer back to "go grep it
  yourself" is not consolidation; it just moves the same exploration cost onto the next executor, one stage later.
- **A planned semantics change is a planned blast radius, survey it before the stage starts.** If a stage's
  `Build` calls for changing a shared component's *rendered contract* — ARIA role/attribute, DOM shape, class
  name, or default copy that other files assert against — the prior stage (or that stage's own `Read first` pass,
  before writing any code) must grep the whole tree for the old contract (e.g. `getByRole('option'`,
  `role="listbox"`, a literal default-copy string) and write the exact matching file list into that stage's
  `Expected touch set`, not just the component's own files and tests. A component rename or style migration
  rarely breaks callers; a semantics/markup change almost always does, and finding out via failing test runs one
  file at a time is the exploration cost this rule exists to front-load.
  - This applies even when the component being changed **predates the phase and was never itself stubbed** by an
    earlier stage. A future stage's `Build` naming a refactor target (e.g. "retain its current public API where
    practical") is itself the signal to run this survey the moment that target is named in the plan — do not wait
    until that stage is next-up. Concretely: grep every caller of the component being refactored (not just its own
    file and its own test file) and grep the whole tree for any test asserting its rendered contract (role, DOM
    shape, accessible-name computation). Write the caller list, the prop shapes actually in use across those
    callers, and any load-bearing test (file:line + what it asserts) directly into that future stage's `Read
    first`/`Build`/`Expected touch set` — this is often the single fact that determines the whole implementation
    (e.g. discovering a test asserts `getByRole('alertdialog', { name: <message> })` dictates that the refactored
    component needs a `role` prop and must not render duplicate title/body text).

Scaffolding has the highest discovery expectation because it normally surveys and prepares the most affected
files, but it follows the same rule as every other stage: consolidate its findings and revise later stages before
it is collapsed. When scaffolding's own touch set already spans the files a later stage would otherwise have to
grep (e.g. it stubs every component whose CSS a token-formalization stage will later derive values from), it must
run that survey once, while the evidence is already open, and hand the next stage numbers instead of file paths.
When scaffolding adds an `it.skip` seam, write the seam's real assertion body (render the real component/props,
assert the real expectation), not an empty callback — a later stage should only need to delete `.skip`, not author
the test from scratch. If the real assertion cannot be written yet because the contract itself is undecided,
say so explicitly in the seam's comment rather than leaving a silent empty function.

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

## Local ticket extension (optional)

Plan stages can be split into individual ticket files for fresh-context agents. This is entirely optional — the plan doc remains the source of truth.

### Folder layout

```
docs/plans/active/tickets/<area-outcome>/
  01-<StageID>-<slug>.md   # one file per un-shipped stage
  02-<StageID>-<slug>.md
```

### Ticket file shape

Each ticket file has these fields (derived mechanically from the stage's verbose block — never hand-edit out of sync):

- **Part of:** link back to the plan doc's exact stage anchor.
- **Blocked by:** the previous stage's ticket filename (stages ship in sequence) plus anything named in the phase's "Depends on / Depended on by" line. `None` if unblocked.
- **Status:** `ready` if Blocked-by is empty/all-deleted, else `blocked`.
- **What to build** — the stage's summary + Build.
- **Read first** — copied verbatim from the stage block.
- **Handoff facts** — copied from the stage's Handoff facts blockquote if the prior stage shipped; otherwise `Not yet available`.
- **Acceptance criteria** — one checkbox per concrete condition in Gate, plus one per Handoff fact.

### Tickets line

When tickets are generated, the plan doc's top matter gets a **Tickets:** line (right after the **Area guide:** line):

```md
- **Tickets:** `docs/plans/active/tickets/<area-outcome>/`
```

Regenerate tickets with `/to-tickets` any time the plan doc's stage breakdown changes. Never hand-edit a ticket's derived fields.

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

## Required model strength

Use a capability requirement, never a provider or model name. Select the lowest strength that can safely perform
the stage after reading its declared context.

| Strength | Use when |
|----------|----------|
| **Light** | The work is bounded and mechanical: inert scaffolding, isolated renames, straightforward documentation routing, or a narrow test seam. |
| **Standard** | The work requires ordinary implementation reasoning across a small, well-understood touch set and tests. |
| **High** | The work requires broad codebase synthesis, architecture or data-contract decisions, difficult debugging, sensitive migration, or a final cross-surface review. |

Raise the required strength when discoveries expand the risk or ambiguity of a later stage; record that change in
the affected future-stage table and block.

---

## The phase plan (the forward-looking core)

One section per delivery phase. While the phase is active, it holds the **stage table** and a **verbose block
for every stage that has not yet shipped** (the next stage and all planned stages after it). Shipped stages have
no block here — only a row in the Shipped table. Do not add a documentation-update stage to a delivery phase:
after all delivery phases, add the single plan-closeout phase shown below.

### Design Phase <X> — <Name>

One paragraph: what this phase delivers and why. **Depends on / Depended on by:** name the cross-doc
sequencing constraints ("do not start J3 before DP1 is committed").

| Stage | Required strength | Summary | Deliverables |
|-------|-------|---------|--------------|
| **X0 — Scaffolding** | Light | Types/stubs/placeholder CSS/`it.skip` tests, no implementation. Survey likely touch points and carry findings forward. | Stubs compile; app renders unchanged; later stages revised from confirmed findings. |
| **X1 — <name>** | Standard | One-line implementation intent. | Reducer/component/tests named. |
| **X2 — <name>** | Standard or High | One-line integration, migration, or review intent. | … |

**Sequencing:** X0 (when useful) → implementation/review stages. Add only the stages the outcome needs. After all
delivery phases ship and collapse, run the one plan-closeout documentation stage; it is the last stage of the entire
execution plan. Note any parallelism.

<!-- ===== VERBOSE BLOCKS — one per un-shipped stage, in order. Delete a block and collapse it to a
     Shipped row the moment that stage ships; the remaining blocks stay until their own turn. ===== -->

#### X<n> — <name> (next up)

> **Handoff facts** — written by the *previous* stage into this block before it ships. Gives the next
> executor the verified, current state of the codebase (schema shapes, endpoint signatures, reusable
> helpers and their signatures, enforced invariants, test counts, file layouts) so they do not re-derive
> what the prior stage already confirmed. Format as a blockquote at the top of the verbose block. If the
> previous stage's Completion edit did not write one, the next executor must re-derive from source — which
> is the failure mode this rule exists to prevent.

- **Read first:** the smallest exact set of plans, references, source files, and tests required before exploring.
- **Build:** concrete algorithms, reducer actions, component shapes, exact file paths.
- **Inherits:** what earlier stages already provide that this one builds on (don't re-derive).
- **Expected touch set:** exact files or directories expected to change; state why any broad directory is necessary.
  If `Build` changes a shared component's rendered contract (ARIA role/attribute, DOM shape, class name, default
  copy), name every consumer file whose tests assert against the old contract — surveyed per the Discovery
  consolidation rule below, not discovered by running the suite stage-by-stage.
- **Documentation impact:** exact reference and plan documents to update, or `None: <specific reason>`.
- **Tests:** unit (reducer/selector/render) + integration (full flow) to write, including exact commands.
- **Gate:** the live end-to-end confirmation that proves it works — not just test-green. State whether a browser
  pass is required (per `CLAUDE.md`'s browser-automation policy) or the suite suffices.
- **Discovery consolidation:** exact plan top-matter sections, future-stage blocks (including the next stage's
  **Handoff facts** blockquote), and canonical references to revise from expected findings; update the list with
  actual discoveries before this stage is collapsed.
- **Completion edit:** the Shipped-table row, status line, next-stage target, write **Handoff facts** into the
  next stage's verbose block (the blockquote described above), and any archival edit required when this stage
  ships.

#### X<n+1> — <name> (planned)

- **Read first / Build / Inherits / Expected touch set / Documentation impact / Tests / Gate / Discovery
  consolidation / Completion edit:** same nine-part shape as above, one block per remaining stage. Keep each as
  specific as the next-up block — future stages earn full detail, not a placeholder.

### Plan Closeout — Documentation Update

Add this as the sole final phase after every delivery phase has shipped and been removed. It has exactly one stage:
the final stage of the entire execution plan. It reconciles and validates the documentation work already completed
with each delivery stage, then archives the completed plan.

| Stage | Required strength | Summary | Deliverables |
|-------|-------------------|---------|--------------|
| **X<n> — Documentation update** | Standard | Reconcile accumulated plan context and complete the documentation workflow. | Canonical references, routing, validation, and archival complete. |

#### X<n> — Documentation update (final stage of the plan)

- **Read first:** `CLAUDE.md`, `docs/README.md`, the owning area guide, this plan, `docs/PLAN_TEMPLATE.md`,
  `docs/TESTING.md`, `scripts/check_docs.py`, every reference named by prior stages, and relevant workflow/PR files.
- **Build:** Reconcile the plan's accumulated Key facts, reusable pieces, debt, shipped rows, and future-stage
  handoffs with the code that shipped. Complete every outstanding named canonical-reference update, refresh
  generated inventories when their source contracts changed, update area-guide and manifest routing, and prepare
  the plan archive.
- **Inherits:** all prior-stage documentation-impact edits and discovery consolidations; this stage verifies and
  closes them, rather than deferring implementation-stage documentation.
- **Expected touch set:** this plan, its area guide, `docs/README.md`, every outstanding named canonical reference,
  generated references when applicable, and the archive/redirect location.
- **Documentation impact:** list the exact documents being reconciled. `None` is invalid for this final stage.
- **Tests:** run the documentation checker through the repo-local virtualenv (`.venv\Scripts\python.exe scripts/check_docs.py --check`
  on Windows, `.venv/bin/python scripts/check_docs.py --check` on POSIX); run the corresponding `--base <base-ref>`
  command when a valid base ref is available; run any documentation-validator tests changed by this outcome.
- **Gate:** A fresh reader can route from `CLAUDE.md` through `docs/README.md`, the area guide, and the current plan
  context without rediscovering essential facts. Documentation checks and applicable tests pass.
- **Discovery consolidation:** promote remaining durable facts to the appropriate canonical reference or retained
  plan top matter before archival; no unprocessed discovery remains only in a shipped-stage block or commit.
- **Completion edit:** collapse this stage, mark the outcome complete, archive the plan, update the area guide and
  manifest, and create a redirect only for a known inbound link.

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
4. **Consolidate discoveries before deleting the verbose block.** Update plan top matter, all affected future-stage
   blocks, and canonical references as required by the Discovery consolidation rule. Then re-read this stage's own
   **Discovery consolidation** line verbatim, as a checklist, and confirm each location it names — by name, not by
   category — actually has a diff. "I updated a canonical reference" does not satisfy a line that also names the
   plan's own **Reusable pieces** section or a specific future-stage block; each named target needs its own edit.
   A stage whose Discovery consolidation line names three places and whose diff touches one is not consolidated,
   even if gates are green and the stage otherwise looks finished.
5. **Write handoff facts into the next stage's verbose block.** Add or update the `> **Handoff facts**`
   blockquote at the top of the next stage's verbose block with the verified current state: exact schema shapes,
   endpoint signatures, reusable helpers and their signatures, enforced invariants, test counts, and file layouts.
   This is the primary mechanism for passing confirmed context forward — the next executor reads these instead of
   re-exploring the codebase.
6. **Commit code + plan-doc edit together**, referencing the stage ID and test counts.
7. **If a ticket file exists for this stage**, delete it. If the next stage's ticket exists, update its Handoff facts section to match what was just written into the plan doc's next-stage block.

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

When every stage in a delivery phase has shipped, remove the phase so the plan is clean for the next forward-looking
phase. Each stage has already completed its declared documentation impact and discovery consolidation. Its concise
stage rows remain in the Shipped-stages table; the commit history is the record of implementation detail.

1. **Delete the phase section.** Remove its overview, stage table, sequencing, and any active-stage block.
   Do not leave a shipped-phase summary section behind.
2. **Promote durable facts to top matter or a reference doc.** Keep only facts a future executor needs in
   `Reusable pieces`, `Key facts`, or the appropriate `DESIGN_SYSTEM.md` / `DATA_MODEL.md` /
   `API_REFERENCE.md` reference.
3. **Move deferred items to the shared "Known debt" list** so they are not buried in a completed phase.
4. **Update the Status line and the `## Next:` section** to point at the next phase, or the final Plan Closeout
   phase when all delivery work is complete.

### When the *whole feature* is complete

When there are no more planned delivery phases:

1. Add the one **Plan Closeout — Documentation Update** phase if it is not already present, then complete its sole
   final stage, including its fresh-reader routing and documentation checks.
2. Reduce the entire doc to: the Reference top-matter (still useful as living context), the Shipped-stages
   table, and a final **Verification** section (how to confirm the whole feature end-to-end).
3. Move the doc to `docs/complete/<area>-<outcome>.md`. Update the area guide to `None` or its next active
   plan, and update `docs/README.md` in the same change set. Leave a redirect stub only when a known inbound link
   must survive.
4. Delete the now-empty `docs/plans/active/tickets/<area-outcome>/` directory (all stages shipped → no ticket files remain; anything leftover is a bug in the sync step, not something to archive).

---

## Standing sections (bottom matter)

- **## Known debt / deferred work (NOT yet built)** — the running non-goals list, added to as phases
  surface deferred work.
- **## Cross-references** — links to sibling plan docs and the reference docs this one writes into.
- **Area guide line** — immediately after the status block, linking to the guide that owns this work.
- **## Next:** — one line naming the next queued stage/phase and whether it's unblocked.

---

## Quick checklist per stage

- [ ] 🚦 gate met live (or suite-sufficient per policy); tests green; `npm run typecheck`/`npm run build` clean (`tsc -b`, not `--noEmit` — [it checks nothing here](DESIGN_SYSTEM.md)); Python-backed checks run from the repo root via the repo-local virtualenv (`.venv\Scripts\python.exe -m pytest` on Windows, `.venv/bin/python -m pytest` on POSIX), ≥85% coverage.
- [ ] Important discoveries consolidated into plan top matter, every affected future-stage block, and canonical
      references where they establish a durable contract. No later executor must rediscover a confirmed fact.
- [ ] **Handoff facts** written into the next stage's verbose block as a blockquote — schema shapes, endpoint
      signatures, reusable helpers, invariants, test counts, and file layouts confirmed by this stage are
      captured so the next executor does not re-derive them.
- [ ] Re-read this stage's own Discovery consolidation line after making the edits above and checked off each
      named target individually (`git diff` against that exact file/section) — not inferred from having done
      "something in that category."
- [ ] This stage's verbose block **deleted**, collapsed to one Shipped-table row (≤2 sentences); the
        un-shipped stages' verbose blocks left in place.
- [ ] Status line rewritten; `## Next:` updated.
- [ ] Exact documentation-impact requirement completed, or its specific `None:` rationale remains valid.
- [ ] Code + plan-doc edit committed together, stage ID + test counts in the message.
- [ ] This stage's ticket file (if any) deleted; the next stage's ticket file (if any) updated with the Handoff facts just written.
- [ ] If this was a delivery phase's last stage: phase section deleted; durable facts promoted to top matter or
        reference docs; deferred items moved to the Known-debt list. Add the one Plan Closeout phase only after all
        delivery phases are complete; its documentation-update stage archives the entire plan.
