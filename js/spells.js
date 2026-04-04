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
    
    // Get unique spell levels and sort them
    const spellLevels = [...new Set(allSpells.map(spell => normalizeLevel(spell.level)))].filter(lv => !isNaN(lv)).sort((a, b) => a - b);
    console.log(`✓ Found spell levels:`, spellLevels);
    
    // Track selected levels (default: all selected)
    const selectedLevels = new Set(spellLevels);
    
    // Create filter buttons
    const filterContainer = document.getElementById('level-buttons');
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
      
      // Add "Select All" and "Select None" buttons
      const selectAllBtn = document.getElementById('select-all-btn');
      const selectNoneBtn = document.getElementById('select-none-btn');
      
      if (selectAllBtn) {
        selectAllBtn.addEventListener('click', function(e) {
          e.preventDefault();
          console.log('Select All clicked');
          spellLevels.forEach(level => selectedLevels.add(level));
          document.querySelectorAll('.level-btn').forEach(btn => btn.classList.add('active'));
          updateSpellDisplay(allSpells, selectedLevels, normalizeLevel);
        });
      }
      
      if (selectNoneBtn) {
        selectNoneBtn.addEventListener('click', function(e) {
          e.preventDefault();
          console.log('Select None clicked');
          selectedLevels.clear();
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
    const cardId = spell.id ? `card-${spell.id}` : `card-${spell.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    return !hiddenCards.includes(cardId);
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
  
  // Render the filtered cards
  renderPaginatedCards(
    '#page-container',
    visibleSpells,
    9,
    '✨ Spell Cards ✨',
    'Dungeons &amp; Dragons · 5th Edition · Cut out &amp; keep!',
    window.spellCardHideCallback
  );
}
