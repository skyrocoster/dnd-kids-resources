# UX Patterns — give the repo one design skill and a reference for how the app behaves

> **Status:** All five stages complete — ready to archive to `docs/complete/`.

- **Area guide:** [Documentation Governance](../../areas/documentation.md).

## What we're building & why

The repo carries two generic design skills, `frontend-design` and `interface-design`. Both were
written for greenfield work: they tell the model to invent a palette, pick a distinctive typeface,
commit to a bold aesthetic direction, and save its decisions to a private `system.md`. None of that
applies here. Colour, type, spacing, icons, elevation and the accessibility floor are already settled
in `theme.css` and `DESIGN_SYSTEM.md`, and `CLAUDE.md` forbids introducing arbitrary colours. So the
skills are at best noise and at worst an invitation to drift.

The real gap is the opposite one. `DESIGN_SYSTEM.md` is thorough on what the app *looks like* and
what each component *is made of*, but it says almost nothing about how the app *behaves*: when a
thing should be a dialog rather than a page, what happens after a save, how a destructive action is
confirmed, what a screen says when it is empty, how the keyboard moves through a feature. Those
decisions have been made over and over — `Dialog`, `StatePanel`, `ConfirmDialog`, `remoteState` all
encode them — but only as component descriptions, never as rules a new surface could be held to.
The result is genuine divergence: Map Lab autosaves while six modal editors use an explicit Save,
and three different error-surfacing patterns coexist with nothing to say which is right.

We are replacing both skills with one repo-specific `ux-design` skill that fires at *planning* time
and forces the interaction decisions into the Plan, where `to-orders` can carry them into each work
order. Alongside it, a new canonical reference, `UX_PATTERNS.md`, records the answers so they bind
everyone afterwards — including the small model, which gets pointed at a section rather than handed a
skill full of judgment calls.

The organising idea is **surface mode**. Every UI surface is either *prep* (authoring between games,
where density, throughput and keyboard efficiency win) or *play* (running a game at the table, where
glanceability and never losing work win). Mode is a property of the surface, not the feature: the
dungeon viewer is play, the dungeon editor is prep, and the Loom is both at different moments. Each
area guide declares the modes of the surfaces it owns. A third operator — kid-facing, read-only,
stripped of detail — gets a named slot in the structure and no rules, because no such surface exists
yet.

Every rule is stamped **IN FORCE** or **TARGET**, so the doc can state the agreed destination without
pretending the app already arrived. Autosave-on-edit is the first TARGET: it is where we are going,
the six modal editors are accepted debt, and the migration is a separate plan for another day.

## Stages

1. **Harvest the app's real conventions and write `UX_PATTERNS.md`.** Read the shared components and
   every feature surface, and write up what is genuinely already in force — route shape, data states,
   error placement, destructive actions, dialog behaviour, feedback locality — then name the gaps
   honestly and fill them from Material Design 3 and WCAG. Stamp each rule IN FORCE or TARGET.
   Decide, from the code rather than from taste, the four questions left open: empty-state copy
   conventions, the keyboard model beyond dialogs, when editing is inline versus modal, and the focal
   element of each existing surface. Produce the prep/play mode assignment for every current surface
   as an artifact this stage hands to Stage 2. Add the manifest inventory and router rows so the
   checker stays green.

2. **Declare surfaces in the area guides.** Give each area guide that owns frontend routes a
   `## Surfaces` table naming its surfaces, their mode, and their operator, using Stage 1's
   assignment. This is where mode becomes discoverable at routing time, next to ownership.

3. **Write the `ux-design` skill and retire the old two.** Author the skill so it fires when Claude
   plans UI work and emits a UX decisions block covering surface, mode, operator, focal element, save
   model, empty state and its copy, load failure, action failure, destructive actions, keyboard and
   touch. Carry over the craft guidance from the deleted skills that tokens do not settle — hierarchy
   built from size, weight and colour together; density as an explicit decision; spatial rhythm;
   concentric radius; tabular numerals; the squint test — and drop every word about palette and
   typeface. Delete both old skill directories and their symlinks, and link the new one in.

4. **Wire the skill into the workflow.** Teach `plan` to invoke `ux-design` whenever a feature touches
   the frontend and to carry its decisions block, and teach `to-orders` to copy the relevant decisions
   into each order that touches a component. `implement-order` stays as it is — the order carries the
   rules, so the small model never needs the skill.

5. **Close the one live deviation.** Map Lab's page-level error is a bare `role="alert"` div where
   every other load failure uses `StatePanel`. Bring it in line so the doc's first IN FORCE rule has
   no exceptions on the day it ships.

## Shipped

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| 1 | `docs/UX_PATTERNS.md` — surface modes, route shape, inline-vs-modal, data states, empty-state copy, error placement, saving, destructive actions, dialogs, keyboard, touch, and known gaps, each rule stamped IN FORCE or TARGET. Added its manifest inventory and router rows. |
| 2 | `## Surfaces` tables in all eight area guides that own frontend routes, declaring each surface's mode and operator. |
| 3 | `.agents/skills/ux-design/` — planning-time skill emitting a UX decisions block, keeping the craft guidance tokens don't settle and dropping all palette/typeface direction. Deleted `frontend-design` and `interface-design`. |
| 4 | `plan` now invokes `ux-design` for frontend features; `to-orders` copies the UX decisions into any order touching `frontend/src/`. `implement-order` unchanged. |
| 5 | The Map Lab NPC dock's hand-rolled loading and error paragraphs became `StatePanel`, so the load-failure rule ships with no exceptions. One test added; `MapLabPage` suite green at 72. |
