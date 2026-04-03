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

// Renders content with [SAD], [SAM], [BOX] placeholders, [STAT:xxx] placeholders, and [DAMAGE:xxx] placeholders
// All ability modifiers render as colored boxes with emoji and ability name inside
// Damage types render with emoji and color styling
// rollObj: optional {numerics: [...], types: [...]} to provide ability and damage type metadata
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
  
  // Build a map of damage type codes to their metadata
  const damageTypeMetadata = {};
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
      if (ability) {
        const emoji = document.createElement('span');
        emoji.textContent = `${ability.emoji || ''} `;
        fragment.appendChild(emoji);
        const boxElement = createModifierBox(code);
        boxElement.setAttribute('data-box-text', code.toUpperCase());
        if (ability.color) boxElement.style.backgroundColor = ability.color;
        fragment.appendChild(boxElement);
      } else {
        fragment.appendChild(createModifierBox(code.toUpperCase()));
      }
    } else if (part === '[BOX]') {
      fragment.appendChild(createModifierBox(boxText));
    } else if (part.startsWith('[DAMAGE:')) {
      const match = part.match(/\[DAMAGE:(\w+)\]/);
      if (match) {
        const damageCode = match[1];
        const damageType = damageTypeMetadata[damageCode];
        if (damageType) {
          // Create a span for the damage type with emoji and color
          const damageSpan = document.createElement('span');
          damageSpan.style.display = 'inline-flex';
          damageSpan.style.alignItems = 'center';
          damageSpan.style.gaps = '2px';
          damageSpan.style.marginRight = '2px';
          
          // Add emoji
          const emojiSpan = document.createElement('span');
          emojiSpan.textContent = damageType.emoji || '';
          damageSpan.appendChild(emojiSpan);
          
          // Add damage type name with optional background color
          const nameSpan = document.createElement('span');
          nameSpan.textContent = damageType.name || damageCode;
          if (damageType.color) {
            nameSpan.style.color = damageType.color;
            nameSpan.style.fontWeight = 'bold';
          }
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
        const abilityCode = match[1];
        const ability = abilityMetadata[abilityCode];
        if (ability) {
          const emoji = document.createElement('span');
          emoji.textContent = `${ability.emoji || ''} `;
          fragment.appendChild(emoji);
          const boxElement = createModifierBox(abilityCode);
          boxElement.setAttribute('data-box-text', abilityCode.toUpperCase());
          if (ability.color) boxElement.style.backgroundColor = ability.color;
          fragment.appendChild(boxElement);
        } else {
          const abilitySpan = document.createElement('span');
          abilitySpan.className = `ability-${abilityCode}`;
          const emoji = defaultEmojis[abilityCode] || '';
          abilitySpan.textContent = `${emoji} ${abilityCode.toUpperCase()}`;
          fragment.appendChild(abilitySpan);
        }
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
 *   "types": ["fire", "cold"],      // damage types, descriptors (no numeric value)
 *   "save": false/true              // flag for save rolls
 * }
 * 
 * Examples:
 * - Fire Bolt: {"roll": "1d20", "numerics": ["SAM"]} → "1d20 + [STAT:SAM]"
 * - Damage: {"roll": "1d10", "types": ["fire"]} → "1d10 (fire)"
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

function reconstructDatabaseRoll(rollObj) {
  if (!rollObj || typeof rollObj !== 'object') return 'none';
  
  if (!rollObj.roll) return 'none';
  
  // Start with roll notation, add modifier if present
  let rollPart = rollObj.roll;
  if (rollObj.mod !== null && rollObj.mod !== undefined && rollObj.mod !== 0) {
    const sign = rollObj.mod > 0 ? '+' : '';
    rollPart = `${rollObj.roll}${sign}${rollObj.mod}`;
  }
  
  let parts = [rollPart];
  
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
  
  // Build descriptor string - only include types and shape, NOT actor or save (those go in label)
  const descriptors = [];
  
  // Add damage types/descriptors (check if it's actually an array/list, not empty string)
  if (rollObj.types && (Array.isArray(rollObj.types) ? rollObj.types.length > 0 : typeof rollObj.types === 'string' && rollObj.types.trim() !== '')) {
    // Map types to include emoji if available (from enriched damage_types)
    let typesList = Array.isArray(rollObj.types) ? rollObj.types : rollObj.types.split(',').map(t => t.trim());
    const typeDisplays = typesList.map(type => {
      if (typeof type === 'object' && type.code && type.emoji) {
        // Enriched damage type with emoji and color
        return `[DAMAGE:${type.code}]`;  // Placeholder that will be replaced during rendering
      }
      // Fallback to plain string
      return type;
    });
    descriptors.push(typeDisplays.join(', '));
  }
  
  // Add shape/AOE if present
  if (rollObj.shape) {
    descriptors.push(rollObj.shape);
  }
  
  // Combine: "1d4" + "+ [SAD]" = "1d4 + [SAD]"
  let result = parts.join(' + ');
  
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


function createCardElement(data) {
  const card = document.createElement('div');
  card.className = `card ${data.level}`;
  
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
  
  const explanation = document.createElement('p');
  explanation.className = 'simple-explanation';
  
  // For custom cards, add writable space instead of text
  if (data.level === 'custom') {
    explanation.style.minHeight = '14mm';
    explanation.style.display = 'flex';
    explanation.style.alignItems = 'flex-end';
    explanation.textContent = '';
  } else {
    explanation.textContent = data.explanation;
  }
  body.appendChild(explanation);
  
  // Add centered stats line for creatures (HP / AC)
  if (data.stats_line) {
    const statsLine = document.createElement('p');
    statsLine.style.textAlign = 'center';
    statsLine.style.fontSize = '7pt';
    statsLine.style.fontWeight = '700';
    statsLine.style.margin = '0 0 3px 0';
    statsLine.style.lineHeight = '1.2';
    statsLine.textContent = data.stats_line;
    body.appendChild(statsLine);
  }
  
  const detailsDiv = document.createElement('div');
  detailsDiv.className = 'spell-details';
  
  // Handle both object and array detail formats
  let detailsToRender = [];
  if (data.details) {
    if (typeof data.details === 'string') {
      // Plain text details (from skills) - render directly
      const detailRow = document.createElement('div');
      detailRow.style.display = 'block';
      detailRow.style.marginBottom = '3px';
      detailRow.style.lineHeight = '1.4';
      detailRow.textContent = data.details;
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
  
  detailsToRender.forEach(detail => {
    const detailRow = document.createElement('div');
    detailRow.style.display = 'block';
    detailRow.style.marginBottom = '3px';
    detailRow.style.lineHeight = '1.4';
    
    // Apply background color if detail has color metadata (e.g., for creature types)
    if (detail.color) {
      detailRow.style.backgroundColor = detail.color;
      detailRow.style.color = '#fff';
      detailRow.style.padding = '2px 3px';
      detailRow.style.borderRadius = '3px';
      detailRow.style.fontWeight = '600';
    }
    
    const label = document.createElement('span');
    label.className = 'label';
    label.style.display = 'inline';
    label.style.marginRight = '2px';
    
    // Check if this detail has actor/save info from database roll format - include in label
    let labelText = detail.label;
    if (typeof detail.content === 'object' && detail.content !== null) {
      const labelParts = [];
      
      // Add actor if present and not "self"
      if (detail.content.actor && detail.content.actor !== 'self') {
        labelParts.push(detail.content.actor.charAt(0).toUpperCase() + detail.content.actor.slice(1));
      }
      
      // Add Save if present
      if (detail.content.save === true) {
        labelParts.push('Save');
      }
      
      // If we have parts, insert them into the label
      if (labelParts.length > 0) {
        labelText = labelText.replace(':', ` (${labelParts.join(', ')}):`);
      }
    }
    label.textContent = labelText;
    detailRow.appendChild(label);
    
    // Reconstruct roll data if it's a structured roll object
    let displayContent = detail.content;
    let isHtmlContent = false;
    
    if (typeof detail.content === 'object' && detail.content !== null && !Array.isArray(detail.content)) {
      // Check if it's a creature attack {name, to_hit, damage}
      if (detail.content.to_hit !== undefined || detail.content.damage !== undefined) {
        displayContent = reconstructCreatureAttack(detail.content);
      }
      // Check if it's a range object {distance, target}
      else if (detail.content.distance !== undefined || detail.content.target !== undefined) {
        displayContent = formatRangeObject(detail.content);
      }
      // Check if it's the new database roll format (roll, numerics, types, save)
      else if (detail.content.roll !== undefined || detail.content.numerics !== undefined || 
          detail.content.types !== undefined || detail.content.save !== undefined) {
        // It's the new database roll format - reconstruct it
        displayContent = reconstructDatabaseRoll(detail.content);
      }
      // Check if it's the old structured roll object format (baseModifier, statModifier, applySpellModifier)
      else if (detail.content.baseModifier !== undefined || detail.content.statModifier !== undefined || 
          detail.content.applySpellModifier !== undefined || detail.content.rollActor !== undefined || 
          detail.content.suffix !== undefined || detail.content.numDice !== undefined || 
          detail.content.diceType || detail.content.modifier !== undefined) {
        // It's the old structured roll format - reconstruct it
        displayContent = reconstructStructuredRoll(detail.content);
      }
    } else if (typeof detail.content === 'string' && detail.content.includes('<')) {
      // Content has HTML tags - mark it as HTML
      isHtmlContent = true;
    }
    
    // Check if content has HTML tags (from ability spans in modifiers)
    if (typeof displayContent === 'string' && displayContent.includes('<')) {
      isHtmlContent = true;
    }
    
    // Check if content has [SAD], [SAM], [BOX], [STAT:xxx], or [DAMAGE:xxx] placeholders
    if (typeof displayContent === 'string' && (displayContent.includes('[BOX]') || displayContent.includes('[STAT:') || 
        displayContent.includes('[SAD]') || displayContent.includes('[SAM]') || displayContent.includes('[DAMAGE:'))) {
      // Determine the box text based on card type (but [SAD]/[SAM] now embed their own text)
      let boxText = 'SAM';  // Default: Spell Attack Modifier (for [BOX] legacy format)
      if (data.hands) {
        boxText = 'BtH';    // Weapons: Bonus to Hit
      }
      // Pass the original roll object so numerics/damage type metadata (emoji, color, name) is available
      const rollObj = typeof detail.content === 'object' && (detail.content.numerics || detail.content.types) ? detail.content : null;
      const contentFragment = renderContentWithPlaceholders(displayContent, boxText, rollObj);
      if (contentFragment) {
        detailRow.appendChild(contentFragment);
        isHtmlContent = false;  // Already rendered as HTML
      }
    } else if (isHtmlContent && !displayContent.includes('[')) {
      // Create a span to hold HTML content (for spells with ability spans)
      const contentSpan = document.createElement('span');
      contentSpan.style.display = 'inline';
      contentSpan.innerHTML = displayContent;
      detailRow.appendChild(contentSpan);
    } else {
      // Render as plain text
      const content = document.createTextNode(displayContent);
      detailRow.appendChild(content);
    }
    
    detailsDiv.appendChild(detailRow);
  });
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
  
  body.appendChild(detailsDiv);
  
  // Add draw box
  const drawBox = document.createElement('div');
  drawBox.className = 'draw-box';
  body.appendChild(drawBox);
  
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
    } else if (data.level === 'cantrip' || /^\d+$/.test(data.level) || /^level\d+$/i.test(data.level)) {
      // Spells: "Level 1 · Evocation" or "Cantrip · Evocation"
      let levelText;
      if (data.level === 'cantrip') {
        levelText = 'Cantrip';
      } else {
        const match = data.level.match(/\d+/);
        levelText = match ? `Level ${match[0]}` : '';
      }
      footerText = levelText && data.school ? `${levelText} · ${data.school}` : (data.school || levelText || '');
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
function renderPaginatedCards(containerSelector, cardsData, cardsPerPage = 9, pageTitle = '✨ Cards ✨', pageSubtitle = 'Dungeons & Dragons · 5th Edition · Cut out & keep!') {
  const container = document.querySelector(containerSelector);
  if (!container) return;
  
  const totalPages = Math.ceil(cardsData.length / cardsPerPage);
  
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
    
    // Add cards for this page
    const startIdx = pageNum * cardsPerPage;
    const endIdx = Math.min(startIdx + cardsPerPage, cardsData.length);
    
    for (let i = startIdx; i < endIdx; i++) {
      grid.appendChild(createCardElement(cardsData[i]));
    }
    
    page.appendChild(grid);
    container.appendChild(page);
  }
}
