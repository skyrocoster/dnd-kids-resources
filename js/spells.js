// Spell-specific initialization
document.addEventListener('DOMContentLoaded', async function() {
  try {
    // Load spells from Flask API
    const response = await fetch('/api/spells');
    
    if (!response.ok) {
      throw new Error(`Failed to load spells from API: ${response.status}`);
    }
    
    const spellsData = await response.json();
    console.log(`✓ Loaded ${spellsData.length} spells from API`);
    
    // Render the cards
    renderPaginatedCards(
      '#page-container',
      spellsData,
      9,
      '✨ Spell Cards ✨',
      'Dungeons &amp; Dragons · 5th Edition · Cut out &amp; keep!'
    );
  } catch (error) {
    console.error('Error loading spells:', error);
    document.getElementById('page-container').innerHTML = `<p>Error loading spell data: ${error.message}</p>`;
  }
});
