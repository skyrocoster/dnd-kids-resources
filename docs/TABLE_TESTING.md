# Table Testing — Running and Recording Real Sessions

## What a table test is and why

A table test is one real session of the game, run with the real operators on the real device and
recorded once. Automated tests assert what is shown; a table test captures what a child does with
it and what the device teaches us.

`docs/TESTING.md` owns automated checks; this document owns evidence from real sessions.

## Lifecycle

A table-testing record is independent of implementation Plans. It has exactly three statuses:

- **`draft`** — The session sheet is being prepared or filled in.
- **`recorded`** — The session is complete and its observations have been captured.
- **`reviewed`** — The recorded evidence has been read and interpreted. Any resulting ideas may be
  considered separately from the record; reviewing does not turn the record into an implementation
  plan.

Candidate ideas belong in the independent [ideas bank](ideas/README.md). They remain candidates
until separately evaluated through the normal planning process.

Statuses describe the record, not a feature or a Plan. Existing real session records remain
historical and are not rewritten to fit this contract.

## Required structure

A new table-testing record must stay compact and human-fillable. It contains:

1. An H1 title identifying the session and date.
2. A status blockquote: `> **Status:** <draft | recorded | reviewed>`.
3. A small header with the session date, device, operators, and content or scenario tested.
4. One to five focused question blocks.

There are no standing questions, no extra notes section, and no required `Plan`, `Stage`, or
`Actions` sections.

## Question block

Each focused question records the complete path from uncertainty to learning:

```markdown
### Question 1 — <what we are trying to understand>

**What is being understood:**

**Expected outcome:**

**Confirmation / challenge signal:**

**Actual outcome:**

**Interpretation:**

**Possible ideas:**
```

Use one to five blocks, choosing questions specific to the session. Keep the raw evidence in the
actual-outcome field or immediately alongside it; do not tidy away observations that challenge the
expected outcome. Interpretation explains what the evidence may mean. Possible ideas are prompts
for later consideration, not commitments or implementation plans.

## Where records live and how to start one

Records live at `docs/table-tests/YYYY-MM-DD-<slug>.md`, where the date is the date the session was
played and the slug briefly identifies the session. To start a record, copy
`docs/table-tests/_example/session-template.md`, then fill in the header and one to five question
blocks.

The `docs/table-tests/_example/` folder is a template only and holds no session data. It is excluded
from the record index. Records live outside `docs/plans/` so the evidence remains independent of
Plan lifecycle.

If a reviewed record suggests a possible direction, capture that candidate in
[`docs/ideas/`](ideas/README.md). The ideas bank is separate from both these records and
implementation Plans; it does not create a Plan or change the record index.

## Record index

Keep the index limited to links to records and their current status:

| Date | Status | Record |
|---|---|---|

Update the index when a new record is created or its status changes. The index is a directory, not a
second copy of the session's findings.
