// Weapon management functions
function loadCustomWeapons() {
  try {
    const saved = localStorage.getItem('customWeapons');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.error('Error loading custom weapons:', e);
    return [];
  }
}

function saveCustomWeapons(weapons) {
  try {
    localStorage.setItem('customWeapons', JSON.stringify(weapons));
  } catch (e) {
    console.error('Error saving custom weapons:', e);
  }
}

function addCustomWeapon(weaponData) {
  const customWeapons = loadCustomWeapons();
  weaponData.removable = true;
  weaponData.id = Date.now() + Math.random(); // Unique ID for deletion
  customWeapons.push(weaponData);
  saveCustomWeapons(customWeapons);
  return weaponData;
}

function deleteCustomWeapon(weaponId) {
  let customWeapons = loadCustomWeapons();
  customWeapons = customWeapons.filter(w => w.id !== weaponId);
  saveCustomWeapons(customWeapons);
}

function renderWeapons(standardWeapons) {
  const customWeapons = loadCustomWeapons();
  const allWeapons = [...standardWeapons, ...customWeapons];
  
  // Render the cards
  renderPaginatedCards(
    '#page-container',
    allWeapons,
    9,
    'Weapons',
    'A complete guide to weapons and combat gear'
  );
  
  // Add delete buttons to custom weapons
  document.querySelectorAll('.card').forEach((card, index) => {
    if (index >= standardWeapons.length) {
      // This is a custom weapon
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-weapon-btn';
      deleteBtn.textContent = '✕ Delete';
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        const weaponId = allWeapons[index].id;
        deleteCustomWeapon(weaponId);
        location.reload();
      };
      card.appendChild(deleteBtn);
    }
  });
}

// Weapon cards initialization
document.addEventListener('DOMContentLoaded', async function() {
  try {
    // Try multiple fetch paths
    let response;
    const paths = [
      '../data/weapons.json',
      './data/weapons.json',
      'data/weapons.json'
    ];
    
    for (const path of paths) {
      try {
        response = await fetch(path);
        if (response.ok) {
          console.log(`✓ Loaded weapons from: ${path}`);
          break;
        }
      } catch (e) {
        // Try next path
      }
    }
    
    if (!response || !response.ok) {
      throw new Error(`Failed to load weapons.json. Status: ${response?.status || 'unknown'}`);
    }
    
    const standardWeapons = await response.json();
    
    // Render weapons with custom ones
    renderWeapons(standardWeapons);
    
    // Setup form handler
    const form = document.getElementById('add-weapon-form');
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const weaponData = {
          title: document.getElementById('weapon-title').value,
          icon: document.getElementById('weapon-icon').value || '⚔️',
          level: document.getElementById('weapon-level').value,
          type: document.getElementById('weapon-type').value,
          hands: document.getElementById('weapon-hands').value,
          explanation: document.getElementById('weapon-explanation').value,
          details: [
            { label: '🎲 Roll:', content: parseRollString(document.getElementById('weapon-roll').value) || document.getElementById('weapon-roll').value },
            { label: '💥 Damage:', content: parseRollString(document.getElementById('weapon-damage').value) || document.getElementById('weapon-damage').value },
            { label: '🎯 Range:', content: document.getElementById('weapon-range').value },
            { label: '✨ Effect:', content: document.getElementById('weapon-effect').value }
          ]
        };
        
        addCustomWeapon(weaponData);
        form.reset();
        location.reload();
      });
    }
  } catch (error) {
    console.error('Error loading weapons:', error);
    document.getElementById('page-container').innerHTML = `<p>${error.message}</p>`;
  }
});
