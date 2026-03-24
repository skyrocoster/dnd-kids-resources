// NPC cards initialization
document.addEventListener('DOMContentLoaded', async function() {
  try {
    // Try multiple fetch paths
    let response;
    const paths = [
      '../data/npcs.json',
      './data/npcs.json',
      'data/npcs.json'
    ];
    
    for (const path of paths) {
      try {
        response = await fetch(path);
        if (response.ok) {
          console.log(`✓ Loaded NPCs from: ${path}`);
          break;
        }
      } catch (e) {
        // Try next path
      }
    }
    
    if (!response || !response.ok) {
      throw new Error(`Failed to load npcs.json. Status: ${response?.status || 'unknown'}`);
    }
    
    const npcsData = await response.json();
    
    // Render the cards
    renderPaginatedCards(
      '#page-container',
      npcsData,
      9,
      '🧙 NPC Cards 🧙',
      'Non-playable characters for your adventures'
    );
  } catch (error) {
    console.error('Error loading NPCs:', error);
    document.getElementById('page-container').innerHTML = `<p>${error.message}</p>`;
  }
});
