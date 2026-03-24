// HP Tracker - Health point tracking for characters, wild shapes, and companions
// Interactive circles to mark damage taken with localStorage persistence

document.addEventListener('DOMContentLoaded', function() {
  const circles = document.querySelectorAll('.hp-circle');
  
  // Load saved HP circle states from localStorage
  const savedStates = localStorage.getItem('hpCircleStates');
  if (savedStates) {
    const states = JSON.parse(savedStates);
    circles.forEach((circle, index) => {
      if (states[index]) {
        circle.classList.add('filled');
      }
    });
  }
  
  // Add click handlers for interactive HP circles
  circles.forEach((circle, index) => {
    circle.addEventListener('click', function(e) {
      e.preventDefault();
      this.classList.toggle('filled');
      // Save state to localStorage
      const allStates = Array.from(circles).map(c => c.classList.contains('filled'));
      localStorage.setItem('hpCircleStates', JSON.stringify(allStates));
    });
  });
});
