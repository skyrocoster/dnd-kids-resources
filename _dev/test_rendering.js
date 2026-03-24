// Test the reconstructStructuredRoll function with variants

function reconstructStructuredRoll(rollObj) {
  if (!rollObj || typeof rollObj !== 'object') return 'none';
  
  // Check if it's the special "modifier only" format (no dice)
  if (!rollObj.numDice && !rollObj.diceType) {
    return rollObj.baseModifier || 'none';
  }
  
  let result = '';
  
  // Add dice notation
  if (rollObj.numDice !== undefined && rollObj.diceType) {
    result += `${rollObj.numDice}${rollObj.diceType}`;
  }
  
  // Build modifier part: statModifier and/or baseModifier
  let modifierParts = [];
  
  // Add stat modifier if present (will get span styling in renderer)
  if (rollObj.statModifier) {
    modifierParts.push(`[STAT:${rollObj.statModifier}]`);
  }
  
  // Add applySpellModifier indicator if needed
  if (rollObj.applySpellModifier) {
    modifierParts.push('[BOX]');
  }
  
  // Add base modifier if present
  if (rollObj.baseModifier) {
    // All base modifiers (saves, damage types) get parentheses instead of +
    modifierParts.push(`(${rollObj.baseModifier})`);
  }
  
  // Combine modifier parts
  if (modifierParts.length > 0) {
    // Check if last part is a parenthetical modifier like (save)
    const lastPart = modifierParts[modifierParts.length - 1];
    if (lastPart.startsWith('(') && lastPart.endsWith(')')) {
      // Join all but last with ' + ', then add parenthetical modifier with space
      const nonParenParts = modifierParts.slice(0, -1);
      if (nonParenParts.length > 0) {
        result += ' + ' + nonParenParts.join(' + ') + ' ' + lastPart;
      } else {
        result += ' ' + lastPart;
      }
    } else {
      result += ' + ' + modifierParts.join(' + ');
    }
  }
  
  // Add variants if present (for versatile weapons, etc.)
  if (rollObj.variants && Array.isArray(rollObj.variants)) {
    rollObj.variants.forEach(variant => {
      result += ' or ';
      // Add variant dice notation
      if (variant.numDice !== undefined && variant.diceType) {
        result += `${variant.numDice}${variant.diceType}`;
      }
      // Add variant modifier
      if (variant.baseModifier) {
        result += ` (${variant.baseModifier})`;
      }
      // Add variant label
      if (variant.label) {
        result += ` ${variant.label}`;
      }
    });
  }
  
  // Add suffix if present
  if (rollObj.suffix) {
    result += ' ' + rollObj.suffix;
  }
  
  return result.trim();
}

// Test with Quarterstaff damage
const quarterstaffDamage = {
  "numDice": 1,
  "diceType": "d6",
  "baseModifier": "bludgeoning",
  "statModifier": null,
  "applySpellModifier": false,
  "variants": [
    {
      "numDice": 1,
      "diceType": "d8",
      "baseModifier": "bludgeoning",
      "label": "two-handed"
    }
  ]
};

// Test with Longsword damage
const longswordDamage = {
  "numDice": 1,
  "diceType": "d8",
  "baseModifier": "slashing",
  "statModifier": null,
  "applySpellModifier": false,
  "variants": [
    {
      "numDice": 1,
      "diceType": "d10",
      "baseModifier": "slashing",
      "label": "two-handed"
    }
  ]
};

console.log("✓ Rendered Damage Output:\n");
console.log(`  Quarterstaff: ${reconstructStructuredRoll(quarterstaffDamage)}`);
console.log(`  Longsword: ${reconstructStructuredRoll(longswordDamage)}`);
