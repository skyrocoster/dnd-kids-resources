# Shared monster parts — candidate v1

**Proposal for review, not an approved D&D ruleset or a production migration.**
The governing agreement is [the parent decision document](../2026-09-27-monster-features-remodel.md).
This complete pilot is retained as a **historical comparison baseline**. The
current fork discussion explores monster level and scalable attacks instead;
see [FORKING-DISCUSSION.md](../FORKING-DISCUSSION.md). Do not treat this pilot's
fixed damage defaults or expansion draft as current fork instructions.

## Start here

For the **current fork**, read [FORKING-DISCUSSION.md](../FORKING-DISCUSSION.md)
first. For the **original pilot**, [NEXT-STEPS.md](NEXT-STEPS.md) records its
2026-09-28 assessment and then-proposed next work; those instructions are no
longer an active handoff. Its findings and known validation gaps remain useful.

1. [DECISIONS.md](DECISIONS.md) — what I standardised, discarded, or kept, and why.
   Read the review hotspots first: these are actual gameplay changes.
2. [MODEL.md](MODEL.md) — the proposed three-table structure and assembly rules.
3. `parts.json` — the normal shared weapons, actions, traits, and modifiers.
4. `monster_features.json` — monsters' selections of those parts.
5. `examples.json` — calculated attacks, the five sampled Multiattack recipes, and
   a Frankenstein assembly using existing Javelin, Brute, Fire Breath, and Undead
   Fortitude parts.
6. [EXPANSION-INSTRUCTIONS.md](EXPANSION-INSTRUCTIONS.md) — historical **draft**
   instructions for a cheaper model, not a procedure for the current fork.
7. `source-name-mapping.json` — external, pilot-only source-name/alias and
   occurrence crosswalk; not a playable table or runtime join.

## What is populated

- **50 shared parts**, **44 monster feature profiles**, **90 feature bindings**.
- Eight complete **feature** profiles from the local sample. These are not full
  stat blocks: HP, AC, ability scores, speeds, and other monster data are outside
  the supplied feature sample and have not been invented.
- Thirty-six additional **Javelin-only** profiles. Their other features are
  unknown here, not absent. All 40 Javelin occurrences are represented; four
  overlap the complete sample and are counted once.
- All seven source feature categories are represented, including spellcasting.
- Two empty `Legendary Resistances` headings are omitted. Both real resistance
  traits remain. Splitting the zombie's Unusual Nature into three parts adds two
  bindings, so the source and output totals both happen to be 90.

Only three files are the proposed playable database:

| File | Proposed table |
| --- | --- |
| `parts.json` | Shared rules and normal values |
| `monsters.json` | Monster identities and small combat profiles |
| `monster_features.json` | Ordered references, categories, available modes, attachments |

The other files are development material, not database fields:

- `catalogue-decisions.json`: the primary agent's explicit catalogue choices used
  by the converter. It is not an override table.
- `coverage.json`: external conversion accounting, input hashes, source counts,
  complete/partial profile IDs, and one mapping for every input occurrence.
- `source-name-mapping.json`: external aliases and exact pilot occurrence-to-part
  mappings, checked against the source description or damage component.
- `build_candidate.py`: deterministic, closed-pilot conversion and a limited
  attack resolver. It does not infer a new full-dataset design.
- `test_candidate.py`: focused conversion, joining, and part-swapping checks.
- `NEXT-STEPS.md`: historical readiness assessment and former handoff;
  neither a current fork plan nor a production migration authorization.

## Run this pilot again

Python standard library only. In PowerShell, from the repository root:

```powershell
Set-Location "experiments/monster-features-analysis/candidate-v1"
python -B -c "import subprocess,sys; subprocess.run([sys.executable, '-B', 'build_candidate.py'], timeout=30, check=True)"
python -B -c "import subprocess,sys; subprocess.run([sys.executable, '-B', '-m', 'unittest', '-v', 'test_candidate'], timeout=30, check=True)"
```

Generation reads the local seed/Javelin evidence, catalogue decisions, and the
external name-mapping record. It writes the five generated JSON files in this
folder. Tests verify the saved
outputs as well as regenerating them in memory, so regenerate after changing a
decision. No live database, seeds, application source, or full dataset is changed.

## Limits

This is an assembly model, not a combat engine. The resolver demonstrates weapon
defaults, monster bonuses, mode selection, Brute, conditional enlargement, added
damage, and attached on-hit text. Breath saves, recharge rolls, spellcasting,
Surprise Attack, Dive Attack, and other prose rules remain human-readable rules;
the script does not execute them. Combat state such as `enlarged` is supplied to
the resolver, not persisted as a new monster override.

No balance claim is made. Approving the structure and approving its exact normal
values are separate decisions. The catalogue contains no generic overrides,
source conflict records, or unused future-extension fields.
