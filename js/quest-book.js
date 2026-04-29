// Quest Book - Simple card-based layout
let allQuests = [];
let displayedQuests = [];
const apiFetch = window.ApiHelpers?.apiFetch;
const ApiService = window.ApiHelpers?.ApiService;

// Initialize on page load
document.addEventListener('DOMContentLoaded', initQuestBook);

async function initQuestBook() {
  setupEventListeners();
  await loadQuests();
}

let questFormOptionsLoaded = false;
let npcOptions = [];
let dungeonOptions = [];

function setupEventListeners() {
  const searchInput = document.getElementById('questSearch');
  const createBtn = document.getElementById('createQuestBtn');
  const cancelBtn = document.getElementById('cancel-create-quest');
  const submitBtn = document.getElementById('submit-create-quest');

  searchInput.addEventListener('input', handleSearch);
  createBtn.addEventListener('click', openCreateQuestModal);
  cancelBtn.addEventListener('click', closeCreateQuestModal);
  submitBtn.addEventListener('click', submitCreateQuest);
}

async function loadQuestFormOptions() {
  if (questFormOptionsLoaded) return;
  if (!ApiService) return;

  try {
    npcOptions = await ApiService.getNpcs();
  } catch (error) {
    console.error('Unable to load NPC options:', error);
    npcOptions = [];
  }

  try {
    dungeonOptions = await ApiService.getDungeons();
  } catch (error) {
    console.error('Unable to load dungeon options:', error);
    dungeonOptions = [];
  }

  populateQuestGiverSelect();
  populateDungeonSelect();
  questFormOptionsLoaded = true;
}

function populateQuestGiverSelect() {
  const select = document.getElementById('new-quest-giver');
  if (!select) return;
  select.innerHTML = '<option value="">Select an NPC...</option>';
  npcOptions.forEach(npc => {
    const option = document.createElement('option');
    option.value = npc.id || '';
    option.textContent = npc.name || `NPC ${npc.id}`;
    select.appendChild(option);
  });
}

function populateDungeonSelect() {
  const select = document.getElementById('new-quest-dungeon');
  if (!select) return;
  select.innerHTML = '<option value="">Select a dungeon...</option>';
  dungeonOptions.forEach(dungeon => {
    const option = document.createElement('option');
    option.value = dungeon.id || '';
    option.textContent = dungeon.title || `Dungeon ${dungeon.id}`;
    select.appendChild(option);
  });
}

async function loadQuests() {
  try {
    if (!ApiService) throw new Error('API service not available');
    allQuests = await ApiService.getQuests();
    updateQuestCount();
    renderQuestList(allQuests);
  } catch (error) {
    console.error('Error loading quests:', error);
    showError('Failed to load quests. Please refresh the page.');
  }
}

function handleSearch(e) {
  const searchTerm = e.target.value.toLowerCase().trim();
  
  if (!searchTerm) {
    document.getElementById('questList').innerHTML = `
      <div class="empty-state">
        <p>Type a quest name to begin searching...</p>
      </div>
    `;
    updateQuestCount();
    return;
  }

  displayedQuests = allQuests.filter(quest => {
    const name = quest.name?.toLowerCase() || '';
    const location = quest.location?.toLowerCase() || '';
    const summary = quest.summary?.toLowerCase() || '';
    return name.includes(searchTerm) || location.includes(searchTerm) || summary.includes(searchTerm);
  });

  updateQuestCount();
  renderQuestList(displayedQuests);
}

function renderQuestList(quests) {
  const listEl = document.getElementById('questList');

  if (quests.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <p>No quests found</p>
      </div>
    `;
    return;
  }

  listEl.innerHTML = quests.map(quest => {
    const location = quest.location || 'Unknown location';
    const summary = quest.summary || 'No summary';
    
    return `
      <div class="quest-card" onclick="selectQuest(${quest.id})">
        <h3>${escapeHtml(quest.name || 'Unnamed Quest')}</h3>
        <div class="quest-meta">
          <span class="meta-item">📍 ${escapeHtml(location)}</span>
        </div>
        <p>${escapeHtml(summary)}</p>
        <div class="meta">
          <button class="btn" onclick="event.stopPropagation(); selectQuest(${quest.id})">View Details</button>
        </div>
      </div>
    `;
  }).join('');
}

async function selectQuest(questId) {
  try {
    if (!ApiService) throw new Error('API service not available');
    const quest = await ApiService.getQuestById(questId);
    displayQuestDetails(quest);
  } catch (error) {
    console.error('Error loading quest details:', error);
    showError('Failed to load quest details.');
  }
}

function displayQuestDetails(quest) {
  const modalHtml = `
    <div class="modal active" id="questDetailModal">
      <div class="modal-content">
        <h2>${escapeHtml(quest.name || 'Unnamed Quest')}</h2>
        
        <div style="margin-bottom: 1.5rem;">
          <h3 style="margin-top: 0; color: #4a90e2;">Details</h3>
          ${quest.summary ? `<p><strong>Summary:</strong> ${escapeHtml(quest.summary)}</p>` : ''}
          ${quest.location ? `<p><strong>Location:</strong> ${escapeHtml(quest.location)}</p>` : ''}
          ${quest.quest_giver ? `<p><strong>Quest Giver:</strong> ${escapeHtml(quest.quest_giver)}</p>` : ''}
        </div>

        ${quest.objectives ? `
          <div style="margin-bottom: 1.5rem;">
            <h3 style="margin-top: 0; color: #4a90e2;">Objectives</h3>
            <ul style="margin: 0; padding-left: 1.5rem;">
              ${parseArrayField(quest.objectives).map(obj => `<li>${escapeHtml(obj)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${quest.reward ? `
          <div style="margin-bottom: 1.5rem;">
            <h3 style="margin-top: 0; color: #4a90e2;">Rewards</h3>
            <ul style="margin: 0; padding-left: 1.5rem;">
              ${parseArrayField(quest.reward).map(r => `<li>${escapeHtml(r)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${quest.details ? `
          <div style="margin-bottom: 1.5rem;">
            <h3 style="margin-top: 0; color: #4a90e2;">Details</h3>
            <ul style="margin: 0; padding-left: 1.5rem;">
              ${parseArrayField(quest.details).map(d => `<li>${escapeHtml(d)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${quest.notes ? `
          <div style="margin-bottom: 1.5rem;">
            <h3 style="margin-top: 0; color: #4a90e2;">Notes</h3>
            <p style="margin: 0; color: #666; font-style: italic;">${escapeHtml(quest.notes)}</p>
          </div>
        ` : ''}

        <div class="modal-buttons">
          <button type="button" class="cancel-btn" onclick="closeQuestDetailModal()">Close</button>
        </div>
      </div>
    </div>
  `;

  // Remove existing detail modal if present
  const existingModal = document.getElementById('questDetailModal');
  if (existingModal) existingModal.remove();

  // Add new detail modal to body
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Close detail modal when clicking outside
  document.getElementById('questDetailModal').addEventListener('click', (e) => {
    if (e.target.id === 'questDetailModal') {
      closeQuestDetailModal();
    }
  });
}

function closeQuestDetailModal() {
  const modal = document.getElementById('questDetailModal');
  if (modal) modal.remove();
}

async function openCreateQuestModal() {
  await loadQuestFormOptions();
  document.getElementById('createQuestModal').classList.add('active');
  document.getElementById('createQuestModal').setAttribute('aria-hidden', 'false');
}

function closeCreateQuestModal() {
  document.getElementById('createQuestModal').classList.remove('active');
  document.getElementById('createQuestModal').setAttribute('aria-hidden', 'true');
  clearQuestForm();
}

async function submitCreateQuest() {
  const name = document.getElementById('new-quest-name').value?.trim();
  const summary = document.getElementById('new-quest-summary').value?.trim();
  const location = document.getElementById('new-quest-location').value?.trim();
  const questGiver = document.getElementById('new-quest-giver').value?.trim();
  const reward = document.getElementById('new-quest-reward').value?.trim();
  const objectives = document.getElementById('new-quest-objectives').value?.trim();
  const details = document.getElementById('new-quest-details').value?.trim();
  const notes = document.getElementById('new-quest-notes').value?.trim();

  if (!name) {
    alert('Quest name is required');
    return;
  }

  const questData = {
    name,
    summary: summary || null,
    location: location || null,
    quest_giver: questGiver || null,
    reward: reward ? reward.split('\n').filter(r => r.trim()) : null,
    objectives: objectives ? objectives.split('\n').filter(o => o.trim()) : null,
    details: details ? details.split('\n').filter(d => d.trim()) : null,
    notes: notes || null
  };

  try {
    if (!ApiService) throw new Error('API service not available');
    await ApiService.createQuest(questData);

    closeCreateQuestModal();
    await loadQuests();
    showSuccess('Quest created successfully!');
  } catch (error) {
    console.error('Error creating quest:', error);
    showError('Failed to create quest. Please try again.');
  }
}

function clearQuestForm() {
  document.getElementById('new-quest-name').value = '';
  document.getElementById('new-quest-summary').value = '';
  document.getElementById('new-quest-location').value = '';
  document.getElementById('new-quest-dungeon').value = '';
  document.getElementById('new-quest-giver').value = '';
  document.getElementById('new-quest-reward').value = '';
  document.getElementById('new-quest-objectives').value = '';
  document.getElementById('new-quest-details').value = '';
  document.getElementById('new-quest-notes').value = '';
}

function updateQuestCount() {
  const searchTerm = document.getElementById('questSearch').value?.trim();
  const count = searchTerm ? displayedQuests.length : allQuests.length;
  document.getElementById('questCount').textContent = `${count} ${count === 1 ? 'quest' : 'quests'}`;
}

function parseArrayField(field) {
  if (!field) return [];
  if (typeof field === 'string') {
    try {
      return JSON.parse(field);
    } catch {
      return field.split('\n').filter(line => line.trim());
    }
  }
  return Array.isArray(field) ? field : [];
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showError(message) {
  console.error(message);
  // Optional: Add toast notification if desired
}

function showSuccess(message) {
  console.log(message);
  // Optional: Add toast notification if desired
}
