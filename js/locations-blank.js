// Blank location cards initialization
document.addEventListener('DOMContentLoaded', async function() {
  try {
    let response;
    const paths = [
      '../data/locations-blank.json',
      './data/locations-blank.json',
      'data/locations-blank.json'
    ];
    
    for (const path of paths) {
      try {
        response = await fetch(path);
        if (response.ok) {
          console.log(`✓ Loaded blank locations from: ${path}`);
          break;
        }
      } catch (e) {
        // Try next path
      }
    }
    
    if (!response || !response.ok) {
      throw new Error(`Failed to load locations-blank.json`);
    }
    
    const data = await response.json();
    
    renderPaginatedCards(
      '#page-container',
      data,
      9,
      'Blank Location Cards',
      'Write in your own locations'
    );
  } catch (error) {
    console.error('Error loading blank location cards:', error);
    document.getElementById('page-container').innerHTML = `<p>${error.message}</p>`;
  }
});
