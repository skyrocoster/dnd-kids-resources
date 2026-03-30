// Blank action cards initialization
document.addEventListener('DOMContentLoaded', async function() {
  try {
    let response;
    const paths = [
      '../data/actions-blank.json',
      './data/actions-blank.json',
      'data/actions-blank.json'
    ];
    
    for (const path of paths) {
      try {
        response = await fetch(path);
        if (response.ok) {
          console.log(`✓ Loaded blank actions from: ${path}`);
          break;
        }
      } catch (e) {
        // Try next path
      }
    }
    
    if (!response || !response.ok) {
      throw new Error(`Failed to load actions-blank.json`);
    }
    
    const data = await response.json();
    
    renderPaginatedCards(
      '#page-container',
      data,
      9,
      'Blank Actions & Skills',
      'Write in your own actions and skills'
    );
  } catch (error) {
    console.error('Error loading blank action cards:', error);
    document.getElementById('page-container').innerHTML = `<p>${error.message}</p>`;
  }
});
