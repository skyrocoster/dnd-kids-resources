WORK ORDER 01 — Glossary registry and term matcher
GOAL: a static rule-term glossary registry and a matcher that splits plain rendered text into text and matched-term nodes
DEPENDS ON: none
REQUIRED STRENGTH: Light
CREATES:
- frontend/src/components/glossaryTerms.ts
- frontend/src/components/__tests__/glossaryTerms.test.ts
REMOVES: none
CHANGES SIGNATURE: none

KNOWN STATE (already true — do NOT redo or re-derive):
- Both files this order creates are new; the module is plain TypeScript with no React. The GlossaryTerm popover component is Stage 2 and is NOT part of this order - this order renders nothing.
- This mechanism is separate from the {} reference-token system. matchGlossaryTerms runs on already-resolved plain text: it must not parse, strip, or special-case braces. frontend/src/components/referenceText.ts is read for its shape and is not modified by this order.
- Exported API of frontend/src/components/glossaryTerms.ts, decided - implement exactly this: interface GlossaryDefinition { term: string; aliases?: readonly string[]; definition: string }; type GlossaryRegistry = ReadonlyMap<string, GlossaryDefinition>; function createGlossaryRegistry(definitions: readonly GlossaryDefinition[]): GlossaryRegistry; const ruleGlossaryRegistry: GlossaryRegistry; interface LiteralGlossaryNode { type: 'text'; text: string; start: number; end: number }; interface MatchedGlossaryNode { type: 'term'; text: string; definition: GlossaryDefinition; start: number; end: number }; type GlossaryTextNode = LiteralGlossaryNode | MatchedGlossaryNode; function matchGlossaryTerms(text: string, registry: GlossaryRegistry): GlossaryTextNode[].
- Registry rules, decided: createGlossaryRegistry keys the map by the lowercased term AND by each lowercased alias, all pointing at the same definition object; it throws new Error with message 'Duplicate glossary term: <key>' when a key repeats, mirroring the duplicate-token throw of createReferenceRegistry in frontend/src/components/referenceText.ts.
- Matcher rules, decided: case-insensitive; whole-word matches only (a match must not have a word character immediately before or after it); scanning left to right, the longest registry key that matches at a position wins; matches never overlap; node.text preserves the source's original casing, node.definition is the registry entry; the returned nodes tile the source exactly in order, so concatenating every node.text reproduces the input and each node's start/end are source offsets - the same tiling contract parseReferenceText already keeps in frontend/src/components/referenceText.ts.
- Unmatched text is a silent no-op, never an error: text with no known term returns a single text node, and matchGlossaryTerms never throws on any input string. Empty input returns an empty array.
- Seed ruleGlossaryRegistry with exactly these six entries, using these definition strings verbatim: advantage (no aliases) - 'Roll two dice and use the higher one - something is helping you.'; disadvantage (no aliases) - 'Roll two dice and use the lower one - something is making it harder.'; concentration (alias: concentrating) - 'You have to keep thinking about this spell to keep it going. Taking damage can break it, and you can only concentrate on one spell at a time.'; saving throw (aliases: saving throws, save, saves) - 'A roll to dodge, resist, or shrug off something bad happening to you.'; hit points (aliases: hit point, hp) - 'How much damage you can take before you drop.'; prone (no aliases) - 'Knocked down on the ground. It costs part of your move to stand back up.'
- Why 'save' is an alias rather than its own entry: across the 743 seeded spell and weapon quick_rules strings in data/seeds, 'save' appears in 207 and 'saving throw' in 1, so the short form is the one that actually occurs in rendered text and must resolve to the same definition.
- Test conventions for this folder, so no other suite needs opening: sibling suites in frontend/src/components/__tests__ import { describe, expect, it } from 'vitest' and nothing else for pure-logic modules; the new file is .ts, not .tsx, and needs no @testing-library/react import. There are no known test failures in this folder.

START IN:
- frontend/src/components/referenceText.ts — 271 lines, read whole: the registry, node and tiling shapes to mirror (createReferenceRegistry, LiteralReferenceTextNode, parseReferenceText). Do not modify it.
- frontend/src/components/DiceText.tsx — 34 lines, read whole: the left-to-right scan that emits alternating literal and matched segments without gaps, which is the shape matchGlossaryTerms needs. Do not modify it.

DO:
- Create frontend/src/components/glossaryTerms.ts with the types, createGlossaryRegistry, and ruleGlossaryRegistry seeded with the six entries and verbatim definition strings given in KNOWN STATE.
- Add matchGlossaryTerms to that same new file, following the matcher rules in KNOWN STATE.
- Create frontend/src/components/__tests__/glossaryTerms.test.ts, a new describe block covering: the alias 'save' resolving to the saving throw definition, longest-key-wins where two keys match at one position, original casing preserved in node.text, 'disadvantage' matching only disadvantage and never advantage, unmatched text returning one text node, node start/end tiling the source, and createGlossaryRegistry throwing on a duplicate key.

STOP WHEN: `pwsh -NoProfile -Command "if (-not (Test-Path 'frontend/src/components/glossaryTerms.ts')) { exit 1 }" && pwsh -NoProfile -Command "if (-not (Test-Path 'frontend/src/components/__tests__/glossaryTerms.test.ts')) { exit 1 }" && python scripts/order_check.py --tests src/components/__tests__/glossaryTerms.test.ts --typecheck` passes. Then stop — change nothing else.

STATUS: <-- executor writes DONE, FAILED - <reason>, or BLOCKED - <reason>

DEVIATIONS: <-- executor appends, always — exactly two lines
- opened beyond START IN: <files or sections outside the named path/symbol/range, or "none">
- KNOWN STATE re-verified or wrong: <one line, or "none">
