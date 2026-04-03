# Creature JSON Field Format

Documentation for the `attack_to_hit` and `damage` fields in the creatures database table.

## attack_to_hit Field

Array of attack roll objects. Each represents one attack the creature can make.

### Structure
```json
[
  {
    "name": "string",           // Name of the attack (e.g., "Bite", "Claw", "Slam")
    "roll": "string",           // Dice notation (e.g., "1d8", "2d6") - modifier goes in "mod" field
    "mod": number or null,      // Attack modifier as a number (e.g., 4 for +4, -1 for -1), null if no modifier
    "numerics": [array],        // Abilities that modify the roll (see below)
    "save": boolean,            // Whether a save is required instead of attack roll
    "actor": "string"           // "attacker" for attack rolls, "creature" for saves
  }
]
```

### Example
```json
[
  {
    "name": "Bite",
    "roll": "1d8",
    "mod": 4,
    "numerics": [{"code": "str"}],
    "save": false,
    "actor": "attacker"
  },
  {
    "name": "Fireball",
    "roll": "8d6",
    "mod": null,
    "numerics": [{"code": "sad"}],
    "save": true,
    "actor": "creature"
  }
]
```

## damage Field

Array of damage roll objects. Each represents one type of damage the creature can deal.

### Structure
```json
[
  {
    "name": "string",           // Name of the damage type (e.g., "Bite", "Claw") - should match attack_to_hit name for pairing
    "roll": "string",           // Dice notation (e.g., "1d6", "2d4") - modifier goes in "mod" field
    "mod": number or null,      // Damage modifier as a number (e.g., 2 for +2, -1 for -1), null if no modifier
    "types": [array],           // Damage type codes (e.g., ["piercing"], ["fire", "cold"])
    "save": boolean             // Whether target gets a save for half damage
  }
]
```

### Example
```json
[
  {
    "name": "Bite",
    "roll": "1d4",
    "mod": null,
    "types": ["piercing"],
    "save": false
  },
  {
    "name": "Bite",
    "roll": "2d6",
    "mod": null,
    "types": ["poison"],
    "save": false
  }
]
```

## Numerics Codes

For the `numerics` array in attack_to_hit, use these ability codes:

| Code | Name |
|------|------|
| str | Strength |
| dex | Dexterity |
| con | Constitution |
| int | Intelligence |
| wis | Wisdom |
| cha | Charisma |
| sad | Spell Ability Modifier |
| sam | Spell Attack Modifier |

### Format
```json
"numerics": [
  {"code": "str"},
  {"code": "dex"}
]
```

The API enriches these with emoji and color metadata from the `abilities` table.

## Damage Type Codes

For the `types` array in damage, use these damage type codes. Must use lowercase and match database `damage_types` table.

Common damage types:
- "piercing" (daggers, swords, spears)
- "slashing" (claws, swords, axes)
- "bludgeoning" (hammers, fists, falling)
- "fire" (flames, lava)
- "cold" (ice, winter wind)
- "poison" (venom, toxic gas)
- "acid" (acid spray, digestive juice)
- "lightning" (electricity, thunder)
- "psychic" (mind magic)
- "radiant" (holy light)
- "necrotic" (life drain)
- "force" (magical energy)

### Format
```json
"types": ["piercing"]
```

or multiple types:
```json
"types": ["fire", "cold"]
```

The API enriches these with emoji and color metadata from the `damage_types` table.

## Complete Example

**Fox creature:**
```json
{
  "attack_to_hit": [
    {
      "name": "Bite",
      "roll": "1d4",
      "mod": 2,
      "numerics": [{"code": "dex"}],
      "save": false,
      "actor": "attacker"
    }
  ],
  "damage": [
    {
      "name": "Bite",
      "roll": "1d4",
      "mod": null,
      "types": ["piercing"],
      "save": false
    }
  ]
}
```

**Giant Wolf Spider (multiple damage types):**
```json
{
  "attack_to_hit": [
    {
      "name": "Bite",
      "roll": "1d6",
      "mod": 3,
      "numerics": [{"code": "str"}],
      "save": false,
      "actor": "attacker"
    }
  ],
  "damage": [
    {
      "name": "Bite",
      "roll": "1d6",
      "mod": null,
      "types": ["piercing"],
      "save": false
    },
    {
      "name": "Bite",
      "roll": "2d6",
      "mod": null,
      "types": ["poison"],
      "save": false
    }
  ]
}
```

## Key Points

1. **Modifiers Separated**: The `roll` field contains only dice notation (e.g., "1d8"), and `mod` is a separate number field
2. **Name Pairing**: The `name` field in both `attack_to_hit` and `damage` should match so the frontend can pair attacks with their damage
3. **Multiple Damages**: If one attack produces multiple damage types (e.g., bite + poison), create multiple damage roll objects with the same name
4. **Array Format**: Both fields must be valid JSON arrays, even with a single item
5. **Codes**: Always use lowercase for ability codes and damage type codes
6. **Numerics**: Only use valid ability codes from the table above
7. **Types**: Only use damage type codes that exist in the `damage_types` table
8. **Modifier Values**: Use actual numbers (4, -1, etc.), not strings with signs ("+4", "-1")

## Loading from JSON File

When creating a migration script or loading creatures, parse these as JSON:
```python
attack_to_hit = json.loads(creature['attack_to_hit'])  # Must be valid JSON string
damage = json.loads(creature['damage'])                 # Must be valid JSON string
```

## Using the Separated Mod Field

In JavaScript, when rendering attacks, combine the roll and mod:

```javascript
// From API response: {roll: "1d8", mod: 4}
function formatRoll(rollObj) {
  if (!rollObj.mod) {
    return rollObj.roll;  // "1d8"
  }
  const sign = rollObj.mod > 0 ? '+' : '';
  return `${rollObj.roll}${sign}${rollObj.mod}`;  // "1d8+4"
}
```

This separation makes it easier to:
- Parse and validate rolls independently
- Apply modifiers programmatically
- Display in different formats (e.g., "1d8 (+4 modifier)")

## API Response Format

When fetched from the API, these fields are enriched with metadata:

**Enriched numerics** (from abilities table):
```json
{
  "code": "str",
  "name": "Strength",
  "emoji": "💪",
  "color": "#c0392b"
}
```

**Enriched types** (from damage_types table):
```json
{
  "code": "piercing",
  "name": "Piercing",
  "emoji": "🗡️",
  "color": "#34495e"
}
```
