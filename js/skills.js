// Skill cards initialization
document.addEventListener('DOMContentLoaded', async function() {
  try {
    // Load skills from Flask API
    const response = await fetch('/api/skills');
    
    if (!response.ok) {
      throw new Error(`Failed to load actions from API: ${response.status}`);
    }
    
    const skillsData = await response.json();
    console.log(`✓ Loaded ${skillsData.length} skills from API`);
    
    renderPaginatedCards(
      '#page-container',
      skillsData,
      9,
      'Skills',
      'What your character knows and can do'
    );
  } catch (error) {
    console.error('Error loading skills:', error);
    document.getElementById('page-container').innerHTML = `<p>Error loading skill data: ${error.message}</p>`;
  }
});
