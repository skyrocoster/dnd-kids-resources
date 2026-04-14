// Shared card generation utility

// Detail templates for different card types
const DETAIL_TEMPLATES = {
  'magic-item': [
    { label: '💨 Charges', key: 'charges' },
    { label: '✨ Effect', key: 'effect' },
    { label: '⏱️ Duration', key: 'duration' },
    { label: '🔄 Recharge', key: 'recharge' }
  ]
};

// Roll object structure: { numDice: 1, diceType: "d4", modifier: "bludgeoning" }
// Parses roll strings like "1d4 bludgeoning", "d20 + ability", "2d6 slashing", "1 bludgeoning" etc.
function parseRollString(rollString) {
  if (!rollString || typeof rollString !== 'string') return null;
  
  const trimmed = rollString.trim();
  
  // Handle special cases
  if (trimmed === 'none' || trimmed === 'unknown') return null;
  
  // Parse patterns like "1d4", "d20", "2d6", etc
  const diceMatch = trimmed.match(/(\d*)d(\d+)/i);
  if (diceMatch) {
    const numDice = diceMatch[1] ? parseInt(diceMatch[1]) : 1;
    const diceType = `d${diceMatch[2]}`;
    
    // Extract modifier (everything after the dice notation)
    const modifierStart = diceMatch[0].length;
    const modifierPart = trimmed.substring(modifierStart).trim();
    
    return {
      numDice: numDice,
      diceType: diceType,
      modifier: modifierPart || ''
    };
  }
  
  // Handle special case: plain number like "1 bludgeoning" (for unarmed strike)
  const plainMatch = trimmed.match(/^(\d+)\s+(.+)$/);
  if (plainMatch) {
    return {
      numDice: parseInt(plainMatch[1]),
      diceType: 'd1',  // Use d1 to represent a flat number
      modifier: plainMatch[2]
    };
  }
  
  return null;
}

// Reconstructs a display string from a roll object or string
function reconstructRollString(rollData) {
  // If it's a string, parse it first
  if (typeof rollData === 'string') {
    rollData = parseRollString(rollData);
  }
  
  if (!rollData) return 'none';
  
  // Handle special case: d1 means a flat number (like "1 bludgeoning")
  if (rollData.diceType === 'd1') {
    const number = rollData.numDice;
    if (rollData.modifier) {
      return `${number} ${rollData.modifier}`;
    }
    return String(number);
  }
  
  const diceNotation = `${rollData.numDice}${rollData.diceType}`;
  
  if (rollData.modifier) {
    // Handle special spacing for modifiers
    if (rollData.modifier.startsWith('+') || rollData.modifier.startsWith('-')) {
      return `${diceNotation} ${rollData.modifier}`;
    } else {
      return `${diceNotation} ${rollData.modifier}`.trim();
    }
  }
  
  return diceNotation;
}

// Converts a roll object to a simple format for forms
function rollToFormString(rollData) {
  if (typeof rollData === 'string') {
    return rollData;
  }
  if (!rollData) return '';
  return reconstructRollString(rollData);
}

// Creates a modifier box element with configurable text
function createModifierBox(boxText = 'SAM') {
  const box = document.createElement('span');
  // Use 'bth-box' for weapon bonus (Bonus to Hit)
  // Use 'sab-box' for spell modifiers (SAM, SAD)
  box.className = boxText === 'BtH' ? 'bth-box' : 'sab-box';
  box.style.display = 'inline-flex';
  box.style.verticalAlign = 'middle';
  box.setAttribute('data-box-text', boxText);
  return box;
}

// Renders content with [SAD], [SAM] placeholders, [STAT:xxx] placeholders, and [DAMAGE:xxx] placeholders
// All ability modifiers render as colored boxes with emoji and ability name inside
// Damage types render with emoji and color styling
// rollObj: optional {numerics: [...], type_ids: [...]} to provide ability and damage type metadata
function renderContentWithPlaceholders(contentStr, boxText = 'SAM', rollObj = null) {
  if (!contentStr.includes('[BOX]') && !contentStr.includes('[STAT:') && 
      !contentStr.includes('[SAD]') && !contentStr.includes('[SAM]') && !contentStr.includes('[DAMAGE:')) {
    return null; // No placeholders to replace
  }
  
  // Build a map of ability codes to their metadata
  const abilityMetadata = {};
  if (rollObj && rollObj.numerics && Array.isArray(rollObj.numerics)) {
    for (let ability of rollObj.numerics) {
      if (ability && typeof ability === 'object' && ability.code) {
        abilityMetadata[ability.code] = ability;
      }
    }
  }
  if (rollObj && rollObj.save) {
    const saveEntries = Array.isArray(rollObj.save) ? rollObj.save : [rollObj.save];
    for (let saveCode of saveEntries) {
      if (typeof saveCode === 'string' && /^[a-z]{3}$/i.test(saveCode.trim())) {
        const code = saveCode.trim().toLowerCase();
        if (!abilityMetadata[code]) {
          abilityMetadata[code] = { code };
        }
      }
    }
  }
  
  // Build a map of damage type codes to their metadata
  const damageTypeMetadata = {};
  
  // Extract from new roll format: [{"1d4": {code: "piercing", ...}}]
  if (rollObj && rollObj.roll && Array.isArray(rollObj.roll)) {
    for (let rollMap of rollObj.roll) {
      if (typeof rollMap === 'object') {
        for (let [dice, damageType] of Object.entries(rollMap)) {
          if (damageType && typeof damageType === 'object' && damageType.code) {
            damageTypeMetadata[damageType.code] = damageType;
          }
        }
      }
    }
  }
  
  // Legacy: Extract from old type_ids format
  if (rollObj && rollObj.type_ids && Array.isArray(rollObj.type_ids)) {
    for (let damageType of rollObj.type_ids) {
      if (damageType && typeof damageType === 'object' && damageType.code) {
        damageTypeMetadata[damageType.code] = damageType;
      }
    }
  }

  // Spell details may carry enriched damage metadata in `types`.
  if (rollObj && rollObj.types && Array.isArray(rollObj.types)) {
    for (let damageType of rollObj.types) {
      if (damageType && typeof damageType === 'object' && damageType.code) {
        damageTypeMetadata[damageType.code] = damageType;
      }
    }
  }
  
  
  // Fallback emoji mappings
  const defaultEmojis = {
    'str': '💪', 'dex': '⚡', 'con': '❤️', 'int': '🧠', 'wis': '👁️', 'cha': '✨'
  };
  
  const fragment = document.createDocumentFragment();
  const placeholderRegex = /(\[DAMAGE:\w+\]|\[STAT:\w+\]|\[SAD\]|\[SAM\]|\[BOX\])/;
  const parts = contentStr.split(placeholderRegex);
  
  for (let part of parts) {
    if (!part) continue;
    
    if (part === '[SAD]' || part === '[SAM]') {
      const code = part.slice(1, -1).toLowerCase();
      const ability = abilityMetadata[code];
      const emojiText = (ability && ability.emoji) || defaultEmojis[code] || '';
      if (emojiText) {
        const emoji = document.createElement('span');
        emoji.textContent = `${emojiText} `;
        fragment.appendChild(emoji);
      }
      const boxText = ability && ability.name ? ability.name : code.toUpperCase();
      const boxElement = createModifierBox(boxText);
      boxElement.setAttribute('data-box-text', boxText);
      if (ability && ability.color) boxElement.style.backgroundColor = ability.color;
      fragment.appendChild(boxElement);
    } else if (part === '[BOX]') {
      fragment.appendChild(createModifierBox(boxText));
    } else if (part.startsWith('[DAMAGE:')) {
      const match = part.match(/\[DAMAGE:(\w+)\]/);
      if (match) {
        const damageCode = match[1];
        const damageType = damageTypeMetadata[damageCode];
        if (damageType) {
          // Render damage as one combined token: emoji + damage type text.
          const damageSpan = document.createElement('span');
          damageSpan.style.display = 'inline-flex';
          damageSpan.style.alignItems = 'center';
          damageSpan.style.gap = '0';
          if (damageType.color) {
            damageSpan.style.color = damageType.color;
          }
          
          // Add emoji
          if (damageType.emoji) {
            const emojiSpan = document.createElement('span');
            emojiSpan.style.fontFamily = 'Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol, sans-serif';
            emojiSpan.style.fontSize = 'inherit';
            emojiSpan.textContent = damageType.emoji;
            damageSpan.appendChild(emojiSpan);
          }
          
          // Add damage type name immediately after the emoji.
          const nameSpan = document.createElement('span');
          nameSpan.textContent = damageType.name || damageCode;
          nameSpan.style.marginLeft = '0';
          damageSpan.appendChild(nameSpan);
          
          fragment.appendChild(damageSpan);
        } else {
          // Fallback if damage type not found
          fragment.appendChild(document.createTextNode(damageCode));
        }
      }
    } else if (part.startsWith('[STAT:')) {
      const match = part.match(/\[STAT:(\w+)\]/);
      if (match) {
        const abilityCode = match[1].toLowerCase();
        const ability = abilityMetadata[abilityCode];
        const emojiText = (ability && ability.emoji) || defaultEmojis[abilityCode] || '';
        if (emojiText) {
          const emoji = document.createElement('span');
          emoji.textContent = `${emojiText} `;
          fragment.appendChild(emoji);
        }
        const boxElement = createModifierBox(abilityCode);
        boxElement.setAttribute('data-box-text', abilityCode.toUpperCase());
        if (ability && ability.color) boxElement.style.backgroundColor = ability.color;
        fragment.appendChild(boxElement);
      }
    } else {
      fragment.appendChild(document.createTextNode(part));
    }
  }
  
  return fragment;
}

// Reconstructs a structured roll object with dice, baseModifier, statModifier, and applySpellModifier
// Returns a string to be displayed
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

/**
 * Reconstructs display string from database roll format.
 * Returns format with [STAT:code] placeholders that integrate with renderContentWithPlaceholders().
 * 
 * Database format: {
 *   "roll": "1d20",
 *   "numerics": ["DEX", "SAM"],    // codes like ability scores or special modifiers
 *   "type_ids": [4, 3],             // damage type IDs with enriched metadata
 *   "save": false/true              // flag for save rolls
 * }
 * 
 * Examples:
 * - Fire Bolt: {"roll": "1d20", "numerics": ["SAM"]} → "1d20 + [STAT:SAM]"
 * - Damage: {"roll": "1d10", "type_ids": [{id: 4, code: "fire", emoji: "🔥"}]} → "1d10 (🔥 Fire)"
 * - Con Save: {"roll": "1d20", "numerics": ["CON"], "save": true} → "1d20 + [STAT:CON] (save)"
 */
// Handles range objects like {distance: "medium", target: "single"} or {distance: "self", shape: "cube"}
function formatRangeObject(rangeObj) {
  if (!rangeObj || typeof rangeObj !== 'object') return 'none';
  
  let result = '';
  
  // Capitalize the distance if present
  if (rangeObj.distance) {
    result = rangeObj.distance.charAt(0).toUpperCase() + rangeObj.distance.slice(1);
  }
  
  // Add shape in parentheses if present (e.g., "Self (Cube)")
  if (rangeObj.shape) {
    const shapeFormatted = rangeObj.shape.charAt(0).toUpperCase() + rangeObj.shape.slice(1);
    result += ` (${shapeFormatted})`;
  }
  
  // Add target info in parentheses if present and no shape
  if (rangeObj.target && !rangeObj.shape) {
    result += ` (${rangeObj.target})`;
  }
  
  return result || 'none';
}

function getRangeDisplayMode() {
  return localStorage.getItem('range_display_mode') || 'standard';
}

function simplifyRangeString(rangeText) {
  if (typeof rangeText !== 'string') return rangeText;
  const clean = rangeText.trim().toLowerCase();

  if (clean.includes('touch')) {
    return 'Touch';
  }
  if (clean.includes('self') || clean.includes('sight') || clean.includes('unlimited') || clean.includes('special')) {
    return 'Very Long';
  }

  const match = clean.match(/(\d+)\s*feet/);
  if (match) {
    const feet = parseInt(match[1], 10);
    if (feet <= 30) return 'Short';
    if (feet <= 60) return 'Medium';
    if (feet <= 120) return 'Long';
    return 'Very Long';
  }

  return 'Very Long';
}

function reconstructDatabaseRoll(rollObj) {
  if (!rollObj || typeof rollObj !== 'object') return 'none';
  
  let rollPart;
  let damageTypes = [];
  
  if (!rollObj.roll) {
    // Legacy damage object format: {amount: "1d8", type: "lightning"}
    if (rollObj.amount !== undefined && rollObj.amount !== null && rollObj.amount !== '') {
      rollPart = String(rollObj.amount);
    } else {
      return 'none';
    }
  }
  
  // Handle new format: roll is an array of {dice: type} mappings
  if (Array.isArray(rollObj.roll) && rollObj.roll.length > 0) {
    const rollMap = rollObj.roll[0]; // First mapping object
    if (typeof rollMap === 'object') {
      // Extract dice notation and damage type from first key-value pair
      for (let [dice, damageType] of Object.entries(rollMap)) {
        rollPart = dice;
        
        // damageType could be a string code or enriched object
        if (typeof damageType === 'object' && damageType.code) {
          damageTypes.push(`[DAMAGE:${damageType.code}]`);
        } else if (typeof damageType === 'string') {
          damageTypes.push(`[DAMAGE:${damageType}]`);
        }
        break; // Only use first mapping
      }
    }
  } else if (typeof rollObj.roll === 'string') {
    // Handle old format: roll is a simple string like "1d4"
    rollPart = rollObj.roll;
    
    // Add modifier if present
    if (rollObj.mod !== null && rollObj.mod !== undefined && rollObj.mod !== 0) {
      const sign = rollObj.mod > 0 ? '+' : '';
      rollPart = `${rollObj.roll} ${sign} ${rollObj.mod}`;
    }
  }

  if (rollObj.type_ids && (Array.isArray(rollObj.type_ids) ? rollObj.type_ids.length > 0 : typeof rollObj.type_ids === 'string' && rollObj.type_ids.trim() !== '')) {
    // Map type_ids to include emoji if available (from enriched damage_types)
    let typesList = Array.isArray(rollObj.type_ids) ? rollObj.type_ids : rollObj.type_ids.split(',').map(t => t.trim());
    const typeDisplays = typesList.map(type => {
      if (typeof type === 'object' && type.code) {
        // Enriched damage type - always create placeholder even if emoji is missing
        return `[DAMAGE:${type.code}]`;  // Placeholder that will be replaced during rendering
      }
      // Fallback for plain string
      return `[DAMAGE:${type}]`;
    });
    damageTypes.push(...typeDisplays);
  } else if (rollObj.type && typeof rollObj.type === 'string' && rollObj.type.trim()) {
    damageTypes.push(`[DAMAGE:${rollObj.type.trim().toLowerCase()}]`);
  }
  
  let parts = [rollPart];
  
  // Add damage types immediately after the dice notation
  if (damageTypes.length > 0) {
    parts.push(`(${damageTypes.join(', ')})`);
  }
  
  // Add numeric modifiers with ability enrichment from database
  // Abilities now come with {code, name, emoji, color} from the API
  // SAD and SAM abilities should appear as [SAD] and [SAM] boxes
  if (rollObj.numerics && Array.isArray(rollObj.numerics) && rollObj.numerics.length > 0) {
    parts.push(...rollObj.numerics.map(ability => {
      // ability is an object like {code: "sad", name: "Spell Ability Modifier", emoji: "🔮", color: "#9b59b6"}
      if (typeof ability === 'object' && ability.code) {
        // SAD and SAM are box abilities - embed name in the placeholder
        if (ability.code === 'sad' || ability.code === 'sam') {
          return `[${ability.code.toUpperCase()}]`;
        }
        return `[STAT:${ability.code}]`;
      }
      // Fallback for old format (plain string)
      return `[STAT:${ability}]`;
    }));
  }
  
  // Add shape/AOE if present
  const descriptors = [];
  if (rollObj.shape) {
    descriptors.push(rollObj.shape);
  }
  
  // Add Special effects if present
  if (rollObj.Special && typeof rollObj.Special === 'string') {
    descriptors.push(rollObj.Special);
  }
  
  // Combine: "1d4" + "+ [SAD]" = "1d4 + [SAD]"
  let result;
  const lastPart = parts[parts.length - 1];
  if (parts.length > 1 && lastPart.startsWith('(') && lastPart.endsWith(')')) {
    result = parts.slice(0, -1).join(' + ') + ' ' + lastPart;
  } else {
    result = parts.join(' + ');
  }
  
  // Add descriptors in parentheses ONLY if present (don't add empty parens)
  if (descriptors.length > 0) {
    result += ` (${descriptors.join(', ')})`;
  }
  
  return result.trim();
}

// Reconstruct creature attack display from {name, to_hit: [...], damage: [...]} format
function reconstructCreatureAttack(attackObj) {
  if (!attackObj || typeof attackObj !== 'object') return 'none';
  
  const parts = [];
  
  // Add attack name if present
  if (attackObj.name) {
    parts.push(attackObj.name);
  }
  
  // Add to_hit rolls
  if (attackObj.to_hit) {
    if (Array.isArray(attackObj.to_hit)) {
      for (let roll of attackObj.to_hit) {
        // Each roll in to_hit is already enriched with {roll, numerics, types, ...}
        parts.push(reconstructDatabaseRoll(roll));
      }
    } else {
      // Single roll object
      parts.push(reconstructDatabaseRoll(attackObj.to_hit));
    }
  }
  
  // Add damage rolls in a separate group
  if (attackObj.damage) {
    const damageParts = [];
    if (Array.isArray(attackObj.damage)) {
      for (let roll of attackObj.damage) {
        damageParts.push(reconstructDatabaseRoll(roll));
      }
    } else {
      damageParts.push(reconstructDatabaseRoll(attackObj.damage));
    }
    if (damageParts.length > 0) {
      parts.push(damageParts.join(' or '));
    }
  }
  
  return parts.join(' / ');
}

function isSpellCard(data) {
  return data && (data.level !== undefined || data.school !== undefined || data.explanation !== undefined);
}

function renderDetailContent(detail) {
  const content = detail && detail.content !== undefined ? detail.content : '';

  if (typeof content === 'string') {
      if (content.includes('***')) {
        return renderStringWithLineBreaks(content);
      }

    const trimmed = content.trim();
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed !== null && typeof parsed !== 'string') {
          return renderDetailContent({ content: parsed });
        }
      } catch (e) {
        // Not valid JSON, continue rendering as text
      }
    }

    if (content.includes('<') && !content.includes('[STAT:') && !content.includes('[SAM]') && !content.includes('[SAD]') && !content.includes('[DAMAGE:') && !content.includes('[BOX]')) {
      const span = document.createElement('span');
      span.innerHTML = content;
      return span;
    }

    if (content.includes('[BOX]') || content.includes('[STAT:') || content.includes('[SAD]') || content.includes('[SAM]') || content.includes('[DAMAGE:')) {
      const rollObj = detail.content && typeof detail.content === 'object' ? detail.content : detail;
      const boxText = detail.hands ? 'BtH' : 'SAM';
      const fragment = renderContentWithPlaceholders(content, boxText, rollObj);
      if (fragment) return fragment;
    }

    const span = document.createElement('span');
    span.textContent = content;
    return span;
  }

  if (Array.isArray(content)) {
    const fragment = document.createDocumentFragment();
    content.forEach((item) => {
      const paragraph = document.createElement('p');
      paragraph.appendChild(renderDetailContent({ content: item }));
      fragment.appendChild(paragraph);
    });
    return fragment;
  }

  if (content && typeof content === 'object') {
    if (content.amount !== undefined || content.damage !== undefined || content.type !== undefined || content.save !== undefined || content.save_success !== undefined) {
      const formatted = formatSpellDetailObject(content, detail && detail.label ? detail.label : '');
      if (formatted.includes('[STAT:') || formatted.includes('[SAD]') || formatted.includes('[SAM]') || formatted.includes('[BOX]') || formatted.includes('[DAMAGE:')) {
        return renderContentWithPlaceholders(formatted, content.hands ? 'BtH' : 'SAM', content);
      }
      return document.createTextNode(formatted);
    }

    if (content.roll !== undefined || content.numerics !== undefined || content.types !== undefined || (content.type_ids !== undefined && content.roll !== undefined)) {
      const displayText = reconstructDatabaseRoll(content);
      const fragment = renderContentWithPlaceholders(displayText, content.hands ? 'BtH' : 'SAM', content);
      if (fragment) return fragment;
      return document.createTextNode(displayText);
    }

    if (content.distance !== undefined || content.target !== undefined || content.shape !== undefined) {
      return document.createTextNode(formatRangeObject(content));
    }

    if (content.name !== undefined) {
      return document.createTextNode(content.name);
    }

    return document.createTextNode(JSON.stringify(content));
  }

  return document.createTextNode(String(content || ''));
}

function formatSpellDetailObject(detailObj, detailLabel = '') {
  if (!detailObj || typeof detailObj !== 'object') {
    return 'none';
  }

  const amountValue = detailObj.amount !== undefined && detailObj.amount !== null && detailObj.amount !== ''
    ? String(detailObj.amount)
    : (detailObj.damage !== undefined && detailObj.damage !== null && detailObj.damage !== '' ? String(detailObj.damage) : '');

  const damagePlaceholderParts = [];
  if (Array.isArray(detailObj.types) && detailObj.types.length > 0) {
    detailObj.types.forEach(type => {
      if (type && typeof type === 'object' && type.code) {
        damagePlaceholderParts.push(`[DAMAGE:${type.code}]`);
      } else if (typeof type === 'string' && type.trim()) {
        damagePlaceholderParts.push(`[DAMAGE:${type.trim().toLowerCase()}]`);
      }
    });
  } else if (Array.isArray(detailObj.type_ids) && detailObj.type_ids.length > 0) {
    detailObj.type_ids.forEach(type => {
      if (type && typeof type === 'object' && type.code) {
        damagePlaceholderParts.push(`[DAMAGE:${type.code}]`);
      } else if (typeof type === 'string' && type.trim()) {
        damagePlaceholderParts.push(`[DAMAGE:${type.trim().toLowerCase()}]`);
      }
    });
  } else if (Array.isArray(detailObj.type) && detailObj.type.length > 0) {
    detailObj.type.forEach(type => {
      if (typeof type === 'string' && type.trim()) {
        damagePlaceholderParts.push(`[DAMAGE:${type.trim().toLowerCase()}]`);
      }
    });
  } else if (detailObj.type !== undefined && detailObj.type !== null && detailObj.type !== '') {
    damagePlaceholderParts.push(`[DAMAGE:${String(detailObj.type).trim().toLowerCase()}]`);
  }

  // Spell attack objects should display a default spell attack roll using SAM
  if (detailObj.type === 'ranged' || detailObj.type === 'melee') {
    const amountText = amountValue.trim();
    const typeLabel = ` (${String(detailObj.type).trim().toLowerCase()})`;
    if (!amountText || amountText.toLowerCase() === '1d20') {
      return `1d20 + [SAM]${typeLabel}`;
    }
    if (amountText.startsWith('1d20') && !amountText.includes('[SAM]') && !amountText.includes('[SAD]')) {
      return `${amountText} + [SAM]${typeLabel}`;
    }
  }

  const parts = [];
  if (amountValue) {
    parts.push(amountValue);
  }
  if ((detailObj.amount === undefined || detailObj.amount === '') && detailObj.save) {
    const saveValue = detailObj.save;
    if (Array.isArray(saveValue)) {
      saveValue.forEach((value, index) => {
        if (index > 0) parts.push('/');
        if (typeof value === 'string' && /^[a-z]{3}$/i.test(value.trim())) {
          parts.push(`[STAT:${value.trim().toUpperCase()}]`);
        } else {
          parts.push(String(value).toUpperCase());
        }
      });
    } else if (typeof saveValue === 'string' && /^[a-z]{3}$/i.test(saveValue.trim())) {
      parts.push(`[STAT:${saveValue.trim().toUpperCase()}]`);
    } else {
      parts.push(String(saveValue).toUpperCase());
    }
  }

  if (detailObj.MOD !== undefined && detailObj.MOD !== null && detailObj.MOD !== '') {
    const modCode = String(detailObj.MOD).trim().toUpperCase();
    if (parts.length > 0) {
      parts.push('+');
    }
    parts.push(`[STAT:${modCode}]`);
  }

  if (detailObj.save_success !== undefined && detailObj.save_success !== null && detailObj.save_success !== '' && detailObj.save_success !== 'none') {
    parts.push(`save ${detailObj.save_success}`);
  }

  if (damagePlaceholderParts.length > 0) {
    const damagePlaceholder = damagePlaceholderParts.join(', ');
    if (amountValue) {
      parts.push(`(${damagePlaceholder})`);
    } else {
      parts.push(damagePlaceholder);
    }
  }

  if (parts.length > 0) {
    return parts.join(' ');
  }

  if (detailObj.name !== undefined && detailObj.name !== null) {
    return String(detailObj.name);
  }

  return 'none';
}

function renderStringWithLineBreaks(text) {
  if (typeof text !== 'string' || !text.includes('***')) {
    return document.createTextNode(text || '');
  }

  const fragment = document.createDocumentFragment();
  const parts = text.split('***');

  parts.forEach((part, index) => {
    fragment.appendChild(document.createTextNode(part));

    // A delimiter exists between this part and the next.
    // Only odd-numbered delimiters should become line breaks.
    if (index < parts.length - 1) {
      const delimiterIndex = index + 1; // 1-based delimiter count
      if (delimiterIndex % 2 === 1) {
        fragment.appendChild(document.createElement('br'));
      }
    }
  });

  return fragment;
}

function tryParseJsonString(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
    try {
      return JSON.parse(trimmed);
    } catch (e) {
      return value;
    }
  }
  return value;
}

function renderPlainTextContent(content) {
  if (Array.isArray(content)) {
    return content.map(item => renderPlainTextContent(item)).join(' ').trim();
  }
  if (typeof content === 'object' && content !== null) {
    return JSON.stringify(content);
  }
  return String(content || '');
}

function buildDetailRow(detail) {
  const detailRow = document.createElement('div');
  detailRow.className = 'card-detail-row';

  const label = document.createElement('span');
  label.className = 'detail-label';
  label.textContent = detail.label || '';
  detailRow.appendChild(label);

  const value = document.createElement('div');
  value.className = 'detail-value';

  let detailToRender = detail;
  if (typeof detail.label === 'string' && detail.label.toLowerCase().startsWith('range') && typeof detail.content === 'string' && getRangeDisplayMode() === 'simple') {
    detailToRender = { ...detail, content: simplifyRangeString(detail.content) };
  }

  value.appendChild(renderDetailContent(detailToRender));
  detailRow.appendChild(value);

  return detailRow;
}

function hideCardPreview() {
  const existing = document.getElementById('card-preview-popup');
  if (existing) {
    existing.remove();
  }
}

function showCardPreview(cardData, triggerElement) {
  if (!cardData || !triggerElement) return;

  hideCardPreview();

  const popup = document.createElement('div');
  popup.id = 'card-preview-popup';
  popup.className = 'card-preview-popup';

  const card = createCardElement(cardData, null, { preview: true });
  popup.appendChild(card);
  document.body.appendChild(popup);

  const rect = triggerElement.getBoundingClientRect();
  let left = rect.left;
  let top = rect.bottom + 8;

  if (left + popup.offsetWidth > window.innerWidth - 10) {
    left = window.innerWidth - popup.offsetWidth - 10;
  }
  if (top + popup.offsetHeight > window.innerHeight - 10) {
    top = rect.top - popup.offsetHeight - 8;
  }

  popup.style.left = Math.max(10, left) + 'px';
  popup.style.top = Math.max(10, top) + 'px';

  triggerElement.addEventListener('mouseleave', hideCardPreview, { once: true });
  document.addEventListener('click', function removeOnClick(e) {
    if (!popup.contains(e.target) && e.target !== triggerElement) {
      hideCardPreview();
      document.removeEventListener('click', removeOnClick);
    }
  });
}

function attachCardPreviewHover(targetElement, cardDataOrLoader) {
  if (!targetElement) return;

  targetElement.addEventListener('mouseenter', async function() {
    try {
      const cardData = typeof cardDataOrLoader === 'function' ? await cardDataOrLoader() : cardDataOrLoader;
      showCardPreview(cardData, this);
    } catch (error) {
      console.warn('Card preview failed to load:', error);
    }
  });

  targetElement.addEventListener('mouseleave', hideCardPreview);
}

function createCardElement(data, onHideCallback, options = {}) {
  const card = document.createElement('div');
  
  // Normalize spell level for CSS class (convert numeric levels to levelN and keep cantrip as-is)
  let levelClass = data.level;
  if (data.level !== undefined && data.level !== null) {
    if (String(data.level) === '0') {
      levelClass = 'cantrip';
    } else if (/^\d+$/.test(String(data.level))) {
      levelClass = `level${data.level}`;
    }
  }
  
  card.className = `card ${levelClass}`;
  if (options.preview) {
    card.classList.add('preview-card');
  }
  
  // Add card ID for hide functionality (use spell/card ID if available, otherwise use title)
  if (data.id) {
    card.id = `card-${data.id}`;
  } else if (data.title) {
    card.id = `card-${data.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  }

  if (!options.preview) {
    // Add hide checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'card-hide-checkbox';
    checkbox.title = 'Hide this card';
    checkbox.addEventListener('change', function() {
      // Add to hidden list
      const hiddenCards = JSON.parse(localStorage.getItem('hidden_cards') || '[]');
      if (this.checked) {
        if (!hiddenCards.includes(card.id)) {
          hiddenCards.push(card.id);
        }
      } else {
        const index = hiddenCards.indexOf(card.id);
        if (index > -1) {
          hiddenCards.splice(index, 1);
        }
      }
      localStorage.setItem('hidden_cards', JSON.stringify(hiddenCards));
      
      // Call the callback to re-render
      if (onHideCallback) {
        onHideCallback();
      }
      
      // Show/hide reset button
      const resetBtn = document.getElementById('reset-hidden-btn');
      if (resetBtn) {
        resetBtn.style.display = hiddenCards.length > 0 ? 'inline-block' : 'none';
      }
    });
    card.appendChild(checkbox);
    
    // Set checkbox to checked if this card is currently hidden
    const hiddenCards = JSON.parse(localStorage.getItem('hidden_cards') || '[]');
    if (hiddenCards.includes(card.id)) {
      checkbox.checked = true;
    }
  }
  
  // Card header
  const header = document.createElement('div');
  header.className = 'card-header';
  header.innerHTML = `
    <span class="card-icon">${data.icon}</span>
    <span class="card-title">${data.title}</span>
  `;
  card.appendChild(header);
  
  // Card body
  const body = document.createElement('div');
  body.className = 'card-body';
  
  const explanation = document.createElement('div');
  explanation.className = 'simple-explanation';
  
  // For custom cards, add writable space instead of text
  if (data.level === 'custom') {
    explanation.style.minHeight = '14mm';
    explanation.style.display = 'flex';
    explanation.style.alignItems = 'flex-end';
    explanation.textContent = '';
  } else {
    let explanationContent = tryParseJsonString(data.explanation);
    if (Array.isArray(explanationContent)) {
      explanationContent.filter(Boolean).forEach(item => {
        const paragraph = document.createElement('p');
        const text = item === null || item === undefined ? '' : String(item);
        if (text.includes('***')) {
          paragraph.appendChild(renderStringWithLineBreaks(text));
        } else {
          paragraph.textContent = text;
        }
        explanation.appendChild(paragraph);
      });
    } else {
      if (typeof explanationContent === 'object' && explanationContent !== null) {
        explanationContent = JSON.stringify(explanationContent);
      } else {
        explanationContent = explanationContent || '';
      }

      const paragraph = document.createElement('p');
      if (typeof explanationContent === 'string' && explanationContent.includes('***')) {
        paragraph.appendChild(renderStringWithLineBreaks(explanationContent));
      } else {
        paragraph.textContent = explanationContent;
      }
      explanation.appendChild(paragraph);
    }
  }
  body.appendChild(explanation);
  
  const detailsDiv = document.createElement('div');
  detailsDiv.className = 'spell-details';
  
  // Handle both object and array detail formats
  let detailsToRender = [];
  let savesGridDetail = null;  // Extract saves_grid to render last
  let statsGridDetail = null;  // Extract stats_grid to render above saves
  
  if (data.details) {
    if (typeof data.details === 'string') {
      // Plain text details (from skills) - render directly
      const detailRow = document.createElement('div');
      detailRow.style.display = 'block';
      detailRow.style.marginBottom = '3px';
      detailRow.style.lineHeight = '1.4';
      if (data.details.includes('***')) {
        detailRow.appendChild(renderStringWithLineBreaks(data.details));
      } else {
        detailRow.textContent = data.details;
      }
      detailsDiv.appendChild(detailRow);
    } else if (Array.isArray(data.details)) {
      // Check if it's the new format (with labels)
      if (data.details[0]?.label) {
        detailsToRender = data.details;
      } else if (data.type === 'Magic Item') {
        // Use template for magic items
        const template = DETAIL_TEMPLATES['magic-item'];
        detailsToRender = template.map(t => ({
          label: t.label,
          content: data.details[template.indexOf(t)]
        }));
      }
    } else if (typeof data.details === 'object') {
      // Object format - use template to map keys to labels
      if (data.type === 'Magic Item') {
        const template = DETAIL_TEMPLATES['magic-item'];
        detailsToRender = template.map(t => ({
          label: t.label,
          content: data.details[t.key]
        }));
      }
    }
  }
  
  // Extract stats_grid and saves_grid from detailsToRender to render them specially
  detailsToRender = detailsToRender.filter(detail => {
    if (detail.type === 'stats_grid') {
      statsGridDetail = detail;
      return false;  // Remove from array
    }
    if (detail.type === 'saves_grid') {
      savesGridDetail = detail;
      return false;  // Remove from array
    }
    return true;
  });
  
  detailsToRender.forEach(detail => {
    detailsDiv.appendChild(buildDetailRow(detail));
  });

  // Render stats_grid (HP/AC) before details but after regular details
  if (statsGridDetail && Array.isArray(statsGridDetail.content)) {
    const gridContainer = document.createElement('div');
    gridContainer.style.display = 'grid';
    gridContainer.style.gridTemplateColumns = statsGridDetail.content.length === 1 ? '1fr' : 'repeat(2, 1fr)';
    gridContainer.style.gap = '2px';
    gridContainer.style.marginBottom = '3px';
    gridContainer.style.lineHeight = '1.2';
    
    statsGridDetail.content.forEach(stat => {
      const statCell = document.createElement('div');
      statCell.style.display = 'flex';
      statCell.style.flexDirection = 'row';
      statCell.style.alignItems = 'center';
      statCell.style.justifyContent = 'center';
      statCell.style.backgroundColor = stat.color || '#ccc';
      statCell.style.color = '#fff';
      statCell.style.padding = '1px 2px';
      statCell.style.borderRadius = '2px';
      statCell.style.fontSize = '7pt';
      statCell.style.fontWeight = '600';
      statCell.style.minHeight = '12px';
      statCell.style.gap = '1px';
      
      // Add emoji
      const emojiSpan = document.createElement('span');
      emojiSpan.textContent = stat.emoji;
      emojiSpan.style.fontSize = '9pt';
      statCell.appendChild(emojiSpan);
      
      // Add value
      const valSpan = document.createElement('span');
      valSpan.textContent = stat.value;
      valSpan.style.fontSize = '8pt';
      valSpan.style.fontWeight = '700';
      statCell.appendChild(valSpan);
      
      gridContainer.appendChild(statCell);
    });
    
    detailsDiv.appendChild(gridContainer);
  }
  
  // Render saves_grid after all other details (anchors it above footer)
  if (savesGridDetail && Array.isArray(savesGridDetail.content)) {
    const gridContainer = document.createElement('div');
    gridContainer.style.display = 'grid';
    gridContainer.style.gridTemplateColumns = '1fr 1fr 1fr';
    gridContainer.style.gap = '2px';
    gridContainer.style.marginBottom = '3px';
    gridContainer.style.lineHeight = '1.2';
    
    savesGridDetail.content.forEach(save => {
      const saveCell = document.createElement('div');
      saveCell.style.display = 'flex';
      saveCell.style.flexDirection = 'row';
      saveCell.style.alignItems = 'center';
      saveCell.style.justifyContent = 'center';
      saveCell.style.backgroundColor = save.color || '#ccc';
      saveCell.style.color = '#fff';
      saveCell.style.padding = '1px 2px';
      saveCell.style.borderRadius = '2px';
      saveCell.style.fontSize = '7pt';
      saveCell.style.fontWeight = '600';
      saveCell.style.minHeight = '12px';
      saveCell.style.gap = '1px';
      
      // Add emoji
      const emojiSpan = document.createElement('span');
      emojiSpan.textContent = save.emoji;
      emojiSpan.style.fontSize = '8pt';
      saveCell.appendChild(emojiSpan);
      
      // Add modifier
      const modSpan = document.createElement('span');
      const sign = save.modifier >= 0 ? '+' : '';
      modSpan.textContent = sign + save.modifier;
      saveCell.appendChild(modSpan);
      
      gridContainer.appendChild(saveCell);
    });
    
    detailsDiv.appendChild(gridContainer);
  }
  
  body.appendChild(detailsDiv);
  
  // Add friend/enemy coloring box for NPCs
  if (data.species && data.profession && data.location) {
    // This is an NPC card
    const friendEnemyDiv = document.createElement('div');
    friendEnemyDiv.style.display = 'block';
    friendEnemyDiv.style.marginBottom = '3px';
    friendEnemyDiv.style.lineHeight = '1.4';
    
    const label = document.createElement('span');
    label.className = 'label';
    label.style.display = 'inline';
    label.style.marginRight = '2px';
    label.textContent = '👫 Friend/Enemy:';
    friendEnemyDiv.appendChild(label);
    
    const box = document.createElement('span');
    box.style.display = 'inline-flex';
    box.style.alignItems = 'center';
    box.style.justifyContent = 'center';
    box.style.width = '35px';
    box.style.height = '18px';
    box.style.border = '1.5px solid #b0865a';
    box.style.borderRadius = '3px';
    box.style.background = '#f5e6d3';
    box.style.verticalAlign = 'middle';
    box.style.position = 'relative';
    box.style.fontSize = '7pt';
    box.style.fontWeight = '700';
    box.style.color = 'transparent';
    box.textContent = '👫';
    friendEnemyDiv.appendChild(box);
    
    detailsDiv.appendChild(friendEnemyDiv);
  }
  
  card.appendChild(body);
  
  // Card footer
  const footer = document.createElement('div');
  footer.className = 'card-footer';
  
  // For custom/blank cards, add a writable line instead of text
  if (data.level === 'custom') {
    footer.style.borderTop = '2px solid rgba(255, 255, 255, 0.5)';
    footer.style.minHeight = '12mm';
    footer.style.display = 'flex';
    footer.style.alignItems = 'flex-end';
    footer.textContent = '';
  } else {
    // For weapons, use type and hands; for spells use level and school; for magic items use type and school; for NPCs use species and profession; for creatures use footer_info
    let footerText;
    if (data.species && data.profession) {
      // NPCs: "Human · Wizard"
      footerText = `${data.species} · ${data.profession}`;
    } else if (data.footer_info) {
      // Creatures: "🦁 Beast • Tiny"
      footerText = data.footer_info;
    } else if (data.type === 'Beast' && data.size) {
      // Wild shapes: "Beast · Medium"
      footerText = `${data.type} · ${data.size}`;
    } else if (data.hands) {
      // Weapons: "Simple Melee · 1-handed"
      footerText = `${data.type} · ${data.hands}`;
    } else if (data.level === 'cantrip' || data.level === 0 || data.level === '0' || /^\d+$/.test(String(data.level)) || /^level\d+$/i.test(String(data.level))) {
      // Spells: "Level 1 · Evocation" or "Cantrip · Evocation"
      let levelText;
      if (data.level === 'cantrip' || data.level === 0 || data.level === '0') {
        levelText = 'Cantrip';
      } else {
        const match = String(data.level).match(/\d+/);
        levelText = match ? `Level ${match[0]}` : '';
      }
      footerText = levelText && data.school ? `${levelText} · ${data.school}` : (data.school || levelText || '');
      if (typeof data.casting_time === 'string' && /bonus action/i.test(data.casting_time.trim())) {
        footerText = footerText ? `${footerText} · Bonus Action` : 'Bonus Action';
      }
    } else if (data.type && data.school) {
      // Magic Items: "Magic Item · Utility"
      footerText = `${data.type} · ${data.school}`;
    } else {
      // Conditions or other items: just the type
      footerText = data.type || '';
    }
    
    footer.textContent = footerText;
  }
  card.appendChild(footer);
  
  return card;
}

// Render paginated cards
function renderPaginatedCards(containerSelector, cardsData, cardsPerPage = 9, pageTitle = '✨ Cards ✨', pageSubtitle = 'Dungeons & Dragons · 5th Edition · Cut out & keep!', onHideCallback = null) {
  const container = document.querySelector(containerSelector);
  if (!container) return;
  
  const totalPages = Math.ceil(cardsData.length / cardsPerPage);
  
  // Determine grid columns based on cardsPerPage
  let gridCols = 3;
  if (cardsPerPage === 12) {
    gridCols = 3;  // 3x4 grid
  } else if (cardsPerPage === 15) {
    gridCols = 3;  // 3x5 grid
  }
  // Default is 3x3 for 9 cards
  
  // Create pages
  for (let pageNum = 0; pageNum < totalPages; pageNum++) {
    const page = document.createElement('div');
    page.className = 'page';
    
    // Add header
    const header = document.createElement('div');
    header.className = 'page-header';
    header.innerHTML = `<h1>${pageTitle}</h1><p>${pageSubtitle}</p>`;
    page.appendChild(header);
    
    // Add grid
    const grid = document.createElement('div');
    grid.className = 'cards-grid';
    grid.style.gridTemplateColumns = `repeat(${gridCols}, 63.5mm)`;
    grid.style.gridAutoRows = '88.9mm';
    
    // Add cards for this page
    const startIdx = pageNum * cardsPerPage;
    const endIdx = Math.min(startIdx + cardsPerPage, cardsData.length);
    
    for (let i = startIdx; i < endIdx; i++) {
      grid.appendChild(createCardElement(cardsData[i], onHideCallback));
    }
    
    page.appendChild(grid);
    container.appendChild(page);
  }
}

// Render list-style cards in a flexible vertical layout
function renderListCards(containerSelector, cardsData, pageTitle = '✨ List Cards ✨', pageSubtitle = 'Flexible A4 list view', onHideCallback = null) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const page = document.createElement('div');
  page.className = 'page page-list';

  const header = document.createElement('div');
  header.className = 'page-header';
  header.innerHTML = `<h1>${pageTitle}</h1><p>${pageSubtitle}</p>`;
  page.appendChild(header);

  const list = document.createElement('div');
  list.className = 'cards-list';

  const groupedCards = [];
  let currentLevelKey = null;
  let currentGroup = null;

  cardsData.forEach(cardData => {
    const levelKey = cardData.level !== undefined && cardData.level !== null
      ? String(cardData.level).toLowerCase()
      : '__no-level__';

    if (levelKey !== currentLevelKey) {
      currentLevelKey = levelKey;
      currentGroup = [];
      groupedCards.push(currentGroup);
    }

    currentGroup.push(cardData);
  });

  groupedCards.forEach((group, groupIndex) => {
    const groupWrapper = document.createElement('div');
    groupWrapper.className = 'cards-list-group';
    if (groupIndex > 0) {
      groupWrapper.classList.add('level-break');
    }

    group.forEach(cardData => {
      groupWrapper.appendChild(createCardElement(cardData, onHideCallback));
    });

    list.appendChild(groupWrapper);
  });

  page.appendChild(list);
  container.appendChild(page);
}

// Toggle card hidden state and persist to localStorage
function toggleCardHidden(cardId, isHidden) {
  const hiddenCards = JSON.parse(localStorage.getItem('hidden_cards') || '[]');
  const card = document.getElementById(cardId);
  
  if (isHidden) {
    // Add to hidden list
    if (!hiddenCards.includes(cardId)) {
      hiddenCards.push(cardId);
    }
    if (card) {
      card.classList.add('hidden');
    }
  } else {
    // Remove from hidden list
    const index = hiddenCards.indexOf(cardId);
    if (index > -1) {
      hiddenCards.splice(index, 1);
    }
    if (card) {
      card.classList.remove('hidden');
    }
  }
  
  localStorage.setItem('hidden_cards', JSON.stringify(hiddenCards));
  
  // Show/hide reset button based on whether there are hidden cards
  const resetBtn = document.getElementById('reset-hidden-btn');
  if (resetBtn) {
    resetBtn.style.display = hiddenCards.length > 0 ? 'inline-block' : 'none';
  }
}
