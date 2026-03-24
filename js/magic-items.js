// Magic items cards initialization
document.addEventListener('DOMContentLoaded', async function() {
  try {
    // Try multiple fetch paths
    let response;
    const paths = [
      '../data/magic-items.json',
      './data/magic-items.json',
      'data/magic-items.json'
    ];
    
    for (const path of paths) {
      try {
        response = await fetch(path);
        if (response.ok) {
          console.log(`✓ Loaded magic items from: ${path}`);
          break;
        }
      } catch (e) {
        // Try next path
      }
    }
    
    if (!response || !response.ok) {
      throw new Error(`Failed to load magic-items.json. Status: ${response?.status || 'unknown'}`);
    }
    
    const itemsData = await response.json();
    
    // Render the cards
    renderPaginatedCards(
      '#page-container',
      itemsData,
      9,
      'Magic Items',
      'Wondrous items of power and utility'
    );
  } catch (error) {
    console.error('Error loading magic items:', error);
    document.getElementById('page-container').innerHTML = `<p>${error.message}</p>`;
  }
});
