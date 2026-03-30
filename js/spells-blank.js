// Blank spell cards initialization
document.addEventListener('DOMContentLoaded', async function() {
  try {
    let response;
    const paths = [
      '../data/spells-blank.json',
      './data/spells-blank.json',
      'data/spells-blank.json'
    ];
    
    for (const path of paths) {
      try {
        response = await fetch(path);
        if (response.ok) {
          console.log(`✓ Loaded blank spells from: ${path}`);
          break;
        }
      } catch (e) {
        // Try next path
      }
    }
    
    if (!response || !response.ok) {
      throw new Error(`Failed to load spells-blank.json`);
    }
    
    const data = await response.json();
    
    renderPaginatedCards(
      '#page-container',
      data,
      9,
      'Blank Spell Cards',
      'Write in your own spells'
    );
  } catch (error) {
    console.error('Error loading blank spell cards:', error);
    document.getElementById('page-container').innerHTML = `<p>${error.message}</p>`;
  }
});
