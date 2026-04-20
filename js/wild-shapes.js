document.addEventListener('DOMContentLoaded', async function() {
  try {
    // Fetch monsters from API
    const response = await fetch('/api/monsters');
    
    if (!response.ok) {
      throw new Error(`Failed to load monsters from API: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✓ Loaded ${data.length} monsters from API`);
    
    renderPaginatedCards(
      '#page-container',
      data,
      9,
      '🐺 Monsters 🦅',
      'Friendly monsters for every adventure'
    );
  } catch (error) {
    console.error('Error loading cards:', error);
    document.getElementById('page-container').innerHTML = `<p>${error.message}</p>`;
  }
});
