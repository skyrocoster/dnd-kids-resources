**Superseded — see `docs/dungeon_plan.md` § "Design system in force"**. This doc served as the design foundation for Material Design 3 dark-mode tokens (Task 8); the live implementation is documented in dungeon_plan.md's design section, which is the authoritative reference.

---

# Dark Mode Design Plan — Material Design 3

**Status:** plan, not yet implemented. Read this before Task 8 (Shared UI components) starts — it's the token system those components should be built against, and it should land as `frontend/src/theme.css` (or equivalent) as part of that task.

## Why this exists now

Task 7 shipped a working shell with no real visual system (`AppShell.css` is bare borders-and-flex, `index.css` is a plain reset with `color-scheme: light dark`). Task 8 is about to build the primitives — `SplitPane`, `SearchList`, `Card`, `DiceText`, form inputs — that every later feature page composes. Those primitives need color, elevation, and type tokens *before* they're built, or the tokens get invented ad hoc per-component and drift.

## Brief and constraint

The instruction was explicit: **dark mode, built to Google's standard.** That means this isn't a free aesthetic pass — it means adopting **Material Design 3 (M3)** dark theme mechanics as specified: tonal palettes (not flat hex swatches), surface elevation via tonal overlay rather than shadow, defined color *roles* (not "the blue" but "primary" / "on-primary" / "primary-container"), a type scale with defined roles, and 4dp-based spacing. Where M3 leaves room (the seed hue, the signature touch), that's where this plan makes a choice for *this* app specifically — a D&D tool a kid uses live at the table, often in a dim room, on a laptop propped next to dice and minis.

## Why dark-mode-first is correct here

This is not a "site with a dark mode toggle." Per `CLAUDE.md`, this app is for **running games live at the table**, not pre-session prep — screens on at a table lit by ambient room light or a single lamp, next to physical minis and dice. Dark surfaces reduce glare and let colored accents (damage types, spell schools, HP-adjacent states) read clearly. Light mode is a secondary, later concern (system already declares `color-scheme: light dark` — don't remove that — but the design token work here targets dark first).

---

## Token system

### Seed & tonal palettes (M3 method)

M3 dark themes are generated from a small set of **seed hues**, each expanded into a 13-stop tonal palette (0=black … 100=white), then color *roles* are assigned fixed tones from that palette (e.g. dark theme: `primary` = tone 80, `on-primary` = tone 20, `surface` = tone 10, etc.). Don't hand-pick flat hexes for roles — derive them from these seeds so contrast is guaranteed correct at every role pairing.

**Seed hues chosen for this app:**

| Seed | Hue anchor | Why this hue |
|---|---|---|
| Primary | `#8B5CF6` (violet) | Arcane/magical association without tipping into "generic purple SaaS" — desaturated in the tonal palette, not used flat. Reads as ink-on-parchment-at-night rather than neon. |
| Secondary | `#C9A227` (old gold) | Ties to dice, brass fittings, campaign/table materials — the "physical objects at the table" register, used sparingly for secondary actions and highlights. |
| Tertiary | `#3F7D6B` (forest teal) | Monsters/wilderness register — used for the monster browser's accent so the three content browsers (spells/monsters/weapons) are visually distinct without needing three unrelated brand colors. |
| Neutral | `#1C1B1F`-family | M3 standard near-black neutral, very slightly violet-tinted (not pure gray) so it harmonizes with the primary seed instead of fighting it. |
| Error | `#B3261E` (M3 default error red) | Standard M3 error role — don't invent a custom error hue, this one is battle-tested for contrast at both tones. |

**Resulting M3 dark-theme role tokens** (tone numbers per M3 spec, dark scheme):

```css
:root[data-theme="dark"] {
  /* Primary (violet) */
  --md-primary:              #D0BCFF; /* tone 80 */
  --md-on-primary:           #381E72; /* tone 20 */
  --md-primary-container:    #4F378B; /* tone 30 */
  --md-on-primary-container: #EADDFF; /* tone 90 */

  /* Secondary (old gold) */
  --md-secondary:              #E0C568; /* tone 80 */
  --md-on-secondary:           #3F2E00; /* tone 20 */
  --md-secondary-container:    #5C4600; /* tone 30 */
  --md-on-secondary-container: #FFE08A; /* tone 90 */

  /* Tertiary (forest teal) — monster browser accent */
  --md-tertiary:              #A0D0BE; /* tone 80 */
  --md-on-tertiary:           #05372A; /* tone 20 */
  --md-tertiary-container:    #1D4F40; /* tone 30 */
  --md-on-tertiary-container: #BCECD9; /* tone 90 */

  /* Error */
  --md-error:              #F2B8B5;
  --md-on-error:            #601410;
  --md-error-container:     #8C1D18;
  --md-on-error-container:  #F9DEDC;

  /* Neutral surfaces — violet-tinted near-black, per M3 elevation tones */
  --md-surface:              #1C1B1F; /* base, elevation 0 */
  --md-surface-1:            #232128; /* +5% primary tint, elevation 1 (cards) */
  --md-surface-2:            #28262E; /* elevation 2 (raised panels, SplitPane rail) */
  --md-surface-3:            #2E2B35; /* elevation 3 (modals, SpellEditor) */
  --md-surface-4:            #302D38;
  --md-surface-5:            #34313C;
  --md-on-surface:           #E6E1E6;
  --md-on-surface-variant:   #CAC4D0;
  --md-outline:              #948F99;
  --md-outline-variant:      #49454F;
}
```

M3's rule: **elevation in dark mode is a surface tint overlay, not a drop shadow.** Higher elevation = more of the primary hue mixed into the neutral surface (already baked into `--surface-1..5` above). Components should switch surfaces by changing `background: var(--md-surface-N)`, not by adding `box-shadow`. This directly fixes `AppShell.css`'s current use of flat `1px solid #333` borders for separation — those become surface-tone steps instead.

### Content-role accent mapping (the one deliberate extension beyond raw M3)

M3 defines primary/secondary/tertiary but doesn't know this app has three parallel content browsers. Map them explicitly so the system stays legible as more features land:

- **Spells** → primary (violet) — `--md-primary` / `--md-primary-container`
- **Monsters** → tertiary (forest teal) — `--md-tertiary` / `--md-tertiary-container`
- **Weapons** → secondary (old gold) — `--md-secondary` / `--md-secondary-container`
- **Campaign CRUD** (players/NPCs/quests/encounters/dungeons) → neutral surfaces only, no accent hue — these are tools, not browsable content, and shouldn't compete visually with the three reference browsers.

This gives `SearchList`/`Card` (Task 8) a `variant` prop (`spell | monster | weapon | neutral`) that swaps container/on-container tokens — one component, three legible identities, zero new components.

### Typography

M3 type scale, using **Roboto Flex** (Google's own variable font, built for exactly this system) for UI/display roles, kept to the roles actually used here — no need to import all 15 M3 scale steps for an app this scoped:

| Role | Token | Size/line/weight | Used for |
|---|---|---|---|
| Headline Small | `--type-headline` | 24px/32px, 400 | Page titles ("Spells", "Monster: Owlbear") |
| Title Medium | `--type-title` | 16px/24px, 500 | Card headers, nav section labels |
| Body Large | `--type-body` | 16px/24px, 400 | Card/detail body text |
| Body Medium | `--type-body-sm` | 14px/20px, 400 | List rows in `SearchList` |
| Label Large | `--type-label` | 14px/20px, 500 | Buttons, form labels |
| Label Small | `--type-caption` | 11px/16px, 500, +0.05em tracking | Metadata (CR, level, damage type tags) |

Dice/roll expressions in `DiceText` (Task 8) get a distinct **monospace utility face** — `'Roboto Mono'` — set at `--type-body-sm` size in a pill using the `secondary-container` tokens (gold), so a `2d6+3` inline in spell text reads immediately as "rollable data," not prose. This is the closest thing to a signature element in an M3-constrained system: the dice pill is the one recurring visual motif tying spells, monsters, and weapons together, since all three browsers surface dice notation.

### Layout / elevation in practice

```
┌─ app-header (surface-2, headline type) ──────────────────────────┐
│  D&D Kids Resources                                               │
├─ app-nav (surface-1) ─┬─ app-main (surface, base) ────────────────┤
│  REFERENCE             │  ┌─ SplitPane ───────────────────────┐   │
│   Spells   (primary)   │  │ SearchList        │  Card          │   │
│   Monsters (tertiary)  │  │ (surface-1)        │  (surface-2)   │   │
│   Weapons  (secondary) │  │  ▸ Fireball        │  Fireball      │   │
│  CAMPAIGN               │  │  ▸ Magic Missile   │  3rd · Evoc.  │   │
│   Players (neutral)    │  │  ▸ Frost Ray       │  [8d6] fire   │   │
│   ...                  │  │                     │  (dice pill)  │   │
│                         │  └────────────────────┴───────────────┘   │
├─────────────────────────┴─────────────────────────────────────────┤
│  app-footer (surface-2, caption type)                              │
└─────────────────────────────────────────────────────────────────┘
```

Each panel is a discrete surface tone step (nav = surface-1, list rail = surface-1, detail card = surface-2, header/footer = surface-2) — depth reads through tone, matching M3's no-shadow dark elevation model, replacing the current `1px solid #333` borders.

### Accessibility floor (non-negotiable, not a stretch goal)

- All role pairs above (`on-X` vs `X`, `on-X-container` vs `X-container`) are M3 spec pairs — already verified ≥4.5:1 contrast by Google's tooling; don't substitute custom hex without re-checking contrast.
- Visible focus ring: `outline: 2px solid var(--md-primary); outline-offset: 2px` on every interactive element — nav links, `SearchList` rows, form inputs, dice pills.
- Respect `prefers-reduced-motion` for any SplitPane drag, modal transition, or hover state added in Task 8+.
- Kid-facing product: don't rely on hue alone to distinguish spell schools/damage types — pair color with text labels (already implied by existing card content).

---

## What Task 8 should do with this

1. Add `frontend/src/theme.css` with the `:root[data-theme="dark"]` block above (and a `light` block later, lower priority — `color-scheme: light dark` is already set, so browser UI won't fight it).
2. Replace `AppShell.css`'s flat borders/`#333` with the surface-tone system.
3. Give `SearchList`/`Card` a `variant` prop per the content-role mapping.
4. Build `DiceText` around the gold monospace pill as its one signature motif.

## Open items (decide during Task 8, not blockers here)
- Whether to ship a `light` M3 tonal set now or defer entirely until there's a toggle UI to hang it on.
- Exact Roboto Flex axis settings (weight/width) vs. falling back to static Roboto if variable-font loading adds noticeable bundle weight.
