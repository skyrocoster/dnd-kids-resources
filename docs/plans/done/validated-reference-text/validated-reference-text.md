# Validated Reference Text — concise rules can safely resolve character values

> **Status:** Complete. All stages shipped; no next stage.

- **Area guide:** [Reference](../../../areas/reference.md)
- **Read trigger:** Validated placeholders, spell quick rules, extensible reference text, or Spell detail player assignment history


## What we're building & why

Spells need a required `quick_rules` summary that can say exactly what to roll while still working for
different characters. A shared spell therefore stores a token such as `{spell_attack_bonus}`, and the
reader resolves it from the selected character without calculating game rules. Missing context falls
back to a readable phrase instead of leaking markup or inventing a number.

This plan makes that substitution a small, validated reference-text system rather than spell-only
string replacement. A registry owns token names, context requirements, fallbacks, and rendering; the
parser does not know individual domains. Later plans may register typed entity references such as a
monster link without replacing the grammar. Entity lookup, navigation, weapon quick rules, player
profiles, and runtime AI generation are deliberately outside this first plan. The existing
player-spell relationship is in scope only from the Spell browser's authoring direction.

## Settled contract

- Brace-delimited tokens are parsed as registered references, not replaced with ad hoc string calls.
  The first value tokens are `spell_attack_bonus` and `spell_save_dc`; new token kinds and domains are
  additive registrations.
- Authoring rejects malformed or unknown tokens. Rendering with valid but unavailable context uses the
  token's declared human fallback, such as "your spell attack bonus". It never guesses, calculates, or
  shows raw braces.
- Reference rendering composes with the existing dice treatment, so resolved text such as `1d20` keeps
  its `DiceText` presentation and accessibility behavior.
- `quick_rules` is required authored spell data. It leads with the explicit roll or save and immediate
  outcome; structured range, duration, components, and concentration remain separate metadata.
- The seed pass is generated offline, committed as canonical spell data, and checked against structured
  spell facts. Ambiguous summaries are reported for review rather than accepted silently.

## UX decisions — spell quick rules

```
Surface:      Spell browser and Spell editor (existing rows in docs/areas/spells.md
              ## Surfaces). The reference-text renderer is a shared primitive, not a new route.
Mode:         prep for both existing surfaces. Later Players consumption will define its own
              play-mode composition.
Operator:     DM.
Focal:        quick rules lead the Spell detail body before the full explanation. In the editor,
              the Quick Rules field sits with the spell's primary identity and rules fields.
Route shape:  existing Browser at /spells with the existing modal Editor.
Edit style:   modal, because a Spell is an independently identified catalog record.
Save:         explicit Save on create and edit, matching the existing Spell editor's accepted debt.
              Unknown or malformed tokens block submission and remain editable.
Empty:        SearchList empty state: "No spells found."
Filtered empty: SearchList filtered state: "No matches".
No selection: "Choose a spell from the list to view its details."
Load failure: the existing BrowserLayout page error and SearchList error state remain visible; a
              failed collection request does not render an empty catalog.
Action failure: inline in the Spell editor status region with role="status"; token errors also
              identify the invalid token beside the Quick Rules field.
Destructive:  unchanged by this plan; Spell deletion continues through ConfirmDialog.
Keyboard:     DOM order. Tab reaches Quick Rules with the other fields; Escape closes the editor
              unless save is pending. Rendered tokens add no focus stop until a future link token
              explicitly introduces an interactive reference.
Touch:        existing 48px editor-control floor; reference text itself is non-interactive.
```

## UX decisions — Manage Players

```
Surface:      Manage Players dialog over the existing Spell browser; this is a new prep surface
              owned by the Spells area.
Mode:         prep.
Operator:     DM.
Focal:        one searchable checklist of characters, with current assignments checked.
Route shape:  modal Editor over the existing Browser; assigning a Spell does not navigate away.
Edit style:   modal, because this is a deliberate batch relationship edit.
Save:         checkbox changes remain staged until Save replaces the assignment set atomically;
              Cancel discards the draft.
Empty:        StatePanel in the dialog body: "No players available."
Filtered empty: "No matches".
No selection: not applicable; an empty checked set is a valid draft.
Load failure: StatePanel error fills the dialog body and disables Save.
Action failure: inline above the checklist with role="status"; the draft remains intact.
Destructive:  none. Unchecking is staged and reversible until Save.
Keyboard:     DOM order through search, checkboxes, Cancel, and Save. Space toggles the focused
              checkbox; Escape closes the dialog unless Save is pending.
Touch:        48px floor for every checkbox row and footer action.
```

## Stages

1. **Shared reference-text contract.** Establish one parsed token model, registry, validation result,
   context resolver, and readable missing-context behavior. Prove that registered value tokens,
   malformed/unknown-token rejection, literal text, and dice notation can coexist; leave typed entity
   reference resolution as an additive registry extension rather than implementing monster links now.
2. **Required spell quick rules.** Add `quick_rules` across the spell schema, database, API, seed,
   import/export, and editor contracts. Only registered tokens are accepted, and every round trip
   preserves the authored text exactly.
3. **Shared rendering and spell presentation.** Compose reference resolution with the existing dice
   renderer, put quick rules before the full explanation in Spell detail, and give missing character
   context the declared generic wording without exposing token syntax.
4. **Canonical spell seed pass.** Generate a first quick-rules summary for every seeded spell, validate
   bounded wording and allowed tokens, cross-check dice/save/damage/healing facts wherever structured
   data permits, and produce a review list for ambiguous records. The stage is complete only when no
   spell is missing valid quick rules and rebuild/export round-tripping passes.
5. **Reverse player assignment.** Add Manage Players to Spell detail, backed by one atomic
   spell-to-players assignment contract. Keep ownership display out of the ordinary Spell card; the
   relationship is visible only when the DM opens the dialog, and add the new prep surface to the
   Spells area guide when it ships.

## Shipped

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| 1 | Added a framework-neutral parsed reference-text model with extensible registry, validation, resolution, the two initial spell value tokens, and readable missing-context fallbacks. Focused tests cover malformed and unknown tokens, literal preservation, and composition with `DiceText`. |
| 2 | Added required authored `quick_rules` across spell persistence, seed import/export, backend and frontend API contracts, nested player-spell responses, form round-tripping, and Spell editor validation. Legacy/local runtime rows may still read as `null`, while create/update paths and committed spell seeds require nonblank text with only registered reference tokens. |
| 3 | Added a shared React `ReferenceText` renderer that validates registered token text, resolves available spell values through the registry, uses declared missing-context fallbacks, and composes with `DiceText` without leaking raw braces. Spell detail now renders `quick_rules` before the full description as the leading rules summary, with generic spell value wording when no character context is selected. |
| 4 | Added deterministic offline generation for canonical spell quick rules, filled all 525 committed spell seeds with nonblank registered-token-valid summaries, and covered bounded wording plus direct structured save/attack/damage/healing consistency. Seed rebuild and spell export now prove every authored quick-rules string round-trips exactly. |
| 5 | Added reverse spell-player assignment APIs and typed frontend helpers, then exposed them through a Spell detail Manage Players dialog with searchable staged checkboxes and atomic replacement Save. The closed Spell card still omits assigned-player names; ownership is visible only inside the dialog. |

