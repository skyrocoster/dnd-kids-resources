// Spell-specific initialization
document.addEventListener('DOMContentLoaded', async function() {
  try {
    // Load spells from Flask API
    const response = await fetch('/api/spells');
    
    if (!response.ok) {
      throw new Error(`Failed to load spells from API: ${response.status}`);
    }
    
    const allSpells = await response.json();
    console.log(`✓ Loaded ${allSpells.length} spells from API`);
    
    // Helper to normalize spell level (converts "level1" → 1, "cantrip" → 0, etc.)
    function normalizeLevel(level) {
      if (typeof level === 'number') return level;
      if (typeof level === 'string') {
        if (level === 'cantrip') return 0;
        const match = level.match(/\d+/);
        return match ? parseInt(match[0]) : NaN;
      }
      return NaN;
    }
    
    // Load print options from localStorage
    const cardDensity = parseInt(localStorage.getItem('card_density') || '9');
    const paginationStrategy = localStorage.getItem('pagination_strategy') || 'standard';
    
    // Set initial values in UI
    const densitySelect = document.getElementById('card-density');
    const strategySelect = document.getElementById('pagination-strategy');
    const rangeDisplaySelect = document.getElementById('range-display-mode');
    const rangeDisplayMode = localStorage.getItem('range_display_mode') || 'standard';
    if (densitySelect) densitySelect.value = cardDensity;
    if (strategySelect) strategySelect.value = paginationStrategy;
    if (rangeDisplaySelect) rangeDisplaySelect.value = rangeDisplayMode;
    
    // Listen to print option changes
    if (densitySelect) {
      densitySelect.addEventListener('change', function(e) {
        localStorage.setItem('card_density', this.value);
        // Re-render with new options
        updateSpellDisplay(allSpells, selectedLevels, normalizeLevel);
      });
    }
    
    if (strategySelect) {
      strategySelect.addEventListener('change', function(e) {
        localStorage.setItem('pagination_strategy', this.value);
        // Re-render with new options
        updateSpellDisplay(allSpells, selectedLevels, normalizeLevel);
      });
    }

    if (rangeDisplaySelect) {
      rangeDisplaySelect.addEventListener('change', function(e) {
        localStorage.setItem('range_display_mode', this.value);
        updateSpellDisplay(allSpells, selectedLevels, normalizeLevel);
      });
    }
    
    // Get unique spell levels and sort them
    const spellLevels = [...new Set(allSpells.map(spell => normalizeLevel(spell.level)))].filter(lv => !isNaN(lv)).sort((a, b) => a - b);
    console.log(`✓ Found spell levels:`, spellLevels);

    // Get unique class codes and sort them alphabetically
    const classCodes = [...new Set(allSpells.flatMap(spell => Array.isArray(spell.classes) ? spell.classes : []))].sort();
    console.log(`✓ Found spell classes:`, classCodes);

    // Track selected levels and classes (default: all selected)
    const selectedLevels = new Set(spellLevels);
    const selectedClasses = new Set(classCodes);
    
    // Create filter buttons
    const filterContainer = document.getElementById('level-buttons');
    const classContainer = document.getElementById('class-buttons');
    const levelFilter = document.getElementById('level-filter');
    
    console.log(`Filter container found:`, filterContainer !== null);
    console.log(`Spell levels count:`, spellLevels.length);
    
    if (filterContainer) {
      levelFilter.classList.add('visible');
      
      spellLevels.forEach(level => {
        const btn = document.createElement('button');
        btn.className = 'level-btn active';
        btn.textContent = level === 0 ? 'Cantrips' : `Level ${level}`;
        btn.setAttribute('data-level', level);
        btn.type = 'button';
        
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          const levelNum = parseInt(this.getAttribute('data-level'));
          console.log(`Clicked level button:`, levelNum);
          
          if (selectedLevels.has(levelNum)) {
            selectedLevels.delete(levelNum);
            this.classList.remove('active');
            console.log(`Deselected level ${levelNum}`);
          } else {
            selectedLevels.add(levelNum);
            this.classList.add('active');
            console.log(`Selected level ${levelNum}`);
          }
          
          // Re-render cards with selected levels
          updateSpellDisplay(allSpells, selectedLevels, normalizeLevel);
        });
        
        filterContainer.appendChild(btn);
        console.log(`Created button for level ${level}`);
      });

      if (classCodes.length > 0 && classContainer) {
        const classTitle = document.createElement('div');
        classTitle.className = 'filter-title';
        classTitle.style.marginTop = '18px';
        classTitle.textContent = 'Filter by Spell Class';
        classContainer.appendChild(classTitle);

        classCodes.forEach(cls => {
          const classBtn = document.createElement('button');
          classBtn.className = 'level-btn active';
          classBtn.textContent = cls.charAt(0).toUpperCase() + cls.slice(1);
          classBtn.setAttribute('data-class', cls);
          classBtn.type = 'button';

          classBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const classCode = this.getAttribute('data-class');
            if (selectedClasses.has(classCode)) {
              selectedClasses.delete(classCode);
              this.classList.remove('active');
            } else {
              selectedClasses.add(classCode);
              this.classList.add('active');
            }
            updateSpellDisplay(allSpells, selectedLevels, normalizeLevel);
          });

          classContainer.appendChild(classBtn);
          console.log(`Created button for class ${cls}`);
        });
      }
      
      // Add "Select All" and "Select None" buttons
      const selectAllBtn = document.getElementById('select-all-btn');
      const selectNoneBtn = document.getElementById('select-none-btn');
      
      if (selectAllBtn) {
        selectAllBtn.addEventListener('click', function(e) {
          e.preventDefault();
          console.log('Select All clicked');
          spellLevels.forEach(level => selectedLevels.add(level));
          classCodes.forEach(cls => selectedClasses.add(cls));
          document.querySelectorAll('.level-btn').forEach(btn => btn.classList.add('active'));
          updateSpellDisplay(allSpells, selectedLevels, normalizeLevel);
        });
      }
      
      if (selectNoneBtn) {
        selectNoneBtn.addEventListener('click', function(e) {
          e.preventDefault();
          console.log('Select None clicked');
          selectedLevels.clear();
          selectedClasses.clear();
          document.querySelectorAll('.level-btn').forEach(btn => btn.classList.remove('active'));
          updateSpellDisplay(allSpells, selectedLevels, normalizeLevel);
        });
      }
      
      // Add Reset Hidden Cards button
      const resetHiddenBtn = document.createElement('button');
      resetHiddenBtn.id = 'reset-hidden-btn';
      resetHiddenBtn.textContent = 'Reset Hidden Cards';
      resetHiddenBtn.style.marginLeft = '10px';
      resetHiddenBtn.style.padding = '5px 10px';
      resetHiddenBtn.style.backgroundColor = '#e74c3c';
      resetHiddenBtn.style.color = 'white';
      resetHiddenBtn.style.border = 'none';
      resetHiddenBtn.style.borderRadius = '4px';
      resetHiddenBtn.style.cursor = 'pointer';
      resetHiddenBtn.style.fontSize = '12px';
      resetHiddenBtn.style.fontWeight = 'bold';
      
      resetHiddenBtn.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('Reset Hidden Cards clicked');
        // Clear hidden cards from localStorage
        localStorage.removeItem('hidden_cards');
        // Re-render to show all cards
        updateSpellDisplay(allSpells, selectedLevels, normalizeLevel);
        // Hide the reset button
        resetHiddenBtn.style.display = 'none';
      });
      
      // Only show reset button if there are hidden cards
      const hiddenCards = JSON.parse(localStorage.getItem('hidden_cards') || '[]');
      if (hiddenCards.length === 0) {
        resetHiddenBtn.style.display = 'none';
      }
      
      filterContainer.parentElement.appendChild(resetHiddenBtn);
    }
    
    // Create callback for when cards are hidden
    const onCardHidden = () => {
      updateSpellDisplay(allSpells, selectedLevels, normalizeLevel);
    };
    
    // Make it globally accessible for renderPaginatedCards
    window.spellCardHideCallback = onCardHidden;
    
    // Initial render with all spells
    updateSpellDisplay(allSpells, selectedLevels, normalizeLevel);
    
  } catch (error) {
    console.error('Error loading spells:', error);
    document.getElementById('page-container').innerHTML = `<p>Error loading spell data: ${error.message}</p>`;
  }
});

// Helper function to filter and render spells
function updateSpellDisplay(allSpells, selectedLevels, normalizeLevel) {
  const filteredSpells = selectedLevels.size === 0 
    ? [] 
    : allSpells.filter(spell => {
      const spellLevel = normalizeLevel(spell.level);
      return selectedLevels.has(spellLevel);
    });
  
  // Filter out hidden cards
  const hiddenCards = JSON.parse(localStorage.getItem('hidden_cards') || '[]');
  const visibleSpells = filteredSpells.filter(spell => {
    const spellClasses = Array.isArray(spell.classes) ? spell.classes : [];
    const matchesClass = selectedClasses.size === 0 || spellClasses.some(cls => selectedClasses.has(cls));
    const cardId = spell.id ? `card-${spell.id}` : `card-${spell.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    return matchesClass && !hiddenCards.includes(cardId);
  });
  
  // Sort by level first (cantrip = 0), then alphabetically by title
  visibleSpells.sort((a, b) => {
    const levelA = normalizeLevel(a.level);
    const levelB = normalizeLevel(b.level);
    
    if (levelA !== levelB) {
      return levelA - levelB;  // Sort by level first
    }
    
    return a.title.localeCompare(b.title);  // Then alphabetically by title
  });
  
  console.log(`Displaying ${visibleSpells.length} spells (selected levels: ${Array.from(selectedLevels).join(', ')}), ${hiddenCards.length} hidden`);
  
  // Clear existing pages
  const container = document.getElementById('page-container');
  container.innerHTML = '';
  
  if (visibleSpells.length === 0) {
    container.innerHTML = '<div style="padding: 20px; text-align: center; font-size: 18px; color: #666;">No spells to display. Choose a level above or reset hidden cards.</div>';
    return;
  }
  
  // Get print options from localStorage
  const cardDensity = parseInt(localStorage.getItem('card_density') || '9');
  const paginationStrategy = localStorage.getItem('pagination_strategy') || 'standard';
  
  // Render the filtered cards with selected options
  if (paginationStrategy === 'by-level') {
    renderPaginatedCardsByLevel(
      '#page-container',
      visibleSpells,
      cardDensity,
      '✨ Spell Cards ✨',
      'Dungeons &amp; Dragons · 5th Edition · Cut out &amp; keep!',
      window.spellCardHideCallback,
      normalizeLevel
    );
  } else {
    renderPaginatedCards(
      '#page-container',
      visibleSpells,
      cardDensity,
      '✨ Spell Cards ✨',
      'Dungeons &amp; Dragons · 5th Edition · Cut out &amp; keep!',
      window.spellCardHideCallback
    );
  }
}

// Render paginated cards grouped by spell level
function renderPaginatedCardsByLevel(containerSelector, cardsData, cardsPerPage = 9, pageTitle = '✨ Cards ✨', pageSubtitle = 'Dungeons & Dragons · 5th Edition · Cut out & keep!', onHideCallback = null, normalizeLevel = null) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  // Default normalizeLevel if not provided
  const normalizeLevelFunc = normalizeLevel || ((level) => {
    if (level === 'cantrip') return 0;
    const match = level.match(/\d+/);
    return match ? parseInt(match[0]) : NaN;
  });

  // Group spells by level
  const spellsByLevel = {};
  cardsData.forEach(card => {
    const level = normalizeLevelFunc(card.level);
    if (!spellsByLevel[level]) {
      spellsByLevel[level] = [];
    }
    spellsByLevel[level].push(card);
  });

  // Sort levels in ascending order
  const sortedLevels = Object.keys(spellsByLevel).map(Number).sort((a, b) => a - b);

  // Create pages for each level
  sortedLevels.forEach(level => {
    const levelSpells = spellsByLevel[level];
    const levelName = level === 0 ? 'Cantrip' : `Level ${level}`;
    const totalPages = Math.ceil(levelSpells.length / cardsPerPage);

    // Paginate this level's spells
    for (let pageNum = 0; pageNum < totalPages; pageNum++) {
      const page = document.createElement('div');
      page.className = 'page';

      // Add header
      const header = document.createElement('div');
      header.className = 'page-header';
      const pageLabel = totalPages > 1 ? ` (${pageNum + 1}/${totalPages})` : '';
      header.innerHTML = `<h1>${pageTitle}</h1><p>${levelName} Spells${pageLabel}</p>`;
      page.appendChild(header);

      // Add grid
      const grid = document.createElement('div');
      
      // Calculate grid columns based on cardsPerPage
      let gridCols = 3;
      if (cardsPerPage === 12) {
        gridCols = 3;  // 3x4
      } else if (cardsPerPage === 15) {
        gridCols = 3;  // 3x5
      }
      // Default is 3x3 for 9 cards
      
      grid.className = 'cards-grid';
      grid.style.gridTemplateColumns = `repeat(${gridCols}, 63.5mm)`;
      grid.style.gridAutoRows = '88.9mm';
      
      // Add cards for this page
      const pageStart = pageNum * cardsPerPage;
      const pageEnd = Math.min(pageStart + cardsPerPage, levelSpells.length);

      for (let i = pageStart; i < pageEnd; i++) {
        const cardElement = createCardElement(levelSpells[i], onHideCallback);
        grid.appendChild(cardElement);
      }

      page.appendChild(grid);
      container.appendChild(page);
    }
  });
}
