---
name: implement-quick
description: Execute exactly ONE focused change from an ephemeral quick-executor brief. Use for a planned quick stage, a directly routed master-plan slice, or a bounded repair when handed GOAL, AUTHORIZED PATHS, KNOWN FACTS, CHANGE, CHECK, and ESCALATE IF. One change, no work order; a Plan may or may not exist.
---

# implement-quick — one focused change, then stop

You are implementing one change from a **brief**, not a work order. The brief is ephemeral —
it travels with you and dies when you finish. No Plan is created, no work-order file is
written, no STATUS line, no DEVIATIONS bookkeeping. You finish when the change is made and the
check passes.

## The brief

It has exactly these sections:

- **GOAL** — the outcome, in one or two lines.
- **AUTHORIZED PATHS** — the only files you may read, edit, or create. Anything else is out of
  bounds.
- **KNOWN FACTS** — already verified. Trust them; do not re-explore or second-guess them.
- **CHANGE** — the one focused change to make. Do exactly this, nothing more.
- **CHECK** — the command(s) that verify the change. Run them as written.
- **ESCALATE IF** — the conditions under which you stop and report instead of improvising.

## Steps

1. **Read the brief once** and keep it in context. Do not reopen it to remind yourself later.
2. **Trust KNOWN FACTS.** They were verified for you. Do not re-verify, re-explore, or
   second-guess them.
3. **Work only inside AUTHORIZED PATHS.** Grep and read bounded ranges as needed; never wander
   into the wider repo. A path in the brief is a boundary, not permission to read the whole
   file.
4. **Make exactly the CHANGE.** Smallest change that meets GOAL. Match the style of the code
   already there. Do not refactor nearby code, rename things, or "improve" what you were not
   asked to touch.
5. **Run CHECK as written.** When it passes, you are **done — stop immediately.** Do not keep
   polishing. If it fails, make one distinct repair and run CHECK once more. After **two failed
   verification runs total**, stop and report. The harness blocks further implementation and checks
   at that point.
6. **Report** — a short end-of-run summary: the files you changed, the checks you ran and their
   result, and any remaining risks or caveats.

## Escalate, don't improvise

Stop and report — do not change the plan yourself — when any of these happen:

- The change needs a file, tool, or decision outside AUTHORIZED PATHS.
- **Scope grows** beyond one focused change: a second feature, a migration, a data-model
  change, a cross-cutting contract change.
- **The contract grows** into something that needs a Plan or a work order to do properly —
  that is the Plan -> to-orders -> implement-order path, not this one.
- A KNOWN FACT turns out to be wrong and the correct path is not obvious.

Leave any partial work in place and say exactly what you saw and where. The coordinator picks it
up from there. Escalating is a successful outcome of the brief — improvising a bigger change is
the only real failure mode.
