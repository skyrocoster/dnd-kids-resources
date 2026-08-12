# Coordinator Workflow Rebuild

> **Purpose.** This document is a briefing for a fresh AI that will continue the rebuild of the
> D&D Kids Resources coordinator. It captures everything we have learned from a roleplay-driven
> design session and lays out the proposed workflow as a single decision tree. Treat it as
> authoritative for the rebuild; AGENTS.md and the existing skills describe the **current**
> workflow this rebuild replaces.
>
> **Audience.** A fresh AI reading this should be able to (a) understand what the current
> workflow is and what's broken about it, (b) operate as the new coordinator under the proposed
> workflow, (c) stress-test open questions with new scenarios, and (d) hand back a tested
> revision of this document.
>
> **Out of scope.** This doc does not redefine the repository's area guides, plan templates,
> or test contracts. Those are documented elsewhere and stay as-is. The rebuild only changes
> how the coordinator routes work, not what good work looks like.

---

## 1. Baseline — the current workflow

The current coordinator (see `AGENTS.md` and `.opencode/agents/coordinator.md`) sits on top of:

- **13 skills** in `.opencode/skills/`: `master-plan`, `create-plan`, `to-plan`, `to-orders`,
  `author-workorders`, `dispatch-orders`, `implement-order`, `implement-quick`,
  `quick-reconcile`, `reconcile`, `table-test`, `ux-design`, and one **empty `plan/`**
  directory that should be removed.
- **11 subagents** in `.opencode/agents/`. Notable redundancies:
  - `implement-order-deepseek.md` and `implement-order-deepseek-pro.md` are
    byte-identical (same model, same prompt, same permissions).
  - `test-validator.md` covers automated tests + browser; `browser-automation-luna.md`
    covers browser-only. Overlap is real.
  - `reconcile` (full closeout, auto-commit on green) and `quick-reconcile` (direct-slice
    closeout, no auto-commit) differ mostly in commit authority and the stage suite.
- **Routing paths the user is currently expected to know about:**
  - Master-plan slice → `to-plan` → either direct delivery (no Plan) or focused Plan
  - Free-form feature → `create-plan` → focused Plan
  - Focused Plan → `to-orders` → work orders → `dispatch-orders` → executors → `reconcile`
  - Direct slice → `quick-executor` → `quick-reconcile`
  - User requests direct implementation → "bounded quick mode"

## 2. What's broken

The rebuild addresses five concrete problems we found:

1. **Late-binding routing.** The coordinator often writes a full Plan, compiles it into
   work orders via `to-orders`, and only at that point discovers the slice was a single
   atomic change the compiler could have implemented directly. The Plan tax is paid before
   the truth is known.
2. **Skill surface is too flat.** Every workflow step looks like a separate skill the user
   must know about. The user should not have to choose `master-plan` vs `create-plan` vs
   `to-plan` vs "just tell me what to do." The coordinator should.
3. **Redundant verification at closeout.** `quick-reconcile` still runs `stage_check.py`
   (full pytest + full vitest + lint + build + check_docs), which is overkill for a one-line
   CSS fix whose focused test already proved the change is safe.
4. **The "verify the problem exists" gate is fragile.** When we asked the coordinator to
   read the file before fixing, it looked at the code and declared "the code already does
   what you asked for" — but the bug was real, hidden in an asymmetric pattern across three
   similar-looking lines. A literal read missed it; a structural read would not.
5. **Human acceptance is a state, not a prompt.** The workflow has `awaiting human
   acceptance` as a slice-receipt state but no structured way to present what the human
   should actually look at and operate. Acceptance becomes vague, or it skips.

## 3. Target architecture (the rebuild)

The coordinator becomes the **single entry point**. The user says any of:

- "I'd like to add X feature"
- "Y isn't working"
- "Z needs a facelift"
- "fix this typo"
- "do the thing in FL-09"

…and the coordinator, with no further user routing, decides what to do. Internally the
coordinator runs this loop:

```
Receive free-form user message
        │
        ▼
Triage signal — bug / feature / refactor / question
        │
        ▼
Recover facts from context (explore repo, read files, check existing plans)
        │
        ├─ Decision needed that is unrecoverable → ASK ONE NARROW QUESTION
        │
        ▼
Apply "verify the problem exists" gate
        │
        ├─ Code already matches description → STOP and surface (with screenshot ask)
        ├─ Different surface than user described → clarify
        └─ Real bug / real gap → continue
        │
        ▼
Route: master-plan / focused-Plan / immediate execution
        │
        ▼
If focused Plan → per-stage route: work order / immediate execution
        │
        ▼
Dispatch (brief or orders)
        │
        ▼
Validate (focused check + structural checks)
        │
        ▼
Closeout (full / focused / minimal)
        │
        ▼
Present human-acceptance handoff checklist (when applicable)
        │
        ▼
Reconcile slice / Plan on user acceptance (when applicable)
```

The user is never in the routing loop. The coordinator is.

---

## 4. The decision tree (operational guide)

This is the single source of truth for routing. Every branch includes both the trigger and
the action. Worked examples follow the tree.

### 4.1 Initial signal triage

```
User said: <free-form message>

Q1. Is there a coherent target?
├─ Q1a. Is the target named or implied (file, route, component, plan-slice ID)?
│   ├─ Yes → continue to Q2 with target in hand
│   └─ No  → ASK ONE QUESTION with the candidate shortlist (cheap explore first)
└─ Q1b. Is the request purely informational ("how does X work?", "what's in the plan?")
    └─ Yes → answer directly, no routing needed

Q2. Is the request a bug, feature, refactor, or meta?
├─ Bug       → go to 4.2 (verify-the-problem-exists gate, then 4.3 routing)
├─ Feature   → go to 4.3 (routing; 4.2 gate is trivial because no code yet)
├─ Refactor  → go to 4.3 (treat as feature with no human-visible behavior change)
└─ Meta      → answer directly

Q3. Are there any decisions that are unrecoverable from context?
├─ Yes → ASK ONE QUESTION at a time (per the `grilling` skill)
└─ No  → continue
```

### 4.2 The "verify the problem exists" gate (bug fixes only)

```
User describes a desired behavior or a bug.
        │
        ▼
Read the relevant file(s). Read every place that renders or computes
the same kind of thing — don't just read the obvious one.
        │
        ├─ Code already matches description (literal read)?
│   │
│   ├─ Structural check: does EVERY place rendering this kind of
│   │  thing do it the same way?
│   │   ├─ All consistent → code matches description. Tell the user.
│   │   │  Three sub-cases:
│   │   │   1. User is looking at a different surface.
│   │   │   2. There's a regression the literal read missed.
│   │   │   3. User's description was slightly off — confirm intent.
│   │   └─ At least one is inconsistent → the bug is the inconsistency.
│   │      That's a real bug; the user was right. Route it.
│   └─ Consistent AND real → STOP and report to user.
│
└─ Code does NOT match description → real bug or real gap.
   Continue to 4.3 routing.
```

**Why the structural check matters.** In our session, the user said "the sidebar text is
squished when collapsed." Reading `AppShell.tsx` literally, the link items at line 74 used
`collapsed || isEncounterRunner ? 'visually-hidden' : undefined` — and the brand at line 50
used *only* `isEncounterRunner`. Same shape, different condition. A literal read stopped at
"there's a `visually-hidden` class, so text must be hidden." A structural read noticed the
asymmetry and saw the bug.

### 4.3 Routing: master-plan / focused-Plan / immediate execution

```
After 4.1 and 4.2 have been satisfied, judge the request's scope.

A. Is there an existing master-plan slice that covers this?
   ├─ Yes → use it; the slice ID defines the scope. Go to B.
   └─ No  → continue.

B. Is the request a single human-visible outcome or a cross-cutting
   redesign / multi-feature direction?
   ├─ Single outcome                          → focused Plan or direct
   └─ Cross-cutting / multi-feature          → master-plan first

C. For a focused Plan candidate, apply the direct-delivery gate:

   Direct delivery (no Plan) is correct when ALL of:
   - the request is one atomic logical change
   - product behavior, UX, exclusions, acceptance, and ownership are settled
   - exact authorized paths, known facts, edit intent, and one focused
     check can be verified cheaply
   - no design / architecture / API / data / migration / compatibility /
     diagnosis / contract decision remains
   - failure can safely escalate to a focused Plan without widening
   - no durable coordination needed while queued or paused

   File count alone is not the test. A small cross-file
   source/test/style edit may be atomic; one file containing unresolved
   behavior is not.

   └─ All conditions met → DIRECT execution
       Dispatch `quick-executor` with a brief.
       On success → minimal `closeout` (4.4).
       On failure → escalate to focused Plan (preserve evidence).

   └─ Any condition unmet → FOCUSED PLAN
       Write the Plan. For each stage, apply 4.3.1 below.
       On success → focused or full `closeout` depending on scope.
```

### 4.3.1 Per-stage routing inside a focused Plan

```
For each stage in the focused Plan:

1. Could the coordinator compile this stage's intent into one brief right now
   with no new exploration, no new decisions, and one focused check?
   ├─ Yes → mark as `quick` stage. Dispatch via `quick-executor`.
   │        No work-order file, no separate brief-to-orders compile.
   │        Stage's "Plan record" is the receipt.
   └─ No  → mark as `ordered` stage. Compile via `to-orders` (work orders).
            Each work order dispatches to `implement-order`.

2. A stage should be `quick` only when:
   - authorized paths are already known
   - the change is one logical edit
   - no sequencing or independently useful substage
   - failure can safely escalate without widening the brief

3. A stage should be `ordered` when:
   - it spans > 1 distinct area of the codebase
   - it has cross-cutting contract impact
   - it needs multiple coordinated commits across files
   - it benefits from explicit per-order verification

4. Decide per-stage BEFORE writing any work order. Don't write a Plan
   assuming every stage will be ordered; the reverse.
```

### 4.4 Closeout tier selection

```
After implementation passes its focused check:

Q1. Did this change touch a contract (API route, schema field, design
    token, exported symbol, router)?
├─ Yes → FULL closeout
│        Run `scripts/stage_check.py` (full suite + coverage gate).
│        Update canonical references (API_REFERENCE.md, DATA_MODEL.md,
│        ARCHITECTURE.md, DESIGN_SYSTEM.md, TESTING.md) if needed.
│        Update the master-plan slice receipt or Plan Shipped row.
│        Commit when green.
│
└─ No  → Q2.

Q2. Did this change touch a documentation-managed surface
    (anything `check_docs.py` would care about)?
├─ Yes → FOCUSED closeout
│        Run `check_docs.py --check` (no `stage_check.py`).
│        Auto-refresh generated blocks per rule 4.4.1 below.
│        Update doc references for the changed surface only.
│        Commit when green.
│
└─ No  → MINIMAL closeout
         Run `check_docs.py --check` (cheap universal gate).
         Commit on green. No canonical-ref updates. No plan archiving.
         No master-plan receipt update.
         If the change is a master-plan slice, update the slice
         receipt row to `Implemented; awaiting human acceptance`.
```

**Default for the rebuild.** Most direct slices land in the MINIMAL tier. The FOCUSED tier
exists for changes that touched docs (regenerated blocks, area-guide ownership, etc.). The
FULL tier exists for Plan-stage closeouts and contract changes.

### 4.4.1 Auto-refresh of generated blocks

```
When `check_docs.py --check` fails on a stale generated block:

1. Inspect the dirty diff on the generated file. Is the new content
   between `GENERATED:<marker>:START` and `GENERATED:<marker>:END`
   markers, and does it look like what regeneration would produce?
   ├─ Yes (partial regeneration) → run `check_docs.py --write-generated`
   │   to complete. Re-run `--check`.
   └─ No  (looks like a hand-edit inside a generated block)
       → STOP. Don't regenerate; that would overwrite the user's work.
       Ask the user how to proceed.

2. Generated-block refresh is always safe when:
   - the dirty state was already a partial regeneration, OR
   - the file is untracked / newly created (no prior version to clobber)

3. Generated-block refresh is NEVER safe when:
   - the dirty state contains hand-written prose inside the markers
   - the dirty state contains a non-regeneration-shaped diff
     (e.g., renamed columns, reordered rows)
```

### 4.4.2 Closeout policy on dirty worktree

```
At any closeout tier, if files outside the brief's AUTHORIZED PATHS are dirty:

1. Generated blocks → handle per 4.4.1.
2. Hand-edits or source files → leave them. Don't widen the brief,
   don't fix, don't commit them. They're the user's problem, not the
   closeout's.
3. If the dirty state is from the brief itself → fix or escalate.
4. If `check_docs.py --check` is still red after handling 1-3 → STOP
   and report to user. Don't commit a small fix past a red check.

5. The commit step has an additional rider: don't auto-commit small
   fixes unless the user has explicitly asked. Reconcile is the only
   auto-commit context (Plan-stage closeout). Everything else reports
   state and waits.
```

### 4.5 Human acceptance handoff

```
After closeout, when the change is user-visible:

1. Produce a structured "Expected result" checklist from the Plan's
   human-visible outcome, acceptance script, included scope,
   exclusions, and actual shipped behavior.

2. Group the checklist by states and transitions the human can
   reproduce. For the FL-09 example:
   - nothing selected
   - something selected
   - wide presentation
   - constrained presentation
   - state continuity across select / clear / reselect / resize /
     navigate / reopen

3. Name visible controls and content that must remain present and
   reachable. ("Fit button is reachable," "the selected target's name
   remains visible").

4. Include applicable pointer / touch / keyboard behavior.

5. Explicitly list nearby behavior that the stage did NOT change, so
   the user does not evaluate or accidentally authorize adjacent scope.

6. Use direct observable language:
   - "the map expands into the released space"
   - "Fit remains reachable"
   - "the selected target's name remains visible"

   NEVER use implementation language:
   - "the InspectorPanel component renders with grid-template-columns: 1fr"
   - "the `.map-stage` element gets the `is-collapsed` class"

7. Call out any incomplete automated or browser evidence separately.
   Never disguise it as human acceptance.

8. Ask the user to accept only after they know exactly what
   successful behavior looks like. Reconcile only after explicit
   acceptance.
```

---

## 5. Worked examples

### 5.1 Brand text in collapsed nav (the case that surfaced the asymmetric-bug gate)

**User said:** "The text in the sidebar is squished when it's collapsed."
**Coordinator move:**
1. Q1a: target not named → explore first → ASK ONE question with the candidate shortlist.
2. User: "the main one on the shell, I just want it to go to an icon instead of displaying text."
3. Q2: bug, target named.
4. 4.2 gate: read `AppShell.tsx` AND structurally compare all places that render text with a
   `visually-hidden` condition. The brand at line 50 used `isEncounterRunner ? '...' : undefined`;
   the link items at line 74 used `collapsed || isEncounterRunner ? '...' : undefined`.
   Asymmetry → real bug.
5. 4.3 routing: one-line className change in one component → DIRECT execution.
6. 4.4 closeout: no contract change, no docs touched → MINIMAL.
7. 4.5 handoff: not user-visible (only affects hidden state of brand text in already-collapsed
   nav). Skip the handoff; the focused test is the receipt.

### 5.2 Hypothetical — "Add export to CSV for the encounter runner"

**User said:** "I want to add CSV export to the encounter runner."
**Coordinator move:**
1. Q1a: target named (encounter runner).
2. Q2: feature.
3. Explore: find `EncounterRunner`, its state, the backend encounter endpoint. Check for
   existing export utilities.
4. Q3 decisions: column selection? file dialog vs download? naming? — ASK ONE QUESTION at a
   time until decisions are settled.
5. 4.3 routing: cross-cutting (backend endpoint + frontend trigger + possibly a new route),
   not atomic. Most likely → FOCUSED PLAN with stages. Possibly master-plan slice if the
   master plan covers encounter feature expansion.
6. 4.3.1 per-stage: e.g., "add backend CSV serializer" → `ordered` (multiple files,
   contract impact); "add export button" → `quick` (single component); "add download
   trigger" → `quick` (single file, single check); "add tests" → `quick`.
7. 4.4 closeout: contract change (new export format) → FULL.
8. 4.5 handoff: user-visible → produce the checklist with column names, file naming,
   pointer behavior, and explicit "did not change: print view, share link".

---

## 6. Open questions

These are the things this doc does NOT yet settle. A fresh AI should test them with new
scenarios.

1. **Stage-level routing granularity.** Should stages be `quick` / `ordered` decided at
   Plan-review time, or at compile time when the compiler sees the stage? Both options are
   defensible. Test both.
2. **Master-plan threshold.** When does a request become a master-plan candidate vs a focused
   Plan? Current rule: "cross-cutting / multi-feature direction." Test borderline cases.
3. **`work-order-author` subagent.** Worth keeping as a delegation target, or collapse into
   the coordinator directly? It saves the coordinator's own-read budget but adds a hop.
4. **Empty `plan/` skill directory.** Delete it. It's orphaned.
5. **Duplicated executor agents.** `implement-order-deepseek` and `...-pro` are identical.
   Collapse to one. If a "stronger executor" variant is ever needed, design it then.
6. **Two browser verifiers.** `test-validator` and `browser-automation-luna` overlap. Decide
   whether browser-only verification has a distinct enough use case to justify the split.
7. **`author-workorders` skill vs `to-orders` skill.** Same job, optional delegation.
   Decide whether to keep both or fold into one skill with an optional delegation flag.
8. **Acceptance checklist format.** Should the handoff live in chat, in a doc, or in the
   Plan itself? Test which one the user can actually use.

---

## 7. Success criteria for this rebuild

A coordinator operating under this doc is "working" when:

- The user says a free-form thing, and the coordinator picks the route without asking the
  user to choose between skills, plans, or paths.
- A one-line bug fix never goes through a full Plan stage.
- A multi-feature cross-cutting redesign never lands as a one-shot brief.
- `check_docs.py --check` runs on every closeout; `stage_check.py` runs only when a contract
  changed.
- Generated blocks get refreshed when they're a partial regeneration, never when they're
  hand-edits.
- Pre-existing dirty worktree state never gets clobbered by a brief or its closeout.
- The user gets a structured acceptance checklist for every user-visible change, written in
  observable language, before being asked to accept.
- Small fixes don't auto-commit. The user says "commit" (or it's part of a Plan stage) and
  only then does it commit.

---

## 8. What the next session should do

The doc is ready to be a brief. A fresh AI should:

1. Read this entire doc.
2. Read `AGENTS.md` and the relevant skill files (`.opencode/skills/implement-quick/`,
   `.opencode/skills/to-orders/`, `.opencode/skills/quick-reconcile/`,
   `.opencode/skills/reconcile/`) to understand the existing primitives the rebuild sits on.
3. Run 3-5 new roleplay scenarios with the user, varying the request type:
   - One bug in a different area (not AppShell).
   - One feature that might be Plan-sized.
   - One refactor with a clear scope.
   - One meta question ("what about skill X?").
   - One ambiguous request ("this feels slow").
4. For each scenario, walk the decision tree and note where it breaks or surprises.
5. Update this doc with the new findings and the refined tree.
6. Hand back to the user for sign-off before any actual workflow cutover.
