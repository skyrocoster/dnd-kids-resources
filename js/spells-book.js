document.addEventListener('DOMContentLoaded', async function() {
  const container = document.getElementById('spell-book-container');
  const searchInput = document.getElementById('search-input');
  const characterSelect = document.getElementById('character-select');
  const slotOverview = document.getElementById('spell-slot-overview');
  const castToast = document.getElementById('spell-cast-toast');
  const playerSelectPanel = document.getElementById('player-select-panel');
  const togglePlayerSelectBtn = document.getElementById('toggle-player-select-btn');
  const resetSlotsButton = document.getElementById('reset-spell-slots-btn');
  const metaText = document.getElementById('spell-book-meta');
  const spellBookTitle = document.getElementById('spell-book-title');
  let castToastTimeout = null;

  const API_BASE = '/api';
  let spells = [];
  let players = [];
  let selectedPlayerId = null;
  let selectedPlayer = null;
  let searchTerm = '';

  async function apiFetch(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, options);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.error || `API request failed: ${response.status}`);
    }
    return body;
  }

  function normalizeSpellText(spell) {
    const name = spell.title || spell.name || '';
    const school = spell.school || spell.subschool || '';
    const description = spell.explanation || spell.details || spell.desc || '';
    return `${name} ${school} ${String(description)}`.toLowerCase();
  }


  function getAssignedSpellIds() {
    return selectedPlayer?.spells?.map(id => String(id)) || [];
  }

  function getSpellSortKey(spell) {
    const levelString = String(spell.level || '').toLowerCase();
    if (levelString === 'cantrip' || levelString === '0' || levelString === 'cantrip') {
      return 0;
    }
    const numeric = parseInt(levelString, 10);
    return Number.isFinite(numeric) ? numeric : 99;
  }

  function filterSpells() {
    if (!selectedPlayer) {
      return [];
    }

    const assignedIds = getAssignedSpellIds();
    if (assignedIds.length === 0) {
      return [];
    }

    return spells
      .filter(spell => {
        if (!assignedIds.includes(String(spell.id))) {
          return false;
        }
        if (!searchTerm) {
          return true;
        }
        return normalizeSpellText(spell).includes(searchTerm);
      })
      .sort((a, b) => {
        const keyA = getSpellSortKey(a);
        const keyB = getSpellSortKey(b);
        if (keyA !== keyB) {
          return keyA - keyB;
        }
        return String(a.title || a.name || '').localeCompare(String(b.title || b.name || ''), undefined, { sensitivity: 'base' });
      });
  }

  function updateMeta(count) {
    if (!metaText) return;
    const playerName = selectedPlayer ? selectedPlayer.name || 'Selected player' : 'No player selected';
    metaText.textContent = `${playerName}: ${count} spell${count === 1 ? '' : 's'} available`;
  }

  function updatePlayerTitle() {
    if (!spellBookTitle) return;
    if (selectedPlayer) {
      const playerName = selectedPlayer.name || 'Player';
      const titleText = `${playerName}'s Spell Book`;
      spellBookTitle.textContent = titleText;
      document.title = `${titleText} — D&D Kids Resources`;
      resetSlotsButton.disabled = false;
    } else {
      spellBookTitle.textContent = 'Spell Book';
      document.title = 'Spell Book — D&D Kids Resources';
      resetSlotsButton.disabled = true;
    }
  }

  function togglePlayerSelectPanel() {
    if (!playerSelectPanel || !togglePlayerSelectBtn) return;
    const collapsed = playerSelectPanel.classList.toggle('collapsed');
    togglePlayerSelectBtn.textContent = collapsed ? 'Show player' : 'Hide player';
  }

  function updatePlayerHeader() {
    updatePlayerTitle();
  }

  function getPlayerSlotBlock(blockName) {
    if (!selectedPlayer || !selectedPlayer[blockName] || typeof selectedPlayer[blockName] !== 'object') {
      return {};
    }
    const block = {};
    for (let level = 1; level <= 9; level++) {
      block[String(level)] = Number.isFinite(Number(selectedPlayer[blockName][String(level)])) ? Number(selectedPlayer[blockName][String(level)]) : 0;
    }
    return block;
  }

  function renderSlotOverview() {
    if (!slotOverview) return;
    slotOverview.innerHTML = '';
    if (!selectedPlayer) {
      return;
    }

    const totalSlots = getPlayerSlotBlock('total_spell_slots');
    const currentSlots = getPlayerSlotBlock('current_spell_slots');
    const hasAssignedLevels = Object.values(totalSlots).some(value => value > 0);
    if (!hasAssignedLevels) {
      return;
    }

    for (let level = 1; level <= 9; level++) {
      const current = currentSlots[String(level)] || 0;
      const total = totalSlots[String(level)] || 0;
      if (total === 0 && current === 0) {
        continue;
      }
      const card = document.createElement('div');
      card.className = `spell-slot-card level-${level}${current === 0 ? ' empty' : ''}`;

      const levelRow = document.createElement('div');
      levelRow.className = 'slot-level';
      levelRow.innerHTML = `<span class="slot-bubble">${level}</span><span class="slot-count">${current}/${total}</span>`;

      card.appendChild(levelRow);
      slotOverview.appendChild(card);
    }
  }

  function clearContainer() {
    container.innerHTML = '';
  }

  function renderSpellBook() {
    clearContainer();
    updatePlayerHeader();
    if (!players.length) {
      const noPlayers = document.createElement('div');
      noPlayers.style.padding = '28px 14px';
      noPlayers.style.textAlign = 'center';
      noPlayers.style.color = '#5a3210';
      noPlayers.textContent = 'No player characters found. Create players first on the Player Characters page.';
      container.appendChild(noPlayers);
      updateMeta(0);
      return;
    }

    if (!selectedPlayer) {
      const noSelection = document.createElement('div');
      noSelection.style.padding = '28px 14px';
      noSelection.style.textAlign = 'center';
      noSelection.style.color = '#5a3210';
      noSelection.textContent = 'Select a player to view their assigned spell book.';
      container.appendChild(noSelection);
      updateMeta(0);
      return;
    }

    const assignedIds = getAssignedSpellIds();
    if (assignedIds.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.style.padding = '28px 14px';
      emptyState.style.textAlign = 'center';
      emptyState.style.color = '#5a3210';
      emptyState.textContent = 'This player has no assigned spells yet. Add spells in the Player Characters page.';
      container.appendChild(emptyState);
      updateMeta(0);
      return;
    }

    const visible = filterSpells();
    updateMeta(visible.length);
    renderSlotOverview();

    if (visible.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.style.padding = '28px 14px';
      emptyState.style.textAlign = 'center';
      emptyState.style.color = '#5a3210';
      emptyState.textContent = 'No spells matched your search. Try a different term or reset the level filter.';
      container.appendChild(emptyState);
      return;
    }

    const list = document.createElement('div');
    list.className = 'cards-list spell-book-list';

    visible.forEach(spell => {
      const card = createCardElement(spell, null, { preview: false });
      card.style.maxWidth = '100%';
      card.style.width = '100%';
      attachCastButtonToCard(card, spell);
      list.appendChild(card);
    });

    container.appendChild(list);
  }


  function canCastSpell(spell) {
    const level = parseInt(spell.level, 10);
    if (Number.isNaN(level) || level < 1 || level > 9) {
      return true;
    }
    return getPlayerSlotBlock('current_spell_slots')[String(level)] > 0;
  }

  async function castSpell(spell, card) {
    if (!selectedPlayer) return;
    const level = parseInt(spell.level, 10);
    if (Number.isNaN(level) || level < 1 || level > 9) {
      return;
    }
    const currentSlots = getPlayerSlotBlock('current_spell_slots');
    const currentValue = currentSlots[String(level)] || 0;
    if (currentValue <= 0) {
      return;
    }
    currentSlots[String(level)] = currentValue - 1;
    if (card) {
      showCastEffect(card);
    }
    showCastToast(`✨ SPELL CAST! ${spell.title || ''}`);
    try {
      selectedPlayer = await apiFetch(`/players/${selectedPlayer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_spell_slots: currentSlots })
      });
      await loadPlayers();
      await loadSelectedPlayer(selectedPlayer.id);
    } catch (error) {
      console.error('Failed to cast spell:', error);
    }
  }

  function showCastEffect(card) {
    card.classList.remove('spell-cast-effect');
    void card.offsetWidth;
    card.classList.add('spell-cast-effect');

    const overlay = document.createElement('div');
    overlay.className = 'spell-cast-overlay';
    overlay.textContent = '✨ SPELL CAST! ✨';
    card.appendChild(overlay);

    setTimeout(() => {
      if (overlay.parentElement) {
        overlay.parentElement.removeChild(overlay);
      }
    }, 5000);
  }

  function showCastToast(message) {
    if (!castToast) return;
    clearTimeout(castToastTimeout);
    castToast.textContent = message;
    castToast.classList.add('visible');
    castToastTimeout = setTimeout(() => {
      castToast.classList.remove('visible');
    }, 5000);
  }

  function attachCastButtonToCard(card, spell) {
    if (!selectedPlayer) return;

    const level = parseInt(spell.level, 10);
    const usesSlot = !Number.isNaN(level) && level >= 1 && level <= 9;
    const canCast = usesSlot ? canCastSpell(spell) : true;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cast-button';
    button.style.margin = '10px';
    button.style.alignSelf = 'flex-end';
    button.textContent = usesSlot ? `✨ Cast L${level}` : '✨ Cast';
    button.disabled = usesSlot ? !canCast : false;
    button.addEventListener('click', () => castSpell(spell, card));

    const buttonWrapper = document.createElement('div');
    buttonWrapper.style.display = 'flex';
    buttonWrapper.style.justifyContent = 'flex-end';
    buttonWrapper.appendChild(button);

    const footer = card.querySelector('.card-footer');
    if (footer) {
      card.insertBefore(buttonWrapper, footer);
    } else {
      card.appendChild(buttonWrapper);
    }
  }

  function buildCharacterSelect() {
    characterSelect.innerHTML = '';
    if (!players.length) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No players available';
      characterSelect.appendChild(option);
      characterSelect.disabled = true;
      return;
    }

    players.forEach(player => {
      const option = document.createElement('option');
      option.value = player.id;
      option.textContent = player.name || `Player ${player.id}`;
      characterSelect.appendChild(option);
    });
    characterSelect.disabled = false;
    if (!selectedPlayerId || !players.some(p => String(p.id) === String(selectedPlayerId))) {
      selectedPlayerId = String(players[0].id);
    }
    characterSelect.value = selectedPlayerId;
  }

  async function resetSpellSlots() {
    if (!selectedPlayer) return;
    const totalSlots = getPlayerSlotBlock('total_spell_slots');
    try {
      selectedPlayer = await apiFetch(`/players/${selectedPlayer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_spell_slots: totalSlots })
      });
      showCastToast('✨ Spell slots refilled! ✨');
      await loadPlayers();
      await loadSelectedPlayer(selectedPlayer.id);
    } catch (error) {
      console.error('Failed to refill spell slots:', error);
    }
  }

  searchInput.addEventListener('input', event => {
    searchTerm = String(event.target.value || '').trim().toLowerCase();
    renderSpellBook();
  });

  characterSelect.addEventListener('change', async event => {
    selectedPlayerId = event.target.value;
    await loadSelectedPlayer(selectedPlayerId);
  });

  if (togglePlayerSelectBtn) {
    togglePlayerSelectBtn.addEventListener('click', togglePlayerSelectPanel);
  }

  resetSlotsButton.addEventListener('click', resetSpellSlots);

  async function loadSpells() {
    try {
      spells = await apiFetch('/spells');
    } catch (error) {
      console.error('Could not load spells:', error);
      spells = [];
    }
  }

  async function loadPlayers() {
    try {
      players = await apiFetch('/players');
    } catch (error) {
      console.error('Could not load players:', error);
      players = [];
    }
    buildCharacterSelect();
  }

  async function loadSelectedPlayer(playerId) {
    if (!playerId) {
      selectedPlayer = null;
      renderSpellBook();
      return;
    }
    try {
      selectedPlayer = await apiFetch(`/players/${playerId}`);
      selectedPlayerId = String(selectedPlayer.id);
      buildCharacterSelect();
      characterSelect.value = selectedPlayerId;
    } catch (error) {
      console.error('Could not load selected player:', error);
      selectedPlayer = null;
    }
    renderSpellBook();
  }

  try {
    await loadSpells();
    await loadPlayers();
    if (players.length > 0) {
      await loadSelectedPlayer(selectedPlayerId || String(players[0].id));
    } else {
      renderSpellBook();
    }
  } catch (error) {
    console.error('Spell Book load failed:', error);
    clearContainer();
    updateMeta(0);
    const errorBanner = document.createElement('div');
    errorBanner.style.padding = '24px 18px';
    errorBanner.style.background = '#fff1f0';
    errorBanner.style.color = '#8b1a1a';
    errorBanner.style.border = '2px solid #c0392b';
    errorBanner.style.borderRadius = '12px';
    errorBanner.textContent = `Unable to load spells. ${error.message}`;
    container.appendChild(errorBanner);
  }
});
