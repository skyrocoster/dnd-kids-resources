# Brief: a colour system that a four-year-old and an adult can both name

I need help reconsidering the colour palette of an application. Please treat this as a design
research problem, not a code problem — I want reasoning and evidence, and I want to be told where
my current system is wrong.

## What the app is

A home-built D&D companion app for a game I run for my own children. It has two faces reading one
database:

- **A DM app**, used by me on a laptop. Reference material (spells, monsters, weapons), campaign
  material (players, NPCs, encounters, dungeons, a session timeline), loot. Dense, information-rich,
  authored in.
- **A kid app**, used by my children on a tablet at the table. Read-only. Its main surface is a
  dungeon map that records where they have been and what they found.

**My players are four and six years old.** The four-year-old is only beginning to read. The
six-year-old reads fluently. This is the constraint everything else bends around.

## The requirement I have only just noticed

Until now the palette served *me*, authoring. It now has to serve *communication across two
devices and two generations*.

Concretely: if I look at my screen and say **"go to the red door"**, the thing my four-year-old is
looking at on her tablet must also be a thing she calls red. The colour is a spoken token at the
table, not a decoration. So:

1. Any colour that carries meaning must map to **one colour word that both an adult and a
   four-year-old reach for**, and it must be the *same* word for both.
2. The same semantic must be the same colour on both devices.
3. A colour must be identifiable **at a glance, from across a table, on a tablet at whatever
   brightness the room happens to be**.

## Hard constraints

- **Dark mode is required.** It is the preferred and primary mode. Any proposal must work on a
  near-black ground. (A light mode may exist but must not drive the design.)
- The app currently uses **Material Design 3**, with custom colours generated via
  `material-color-utilities`: a source hue is picked, then `Blend.harmonize()`d toward the primary
  seed `#d0bcff`, and tones 80 / 20 / 30 / 90 are taken for
  `--x` / `--on-x` / `--x-container` / `--on-x-container`.
- There is an existing accessibility rule I want kept: **meaning is never carried by hue alone** —
  there is always a second cue (icon, shape, text, pattern).
- ~1 in 12 boys has a colour vision deficiency. I don't want a system that depends on
  red-vs-green discrimination.

## My current palette (dark mode)

Neutral surfaces — a violet-tinted near-black with elevation by tone step:

```
--md-surface            #1c1b1f     (the ground everything sits on)
--md-surface-1          #232128     1.08:1 vs surface
--md-surface-2          #28262e     1.15:1
--md-surface-3          #2e2b35     1.23:1
--md-surface-4          #302d38     1.27:1
--md-surface-5          #34313c     1.35:1
--md-on-surface         #e6e1e6    13.28:1   (body text)
--md-on-surface-variant #cac4d0    10.05:1   (secondary text)
--md-outline            #948f99     5.42:1
--md-outline-variant    #49454f     1.83:1
```

And 26 content-role accent colours, sorted by hue. "Child's word" is my own rough guess at what a
young child would call it — please correct me:

| role token | accent | hue | sat% | light% | child's word | contrast vs #1c1b1f | container | on-container |
|---|---|---|---|---|---|---|---|---|
| `--md-passage-hidden` | `#C7C6C6` | 0 | 1 | 78 | grey | 10.1:1 | `#464747` | `#E3E2E2` |
| `--md-error` | `#f2b8b5` | 3 | 70 | 83 | red | 10.0:1 | `#8c1d18` | `#f9dedc` |
| `--md-fire` | `#FFB3AE` | 4 | 100 | 84 | red | 10.0:1 | `#77302E` | `#FFDAD7` |
| `--md-door` | `#F9B79F` | 16 | 88 | 80 | orange | 10.0:1 | `#683B29` | `#FFDBCE` |
| `--md-loot` | `#F6B994` | 23 | 84 | 77 | orange | 10.0:1 | `#663C20` | `#FFDBC7` |
| `--md-loom-thread-2` | `#FFB784` | 25 | 100 | 76 | orange | 10.1:1 | `#703701` | `#FFDCC5` |
| `--md-divine` | `#FBBA73` | 31 | 94 | 72 | orange | 10.1:1 | `#683D00` | `#FFDCBC` |
| `--md-loom-anchor` | `#FDB967` | 33 | 97 | 70 | orange | 10.0:1 | `#663E00` | `#FFDDB9` |
| `--md-lightning` | `#ECBF79` | 37 | 75 | 70 | orange | 10.0:1 | `#5F4104` | `#FFDEAD` |
| `--md-secondary` | `#e0c568` | 47 | 66 | 64 | yellow | 10.1:1 | `#5c4600` | `#ffe08a` |
| `--md-poison` | `#9BD594` | 114 | 44 | 71 | green | 10.1:1 | `#1D511F` | `#B7F2AE` |
| `--md-loom-thread-3` | `#87D7AB` | 147 | 50 | 69 | green | 10.1:1 | `#005234` | `#A3F4C6` |
| `--md-tertiary` | `#a0d0be` | 158 | 34 | 72 | green | 10.0:1 | `#1d4f40` | `#bcecd9` |
| `--md-nature` | `#86D5C1` | 165 | 48 | 68 | teal | 10.0:1 | `#005143` | `#A2F2DD` |
| `--md-cold` | `#73D5E1` | 187 | 65 | 67 | teal | 10.1:1 | `#004F56` | `#90F2FD` |
| `--md-loom-thread-4` | `#7ED1F3` | 197 | 83 | 72 | teal | 10.0:1 | `#004D62` | `#BAEAFF` |
| `--md-arcane` | `#90CDFE` | 207 | 98 | 78 | blue | 10.1:1 | `#004B71` | `#CBE6FF` |
| `--md-skill` | `#A6C8FF` | 217 | 100 | 83 | blue | 10.1:1 | `#18477D` | `#D5E3FF` |
| `--md-loom-thread-5` | `#C4C0FF` | 244 | 100 | 88 | blue | 10.1:1 | `#423F7F` | `#E3DFFF` |
| `--md-passage-locked` | `#C5C0FF` | 245 | 100 | 88 | blue | 10.1:1 | `#433F7F` | `#E3DFFF` |
| `--md-primary` | `#d0bcff` | 258 | 100 | 87 | purple | 10.0:1 | `#4f378b` | `#eaddff` |
| `--md-psychic` | `#DFB7FF` | 273 | 100 | 86 | purple | 10.1:1 | `#593876` | `#F1DAFF` |
| `--md-loom-thread-6` | `#E1B6FD` | 276 | 95 | 85 | purple | 10.0:1 | `#5B3774` | `#F3DAFF` |
| `--md-npc` | `#fbafe3` | 319 | 90 | 84 | pink | 10.1:1 | `#6c325e` | `#ffd7ef` |
| `--md-loom-thread-1` | `#FFB1C1` | 348 | 100 | 85 | red | 10.0:1 | `#753042` | `#FFD9DF` |
| `--md-boss` | `#FFB1C1` | 348 | 100 | 85 | red | 10.0:1 | `#753042` | `#FFD9DF` |

What the roles mean, roughly:

- **Damage/effect types:** fire, cold, lightning, poison, psychic, arcane, divine, nature.
- **Content types:** npc, loot, door, boss, skill.
- **State:** error, passage-locked, passage-hidden.
- **Structural MD3 roles:** primary, secondary, tertiary.
- **`loom-thread-1..6` and `loom-anchor`:** arbitrary categorical colours for a session-timeline
  feature — these are a categorical series, not semantics.

## The problems I have measured

1. **Every accent is the same lightness by construction.** All 26 land at 10.0–10.1:1 against the
   surface, because each was generated to the same tone. Lightness — the channel that survives poor
   viewing conditions and colour vision deficiency — carries *zero* information. Hue does 100% of
   the work.
2. **Roles collapse into shared colour words.** Six read as "orange" (door, loot, divine,
   lightning, loom-thread-2, loom-anchor). Four as "red". Four as "blue". Three as "purple". Three
   as "green". Three as "teal".
3. **Two pairs are effectively identical hexes.** `--md-boss` and `--md-loom-thread-1` are both
   `#FFB1C1`. `--md-passage-locked` `#C5C0FF` and `--md-loom-thread-5` `#C4C0FF` differ by one unit.
4. **Several colours have no child-accessible name at all.** `--md-nature` `#86D5C1` is a mint
   green-teal. There is no word a four-year-old and I would both reach for, so it cannot be spoken
   about.
5. **26 colour-coded roles exceeds any four-year-old's colour vocabulary.** I believe the honest
   ceiling is far lower, but I don't know what the real number is.

I think the underlying mistake is that I optimised for aesthetic coherence — everything harmonised
toward one seed, everything at one tone — and coherence is precisely what destroys
distinguishability. The palette is pretty and it does not communicate.

## What I would like from you

1. **Correct or confirm my developmental assumptions, with sources.** How many colour terms can a
   four-year-old and a six-year-old reliably and *consistently* produce and comprehend? Which terms,
   in what order of acquisition? Where do children over-extend or disagree with adults? I have been
   assuming something like the Berlin & Kay basic colour terms with red/blue/green/yellow solid
   early and the full set by five or six — tell me if that is right and how confident I should be.
2. **Tell me the real ceiling** on the number of simultaneously colour-coded categories that work
   for this audience, in this setting, and say what it depends on.
3. **Propose a small "spoken" palette** — the colours that carry meaning and get said out loud —
   with actual hex values for a dark ground of `#1c1b1f`. For each: the single colour word it maps
   to, its contrast ratio against the ground, and why that hue *and that lightness*. I specifically
   want lightness varied deliberately rather than held constant, unless you think that's wrong.
   Show me how it holds up under the common colour vision deficiencies.
4. **Tell me what to do with the other twenty-odd roles.** Is a two-tier system right — a small
   spoken/semantic palette plus a larger never-spoken aesthetic-identity palette for my own
   authoring surfaces? Or is that a fudge, and should the whole thing be re-derived? Argue it either
   way rather than agreeing with me.
5. **Say whether MD3 + `Blend.harmonize()` is the wrong tool here**, given that harmonisation toward
   a single seed is arguably the direct cause of problem 1. If it is, say what to use instead and
   how to keep a coherent-looking product without collapsing distinguishability.
6. **Flag anything I have not thought about.** Ambient light on a tablet at a table. Whether
   colour is even the right channel for a pre-reader versus shape, icon, or position. Whether
   asking a four-year-old to decode a legend is a lost cause regardless of palette.

Please push back on the framing where it deserves it. I would rather be told the two-tier idea is
wrong now than build it.
