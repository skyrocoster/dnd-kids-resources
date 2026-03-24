// Weapon management functions
function renderWeapons(standardWeapons) {
  // Render the cards
  renderPaginatedCards(
    '#page-container',
    standardWeapons,
    9,
    'Weapons',
    'A complete guide to weapons and combat gear'
  );
}

// Weapon cards initialization
document.addEventListener('DOMContentLoaded', async function() {
  try {
    // Try multiple fetch paths
    let response;
    const paths = [
      '../data/weapons.json',
      './data/weapons.json',
      'data/weapons.json'
    ];
    
    for (const path of paths) {
      try {
        response = await fetch(path);
        if (response.ok) {
          console.log(`✓ Loaded weapons from: ${path}`);
          break;
        }
      } catch (e) {
        // Try next path
      }
    }
    
    if (!response || !response.ok) {
      throw new Error(`Failed to load weapons.json. Status: ${response?.status || 'unknown'}`);
    }
    
    const standardWeapons = await response.json();
    
    // Render weapons
    renderWeapons(standardWeapons);
  } catch (error) {
    console.error('Error loading weapons:', error);
    document.getElementById('page-container').innerHTML = `<p>${error.message}</p>`;
  }
});
