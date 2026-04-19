document.addEventListener('DOMContentLoaded', async function() {
  const playersListEl = document.getElementById('players-list');
  const playerCountEl = document.getElementById('player-count');
  const addPlayerBtn = document.getElementById('add-player-btn');
  const deletePlayerBtn = document.getElementById('delete-player-btn');
  const detailTitleEl = document.getElementById('detail-title');
  const detailFieldsEl = document.getElementById('player-detail-fields');
  const emptySelectionEl = document.getElementById('empty-selection');
  const playerNameInput = document.getElementById('player-name');
  const playerClassInput = document.getElementById('player-class');
  const playerLevelInput = document.getElementById('player-level');
  const assignedSpellsEl = document.getElementById('assigned-spells');
  const spellSearchInput = document.getElementById('spell-search');
  const spellSearchResultsEl = document.getElementById('spell-search-results');

  const API_BASE = '/api';
  let players = [];
  let spells = [];
  let selectedPlayer = null;
  let spellIndex = [];

  async function apiFetch(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, options);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.error || `API request failed: ${response.status}`);
    }
    return body;
  }

  function updatePlayerCount() {
    playerCountEl.textContent = `${players.length} player${players.length === 1 ? '' : 's'}`;
  }

  function getSelectedPlayer() {
    return selectedPlayer;
  }

  function renderPlayerList() {
    playersListEl.innerHTML = '';
    players.forEach(player => {
      const card = document.createElement('div');
      card.className = 'player-card';
      if (selectedPlayer && player.id === selectedPlayer.id) {
        card.classList.add('active');
      }
      card.dataset.playerId = player.id;
      card.addEventListener('click', async () => {
        await selectPlayer(player.id);
      });

      const left = document.createElement('div');
      const title = document.createElement('h2');
      title.textContent = player.name || 'Unnamed Player';
      const subtitle = document.createElement('p');
      subtitle.innerHTML = `${player.class || 'No class'} · Level ${player.level || '—'}<br><small>${player.spells?.length || 0} spell${(player.spells?.length || 0) === 1 ? '' : 's'} in book</small>`;
      left.appendChild(title);
      left.appendChild(subtitle);

      const actions = document.createElement('div');
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.textContent = 'Delete';
      removeBtn.addEventListener('click', async function(event) {
        event.stopPropagation();
        await deletePlayer(player.id);
      });
      actions.appendChild(removeBtn);

      card.appendChild(left);
      card.appendChild(actions);
      playersListEl.appendChild(card);
    });
    updatePlayerCount();
  }

  function renderPlayerDetail() {
    if (!selectedPlayer) {
      detailFieldsEl.hidden = true;
      emptySelectionEl.hidden = false;
      detailTitleEl.textContent = 'Select a player to edit';
      return;
    }

    detailFieldsEl.hidden = false;
    emptySelectionEl.hidden = true;
    detailTitleEl.textContent = `Editing ${selectedPlayer.name || 'Unnamed Player'}`;

    playerNameInput.value = selectedPlayer.name || '';
    playerClassInput.value = selectedPlayer.class || '';
    playerLevelInput.value = selectedPlayer.level || '';

    assignedSpellsEl.innerHTML = '';
    if (!selectedPlayer.spells || selectedPlayer.spells.length === 0) {
      const placeholder = document.createElement('div');
      placeholder.className = 'empty-state';
      placeholder.textContent = 'No spells assigned yet. Use the search below to add spells to this character.';
      assignedSpellsEl.appendChild(placeholder);
    } else {
      selectedPlayer.spells.forEach(spellId => {
        const spell = spells.find(item => Number(item.id) === Number(spellId));
        const row = document.createElement('div');
        row.className = 'assigned-spell';
        const title = document.createElement('div');
        title.innerHTML = `<span>${spell?.title || spellId}</span><small>${spell?.school || ''}</small>`;
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', async () => {
          await removeSpellFromPlayer(Number(spellId));
        });
        row.appendChild(title);
        row.appendChild(removeBtn);
        assignedSpellsEl.appendChild(row);
      });
    }

    renderSpellSlotGrid();
    renderSpellSearch();
  }

  function buildSpellResult(spell) {
    const row = document.createElement('div');
    row.className = 'spell-result';

    const title = document.createElement('div');
    title.innerHTML = `<strong>${spell.title}</strong><br><small>${spell.school || ''} · Level ${spell.level}</small>`;

    const owned = selectedPlayer?.spells?.some(id => Number(id) === Number(spell.id));
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.textContent = owned ? 'Added' : 'Add';
    addBtn.disabled = !!owned;
    addBtn.addEventListener('click', async () => {
      await addSpellToPlayer(Number(spell.id));
    });

    row.appendChild(title);
    row.appendChild(addBtn);
    return row;
  }

  function buildSpellIndex(items) {
    return items.map(spell => ({
      id: String(spell.id),
      title: spell.title || '',
      school: spell.school || '',
      level: spell.level !== undefined && spell.level !== null ? String(spell.level) : 'Unknown',
      text: `${spell.title || ''} ${spell.school || ''} ${String(spell.explanation || spell.details || spell.desc || '')}`.toLowerCase()
    }));
  }

  function getSpellSlotBlock(blockName) {
    if (!selectedPlayer || !selectedPlayer[blockName] || typeof selectedPlayer[blockName] !== 'object') {
      return {};
    }
    const normalized = {};
    for (let i = 1; i <= 9; i++) {
      const key = String(i);
      const value = selectedPlayer[blockName][key];
      normalized[key] = Number.isFinite(Number(value)) ? Number(value) : 0;
    }
    return normalized;
  }

  async function updateSpellSlotValue(level, blockType, rawValue) {
    if (!selectedPlayer) return;
    const slotKey = String(level);
    const currentBlock = getSpellSlotBlock(blockType === 'total' ? 'total_spell_slots' : 'current_spell_slots');
    const value = Number(rawValue);
    currentBlock[slotKey] = Number.isNaN(value) ? 0 : value;
    const payload = {};
    payload[blockType === 'total' ? 'total_spell_slots' : 'current_spell_slots'] = currentBlock;

    try {
      selectedPlayer = await apiFetch(`/players/${selectedPlayer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const index = players.findIndex(player => Number(player.id) === Number(selectedPlayer.id));
      if (index !== -1) {
        players[index] = selectedPlayer;
      }
      renderPlayerList();
      renderPlayerDetail();
    } catch (error) {
      console.error('Failed to update spell slots:', error);
    }
  }

  function renderSpellSlotGrid() {
    const grid = document.getElementById('spell-slot-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const totalSlots = getSpellSlotBlock('total_spell_slots');
    const currentSlots = getSpellSlotBlock('current_spell_slots');

    for (let level = 1; level <= 9; level++) {
      const row = document.createElement('div');
      row.className = 'slot-row';

      const label = document.createElement('div');
      label.className = 'slot-label';
      label.textContent = `Level ${level}`;

      const totalGroup = document.createElement('div');
      totalGroup.className = 'slot-input-group';
      totalGroup.innerHTML = `<label>Total Slots<input class="slot-input" type="number" min="0" data-slot-level="${level}" data-slot-block="total" value="${totalSlots[String(level)]}"></label>`;

      const currentGroup = document.createElement('div');
      currentGroup.className = 'slot-input-group';
      currentGroup.innerHTML = `<label>Current<input class="slot-input" type="number" min="0" data-slot-level="${level}" data-slot-block="current" value="${currentSlots[String(level)]}"></label>`;

      const totalInput = totalGroup.querySelector('input');
      const currentInput = currentGroup.querySelector('input');

      totalInput.addEventListener('change', () => updateSpellSlotValue(level, 'total', totalInput.value));
      currentInput.addEventListener('change', () => updateSpellSlotValue(level, 'current', currentInput.value));

      row.appendChild(label);
      row.appendChild(totalGroup);
      row.appendChild(currentGroup);
      grid.appendChild(row);
    }
  }

  function renderSpellSearch() {
    const query = String(spellSearchInput.value || '').trim().toLowerCase();
    const matches = spellIndex
      .filter(spell => spell.text.includes(query))
      .slice(0, 20);

    spellSearchResultsEl.innerHTML = '';
    if (matches.length === 0) {
      const noResult = document.createElement('div');
      noResult.className = 'empty-state';
      noResult.textContent = 'No spells match your search. Try a different keyword.';
      spellSearchResultsEl.appendChild(noResult);
      return;
    }

    matches.forEach(spell => {
      spellSearchResultsEl.appendChild(buildSpellResult(spell));
    });
  }

  async function fetchSpells() {
    try {
      spells = await apiFetch('/spells');
      spellIndex = buildSpellIndex(spells);
    } catch (error) {
      console.error('Failed to load spells:', error);
      spells = [];
      spellIndex = [];
    }
  }

  async function fetchPlayers() {
    try {
      players = await apiFetch('/players');
      if (players.length > 0 && !selectedPlayer) {
        await selectPlayer(players[0].id);
      }
    } catch (error) {
      console.error('Failed to load players:', error);
      players = [];
      selectedPlayer = null;
    }
    renderPlayerList();
    renderPlayerDetail();
  }

  async function selectPlayer(playerId) {
    try {
      selectedPlayer = await apiFetch(`/players/${playerId}`);
      renderPlayerList();
      renderPlayerDetail();
    } catch (error) {
      console.error('Failed to select player:', error);
      selectedPlayer = null;
      renderPlayerList();
      renderPlayerDetail();
    }
  }

  async function createPlayer() {
    try {
      const player = await apiFetch('/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Unnamed Player', class: '', level: null })
      });
      players.unshift(player);
      selectedPlayer = player;
      renderPlayerList();
      renderPlayerDetail();
    } catch (error) {
      console.error('Failed to create player:', error);
    }
  }

  async function updatePlayerField(field, value) {
    if (!selectedPlayer) return;
    try {
      const payload = { [field]: value };
      selectedPlayer = await apiFetch(`/players/${selectedPlayer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const index = players.findIndex(player => Number(player.id) === Number(selectedPlayer.id));
      if (index !== -1) {
        players[index] = selectedPlayer;
      }
      renderPlayerList();
      renderPlayerDetail();
    } catch (error) {
      console.error('Failed to update player:', error);
    }
  }

  async function deletePlayer(playerId) {
    try {
      await apiFetch(`/players/${playerId}`, { method: 'DELETE' });
      players = players.filter(player => Number(player.id) !== Number(playerId));
      if (selectedPlayer && Number(selectedPlayer.id) === Number(playerId)) {
        selectedPlayer = players[0] || null;
      }
      renderPlayerList();
      renderPlayerDetail();
    } catch (error) {
      console.error('Failed to delete player:', error);
    }
  }

  async function addSpellToPlayer(spellId) {
    if (!selectedPlayer) return;
    try {
      selectedPlayer = await apiFetch(`/players/${selectedPlayer.id}/spells`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spell_id: spellId })
      });
      const index = players.findIndex(player => Number(player.id) === Number(selectedPlayer.id));
      if (index !== -1) {
        players[index] = selectedPlayer;
      }
      renderPlayerList();
      renderPlayerDetail();
    } catch (error) {
      console.error('Failed to add spell to player:', error);
    }
  }

  async function removeSpellFromPlayer(spellId) {
    if (!selectedPlayer) return;
    try {
      await apiFetch(`/players/${selectedPlayer.id}/spells/${spellId}`, { method: 'DELETE' });
      selectedPlayer.spells = selectedPlayer.spells.filter(id => Number(id) !== Number(spellId));
      const index = players.findIndex(player => Number(player.id) === Number(selectedPlayer.id));
      if (index !== -1) {
        players[index] = selectedPlayer;
      }
      renderPlayerList();
      renderPlayerDetail();
    } catch (error) {
      console.error('Failed to remove spell from player:', error);
    }
  }

  addPlayerBtn.addEventListener('click', function() {
    createPlayer();
  });

  deletePlayerBtn.addEventListener('click', function() {
    if (!selectedPlayer) return;
    deletePlayer(selectedPlayer.id);
  });

  playerNameInput.addEventListener('input', function(event) {
    updatePlayerField('name', event.target.value);
  });

  playerClassInput.addEventListener('input', function(event) {
    updatePlayerField('class', event.target.value);
  });

  playerLevelInput.addEventListener('input', function(event) {
    updatePlayerField('level', event.target.value);
  });

  spellSearchInput.addEventListener('input', function() {
    renderSpellSearch();
  });

  await fetchSpells();
  await fetchPlayers();
});