# Monster Seed Corrections — 5etools Cross-Reference

**Seed monsters:** 2734  
**5etools unique entries:** 3503  
**Monsters with missing core data:** 527  
  - **Fixable from 5etools:** 53 (26 full, 27 partial)  
    - Exact name matches: 33  
    - Fuzzy matches: 20  
  - **No fix available (5etools also lacks data):** 474  

## Format Notes

5etools source format differs from seed format. Corrections below are already transformed:
- **Size**: Letter codes (`M`, `L`) → full words (`medium`, `large`)
- **AC**: List format `[10]` → dict format `{"10": null}`
- **Stats**: Top-level `str`/`dex` etc → nested under `stats`
- **Actions**: Raw `entries` text with `{@atk ...}` markup (needs parsing for structured `attack` objects)

Machine-readable JSON: `docs/monster_seed_corrections.json`

---
## Fixable Monsters

### Altisaur (PSX) — FULL FIX (fuzzy match)

**Missing:** size, type, ac, hp, speed, stats, cr, action

```json
{
  "size": [
    "gargantuan"
  ],
  "type": {
    "type": "monstrosity",
    "tags": [
      "dinosaur"
    ]
  },
  "ac": {
    "15": "natural armor"
  },
  "hp": {
    "average": 198,
    "formula": "12d20 + 72"
  },
  "speed": {
    "walk": 40
  },
  "stats": {
    "str": 28,
    "dex": 6,
    "con": 23,
    "int": 3,
    "wis": 12,
    "cha": 7
  },
  "cr": "13",
  "action": [
    {
      "name": "Multiattack",
      "entries": [
        "The altisaur makes one Stomp attack and one Tail attack. The altisaur can't make both attacks against the same target."
      ]
    },
    {
      "name": "Stomp",
      "entries": [
        "{@atk mw} {@hit 14} to hit, reach 10 ft., one target. {@h}33 ({@damage 7d6 + 9}) bludgeoning damage. If the target is a Huge or smaller creature, it must succeed on a DC22 Strength saving throw or have the {@condition prone} condition."
      ]
    },
    {
      "name": "Tail",
      "entries": [
        "{@atk mw} {@hit 14} to hit, reach 20 ft., one target. {@h}45 ({@damage 8d8 + 9}) bludgeoning damage, and the target is pushed up to 20 feet horizontally from the altisaur."
      ]
    }
  ]
}
```

### Amphisbaena (TftYP) — FULL FIX (fuzzy match)

**Missing:** size, type, ac, hp, speed, stats, action

```json
{
  "size": [
    "medium"
  ],
  "type": {
    "type": "monstrosity"
  },
  "ac": {
    "14": null
  },
  "hp": {
    "average": 11,
    "formula": "2d8 + 2"
  },
  "speed": {
    "walk": 30,
    "swim": 30
  },
  "stats": {
    "str": 14,
    "dex": 18,
    "con": 12,
    "int": 3,
    "wis": 10,
    "cha": 3
  },
  "action": [
    {
      "name": "Multiattack",
      "entries": [
        "The amphisbaena makes two bite attacks."
      ]
    },
    {
      "name": "Bite",
      "entries": [
        "{@atk mw} {@hit 6} to hit, reach 5 ft., one target. {@h}6 ({@damage 1d4 + 4}) piercing damage, and the target must make a DC11 Constitution saving throw, taking 3 ({@damage 1d6}) poison damage on a failed save, or half as much damage on a successful one."
      ]
    }
  ]
}
```

### Ash Zombie (PaBTSO) — FULL FIX (fuzzy match)

**Missing:** size, type, ac, hp, speed, stats, cr, action

```json
{
  "size": [
    "medium"
  ],
  "type": {
    "type": "undead"
  },
  "ac": {
    "8": null
  },
  "hp": {
    "average": 22,
    "formula": "3d8 + 9"
  },
  "speed": {
    "walk": 20
  },
  "stats": {
    "str": 13,
    "dex": 6,
    "con": 16,
    "int": 3,
    "wis": 6,
    "cha": 5
  },
  "cr": "1/4",
  "action": [
    {
      "name": "Slam",
      "entries": [
        "{@atk mw} {@hit 3} to hit, reach 5 ft., one target. {@h}4 ({@damage 1d6 + 1}) bludgeoning damage."
      ]
    }
  ]
}
```

### Boontu Monkey — FULL FIX (exact match)

**Missing:** hp

```json
{
  "hp": {
    "special": "3"
  }
}
```

### Ceratops (PSX) — FULL FIX (fuzzy match)

**Missing:** size, type, ac, hp, speed, stats, cr, action

```json
{
  "size": [
    "gargantuan"
  ],
  "type": {
    "type": "monstrosity",
    "tags": [
      "dinosaur"
    ]
  },
  "ac": {
    "16": "natural armor"
  },
  "hp": {
    "average": 139,
    "formula": "9d20 + 45"
  },
  "speed": {
    "walk": 50
  },
  "stats": {
    "str": 24,
    "dex": 8,
    "con": 21,
    "int": 4,
    "wis": 10,
    "cha": 7
  },
  "cr": "9",
  "action": [
    {
      "name": "Multiattack",
      "entries": [
        "The ceratops makes one Gore attack and one Stomp attack."
      ]
    },
    {
      "name": "Gore",
      "entries": [
        "{@atk mw} {@hit 11} to hit, reach 10 ft., one target. {@h}29 ({@damage 4d10 + 7}) piercing damage. If the ceratops moved at least 20 feet in a straight line toward the target immediately before the hit, the target takes an extra 11 ({@damage 2d10}) piercing damage; if the target is a creature, it also must succeed on a DC19 Strength saving throw or be pushed up to 20 feet from the ceratops and have the {@condition prone} condition."
      ]
    },
    {
      "name": "Stomp",
      "entries": [
        "{@atk mw} {@hit 11} to hit, reach 5 ft., one target. {@h}29 ({@damage 4d10 + 7}) bludgeoning damage."
      ]
    }
  ]
}
```

### Chimeric Fox (IDRotF) — FULL FIX (fuzzy match)

**Missing:** size, type, ac, hp, speed, stats, cr, action

```json
{
  "size": [
    "tiny"
  ],
  "type": {
    "type": "beast"
  },
  "ac": {
    "13": null
  },
  "hp": {
    "average": 2,
    "formula": "1d4"
  },
  "speed": {
    "walk": 30,
    "burrow": 5
  },
  "stats": {
    "str": 2,
    "dex": 16,
    "con": 11,
    "int": 3,
    "wis": 12,
    "cha": 6
  },
  "cr": "0",
  "action": [
    {
      "name": "Bite",
      "entries": [
        "{@atk mw} {@hit 5} to hit, reach 5 ft., one creature. {@h}1 piercing damage."
      ]
    }
  ]
}
```

### Chwinga (CM) — FULL FIX (fuzzy match)

**Missing:** size, type, ac, hp, speed, stats, cr, action

```json
{
  "size": [
    "tiny"
  ],
  "type": {
    "type": "elemental"
  },
  "ac": {
    "15": null
  },
  "hp": {
    "average": 5,
    "formula": "2d4"
  },
  "speed": {
    "walk": 20,
    "climb": 20,
    "swim": 20
  },
  "stats": {
    "str": 1,
    "dex": 20,
    "con": 10,
    "int": 14,
    "wis": 16,
    "cha": 16
  },
  "cr": "0",
  "action": [
    {
      "name": "Magical Gift (1/Day)",
      "entries": [
        "The chwinga targets a humanoid it can see within 5 feet of it. The target gains a {@filter supernatural charm|rewards|type=charm} of the DM's choice. See {@book chapter 7|DMG|7|Other Rewards} of the Dungeon Masters Guide for more information on supernatural charms."
      ]
    },
    {
      "name": "Natural Shelter",
      "entries": [
        "The chwinga magically takes shelter inside a rock, a living plant, or a natural source of fresh water in its space. The chwinga can't be targeted by any attack, spell, or other effect while inside this shelter, and the shelter doesn't impair the chwinga's blindsight. The chwinga can use its action to emerge from a shelter. If its shelter is destroyed, the chwinga is forced out and appears in the shelter's space, but is otherwise unharmed."
      ]
    }
  ]
}
```

### Chwinga (IDRotF) — FULL FIX (fuzzy match)

**Missing:** size, type, ac, hp, speed, stats, cr, action

```json
{
  "size": [
    "tiny"
  ],
  "type": {
    "type": "elemental"
  },
  "ac": {
    "15": null
  },
  "hp": {
    "average": 5,
    "formula": "2d4"
  },
  "speed": {
    "walk": 20,
    "climb": 20,
    "swim": 20
  },
  "stats": {
    "str": 1,
    "dex": 20,
    "con": 10,
    "int": 14,
    "wis": 16,
    "cha": 16
  },
  "cr": "0",
  "action": [
    {
      "name": "Magical Gift (1/Day)",
      "entries": [
        "The chwinga targets a humanoid it can see within 5 feet of it. The target gains a {@filter supernatural charm|rewards|type=charm} of the DM's choice. See {@book chapter 7|DMG|7|Other Rewards} of the Dungeon Masters Guide for more information on supernatural charms."
      ]
    },
    {
      "name": "Natural Shelter",
      "entries": [
        "The chwinga magically takes shelter inside a rock, a living plant, or a natural source of fresh water in its space. The chwinga can't be targeted by any attack, spell, or other effect while inside this shelter, and the shelter doesn't impair the chwinga's blindsight. The chwinga can use its action to emerge from a shelter. If its shelter is destroyed, the chwinga is forced out and appears in the shelter's space, but is otherwise unharmed."
      ]
    }
  ]
}
```

### Crystal Cave Merfolk — FULL FIX (exact match)

**Missing:** hp

```json
{
  "hp": {
    "special": "11"
  }
}
```

### Dankwood Hag — FULL FIX (exact match)

**Missing:** hp

```json
{
  "hp": {
    "special": "82"
  }
}
```

### Derro Savant (OotA) — FULL FIX (fuzzy match)

**Missing:** size, type, ac, speed, action

```json
{
  "size": [
    "small"
  ],
  "type": {
    "type": "aberration",
    "tags": [
      "sorcerer"
    ]
  },
  "ac": {
    "13": "{@item leather armor|PHB}"
  },
  "speed": {
    "walk": 30
  },
  "action": [
    {
      "name": "Quarterstaff",
      "entries": [
        "{@atk mw} {@hit 1} to hit, reach 5 ft., one target. {@h}2 ({@damage 1d6 - 1}) bludgeoning damage."
      ]
    },
    {
      "name": "Chromatic Beam",
      "entries": [
        "The derro launches a brilliant beam of magical energy in a 5-foot-wide line that is 60 feet long. Each creature in the line must make a DC12 Dexterity saving throw, taking 21 ({@damage 6d6}) radiant damage on a failed save, or half as much damage on a successful one."
      ]
    }
  ]
}
```

### Dryad (PSX) — FULL FIX (fuzzy match)

**Missing:** size, type, ac, hp, speed, stats, cr, action

```json
{
  "size": [
    "medium"
  ],
  "type": {
    "type": "fey"
  },
  "ac": {
    "11": null,
    "16": null
  },
  "hp": {
    "average": 22,
    "formula": "5d8"
  },
  "speed": {
    "walk": 30
  },
  "stats": {
    "str": 10,
    "dex": 12,
    "con": 11,
    "int": 14,
    "wis": 15,
    "cha": 18
  },
  "cr": "1",
  "action": [
    {
      "name": "Club",
      "entries": [
        "{@atk mw} {@hit 2} to hit ({@hit 6} to hit with shillelagh), reach 5 ft., one target. {@h}2 ({@damage 1d4}) bludgeoning damage, or 8 ({@damage 1d8 + 4}) bludgeoning damage with shillelagh."
      ]
    },
    {
      "name": "Fey Charm",
      "entries": [
        "The dryad targets one humanoid or beast that she can see within 30 feet of her. If the target can see the dryad, it must succeed on a DC14 Wisdom saving throw or be magically {@condition charmed}. The {@condition charmed} creature regards the dryad as a trusted friend to be heeded and protected. Although the target isn't under the dryad's control, it takes the dryad's requests or actions in the most favorable way it can.",
        "Each time the dryad or its allies do anything harmful to the target, it can repeat the saving throw, ending the effect on itself on a success. Otherwise, the effect lasts 24 hours or until the dryad dies, is on a different plane of existence from the target, or ends the effect as a bonus action. If a target's saving throw is successful, the target is immune to the dryad's Fey Charm for the next 24 hours.",
        "The dryad can have no more than one humanoid and up to three beasts {@condition charmed} at a time."
      ]
    }
  ]
}
```

### Dum-Dum Goblin — FULL FIX (exact match)

**Missing:** hp

```json
{
  "hp": {
    "special": "7"
  }
}
```

### Dwarf — FULL FIX (exact match)

**Missing:** hp

```json
{
  "hp": {
    "special": "30"
  }
}
```

### Hangry Otyugh — FULL FIX (exact match)

**Missing:** hp

```json
{
  "hp": {
    "special": "114"
  }
}
```

### Harpy (PSX) — FULL FIX (fuzzy match)

**Missing:** size, type, ac, hp, speed, stats, cr, action

```json
{
  "size": [
    "medium"
  ],
  "type": {
    "type": "monstrosity"
  },
  "ac": {
    "11": null
  },
  "hp": {
    "average": 38,
    "formula": "7d8 + 7"
  },
  "speed": {
    "walk": 20,
    "fly": 40
  },
  "stats": {
    "str": 12,
    "dex": 13,
    "con": 12,
    "int": 7,
    "wis": 10,
    "cha": 13
  },
  "cr": "1",
  "action": [
    {
      "name": "Multiattack",
      "entries": [
        "The harpy makes two attacks: one with its claws and one with its club."
      ]
    },
    {
      "name": "Claws",
      "entries": [
        "{@atk mw} {@hit 3} to hit, reach 5 ft., one target. {@h}6 ({@damage 2d4 + 1}) slashing damage."
      ]
    },
    {
      "name": "Club",
      "entries": [
        "{@atk mw} {@hit 3} to hit, reach 5 ft., one target. {@h}3 ({@damage 1d4 + 1}) bludgeoning damage."
      ]
    },
    {
      "name": "Luring Song",
      "entries": [
        "The harpy sings a magical melody. Every humanoid and giant within 300 feet of the harpy that can hear the song must succeed on a DC11 Wisdom saving throw or be {@condition charmed} until the song ends. The harpy must take a bonus action on its subsequent turns to continue singing. It can stop singing at any time. The song ends if the harpy is {@condition incapacitated}.",
        "While {@condition charmed} by the harpy, a target is {@condition incapacitated} and ignores the songs of other harpies. If the {@condition charmed} target is more than 5 feet away from the harpy, the target must move on its turn toward the harpy by the most direct route. It doesn't avoid opportunity attacks, but before moving into damaging terrain, such as lava or a pit, and whenever it takes damage from a source other than the harpy, a target can repeat the saving throw. A creature can also repeat the saving throw at the end of each of its turns. If a creature's saving throw is successful, the effect ends on it.",
        "A target that successfully saves is immune to this harpy's song for the next 24 hours."
      ]
    }
  ]
}
```

### Hydra (PSK) — FULL FIX (fuzzy match)

**Missing:** size, type, ac, hp, speed, stats, cr, action

```json
{
  "size": [
    "huge"
  ],
  "type": {
    "type": "monstrosity"
  },
  "ac": {
    "15": "natural armor"
  },
  "hp": {
    "average": 172,
    "formula": "15d12 + 75"
  },
  "speed": {
    "walk": 30,
    "swim": 30
  },
  "stats": {
    "str": 20,
    "dex": 12,
    "con": 20,
    "int": 2,
    "wis": 10,
    "cha": 7
  },
  "cr": "8",
  "action": [
    {
      "name": "Multiattack",
      "entries": [
        "The hydra makes as many bite attacks as it has heads."
      ]
    },
    {
      "name": "Bite",
      "entries": [
        "{@atk mw} {@hit 8} to hit, reach 10 ft., one target. {@h}10 ({@damage 1d10 + 5}) piercing damage."
      ]
    }
  ]
}
```

### Ice Troll (RoT) — FULL FIX (fuzzy match)

**Missing:** size, type, ac, hp, speed, stats, cr, action

```json
{
  "size": [
    "large"
  ],
  "type": {
    "type": "giant"
  },
  "ac": {
    "16": "natural armor"
  },
  "hp": {
    "average": 115,
    "formula": "10d10 + 60"
  },
  "speed": {
    "walk": 30
  },
  "stats": {
    "str": 18,
    "dex": 8,
    "con": 22,
    "int": 7,
    "wis": 9,
    "cha": 7
  },
  "cr": "8",
  "action": [
    {
      "name": "Multiattack",
      "entries": [
        "The troll makes three attacks: one with its bite and two with its claws."
      ]
    },
    {
      "name": "Bite",
      "entries": [
        "{@atk mw} {@hit 7} to hit, reach 5 ft., one target. {@h}7 ({@damage 1d6 + 4}) piercing damage plus 9 ({@damage 2d8}) cold damage."
      ]
    },
    {
      "name": "Claw",
      "entries": [
        "{@atk mw} {@hit 7} to hit, reach 5 ft., one target. {@h}11 ({@damage 2d6 + 4}) slashing damage plus 9 ({@damage 2d8}) cold damage. If the target takes any of the cold damage, the target must succeed on a DC15 Constitution saving throw or have disadvantage on its attack rolls until the end of its next turn."
      ]
    }
  ]
}
```

### Mechanical Bird — FULL FIX (exact match)

**Missing:** hp

```json
{
  "hp": {
    "special": "1"
  }
}
```

### Medusa (MOT) — FULL FIX (fuzzy match)

**Missing:** size, type, ac, hp, speed, stats, cr, action

```json
{
  "size": [
    "medium"
  ],
  "type": {
    "type": "monstrosity"
  },
  "ac": {
    "15": "natural armor"
  },
  "hp": {
    "average": 127,
    "formula": "17d8 + 51"
  },
  "speed": {
    "walk": 30
  },
  "stats": {
    "str": 10,
    "dex": 15,
    "con": 16,
    "int": 12,
    "wis": 13,
    "cha": 15
  },
  "cr": "6",
  "action": [
    {
      "name": "Multiattack",
      "entries": [
        "The medusa makes either three melee attacks\u2014one with its snake hair and two with its shortsword\u2014or two ranged attacks with its longbow."
      ]
    },
    {
      "name": "Snake Hair",
      "entries": [
        "{@atk mw} {@hit 5} to hit, reach 5 ft., one creature. {@h}4 ({@damage 1d4 + 2}) piercing damage plus 14 ({@damage 4d6}) poison damage."
      ]
    },
    {
      "name": "Shortsword",
      "entries": [
        "{@atk mw} {@hit 5} to hit, reach 5 ft., one target. {@h}5 ({@damage 1d6 + 2}) piercing damage."
      ]
    },
    {
      "name": "Longbow",
      "entries": [
        "{@atk rw} {@hit 5} to hit, range 150/600 ft., one target. {@h}6 ({@damage 1d8 + 2}) piercing damage plus 7 ({@damage 2d6}) poison damage."
      ]
    }
  ]
}
```

### Naiad (CM) — FULL FIX (fuzzy match)

**Missing:** size, type, ac, hp, speed, stats, cr, action

```json
{
  "size": [
    "medium"
  ],
  "type": {
    "type": "fey"
  },
  "ac": {
    "15": "natural armor"
  },
  "hp": {
    "average": 31,
    "formula": "7d8"
  },
  "speed": {
    "walk": 30,
    "swim": 30
  },
  "stats": {
    "str": 10,
    "dex": 16,
    "con": 11,
    "int": 15,
    "wis": 10,
    "cha": 18
  },
  "cr": "2",
  "action": [
    {
      "name": "Multiattack",
      "entries": [
        "The naiad makes two psychic touch attacks."
      ]
    },
    {
      "name": "Psychic Touch",
      "entries": [
        "{@atk ms} {@hit 6} to hit, reach 5 ft., one target. {@h}9 ({@damage 1d10 + 4}) psychic damage."
      ]
    }
  ]
}
```

### Tressym (BGDIA) — FULL FIX (fuzzy match)

**Missing:** size, type, ac, hp, speed, stats, cr, action

```json
{
  "size": [
    "tiny"
  ],
  "type": {
    "type": "monstrosity"
  },
  "ac": {
    "12": null
  },
  "hp": {
    "average": 5,
    "formula": "2d4"
  },
  "speed": {
    "walk": 40,
    "climb": 30,
    "fly": 40
  },
  "stats": {
    "str": 3,
    "dex": 15,
    "con": 10,
    "int": 11,
    "wis": 12,
    "cha": 12
  },
  "cr": "0",
  "action": [
    {
      "name": "Claws",
      "entries": [
        "{@atk mw} {@hit 0} to hit, reach 5 ft., one target. {@h}1 slashing damage."
      ]
    }
  ]
}
```

### Violet Fungus (DoSI) — FULL FIX (fuzzy match)

**Missing:** size, type, ac, hp, speed, stats, cr, action

```json
{
  "size": [
    "medium"
  ],
  "type": {
    "type": "plant"
  },
  "ac": {
    "5": null
  },
  "hp": {
    "average": 18,
    "formula": "4d8"
  },
  "speed": {
    "walk": 5
  },
  "stats": {
    "str": 3,
    "dex": 1,
    "con": 10,
    "int": 1,
    "wis": 3,
    "cha": 1
  },
  "cr": "1/4",
  "action": [
    {
      "name": "Multiattack",
      "entries": [
        "The fungus makes {@dice 1d4} Rotting Touch attacks."
      ]
    },
    {
      "name": "Rotting Touch",
      "entries": [
        "{@atk mw} {@hit 2} to hit, reach 10 ft., one creature. {@h}4 ({@damage 1d8}) necrotic damage."
      ]
    }
  ]
}
```

### Wraith (PSZ) — FULL FIX (fuzzy match)

**Missing:** size, type, ac, hp, speed, stats, cr, action

```json
{
  "size": [
    "medium"
  ],
  "type": {
    "type": "undead"
  },
  "ac": {
    "13": null
  },
  "hp": {
    "average": 67,
    "formula": "9d8 + 27"
  },
  "speed": {
    "walk": 0,
    "fly": {
      "number": 60,
      "condition": "(hover)"
    },
    "canHover": true
  },
  "stats": {
    "str": 6,
    "dex": 16,
    "con": 16,
    "int": 12,
    "wis": 14,
    "cha": 15
  },
  "cr": "5",
  "action": [
    {
      "name": "Life Drain",
      "entries": [
        "{@atk mw} {@hit 6} to hit, reach 5 ft., one creature. {@h}21 ({@damage 4d8 + 3}) necrotic damage. The target must succeed on a DC14 Constitution saving throw or its hit point maximum is reduced by an amount equal to the damage taken. This reduction lasts until the target finishes a long rest. The target dies if this effect reduces its hit point maximum to 0."
      ]
    },
    {
      "name": "Create Specter",
      "entries": [
        "The wraith targets a humanoid within 10 feet of it that has been dead for no longer than 1 minute and died violently. The target's spirit rises as a {@creature specter} in the space of its corpse or in the nearest unoccupied space. The {@creature specter} is under the wraith's control. The wraith can have no more than seven specters under its control at one time."
      ]
    }
  ]
}
```

### Wurm (PSK) — FULL FIX (fuzzy match)

**Missing:** size, type, ac, hp, speed, stats, cr, action

```json
{
  "size": [
    "huge"
  ],
  "type": {
    "type": "monstrosity"
  },
  "ac": {
    "18": "natural armor"
  },
  "hp": {
    "average": 200,
    "formula": "16d12 + 96"
  },
  "speed": {
    "walk": 50,
    "burrow": 30
  },
  "stats": {
    "str": 24,
    "dex": 10,
    "con": 22,
    "int": 3,
    "wis": 12,
    "cha": 4
  },
  "cr": "14",
  "action": [
    {
      "name": "Bite",
      "entries": [
        "{@atk mw} {@hit 12} to hit, reach 10 ft., one target. {@h}24 ({@damage 5d6 + 7}) piercing damage. If the target is a Medium or smaller creature, it must succeed on a DC20 Dexterity saving throw or be swallowed by the wurm. A swallowed creature is {@condition blinded} and {@condition restrained}, has {@quickref Cover||3||total cover} against attacks and other effects outside the wurm, and takes 17 ({@damage 5d6}) acid damage at the start of each of the wurm's turns. If the wurm takes 30 damage or more on a single turn from a creature inside it, the wurm must succeed on a DC21 Constitution saving throw at the end of that turn or regurgitate all swallowed creatures, which fall {@condition prone} in a space within 10 feet of the wurm. If the wurm dies, a swallowed creature is no longer {@condition restrained} by it and can escape from the corpse by using 20 feet of movement, exiting {@condition prone}."
      ]
    }
  ]
}
```

### Wurm (PSZ) — FULL FIX (fuzzy match)

**Missing:** size, type, ac, hp, speed, stats, cr, action

```json
{
  "size": [
    "huge"
  ],
  "type": {
    "type": "monstrosity"
  },
  "ac": {
    "18": "natural armor"
  },
  "hp": {
    "average": 200,
    "formula": "16d12 + 96"
  },
  "speed": {
    "walk": 50,
    "burrow": 30
  },
  "stats": {
    "str": 24,
    "dex": 10,
    "con": 22,
    "int": 3,
    "wis": 12,
    "cha": 4
  },
  "cr": "14",
  "action": [
    {
      "name": "Bite",
      "entries": [
        "{@atk mw} {@hit 12} to hit, reach 10 ft., one target. {@h}24 ({@damage 5d6 + 7}) piercing damage. If the target is a Medium or smaller creature, it must succeed on a DC20 Dexterity saving throw or be swallowed by the wurm. A swallowed creature is {@condition blinded} and {@condition restrained}, has {@quickref Cover||3||total cover} against attacks and other effects outside the wurm, and takes 17 ({@damage 5d6}) acid damage at the start of each of the wurm's turns. If the wurm takes 30 damage or more on a single turn from a creature inside it, the wurm must succeed on a DC21 Constitution saving throw at the end of that turn or regurgitate all swallowed creatures, which fall {@condition prone} in a space within 10 feet of the wurm. If the wurm dies, a swallowed creature is no longer {@condition restrained} by it and can escape from the corpse by using 20 feet of movement, exiting {@condition prone}."
      ]
    }
  ]
}
```

### Aberrant Spirit — PARTIAL FIX (exact match)

**Missing:** ac, hp, cr
  
**Still missing after fix:** ac, cr

```json
{
  "hp": {
    "special": "40 + 10 for each spell level above 4th"
  }
}
```

### Animated Object (Huge) — PARTIAL FIX (exact match)

**Missing:** hp, cr
  
**Still missing after fix:** cr

```json
{
  "hp": {
    "special": "80"
  }
}
```

### Animated Object (Large) — PARTIAL FIX (exact match)

**Missing:** hp, cr
  
**Still missing after fix:** cr

```json
{
  "hp": {
    "special": "50"
  }
}
```

### Animated Object (Medium) — PARTIAL FIX (exact match)

**Missing:** hp, cr
  
**Still missing after fix:** cr

```json
{
  "hp": {
    "special": "40"
  }
}
```

### Animated Object (Small) — PARTIAL FIX (exact match)

**Missing:** hp, cr
  
**Still missing after fix:** cr

```json
{
  "hp": {
    "special": "25"
  }
}
```

### Animated Object (Tiny) — PARTIAL FIX (exact match)

**Missing:** hp, cr
  
**Still missing after fix:** cr

```json
{
  "hp": {
    "special": "20"
  }
}
```

### Animated Staff — PARTIAL FIX (exact match)

**Missing:** hp, cr
  
**Still missing after fix:** cr

```json
{
  "hp": {
    "special": "40"
  }
}
```

### Avatar of Death — PARTIAL FIX (exact match)

**Missing:** hp, cr
  
**Still missing after fix:** cr

```json
{
  "hp": {
    "special": "half the hit point maximum of its summoner"
  }
}
```

### Beast of the Land — PARTIAL FIX (exact match)

**Missing:** hp, cr
  
**Still missing after fix:** cr

```json
{
  "hp": {
    "special": "5 + five times your ranger level (the beast has a number of Hit Dice [d8s] equal to your ranger level)"
  }
}
```

### Beast of the Sea — PARTIAL FIX (exact match)

**Missing:** hp, cr
  
**Still missing after fix:** cr

```json
{
  "hp": {
    "special": "5 + five times your ranger level (the beast has a number of Hit Dice [d8s] equal to your ranger level)"
  }
}
```

### Beast of the Sky — PARTIAL FIX (exact match)

**Missing:** hp, cr
  
**Still missing after fix:** cr

```json
{
  "hp": {
    "special": "4 + four times your ranger level (the beast has a number of Hit Dice [d6s] equal to your ranger level)"
  }
}
```

### Bestial Spirit — PARTIAL FIX (exact match)

**Missing:** ac, hp, cr
  
**Still missing after fix:** ac, cr

```json
{
  "hp": {
    "special": "20 (Air only) or 30 (Land and Water only) + 5 for each spell level above 2nd"
  }
}
```

### Celestial Spirit — PARTIAL FIX (exact match)

**Missing:** ac, hp, cr
  
**Still missing after fix:** ac, cr

```json
{
  "hp": {
    "special": "40 + 10 for each spell level above 5th"
  }
}
```

### Construct Spirit — PARTIAL FIX (exact match)

**Missing:** ac, hp, cr
  
**Still missing after fix:** ac, cr

```json
{
  "hp": {
    "special": "40 + 15 for each spell level above 4th"
  }
}
```

### Dancing Item — PARTIAL FIX (exact match)

**Missing:** hp, cr
  
**Still missing after fix:** cr

```json
{
  "hp": {
    "special": "10 + five times your bard level"
  }
}
```

### Deck Defender — PARTIAL FIX (exact match)

**Missing:** hp, cr
  
**Still missing after fix:** cr

```json
{
  "hp": {
    "special": "5 + five times your level (the deck defender has a number of Hit Dice [d8s] equal to your level)"
  }
}
```

### Draconic Spirit — PARTIAL FIX (exact match)

**Missing:** ac, hp, cr
  
**Still missing after fix:** ac, cr

```json
{
  "hp": {
    "special": "50 + 10 for each spell level above 5th (the dragon has a number of Hit Dice [d10s] equal to the level of the spell)"
  }
}
```

### Drake Companion — PARTIAL FIX (exact match)

**Missing:** hp, cr
  
**Still missing after fix:** cr

```json
{
  "hp": {
    "special": "5 + five times your ranger level (the drake has a number of Hit Dice [d10s] equal to your ranger level)"
  }
}
```

### Elemental Spirit — PARTIAL FIX (exact match)

**Missing:** ac, hp, cr
  
**Still missing after fix:** ac, cr

```json
{
  "hp": {
    "special": "50 + 10 for each spell level above 4th"
  }
}
```

### Fey Spirit — PARTIAL FIX (exact match)

**Missing:** ac, hp, cr
  
**Still missing after fix:** ac, cr

```json
{
  "hp": {
    "special": "30 + 10 for each spell level above 3rd"
  }
}
```

### Fiendish Spirit — PARTIAL FIX (exact match)

**Missing:** ac, hp, cr
  
**Still missing after fix:** ac, cr

```json
{
  "hp": {
    "special": "50 (Demon only) or 40 (Devil only) or 60 (Yugoloth only) + 15 for each spell level above 6th"
  }
}
```

### Large Mimic (WDMM) — PARTIAL FIX (fuzzy match)

**Missing:** type, ac, speed, stats, cr, action
  
**Still missing after fix:** type, ac, stats, action

```json
{
  "speed": {
    "walk": 0
  },
  "cr": "3"
}
```

### Meeseeks — PARTIAL FIX (exact match)

**Missing:** size, type, ac, hp, speed, stats, cr, action
  
**Still missing after fix:** size, type, ac, speed, stats, cr, action

```json
{
  "hp": {
    "special": "\u2014(immune to damage)"
  }
}
```

### Reaper Spirit — PARTIAL FIX (exact match)

**Missing:** ac, hp, cr
  
**Still missing after fix:** ac, cr

```json
{
  "hp": {
    "special": "40 + 10 for each spell level above 4th"
  }
}
```

### Shadow Spirit — PARTIAL FIX (exact match)

**Missing:** ac, hp, cr
  
**Still missing after fix:** ac, cr

```json
{
  "hp": {
    "special": "35 + 15 for each spell level above 3rd"
  }
}
```

### Undead Spirit — PARTIAL FIX (exact match)

**Missing:** ac, hp, cr
  
**Still missing after fix:** ac, cr

```json
{
  "hp": {
    "special": "30 (Ghostly and Putrid only) or 20 (Skeletal only) + 10 for each spell level above 3rd"
  }
}
```

### Wildfire Spirit — PARTIAL FIX (exact match)

**Missing:** hp, cr
  
**Still missing after fix:** cr

```json
{
  "hp": {
    "special": "5 + five times your druid level"
  }
}
```

---
## Unfixable Monsters (5etools Also Lacks Data)

### Missing: NO 5ETOOLS SOURCE (3)
- Drake (Large) (PSZ)
- Drake (Small) (PSK)
- Drake (Small) (PSZ)

### Missing: ac, action, cr, hp, size, speed, stats (49)
- Animated Drow Statue
- Animated Jade Serpent
- Animatronic Allosaurus
- Ashen Animated Armor
- Ashen Flying Sword
- Ashen Knight
- Ashen Shambling Mound
- Ashen Veteran
- Ashen Warhorse
- Clockwork Behir
- Clockwork Mule
- Dinosaur Skeleton
- Fiendish Orc
- Hulking Shadow
- Lifecraft Elephant
- Mechachimera
- Merfolk Scout
- Modron Planar Incarnate
- Mutated Drow
- Paper Whirlwind
- Reflection
- Sea Elf
- Skeletal Bloodfin
- Skeletal Giant Owl
- Skeletal Owlbear
- Skeletal Polar Bear
- Skeletal Rats
- Skeletal Riding Horse
- Skeletal Two-Headed Owlbear
- Soulstinger Demon
- Swarm of Undead Snakes
- Thopter (Bat)
- Thopter (Blood Hawk)
- Thopter (Eagle)
- Thopter (Hawk)
- Thopter (Owl)
- Thopter (Pseudodragon)
- Thopter (Raven)
- Thopter (Vulture)
- Undead Cockatrice
- Undead Shambling Mound
- Undead Tree
- Wooden Donkey
- Young Hill Giant
- Young Ogre Servant
- Young Troglodyte
- Zombie Cat
- Zombie Rat
- Zombie Snake

### Missing: ac, action, cr, hp, size, speed, stats, type (270)
- Aarakocra Spelljammer
- Aberrant Zealot (Tentacled)
- Acidic Mist Apparition
- Adult Red Dracolich
- Aegisaur
- Aerosaur (Large)
- Aerosaur (Small)
- Air Totem Elemental
- Amber Golem
- Ammit
- Amonkhet Hydra
- Amonkhet Mummy
- Amonkhet Mummy Lord
- Amonkhet Sphinx
- Angel (PSK)
- Angel (PSZ)
- Angel of Amonkhet
- Animated Furniture
- Animated Tile Chimera
- Animated Tree
- Animated Wand
- Anointed
- Archfiend of Ifnir
- Armasaur
- Ashen Heir Anarchist
- Ashen Heir Assassin
- Ashen Heir Mage
- Ashen Heir Veteran
- Avacyn
- Awakened Brown Bear
- Awakened Elk
- Awakened Giant Wasp
- Awakened Shrub Totem Elemental
- Baloth
- Barovian Scout
- Battlehammer Dwarf
- Blacktongue Bullywug
- Blight Totem Elemental
- Booyahg Booyahg Booyahg
- Booyahg Caster
- Booyahg Slave of the Archfey
- Booyahg Slave of the Fiend
- Booyahg Slave of the Great Old One
- Booyahg Whip
- Booyahg Wielder
- Boulderfoot Giant
- Brontodon
- Bruna
- Bugbear Gardener
- Bugbear Lieutenant
- Cat Skeleton
- Caustic Crawler
- Cerodon
- Chimeric Baboon
- Chimeric Cat
- Chimeric Rat
- Chimeric Weasel
- Coatl
- Construct (Animated Armor)
- Construct (Helmed Horror)
- Construct (Modron)
- Construct (Shield Guardian)
- Crimson Helmed Horror
- Crow
- Crystal Golem
- Deadstone Cleft Stone Giant
- Demon (PSK)
- Demon (PSX)
- Demonlord of Ashmouth
- Dragon
- Drow Acolyte
- Drow Assassin
- Drow Bandit
- Drow Commoner
- Drow Cultist
- Drow Guard
- Drow Noble
- Drow Scout
- Drow Spy
- Dryad Spirit
- Duergar Alchemist
- Earth Totem Elemental
- Elder Dinosaur (Etali, Primal Storm)
- Elder Dinosaur (Ghalta, Primal Hunger)
- Elder Dinosaur (Tetzimoc, Primal Death)
- Elder Dinosaur (Zacama, Primal Calamity)
- Elder Monastery of the Distressed Body Monk
- Eldritch Horror Hatchling
- Emberhorn Minotaur
- Emrakul
- Enhanced Medusa
- Eternal
- Eyestalk of Gzemnid
- Falcon
- Felbarren Dwarf
- Ferocidon
- Fire Giant Royal Headsman
- Fire Giant Servant
- Fire Guardian
- Flight Alabaster Angel
- Flight of Moonsilver Angel
- Flying Trident
- Four-Armed Statue
- Frost Giant Servant
- Frozen Golem
- Giant
- Giant Raven
- Giant River Serpent
- Gisela
- Gnarlid
- Goblin Boss Archer
- Golden Stag
- Great Cat
- Griffin
- Griffin (Type 1)
- Griffin (Type 2)
- Hadrosaur
- Hag of the Fetid Gaze
- Half-Blue Dragon Gladiator
- Half-Green Dragon Assassin
- Half-Red Dragon Gladiator
- Hammerskull
- Heartstabber Mosquito
- Hellion
- Hellion (Huge)
- Hellion (Large)
- Hellwasp Grub
- Hill Giant Servant
- Hill Giant Subchief
- Horned Frog
- Host of Herons Angel
- Hurda
- Ice Piercer
- Ice Spider
- Icy Simulacrum
- Infected Townsperson
- Iona
- Junior Drow Priestess of Lolth
- Knight of the Black Sword
- Koi Prawn
- Kozilek
- Kuo-toa Heretic
- Large Drake
- Linvala
- Lonelywood Banshee
- Lycanthropickle
- Lyra
- Macaw
- Mind Flayer Nothic
- Molten Magma Roper
- Monastery of the Distressed Body Monk
- Necro-Alchemist
- Necrotic Centipede
- Nightsea Chil-liren
- Ogre Channeler
- Ogre Goblin Hucker
- Ogre Skeleton
- Orc Commoner
- Oxen
- Parrot
- Peacock
- Pestilence Demon
- Phantom Warrior (Archer)
- Piranha
- Psionic Shambling Mound
- Red Wizard
- Reduced-Threat Aboleth
- Reduced-Threat Basilisk
- Reduced-Threat Behir
- Reduced-Threat Beholder
- Reduced-Threat Black Pudding
- Reduced-Threat Carrion Crawler
- Reduced-Threat Clay Golem
- Reduced-Threat Darkmantle
- Reduced-Threat Displacer Beast
- Reduced-Threat Dragon Turtle
- Reduced-Threat Ettercap
- Reduced-Threat Flesh Golem
- Reduced-Threat Glabrezu
- Reduced-Threat Gray Ooze
- Reduced-Threat Helmed Horror
- Reduced-Threat Hezrou
- Reduced-Threat Hook Horror
- Reduced-Threat Ochre Jelly
- Reduced-Threat Otyugh
- Reduced-Threat Owlbear
- Reduced-Threat Peryton
- Reduced-Threat Remorhaz
- Reduced-Threat Stone Golem
- Reduced-Threat Vrock
- Reduced-Threat Wight
- Reduced-Threat Wyvern
- Reghed Chieftain
- Reghed Great Warrior
- Reghed Shaman
- Reghed Warrior
- Reindeer
- Replica Duodrone
- Replica Pentadrone
- Replica Tridrone
- River Serpent
- Runed Behir
- Sailback
- Sandwurm
- Sergeant (ERLW)
- Sergeant (WDH)
- Serra Angel
- Shade
- Shalai
- Shambling Mound Totem Elemental
- Shapechanged Roper
- Shatterskull Giant
- Shoal Serpent
- Sigarda
- Skaab
- Small Drake
- Snake Horror
- Snow Leopard
- Snow Maiden
- Sphinx (Type 1)
- Sphinx (Type 2)
- Sphinx of Judgment
- Spirit
- Statue of Vergadain
- Stone Guardian (Animated Armor)
- Stone Guardian (Helmed Horror)
- Stone Guardian (Shield Guardian)
- Stone Guardian (Stone Golem)
- Strefan Maurer
- Surrakar
- Svirfneblin Wererat
- Swarm of Piranhas
- Terastodon
- Terra Stomper
- Terracotta Warrior
- The Bagman
- Tiefling Acrobat
- Tiefling Muralist
- Timbermaw
- Treant Totem Elemental
- Trench Giant
- Trilobite
- Trilobite (Giant)
- Turntimber Giant
- Two-Headed Troll
- Tyrant
- Ulamog
- Vampire Null
- Vecna Impersonator
- Vistana Assassin
- Vistana Bandit
- Vistana Bandit Captain
- Vistana Commoner
- Vistana Guard
- Vistana Spy
- Vistana Thug
- Water Totem Elemental
- Whirlwyrm
- Will-o'-Wells
- Wine Weird
- Wood Elf
- Wood Elf Wizard
- Yak
- Yeti Leader
- Young Fire Giant
- Young Frost Giant
- Young Winter Wolf
- Yuan-ti Priest
- Zebra
- Zendikar Golem

### Missing: ac, action, cr, hp, size, speed, type (12)
- Adult Amonkhet Dragon
- Allowak Abominable Yeti
- Allowak Yeti
- Amonkhet Dragon Wyrmling
- Ancient Amonkhet Dragon
- Intelligent Black Pudding
- Sentient Gray Ooze
- Sentient Ochre Jelly
- Stonecloak
- Young Amonkhet Dragon
- Young Cloud Giant
- Zendikar Dragon

### Missing: ac, action, cr, hp, size, stats (2)
- Carnivorous Flower
- Sharkbody Abomination

### Missing: ac, action, cr, hp, size, stats, type (29)
- Advanced Detention Drone
- Animated Armor Detention Drone
- Aquatic Ghoul
- Aquatic Troll
- Chimeric Hare
- Distended Corpse
- Dragon Tortoise
- Elder Dinosaur (Nezahal, Primal Tide)
- Elder Dinosaur (Zetalpa, Primal Dawn)
- Elder Giant Lizard
- Giant Flying Spider
- Giant Rocktopus
- Giant Whirlwyrm
- Giant White Moray Eel
- Gomazoa
- Helmed Horror Detention Drone
- Hippopotamus
- Lacedon
- Replica Monodrone
- Replica Quadrone
- Rooster
- Scrag
- Simic Merfolk
- Sky Whale
- Snowy Owlbear
- Telepathic Pentacle
- Walking Corpse
- Werejaguar
- Woodcrasher Baloth

### Missing: ac, action, cr, hp, speed, stats (1)
- Hound of Ill Omen

### Missing: ac, action, cr, hp, speed, stats, type (1)
- Zombie Horse

### Missing: ac, action, cr, size, speed, stats (1)
- Undead Bulette

### Missing: ac, action, cr, size, speed, stats, type (5)
- Demon Ichor
- Drow Commander
- Engineer
- Kobold Elite
- Zhent Martial Arts Adept

### Missing: ac, action, cr, size, stats, type (1)
- Jade Giant Spider

### Missing: ac, action, cr, speed, stats, type (8)
- Elder Black Pudding
- Gargantuan Rug of Smothering
- Huge Ochre Jelly
- Huge Polar Bear
- Huge Stone Golem
- Rowboat Mimic
- Witchlight Hand (Small)
- Young Wereraven

### Missing: ac, action, hp, size, speed, stats, type (6)
- Fiendish Giant Spider
- Five-Armed Troll
- Flight Goldnight Angel
- Four-Armed Troll
- Old Troglodyte
- Poison Weird

### Missing: ac, action, hp, size, speed, type (1)
- Regenerating Black Pudding

### Missing: ac, action, size, speed, stats, type (6)
- Damaged Flesh Golem
- Headless Iron Golem
- Ice Spider Queen
- Stone Warrior
- Two-Headed Plesiosaurus
- Young Purple Worm

### Missing: ac, action, speed, stats, type (3)
- Animated Knife
- Animated Statue of Lolth
- Flying Dagger

### Missing: ac, action, speed, type (3)
- Mad Golem
- Young Griffon (Medium)
- Young Griffon (Small)

### Missing: ac, action, stats, type (1)
- Large Mimic (RMBRE)

### Missing: ac, action, type (1)
- Young Griffon (Tiny)

### Missing: ac, cr, hp, size, speed, stats (1)
- Detached Shadow

### Missing: ac, cr, hp, size, speed, stats, type (13)
- Barovian Commoner
- Crystal Battleaxe
- Diatryma
- Diva
- Dracophage Subject
- Dwarven Worker
- Enormous Tentacle
- Flying Wand
- Halaster Horror
- Moonshark
- Shield Dwarf Guard
- Shield Dwarf Noble
- Stone Dragon Statue

### Missing: ac, cr, hp, size, stats, type (2)
- Skeleton Key
- Stomping Foot

### Missing: ac, cr, size, speed, stats, type (2)
- Kobold Commoner
- Young Bulette

### Missing: ac, cr, size, speed, type (1)
- Goblin Commoner

### Missing: ac, speed, type (2)
- Big Xorn
- Huge Gray Ooze

### Missing: action (7)
- Creeper
- Frog
- Guardian Portrait
- Hare
- Living Demiplane
- Sea Horse
- Shrieker

### Missing: action, cr (1)
- Giant Fly

### Missing: action, cr, hp, size, speed (1)
- Uthgardt Barbarian Leader

### Missing: action, cr, hp, size, speed, stats, type (6)
- Cloud Giant Noble
- Dragon Hunter
- Gorzil's Gang Troglodyte
- Knight of the Mithral Shield
- Knight of the Order
- Undead Soldier

### Missing: action, cr, hp, size, stats, type (1)
- Cave Badger

### Missing: action, cr, hp, stats (1)
- Brain in Iron

### Missing: action, cr, size, speed, stats (1)
- Metal Wasp

### Missing: action, cr, size, speed, stats, type (1)
- Hill Giant Sergeant

### Missing: action, cr, size, speed, type (1)
- Axe of Mirabar Soldier

### Missing: action, hp, size, stats, type (1)
- Brain Breaker

### Missing: action, size, speed, stats, type (1)
- Armored Saber-Toothed Tiger

### Missing: action, type (2)
- Juvenile Hook Horror
- Young Hook Horror

### Missing: cr (23)
- Apprentice
- Disciple
- Expert (DC)
- Expert (ESK)
- Expert (SDW)
- Expert (SLW)
- Mighty Servant of Leuk-o
- Sacred Statue (MPMM)
- Sacred Statue (MTF)
- Sneak
- Spellcaster
- Spellcaster (Healer) (DC)
- Spellcaster (Healer) (SDW)
- Spellcaster (Healer) (SLW)
- Spellcaster (Mage) (DC)
- Spellcaster (Mage) (SDW)
- Spellcaster (Mage) (SLW)
- Squire
- Tiny Servant
- Warrior (DC)
- Warrior (ESK)
- Warrior (SDW)
- Warrior (SLW)

### Missing: cr, hp, size, speed, stats, type (1)
- Animated Halberd

### Missing: type (2)
- Infant Basilisk
- Young Basilisk

---
## Summary

| Category | Count |
|----------|------:|
| Full fixes available | 26 |
| Partial fixes available | 27 |
| No fix available | 474 |