document.addEventListener('DOMContentLoaded', async function() {
  try {
    // Fetch creatures from API
    const response = await fetch('/api/creatures');
    
    if (!response.ok) {
      throw new Error(`Failed to load creatures from API: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✓ Loaded ${data.length} creatures from API`);
    
    renderPaginatedCards(
      '#page-container',
      data,
      9,
      '🐺 Creatures 🦅',
      'Friendly creatures for every adventure'
    );
  } catch (error) {
    console.error('Error loading cards:', error);
    document.getElementById('page-container').innerHTML = `<p>${error.message}</p>`;
  }
});
