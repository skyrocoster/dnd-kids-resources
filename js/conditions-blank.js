// Blank condition cards initialization
document.addEventListener('DOMContentLoaded', async function() {
  try {
    let response;
    const paths = [
      '../data/conditions-blank.json',
      './data/conditions-blank.json',
      'data/conditions-blank.json'
    ];
    
    for (const path of paths) {
      try {
        response = await fetch(path);
        if (response.ok) {
          console.log(`✓ Loaded blank conditions from: ${path}`);
          break;
        }
      } catch (e) {
        // Try next path
      }
    }
    
    if (!response || !response.ok) {
      throw new Error(`Failed to load conditions-blank.json`);
    }
    
    const data = await response.json();
    
    renderPaginatedCards(
      '#page-container',
      data,
      9,
      'Blank Condition Cards',
      'Write in your own conditions'
    );
  } catch (error) {
    console.error('Error loading blank condition cards:', error);
    document.getElementById('page-container').innerHTML = `<p>${error.message}</p>`;
  }
});
