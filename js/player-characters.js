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
  const assignedWeaponsEl = document.getElementById('assigned-weapons');
  const spellSearchInput = document.getElementById('spell-search');
  const spellSearchResultsEl = document.getElementById('spell-search-results');
  const weaponSearchInput = document.getElementById('weapon-search');
  const weaponSearchResultsEl = document.getElementById('weapon-search-results');
  const playerCreateActions = document.getElementById('player-create-actions');
  const playerEditView = document.getElementById('player-edit-view');
  const playerDetailsSection = document.getElementById('player-details-section');
  const playerSlotsSection = document.getElementById('player-slots-section');
  const toggleDetailsBtn = document.getElementById('toggle-details-btn');
  const toggleSlotsBtn = document.getElementById('toggle-slots-btn');
  const confirmPlayerBtn = document.getElementById('confirm-player-btn');
  const cancelCreateBtn = document.getElementById('cancel-create-btn');
  const spellCreateModal = document.getElementById('spell-create-modal');
  const spellCreateTitle = document.getElementById('spell-create-title');
  const spellCreateStatus = document.getElementById('spell-create-status');
  const spellCreateForm = document.getElementById('spell-create-form');
  const spellCreateClose = document.getElementById('spell-create-close');
  const spellCreateCancel = document.getElementById('spell-create-cancel');
  const spellCreateSave = document.getElementById('spell-create-save');
  const spellCreateName = document.getElementById('spell-create-name');
  const spellCreateIcon = document.getElementById('spell-create-icon');
  const spellCreateSchool = document.getElementById('spell-create-school');
  const spellCreateLevel = document.getElementById('spell-create-level');
  const spellCreateCastingTime = document.getElementById('spell-create-casting-time');
  const spellCreateDuration = document.getElementById('spell-create-duration');
  const spellCreateRange = document.getElementById('spell-create-range');
  const spellCreateAction = document.getElementById('spell-create-action');
  const spellCreateConcentration = document.getElementById('spell-create-concentration');
  const spellCreateRitual = document.getElementById('spell-create-ritual');
  const spellCreateComponents = document.getElementById('spell-create-components');
  const spellCreateMaterials = document.getElementById('spell-create-materials');
  const spellCreateClasses = document.getElementById('spell-create-classes');
  const spellCreateSubclasses = document.getElementById('spell-create-subclasses');
  const spellCreateAltText = document.getElementById('spell-create-alt-text');
  const spellCreateArea = document.getElementById('spell-create-area');
  const spellCreateAttack = document.getElementById('spell-create-attack');
  const spellCreateDamage = document.getElementById('spell-create-damage');
  const spellCreateHeal = document.getElementById('spell-create-heal');
  const spellCreateHealAtSpellSlots = document.getElementById('spell-create-heal-at-spell-slots');
  const spellCreateHigherLevels = document.getElementById('spell-create-higher-levels');
  const spellCreateDamageAtHigherLevels = document.getElementById('spell-create-damage-at-higher-levels');
  const spellCreateText = document.getElementById('spell-create-text');

  const mapPanel = document.getElementById('mapPanel');
  const playerSlotsWrapper = document.getElementById('player-slots-section')?.closest('.player-section');

  const { apiFetch } = ApiHelpers;
  let players = [];
  let spells = [];
  let weapons = [];
  let selectedPlayer = null;
  let spellIndex = [];
  let weaponIndex = [];
  let editMode = false;
  let editModeButton = null;

  const openNewSpellModal = () => {
    if (!spellCreateModal) return;
    spellCreateTitle.textContent = 'Add New Spell';
    setSpellCreateStatus('Create a new spell and save it to the database.', '');
    spellCreateForm?.reset();
    spellCreateModal.classList.add('visible');
    spellCreateModal.setAttribute('aria-hidden', 'false');
    if (spellCreateName) {
      spellCreateName.focus();
    }
  };

  if (window.PageBase && typeof window.PageBase.autoInitializeViewerPane === 'function') {
    window.PageBase.autoInitializeViewerPane('playerCharacters');
    window.PageBase.addToolButton('New Spell', 'addNewSpellBtn', openNewSpellModal);
    editModeButton = window.PageBase.addToolButton('Edit Mode', 'toggleEditModeBtn', () => {
      setEditMode(!editMode);
    });
    if (editModeButton) {
      setEditMode(false);
    }
  }

  function updatePlayerCount() {
    playerCountEl.textContent = `${players.length} player${players.length === 1 ? '' : 's'}`;
  }

  function getSelectedPlayer() {
    return selectedPlayer;
  }

  function setSectionState(section, button, expanded) {
    if (!section || !button) return;
    if (expanded) {
      section.classList.remove('collapsed');
      button.textContent = 'Hide';
    } else {
      section.classList.add('collapsed');
      button.textContent = 'Show';
    }
  }

  function toggleSection(section, button) {
    if (!section || !button) return;
    const expanded = section.classList.contains('collapsed');
    setSectionState(section, button, expanded);
  }

  function closeSpellCreateModal() {
    if (!spellCreateModal) return;
    spellCreateModal.classList.remove('visible');
    spellCreateModal.setAttribute('aria-hidden', 'true');
    setSpellCreateStatus('', '');
    if (spellCreateSave) {
      spellCreateSave.disabled = false;
    }
  }

  function setSpellCreateStatus(message, status) {
    if (!spellCreateStatus) return;
    spellCreateStatus.textContent = String(message);
    spellCreateStatus.classList.toggle('error', status === 'error');
    spellCreateStatus.classList.toggle('success', status === 'success');
  }

  async function saveNewSpell(event) {
    event.preventDefault();
    if (!spellCreateForm || !spellCreateSave) return;

    const name = spellCreateName?.value.trim() || '';
    if (!name) {
      setSpellCreateStatus('Spell name is required.', 'error');
      return;
    }

    const payload = {
      spell_name: name,
      icon: spellCreateIcon?.value.trim() || '✨',
      level: spellCreateLevel?.value || '0',
      school: spellCreateSchool?.value.trim() || '',
      spell_text: spellCreateText?.value.trim() || '',
      spell_alt_text: spellCreateAltText?.value.trim() || null,
      damage: spellCreateDamage?.value.trim() || null,
      heal: spellCreateHeal?.value.trim() || null,
      heal_at_spell_slots: spellCreateHealAtSpellSlots?.value.trim() || null,
      range: spellCreateRange?.value.trim() || '',
      higher_levels: spellCreateHigherLevels?.value.trim() || null,
      damage_at_higher_levels: spellCreateDamageAtHigherLevels?.value.trim() || null,
      casting_time: spellCreateCastingTime?.value.trim() || '',
      duration: spellCreateDuration?.value.trim() || '',
      concentration: spellCreateConcentration?.checked ? 1 : 0,
      ritual: spellCreateRitual?.checked ? 1 : 0,
      components: spellCreateComponents?.value.trim() || '',
      materials: spellCreateMaterials?.value.trim() || null,
      attack_type: spellCreateAttack?.value.trim() || null,
      action: spellCreateAction?.value.trim() || null,
      area_of_effect: spellCreateArea?.value.trim() || '',
      classes: spellCreateClasses?.value.trim() || null,
      subclasses: spellCreateSubclasses?.value.trim() || null
    };

    spellCreateSave.disabled = true;
    setSpellCreateStatus('Saving spell...', '');

    try {
      const newSpell = await apiFetch('/spells', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      spells.unshift(newSpell);
      spellIndex = buildSpellIndex(spells);
      renderSpellSearch();
      setSpellCreateStatus('Spell saved and available in search.', 'success');
      setTimeout(closeSpellCreateModal, 600);
    } catch (error) {
      setSpellCreateStatus(error.message || 'Failed to save spell.', 'error');
      spellCreateSave.disabled = false;
      console.error('Failed to save spell:', error);
    }
  }

  function setEditMode(enabled) {
    editMode = Boolean(enabled);
    if (editModeButton) {
      editModeButton.textContent = editMode ? 'View Mode' : 'Edit Mode';
      editModeButton.classList.toggle('active', editMode);
    }

    if (playerSlotsWrapper) {
      playerSlotsWrapper.hidden = !editMode;
    }

    updateEditControls();
  }

  function updateEditControls() {
    const playerFieldsEditable = selectedPlayer && (selectedPlayer.isNew || editMode);
    const slotEditable = selectedPlayer && editMode;
    const actionControlsEnabled = Boolean(selectedPlayer);

    if (playerNameInput) playerNameInput.disabled = !playerFieldsEditable;
    if (playerClassInput) playerClassInput.disabled = !playerFieldsEditable;
    if (playerLevelInput) playerLevelInput.disabled = !playerFieldsEditable;
    if (spellSearchInput) spellSearchInput.disabled = !actionControlsEnabled;
    if (weaponSearchInput) weaponSearchInput.disabled = !actionControlsEnabled;

    const slotInputs = document.querySelectorAll('#spell-slot-grid input');
    slotInputs.forEach(input => {
      input.disabled = !slotEditable;
    });

    const removeButtons = document.querySelectorAll('#assigned-spells button, #assigned-weapons button');
    removeButtons.forEach(button => {
      button.disabled = !actionControlsEnabled;
    });

    const addButtons = document.querySelectorAll('.spell-result button');
    addButtons.forEach(button => {
      button.disabled = !actionControlsEnabled || button.disabled;
    });
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
      subtitle.innerHTML = `${player.class || 'No class'} · Level ${player.level || '—'}<br><small>${player.spells?.length || 0} spell${(player.spells?.length || 0) === 1 ? '' : 's'} · ${player.weapons?.length || 0} weapon${(player.weapons?.length || 0) === 1 ? '' : 's'}</small>`;
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
      deletePlayerBtn.hidden = true;
      return;
    }

    detailFieldsEl.hidden = false;
    emptySelectionEl.hidden = true;
    playerNameInput.value = selectedPlayer.name || '';
    playerClassInput.value = selectedPlayer.class || '';
    playerLevelInput.value = selectedPlayer.level || '';

    if (selectedPlayer.isNew) {
      detailTitleEl.textContent = 'Create new player';
      playerCreateActions.hidden = false;
      playerEditView.hidden = true;
      deletePlayerBtn.hidden = true;
      updateEditControls();
      return;
    }

    detailTitleEl.textContent = `Editing ${selectedPlayer.name || 'Unnamed Player'}`;
    playerCreateActions.hidden = true;
    playerEditView.hidden = false;
    deletePlayerBtn.hidden = false;

    assignedSpellsEl.innerHTML = '';
    if (!selectedPlayer.spells || selectedPlayer.spells.length === 0) {
      const placeholder = document.createElement('div');
      placeholder.className = 'empty-state';
      placeholder.textContent = 'No spells assigned yet. Use the search below to add spells to this character.';
      assignedSpellsEl.appendChild(placeholder);
    } else {
      const assignments = selectedPlayer.spell_assignments || [];
      selectedPlayer.spells.forEach(spellId => {
        const spell = spells.find(item => Number(item.id) === Number(spellId));
        const assignment = assignments.find(a => Number(a.spell_id) === Number(spellId)) || { at_will: false };
        const row = document.createElement('div');
        row.className = 'assigned-spell';
        const title = document.createElement('div');

        if (spell && spell.title) {
          const link = createSpellLink(spell.title, spell.title);
          link.style.fontWeight = '700';
          title.appendChild(link);

          const subtitle = document.createElement('small');
          subtitle.textContent = spell.school || '';
          title.appendChild(subtitle);
        } else {
          title.innerHTML = `<span>${spellId}</span>`;
        }

        const controls = document.createElement('div');
        controls.style.display = 'flex';
        controls.style.flexDirection = 'column';
        controls.style.alignItems = 'flex-end';
        controls.style.gap = '6px';

        const atWillLabel = document.createElement('label');
        atWillLabel.style.display = 'flex';
        atWillLabel.style.alignItems = 'center';
        atWillLabel.style.gap = '6px';
        const atWillCheckbox = document.createElement('input');
        atWillCheckbox.type = 'checkbox';
        atWillCheckbox.checked = Boolean(assignment.at_will);
        atWillCheckbox.addEventListener('change', async () => {
          await setSpellAtWill(Number(spellId), atWillCheckbox.checked);
        });
        atWillLabel.appendChild(atWillCheckbox);
        atWillLabel.appendChild(document.createTextNode('At-Will'));
        controls.appendChild(atWillLabel);

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', async () => {
          await removeSpellFromPlayer(Number(spellId));
        });
        controls.appendChild(removeBtn);

        row.appendChild(title);
        row.appendChild(controls);
        assignedSpellsEl.appendChild(row);
      });
    }

    assignedWeaponsEl.innerHTML = '';
    if (!selectedPlayer.weapons || selectedPlayer.weapons.length === 0) {
      const placeholder = document.createElement('div');
      placeholder.className = 'empty-state';
      placeholder.textContent = 'No weapons assigned yet. Use the search below to add weapons to this character.';
      assignedWeaponsEl.appendChild(placeholder);
    } else {
      selectedPlayer.weapons.forEach(weaponId => {
        const weapon = weapons.find(item => Number(item.id) === Number(weaponId));
        const row = document.createElement('div');
        row.className = 'assigned-spell';
        const title = document.createElement('div');
        title.innerHTML = `<span>${weapon?.name || weapon?.title || weaponId}</span><small>${weapon?.weapon_category || weapon?.category || ''}</small>`;
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', async () => {
          await removeWeaponFromPlayer(Number(weaponId));
        });
        row.appendChild(title);
        row.appendChild(removeBtn);
        assignedWeaponsEl.appendChild(row);
      });
    }

    renderSpellSlotGrid();
    renderSpellSearch();
    renderWeaponSearch();
    updateEditControls();
  }

  function buildSpellResult(spell) {
    const row = document.createElement('div');
    row.className = 'spell-result';

    const title = document.createElement('div');
    const spellLink = createSpellLink(spell.title, spell.title);
    spellLink.style.fontWeight = '700';
    spellLink.style.display = 'inline-block';
    spellLink.style.marginBottom = '2px';
    title.appendChild(spellLink);

    const subtitle = document.createElement('small');
    subtitle.textContent = `${spell.school || ''} · Level ${spell.level}`;
    title.appendChild(subtitle);

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

  function buildWeaponResult(weapon) {
    const row = document.createElement('div');
    row.className = 'spell-result';

    const title = document.createElement('div');
    title.innerHTML = `<strong>${weapon.title || weapon.name || ''}</strong><br><small>${weapon.category || weapon.school || ''}${weapon.rarity ? ` · ${weapon.rarity}` : ''}</small>`;

    const owned = selectedPlayer?.weapons?.some(id => Number(id) === Number(weapon.id));
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.textContent = owned ? 'Added' : 'Add';
    addBtn.disabled = !!owned;
    addBtn.addEventListener('click', async () => {
      await addWeaponToPlayer(Number(weapon.id));
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

  function buildWeaponIndex(items) {
    return items.map(weapon => ({
      id: String(weapon.id),
      title: weapon.name || weapon.title || '',
      category: weapon.weapon_category || weapon.weaponCategory || '',
      rarity: weapon.rarity || '',
      text: `${weapon.name || weapon.title || ''} ${weapon.weapon_category || weapon.weaponCategory || ''} ${weapon.rarity || ''} ${String(weapon.property || '')} ${String(weapon.entries || '')}`.toLowerCase()
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

    for (let level = 1; level <= 9; level++) {
      const row = document.createElement('div');
      row.className = 'slot-row';

      const label = document.createElement('div');
      label.className = 'slot-label';
      label.textContent = `Level ${level}`;

      const totalGroup = document.createElement('div');
      totalGroup.className = 'slot-input-group';
      totalGroup.innerHTML = `<label>Total Slots<input class="slot-input" type="number" min="0" data-slot-level="${level}" data-slot-block="total" value="${totalSlots[String(level)]}"></label>`;

      const totalInput = totalGroup.querySelector('input');
      totalInput.addEventListener('change', () => updateSpellSlotValue(level, 'total', totalInput.value));

      row.appendChild(label);
      row.appendChild(totalGroup);
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

  function renderWeaponSearch() {
    const query = String(weaponSearchInput.value || '').trim().toLowerCase();
    const matches = weaponIndex
      .filter(weapon => weapon.text.includes(query))
      .slice(0, 20);

    weaponSearchResultsEl.innerHTML = '';
    if (matches.length === 0) {
      const noResult = document.createElement('div');
      noResult.className = 'empty-state';
      noResult.textContent = 'No weapons match your search. Try a different keyword.';
      weaponSearchResultsEl.appendChild(noResult);
      return;
    }

    matches.forEach(weapon => {
      weaponSearchResultsEl.appendChild(buildWeaponResult(weapon));
    });
  }

  function switchPlayerTab(tabName) {
    const tabs = document.querySelectorAll('.player-tab');
    const contents = document.querySelectorAll('.player-tab-content');
    tabs.forEach(tab => {
      const active = tab.dataset.tab === tabName;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    contents.forEach(content => {
      content.classList.toggle('active', content.id === tabName);
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

  async function fetchWeapons() {
    try {
      weapons = await apiFetch('/weapons');
      weaponIndex = buildWeaponIndex(weapons);
    } catch (error) {
      console.error('Failed to load weapons:', error);
      weapons = [];
      weaponIndex = [];
    }
  }

  async function fetchPlayers() {
    try {
      players = await apiFetch('/players');
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

  function beginCreatePlayer() {
    selectedPlayer = {
      isNew: true,
      name: '',
      class: '',
      level: '',
      total_spell_slots: {},
      current_spell_slots: {},
      spells: []
    };
    renderPlayerList();
    renderPlayerDetail();
  }

  async function confirmCreatePlayer() {
    if (!selectedPlayer || !selectedPlayer.isNew) return;
    try {
      const player = await apiFetch('/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedPlayer.name || 'Unnamed Player',
          class: selectedPlayer.class || '',
          level: selectedPlayer.level || null
        })
      });
      players.unshift(player);
      selectedPlayer = player;
      renderPlayerList();
      renderPlayerDetail();
    } catch (error) {
      console.error('Failed to create player:', error);
    }
  }

  function cancelCreatePlayer() {
    selectedPlayer = null;
    renderPlayerList();
    renderPlayerDetail();
  }

  async function updatePlayerField(field, value) {
    if (!selectedPlayer) return;
    if (selectedPlayer.isNew) {
      selectedPlayer[field] = value;
      renderPlayerDetail();
      return;
    }

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

  async function addWeaponToPlayer(weaponId) {
    if (!selectedPlayer) return;
    try {
      selectedPlayer = await apiFetch(`/players/${selectedPlayer.id}/weapons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weapon_id: weaponId })
      });
      const index = players.findIndex(player => Number(player.id) === Number(selectedPlayer.id));
      if (index !== -1) {
        players[index] = selectedPlayer;
      }
      renderPlayerList();
      renderPlayerDetail();
    } catch (error) {
      console.error('Failed to add weapon to player:', error);
    }
  }

  async function removeSpellFromPlayer(spellId) {
    if (!selectedPlayer) return;
    try {
      await apiFetch(`/players/${selectedPlayer.id}/spells/${spellId}`, { method: 'DELETE' });
      selectedPlayer.spells = selectedPlayer.spells.filter(id => Number(id) !== Number(spellId));
      selectedPlayer.spell_assignments = (selectedPlayer.spell_assignments || []).filter(a => Number(a.spell_id) !== Number(spellId));
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

  async function setSpellAtWill(spellId, atWill) {
    if (!selectedPlayer) return;
    try {
      selectedPlayer = await apiFetch(`/players/${selectedPlayer.id}/spells`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spell_id: spellId, at_will: atWill })
      });
      const index = players.findIndex(player => Number(player.id) === Number(selectedPlayer.id));
      if (index !== -1) {
        players[index] = selectedPlayer;
      }
      renderPlayerList();
      renderPlayerDetail();
    } catch (error) {
      console.error('Failed to update at-will spell status:', error);
    }
  }

  async function removeWeaponFromPlayer(weaponId) {
    if (!selectedPlayer) return;
    try {
      await apiFetch(`/players/${selectedPlayer.id}/weapons/${weaponId}`, { method: 'DELETE' });
      selectedPlayer.weapons = selectedPlayer.weapons.filter(id => Number(id) !== Number(weaponId));
      const index = players.findIndex(player => Number(player.id) === Number(selectedPlayer.id));
      if (index !== -1) {
        players[index] = selectedPlayer;
      }
      renderPlayerList();
      renderPlayerDetail();
    } catch (error) {
      console.error('Failed to remove weapon from player:', error);
    }
  }

  addPlayerBtn.addEventListener('click', function() {
    beginCreatePlayer();
  });

  deletePlayerBtn.addEventListener('click', function() {
    if (!selectedPlayer) return;
    deletePlayer(selectedPlayer.id);
  });

  toggleDetailsBtn.addEventListener('click', function() {
    toggleSection(playerDetailsSection, toggleDetailsBtn);
  });

  toggleSlotsBtn.addEventListener('click', function() {
    toggleSection(playerSlotsSection, toggleSlotsBtn);
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

  confirmPlayerBtn.addEventListener('click', function() {
    confirmCreatePlayer();
  });

  cancelCreateBtn.addEventListener('click', function() {
    cancelCreatePlayer();
  });

  if (spellCreateClose) {
    spellCreateClose.addEventListener('click', closeSpellCreateModal);
  }
  if (spellCreateCancel) {
    spellCreateCancel.addEventListener('click', closeSpellCreateModal);
  }
  if (spellCreateForm) {
    spellCreateForm.addEventListener('submit', saveNewSpell);
  }
  if (spellCreateModal) {
    spellCreateModal.addEventListener('click', function(event) {
      if (event.target === spellCreateModal) {
        closeSpellCreateModal();
      }
    });
  }

  document.querySelectorAll('.player-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      switchPlayerTab(this.dataset.tab);
    });
  });

  spellSearchInput.addEventListener('input', function() {
    renderSpellSearch();
  });

  weaponSearchInput.addEventListener('input', function() {
    renderWeaponSearch();
  });

  await fetchSpells();
  await fetchWeapons();
  await fetchPlayers();
});