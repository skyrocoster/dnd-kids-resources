PageBase.onReady(async function() {
  const { escapeHtml } = window.DomUtils;
  // Initialize resizable sidebar using PageBase utility
  PageBase.initializeViewerPane('npcEditor', {
    layoutId: 'page-pane-layout',
    panelId: 'viewer-sidebar',
    handleId: 'resizeHandle',
    defaultWidth: 320,
    minWidth: 220,
    maxWidthFraction: 0.5,
    collapseThreshold: 120
  });
  const API_DATA_PATH = '/api/npcs';
  const FALLBACK_DATA_PATH = '/data/seeds/seed_npcs.json';
  const searchInput = PageBase.getElement('search-input');
  const npcListEl = PageBase.getElement('npc-list');
  const npcCountEl = PageBase.getElement('npc-count');
  const npcDetailShell = PageBase.getElement('npc-detail-shell');
  const newNpcBtn = PageBase.getElement('new-npc-btn');
  const exportNpcsBtn = PageBase.getElement('export-npcs-btn');

  let npcs = [];
  let selectedNpcId = null;
  let nextTempId = 1;

  const SAVING_THROW_KEYS = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
  const SKILL_KEYS = [
    'acrobatics', 'animal_handling', 'arcana', 'athletics', 'deception', 'history',
    'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception',
    'performance', 'persuasion', 'religion', 'sleight_of_hand', 'stealth', 'survival',
    'passive_perception'
  ];
  const APPEARANCE_KEYS = ['eye_colour', 'hair_colour', 'skin_tone', 'height', 'weight', 'clothing', 'distinguishing_features'];
  const LABEL_OVERRIDES = {
    animal_handling: 'Animal Handling',
    passive_perception: 'Passive Perception',
    sleight_of_hand: 'Sleight of Hand',
    eye_colour: 'Eye Colour',
    hair_colour: 'Hair Colour',
    skin_tone: 'Skin Tone',
    distinguishing_features: 'Distinguishing Features'
  };

  function getNpcKey(npc) {
    return npc.id != null ? `npc-${npc.id}` : `temp-${npc.temp_id}`;
  }

  function labelFor(key) {
    return LABEL_OVERRIDES[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function setInputValue(id, value) {
    const input = document.getElementById(id);
    if (!input) return;
    input.value = value != null ? String(value) : '';
  }

  function getInputValue(id) {
    const input = document.getElementById(id);
    return input ? input.value.trim() : '';
  }

  function createSensesRow(npc, index, sense = {}) {
    const row = document.createElement('div');
    row.className = 'field-row';
    const typeGroup = document.createElement('div');
    typeGroup.className = 'field-group';
    const typeLabel = document.createElement('label');
    typeLabel.setAttribute('for', `sense-type-${index}`);
    typeLabel.textContent = 'Type';
    const typeInput = document.createElement('input');
    typeInput.id = `sense-type-${index}`;
    typeInput.type = 'text';
    typeInput.placeholder = 'darkvision';
    typeInput.value = sense.type || '';
    typeInput.addEventListener('input', () => {
      npc.senses[index].type = typeInput.value.trim();
      renderNpcList();
      updateDetailHeader(npc);
    });
    typeGroup.appendChild(typeLabel);
    typeGroup.appendChild(typeInput);

    const rangeGroup = document.createElement('div');
    rangeGroup.className = 'field-group';
    const rangeLabel = document.createElement('label');
    rangeLabel.setAttribute('for', `sense-range-${index}`);
    rangeLabel.textContent = 'Range';
    const rangeInput = document.createElement('input');
    rangeInput.id = `sense-range-${index}`;
    rangeInput.type = 'text';
    rangeInput.placeholder = '60 ft.';
    rangeInput.value = sense.range != null ? String(sense.range) : '';
    rangeInput.addEventListener('input', () => {
      npc.senses[index].range = rangeInput.value.trim();
      renderNpcList();
      updateDetailHeader(npc);
    });
    rangeGroup.appendChild(rangeLabel);
    rangeGroup.appendChild(rangeInput);

    const removeGroup = document.createElement('div');
    removeGroup.className = 'field-group';
    removeGroup.style.alignSelf = 'end';
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'reset-button';
    removeButton.textContent = 'Remove';
    removeButton.addEventListener('click', () => {
      npc.senses.splice(index, 1);
      if (npc.senses.length === 0) {
        npc.senses = [];
      }
      renderSensesFields(npc);
      renderNpcList();
      updateDetailHeader(npc);
    });
    removeGroup.appendChild(removeButton);

    row.appendChild(typeGroup);
    row.appendChild(rangeGroup);
    row.appendChild(removeGroup);
    return row;
  }

  function renderSensesFields(npc) {
    const container = document.getElementById('npc-senses-list');
    const noSense = document.getElementById('npc-senses-empty');
    if (!container) return;
    container.innerHTML = '';
    const senses = Array.isArray(npc.senses) ? npc.senses : [];
    if (!senses.length) {
      const empty = document.createElement('div');
      empty.className = 'placeholder';
      empty.id = 'npc-senses-empty';
      empty.textContent = 'No senses defined yet. Add one to start.';
      container.appendChild(empty);
    } else {
      senses.forEach((sense, index) => container.appendChild(createSensesRow(npc, index, sense)));
    }
  }

  function addSense(npc) {
    if (!Array.isArray(npc.senses)) npc.senses = [];
    npc.senses.push({ type: '', range: '' });
    renderSensesFields(npc);
  }

  function findNpcByKey(key) {
    return npcs.find(npc => getNpcKey(npc) === key);
  }

  function formatListSubtitle(npc) {
    const parts = [];
    if (npc.race) parts.push(npc.race);
    if (npc.background) parts.push(npc.background);
    if (npc.size) parts.push(npc.size);
    return parts.join(' • ');
  }

  function filterNpcs() {
    const term = searchInput.value.trim().toLowerCase();
    if (!term) return npcs;
    return npcs.filter(npc => {
      const combined = [npc.name, npc.race, npc.gender, npc.background, npc.notes, npc.languages]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return combined.includes(term);
    });
  }

  function renderNpcList() {
    const visible = filterNpcs();
    npcCountEl.textContent = `${visible.length} NPC${visible.length === 1 ? '' : 's'} available`;
npcCountEl.className = 'monster-book-meta';
    npcListEl.innerHTML = '';
    // Show loading spinner if NPCs are still loading
    if (npcs.length === 0 && npcCountEl.textContent.includes('Loading')) {
      const loading = document.createElement('div');
      loading.className = 'placeholder';
      loading.textContent = 'Loading NPCs...';
      npcListEl.appendChild(loading);
      return;
    }
    if (!visible.length) {
      npcCountEl.textContent = '0 NPCs';
      const placeholder = document.createElement('div');
      placeholder.className = 'placeholder';
      placeholder.textContent = 'No NPCs match your search. Add a new NPC or try a different term.';
      npcListEl.appendChild(placeholder);
      renderPlaceholder('No NPCs match your search.');
      return;
    }

    visible.forEach(npc => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'monster-list-item';
      const key = getNpcKey(npc);
      if (key === selectedNpcId) {
        item.classList.add('selected');
        item.setAttribute('aria-current', 'true');
      } else {
        item.classList.remove('selected');
        item.removeAttribute('aria-current');
      }
      item.dataset.key = key;

      item.innerHTML = `
        <div class="monster-list-item-title">${escapeHtml(npc.name || 'New NPC')}</div>
        <div class="monster-list-item-subtitle">${escapeHtml(formatListSubtitle(npc))}</div>
      `;
      item.tabIndex = 0;
      item.setAttribute('role', 'button');
      item.setAttribute('aria-label', npc.name || 'New NPC');
      item.addEventListener('click', () => selectNpc(key));
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          selectNpc(key);
        }
      });
      npcListEl.appendChild(item);
    });
  }

  function showMessage(message) {
    const banner = document.querySelector('.message-banner');
    if (!banner) return;
    banner.textContent = message;
    banner.style.display = 'block';
    banner.setAttribute('aria-live', 'assertive');
    banner.setAttribute('role', 'alert');
    clearTimeout(window.npcEditorMessageTimeout);
    window.npcEditorMessageTimeout = setTimeout(() => {
      banner.style.display = 'none';
    }, 2800);
  }

  function parseJsonField(value) {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }

  function serializeJsonField(value) {
    if (value == null || value === '') return null;
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch (error) {
      return null;
    }
  }

  function buildDetailShell(npc) {
    npcDetailShell.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'npc-form';

    const headerPanel = document.createElement('div');
    headerPanel.className = 'detail-panel';
    headerPanel.innerHTML = `
      <div class="detail-header">
        <div class="detail-title-group">
          <h1 class="detail-title">${escapeHtml(npc.name || 'New NPC')}</h1>
          <p class="detail-subtitle">${escapeHtml(formatListSubtitle(npc) || 'Fill the form to create a character.')}</p>
        </div>
      </div>
      <div class="button-row npc-detail-actions">
        <button id="save-npc-btn" class="reset-button">Save NPC</button>
        <button id="delete-npc-btn" class="reset-button">Delete NPC</button>
      </div>
      <div class="message-banner"></div>
    `;

    wrapper.appendChild(headerPanel);

    const form = document.createElement('div');
    form.className = 'npc-form';
    // Modularize: could break out each section as a function if desired
    form.innerHTML = `
      <div class="field-row">
        <div class="field-group">
          <label for="npc-name">Name</label>
          <input id="npc-name" type="text" placeholder="NPC name" />
        </div>
        <div class="field-group">
          <label for="npc-race">Race</label>
          <input id="npc-race" type="text" placeholder="Human, Elf, Halfling..." />
        </div>
      </div>
      <div class="field-row">
        <div class="field-group">
          <label for="npc-gender">Gender</label>
          <input id="npc-gender" type="text" placeholder="Male, Female, Non-binary" />
        </div>
        <div class="field-group">
          <label for="npc-background">Background</label>
          <input id="npc-background" type="text" placeholder="Village Guard, Merchant..." />
        </div>
      </div>
      <div class="field-row">
        <div class="field-group">
          <label for="npc-size">Size</label>
          <input id="npc-size" type="text" placeholder="Medium, Small" />
        </div>
        <div class="field-group">
          <label for="npc-speed">Speed</label>
          <input id="npc-speed" type="text" placeholder="30 ft., 25 ft." />
        </div>
      </div>
      <div class="field-row">
        <div class="field-group">
          <label for="npc-armor-class">Armor Class</label>
          <input id="npc-armor-class" type="number" min="0" placeholder="16" />
        </div>
        <div class="field-group">
          <label for="npc-hit-points">Hit Points</label>
          <input id="npc-hit-points" type="number" min="0" placeholder="22" />
        </div>
      </div>
      <div class="field-row">
        <div class="field-group">
          <label for="npc-languages">Languages</label>
          <input id="npc-languages" type="text" placeholder="Common, Elvish" />
        </div>
      </div>
      <div>
        <div class="detail-label">Senses</div>
        <div id="npc-senses-list"></div>
        <button id="add-sense-btn" type="button" class="reset-button npc-add-sense-btn">Add Sense</button>
      </div>
      <div>
        <div class="detail-label">Ability Scores</div>
        <div class="stats-grid">
          <div class="field-group"><label for="stat-strength">STR</label><input id="stat-strength" type="number" min="1" max="30" /></div>
          <div class="field-group"><label for="stat-dexterity">DEX</label><input id="stat-dexterity" type="number" min="1" max="30" /></div>
          <div class="field-group"><label for="stat-constitution">CON</label><input id="stat-constitution" type="number" min="1" max="30" /></div>
          <div class="field-group"><label for="stat-intelligence">INT</label><input id="stat-intelligence" type="number" min="1" max="30" /></div>
          <div class="field-group"><label for="stat-wisdom">WIS</label><input id="stat-wisdom" type="number" min="1" max="30" /></div>
          <div class="field-group"><label for="stat-charisma">CHA</label><input id="stat-charisma" type="number" min="1" max="30" /></div>
        </div>
      </div>
      <div>
        <div class="detail-label">Saving Throws</div>
        <div class="stats-grid">
          ${SAVING_THROW_KEYS.map(key => `
            <div class="field-group">
              <label for="save-${key}">${labelFor(key)}</label>
              <input id="save-${key}" type="number" min="0" max="30" />
            </div>
          `).join('')}
        </div>
      </div>
      <div>
        <div class="detail-label">Skills</div>
        <div class="stats-grid">
          ${SKILL_KEYS.map(key => `
            <div class="field-group">
              <label for="skill-${key}">${labelFor(key)}</label>
              <input id="skill-${key}" type="number" min="0" max="30" />
            </div>
          `).join('')}
        </div>
      </div>
      <div>
        <div class="detail-label">Appearance</div>
        <div class="stats-grid">
          ${APPEARANCE_KEYS.map(key => `
            <div class="field-group">
              <label for="appearance-${key}">${labelFor(key)}</label>
              <input id="appearance-${key}" type="text" placeholder="${key === 'height' ? '170 cm' : key === 'weight' ? '70 kg' : ''}" />
            </div>
          `).join('')}
        </div>
      </div>
      <div class="field-group">
        <label for="npc-notes">Notes</label>
        <textarea id="npc-notes" rows="4" placeholder="Personality, role, or story hooks"></textarea>
      </div>
    `;

    wrapper.appendChild(form);
    npcDetailShell.appendChild(wrapper);

    form.querySelectorAll('input').forEach(input => input.addEventListener('input', syncForm));
document.getElementById('npc-notes').addEventListener('input', syncForm);
document.getElementById('add-sense-btn').addEventListener('click', () => addSense(npc));
// Accessibility: focus on name input when detail shell is built
setTimeout(() => {
  const nameInput = document.getElementById('npc-name');
  if (nameInput) nameInput.focus();
}, 0);

    const saveBtn = document.getElementById('save-npc-btn');
saveBtn.addEventListener('click', () => {
  saveNpc(getNpcKey(npc));
});
// Disable save button if name is empty
const nameInput = document.getElementById('npc-name');
function updateSaveBtnState() {
  saveBtn.disabled = !nameInput.value.trim();
}
nameInput.addEventListener('input', updateSaveBtnState);
updateSaveBtnState();

    document.getElementById('delete-npc-btn').addEventListener('click', () => {
      deleteNpc(getNpcKey(npc));
    });

    updateFormFields(npc);
  }

  function updateFormFields(npc) {
    document.getElementById('npc-name').value = npc.name || '';
    document.getElementById('npc-race').value = npc.race || '';
    document.getElementById('npc-gender').value = npc.gender || '';
    document.getElementById('npc-background').value = npc.background || '';
    document.getElementById('npc-size').value = npc.size || '';
    document.getElementById('npc-speed').value = npc.speed || '';
    document.getElementById('npc-armor-class').value = npc.armor_class != null ? npc.armor_class : '';
    document.getElementById('npc-hit-points').value = npc.hit_points != null ? npc.hit_points : '';
    renderSensesFields(npc);
    document.getElementById('npc-languages').value = npc.languages || '';
    document.getElementById('npc-notes').value = npc.notes || '';

    const stats = npc.stats || {};
    document.getElementById('stat-strength').value = stats.strength != null ? stats.strength : '';
    document.getElementById('stat-dexterity').value = stats.dexterity != null ? stats.dexterity : '';
    document.getElementById('stat-constitution').value = stats.constitution != null ? stats.constitution : '';
    document.getElementById('stat-intelligence').value = stats.intelligence != null ? stats.intelligence : '';
    document.getElementById('stat-wisdom').value = stats.wisdom != null ? stats.wisdom : '';
    document.getElementById('stat-charisma').value = stats.charisma != null ? stats.charisma : '';

    const savingThrows = npc.saving_throws || {};
    SAVING_THROW_KEYS.forEach(key => setInputValue(`save-${key}`, savingThrows[key]));

    const skills = npc.skills || {};
    SKILL_KEYS.forEach(key => setInputValue(`skill-${key}`, skills[key]));

    const appearance = npc.appearance || {};
    APPEARANCE_KEYS.forEach(key => setInputValue(`appearance-${key}`, appearance[key]));
  }

  function syncForm() {
    const npc = findNpcByKey(selectedNpcId);
    if (!npc) return;

    npc.name = getInputValue('npc-name');
    npc.race = getInputValue('npc-race');
    npc.gender = getInputValue('npc-gender');
    npc.background = getInputValue('npc-background');
    npc.size = getInputValue('npc-size');
    npc.speed = getInputValue('npc-speed');
    npc.armor_class = parseIntegerValue(getInputValue('npc-armor-class'));
    npc.hit_points = parseIntegerValue(getInputValue('npc-hit-points'));
    npc.languages = getInputValue('npc-languages');
    npc.notes = getInputValue('npc-notes');

    if (!Array.isArray(npc.senses)) {
      npc.senses = [];
    }
    npc.senses = npc.senses.filter(sense => (sense.type || sense.range));

    npc.stats = {
      strength: parseIntegerValue(getInputValue('stat-strength')),
      dexterity: parseIntegerValue(getInputValue('stat-dexterity')),
      constitution: parseIntegerValue(getInputValue('stat-constitution')),
      intelligence: parseIntegerValue(getInputValue('stat-intelligence')),
      wisdom: parseIntegerValue(getInputValue('stat-wisdom')),
      charisma: parseIntegerValue(getInputValue('stat-charisma'))
    };

    const savingThrows = {};
    SAVING_THROW_KEYS.forEach(key => {
      const value = parseIntegerValue(getInputValue(`save-${key}`));
      if (value != null) savingThrows[key] = value;
    });
    npc.saving_throws = Object.keys(savingThrows).length ? savingThrows : null;

    const skills = {};
    SKILL_KEYS.forEach(key => {
      const value = parseIntegerValue(getInputValue(`skill-${key}`));
      if (value != null) skills[key] = value;
    });
    npc.skills = Object.keys(skills).length ? skills : null;

    const appearance = {};
    APPEARANCE_KEYS.forEach(key => {
      const value = getInputValue(`appearance-${key}`);
      if (value) appearance[key] = value;
    });
    npc.appearance = Object.keys(appearance).length ? appearance : null;

    renderNpcList();
    updateDetailHeader(npc);
  }

  function parseIntegerValue(value) {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  function saveJsonField(text, fallback) {
    if (!text) return null;
    const parsed = parseJsonField(text);
    if (parsed !== null && typeof parsed === 'object') {
      return parsed;
    }
    return fallback || null;
  }

  function updateDetailHeader(npc) {
    const title = npcDetailShell.querySelector('.detail-title');
    const subtitle = npcDetailShell.querySelector('.detail-subtitle');
    if (title) title.textContent = npc.name || 'New NPC';
    if (subtitle) subtitle.textContent = formatListSubtitle(npc) || 'Fill the form to create a character.';
  }

  function buildNpcPayload(npc) {
    return {
      name: npc.name || null,
      race: npc.race || null,
      gender: npc.gender || null,
      background: npc.background || null,
      size: npc.size || null,
      stats: npc.stats || {},
      armor_class: npc.armor_class != null ? npc.armor_class : null,
      hit_points: npc.hit_points != null ? npc.hit_points : null,
      speed: npc.speed || null,
      saving_throws: npc.saving_throws || {},
      skills: npc.skills || {},
      senses: npc.senses || [],
      languages: npc.languages || null,
      appearance: npc.appearance || {},
      notes: npc.notes || null
    };
  }

  async function saveNpc(key) {
    const npc = findNpcByKey(key);
    if (!npc) return;
    if (!npc.name) {
      showMessage('NPC must have a name before saving.');
      return;
    }

    const payload = buildNpcPayload(npc);
    const method = npc.id != null ? 'PUT' : 'POST';
    const endpoint = npc.id != null ? `${API_DATA_PATH}/${npc.id}` : API_DATA_PATH;

    try {
      let savedNpc;
      if (npc.id != null) {
        savedNpc = await window.ApiHelpers.ApiService.updateNpc(npc.id, payload);
      } else {
        savedNpc = await window.ApiHelpers.ApiService.createNpc(payload);
      }

      if (npc.id == null) {
        delete npc.temp_id;
      }
      Object.assign(npc, savedNpc);
      selectedNpcId = getNpcKey(npc);
      renderNpcList();
      buildDetailShell(npc);
      showMessage('NPC saved.');
    } catch (error) {
      console.error(error);
      showMessage('Unable to save NPC.');
    }
  }

  function selectNpc(key) {
    selectedNpcId = key;
    renderNpcList();
    const npc = findNpcByKey(key);
    if (!npc) {
      renderPlaceholder('Select or add an NPC to edit its fields.');
      return;
    }
    buildDetailShell(npc);
  }

  async function deleteNpc(key) {
    const index = npcs.findIndex(npc => getNpcKey(npc) === key);
    if (index === -1) return;
    const npc = npcs[index];
    if (!window.confirm('Are you sure you want to delete this NPC? This action cannot be undone.')) {
      return;
    }
    if (npc.id != null) {
      try {
        await window.ApiHelpers.ApiService.deleteNpc(npc.id);
      } catch (err) {
        console.error(err);
        showMessage('Unable to delete NPC.');
        return;
      }
    }
    npcs.splice(index, 1);
    selectedNpcId = null;
    renderNpcList();
    renderPlaceholder('Select or add an NPC to edit its fields.');
    showMessage('NPC deleted.');
  }

  function addNewNpc() {
    const newNpc = {
      temp_id: nextTempId++,
      name: '',
      race: '',
      gender: '',
      background: '',
      size: '',
      stats: {
        strength: null,
        dexterity: null,
        constitution: null,
        intelligence: null,
        wisdom: null,
        charisma: null
      },
      armor_class: null,
      hit_points: null,
      speed: '',
      saving_throws: null,
      skills: null,
      senses: [],
      languages: '',
      appearance: null,
      notes: ''
    };
    npcs.unshift(newNpc);
    selectNpc(getNpcKey(newNpc));
    renderNpcList();
  }

  function exportNpcs() {
    const data = JSON.stringify(npcs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'npc-editor-export.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showMessage('NPC list exported as JSON.');
  }

  function renderPlaceholder(message) {
    npcDetailShell.innerHTML = `<div class="placeholder">${escapeHtml(message || 'Select or add an NPC to edit its fields.')}</div>`;
  }

  async function loadNpcs() {
    try {
      let npcData;
      try {
        npcData = await window.ApiHelpers.ApiService.getNpcs();
      } catch (apiError) {
        const fallbackResponse = await fetch(FALLBACK_DATA_PATH);
        if (!fallbackResponse.ok) throw apiError;
        npcData = await fallbackResponse.json();
      }
      npcs = npcData;
      npcs.forEach(npc => {
        if (npc.id == null) {
          npc.temp_id = nextTempId++;
        }
      });
      renderNpcList();
      renderPlaceholder('Select or add an NPC to edit its fields.');
    } catch (error) {
      npcListEl.innerHTML = `<div class="placeholder">Unable to load NPC data. ${escapeHtml(error.message)}</div>`;
      npcCountEl.textContent = '0 NPCs';
    }
  }

  searchInput.addEventListener('input', () => {
    renderNpcList();
    // If the selected NPC is not in the filtered list, clear the detail panel
    const visible = filterNpcs();
    if (!visible.find(npc => getNpcKey(npc) === selectedNpcId)) {
      if (visible.length) {
        selectNpc(getNpcKey(visible[0]));
      } else {
        renderPlaceholder('No NPCs match your search.');
      }
    }
  });
  newNpcBtn.addEventListener('click', addNewNpc);
  exportNpcsBtn.addEventListener('click', exportNpcs);

  await loadNpcs();
});
