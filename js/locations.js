document.addEventListener('DOMContentLoaded', async function() {
  try {
    let response;
    const paths = [
      '../data/locations.json',
      './data/locations.json',
      'data/locations.json'
    ];
    
    for (const path of paths) {
      try {
        response = await fetch(path);
        if (response.ok) {
          console.log(`✓ Loaded data from: ${path}`);
          break;
        }
      } catch (e) {
        // Try next path
      }
    }
    
    if (!response || !response.ok) {
      throw new Error(`Failed to load locations.json`);
    }
    
    const data = await response.json();
    
    renderPaginatedCards(
      '#page-container',
      data,
      9,
      '🗺️ Location Cards 🗺️',
      'Explore buildings, cities, regions, and worlds with location reference cards'
    );
  } catch (error) {
    console.error('Error loading cards:', error);
    document.getElementById('page-container').innerHTML = `<p>${error.message}</p>`;
  }
});
