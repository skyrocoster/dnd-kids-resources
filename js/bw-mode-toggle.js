// B&W Print Mode Toggle Utility
// This script adds a B&W mode toggle button for print preview

document.addEventListener('DOMContentLoaded', function() {
  // Create and add the B&W toggle button
  const bwToggleBtn = document.createElement('button');
  bwToggleBtn.id = 'bw-toggle-btn';
  bwToggleBtn.textContent = '📄 Print B&W';
  bwToggleBtn.title = 'Toggle black & white mode for printing';
  
  // Check if user previously selected B&W mode
  const isBWMode = localStorage.getItem('bw-mode') === 'true';
  if (isBWMode) {
    document.body.classList.add('bw-mode');
    bwToggleBtn.classList.add('active');
    bwToggleBtn.textContent = '📄 Print B&W (ON)';
  }
  
  // Toggle B&W mode on click
  bwToggleBtn.addEventListener('click', function(e) {
    e.preventDefault();
    const isCurrentlyBW = document.body.classList.toggle('bw-mode');
    localStorage.setItem('bw-mode', isCurrentlyBW);
    
    if (isCurrentlyBW) {
      bwToggleBtn.classList.add('active');
      bwToggleBtn.textContent = '📄 Print B&W (ON)';
    } else {
      bwToggleBtn.classList.remove('active');
      bwToggleBtn.textContent = '📄 Print B&W';
    }
  });
  
  document.body.appendChild(bwToggleBtn);
});
