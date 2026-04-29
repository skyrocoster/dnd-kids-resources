// Encounter Editor JS
// Handles sidebar list/search, encounter detail, and editing logic

document.addEventListener('DOMContentLoaded', async function() {
  const { apiFetch, API_BASE } = window.ApiHelpers || {};
  const { escapeHtml } = window.DomUtils || {};
  const searchInput = document.getElementById('search-encounter-input');
  const encounterListEl = document.getElementById('encounter-list');
  const encounterCount = document.getElementById('encounter-count');
  const encounterTitleHeader = document.getElementById('encounter-title-header');
  const newEncounterBtn = document.getElementById('new-encounter-btn');

  let encounters = [];
  let selectedEncounterId = null;
  let suppressInputChange = false;

  function extractMonsterResults(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    return [];
  }

  function renderEncounterList(items) {
    encounterListEl.innerHTML = '';
    if (!items.length) {
      encounterListEl.innerHTML = '<div class="monster-detail-placeholder">No encounters found.</div>';
      return;
    }
    items.forEach(encounter => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'monster-list-item';
      item.dataset.id = encounter.id;
      item.innerHTML = `
        <div class="monster-list-item-title">${escapeHtml(encounter.name)}</div>
        <div class="monster-list-item-subtitle">${encounter.units.length} units</div>
      `;
      item.addEventListener('click', () => selectEncounter(encounter.id, true));
      encounterListEl.appendChild(item);
    });
  }

  function updateEncounterCount(count, fallback) {
    if (typeof count === 'number' && count > 0) {
      encounterCount.textContent = `${count} encounter${count === 1 ? '' : 's'} available`;
    } else {
      encounterCount.textContent = fallback || 'Type an encounter name to begin.';
    }
  }

  function filterEncounters(term) {
    const lower = term.trim().toLowerCase();
    if (!lower) return encounters;
    return encounters.filter(encounter => encounter.name.toLowerCase().includes(lower));
  }

  searchInput.addEventListener('input', () => {
    if (suppressInputChange) {
      suppressInputChange = false;
      return;
    }
    const query = searchInput.value.trim();
    if (!query) {
      encounterListEl.innerHTML = '';
      updateEncounterCount(0, 'Type an encounter name to begin.');
      encounterTitleHeader.textContent = 'Select or create an encounter';
      selectedEncounterId = null;
      return;
    }
    const filtered = filterEncounters(query);
    renderEncounterList(filtered);
    updateEncounterCount(filtered.length);
    if (!filtered.find(encounter => encounter.id === selectedEncounterId)) {
      if (filtered.length) {
        selectEncounter(filtered[0].id);
      }
    }
  });

  async function loadEncounters() {
    try {
      encounters = await ApiHelpers.ApiService.getEncounters(); // Uses API_BASE + /encounters
      encounters.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }));
      renderEncounterList(encounters);
      updateEncounterCount(encounters.length);
    } catch (error) {
      encounterListEl.innerHTML = '<div class="monster-detail-placeholder">Could not load encounters.</div>';
      encounterCount.textContent = 'Error loading encounters';
    }
  }

  function selectEncounter(id, clearSearch = false) {
    selectedEncounterId = id;
    const items = Array.from(encounterListEl.children);
    items.forEach(item => item.classList.toggle('selected', item.dataset.id == id));
    // Load encounter detail in main panel
    const encounter = encounters.find(e => e.id == id);
    encounterTitleHeader.textContent = encounter?.name || 'Encounter';
    const detailShell = document.getElementById('encounter-detail-shell');
    if (!encounter) {
      detailShell.innerHTML = '<div class="monster-detail-placeholder">Encounter not found.</div>';
      return;
    }
    detailShell.innerHTML = `
      <form id="encounter-detail-form" class="detail-shell">
        <div class="detail-header">
          <div class="detail-title-group">
            <label for="encounter-name" class="detail-label">Encounter Name</label>
            <input id="encounter-name" name="name" type="text" value="${escapeHtml(encounter.name)}" class="detail-title" style="font-size:1.5rem; width:100%;" required />
          </div>
        </div>
        <div class="detail-grid">
          <div class="detail-panel">
            <h2>Units</h2>
            <div id="units-list">
              ${(encounter.units || []).map((unit, idx) => {
                const origName = escapeHtml(unit.original_name || unit.name || '');
                const custName = escapeHtml(unit.name || '');
                return `
                <div class="field-row" data-unit-idx="${idx}" data-monster-id="${unit.monster_id || ''}">
                  <span class="unit-original-name" style="display:inline-flex; align-items:center; background:#f0f0f0; border:1px solid #ccc; border-radius:4px; padding:4px 6px; font-weight:700; white-space:nowrap;" title="Original monster name">${origName}</span>
                  <input type="hidden" name="unit-original-name-${idx}" value="${origName}" />
                  <input type="text" name="unit-name-${idx}" value="${custName}" placeholder="Custom name" class="field-input" style="width:110px;" />
                  <input type="number" name="unit-hp-${idx}" value="${unit.hp_current ?? unit.hp_max ?? ''}" placeholder="HP" class="field-input" style="width:60px;" min="0" />
                  <input type="number" name="unit-ac-${idx}" value="${unit.ac ?? ''}" placeholder="AC" class="field-input" style="width:50px;" min="0" />
                  <input type="text" name="unit-status-${idx}" value="${escapeHtml(unit.status || '')}" placeholder="Status" class="field-input" style="width:80px;" />
                  <input type="text" name="unit-conditions-${idx}" value="${escapeHtml((unit.conditions||[]).join(', '))}" placeholder="Conditions" class="field-input" style="width:120px;" />
                  <button type="button" class="btn remove-unit-btn" data-remove-unit="${idx}">Remove</button>
                </div>`;
              }).join('')}
            </div>
            <button type="button" id="add-unit-btn" class="btn">+ Add Unit</button>
          </div>
        </div>
        <div class="npc-detail-actions" style="margin-top:18px; gap:12px; display:flex;">
          <button type="submit" class="btn" style="background:#4a90e2;">Save Encounter</button>
        </div>
      </form>
    `;
    // Add event listeners for add/remove/save
    const unitsList = document.getElementById('units-list');
    const addUnitBtn = document.getElementById('add-unit-btn');
    const form = document.getElementById('encounter-detail-form');
    if (addUnitBtn && unitsList) {
      addUnitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const idx = unitsList.children.length;
        const div = document.createElement('div');
        div.className = 'field-row';
        div.dataset.unitIdx = idx;
        div.innerHTML = `
          <input type="text" name="unit-name-${idx}" placeholder="Unit Name" class="field-input field-input--name" />
          <input type="number" name="unit-hp-${idx}" placeholder="HP" class="field-input field-input--hp" min="0" />
          <input type="number" name="unit-ac-${idx}" placeholder="AC" class="field-input field-input--ac" min="0" />
          <input type="text" name="unit-status-${idx}" placeholder="Status" class="field-input field-input--status" />
          <input type="text" name="unit-conditions-${idx}" placeholder="Conditions" class="field-input field-input--conditions" />
          <button type="button" class="btn remove-unit-btn" data-remove-unit="${idx}">Remove</button>
        `;
        unitsList.appendChild(div);
      });
      unitsList.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-unit-btn')) {
          e.preventDefault();
          const row = e.target.closest('.field-row');
          if (row) row.remove();
        }
      });
    }
    // Add form submit handler for saving
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = form.querySelector('[name="name"]')?.value?.trim();
        if (!name) {
          alert('Please enter an encounter name');
          return;
        }
        const units = [];
        const rows = form.querySelectorAll('#units-list .field-row');
        rows.forEach((row, idx) => {
          const monsterId = row.dataset.monsterId ? parseInt(row.dataset.monsterId) : null;
          const unitName = form.querySelector(`[name="unit-name-${idx}"]`)?.value?.trim();
          const originalName = form.querySelector(`[name="unit-original-name-${idx}"]`)?.value?.trim() || null;
          const hp = form.querySelector(`[name="unit-hp-${idx}"]`)?.value;
          const ac = form.querySelector(`[name="unit-ac-${idx}"]`)?.value;
          const status = form.querySelector(`[name="unit-status-${idx}"]`)?.value?.trim() || 'alive';
          const conditions = form.querySelector(`[name="unit-conditions-${idx}"]`)?.value?.trim()?.split(',').map(c => c.trim()).filter(c => c) || [];
          if (unitName) {
            units.push({
              monster_id: monsterId,
              original_name: originalName,
              name: unitName,
              hp_current: hp ? parseInt(hp) : null,
              hp_max: hp ? parseInt(hp) : null,
              ac: ac ? parseInt(ac) : null,
              status: status,
              conditions: conditions
            });
          }
        });
        const payload = { name, units };
        try {
          let saved;
          if (selectedEncounterId) {
            saved = await ApiHelpers.ApiService.updateEncounter(selectedEncounterId, payload);
          } else {
            saved = await ApiHelpers.ApiService.createEncounter(payload);
          }
          selectedEncounterId = saved.id;
          alert('Encounter saved successfully!');
          loadEncounters();
          selectEncounter(saved.id);
        } catch (error) {
          alert('Error saving encounter: ' + error.message);
        }
      });
    }

  }

  newEncounterBtn.addEventListener('click', () => {
    // Show new encounter form in detail panel
    selectedEncounterId = null;
    encounterTitleHeader.textContent = 'New Encounter';
    const detailShell = document.getElementById('encounter-detail-shell');
    detailShell.innerHTML = `
      <form id="encounter-detail-form" class="detail-shell">
        <div class="detail-header">
          <div class="detail-title-group">
            <label for="encounter-name" class="detail-label">Encounter Name</label>
            <input id="encounter-name" name="name" type="text" value="" class="detail-title" style="font-size:1.5rem; width:100%;" required />
          </div>
        </div>
        <div class="detail-grid">
          <div class="detail-panel">
            <h2>Units</h2>
            <div id="units-list"></div>
            <button type="button" id="add-unit-btn" class="btn">+ Add Unit</button>
          </div>
        </div>
        <div class="npc-detail-actions" style="margin-top:18px; gap:12px; display:flex;">
          <button type="submit" class="btn" style="background:#4a90e2;">Save Encounter</button>
        </div>
      </form>
    `;
    // Add event listeners for add/remove/save
    const unitsList = document.getElementById('units-list');
    const addUnitBtn = document.getElementById('add-unit-btn');
    const form = document.getElementById('encounter-detail-form');
    if (addUnitBtn && unitsList) {
      addUnitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const idx = unitsList.children.length;
        const div = document.createElement('div');
        div.className = 'field-row';
        div.dataset.unitIdx = idx;
        div.innerHTML = `
          <input type="text" name="unit-name-${idx}" placeholder="Unit Name" class="field-input" style="width:120px;" />
          <input type="number" name="unit-hp-${idx}" placeholder="HP" class="field-input" style="width:60px;" min="0" />
          <input type="number" name="unit-ac-${idx}" placeholder="AC" class="field-input" style="width:50px;" min="0" />
          <input type="text" name="unit-status-${idx}" placeholder="Status" class="field-input" style="width:80px;" />
          <input type="text" name="unit-conditions-${idx}" placeholder="Conditions" class="field-input" style="width:120px;" />
          <button type="button" class="btn remove-unit-btn" data-remove-unit="${idx}">Remove</button>
        `;
        unitsList.appendChild(div);
      });
      unitsList.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-unit-btn')) {
          e.preventDefault();
          const row = e.target.closest('.field-row');
          if (row) row.remove();
        }
      });
    }
    // Add form submit handler for saving
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = form.querySelector('[name="name"]')?.value?.trim();
        if (!name) {
          alert('Please enter an encounter name');
          return;
        }
        const units = [];
        const rows = form.querySelectorAll('#units-list .field-row');
        rows.forEach((row, idx) => {
          const monsterId = row.dataset.monsterId ? parseInt(row.dataset.monsterId) : null;
          const unitName = form.querySelector(`[name="unit-name-${idx}"]`)?.value?.trim();
          const originalName = form.querySelector(`[name="unit-original-name-${idx}"]`)?.value?.trim() || null;
          const hp = form.querySelector(`[name="unit-hp-${idx}"]`)?.value;
          const ac = form.querySelector(`[name="unit-ac-${idx}"]`)?.value;
          const status = form.querySelector(`[name="unit-status-${idx}"]`)?.value?.trim() || 'alive';
          const conditions = form.querySelector(`[name="unit-conditions-${idx}"]`)?.value?.trim()?.split(',').map(c => c.trim()).filter(c => c) || [];
          if (unitName) {
            units.push({
              monster_id: monsterId,
              original_name: originalName,
              name: unitName,
              hp_current: hp ? parseInt(hp) : null,
              hp_max: hp ? parseInt(hp) : null,
              ac: ac ? parseInt(ac) : null,
              status: status,
              conditions: conditions
            });
          }
        });
        const payload = { name, units };
        try {
          let saved;
          if (selectedEncounterId) {
            saved = await ApiHelpers.ApiService.updateEncounter(selectedEncounterId, payload);
          } else {
            saved = await ApiHelpers.ApiService.createEncounter(payload);
          }
          selectedEncounterId = saved.id;
          alert('Encounter saved successfully!');
          loadEncounters();
          selectEncounter(saved.id);
        } catch (error) {
          alert('Error saving encounter: ' + error.message);
        }
      });
    }
  });

  loadEncounters();

  // --- Monster browser functionality ---
  const monsterSearchInput = document.getElementById('monster-search-input');
  const monsterBrowser = document.getElementById('monster-browser');
  const monsterCountEl = document.getElementById('monster-count');
  const monsterPrevBtn = document.getElementById('monster-prev-btn');
  const monsterNextBtn = document.getElementById('monster-next-btn');
  const monsterPageInfo = document.getElementById('monster-page-info');
  let monsterPage = 1;
  const monsterPageSize = 8;
  let monsterSearchTimer = null;
  let monsterTotal = 0;
  let monsterQuery = '';

  function extractStatFromDetails(details, label) {
    if (!Array.isArray(details)) return '';
    const entry = details.find(d => (d.label || '').toString().replace(/[:\s]/g,'').toLowerCase() === label.replace(/[:\s]/g,'').toLowerCase());
    if (!entry) return '';
    return (entry.content || '').toString();
  }

  function parseNumberFromLabel(text) {
    if (!text) return null;
    const m = String(text).match(/(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  }

  function renderMonsterListPage(items, page, totalPages) {
    if (!monsterBrowser) return;
    monsterBrowser.innerHTML = '';
    if (!items || !items.length) {
      monsterBrowser.innerHTML = '<div class="monster-detail-placeholder">No monsters found.</div>';
      if (monsterCountEl) monsterCountEl.textContent = '0 monsters';
      if (monsterPageInfo) monsterPageInfo.textContent = '';
      if (monsterPrevBtn) monsterPrevBtn.disabled = true;
      if (monsterNextBtn) monsterNextBtn.disabled = true;
      return;
    }
    items.forEach(monster => {
      const title = monster.title || monster.name || monster.title_display || '';
      const hpText = (monster.hp != null) ? monster.hp : (extractStatFromDetails(monster.details, 'HP:') || monster.stats_line || '');
      const acText = extractStatFromDetails(monster.details, 'AC:') || '';
      const crText = (monster.cr || extractStatFromDetails(monster.details, 'CR:')) || '';

      const item = document.createElement('div');
      item.className = 'monster-list-item';
      item.setAttribute('role', 'listitem');
      item.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <div style="flex:1; min-width:0;">
            <div class="monster-list-item-title" title="${title}">${title}</div>
            <div class="monster-list-item-subtitle">CR: ${crText} &nbsp; • &nbsp; AC: ${acText} &nbsp; • &nbsp; HP: ${hpText}</div>
          </div>
          <div style="flex:0 0 auto; margin-left:8px;">
            <button type="button" class="btn add-monster-btn" data-monster-id="${monster.id}" aria-label="Add ${title} to encounter" style="font-size:1.2rem; padding:2px 10px;">+</button>
          </div>
        </div>
      `;
      const addBtn = item.querySelector('.add-monster-btn');
      if (addBtn) addBtn.addEventListener('click', () => { handleAddMonster(monster); });
      monsterBrowser.appendChild(item);
    });

    if (monsterPageInfo) monsterPageInfo.textContent = `Page ${page} of ${totalPages}`;
    if (monsterCountEl) monsterCountEl.textContent = `${monsterTotal} monster${monsterTotal === 1 ? '' : 's'}`;
    if (monsterPrevBtn) monsterPrevBtn.disabled = page <= 1;
    if (monsterNextBtn) monsterNextBtn.disabled = page >= totalPages;
  }

  async function fetchMonsters(query, page) {
    try {
      const q = (query || '').trim();
      const data = await apiFetch(`/monsters?q=${encodeURIComponent(q)}&page=${page}&per_page=${monsterPageSize}`);
      const results = extractMonsterResults(data);
      monsterTotal = (data && data.total != null) ? data.total : results.length;
      monsterPage = page;
      monsterQuery = q;
      const totalPages = Math.max(1, Math.ceil(monsterTotal / monsterPageSize));
      renderMonsterListPage(results, page, totalPages);
    } catch (err) {
      if (monsterBrowser) monsterBrowser.innerHTML = '<div class="error-message">Could not load monsters.</div>';
      if (monsterCountEl) monsterCountEl.textContent = 'Error loading monsters';
    }
  }

  function handleAddMonster(monster) {
    if (!selectedEncounterId) {
      alert('Please select or create an encounter first.');
      return;
    }
    const hpVal = (typeof monster.hp === 'number') ? monster.hp : (parseNumberFromLabel(extractStatFromDetails(monster.details, 'HP:') || monster.stats_line || '') || null);
    const acVal = parseNumberFromLabel(extractStatFromDetails(monster.details, 'AC:') || '') || null;
    const unit = {
      monster_id: monster.id,
      original_name: monster.title || monster.name || 'Monster',
      name: monster.title || monster.name || 'Monster',
      hp_max: hpVal,
      hp_current: hpVal,
      ac: acVal,
      status: 'alive',
      conditions: []
    };
    const enc = encounters.find(e => e.id == selectedEncounterId);
    if (!enc) {
      alert('Selected encounter not found in memory.');
      return;
    }
    enc.units = enc.units || [];
    enc.units.push(unit);
    ApiHelpers.ApiService.updateEncounter(selectedEncounterId, { name: enc.name, units: enc.units }) // Uses API_BASE + /encounters
      .then(saved => {
        const idx = encounters.findIndex(e => e.id == saved.id);
        if (idx >= 0) encounters[idx] = saved; else encounters.push(saved);
        selectEncounter(saved.id);
      })
      .catch(err => {
        enc.units.pop();
        alert('Error adding monster: ' + err.message);
      });
  }

  // Pagination handlers
  if (monsterPrevBtn) monsterPrevBtn.addEventListener('click', () => {
    if (monsterPage > 1) fetchMonsters(monsterQuery, monsterPage - 1);
  });
  if (monsterNextBtn) monsterNextBtn.addEventListener('click', () => {
    const totalPages = Math.max(1, Math.ceil(monsterTotal / monsterPageSize));
    if (monsterPage < totalPages) fetchMonsters(monsterQuery, monsterPage + 1);
  });

  // Debounced search input
  if (monsterSearchInput) {
    monsterSearchInput.addEventListener('input', (e) => {
      clearTimeout(monsterSearchTimer);
      monsterSearchTimer = setTimeout(() => {
        fetchMonsters(monsterSearchInput.value || '', 1);
      }, 300);
    });
  }

  // Load monsters initially
  fetchMonsters('', 1); // Uses /api/monsters and API_BASE via apiFetch
});
