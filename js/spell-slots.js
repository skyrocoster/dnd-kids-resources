// Spell Slots Tracker - JavaScript Initializer
document.addEventListener('DOMContentLoaded', async function() {
  const circles = document.querySelectorAll('.spell-circle');
  
  // ─── Global data persistence ───
  const STORAGE_KEY = 'spellSlotsData';
  
  function loadSpellSlotsData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  }
  
  function saveSpellSlotsData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
  
  let spellSlotsData = loadSpellSlotsData();
  
  // ─── Fetch ability colors from database ───
  let abilitiesMap = {};
  try {
    const abilities = await ApiHelpers.ApiService.getAbilities();
    // Create a map of ability codes to their data
    abilities.forEach(ability => {
      abilitiesMap[ability.code] = ability;
    });
    console.log('Loaded abilities from database:', abilitiesMap);
    
    // Apply colors to spell level rows
    applySpellSlotColors();
  } catch (error) {
    console.error('Error fetching abilities:', error);
  }
  
  // ─── Apply colors to spell level rows ───
  function applySpellSlotColors() {
    const rows = document.querySelectorAll('.spell-level-row');
    rows.forEach((row, index) => {
      const levelNum = index + 1;
      const code = `spell_level_${levelNum}`;
      
      if (abilitiesMap[code]) {
        const ability = abilitiesMap[code];
        const color = ability.color;
        
        // Apply border color
        row.style.borderLeftColor = color;
        
        // Update background with transparent version of the color
        const rgb = hexToRgb(color);
        if (rgb) {
          row.style.backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`;
        }
      }
    });
  }
  
  // ─── Helper function to convert hex to RGB ───
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
  
  // ─── Setup editable slots-per-day fields ───
  function setupEditableSlotsPerDay() {
    const slotsPerDayBoxes = document.querySelectorAll('.slots-per-day');
    
    slotsPerDayBoxes.forEach(box => {
      const fieldName = box.dataset.field;
      const row = box.closest('.spell-level-row');
      const circlesContainer = row.querySelector('.spell-circles');
      
      box.setAttribute('contenteditable', 'true');
      box.classList.add('editable');
      
      // Load saved value (leave empty if not saved)
      if (spellSlotsData[fieldName]) {
        box.textContent = spellSlotsData[fieldName];
      }
      
      // Update circles when loading (default to 4 if empty)
      updateCirclesForRow(box, circlesContainer);
      
      // Prevent rich text formatting
      box.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text/plain');
        document.execCommand('insertText', false, text);
      });
      
      // Save on blur and update circles
      box.addEventListener('blur', () => {
        const value = box.textContent.trim();
        if (value) {
          spellSlotsData[fieldName] = value;
        } else {
          delete spellSlotsData[fieldName];
        }
        saveSpellSlotsData(spellSlotsData);
        updateCirclesForRow(box, circlesContainer);
      });
      
      // Update circles on input
      box.addEventListener('input', () => {
        updateCirclesForRow(box, circlesContainer);
      });
      
      // Handle Enter/Escape
      box.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          box.blur();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          box.textContent = spellSlotsData[fieldName] || '';
          updateCirclesForRow(box, circlesContainer);
          box.blur();
        }
      });
    });
  }
  
  // ─── Update circles based on slots-per-day value ───
  function updateCirclesForRow(box, circlesContainer) {
    const text = box.textContent.trim();
    const value = text ? parseInt(text) : 4; // Default to 4 if empty
    
    if (value <= 0) {
      circlesContainer.innerHTML = '';
      return;
    }
    
    // Get current number of circles
    const currentCircles = circlesContainer.querySelectorAll('.spell-circle').length;
    
    // Add or remove circles as needed
    if (value > currentCircles) {
      // Add circles
      for (let i = currentCircles; i < value; i++) {
        const newCircle = document.createElement('div');
        newCircle.classList.add('spell-circle');
        circlesContainer.appendChild(newCircle);
        attachCircleListener(newCircle);
      }
    } else if (value < currentCircles) {
      // Remove circles from the end
      const circlesToRemove = currentCircles - value;
      for (let i = 0; i < circlesToRemove; i++) {
        const circles = circlesContainer.querySelectorAll('.spell-circle');
        if (circles.length > 0) {
          circles[circles.length - 1].remove();
        }
      }
    }
  }
  
  // ─── Attach click listeners to a circle ───
  function attachCircleListener(circle) {
    circle.addEventListener('click', function(e) {
      e.preventDefault();
      const isColored = this.dataset.colored === 'true';
      if (isColored) {
        this.style.background = 'white';
        this.dataset.colored = 'false';
      } else {
        this.style.background = 'var(--purple)';
        this.dataset.colored = 'true';
      }
      const allCircles = document.querySelectorAll('.spell-circle');
      const allStates = Array.from(allCircles).map(c => c.dataset.colored === 'true');
      localStorage.setItem('spellCircleStates', JSON.stringify(allStates));
    });
  }
  
  setupEditableSlotsPerDay();
  
  // ─── Spell circles (toggle on/off when clicked) ───
  const savedStates = localStorage.getItem('spellCircleStates');
  if (savedStates) {
    const states = JSON.parse(savedStates);
    const allCircles = document.querySelectorAll('.spell-circle');
    allCircles.forEach((circle, index) => {
      if (states[index]) {
        circle.style.background = 'var(--purple)';
        circle.dataset.colored = 'true';
      }
    });
  }
  
  const initialCircles = document.querySelectorAll('.spell-circle');
  initialCircles.forEach(circle => {
    attachCircleListener(circle);
  });
  
  // Keyboard shortcut for printing
  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      window.print();
    }
  });
});
