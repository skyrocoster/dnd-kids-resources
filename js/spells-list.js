// Spell list-style page demo with inline edit mode.

document.addEventListener('DOMContentLoaded', async function() {
  const container = document.getElementById('page-container');
  const rangeSelect = document.getElementById('range-display-mode');
  const editModeButton = document.getElementById('spell-edit-mode-btn');
  const modal = document.getElementById('spell-edit-modal');
  const modalTitle = document.getElementById('spell-edit-title');
  const modalStatus = document.getElementById('spell-edit-status');
  const modalFields = document.getElementById('spell-edit-fields');
  const modalForm = document.getElementById('spell-edit-form');
  const modalClose = document.getElementById('spell-edit-close');
  const modalCancel = document.getElementById('spell-edit-cancel');
  const modalSave = document.getElementById('spell-edit-save');

  let spells = [];
  let editModeEnabled = false;
  let editingSpellId = null;
  let resetHiddenBtn = null;
  let structuredEditorsContainer = null;
  let availableClassOptions = [];
  let availableComponentOptions = [];

  const editorFields = [
    { key: 'spell_name', label: 'Spell Name', type: 'text' },
    { key: 'icon', label: 'Icon', type: 'text' },
    { key: 'level', label: 'Level', type: 'text' },
    { key: 'school', label: 'School', type: 'text' },
    { key: 'casting_time', label: 'Casting Time', type: 'text' },
    { key: 'duration', label: 'Duration', type: 'text' },
    { key: 'concentration', label: 'Concentration', type: 'checkbox' },
    { key: 'ritual', label: 'Ritual', type: 'checkbox' },
    { key: 'range', label: 'Range', type: 'textarea', rows: 2 },
    { key: 'materials', label: 'Materials', type: 'textarea', rows: 2 },
    { key: 'heal_at_spell_slots', label: 'Heal At Spell Slots JSON', type: 'textarea', rows: 3 },
    { key: 'higher_levels', label: 'Higher Levels JSON', type: 'textarea', rows: 3 },
    { key: 'damage_at_higher_levels', label: 'Damage At Higher Levels JSON', type: 'textarea', rows: 3 },
    { key: 'spell_alt_text', label: 'Alt Text', type: 'textarea', rows: 3 },
    { key: 'spell_text', label: 'Spell Text', type: 'textarea', rows: 8 }
  ];

  await fetchClassOptions();
  await fetchComponentOptions();
  buildEditorFields();

  try {
    setupResetHiddenButton();
    setupRangeSelector();
    setupEditMode();
    setupModalEvents();
    await loadSpells();
  } catch (error) {
    console.error('Error loading spell list:', error);
    if (container) {
      container.innerHTML = `<div style="padding: 20px; color: #800;">Error loading spells: ${error.message}</div>`;
    }
  }

  function buildEditorFields() {
    if (!modalFields) return;
    modalFields.innerHTML = '';
    structuredEditorsContainer = document.createElement('div');
    structuredEditorsContainer.className = 'spell-edit-fields';
    structuredEditorsContainer.style.display = 'contents';
    modalFields.appendChild(structuredEditorsContainer);

    buildStructuredEditors();

    editorFields.forEach(field => {
      const wrapper = document.createElement('div');
      wrapper.className = 'spell-edit-field';
      if (field.type === 'textarea') {
        wrapper.classList.add('full-width');
      }
      if (field.type === 'checkbox') {
        wrapper.classList.add('spell-edit-checkbox');
      }

      const inputId = `spell-edit-${field.key}`;
      const label = document.createElement('label');
      label.setAttribute('for', inputId);
      label.textContent = field.label;

      let input;
      if (field.type === 'textarea') {
        input = document.createElement('textarea');
        input.rows = field.rows || 3;
      } else {
        input = document.createElement('input');
        input.type = field.type === 'checkbox' ? 'checkbox' : 'text';
      }

      input.id = inputId;
      input.name = field.key;
      input.setAttribute('data-field-key', field.key);

      if (field.type === 'checkbox') {
        wrapper.appendChild(input);
        wrapper.appendChild(label);
      } else {
        wrapper.appendChild(label);
        wrapper.appendChild(input);
      }

      modalFields.appendChild(wrapper);
    });
  }

  function buildStructuredEditors() {
    appendListEditor('classes', 'Classes', 'Choose one or more classes from the database list');
    appendComponentsEditor();
    appendListEditor('subclasses', 'Subclasses', 'Comma-separated subclass names');
    appendAreaEditor();
    appendRollSection('attack_type', 'Attack Rows', 'Split attack entries into one row per attack/save.', 'Add Attack');
    appendRollSection('damage', 'Damage Rows', 'Split damage entries into one row per damage roll.', 'Add Damage');
    appendRollSection('heal', 'Heal Rows', 'Split heal entries into one row per heal definition.', 'Add Heal');
  }

  async function fetchClassOptions() {
    try {
      const response = await fetch('/api/classes');
      if (!response.ok) {
        throw new Error('Failed to load class list');
      }
      availableClassOptions = await response.json();
      availableClassOptions.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      availableClassOptions = [];
      console.warn('Could not fetch class options:', error);
    }
  }

  async function fetchComponentOptions() {
    try {
      const response = await fetch('/api/spell-components');
      if (!response.ok) {
        throw new Error('Failed to load component list');
      }
      availableComponentOptions = await response.json();
      availableComponentOptions.sort((a, b) => String(a).localeCompare(String(b)));
    } catch (error) {
      availableComponentOptions = [];
      console.warn('Could not fetch component options:', error);
    }
  }

  function appendListEditor(key, title, note) {
    const wrapper = document.createElement('div');
    wrapper.className = 'spell-edit-field full-width';

    const isClassSelector = key === 'classes' && availableClassOptions.length > 0;
    const inputId = isClassSelector ? `spell-edit-${key}-select` : `spell-edit-${key}-csv`;

    const label = document.createElement('label');
    label.setAttribute('for', inputId);
    label.textContent = title;

    let input;
    if (isClassSelector) {
      input = document.createElement('select');
      input.id = inputId;
      input.setAttribute('data-structured-field', key);
      input.setAttribute('multiple', 'multiple');
      input.size = Math.min(availableClassOptions.length, 8);
      availableClassOptions.forEach(cls => {
        const option = document.createElement('option');
        option.value = cls.code;
        option.textContent = `${cls.emoji ? cls.emoji + ' ' : ''}${cls.name}`;
        input.appendChild(option);
      });
    } else {
      input = document.createElement('input');
      input.type = 'text';
      input.id = inputId;
      input.setAttribute('data-structured-field', key);
      input.placeholder = key === 'classes' ? 'wizard, sorcerer' : '';
    }

    const help = document.createElement('div');
    help.className = 'spell-edit-empty';
    help.textContent = note;

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    wrapper.appendChild(help);
    structuredEditorsContainer.appendChild(wrapper);
  }

  function appendComponentsEditor() {
    const wrapper = document.createElement('div');
    wrapper.className = 'spell-edit-field full-width';

    const label = document.createElement('label');
    label.textContent = 'Components';
    wrapper.appendChild(label);

    if (availableComponentOptions.length > 0) {
      const list = document.createElement('div');
      list.className = 'spell-edit-checkbox-list';
      availableComponentOptions.forEach(component => {
        const optionLabel = document.createElement('label');
        optionLabel.className = 'spell-edit-checkbox';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = component;
        checkbox.setAttribute('data-structured-field', 'components');
        checkbox.setAttribute('data-components-checkbox', 'true');

        optionLabel.appendChild(checkbox);
        optionLabel.appendChild(document.createTextNode(` ${component}`));
        list.appendChild(optionLabel);
      });

      wrapper.appendChild(list);
    } else {
      const fallback = document.createElement('input');
      fallback.type = 'text';
      fallback.id = 'spell-edit-components-csv';
      fallback.setAttribute('data-structured-field', 'components');
      fallback.placeholder = 'V, S, M';
      wrapper.appendChild(fallback);
    }

    const help = document.createElement('div');
    help.className = 'spell-edit-empty';
    help.textContent = 'Select the component values from the database list.';
    wrapper.appendChild(help);
    structuredEditorsContainer.appendChild(wrapper);
  }

  function appendAreaEditor() {
    const section = createSectionShell('Area Of Effect', 'Split the area into a shape and optional size. Leave size blank for null values.');
    const grid = document.createElement('div');
    grid.className = 'spell-edit-inline-grid';

    grid.appendChild(createSubField('Shape', 'text', 'spell-edit-area-shape', 'data-area-field', 'shape'));
    grid.appendChild(createSubField('Size', 'text', 'spell-edit-area-size', 'data-area-field', 'size'));
    section.appendChild(grid);
    structuredEditorsContainer.appendChild(section);
  }

  function appendRollSection(key, title, note, buttonLabel) {
    const shell = createSectionShell(title, note, buttonLabel, function() {
      addRollRow(key);
    });
    const rowList = document.createElement('div');
    rowList.className = 'spell-edit-row-list';
    rowList.id = `spell-edit-${key}-rows`;
    shell.appendChild(rowList);
    structuredEditorsContainer.appendChild(shell);
  }

  function createSectionShell(title, note, buttonLabel, onAdd) {
    const wrapper = document.createElement('div');
    wrapper.className = 'spell-edit-section';

    const header = document.createElement('div');
    header.className = 'spell-edit-section-header';

    const heading = document.createElement('h3');
    heading.className = 'spell-edit-section-title';
    heading.textContent = title;
    header.appendChild(heading);

    if (buttonLabel && onAdd) {
      const addButton = document.createElement('button');
      addButton.type = 'button';
      addButton.className = 'spell-edit-section-add';
      addButton.textContent = buttonLabel;
      addButton.addEventListener('click', onAdd);
      header.appendChild(addButton);
    }

    wrapper.appendChild(header);

    if (note) {
      const noteElement = document.createElement('p');
      noteElement.className = 'spell-edit-section-note';
      noteElement.textContent = note;
      wrapper.appendChild(noteElement);
    }

    return wrapper;
  }

  function createSubField(labelText, inputType, inputId, attrName, attrValue) {
    const wrapper = document.createElement('div');
    wrapper.className = 'spell-edit-subfield';

    const label = document.createElement('label');
    label.setAttribute('for', inputId);
    label.textContent = labelText;

    const input = document.createElement('input');
    input.type = inputType;
    input.id = inputId;
    input.setAttribute(attrName, attrValue);

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    return wrapper;
  }

  function addRollRow(sectionKey, rowData = {}) {
    const rowList = document.getElementById(`spell-edit-${sectionKey}-rows`);
    if (!rowList) return;

    const rowCard = document.createElement('div');
    rowCard.className = 'spell-edit-row-card';
    rowCard.setAttribute('data-roll-section', sectionKey);

    const grid = document.createElement('div');
    grid.className = 'spell-edit-row-grid';

    grid.appendChild(createRollRowField('Name', 'name', rowData.name || ''));
    grid.appendChild(createRollRowField('Damage / Amount', 'damage', rowData.damage || rowData.amount || ''));
    grid.appendChild(createRollRowField('Type', 'type', rollValueToInput(rowData.type)));
    grid.appendChild(createRollRowField('Save', 'save', rollValueToInput(rowData.save)));
    grid.appendChild(createRollRowField('Save Success', 'save_success', rowData.save_success || ''));
    grid.appendChild(createRollRowField('Modifier / Extra', 'mod', rowData.MOD || rowData.mod || ''));

    rowCard.appendChild(grid);

    const actions = document.createElement('div');
    actions.className = 'spell-edit-row-actions';
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'spell-edit-row-remove';
    removeButton.textContent = 'Remove Row';
    removeButton.addEventListener('click', function() {
      rowCard.remove();
      ensureEmptyState(sectionKey);
    });
    actions.appendChild(removeButton);
    rowCard.appendChild(actions);

    clearEmptyState(sectionKey);
    rowList.appendChild(rowCard);
  }

  function createRollRowField(labelText, fieldKey, value) {
    const wrapper = document.createElement('div');
    wrapper.className = 'spell-edit-subfield';

    const label = document.createElement('label');
    label.textContent = labelText;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = value || '';
    input.setAttribute('data-roll-field', fieldKey);

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    return wrapper;
  }

  function rollValueToInput(value) {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return value || '';
  }

  function clearEmptyState(sectionKey) {
    const rowList = document.getElementById(`spell-edit-${sectionKey}-rows`);
    if (!rowList) return;
    const emptyState = rowList.querySelector('.spell-edit-empty');
    if (emptyState) {
      emptyState.remove();
    }
  }

  function ensureEmptyState(sectionKey) {
    const rowList = document.getElementById(`spell-edit-${sectionKey}-rows`);
    if (!rowList) return;
    if (rowList.children.length > 0) return;
    const emptyState = document.createElement('div');
    emptyState.className = 'spell-edit-empty';
    emptyState.textContent = 'No rows added.';
    rowList.appendChild(emptyState);
  }

  function parseJsonValue(value, fallback) {
    if (!value) return fallback;
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  function setupResetHiddenButton() {
    const existingPrintOptions = document.getElementById('print-options');
    if (!existingPrintOptions) return;

    resetHiddenBtn = document.createElement('button');
    resetHiddenBtn.id = 'reset-hidden-btn';
    resetHiddenBtn.type = 'button';
    resetHiddenBtn.textContent = 'Reset Hidden Cards';
    resetHiddenBtn.style.marginTop = '12px';
    resetHiddenBtn.style.padding = '8px 12px';
    resetHiddenBtn.style.backgroundColor = '#e74c3c';
    resetHiddenBtn.style.color = 'white';
    resetHiddenBtn.style.border = 'none';
    resetHiddenBtn.style.borderRadius = '8px';
    resetHiddenBtn.style.cursor = 'pointer';
    resetHiddenBtn.style.fontSize = '12px';
    resetHiddenBtn.style.fontWeight = '700';
    resetHiddenBtn.addEventListener('click', function(e) {
      e.preventDefault();
      localStorage.removeItem('hidden_cards');
      renderSpellList();
      this.style.display = 'none';
    });

    const hiddenCards = getHiddenCardIds();
    resetHiddenBtn.style.display = hiddenCards.length > 0 ? 'inline-block' : 'none';
    existingPrintOptions.appendChild(resetHiddenBtn);
  }

  function setupRangeSelector() {
    const rangeDisplayMode = localStorage.getItem('range_display_mode') || 'standard';
    if (!rangeSelect) return;

    rangeSelect.value = rangeDisplayMode;
    rangeSelect.addEventListener('change', function() {
      localStorage.setItem('range_display_mode', this.value);
      renderSpellList();
    });
  }

  function setupEditMode() {
    if (!editModeButton) return;

    editModeButton.addEventListener('click', function() {
      editModeEnabled = !editModeEnabled;
      editModeButton.textContent = editModeEnabled ? '✓ Edit Mode ON' : '✎ Edit Mode OFF';
      editModeButton.classList.toggle('active', editModeEnabled);
      renderSpellList();
    });
  }

  function setupModalEvents() {
    if (!modal || !modalForm || !modalClose || !modalCancel || !modalSave) return;

    modalClose.addEventListener('click', closeEditModal);
    modalCancel.addEventListener('click', closeEditModal);

    modal.addEventListener('click', function(event) {
      if (event.target === modal) {
        closeEditModal();
      }
    });

    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape' && modal.classList.contains('visible')) {
        closeEditModal();
      }
    });

    modalForm.addEventListener('submit', async function(event) {
      event.preventDefault();
      await saveSpellEdits();
    });
  }

  async function loadSpells() {
    const response = await fetch('/api/spells');
    if (!response.ok) {
      throw new Error(`Failed to load spells from API: ${response.status}`);
    }

    const nextSpells = await response.json();
    if (!Array.isArray(nextSpells)) {
      throw new Error('Invalid spell data returned from API');
    }

    spells = nextSpells;
    renderSpellList();
  }

  function normalizeLevel(level) {
    if (typeof level === 'number') return level;
    if (typeof level === 'string') {
      if (level.toLowerCase() === 'cantrip') return 0;
      const match = level.match(/\d+/);
      return match ? parseInt(match[0], 10) : Number.MAX_SAFE_INTEGER;
    }
    return Number.MAX_SAFE_INTEGER;
  }

  function normalizeSpellClasses(classes) {
    if (Array.isArray(classes)) {
      return classes.map(cls => typeof cls === 'string' ? cls.trim() : '').filter(Boolean);
    }
    if (typeof classes === 'string') {
      return classes
        .split(/[,|;]+/)
        .map(cls => cls.trim())
        .filter(Boolean);
    }
    return [];
  }


  function getHiddenCardIds() {
    return JSON.parse(localStorage.getItem('hidden_cards') || '[]');
  }

  function getSpellCardId(spell) {
    return spell.id ? `card-${spell.id}` : `card-${String(spell.title || spell.name || '').toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  }

  function renderSpellList() {
    container.innerHTML = '';

    const sortedSpells = [...spells].sort((a, b) => {
      const levelA = normalizeLevel(a.level);
      const levelB = normalizeLevel(b.level);
      if (levelA !== levelB) return levelA - levelB;
      return String(a.title || a.name || '').localeCompare(String(b.title || b.name || ''));
    });

    const hiddenCards = getHiddenCardIds();
    const filteredSpells = sortedSpells.filter(spell => {
      const spellId = getSpellCardId(spell);
      return !hiddenCards.includes(spellId);
    });

    renderListCards(
      '#page-container',
      filteredSpells,
      'Spell Cards — List View',
      'Flexible A4 horizontal width with vertical stacking',
      renderSpellList
    );

    if (editModeEnabled) {
      addEditButtons(filteredSpells);
    }

    if (resetHiddenBtn) {
      resetHiddenBtn.style.display = hiddenCards.length > 0 ? 'inline-block' : 'none';
    }
  }

  function addEditButtons(renderedSpells) {
    const spellMap = new Map(renderedSpells.map(spell => [getSpellCardId(spell), spell]));
    const cards = container.querySelectorAll('.card');

    cards.forEach(card => {
      const spell = spellMap.get(card.id);
      if (!spell) return;

      card.style.position = 'relative';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'spell-edit-btn';
      button.textContent = 'Edit';
      button.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
        openEditModal(spell);
      });

      card.appendChild(button);
    });
  }

  async function openEditModal(spell) {
    if (!spell || !spell.id) {
      setModalStatus('This spell cannot be edited because it has no database id.', 'error');
      return;
    }

    editingSpellId = spell.id;
    modalTitle.textContent = `Edit Spell: ${spell.title || spell.name || 'Unknown'}`;
    setModalStatus('Loading spell...', '');
    modal.classList.add('visible');
    modal.setAttribute('aria-hidden', 'false');

    try {
      const response = await fetch(`/api/spells/id/${spell.id}/raw`);
      if (!response.ok) {
        throw new Error(`Failed to load spell for editing: ${response.status}`);
      }

      const rawSpell = await response.json();
      populateEditForm(rawSpell);
      setModalStatus('Editing database fields directly. JSON fields accept raw JSON.', '');
    } catch (error) {
      setModalStatus(error.message, 'error');
    }
  }

  function closeEditModal() {
    editingSpellId = null;
    modal.classList.remove('visible');
    modal.setAttribute('aria-hidden', 'true');
    modalForm.reset();
    modalSave.disabled = false;
    setModalStatus('', '');
    ['attack_type', 'damage', 'heal'].forEach(clearRollRows);
  }

  function populateEditForm(spellData) {
    ['attack_type', 'damage', 'heal'].forEach(clearRollRows);

    editorFields.forEach(field => {
      const input = modalForm.querySelector(`[data-field-key="${field.key}"]`);
      if (!input) return;

      if (field.type === 'checkbox') {
        input.checked = Boolean(spellData[field.key]);
      } else {
        input.value = spellData[field.key] ?? '';
      }
    });

    const classesSelect = modalForm.querySelector('[data-structured-field="classes"]');
    const subclassesInput = modalForm.querySelector('[data-structured-field="subclasses"]');
    if (classesSelect && classesSelect.tagName === 'SELECT') {
      Array.from(classesSelect.options).forEach(opt => { opt.selected = false; });
      const selectedClasses = parseJsonValue(spellData.classes, null);
      const classValues = Array.isArray(selectedClasses)
        ? selectedClasses
        : typeof spellData.classes === 'string'
          ? spellData.classes.split(/[,|;]+/).map(s => s.trim()).filter(Boolean)
          : [];
      classValues.forEach(cls => {
        const opt = Array.from(classesSelect.options).find(o => o.value === cls);
        if (opt) opt.selected = true;
      });
    } else if (classesSelect) {
      classesSelect.value = formatListEditorValue(spellData.classes);
    }
    if (subclassesInput) {
      subclassesInput.value = formatListEditorValue(spellData.subclasses);
    }

    const componentCheckboxes = modalForm.querySelectorAll('[data-components-checkbox]');
    if (componentCheckboxes.length > 0) {
      const selectedComponents = parseJsonValue(spellData.components, null);
      const componentValues = Array.isArray(selectedComponents)
        ? selectedComponents
        : typeof spellData.components === 'string'
          ? spellData.components.split(/[,|;]+/).map(s => s.trim()).filter(Boolean)
          : [];
      componentCheckboxes.forEach(checkbox => {
        checkbox.checked = componentValues.includes(checkbox.value);
      });
    } else {
      const componentsInput = modalForm.querySelector('[data-structured-field="components"]');
      if (componentsInput) {
        componentsInput.value = formatListEditorValue(spellData.components);
      }
    }

    const areaData = parseJsonValue(spellData.area_of_effect, {});
    const areaShapeInput = modalForm.querySelector('[data-area-field="shape"]');
    const areaSizeInput = modalForm.querySelector('[data-area-field="size"]');
    if (areaShapeInput && areaSizeInput) {
      const entries = Object.entries(areaData || {});
      if (entries.length > 0) {
        areaShapeInput.value = entries[0][0] || '';
        areaSizeInput.value = entries[0][1] == null ? '' : String(entries[0][1]);
      } else {
        areaShapeInput.value = '';
        areaSizeInput.value = '';
      }
    }

    populateRollSection('attack_type', spellData.attack_type);
    populateRollSection('damage', spellData.damage);
    populateRollSection('heal', spellData.heal);
  }

  function clearRollRows(sectionKey) {
    const rowList = document.getElementById(`spell-edit-${sectionKey}-rows`);
    if (!rowList) return;
    rowList.innerHTML = '';
    ensureEmptyState(sectionKey);
  }

  function populateRollSection(sectionKey, rawValue) {
    clearRollRows(sectionKey);
    const parsed = parseJsonValue(rawValue, null);
    const entries = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === 'object' ? [parsed] : []);
    if (entries.length === 0) {
      return;
    }
    entries.forEach(entry => addRollRow(sectionKey, entry));
  }

  function formatListEditorValue(rawValue) {
    const parsed = parseJsonValue(rawValue, null);
    if (Array.isArray(parsed)) {
      return parsed.join(', ');
    }
    if (typeof rawValue === 'string') {
      return rawValue;
    }
    return '';
  }

  function collectEditFormData() {
    const payload = {};
    editorFields.forEach(field => {
      const input = modalForm.querySelector(`[data-field-key="${field.key}"]`);
      if (!input) return;
      payload[field.key] = field.type === 'checkbox' ? input.checked : input.value;
    });

    const classesSelect = modalForm.querySelector('[data-structured-field="classes"]');
    if (classesSelect && classesSelect.tagName === 'SELECT') {
      const selected = Array.from(classesSelect.selectedOptions).map(option => option.value);
      payload.classes = selected.length > 0 ? JSON.stringify(selected) : '';
    } else {
      payload.classes = serializeListField('classes');
    }

    const componentCheckboxes = modalForm.querySelectorAll('[data-components-checkbox]');
    if (componentCheckboxes.length > 0) {
      const selected = Array.from(componentCheckboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value);
      payload.components = selected.length > 0 ? JSON.stringify(selected) : '';
    } else {
      payload.components = serializeListField('components');
    }

    payload.subclasses = serializeListField('subclasses');
    payload.area_of_effect = serializeAreaField();
    payload.attack_type = serializeRollSection('attack_type');
    payload.damage = serializeRollSection('damage');
    payload.heal = serializeRollSection('heal');

    return payload;
  }

  function serializeListField(key) {
    const input = modalForm.querySelector(`[data-structured-field="${key}"]`);
    if (!input) return '';
    const items = input.value.split(',').map(item => item.trim()).filter(Boolean);
    return items.length > 0 ? JSON.stringify(items) : '';
  }

  function serializeAreaField() {
    const shapeInput = modalForm.querySelector('[data-area-field="shape"]');
    const sizeInput = modalForm.querySelector('[data-area-field="size"]');
    if (!shapeInput || !shapeInput.value.trim()) {
      return '';
    }

    const area = {};
    const sizeValue = sizeInput && sizeInput.value.trim() ? sizeInput.value.trim() : null;
    area[shapeInput.value.trim()] = sizeValue;
    return JSON.stringify(area);
  }

  function serializeRollSection(sectionKey) {
    const rowList = document.getElementById(`spell-edit-${sectionKey}-rows`);
    if (!rowList) return '';

    const rows = Array.from(rowList.querySelectorAll('[data-roll-section]'));
    const serialized = rows.map(row => {
      const entry = {};
      row.querySelectorAll('[data-roll-field]').forEach(input => {
        const fieldKey = input.getAttribute('data-roll-field');
        const rawValue = input.value.trim();
        if (!rawValue) return;

        if (fieldKey === 'type' || fieldKey === 'save') {
          const splitValues = rawValue.split(',').map(value => value.trim()).filter(Boolean);
          if (splitValues.length > 1) {
            entry[fieldKey] = splitValues;
          } else {
            entry[fieldKey] = splitValues.length === 1 ? splitValues[0] : rawValue;
          }
        } else if (fieldKey === 'damage') {
          entry[sectionKey === 'heal' ? 'amount' : 'damage'] = rawValue;
        } else if (fieldKey === 'mod') {
          entry.MOD = rawValue;
        } else {
          entry[fieldKey] = rawValue;
        }
      });
      return entry;
    }).filter(entry => Object.keys(entry).length > 0);

    if (serialized.length === 0) {
      return '';
    }

    return JSON.stringify(serialized);
  }

  async function saveSpellEdits() {
    if (!editingSpellId) return;

    modalSave.disabled = true;
    setModalStatus('Saving spell...', '');

    try {
      const response = await fetch(`/api/spells/id/${editingSpellId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(collectEditFormData())
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || `Failed to save spell: ${response.status}`);
      }

      setModalStatus('Spell saved. Reloading list...', 'success');
      await loadSpells();
      closeEditModal();
    } catch (error) {
      setModalStatus(error.message, 'error');
      modalSave.disabled = false;
    }
  }

  function setModalStatus(message, status) {
    if (!modalStatus) return;
    modalStatus.textContent = message;
    modalStatus.classList.remove('error', 'success');
    if (status) {
      modalStatus.classList.add(status);
    }
  }
});