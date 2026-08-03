---
name: table-test
description: Prepare or review a focused real-table test through a one-question-at-a-time grilling conversation. Use before a session to produce a compact session sheet, or after a session to compare expectations with recorded observations and propose evidence-linked ideas. Never invent evidence or write artifacts without explicit human confirmation.
---

# table-test — prepare and review real-table evidence

This skill supports two conversational passes around a real session:

1. **Prepare** a compact, focused session sheet for the human who will run the test.
2. **Review** a completed record by comparing what was expected with what was observed.

The human runs the session and owns the evidence. The AI helps sharpen questions, preserve the
human's words, and organize meaning. A table test is independent of implementation Plans: it may
mention a Plan as context, but it never creates, edits, blocks, prioritizes, or changes one.

## Choose a mode

At the start, determine whether the user wants `prepare` or `review`. If they have not said, ask
which pass they need before proceeding. Do not ask the human to choose facts that can be read from
the named record or repository documentation.

## Conversation rules

- Ask **one question at a time** and wait for the answer before asking the next.
- Every decision question presents exactly three concrete, mutually understandable choices below
  it, numbered `1.`, `2.`, and `3.`. Mark exactly one **(Recommended)** and briefly explain why.
- The user may choose a fourth answer in their own words; preserve it rather than forcing a choice.
- Prefer the user's exact wording in questions, expectations, signals, observations, and
  interpretations. Do not silently polish away uncertainty or contradictory evidence.
- Separate expectation from observation. Never infer that an event happened because it was
  expected, likely, or suggested by a screenshot, code path, or prior record.
- Say explicitly when evidence is missing. Never invent quotes, outcomes, participant reactions,
  device details, dates, or confidence.
- Keep the session focused: one to five questions, each tied to a concrete uncertainty.
- Before any file is created or modified, show the proposed content or a precise summary and ask
  for explicit confirmation. Confirmation must be affirmative and specific enough to identify the
  artifact being written.

## `prepare` mode

The goal is a human-fillable draft at `docs/table-tests/YYYY-MM-DD-<slug>.md`, normally based on
`docs/table-tests/_example/session-template.md`.

Guide the user through only the decisions needed to make the session useful:

1. Identify the session date, device, operators, content/scenario, and optional prior record.
2. Narrow the session to one to five focused questions.
3. For each question, establish what is being understood, the expected outcome, and the concrete
   confirmation/challenge signal.
4. Leave actual outcome, raw evidence, interpretation, and possible ideas blank or clearly marked
   for the human to complete at the table. Do not predict them as facts.
5. Present the complete `draft` record for confirmation before writing it.

The human receives the focused sheet, not a running transcript or an implementation task list.
Once written, stop; preparation does not claim that the session happened.

## `review` mode

Review only a record whose observations are supplied by the human or read from the named table-test
file. Treat the record's actual-outcome and raw-evidence text as the source of truth; do not fill
gaps from application code, expectations, or memory.

For each focused question:

1. Restate the expectation and the recorded evidence separately, preserving the original wording.
2. Ask one question at a time to clarify ambiguous observations or distinguish confirmation from
   challenge.
3. Offer a concise interpretation, clearly labelled as interpretation rather than fact.
4. Suggest a small number of possible evidence-linked ideas, each tied to the observed finding and
   labelled as a candidate rather than a commitment.
5. Ask the human to confirm the interpretation and any candidate ideas before writing them.

After confirmation, update the record's status to `reviewed` and/or create separately confirmed
idea entries only through the repository's current idea-card contract. If no idea-bank contract is
available yet, keep ideas in the conversation and do not invent a file format. Never turn a review
into a Plan, issue, priority, or automatic implementation request.

## Stop conditions

Stop and ask for clarification when the user cannot identify the session mode, when fewer than one
focused question can be formed, or when a claimed outcome lacks human-supplied evidence. Escalate
to the user instead of guessing if the requested artifact would alter a Plan, issue, priority, or
unrelated documentation contract.

## Output boundary

The durable output is either:

- a confirmed `draft` session sheet for the human to run, or
- a confirmed review of an existing record, with its status and any separately confirmed ideas.

The skill does not run the session, drive a browser, fabricate evidence, or make implementation
decisions on the user's behalf.
