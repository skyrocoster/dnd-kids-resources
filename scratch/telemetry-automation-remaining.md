# Telemetry automation — what's left

Scratch note from the 2026-07-26 pass that shipped the read guard, anchor-verified START IN
ranges, the extra `check_orders.py` rules, and the two check wrappers. Not a plan — just the
leftovers so they don't get re-derived from the log.

## Still to do

**1. `Icon count: 520` in docs/DESIGN_SYSTEM.md.** Flagged RECURRING at stage 7 reconcile: the
barrel actually held 524, so it had already been stale for at least three stages. No order-side
STOP WHEN (vitest/tsc/eslint) can catch a prose count and `check_docs.py` doesn't validate it.
Either move it into a `--write-generated` block or delete it. Then generalise: flag any
`<Noun> count: <N>` line in `docs/` that sits outside a generated block. This is the
"generate, don't hand-maintain" rule applied to itself.

**2. Fail loud on unparsed doc structure.** Writing an area guide's empty plan queue as anything
other than the literal `Plan queue: None.` silently drops that guide's whole change map from
`check_docs` coverage — 77 spurious failures from one phrasing. Any parser in `check_docs.py`
that can return an empty set must distinguish *absent* from *unrecognised* and error on the
latter. Worth auditing the other parsers for the same shape while in there.

**3. Record planner cost automatically.** Stage 7 logged `planner cost: compile not recorded`
because the harness doesn't expose `/cost`. But `order_telemetry.py` already parses Claude
transcript JSONL for executor runs — point the same parser at the planner's own session file
(`~/.claude/projects/F--DND-Kids-Resources/*.jsonl`) behind a `--planner-session <id>` flag.
Until this lands, the scoreboard's `spend: executor $2.18 | planner not recorded` can't answer
the question the log exists to answer: did dispatching a stage beat implementing it directly.

## Deliberately dropped — don't re-propose

**Bounded-percentage gate on START IN.** I proposed it, then dropped it on re-reading the log's
own metric. It pushes the wrong way: a 4,000-line file bounded to a precise 200-line range is a
*good* order, and a ratio gate would fail it. The number the log actually tracks is unbounded
large files (`unbounded_large_files()` = point-anchored + unscoped), and that is now a hard lint
error rather than a warning. A total-bounded-lines ceiling was also considered and dropped —
6 small files legitimately sum past any plausible cap.

## Unverified paths from the shipped work

- The read guard's **deny** path is unit-tested and the Claude hook wiring is confirmed live
  (a state file appeared for the planner session showing `armed: False, reads denied: 0`), but
  the denial has not been watched firing inside a live armed subagent.
- `.opencode/plugin/read-guard.js` parses and exports correctly under node; not yet observed
  inside a real opencode run. First dispatched order will confirm both.
- Other Claude sessions may need a restart, or a prompt to approve the new hooks in
  `.claude/settings.json`.
