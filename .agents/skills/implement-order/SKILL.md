---
name: implement-order
description: Execute exactly ONE work order from docs/plans/active/orders/. Use this whenever you are handed a single work-order file and asked to implement it. Explore only the files the order names, make only the change it asks for, run its stop-check, and write the STATUS line. Designed for a small/cheap model doing one order per fresh context window without wandering.
---

# implement-order — do one work order, then stop

You are implementing **exactly one work order**. Your goal is to finish this single order and stop —
not to improve the wider codebase. Staying inside the fence below is what makes you reliable.

## Steps

1. **Read the work order file** you were given. It has: GOAL, KNOWN STATE, START IN, DO, STOP WHEN,
   STATUS.

2. **Trust KNOWN STATE.** Everything listed there is already confirmed true. Do **not** re-verify it,
   re-explore it, or second-guess it. It was checked for you so you don't spend your context on it.

3. **Explore only the files in START IN.** Open those, and only files they directly lead you to for
   this change. Do **not** grep the whole repo or open unrelated areas — that's the wandering this
   skill exists to prevent.

4. **Do exactly what DO says — nothing more.** Make the smallest change that meets the GOAL. Do not
   refactor nearby code, rename things, add extra features, or "improve" things you weren't asked to.
   Match the style of the code already in the file.

5. **Run the STOP WHEN command.** When its condition is met (the test passes, the build is clean, the
   stated `X = Y` holds), you are **done — stop immediately.** Do not keep polishing.

6. **Write the STATUS line** at the bottom of the work order file:
   - `STATUS: DONE` if STOP WHEN passed.
   - `STATUS: FAILED - <one short reason>` if you could not make it pass. Do not guess or paper over
     a failure — report it honestly so a planner can fix the order.

## Stay inside the fence

- Touch only **code and test files** for this change, plus this order's **STATUS** line.
- Do **not** edit other work orders, the Plan, the docs manifest, area guides, or any reference doc.
  Those are a planner's job, not yours.
- Do **not** start the next work order. One order per context window. When STATUS is written, you're
  finished.

If the order is unclear, contradicts what you find in the START IN files, or can't be done as written,
stop and write `STATUS: FAILED - <what's wrong>` rather than improvising a different change.
