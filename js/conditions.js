// Conditions cards initialization
document.addEventListener('DOMContentLoaded', async function() {
  try {
    // Load conditions from Flask API
    const response = await fetch('/api/conditions');
    
    if (!response.ok) {
      throw new Error(`Failed to load conditions from API: ${response.status}`);
    }
    
    const conditionsData = await response.json();
    console.log(`✓ Loaded ${conditionsData.length} conditions from API`);
    
    renderPaginatedCards(
      '#page-container',
      conditionsData,
      9,
      'Conditions & Status Effects',
      'Knowledge about effects that change how characters work'
    );
  } catch (error) {
    console.error('Error loading conditions:', error);
    document.getElementById('page-container').innerHTML = `<p>Error loading condition data: ${error.message}</p>`;
  }
});
