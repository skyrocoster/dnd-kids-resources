document.addEventListener('DOMContentLoaded', async function() {
  const { apiFetch } = ApiHelpers;
  const { escapeHtml } = DomUtils;
  const { getQueryParam } = DataUtils;
  const searchInput = document.getElementById('search-input');
  const createQuestButton = document.getElementById('create-quest-button');
  const createQuestModal = document.getElementById('createQuestModal');
  const questListEl = document.getElementById('quest-list');
  const questDetailShell = document.getElementById('quest-detail-shell');
  const questCount = document.getElementById('quest-count');

  let quests = [];
  let selectedQuestId = null;
  let suppressInputChange = false;
  let npcList = [];
  let dungeonList = [];
  const npcNameCache = {};
  const dungeonTitleCache = {};

  function formatQuestSubtitle(quest) {
    const parts = [];
    if (quest.location) parts.push(quest.location);
    return parts.join(' • ');
  }

  function createTextBlock(text) {
    const block = document.createElement('div');
    block.className = 'detail-item-text';
    block.textContent = String(text);
    return block;
  }

  function renderSectionPanel(title, items) {
    if (!items || !Array.isArray(items) || items.length === 0) return null;

    const panel = document.createElement('div');
    panel.className = 'detail-panel';
    const heading = document.createElement('h2');
    heading.textContent = title;
    panel.appendChild(heading);

    if (title === 'Objectives') {
      const list = document.createElement('ul');
      list.className = 'detail-item-list';
      items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = String(item);
        list.appendChild(li);
      });
      panel.appendChild(list);
      return panel;
    }

    items.forEach(item => {
      panel.appendChild(createTextBlock(item));
    });

    return panel;
  }

  async function getNpcName(npcId) {
    if (!npcId) return null;
    if (npcNameCache[npcId]) return npcNameCache[npcId];

    try {
      const npc = await apiFetch(`/npcs/${encodeURIComponent(npcId)}`);
      npcNameCache[npcId] = npc.name || `NPC ${npcId}`;
      return npcNameCache[npcId];
    } catch {
      return `NPC ${npcId}`;
    }
  }

  async function getDungeonTitle(dungeonId) {
    if (!dungeonId) return null;
    if (dungeonTitleCache[dungeonId]) return dungeonTitleCache[dungeonId];

    try {
      const dungeon = await apiFetch(`/dungeons/${encodeURIComponent(dungeonId)}`);
      dungeonTitleCache[dungeonId] = dungeon.title || `Dungeon ${dungeonId}`;
      return dungeonTitleCache[dungeonId];
    } catch {
      return `Dungeon ${dungeonId}`;
    }
  }

  async function displayQuest(quest) {
    questDetailShell.innerHTML = '';

    const detailShell = document.createElement('div');
    detailShell.className = 'detail-shell';

    const detailHeader = document.createElement('div');
    detailHeader.className = 'detail-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'detail-title-group';

    const title = document.createElement('h1');
    title.className = 'detail-title';
    title.textContent = quest.name || 'Unknown Quest';

    const subtitle = document.createElement('p');
    subtitle.className = 'detail-subtitle';
    subtitle.textContent = formatQuestSubtitle(quest);

    titleGroup.appendChild(title);
    titleGroup.appendChild(subtitle);
    detailHeader.appendChild(titleGroup);

    if (quest.quest_giver) {
      const questGiverName = await getNpcName(quest.quest_giver);
      const giverRow = document.createElement('div');
      giverRow.className = 'detail-item';
      const giverLabel = document.createElement('span');
      giverLabel.className = 'detail-label';
      giverLabel.textContent = 'Quest Giver';
      const giverValue = document.createElement('div');
      giverValue.className = 'detail-value';
      giverValue.textContent = questGiverName;
      giverRow.appendChild(giverLabel);
      giverRow.appendChild(giverValue);
      detailHeader.appendChild(giverRow);
    }

    if (quest.dungeon_id) {
      const dungeonTitle = await getDungeonTitle(quest.dungeon_id);
      const dungeonRow = document.createElement('div');
      dungeonRow.className = 'detail-item';
      const dungeonLabel = document.createElement('span');
      dungeonLabel.className = 'detail-label';
      dungeonLabel.textContent = 'Related Dungeon';
      const dungeonValue = document.createElement('div');
      dungeonValue.className = 'detail-value';
      dungeonValue.textContent = dungeonTitle;
      dungeonRow.appendChild(dungeonLabel);
      dungeonRow.appendChild(dungeonValue);
      detailHeader.appendChild(dungeonRow);
    }

    detailShell.appendChild(detailHeader);

    const contentGrid = document.createElement('div');
    contentGrid.className = 'detail-grid';

    const mainPanel = document.createElement('div');
    mainPanel.className = 'detail-panel';
    const heading = document.createElement('h2');
    heading.textContent = 'Quest Details';
    mainPanel.appendChild(heading);

    if (quest.summary) {
      const summary = document.createElement('div');
      summary.className = 'detail-item-text';
      summary.textContent = quest.summary;
      mainPanel.appendChild(summary);
    }

    if (quest.details) {
      if (Array.isArray(quest.details)) {
        quest.details.forEach(detail => mainPanel.appendChild(createTextBlock(detail)));
      } else {
        mainPanel.appendChild(createTextBlock(quest.details));
      }
    }

    if (!quest.summary && !quest.details) {
      mainPanel.appendChild(createTextBlock('No details available for this quest.'));
    }

    if (quest.reward) {
      const rewardRow = document.createElement('div');
      rewardRow.className = 'detail-row';
      const rewardLabel = document.createElement('span');
      rewardLabel.className = 'detail-label';
      rewardLabel.textContent = 'Reward';
      const rewardValue = document.createElement('div');
      rewardValue.className = 'detail-value';
      if (Array.isArray(quest.reward)) {
        const rewardList = document.createElement('ul');
        rewardList.className = 'detail-item-list';
        quest.reward.forEach(reward => {
          const li = document.createElement('li');
          li.textContent = String(reward);
          rewardList.appendChild(li);
        });
        rewardValue.appendChild(rewardList);
      } else {
        rewardValue.textContent = String(quest.reward);
      }
      rewardRow.appendChild(rewardLabel);
      rewardRow.appendChild(rewardValue);
      mainPanel.appendChild(rewardRow);
    }

    contentGrid.appendChild(mainPanel);

    const objectivePanel = renderSectionPanel('Objectives', quest.objectives || []);
    if (objectivePanel) contentGrid.appendChild(objectivePanel);

    const notesPanel = renderSectionPanel('Notes', quest.notes || []);
    if (notesPanel) contentGrid.appendChild(notesPanel);

    detailShell.appendChild(contentGrid);
    questDetailShell.appendChild(detailShell);
  }

  function showPlaceholder(message) {
    questDetailShell.innerHTML = `<div class="quest-detail-placeholder">${escapeHtml(message)}</div>`;
  }

  function parseMultilineInput(id) {
    const field = document.getElementById(id);
    if (!field) return [];
    return String(field.value || '')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line);
  }

  function clearCreateQuestForm() {
    ['new-quest-name', 'new-quest-summary', 'new-quest-location', 'new-quest-dungeon', 'new-quest-giver', 'new-quest-reward', 'new-quest-objectives', 'new-quest-details', 'new-quest-notes'].forEach(id => {
      const field = document.getElementById(id);
      if (field) field.value = '';
    });
    const giverSelect = document.getElementById('new-quest-giver');
    if (giverSelect) giverSelect.value = '';
    const dungeonSelect = document.getElementById('new-quest-dungeon');
    if (dungeonSelect) dungeonSelect.value = '';
  }

  async function loadQuestGivers() {
    try {
      npcList = await apiFetch('/npcs');
      npcList.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }));
      const giverSelect = document.getElementById('new-quest-giver');
      if (!giverSelect) return;
      giverSelect.innerHTML = '<option value="">Select an NPC...</option>' + npcList.map(npc => {
        return `<option value="${encodeURIComponent(npc.id)}">${escapeHtml(npc.name || `NPC ${npc.id}`)}</option>`;
      }).join('');
    } catch (error) {
      console.warn('Could not load NPC list for quest giver dropdown:', error);
    }
  }

  async function loadDungeons() {
    try {
      dungeonList = await apiFetch('/dungeons');
      dungeonList.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), undefined, { sensitivity: 'base' }));
      const dungeonSelect = document.getElementById('new-quest-dungeon');
      if (!dungeonSelect) return;
      dungeonSelect.innerHTML = '<option value="">Select a dungeon...</option>' + dungeonList.map(dungeon => {
        return `<option value="${encodeURIComponent(dungeon.id)}">${escapeHtml(dungeon.title || `Dungeon ${dungeon.id}`)}</option>`;
      }).join('');
    } catch (error) {
      console.warn('Could not load dungeon list for quest form:', error);
    }
  }

  function openCreateQuestModal() {
    if (!createQuestModal) return;
    clearCreateQuestForm();
    createQuestModal.classList.add('active');
    createQuestModal.setAttribute('aria-hidden', 'false');
    const focusField = document.getElementById('new-quest-name');
    if (focusField) focusField.focus();
  }

  function closeCreateQuestModal() {
    if (!createQuestModal) return;
    createQuestModal.classList.remove('active');
    createQuestModal.setAttribute('aria-hidden', 'true');
  }

  async function submitCreateQuest() {
    const nameField = document.getElementById('new-quest-name');
    if (!nameField) return;
    const name = String(nameField.value || '').trim();
    if (!name) {
      alert('Please enter a quest name.');
      nameField.focus();
      return;
    }

    const dungeonValue = document.getElementById('new-quest-dungeon')?.value;
    const giverValue = document.getElementById('new-quest-giver')?.value;
    const payload = {
      name,
      summary: String(document.getElementById('new-quest-summary')?.value || '').trim() || null,
      location: String(document.getElementById('new-quest-location')?.value || '').trim() || null,
      dungeon_id: dungeonValue ? Number(dungeonValue) : null,
      quest_giver: giverValue ? Number(giverValue) : null,
      reward: parseMultilineInput('new-quest-reward'),
      objectives: parseMultilineInput('new-quest-objectives'),
      details: parseMultilineInput('new-quest-details'),
      notes: String(document.getElementById('new-quest-notes')?.value || '').trim() || null
    };

    try {
      const response = await fetch('/api/quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Unable to create quest.');
      }

      quests.push(result);
      quests.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }));
      renderQuestList(quests);
      selectQuest(result.id, true);
      closeCreateQuestModal();
      updateQuestCount(quests.length);
    } catch (error) {
      alert(error.message || 'Failed to create quest.');
    }
  }

  function selectQuest(id, clearSearch = false) {
    selectedQuestId = id;
    const items = Array.from(questListEl.children);
    items.forEach(item => item.classList.toggle('selected', item.dataset.id === id));

    if (clearSearch && searchInput.value.trim()) {
      suppressInputChange = true;
      searchInput.value = '';
    }

    loadQuestDetail(id);
  }

  async function loadQuestDetail(id) {
    if (!id) {
      showPlaceholder('Select a quest from the list.');
      return;
    }
    showPlaceholder(`Loading ${id}...`);
    try {
      const quest = await apiFetch(`/quests/${encodeURIComponent(id)}`);
      await displayQuest(quest);
    } catch (error) {
      showPlaceholder(error.message || 'Quest not found.');
    }
  }

  function renderQuestList(items) {
    questListEl.innerHTML = '';
    if (!items.length) {
      questListEl.innerHTML = '<div class="quest-detail-placeholder">No quests found.</div>';
      return;
    }
    items.forEach(quest => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'quest-list-item';
      item.dataset.id = quest.id;
      item.innerHTML = `
        <div class="quest-list-item-title">${escapeHtml(quest.name)}</div>
        <div class="quest-list-item-subtitle">${escapeHtml(formatQuestSubtitle(quest) || quest.summary || 'Tap to view details')}</div>
      `;
      item.addEventListener('click', () => selectQuest(quest.id, true));
      questListEl.appendChild(item);
    });
  }

  function updateQuestCount(count, fallback) {
    if (typeof count === 'number' && count > 0) {
      questCount.textContent = `${count} quest${count === 1 ? '' : 's'} available`;
    } else {
      questCount.textContent = fallback || 'Type a quest name to begin.';
    }
  }

  function filterQuests(term) {
    const lower = term.trim().toLowerCase();
    if (!lower) return quests;
    return quests.filter(quest => {
      const haystack = [
        quest.name,
        quest.summary,
        quest.location,
        (quest.objectives || []).join(' '),
        (quest.details || []).join(' '),
        Array.isArray(quest.reward) ? quest.reward.join(' ') : quest.reward
      ].join(' ');
      return haystack.toLowerCase().includes(lower);
    });
  }

  searchInput.addEventListener('input', () => {
    if (suppressInputChange) {
      suppressInputChange = false;
      return;
    }

    const query = searchInput.value.trim();
    if (!query) {
      questListEl.innerHTML = '';
      updateQuestCount(0, 'Type a quest name to begin.');
      showPlaceholder('Type a quest name to begin.');
      selectedQuestId = null;
      return;
    }

    const filtered = filterQuests(query);
    renderQuestList(filtered);
    updateQuestCount(filtered.length);
    if (!filtered.find(quest => quest.id === selectedQuestId)) {
      if (filtered.length) {
        selectQuest(filtered[0].id);
      } else {
        showPlaceholder('No quests match your search.');
      }
    }
  });

  createQuestButton?.addEventListener('click', openCreateQuestModal);
  document.getElementById('cancel-create-quest')?.addEventListener('click', closeCreateQuestModal);
  document.getElementById('submit-create-quest')?.addEventListener('click', submitCreateQuest);
  createQuestModal?.addEventListener('click', (event) => {
    if (event.target === createQuestModal) {
      closeCreateQuestModal();
    }
  });

  await loadQuestGivers();
  await loadDungeons();

  async function loadQuests() {
    try {
      quests = await apiFetch('/quests');
      quests.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }));
      const requestedId = getQueryParam('id');

      if (requestedId) {
        searchInput.value = requestedId;
        const visibleQuests = filterQuests(requestedId);
        renderQuestList(visibleQuests);
        updateQuestCount(visibleQuests.length);

        if (visibleQuests.length > 0) {
          const requestedQuest = visibleQuests.find(quest => String(quest.id).toLowerCase() === String(requestedId).toLowerCase() || String(quest.name || quest.title || '').toLowerCase() === String(requestedId).toLowerCase());
          selectQuest(requestedQuest ? requestedQuest.id : visibleQuests[0].id);
        } else {
          showPlaceholder(`No quests matched "${requestedId}".`);
        }
      } else {
        questListEl.innerHTML = '';
        updateQuestCount(0, 'Type a quest name to begin.');
        showPlaceholder('Type a quest name to begin.');
      }
    } catch (error) {
      showPlaceholder(error.message || 'Could not load quest list.');
      questCount.textContent = 'Error loading quests';
    }
  }

  loadQuests();
});
