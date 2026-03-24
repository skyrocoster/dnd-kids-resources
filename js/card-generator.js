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
  box.className = 'sab-box';
  box.style.display = 'inline-flex';
  box.style.verticalAlign = 'middle';
  box.setAttribute('data-box-text', boxText);
  return box;
}

// Replaces [BOX] markers in content with actual box elements
// boxText defaults to 'SAM' but can be customized
function renderContentWithBoxes(contentStr, boxText = 'SAM') {
  if (!contentStr.includes('[BOX]')) {
    return null; // No boxes to replace
  }
  
  const fragment = document.createDocumentFragment();
  const parts = contentStr.split('[BOX]');
  
  for (let i = 0; i < parts.length; i++) {
    if (parts[i]) {
      fragment.appendChild(document.createTextNode(parts[i]));
    }
    if (i < parts.length - 1) {
      // Add box before the next part
      fragment.appendChild(createModifierBox(boxText));
    }
  }
  
  return fragment;
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
  explanation.textContent = data.explanation;
  body.appendChild(explanation);
  
  const detailsDiv = document.createElement('div');
  detailsDiv.className = 'spell-details';
  
  // Handle both object and array detail formats
  let detailsToRender = [];
  if (data.details) {
    if (Array.isArray(data.details)) {
      // Check if it's the new format (with labels) or abstracted format
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
    
    const label = document.createElement('span');
    label.className = 'label';
    label.style.display = 'inline';
    label.style.marginRight = '2px';
    label.textContent = detail.label;
    detailRow.appendChild(label);
    
    // Reconstruct roll data if it's a structured roll object
    let displayContent = detail.content;
    let isHtmlContent = false;
    
    if (typeof detail.content === 'object' && detail.content !== null && !Array.isArray(detail.content)) {
      // Check if it looks like a roll object
      if (detail.content.numDice !== undefined || detail.content.diceType) {
        displayContent = reconstructRollString(detail.content);
      }
    } else if (typeof detail.content === 'string' && detail.content.includes('<')) {
      // Content has HTML tags - mark it as HTML
      isHtmlContent = true;
    }
    
    // Check if content has [BOX] placeholder - unified method for weapons and spells
    if (typeof displayContent === 'string' && displayContent.includes('[BOX]')) {
      // Determine the box text based on card type
      const boxText = data.hands ? 'BtH' : 'SAM';  // 'BtH' for weapons, 'SAM' for spells
      const boxFragment = renderContentWithBoxes(displayContent, boxText);
      if (boxFragment) {
        detailRow.appendChild(boxFragment);
      }
    } else if (isHtmlContent) {
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
  
  const drawBox = document.createElement('div');
  drawBox.className = 'draw-box';
  body.appendChild(drawBox);
  
  card.appendChild(body);
  
  // Card footer
  const footer = document.createElement('div');
  footer.className = 'card-footer';
  
  // For weapons, use type and hands; for spells use level and school; for magic items use type and school
  let footerText;
  if (data.hands) {
    // Weapons: "Simple Melee · 1-handed"
    footerText = `${data.type} · ${data.hands}`;
  } else if (data.level === 'cantrip' || /^\d+$/.test(data.level)) {
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
