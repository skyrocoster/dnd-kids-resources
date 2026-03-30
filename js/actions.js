// Action and skill cards initialization
document.addEventListener('DOMContentLoaded', async function() {
  try {
    // Try multiple fetch paths
    let response;
    const paths = [
      '../data/actions.json',
      './data/actions.json',
      'data/actions.json'
    ];
    
    for (const path of paths) {
      try {
        response = await fetch(path);
        if (response.ok) {
          console.log(`✓ Loaded actions from: ${path}`);
          break;
        }
      } catch (e) {
        // Try next path
      }
    }
    
    if (!response || !response.ok) {
      throw new Error(`Failed to load actions.json`);
    }
    
    const data = await response.json();
    
    renderPaginatedCards(
      '#page-container',
      data,
      9,
      'Actions & Skills',
      'Things your character can do to interact with the world'
    );
  } catch (error) {
    console.error('Error loading action cards:', error);
    document.getElementById('page-container').innerHTML = `<p>${error.message}</p>`;
  }
});
