---
name: contract
description: Optional readiness stage that sharpens an underspecified task into an agreed contract before any implementation. Use when the user wants to align on a change before code is written, says "contract", "readiness", "make sure we agree", "grill me", or hands over a fuzzy task. Asks one question at a time, looks up facts itself, recommends each decision, hands off conversationally, and implements nothing.
---

# contract — agree what to build before building it

This is the **readiness** stage: reach a shared, explicit understanding of what a change is and
is not, *before* any implementation. It is **optional** — if the task is already crisp, skip it
and move straight to implementation. If you are running it, you implement nothing here.

## The grill-me mechanics

Borrowed wholesale from the `grill-me`/`grilling` skills:

- Ask the questions **one at a time**, and wait for an answer before asking the next. Several
  questions at once is bewildering.
- Every question turn must present exactly **three possible answers** immediately below the
  question. Number them `1.`, `2.`, and `3.`; make them concrete, mutually understandable
  choices rather than vague prompts.
- Mark exactly one of the three answers as **(Recommended)**. Give a brief reason for the
  recommendation before or after the options. The user may choose a different option or provide
  a fourth answer in their own words.
- Walk down the decision tree branch by branch, resolving dependencies between decisions one by
  one.
- If a **fact** can be found by exploring the environment (files, docs, existing code, git
  history), look it up rather than asking. Only **decisions** go to the user.
- For every decision you put to the user, **recommend an answer**. You are the one who has read
  the code; the user should never have to decide from a blank slate. If the evidence points one
  way, say so and recommend that way.
- Do not start implementing until the user confirms shared understanding.

## What the contract ends with

A detailed plan of what was decided and why. This is not a plan, it is a clear understanding of desired state:

- the change to make (what is in, and what is explicitly out),
- the paths the change touches,
- the check that will verify it,
- what was deliberately deferred.

## Handoff

**Conversational handoff is the default.** End the stage by stating the agreed contract and what
happens next, in plain language — the coordinator dispatches it to `quick-executor` for a
one-change brief, or to the `implement-order*` executors when the change warrants a Plan and
work orders. The handoff happens in the conversation; no contract file is required.

## Escalate to a Plan

If the readiness stage reveals a multi-stage feature, a cross-cutting contract change, or
decisions too large for one conversational loop, stop and recommend the `plan` workflow
instead. This skill never creates Plans or work orders itself — that is `plan` and `to-orders`.
