# Remaining Unparsed Attack Note Patterns

This document lists representative attack note patterns that are not yet fully parsed by the current parser. For the latest parser status, see the code in lib/ and recent commits.


This document captures one representative note for each remaining pattern in `data/5eTools/extracted/data/bestiary/monsters_merged.json` where `action.notes` still contains attack syntax but no parsed `attack` object.

## Summary

- Total remaining unparsed attack-note action objects: `125`
- Total remaining attack-note strings: `133`

## Patterns and Examples

### 1. Direct numeric damage without a dice macro
`{@atk mw} {@hit 5} to hit, reach 5 ft., one target. {@h}1 bludgeoning damage.`

**Guessed parse:**
```json
"attack": {
  "type": "melee",
  "mod": 5,
  "range": 5,
  "targets": 1,
  "damage": "1",
  "damage_mod": 0,
  "damage_type": "bludgeoning"
}
```

### 2. Range with `ranged N/N ft.`
`{@atk rw} {@hit 4} to hit, ranged 150/600 ft., one target. {@h}6 ({@damage 1d8 + 2}) piercing damage.`

**Guessed parse:**
```json
"attack": {
  "type": "ranged",
  "mod": 4,
  "range": 150,
  "max_range": 600,
  "targets": 1,
  "damage": "1d8",
  "damage_mod": 2,
  "damage_type": "piercing"
}
```

### 3. Range with `range N/N ft.`
`{@atk rw} {@hit 7} to hit, range 30/60 ft., one creature. {@h}The target has the {@condition restrained} condition. As an action, a {@condition restrained} target can make a DC13 Strength check, bursting the webbing on a successful check. The webbing can also be destroyed (AC 10; 5 hit points; vulnerability to fire damage; immunity to acid, bludgeoning, poison, and psychic damage).`

**Guessed parse:**
```json
"attack": {
  "type": "ranged",
  "mod": 7,
  "range": 30,
  "max_range": 60,
  "targets": 1
}
```

**Notes:** keep the restraint text in the note.

### 4. `{@dice ...}` macro instead of `{@damage ...}`
`{@atk rs} {@hit 10} to hit, range 120 ft., one creature. {@h}13 ({@dice 3d8}) damage of a type chosen by Mordakhesh: acid, cold, fire, lightning, poison, or thunder.`

**Guessed parse:**
```json
"attack": {
  "type": "ranged",
  "mod": 10,
  "range": 120,
  "targets": 1,
  "damage": "3d8",
  "damage_mod": 0,
  "damage_type": "variable",
  "damage_choice":["acid", "cold", "fire", "lightning", "poison", "thunder"]
}
```


### 5. Damage type chosen by the creature
`{@atk rs} {@hit 10} to hit, range 90 ft., one target. {@h}22 ({@damage 5d8}) damage of a type chosen by the reigar from the following list: cold, fire, lightning, or radiant.`

**Guessed parse:**
```json
"attack": {
  "type": "ranged",
  "mod": 10,
  "range": 90,
  "targets": 1,
  "damage": "5d8",
  "damage_mod": 0,
  "damage_type": "variable",
  "damage_choice":["cold", "fire", "lightning", "radiant"]
}
```

### 6. `plus PB` damage modifier
`{@atk mw} {@hitYourSpellAttack} to hit, reach 5 ft., one target. {@h}{@damage 1d8 + 2 + PB} slashing damage.`

**Guessed parse:**
```json
"attack": {
  "type": "melee spell",
  "mod": "sam",
  "range": 5,
  "targets": 1,
  "damage": "1d8",
  "damage_mod": 2,
  "damage_extra": "PB",
  "damage_type": "slashing"
}
```

### 7. `{@hit +N}` syntax
`{@atk mw} {@hit +7} to hit, reach 5 ft., one target. {@h}7 ({@damage 1d6 + 4}) piercing damage.`

**Guessed parse:**
```json
"attack": {
  "type": "melee",
  "mod": 7,
  "range": 5,
  "targets": 1,
  "damage": "1d6",
  "damage_mod": 4,
  "damage_type": "piercing"
}
```

### 8. Automatic hit
`{@atk mw} automatic hit, reach 5 ft., one target. {@h}60 force damage, and the target is pushed up to 5 feet away from the marut if it is Huge or smaller.`

**Guessed parse:**
```json
"attack": {
  "type": "melee",
  "mod": null,
  "auto_hit": true
  "range": 5,
  "targets": 1,
  "damage": "60",
  "damage_mod": 0,
  "damage_type": "force"
} ---if there's previous parsed versions that contain "mod":"auto" then they should be put as "mod":null
```

### 9. No damage phrase after `{@h}`
`{@atk mw} {@hit 4} to hit, reach 5 ft., one Medium or smaller creature. {@h}The target is {@condition grappled} (escape DC12). Until this grapple ends, the target is {@condition restrained}, and the grippli can't grab another creature.`

**Guessed parse:**
```json
"attack": {
  "type": "melee",
  "mod": 4,
  "range": 5,
  "targets": 1
}
```

**Notes:** keep the grapple text in notes.

### 10. Incomplete or malformed range text
`{@atk rw} {@hit 4} to hit, range`

**Guessed parse:** not parseable reliably; likely leave as notes until range text is fixed.

### 11. Range text with a single value
`{@atk mw} {@hit 9} to hit, range 5 ft., one target. {@h}10 ({@damage 1d8 + 6}).`

**Guessed parse:**
```json
"attack": {
  "type": "melee",
  "mod": 9,
  "range": 5,
  "targets": 1,
  "damage": "1d8",
  "damage_mod": 6,
  "damage_type": null
}
```

## Notes

- Some patterns are already handled by the parser, but these remain because they still have no parsed `attack` object.
- The `unmatched` category includes notes that do not fit the above regex groups cleanly, including complex additional effect text after damage.

If you want, I can now apply these guessed rules to the remaining notes and parse the rest accordingly.

Secondary 