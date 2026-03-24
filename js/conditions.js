// Conditions cards initialization
document.addEventListener('DOMContentLoaded', async function() {
  try {
    // Try multiple fetch paths
    let response;
    const paths = [
      '../data/conditions.json',
      './data/conditions.json',
      'data/conditions.json'
    ];
    
    for (const path of paths) {
      try {
        response = await fetch(path);
        if (response.ok) {
          console.log(`✓ Loaded conditions from: ${path}`);
          break;
        }
      } catch (e) {
        // Try next path
      }
    }
    
    if (!response || !response.ok) {
      throw new Error(`Failed to load conditions.json. Status: ${response?.status || 'unknown'}`);
    }
    
    const conditionsData = await response.json();
    
    // Render the cards
    renderPaginatedCards(
      '#page-container',
      conditionsData,
      9,
      'Conditions & Status Effects',
      'Knowledge about effects that change how characters work'
    );
  } catch (error) {
    console.error('Error loading conditions:', error);
    document.getElementById('page-container').innerHTML = `<p>${error.message}</p>`;
  }
});
