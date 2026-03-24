// Spell-specific initialization
document.addEventListener('DOMContentLoaded', async function() {
  try {
    // Try multiple fetch paths to handle different deployment scenarios
    let response;
    const paths = [
      '../data/spells.json',        // From pages/ folder
      './data/spells.json',         // From root
      'data/spells.json'            // Relative from current
    ];
    
    for (const path of paths) {
      try {
        response = await fetch(path);
        if (response.ok) {
          console.log(`✓ Loaded spells from: ${path}`);
          break;
        }
      } catch (e) {
        // Try next path
      }
    }
    
    if (!response || !response.ok) {
      throw new Error(`Failed to load spells.json. Status: ${response?.status || 'unknown'}`);
    }
    
    const spellsData = await response.json();
    
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
