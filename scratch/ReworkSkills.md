# Rewrite the grill/wayfinder/to-spec/to-tickets skill pack to fit this repo's workflow

Local files, no `gh` tracker.

## Context

`/grill-me`, `/grill-with-docs`, `/grilling`, `/wayfinder`, `/to-spec`, and `/to-tickets` are a generic, portable skill pack (all six live at `.agents/skills/<name>/SKILL.md`, symlinked into `.claude/skills/<name>/`).

`/wayfinder` and `/to-tickets` assume a GitHub-Issues-shaped tracker (native blocking, assignee-as-claim, labels). The user does not want this pipeline to depend on `gh` — everything should be local markdown files in the repo, and folder restructuring to support that is acceptable.

Separately, this repo already has its own planning convention — `docs/PLAN_TEMPLATE.md` — where a plan doc's un-shipped stage blocks (Read first / Build / Inherits / Expected touch set / Documentation impact / Tests / Gate / Handoff facts) are already sized and shaped almost exactly like a ticket. Running the generic pack as-is duplicates that structure instead of composing with it.

Six skills also reference dependencies that don't exist here: `/domain-modeling` (this repo's real mechanism is `CONTEXT.md` + `docs/adr/`, per `docs/agents/domain.md`) and `/setup-matt-pocock-skills` (no tracker setup needed or wanted now).

**Goal:** rewrite all six skills to replace every GitHub-Issues touchpoint with local markdown files under `docs/plans/`, and add the step the user asked for: splitting a plan doc's stages into small local ticket files a fresh low-context agent can open cold. `docs/agents/issue-tracker.md` (the project's actual bug/feature GitHub tracker, used by the separate triage/qa skills) is untouched — this is only about the planning pipeline.

## New local folder layout

```
docs/plans/
  mapping/<area-outcome>/    # wayfinder: pre-plan decision maps (temporary, deleted once superseded by a plan doc)
    MAP.md
    tickets/
      01-<slug>.md           # research / prototype / grilling / task tickets
  active/<area-outcome>.md   # plan doc — SAME location/shape as today, PLAN_TEMPLATE-governed
  active/tickets/<area-outcome>/
    01-<StageID>-<slug>.md   # one file per un-shipped stage, derived from the plan doc
  complete/<area-outcome>.md # archived plan — unchanged
```

**Verified safe:** `find_active_plans()` uses non-recursive `active_dir.glob("*.md")`, so the new `docs/plans/active/tickets/` subdirectory is invisible to plan-file discovery — no risk of a ticket file being mistaken for a plan doc. `check_local_markdown_links` does `docs_dir.rglob("*.md")` (excluding `complete/` archive), however, so it checks links inside ticket and map files for free — a useful bonus that keeps handoff links honest, not something to suppress.

**Add one line** to `docs/README.md`'s `scratch/` exclusion line: `docs/plans/active/tickets/` and `docs/plans/mapping/` hold derived, disposable working artifacts for the local ticket workflow (regenerated from their source plan/map, no manifest row needed). Mirrors how `scratch/` is called out today, except these ARE meant to be read/updated by AI as part of the workflow.

## Local replacements for tracker mechanics

- **Blocking edges** → a ticket's **Blocked by:** field lists other ticket filenames. Unblocked = every listed file has already been deleted (its stage shipped) or doesn't exist yet. No blocking UI — the frontier is "tickets whose blockers no longer exist as files."
- **Claiming** → a **Claimed by:** field fills in with a short session/date tag before starting, so concurrent sessions can see a ticket is taken.
- **Labels** (ready-for-agent etc.) → a **Status:** field on the ticket: `blocked` / `ready` / `in_progress`. No triage vocabulary (that stays GitHub-only for triage/qa), just a plain word.
- **Closing an issue** → deleting the ticket file once its stage ships (git history is the record; the stage's verbose block is deleted from the plan doc too).

## Per-skill rewrite

### 1. `grilling` — unchanged, already correct.

### 2. `grill-me` — unchanged, delegates to `/grilling`.

### 3. `grill-with-docs`

**Currently:** Run a `/grilling` session, using the `/domain-modeling` skill. — `/domain-modeling` doesn't exist here.

**Rewrite:** run `/grilling`, and as decisions land, update `CONTEXT.md`'s glossary and create/update ADRs in `docs/adr/` per `docs/agents/domain.md`.

### 4. `wayfinder` — mechanical swap: GitHub map/tickets → local MAP.md + local ticket files

Keep the whole decision-mapping shape (destination → frontier → tickets → fog of war → out). The mechanism changes:

- The map is `docs/plans/mapping/<area-outcome>/MAP.md` (same body sections: Destination, Not yet specified, Out of scope) instead of a labelled GitHub issue.
- Tickets are child files under `docs/plans/mapping/<area-outcome>/tickets/`, numbered 01-, 02-, ... in creation order, each carrying **Type:** research|prototype|grilling|task, **Blocked by:**, **Claimed by:**, **Status:**, and the description. This mirrors the GitHub child-issue/label/blocking mechanics 1:1 per the "Local replacements" section above.
- "Refer by name" section: replace "every map and ticket is an issue" with "every map and ticket is a file — refer to it by its title, not its filename/number" (01, 02, 03 is as illegible as #42, #43).
- Resolution step: instead of "comment, close the issue," write the answer directly into the ticket file under a `## Answer` heading, then delete it and incorporate into MAP.md's Decisions-so-far (the same way).
- Drop the `/setup-matt-pocock-skills` and the "tracker-specific... consult the tracker doc" indirection entirely — there is one tracker now (local files), described inline.
- Replace `/domain-modeling` dependency with `grill-with-docs`'s CONTEXT.md/ADR mechanism.
- When a map's destination is implementation work in this repo, its resolution is: write a new `docs/plans/active/<area-outcome>.md` via the rewritten `to-spec` (below). Once that plan doc exists, archive the map — delete `docs/plans/mapping/<area-outcome>/`. Remaining unresolved tickets should already be zero, since charting is "done when the way is clear."
- Drop hard dependencies on `/research`, `/prototype`, `/implement` (not present locally) — fall back to a direct Explore-driven investigation or a quick draft/branch when the named skill doesn't exist.

### 5. `to-spec` — retarget output from a spec issue to a `docs/plans/active/*.md` plan doc

(Same as previously scoped — this skill was never GitHub-issue-dependent; in the redesign, it targets the plan doc directly.)

- Problem/Solution → plan's "What the feature is."
- User stories → plan's stage list (each stage = a demoable slice).
- Implementation details → "What it touches" + "Reusable pieces" top-matter, and each stage's Build.
- Testing decisions → plan's Tests sections.
- Out of scope → plan's "Known debt / deferred work."
- Must include the **Area guide:** `[...]` line (create a stub area guide first if none exists) — maps to PLAN_TEMPLATE.md's "Area guides and focused plans."
- Every un-shipped stage gets the full nine-part verbose block — this is what makes stage → ticket extraction mechanical, not another synthesis pass.
- Keep the seam-check step (sketch test seams, confirm with the user, prefer fewest/highest-leverage).
- Drop the tracker-publish step and the ready-for-agent label entirely — publishing tickets is now `to-tickets`'s job, and it's local-file, not tracker.

### 6. `to-tickets` — full rewrite: plan-doc stages → local ticket files

**Input:** a `docs/plans/active/<area-outcome>.md` plan doc (path or area name).

**Process:**

1. Read the plan doc (next + all planned, across all open phases), extract mechanically — the verbose block already has everything:
   - **Filename:** `docs/plans/active/tickets/<area-outcome>/<NN>-<StageID>-<slug>.md`, NN in ship order.
   - **## What to build** — the stage's summary + its Build.
   - **## Read first** — copied verbatim from the stage block.
   - **## Handoff facts** — copied from the stage's Handoff facts blockquote if the prior stage shipped; otherwise `Not yet available` (written when the blocking stage ships).
   - **## Acceptance criteria** — one checkbox per concrete condition in Gate, plus one per Handoff fact.
   - **Blocked by:** — the previous stage's ticket filename (stages ship in sequence within a phase) plus anything named in the phase's "Depends on / Depended on by" line; `None` if unblocked.
   - **Status:** — `ready` if Blocked-by is empty/all-deleted, else `blocked`.
   - A link back to the plan doc's exact stage anchor (`docs/plans/active/<area-outcome>.md#<stage-id>`). Payoff: a fresh agent opens the ticket, follows the link, lands on that stage's own context in the plan, mirroring `@` mention convention.
2. Write all ticket files in one pass, in ship order.
3. Add a **Tickets:** line to the plan doc's top matter (right after the Area guide line) pointing at `docs/plans/active/tickets/<area-outcome>/` so a reader of the plan knows tickets exist and where — updated whenever `to-tickets` regenerates.
4. Note (and rely on) PLAN_TEMPLATE.md's updated "When a stage is complete" checklist (see below) to keep tickets in sync as stages ship — `to-tickets` itself is only invoked to generate/regenerate, not to babysit every stage completion.
5. Quiz the user on cross-phase blocking (a Build broad enough it might really be two tickets) — the plan doc's own stage boundaries are the slicing done once at planning time.
6. Keep the wide-request warning, reframed as a signal that the plan doc under-sequenced a stage, not something patched at ticket time.

**Drop entirely:** the GitHub issue template, native blocking, the ready-for-agent label, `/setup-matt-pocock-skills`.

## PLAN_TEMPLATE.md updates

Add a new section (after "Multiple active plans", before "What to look at during a phase") documenting the optional local-ticket extension:

- The folder layout (`docs/plans/active/tickets/<area-outcome>/`) and the ticket file shape (What to build / Read first / Handoff facts / Acceptance criteria / Blocked by / Claimed by / Status).
- That tickets are regenerated with `to-tickets` any time the plan doc's stage breakdown changes; never hand-edit a ticket's derived fields out of sync with the plan (the plan doc stays the source of truth, same as the ①②③ state model already governs the plan itself).
- The **Tickets:** line in the plan's top matter.

Update "When a stage is complete" (completion checklist) to add one step:
> If a ticket file exists for this stage, delete it, and if the next stage's ticket exists, update its Handoff facts section to match what was just written into the plan doc's next-stage block.

Update "Quick checklist per stage" to add:
> [ ] This stage's ticket file (if any) deleted; the next stage's ticket file (if any) updated with the Handoff facts just written.

Update "How to complete a phase" / "When the whole feature is complete":
> When a plan is archived, delete its now-empty `docs/plans/active/tickets/<area-outcome>/` directory (all stages shipped ⇒ no ticket files remain; anything leftover is a bug in the sync step, not something to archive).

## Files to touch

- `.agents/skills/grill-with-docs/SKILL.md` — one-line rewrite.
- `.agents/skills/wayfinder/SKILL.md` — mechanical swap (GitHub map/tickets → local MAP.md + ticket files), drop dead skill references.
- `.agents/skills/to-spec/SKILL.md` — full rewrite (spec issue → plan doc).
- `.agents/skills/to-tickets/SKILL.md` — full rewrite (generic spec-splitter → plan-stage-to-local-ticket splitter).
- `.agents/skills/grilling/SKILL.md` — no changes expected; confirm nothing assumes the old shape.
- `.agents/skills/grill-me/SKILL.md` — no changes expected; confirm nothing assumes the old shape.
- Each rewritten skill's `.agents/skills/<name>/openai.yaml` `short_description` — check `to-spec` and `to-tickets` (they currently say "publish it to the project issue tracker" / similar).
- `docs/PLAN_TEMPLATE.md` — new local-ticket section; edits to "When a stage is complete," and phase/feature completion steps as above.
- `docs/README.md` — one new line excluding `docs/plans/active/tickets/` and `docs/plans/mapping/`, next to the existing `scratch/` line.
- No change to `docs/agents/issue-tracker.md` or `docs/agents/triage.md` — the real GitHub bug/feature tracker used by unrelated triage/qa skills, out of scope here.

## Verification

- Read each rewritten skill for dangling references to `/domain-modeling`, `/setup-matt-pocock-skills`, `gh issue`, or GitHub-only mechanics (labels, claims) remain.
- Dry-run `to-spec` against a small, real, undocumented change (an area in `docs/README.md`'s manifest with no plan doc yet) to confirm it produces a well-formed `docs/plans/active/*.md`. Don't commit/merge the resulting plan unless the user wants that work done for real.
- Dry-run `to-tickets` against a live plan's next stage (e.g. `docs/plans/active/loom-swimlanes-redesign.md`'s LS2, the manifest's current stage) to confirm the derived ticket file's content matches that stage's actual Read first / Build / Gate, and that its link back to the plan resolves. Only write to `docs/plans/active/tickets/` if the user confirms they want it generated for real.
- Run `.venv\Scripts\python.exe scripts/check_docs.py --check` after the `docs/README.md` and PLAN_TEMPLATE changes to confirm the documentation-contract checker is still green and, specifically, that a generated dry-run ticket file under `docs/plans/active/tickets/` doesn't trip `find_active_plans()` or the stage-anchor check.
