# D&D concepts and visual composition references

This document records source-backed advice for a possible future migration. It is not a production component specification, a data/API contract, or approval to integrate these experiments. The HTML files here are standalone visual references; map them to the current repository only in a later, explicitly approved Plan.

[`unified-monster-stat-block.html`](unified-monster-stat-block.html) is the complete original Young Red Dragon example and remains unchanged. It is the source for the values, layout, palette, spacing, and responsive behavior described here. It presents one card on one surface.

## Five retained visual composition references

Keep only these five focused standalone HTML previews alongside the complete original:

| Reference | Visual composition contract | Source-backed content and limits |
| --- | --- | --- |
| [`identity.html`](identity.html) | One identity header: category eyebrow, name, descriptor, and a visually distinct CR pill when the example includes one. The CR pill is optional, not part of a universal identity requirement. | This example uses `Dragon`, `Young Red Dragon`, `large, dragon, chaotic evil`, and optional `CR 10`. Other entity identity fields and CR applicability are not established. |
| [`vitals.html`](vitals.html) | One `.vitals` band with three separately labelled `.vital` tiles. Align labels and values; retain the distinct larger HP treatment and subordinate formula example. | AC, HP, and Speed are separate D&D concepts. The Young Red Dragon values are `18 (natural armor)`, `178 (17d10 + 85)`, and `40 ft., fly 80 ft.`. Do not infer other entity values or that the HP formula is always present. |
| [`ability-scores.html`](ability-scores.html) | One six-tile ability-score group. A score and its modifier are shown together in each tile. | STR, DEX, CON, INT, WIS, and CHA remain distinct from saving throws and skills. Values and modifiers in the preview belong to this dragon example. |
| [`proficiencies.html`](proficiencies.html) | One `.profs` row containing two separately labelled `.prof` tiles. Share the visual tile treatment, not the meaning or underlying concept. | Saving throws (`Dex +5, Con +9, Wis +4, Cha +8`) and skills (`Perception +8, Stealth +4`) are distinct D&D concepts and remain separately headed and populated. |
| [`detail-regions.html`](detail-regions.html) | One responsive `.regions` composition of titled `.panel` sections, with section content kept inside its supplied panel. The source arrangement is an example, not a universal set of section names. | Actions contains `Attacks & Actions` / Bite; Defenses contains Senses including passive Perception; Lore contains Fire Breath and Languages. Preserve this mapping in the example. |

These references group presentation patterns rather than creating a standalone page for every data concept. Keep the complete original as the full composition reference; do not replace or edit it as part of this experiment refinement.

## Source-backed mapping: 11 D&D concepts and one shared visual composition

The eleven D&D concepts below stay distinct even when they share one visual composition. The final row records the detail-region layout, which is a shared visual composition rather than a D&D concept. The preview column maps each concept or composition to the five retained references; it does not claim the fields are universal or define how an application should store them.

| Concept or composition | Young Red Dragon example | Retained visual reference | Mapping note |
| --- | --- | --- | --- |
| Identity | `Dragon`; `Young Red Dragon`; `large, dragon, chaotic evil` | `identity.html` | These exact labels and descriptor are example content, not established player/NPC identity fields. |
| Challenge rating (CR) | `CR 10` | `identity.html` | An optional badge example on this monster. NPC applicability is unknown; do not treat CR as a universal player field. |
| Armor class (AC) | `18 (natural armor)` | `vitals.html` | A distinct concept shown in a shared vital tile. |
| Hit points (HP) | `178 (17d10 + 85)` | `vitals.html` | A distinct concept; the source emphasizes the number and styles this example's formula separately. |
| Speed | `40 ft., fly 80 ft.` | `vitals.html` | A distinct concept in the same visual band, not a synonym for AC or HP. |
| Ability scores | STR 23 (+6), DEX 10 (+0), CON 21 (+5), INT 14 (+2), WIS 11 (+0), CHA 19 (+4) | `ability-scores.html` | Six score/modifier tiles; not combined with saving throws or skills. |
| Saving throws | Dex +5, Con +9, Wis +4, Cha +8 | `proficiencies.html` | A separate data concept and heading, sharing the `.prof` presentation with skills. |
| Skills | Perception +8, Stealth +4 | `proficiencies.html` | A separate data concept and heading, sharing the `.prof` presentation with saving throws. |
| Actions / attacks | `Attacks & Actions`; `Bite: Melee Weapon Attack.` | `detail-regions.html` | Example content in Actions, not a reusable component named for Bite. |
| Senses | `Senses darkvision 120 ft., passive Perception 18` | `detail-regions.html` | Keep the displayed Senses entry together, including passive Perception; the source places it in Defenses. |
| Languages | `Languages Common, Draconic` | `detail-regions.html` | Example content in Lore, not a separate panel requirement. |
| Detail-region visual composition | Actions / Defenses / Lore | `detail-regions.html` | One shared visual composition; these section names and assignments are this example's arrangement only. |

## Shared styling and scaffolding

The retained previews reuse a consistent visual language without making every shared style rule a D&D concept or a separate preview:

- **Card frame and page shell:** `.shell` and `.card` provide the centered, bounded preview surface. In the source, the shell is at most 620px wide; the card uses the dark surface, outline, and rounded corners.
- **Palette, typography, spacing, and radii:** retain the source's existing CSS tokens and system-font treatment as visual anchors. These are preview styling, not a production theme/API decision.
- **Section heading and panel:** use the source heading hierarchy and `.panel` treatment for titled content areas. A panel's title and content come from the supplied example; the styling does not assign domain meaning.
- **Label/value and entry patterns:** `.vital` and `.prof` are distinct grouped compositions with labelled values; `.score` is a separate score-plus-modifier tile; `.panel` holds section entries. Similar label/value styling does not make their D&D concepts interchangeable.

Avoid additional standalone previews for AC, HP, Speed, saving throws, skills, Actions, Senses, or Languages: their distinct concepts and source examples are represented in the grouped retained compositions and this mapping.

## Responsive behavior to preserve as a reference

The source and retained previews are standalone, single-surface layouts. Preserve their current palette, spacing, and responsive behavior when using them as references:

- The page shell is centered and bounded to 620px; at a viewport of 500px or less, the identity header stacks and the CR badge, when shown, moves below the identity text.
- At 500px or less, the vitals band uses two columns and HP moves first across the full row; the proficiency tiles and detail-region panels stack into one column.
- Ability scores display six columns above 500px, three columns at 500px or less, and two columns at 360px or less.
- Detail regions use three columns above 500px and one column at 500px or less.

These are observable layout anchors from the experiment, not a decision about production breakpoints or implementation feasibility.

## Entity coverage and limits

Every populated value and section assignment in these references comes from the Young Red Dragon example. The source has no player or NPC stat block, so their fields, values, omissions, CR usage, and section choices remain **unknown**. Do not fill those gaps with assumptions, copy dragon values to another entity type, or infer that every visual composition applies to every entity.

## Source anchors

- Identity and CR: `unified-monster-stat-block.html` lines 40–45 and 97–104.
- Vitals: lines 47–57 and 106–110.
- Ability scores and distinct proficiency entries: lines 59–72 and 112–126.
- Detail-region composition and example assignments: lines 74–76 and 128–143.
- Responsive behavior: lines 78–89.
