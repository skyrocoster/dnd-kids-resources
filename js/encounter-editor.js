// Encounter Editor JS
// Handles sidebar list/search, encounter detail, and editing logic

document.addEventListener('DOMContentLoaded', async function() {
  const { apiFetch } = window.ApiHelpers || {};
  const { escapeHtml } = window.DomUtils || {};
  const searchInput = document.getElementById('search-encounter-input');
  const encounterListEl = document.getElementById('encounter-list');
  const encounterCount = document.getElementById('encounter-count');
  const encounterTitleHeader = document.getElementById('encounter-title-header');
  const newEncounterBtn = document.getElementById('new-encounter-btn');

  let encounters = [];
  let selectedEncounterId = null;
  let suppressInputChange = false;

  // Setup add-monster autocomplete controls inside the encounter detail form
  function setupAddMonsterControls() {
    document.querySelectorAll('.add-monster-control').forEach(control => {
      const input = control.querySelector('#add-monster-input');
      const btn = control.querySelector('#add-monster-btn');
      if (!input || !btn || input._initDone) return;
      input._initDone = true;
      let timer = null;
      let selected = null;
      const suggestionBox = document.createElement('div');
      suggestionBox.className = 'suggestions-box';
      suggestionBox.style.position = 'absolute';
      suggestionBox.style.zIndex = '1000';
      suggestionBox.style.left = '0';
      suggestionBox.style.right = '0';
      suggestionBox.style.background = '#fff';
      suggestionBox.style.border = '1px solid #ccc';
      suggestionBox.style.maxHeight = '200px';
      suggestionBox.style.overflow = 'auto';
      control.style.position = 'relative';
      control.appendChild(suggestionBox);

      input.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
          const q = input.value.trim();
          selected = null;
          suggestionBox.innerHTML = '';
          if (!q) return;
          try {
            const resp = await fetch('/api/monsters?q=' + encodeURIComponent(q) + '&page=1&per_page=8');
            if (!resp.ok) return;
            const data = await resp.json();
            if (!Array.isArray(data) || data.length === 0) {
              suggestionBox.innerHTML = '<div class="suggestion-item" style="padding:6px;">No matches</div>';
              return;
            }
            data.forEach(m => {
              const it = document.createElement('div');
              it.className = 'suggestion-item';
              it.style.padding = '6px';
              it.style.cursor = 'pointer';
              it.textContent = m.title || m.name || '';
              it.addEventListener('click', () => {
                input.value = it.textContent;
                selected = m;
                suggestionBox.innerHTML = '';
              });
              suggestionBox.appendChild(it);
            });
          } catch (e) {
            // ignore network errors for autocomplete
          }
        }, 250);
      });

      document.addEventListener('click', (ev) => {
        if (!control.contains(ev.target)) {
          suggestionBox.innerHTML = '';
        }
      });

      btn.addEventListener('click', async () => {
        const name = input.value.trim();
        if (!name) { alert('Please choose a monster to add'); return; }
        let monster = selected;
        if (!monster) {
          try {
            const resp = await fetch('/api/monsters?q=' + encodeURIComponent(name) + '&page=1&per_page=1');
            if (resp.ok) { const arr = await resp.json(); if (Array.isArray(arr) && arr.length) monster = arr[0]; }
          } catch (e) {}
        }
        if (!monster) { alert('No matching monster found. Please pick from suggestions.'); return; }
        if (!selectedEncounterId) { alert('Please select or create an encounter first.'); return; }
        const enc = encounters.find(e => e.id == selectedEncounterId);
        if (!enc) { alert('Selected encounter not found.'); return; }
        enc.units = enc.units || [];
        enc.units.push({ monster_id: monster.id, name: monster.title || monster.name || 'Monster', count: 1 });
        // Persist changes
        try {
          const url = `/api/encounters/${selectedEncounterId}`;
          const resp = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: enc.name, units: enc.units }) });
          if (resp.ok) {
            const saved = await resp.json();
            const idx = encounters.findIndex(e => e.id == saved.id);
            if (idx >= 0) encounters[idx] = saved; else encounters.push(saved);
            // Re-render detail pane
            selectEncounter(saved.id);
          } else {
            const txt = await resp.text();
            alert('Failed to save encounter: ' + (txt || resp.statusText));
          }
        } catch (err) {
          alert('Error saving encounter: ' + err.message);
        }
      });

    });
  }

  // Observe detail shell and wire controls when form is rendered
  (function(){
    const detailShellEl = document.getElementById('encounter-detail-shell');
    if (detailShellEl) {
      const observer = new MutationObserver(() => { setupAddMonsterControls(); });
      observer.observe(detailShellEl, { childList: true, subtree: true });
    }
  })();

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
      const resp = await fetch('/api/encounters');
      encounters = await resp.json();
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
            <div class="add-monster-control" style="display:flex; gap:8px; align-items:center; margin-bottom:8px;">
              <input id="add-monster-input" type="search" placeholder="Add monster..." autocomplete="off" style="flex:1; padding:6px;" />
              <button type="button" id="add-monster-btn" class="btn">Add</button>
            </div>
            <div id="units-list">
              ${(encounter.units || []).map((unit, idx) => `
                <div class="field-row" data-unit-idx="${idx}">
                  <input type="text" name="unit-name-${idx}" value="${escapeHtml(unit.name || '')}" placeholder="Unit Name" class="field-value" style="width:120px;" />
                  <input type="number" name="unit-hp-${idx}" value="${unit.hp_current ?? unit.hp_max ?? ''}" placeholder="HP" class="field-value" style="width:60px;" min="0" />
                  <input type="number" name="unit-ac-${idx}" value="${unit.ac ?? ''}" placeholder="AC" class="field-value" style="width:50px;" min="0" />
                  <input type="text" name="unit-status-${idx}" value="${escapeHtml(unit.status || '')}" placeholder="Status" class="field-value" style="width:80px;" />
                  <input type="text" name="unit-conditions-${idx}" value="${escapeHtml((unit.conditions||[]).join(', '))}" placeholder="Conditions" class="field-value" style="width:120px;" />
                  <button type="button" class="btn remove-unit-btn" data-remove-unit="${idx}">Remove</button>
                </div>
              `).join('')}
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
          <input type="text" name="unit-name-${idx}" placeholder="Unit Name" class="field-value" style="width:120px;" />
          <input type="number" name="unit-hp-${idx}" placeholder="HP" class="field-value" style="width:60px;" min="0" />
          <input type="number" name="unit-ac-${idx}" placeholder="AC" class="field-value" style="width:50px;" min="0" />
          <input type="text" name="unit-status-${idx}" placeholder="Status" class="field-value" style="width:80px;" />
          <input type="text" name="unit-conditions-${idx}" placeholder="Conditions" class="field-value" style="width:120px;" />
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
          const unitName = form.querySelector(`[name="unit-name-${idx}"]`)?.value?.trim();
          const hp = form.querySelector(`[name="unit-hp-${idx}"]`)?.value;
          const ac = form.querySelector(`[name="unit-ac-${idx}"]`)?.value;
          const status = form.querySelector(`[name="unit-status-${idx}"]`)?.value?.trim() || 'alive';
          const conditions = form.querySelector(`[name="unit-conditions-${idx}"]`)?.value?.trim()?.split(',').map(c => c.trim()).filter(c => c) || [];
          if (unitName) {
            units.push({
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
          const url = selectedEncounterId ? `/api/encounters/${selectedEncounterId}` : '/api/encounters';
          const method = selectedEncounterId ? 'PUT' : 'POST';
          const resp = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (resp.ok) {
            const saved = await resp.json();
            selectedEncounterId = saved.id;
            alert('Encounter saved successfully!');
            loadEncounters();
            selectEncounter(saved.id);
          } else {
            alert('Error saving encounter');
          }
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
            <div class="add-monster-control" style="display:flex; gap:8px; align-items:center; margin-bottom:8px;">
              <input id="add-monster-input" type="search" placeholder="Add monster..." autocomplete="off" style="flex:1; padding:6px;" />
              <button type="button" id="add-monster-btn" class="btn">Add</button>
            </div>
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
          <input type="text" name="unit-name-${idx}" placeholder="Unit Name" class="field-value" style="width:120px;" />
          <input type="number" name="unit-hp-${idx}" placeholder="HP" class="field-value" style="width:60px;" min="0" />
          <input type="number" name="unit-ac-${idx}" placeholder="AC" class="field-value" style="width:50px;" min="0" />
          <input type="text" name="unit-status-${idx}" placeholder="Status" class="field-value" style="width:80px;" />
          <input type="text" name="unit-conditions-${idx}" placeholder="Conditions" class="field-value" style="width:120px;" />
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
          const unitName = form.querySelector(`[name="unit-name-${idx}"]`)?.value?.trim();
          const hp = form.querySelector(`[name="unit-hp-${idx}"]`)?.value;
          const ac = form.querySelector(`[name="unit-ac-${idx}"]`)?.value;
          const status = form.querySelector(`[name="unit-status-${idx}"]`)?.value?.trim() || 'alive';
          const conditions = form.querySelector(`[name="unit-conditions-${idx}"]`)?.value?.trim()?.split(',').map(c => c.trim()).filter(c => c) || [];
          if (unitName) {
            units.push({
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
          const url = selectedEncounterId ? `/api/encounters/${selectedEncounterId}` : '/api/encounters';
          const method = selectedEncounterId ? 'PUT' : 'POST';
          const resp = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (resp.ok) {
            const saved = await resp.json();
            selectedEncounterId = saved.id;
            alert('Encounter saved successfully!');
            loadEncounters();
            selectEncounter(saved.id);
          } else {
            alert('Error saving encounter');
          }
        } catch (error) {
          alert('Error saving encounter: ' + error.message);
        }
      });
    }
  });

  loadEncounters();

  // --- Monster browser functionality ---
  let monsters = [];
  let monsterFiltered = [];
  const monsterSearchInput = document.getElementById('monster-search-input');
  const monsterBrowser = document.getElementById('monster-browser');
  const monsterCountEl = document.getElementById('monster-count');
  const monsterPrevBtn = document.getElementById('monster-prev-btn');
  const monsterNextBtn = document.getElementById('monster-next-btn');
  const monsterPageInfo = document.getElementById('monster-page-info');
  let monsterPage = 1;
  const monsterPageSize = 8;
  let monsterSearchTimer = null;

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

  function renderMonsterListPage() {
    if (!monsterBrowser) return;
    monsterBrowser.innerHTML = '';
    const start = (monsterPage - 1) * monsterPageSize;
    const pageItems = monsterFiltered.slice(start, start + monsterPageSize);
    if (!pageItems.length) {
      monsterBrowser.innerHTML = '<div class="monster-detail-placeholder">No monsters found.</div>';
      if (monsterCountEl) monsterCountEl.textContent = '0 monsters';
      if (monsterPageInfo) monsterPageInfo.textContent = '';
      return;
    }
    pageItems.forEach(monster => {
      const title = monster.title || monster.name || monster.title_display || '';
      // Extract simple hp/ac/cr
      const hpText = extractStatFromDetails(monster.details, 'HP:') || monster.stats_line || '';
      const acText = extractStatFromDetails(monster.details, 'AC:') || '';
      const crText = (monster.cr || extractStatFromDetails(monster.details, 'CR:')) || '';

      const item = document.createElement('div');
      item.className = 'monster-list-item';
      item.setAttribute('role','listitem');
      item.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <div style="flex:1; min-width:0;">
            <div class="monster-list-item-title" title="${title}">${title}</div>
            <div class="monster-list-item-subtitle">CR: ${crText} &nbsp; • &nbsp; AC: ${acText} &nbsp; • &nbsp; HP: ${hpText}</div>
          </div>
          <div style="flex:0 0 auto; margin-left:8px;">
            <button type="button" class="btn add-monster-btn" data-monster-id="${monster.id}" aria-label="Add ${title} to encounter">Add</button>
          </div>
        </div>
      `;
      // Hook add button
      const addBtn = item.querySelector('.add-monster-btn');
      if (addBtn) addBtn.addEventListener('click', () => { handleAddMonster(monster); });
      monsterBrowser.appendChild(item);
    });

    const totalPages = Math.max(1, Math.ceil(monsterFiltered.length / monsterPageSize));
    if (monsterPageInfo) monsterPageInfo.textContent = `Page ${monsterPage} of ${totalPages}`;
    if (monsterCountEl) monsterCountEl.textContent = `${monsterFiltered.length} monster${monsterFiltered.length === 1 ? '' : 's'}`;
    if (monsterPrevBtn) monsterPrevBtn.disabled = monsterPage <= 1;
    if (monsterNextBtn) monsterNextBtn.disabled = monsterPage >= totalPages;
  }

  function filterMonsters(query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return monsters.slice();
    return monsters.filter(m => {
      const title = (m.title || m.name || '').toString().toLowerCase();
      const cr = (m.cr || '').toString().toLowerCase();
      const dets = JSON.stringify(m.details || []).toLowerCase();
      return title.includes(q) || cr.includes(q) || dets.includes(q);
    });
  }

  async function loadMonsters() {
    try {
      const resp = await fetch('/api/monsters');
      if (!resp.ok) throw new Error('Network error');
      const data = await resp.json();
      monsters = Array.isArray(data) ? data : [];
      monsterFiltered = monsters.slice();
      monsterPage = 1;
      renderMonsterListPage();
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
    // Build unit object
    const hpText = extractStatFromDetails(monster.details, 'HP:') || monster.stats_line || '';
    const acText = extractStatFromDetails(monster.details, 'AC:') || '';
    const hpVal = parseNumberFromLabel(hpText) || null;
    const acVal = parseNumberFromLabel(acText) || null;
    const unit = {
      monster_id: monster.id,
      name: monster.title || monster.name || 'Monster',
      hp_max: hpVal,
      hp_current: hpVal,
      ac: acVal,
      status: 'alive',
      conditions: []
    };
    // Update in-memory encounter
    const enc = encounters.find(e => e.id == selectedEncounterId);
    if (!enc) {
      alert('Selected encounter not found in memory.');
      return;
    }
    enc.units = enc.units || [];
    enc.units.push(unit);
    // Update UI: append to units-list if present
    const unitsList = document.getElementById('units-list');
    if (unitsList) {
      const idx = unitsList.children.length;
      const div = document.createElement('div');
      div.className = 'field-row';
      div.dataset.unitIdx = idx;
      div.innerHTML = `
        <input type="text" name="unit-name-${idx}" value="${unit.name}" placeholder="Unit Name" class="field-value" style="width:120px;" />
        <input type="number" name="unit-hp-${idx}" value="${unit.hp_current ?? ''}" placeholder="HP" class="field-value" style="width:60px;" min="0" />
        <input type="number" name="unit-ac-${idx}" value="${unit.ac ?? ''}" placeholder="AC" class="field-value" style="width:50px;" min="0" />
        <input type="text" name="unit-status-${idx}" value="${unit.status}" placeholder="Status" class="field-value" style="width:80px;" />
        <input type="text" name="unit-conditions-${idx}" value="" placeholder="Conditions" class="field-value" style="width:120px;" />
        <button type="button" class="btn remove-unit-btn" data-remove-unit="${idx}">Remove</button>
      `;
      unitsList.appendChild(div);
    }
  }

  // Pagination handlers
  if (monsterPrevBtn) monsterPrevBtn.addEventListener('click', () => {
    if (monsterPage > 1) {
      monsterPage -= 1;
      renderMonsterListPage();
    }
  });
  if (monsterNextBtn) monsterNextBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(monsterFiltered.length / monsterPageSize) || 1;
    if (monsterPage < totalPages) {
      monsterPage += 1;
      renderMonsterListPage();
    }
  });

  // Debounced search input
  if (monsterSearchInput) {
    monsterSearchInput.addEventListener('input', (e) => {
      clearTimeout(monsterSearchTimer);
      monsterSearchTimer = setTimeout(() => {
        const q = monsterSearchInput.value || '';
        monsterFiltered = filterMonsters(q);
        monsterPage = 1;
        renderMonsterListPage();
      }, 300);
    });
  }

  // Load monsters initially
  loadMonsters();
});
