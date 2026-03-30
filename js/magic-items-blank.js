// Blank magic item cards initialization
document.addEventListener('DOMContentLoaded', async function() {
  try {
    let response;
    const paths = [
      '../data/magic-items-blank.json',
      './data/magic-items-blank.json',
      'data/magic-items-blank.json'
    ];
    
    for (const path of paths) {
      try {
        response = await fetch(path);
        if (response.ok) {
          console.log(`✓ Loaded blank magic items from: ${path}`);
          break;
        }
      } catch (e) {
        // Try next path
      }
    }
    
    if (!response || !response.ok) {
      throw new Error(`Failed to load magic-items-blank.json`);
    }
    
    const data = await response.json();
    
    renderPaginatedCards(
      '#page-container',
      data,
      9,
      'Blank Magic Item Cards',
      'Write in your own magic items'
    );
  } catch (error) {
    console.error('Error loading blank magic item cards:', error);
    document.getElementById('page-container').innerHTML = `<p>${error.message}</p>`;
  }
});
