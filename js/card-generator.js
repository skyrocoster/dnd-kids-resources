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
    detailRow.style.display = 'flex';
    detailRow.style.alignItems = 'center';
    detailRow.style.gap = '2px';
    detailRow.style.flexWrap = 'wrap';
    
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = detail.label;
    detailRow.appendChild(label);
    
    // Check if this is a Roll line for a weapon and replace "ability" with an ability box
    if (data.hands && detail.label.includes('Roll')) {
      const contentParts = detail.content.split('ability');
      if (contentParts.length > 1) {
        // Has "ability" in the content - replace with a box
        const textBefore = document.createTextNode(contentParts[0]);
        detailRow.appendChild(textBefore);
        
        const abilityBox = document.createElement('div');
        abilityBox.className = 'ability-box';
        abilityBox.style.display = 'inline-flex';
        detailRow.appendChild(abilityBox);
        
        if (contentParts[1]) {
          const textAfter = document.createTextNode(contentParts[1]);
          detailRow.appendChild(textAfter);
        }
      } else {
        // No "ability" text, just add content as is
        const content = document.createTextNode(detail.content);
        detailRow.appendChild(content);
      }
    } else {
      // Non-Roll lines or non-weapons: render content normally
      const content = document.createTextNode(detail.content);
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
