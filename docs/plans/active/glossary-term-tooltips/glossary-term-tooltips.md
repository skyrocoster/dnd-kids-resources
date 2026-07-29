# Glossary term tooltips — hover/tap explanations for rule terms in rendered text

> **Status:** Stages 1-3 shipped. Stage 4 (expand glossary coverage against real seed data) is next — the only Design plan.

- **Area guide:** [Design](../../../areas/design.md)
- **Read trigger:** Glossary term tooltips, rule-term explanations in rendered text


## Touches

- `frontend/src/components/**`
- `frontend/src/features/{spells,weapons,monsters,npcs}/**`
- `frontend/src/player/**`
- `docs/DESIGN_SYSTEM.md`

## What we're building & why

Rule text (spell descriptions, weapon quick rules, monster/NPC text) uses D&D vocabulary a kid at
the table won't know — "advantage," "concentration," "saving throw." Right now there is no way to
explain a term in place; the reader has to ask the DM or go look it up. This is **not** the existing
`{}` `ReferenceText` system in `frontend/src/components/referenceText.ts` — that system only
substitutes live numeric values (a player's actual spell save DC) into authored text and has no
interactivity. This plan adds a second, separate mechanism: known glossary terms found in rendered
text get a light visual mark, and hovering (or tapping, on touch) shows a small popover with a
plain-language explanation.

The two systems can coexist in the same string — a `{spell_save_dc}` value substitution and a
"saving throw" glossary term can both appear in one sentence — but they are independent: one resolves
values, the other explains vocabulary. This plan does not change `referenceText.ts`.

The driving intention is broader than rule vocabulary alone: hovering over the *name* of a spell,
weapon, item, monster, or NPC anywhere it's mentioned in rendered text should also surface a summary
of that catalog record, using the same popover mechanism. Rule terms are the simpler case (static
definitions) and ship first; catalog-entity references (live data, cross-domain lookups) are a later
stage on the same component once the mechanism is proven.

## UX decisions — Glossary term tooltip

Surface:      Glossary term tooltip (inline disclosure inside rendered rule text) — owned by Visual Design
Mode:         both — inherits host surface's mode (spell/weapon editors & browsers = prep, encounter
              runner/NPC dossier = play), but its own interaction contract meets the stricter play-mode bar
              everywhere, since the same rendered text appears in both
Operator:     DM
Focal:        the surrounding rule text stays focal; the term is marked with a light dotted underline,
              not a filled chip — it must not visually compete with DiceText's rollable-die chips or
              read as a button in running prose
Route shape:  bespoke — an inline disclosure embedded in existing text-rendering output (ReferenceText/
              DiceText spans, quick-rules panels), not a Browser/Viewer/Editor route
Edit style:   n/a — read-only for this plan. Glossary content ships as a static registry (mirrors
              spellValueReferenceRegistry/weaponValueReferenceRegistry shape); no DM-facing editor yet
Save:         n/a — no user-authored state
Empty:        no matching glossary entry → term renders as plain text with no affordance; silent
              no-op, not an error state (mirrors ReferenceText's unknown-token handling)
Load failure: n/a — registry is bundled, not fetched
Destructive:  none
Keyboard:     each term is a native `<button>` (or `role="button"` + `tabIndex={0}`) inline in text
              flow; Enter/Space toggles the popover; Escape closes the topmost open popover per the
              existing dismissible-layer rule; only one glossary popover open at a time
Touch:        tap toggles the popover (hover has no touch equivalent); tap outside or Escape-equivalent
              dismisses. The trigger is inline text and cannot meet the 48px control-height floor
              without breaking reading layout — this plan proposes adding "inline glossary term
              triggers" to the DESIGN_SYSTEM.md accessibility-floor exception list, alongside the
              existing Map Lab canvas-glyph exception, rather than quietly deviating from the IN FORCE
              touch rule.

## Stages

1. **Term registry + matcher.** A static glossary registry (term → plain-language definition, mirroring
   the shape of the existing reference-token registries) and a matcher that scans plain rendered text
   for known terms without touching `{}` reference-token parsing. Seed it with a handful of real terms
   already used in spell/weapon quick rules (e.g. advantage, disadvantage, concentration, saving throw).
2. **GlossaryTerm popover component.** A shared component under `frontend/src/components/` that wraps a
   matched term: renders the light-underline mark, and on hover/focus/tap shows a small popover with
   the definition, positioned to stay on-screen, dismissed by Escape, outside click/tap, or blur.
   Its public content contract is reusable: `children: ReactNode` supplies the inline trigger and
   `content: ReactNode` supplies the popover body, so Stage 3 can pass matched text plus a definition
   and Stage 5 can pass a richer catalog summary without replacing the component. Add the
   DESIGN_SYSTEM.md accessibility-floor exception noted above.
3. **Wire into existing rule-text rendering.** Run the matcher over the output of `ReferenceText`/
   `DiceText` (or the same call sites that use them today — spell/weapon browsers and editors, and
   player spell section) so glossary terms light up wherever rule text already renders, with no
   per-surface opt-in.
4. **Expand glossary coverage.** Once the mechanism is proven on spells/weapons, add remaining
   commonly-used rule terms (conditions, combat actions) and confirm coverage against real seed data
   rather than a hand-maintained list that can drift.
5. **Catalog-entity reference tooltips.** Reuse the same popover component from Stage 2 for a second,
   live-data matcher: when rendered text mentions a spell, weapon, item, monster, or NPC by name,
   hovering/tapping it shows a summary card of that record (pulled from the already-loaded catalog
   data the host surface holds, not a new fetch, where available). This differs from Stages 1-4 in
   two ways worth flagging when it's picked up: `Empty` becomes "no catalog record matches this name
   → plain text, same silent no-op as an unknown glossary term" rather than always-present static
   text, and `Load failure` stops being n/a wherever the summary does require an API lookup the host
   surface hasn't already made.

## Shipped

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| 1 | Added the static six-entry rule glossary registry and a case-insensitive, whole-word matcher that preserves source text and offsets. Focused tests cover aliases, longest matches, casing, tiling, unmatched text, and duplicate keys. |
| 2 | Added the reusable `GlossaryTerm` inline popover with exclusive hover, focus, tap, keyboard, dismissal, and viewport-clamping behavior. Documented inline glossary triggers as a deliberate exception to the 48px touch-target floor. |
| 3 | Wired glossary matching into `DiceText`, so known terms receive the shared popover across direct rule text and resolved `ReferenceText` output without per-surface opt-in. Dice pills, source order, casing, role variants, and unmatched text remain intact. |
