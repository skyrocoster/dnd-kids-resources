WORK ORDER 01 — GlossaryTerm popover
GOAL: GlossaryTerm renders a quiet inline trigger whose reusable popover opens by hover, focus, and tap, stays in the viewport, and dismisses consistently.
DEPENDS ON: none
REQUIRED STRENGTH: Light
CREATES:
- frontend/src/components/GlossaryTerm.tsx
- frontend/src/components/GlossaryTerm.css
- frontend/src/components/__tests__/GlossaryTerm.test.tsx
REMOVES: none
CHANGES SIGNATURE: none

KNOWN STATE (already true — do NOT redo or re-derive):
- The exported GlossaryTerm content contract is `children: ReactNode` for the inline trigger and
  `content: ReactNode` for the popover body; this supports Stage 3 string definitions and Stage 5
  richer catalog summaries without changing the component.
- UX decisions: surrounding rule text stays focal; the trigger is inline text with a light dotted
  underline, not a filled chip; use semantic theme tokens only.
- UX decisions: use a native inline button; hover, focus, and tap/click open it; Enter and Space use
  native button activation; Escape, outside pointer interaction, and blur close it; only one
  GlossaryTerm popover may be open at a time across component instances.
- UX decisions: the popover must clamp to the visible viewport; the trigger remains the focal
  element and the popover body is explanatory, non-modal content.
- UX decisions: inline glossary triggers intentionally do not meet the 48px control-height floor
  because raising their height would break running prose; order 02 records this exception in
  docs/DESIGN_SYSTEM.md.
- `frontend/src/test/setup.ts` supplies shared jsdom geometry shims, including HTMLElement
  `offsetWidth=1000` and `offsetHeight=800`; focused positioning tests may override element geometry
  locally rather than changing global setup.

START IN:
- frontend/src/components/glossaryTerms.ts — GlossaryDefinition and MatchedGlossaryNode show that matched display text and definition content are already separate
- frontend/src/components/DiceText.tsx — the nearby inline rendered-text component and local CSS import convention
- frontend/src/components/DiceText.css — the nearby inline treatment and semantic token convention

DO:
- Create frontend/src/components/GlossaryTerm.tsx at the `GlossaryTerm` export with the reusable content contract and the specified open, exclusive, viewport-clamped, and dismissal behavior.
- Create frontend/src/components/GlossaryTerm.css at `.glossary-term` with the quiet dotted-underline trigger and semantic-token popover treatment.
- Create frontend/src/components/__tests__/GlossaryTerm.test.tsx at `describe('GlossaryTerm')` covering rendering/content, hover-focus-tap opening, cross-instance exclusivity, Escape/outside/blur dismissal, and viewport clamping.

STOP WHEN: `.venv\Scripts\python.exe scripts/order_check.py --tests src/components/__tests__/GlossaryTerm.test.tsx --typecheck --lint` passes and frontend/src/components/GlossaryTerm.tsx, frontend/src/components/GlossaryTerm.css, and frontend/src/components/__tests__/GlossaryTerm.test.tsx all exist. Then stop - change nothing else.

STATUS: DONE — repaired by dispatcher after the cancelled executor run; replaced unreliable pointer/focus state and removed its debug-only test.

DEVIATIONS:
- opened beyond START IN: frontend/src/components/__tests__/DebugClick.test.tsx and frontend/src/theme.css during repair
- KNOWN STATE re-verified or wrong: none
