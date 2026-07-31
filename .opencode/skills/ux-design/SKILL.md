---
name: ux-design
description: Decide the interaction design for a UI surface in the D&D Kids Resources repo before any code is written. Use when planning, designing, or reshaping any frontend surface — a new page, dialog, rail, board, or editor — or when the user asks how a screen should behave, what it should show when empty, or how it should feel at the table. Produces a UX decisions block for the Plan, not code.
---

# ux-design — decide how a surface behaves

This repo's visual language is already settled. Colour, type scale, icons, spacing, radius, motion,
elevation and the accessibility floor live in `frontend/src/theme.css` and
[docs/DESIGN_SYSTEM.md](../../../docs/DESIGN_SYSTEM.md), and `AGENTS.md` forbids introducing arbitrary
colours. **Do not propose a palette, a typeface, or an aesthetic direction.** That work is done.

What is not settled for any *new* surface is how it behaves: what it is for, who is holding the
device, what wins when the screen is too small, what happens when the save fails, what it says when
it is empty. That is this skill's job.

You are working at **planning time**. You produce decisions that go into the Plan and from there into
work orders. You do not write implementation code — see `AGENTS.md`.

## Before you decide anything

1. Read [docs/UX_PATTERNS.md](../../../docs/UX_PATTERNS.md). It is the binding reference. Rules
   marked **IN FORCE** are not yours to revisit; rules marked **TARGET** tell you where new work
   should aim.
2. Find the surface in its area guide's `## Surfaces` table to get its **mode** and **operator**. If
   the surface is new, decide its mode and add the row — that is part of this work.
3. Look at the nearest existing surface of the same shape. This app has strong conventions; matching
   one is almost always better than inventing.

## The decision that drives the others: mode

**Prep** — authoring between games. Density, throughput, keyboard efficiency, precision. A modal that
demands full attention is fine.

**Play** — running a game at the table. You are talking, children are waiting, you will be
interrupted mid-action. Glanceability, few steps, large targets, never losing work.

Mode belongs to the surface, not the feature. A feature usually has both: the dungeon viewer is play,
the dungeon editor is prep. If you find yourself writing "it depends what the user is doing", you
have two surfaces, not one — say so.

When a surface genuinely serves both, the rule from the Loom applies: the persistent surface follows
play rules, and the editing dialogs opened from it follow prep rules.

## Output: the UX decisions block

Emit this into the Plan. `to-orders` copies the relevant lines into each work order, which is how the
small model learns them without ever reading this skill.

```
## UX decisions — <surface name>

Surface:      <name, and the area guide that will own its Surfaces row>
Mode:         prep | play | both (and which part is which)
Operator:     DM (kid surfaces do not exist yet)
Focal:        <the one thing the user came here for, and how it wins —
               size, weight, contrast, or the space around it>
Route shape:  Browser | Viewer | Editor | bespoke (and why, if bespoke)
Edit style:   modal | inline panel | direct controls (per UX_PATTERNS §Inline versus modal)
Save:         explicit on create; autosave on edit where achievable (TARGET) —
               state honestly which this surface does
Empty:        StatePanel status + the exact copy string
Filtered empty: the exact copy string, distinct from empty
No selection: the exact copy string, naming the specific payoff
Load failure: StatePanel error fills <which region>
Action failure: inline beside <which control>, role="status"
Destructive:  ConfirmDialog with the exact message, or a reverse action if reversible
Keyboard:     tab order, what Enter/Space activate, what Escape closes
Touch:        48px floor; name any exception and why it is unavoidable
```

Fill every line. "Standard" is not an answer — write the actual copy string, name the actual focal
element. A line you cannot fill is a decision you have not made, and the small model will make it for
you, badly.

## Craft that tokens do not settle

The design system fixes values, not composition. These still need deciding, every time:

- **One focal point per surface.** Name the thing the user came for and make it win — through size,
  weight, contrast, or the space around it. When everything competes equally, nothing leads. Demote
  the rest deliberately.
- **Hierarchy comes from size, weight and colour together**, never size alone. One type size holds
  three tiers through weight and `--md-on-surface` versus `--md-on-surface-variant`. If you squint and
  cannot tell heading from body from label, it is too flat.
- **Density is a decision, stated in tokens.** `--space-2` throughout reads as a workbench;
  `--space-5` reads as a brochure. Both are right somewhere. Pick per surface, per mode, and hold it.
  Play surfaces skew open; prep surfaces may skew tight.
- **Breathe unevenly.** Group tightly related things, then put real air between groups. Identical
  gaps everywhere is the sound of nobody deciding.
- **Prefer space and tone to lines.** Reach for whitespace and a surface-tone step before adding a
  border. Borders that are the first thing you notice are too strong.
- **Concentric radius.** Nested rounded elements need `outer = inner + padding`. The same radius on
  parent and child is the most common thing that makes a card look subtly wrong.
- **Tabular numerals** on anything that changes in place — HP, counters, timers, session ordinals —
  so the layout does not jitter.
- **The squint test.** Blur your eyes at the result: hierarchy should still read, and nothing should
  jump out harshly. Get this wrong and no other detail matters.

## Use what exists

Before specifying a new control, check what the repo already gives you: `Dialog`, `ConfirmDialog`,
`StatePanel`, `SearchList`, `BrowserLayout`, `SplitPane`, `FloatingWindow`, `PageHeader`, `Button`,
`IconButton`, the `form/` field set, and the icon barrel at `components/icons/`. Specifying a
hand-rolled equivalent of any of these is a defect, not a design choice — they carry focus
management, ARIA, and state contracts that a fresh implementation will not.

`RemoteState<T>` from `components/remoteState.ts` is how async data is tracked. Do not specify loose
loading booleans.

## Before you hand the block over

- Does every line have a real answer, including the literal copy strings?
- Does anything contradict an **IN FORCE** rule in `UX_PATTERNS.md`? If so, either change the design
  or say plainly in the Plan that you are proposing to change the rule — do not quietly deviate.
- Is the surface's row present in its area guide's `## Surfaces` table?
- If this surface is play-mode: can the user be interrupted at any point without losing work, and is
  every control hittable without looking carefully?
