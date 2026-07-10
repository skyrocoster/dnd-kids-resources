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

  const ATTACK_TYPE_OPTIONS = [
    { value: '', label: '— (save only)' },
    { value: 'melee', label: 'Melee' },
    { value: 'ranged', label: 'Ranged' },
    { value: 'spell', label: 'Spell' }
  ];

  const LEVEL_OPTIONS = [
    { value: '0', label: 'Cantrip' },
    { value: '1', label: '1st Level' }, { value: '2', label: '2nd Level' },
    { value: '3', label: '3rd Level' }, { value: '4', label: '4th Level' },
    { value: '5', label: '5th Level' }, { value: '6', label: '6th Level' },
    { value: '7', label: '7th Level' }, { value: '8', label: '8th Level' },
    { value: '9', label: '9th Level' }
  ];

  const SCHOOL_OPTIONS = [
    { value: '', label: '— (none)' },
    { value: 'abjuration', label: 'Abjuration' },
    { value: 'conjuration', label: 'Conjuration' },
    { value: 'divination', label: 'Divination' },
    { value: 'enchantment', label: 'Enchantment' },
    { value: 'evocation', label: 'Evocation' },
    { value: 'illusion', label: 'Illusion' },
    { value: 'necromancy', label: 'Necromancy' },
    { value: 'transmutation', label: 'Transmutation' }
  ];

  const RANGE_OPTIONS = [
    { value: '', label: '— (none)' },
    { value: 'Self', label: 'Self' },
    { value: 'Touch', label: 'Touch' },
    { value: '5 feet', label: '5 feet' },
    { value: '10 feet', label: '10 feet' },
    { value: '15 feet', label: '15 feet' },
    { value: '20 feet', label: '20 feet' },
    { value: '30 feet', label: '30 feet' },
    { value: '60 feet', label: '60 feet' },
    { value: '90 feet', label: '90 feet' },
    { value: '120 feet', label: '120 feet' },
    { value: '150 feet', label: '150 feet' },
    { value: '300 feet', label: '300 feet' },
    { value: '500 feet', label: '500 feet' },
    { value: '1 mile', label: '1 mile' },
    { value: 'Sight', label: 'Sight' },
    { value: 'Unlimited', label: 'Unlimited' },
    { value: '_custom', label: 'Custom...' }
  ];

  const CASTING_TIME_OPTIONS = [
    { value: '', label: '— (none)' },
    { value: '1 action', label: '1 action' },
    { value: '1 bonus action', label: '1 bonus action' },
    { value: '1 reaction', label: '1 reaction' },
    { value: '1 minute', label: '1 minute' },
    { value: '10 minutes', label: '10 minutes' },
    { value: '1 hour', label: '1 hour' },
    { value: '8 hours', label: '8 hours' },
    { value: '12 hours', label: '12 hours' },
    { value: '24 hours', label: '24 hours' },
    { value: '_custom', label: 'Custom...' }
  ];

  const DURATION_OPTIONS = [
    { value: '', label: '— (none)' },
    { value: 'Instantaneous', label: 'Instantaneous' },
    { value: '1 round', label: '1 round' },
    { value: '6 rounds', label: '6 rounds' },
    { value: '1 minute', label: '1 minute' },
    { value: '10 minutes', label: '10 minutes' },
    { value: '1 hour', label: '1 hour' },
    { value: '2 hours', label: '2 hours' },
    { value: '8 hours', label: '8 hours' },
    { value: '24 hours', label: '24 hours' },
    { value: '7 days', label: '7 days' },
    { value: '10 days', label: '10 days' },
    { value: '30 days', label: '30 days' },
    { value: 'Until dispelled', label: 'Until dispelled' },
    { value: 'Special', label: 'Special' },
    { value: '_custom', label: 'Custom...' }
  ];

  let spells = [];
  let editModeEnabled = false;
  let editingSpellId = null;
  let resetHiddenBtn = null;
  let structuredEditorsContainer = null;
  let availableClassOptions = [];
  let availableComponentOptions = [];
  let availableDamageTypes = [];
  let availableAbilities = [];

  if (window.PageBase && typeof window.PageBase.autoInitializeViewerPane === 'function') {
    window.PageBase.autoInitializeViewerPane('spellCardsList');
    window.PageBase.addToolButton('New Spell', 'addNewSpellBtn', openNewSpellModal);
  }

  const editorFields = [
    { key: 'spell_name', label: 'Spell Name', type: 'text' },
    { key: 'icon', label: 'Icon', type: 'text' },
    { key: 'level', label: 'Level', type: 'select', options: LEVEL_OPTIONS },
    { key: 'school', label: 'School', type: 'select', options: SCHOOL_OPTIONS },
    { key: 'casting_time', label: 'Casting Time', type: 'select-custom', options: CASTING_TIME_OPTIONS },
    { key: 'duration', label: 'Duration', type: 'select-custom', options: DURATION_OPTIONS },
    { key: 'action', label: 'Action', type: 'select', options: [
      { value: '', label: 'None' },
      { value: 'action', label: 'Action' },
      { value: 'bonus action', label: 'Bonus Action' },
      { value: 'reaction', label: 'Reaction' }
    ] },
    { key: 'concentration', label: 'Concentration', type: 'checkbox' },
    { key: 'ritual', label: 'Ritual', type: 'checkbox' },
    { key: 'range', label: 'Range', type: 'select-custom', options: RANGE_OPTIONS },
    { key: 'materials', label: 'Materials', type: 'textarea', rows: 2 },
    { key: 'heal_at_spell_slots', label: 'Heal At Spell Slots JSON', type: 'textarea', rows: 3 },
    { key: 'higher_levels', label: 'Higher Levels JSON', type: 'textarea', rows: 3 },
    { key: 'damage_at_higher_levels', label: 'Damage At Higher Levels JSON', type: 'textarea', rows: 3 },
    { key: 'spell_alt_text', label: 'Alt Text', type: 'textarea', rows: 3 },
    { key: 'spell_text', label: 'Spell Text', type: 'textarea', rows: 8 }
  ];

  await fetchClassOptions();
  await fetchComponentOptions();
  await fetchDamageTypes();
  await fetchAbilities();
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

      if (field.type === 'select-custom') {
        const selectWrapper = document.createElement('div');
        selectWrapper.className = 'select-custom-field';

        const select = document.createElement('select');
        select.id = inputId;
        select.name = field.key;
        select.setAttribute('data-field-key', field.key);
        select.setAttribute('data-field-type', 'select-custom');
        field.options.forEach(optionData => {
          const option = document.createElement('option');
          option.value = optionData.value;
          option.textContent = optionData.label;
          select.appendChild(option);
        });

        const customInput = document.createElement('input');
        customInput.type = 'text';
        customInput.className = 'custom-text-input';
        customInput.setAttribute('data-custom-text-for', field.key);
        customInput.placeholder = 'Enter custom value...';
        customInput.style.display = 'none';

        select.addEventListener('change', function() {
          customInput.style.display = this.value === '_custom' ? '' : 'none';
        });

        selectWrapper.appendChild(select);
        selectWrapper.appendChild(customInput);
        wrapper.appendChild(label);
        wrapper.appendChild(selectWrapper);
        modalFields.appendChild(wrapper);
        return;
      }

      let input;
      if (field.type === 'textarea') {
        input = document.createElement('textarea');
        input.rows = field.rows || 3;
      } else if (field.type === 'select') {
        input = document.createElement('select');
        field.options.forEach(optionData => {
          const option = document.createElement('option');
          if (typeof optionData === 'string') {
            option.value = optionData;
            option.textContent = optionData;
          } else {
            option.value = optionData.value;
            option.textContent = optionData.label;
          }
          input.appendChild(option);
        });
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
    appendHealEditor();
  }

  async function fetchClassOptions() {
    try {
      availableClassOptions = await ApiHelpers.ApiService.getClasses();
      availableClassOptions.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      availableClassOptions = [];
      console.warn('Could not fetch class options:', error);
    }
  }

  async function fetchComponentOptions() {
    try {
      availableComponentOptions = await ApiHelpers.ApiService.getSpellComponents();
      availableComponentOptions.sort((a, b) => String(a).localeCompare(String(b)));
    } catch (error) {
      availableComponentOptions = [];
      console.warn('Could not fetch component options:', error);
    }
  }

  async function fetchDamageTypes() {
    try {
      availableDamageTypes = await ApiHelpers.ApiService.getDamageTypes();
    } catch (error) {
      availableDamageTypes = [];
      console.warn('Could not fetch damage types:', error);
    }
  }

  async function fetchAbilities() {
    try {
      availableAbilities = await ApiHelpers.ApiService.getAbilities();
    } catch (error) {
      availableAbilities = [];
      console.warn('Could not fetch abilities:', error);
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

  function appendHealEditor() {
    const section = createSectionShell('Heal', 'Single heal entry. Leave Amount blank for no heal.');
    const grid = document.createElement('div');
    grid.className = 'spell-edit-inline-grid';
    grid.appendChild(createDiceRollSubfield('Amount', 'amount', ''));
    section.appendChild(grid);

    const boolRow = document.createElement('div');
    boolRow.className = 'bool-row';

    const tempLabel = document.createElement('label');
    tempLabel.className = 'spell-edit-checkbox';
    const tempCb = document.createElement('input');
    tempCb.type = 'checkbox';
    tempCb.id = 'spell-edit-heal-temp-hp';
    tempCb.setAttribute('data-heal-field', 'temp_hp');
    tempLabel.appendChild(tempCb);
    tempLabel.appendChild(document.createTextNode(' Temporary HP'));
    boolRow.appendChild(tempLabel);

    const maxLabel = document.createElement('label');
    maxLabel.className = 'spell-edit-checkbox';
    const maxCb = document.createElement('input');
    maxCb.type = 'checkbox';
    maxCb.id = 'spell-edit-heal-max-hp';
    maxCb.setAttribute('data-heal-field', 'max_hp');
    maxLabel.appendChild(maxCb);
    maxLabel.appendChild(document.createTextNode(' Increases Max HP'));
    boolRow.appendChild(maxLabel);

    section.appendChild(boolRow);
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

    const spellNameInput = modalForm ? modalForm.querySelector('[data-field-key="spell_name"]') : null;
    const defaultName = rowData.name || (spellNameInput ? spellNameInput.value.trim() : '');

    grid.appendChild(createRollRowField('Name', 'name', defaultName));
    grid.appendChild(createDiceRollSubfield('Damage / Amount', 'damage', rowData.damage || rowData.amount || ''));
    if (sectionKey === 'damage') {
      grid.appendChild(createDamageTypeField(rowData.type));
    } else if (sectionKey === 'attack_type') {
      grid.appendChild(createAttackTypeDropdown(rowData.type));
      grid.appendChild(createSaveCheckboxField(rowData.save));
    }
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

    if (sectionKey === 'attack_type' && !rowData._isPaired) {
      addRollRow('damage', { name: defaultName, _isPaired: true });
    }
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

  function parseDiceString(value) {
    if (!value) return { count: '', diceType: '', mod: '' };
    const m = String(value).trim().match(/^(\d+)?d(\d+)([+-]\d+)?$/i);
    if (!m) return { count: '', diceType: '', mod: String(value) };
    return { count: m[1] || '1', diceType: m[2] || '', mod: m[3] || '' };
  }

  function createDiceRollSubfield(labelText, fieldKey, currentValue) {
    const wrapper = document.createElement('div');
    wrapper.className = 'spell-edit-subfield';

    const label = document.createElement('label');
    label.textContent = labelText;
    wrapper.appendChild(label);

    const group = document.createElement('div');
    group.className = 'dice-input-group';
    group.setAttribute('data-dice-group', fieldKey);

    const { count, diceType, mod } = parseDiceString(currentValue);

    const countSel = document.createElement('select');
    countSel.className = 'dice-count-select';
    countSel.setAttribute('data-dice-count', '');
    [['', '—'], ['1','1'],['2','2'],['3','3'],['4','4'],['5','5'],['6','6'],
     ['7','7'],['8','8'],['9','9'],['10','10'],['11','11'],['12','12'],['20','20']
    ].forEach(([val, text]) => {
      const opt = document.createElement('option');
      opt.value = val; opt.textContent = text;
      if (val === count) opt.selected = true;
      countSel.appendChild(opt);
    });

    const sep = document.createElement('span');
    sep.className = 'dice-sep';
    sep.textContent = 'd';

    const typeSel = document.createElement('select');
    typeSel.className = 'dice-type-select';
    typeSel.setAttribute('data-dice-type', '');
    [['', '—'], ['4','d4'],['6','d6'],['8','d8'],['10','d10'],
     ['12','d12'],['20','d20'],['100','d100']
    ].forEach(([val, text]) => {
      const opt = document.createElement('option');
      opt.value = val; opt.textContent = text;
      if (val === diceType) opt.selected = true;
      typeSel.appendChild(opt);
    });

    const modInput = document.createElement('input');
    modInput.type = 'text';
    modInput.className = 'dice-mod-input';
    modInput.setAttribute('data-dice-mod', '');
    modInput.placeholder = '+0';
    modInput.value = mod;

    group.appendChild(countSel);
    group.appendChild(sep);
    group.appendChild(typeSel);
    group.appendChild(modInput);
    wrapper.appendChild(group);
    return wrapper;
  }

  function createDamageTypeField(currentTypes) {
    const wrapper = document.createElement('div');
    wrapper.className = 'spell-edit-subfield';

    const label = document.createElement('label');
    label.textContent = 'Damage Type';
    wrapper.appendChild(label);

    const checkList = document.createElement('div');
    checkList.className = 'check-option-group';

    const selectedCodes = normalizeValueArray(currentTypes);
    availableDamageTypes.forEach(dt => {
      const optLabel = document.createElement('label');
      optLabel.className = 'check-option';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = dt.code;
      cb.setAttribute('data-roll-field', 'type');
      cb.checked = selectedCodes.includes(dt.code);
      optLabel.appendChild(cb);
      optLabel.appendChild(document.createTextNode(`${dt.emoji ? dt.emoji + ' ' : ''}${dt.name}`));
      checkList.appendChild(optLabel);
    });

    if (availableDamageTypes.length === 0) {
      const fallback = document.createElement('input');
      fallback.type = 'text';
      fallback.value = rollValueToInput(currentTypes);
      fallback.setAttribute('data-roll-field', 'type');
      fallback.placeholder = 'e.g. fire, cold';
      checkList.appendChild(fallback);
    }

    wrapper.appendChild(checkList);
    return wrapper;
  }

  function createAttackTypeDropdown(currentType) {
    const wrapper = document.createElement('div');
    wrapper.className = 'spell-edit-subfield';

    const label = document.createElement('label');
    label.textContent = 'Attack Type';
    wrapper.appendChild(label);

    const select = document.createElement('select');
    select.setAttribute('data-roll-field', 'type');
    select.className = 'subfield-select';
    ATTACK_TYPE_OPTIONS.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      option.selected = (opt.value === (currentType || ''));
      select.appendChild(option);
    });

    wrapper.appendChild(select);
    return wrapper;
  }

  function createSaveCheckboxField(currentSaves) {
    const wrapper = document.createElement('div');
    wrapper.className = 'spell-edit-subfield';

    const label = document.createElement('label');
    label.textContent = 'Save';
    wrapper.appendChild(label);

    const checkList = document.createElement('div');
    checkList.className = 'check-option-group';

    const selectedCodes = normalizeValueArray(currentSaves);
    availableAbilities.forEach(ab => {
      const optLabel = document.createElement('label');
      optLabel.className = 'check-option';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = ab.code;
      cb.setAttribute('data-roll-field', 'save');
      cb.checked = selectedCodes.includes(ab.code);
      optLabel.appendChild(cb);
      optLabel.appendChild(document.createTextNode(ab.name));
      checkList.appendChild(optLabel);
    });

    if (availableAbilities.length === 0) {
      const fallback = document.createElement('input');
      fallback.type = 'text';
      fallback.value = rollValueToInput(currentSaves);
      fallback.setAttribute('data-roll-field', 'save');
      fallback.placeholder = 'e.g. dex, str';
      checkList.appendChild(fallback);
    }

    wrapper.appendChild(checkList);
    return wrapper;
  }

  function normalizeValueArray(value) {
    if (Array.isArray(value)) return value.map(v => String(v).trim().toLowerCase()).filter(Boolean);
    if (typeof value === 'string' && value.trim()) {
      return value.split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
    }
    return [];
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
    const nextSpells = await ApiHelpers.ApiService.getSpells();
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
      const rawSpell = await ApiHelpers.ApiService.getSpellRaw(spell.id);
      populateEditForm(rawSpell);
      setModalStatus('Editing database fields directly. JSON fields accept raw JSON.', '');
    } catch (error) {
      setModalStatus(error.message, 'error');
    }
  }

  function resetSelectCustomFields() {
    editorFields.filter(f => f.type === 'select-custom').forEach(field => {
      const customInput = modalForm.querySelector(`[data-custom-text-for="${field.key}"]`);
      if (customInput) { customInput.style.display = 'none'; customInput.value = ''; }
    });
  }

  function openNewSpellModal() {
    editingSpellId = null;
    modalTitle.textContent = 'Add New Spell';
    setModalStatus('Create a new spell and save it to the database.', '');
    modal.classList.add('visible');
    modal.setAttribute('aria-hidden', 'false');
    modalForm.reset();
    resetSelectCustomFields();
    ['attack_type', 'damage'].forEach(clearRollRows);
    clearHealEditor();

    editorFields.forEach(field => {
      const input = modalForm.querySelector(`[data-field-key="${field.key}"]`);
      if (!input) return;
      if (field.type === 'checkbox') {
        input.checked = false;
      } else {
        input.value = '';
      }
    });

    const classesSelect = modalForm.querySelector('[data-structured-field="classes"]');
    if (classesSelect && classesSelect.tagName === 'SELECT') {
      Array.from(classesSelect.options).forEach(opt => { opt.selected = false; });
    } else if (classesSelect) {
      classesSelect.value = '';
    }

    const subclassesInput = modalForm.querySelector('[data-structured-field="subclasses"]');
    if (subclassesInput) subclassesInput.value = '';

    const componentCheckboxes = modalForm.querySelectorAll('[data-components-checkbox]');
    if (componentCheckboxes.length > 0) {
      componentCheckboxes.forEach(checkbox => { checkbox.checked = false; });
    } else {
      const componentsInput = modalForm.querySelector('[data-structured-field="components"]');
      if (componentsInput) componentsInput.value = '';
    }

    const areaShapeInput = modalForm.querySelector('[data-area-field="shape"]');
    const areaSizeInput = modalForm.querySelector('[data-area-field="size"]');
    if (areaShapeInput) areaShapeInput.value = '';
    if (areaSizeInput) areaSizeInput.value = '';

    modalSave.disabled = false;
  }

  function closeEditModal() {
    editingSpellId = null;
    modal.classList.remove('visible');
    modal.setAttribute('aria-hidden', 'true');
    modalForm.reset();
    resetSelectCustomFields();
    modalSave.disabled = false;
    setModalStatus('', '');
    ['attack_type', 'damage'].forEach(clearRollRows);
    clearHealEditor();
  }

  function populateEditForm(spellData) {
    ['attack_type', 'damage'].forEach(clearRollRows);
    clearHealEditor();

    editorFields.forEach(field => {
      const input = modalForm.querySelector(`[data-field-key="${field.key}"]`);
      if (!input) return;

      if (field.type === 'checkbox') {
        input.checked = Boolean(spellData[field.key]);
      } else if (input.getAttribute('data-field-type') === 'select-custom') {
        const val = String(spellData[field.key] ?? '');
        const optionValues = Array.from(input.options).map(o => o.value).filter(v => v !== '_custom');
        const customInput = modalForm.querySelector(`[data-custom-text-for="${field.key}"]`);
        if (optionValues.includes(val) || val === '') {
          input.value = val;
          if (customInput) { customInput.style.display = 'none'; customInput.value = ''; }
        } else {
          input.value = '_custom';
          if (customInput) { customInput.style.display = ''; customInput.value = val; }
        }
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
    populateHealEditor(spellData.heal);
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
      if (field.type === 'checkbox') {
        payload[field.key] = input.checked;
      } else if (field.type === 'select-custom' && input.value === '_custom') {
        const customInput = modalForm.querySelector(`[data-custom-text-for="${field.key}"]`);
        payload[field.key] = customInput ? customInput.value.trim() : '';
      } else {
        payload[field.key] = input.value;
      }
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
    payload.heal = serializeHealField();

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
      const groups = {};
      row.querySelectorAll('[data-roll-field]').forEach(input => {
        const fieldKey = input.getAttribute('data-roll-field');
        if (!groups[fieldKey]) groups[fieldKey] = [];
        if (input.type === 'checkbox') {
          if (input.checked) groups[fieldKey].push(input.value);
        } else if (input.tagName === 'SELECT') {
          groups[fieldKey].push(input.value);
        } else {
          const v = input.value.trim();
          if (v) groups[fieldKey].push(v);
        }
      });

      row.querySelectorAll('[data-dice-group]').forEach(diceGroup => {
        const fieldKey = diceGroup.getAttribute('data-dice-group');
        const typeEl = diceGroup.querySelector('[data-dice-type]');
        if (!typeEl || !typeEl.value) return;
        const countEl = diceGroup.querySelector('[data-dice-count]');
        const modEl = diceGroup.querySelector('[data-dice-mod]');
        const diceStr = `${countEl && countEl.value ? countEl.value : '1'}d${typeEl.value}${modEl ? modEl.value.trim() : ''}`;
        if (!groups[fieldKey]) groups[fieldKey] = [];
        groups[fieldKey].push(diceStr);
      });

      const entry = {};
      Object.entries(groups).forEach(([fieldKey, values]) => {
        if (fieldKey === 'type') {
          if (sectionKey === 'attack_type') {
            entry.type = values[0] !== undefined ? values[0] : '';
          } else if (values.length > 0) {
            entry.type = values.length === 1 ? values[0] : values;
          }
        } else if (fieldKey === 'save') {
          if (values.length > 0) entry.save = values.length === 1 ? values[0] : values;
        } else if (fieldKey === 'damage') {
          if (values.length > 0) entry.damage = values[0];
        } else if (fieldKey === 'mod') {
          if (values.length > 0) entry.MOD = values[0];
        } else {
          if (values.length > 0) entry[fieldKey] = values[0];
        }
      });
      return entry;
    }).filter(entry => Object.keys(entry).length > 0);

    return serialized.length === 0 ? '' : JSON.stringify(serialized);
  }

  function serializeHealField() {
    const diceGroup = modalForm.querySelector('[data-dice-group="amount"]');
    let amount = '';
    if (diceGroup) {
      const typeEl = diceGroup.querySelector('[data-dice-type]');
      if (typeEl && typeEl.value) {
        const countEl = diceGroup.querySelector('[data-dice-count]');
        const modEl = diceGroup.querySelector('[data-dice-mod]');
        amount = `${countEl && countEl.value ? countEl.value : '1'}d${typeEl.value}${modEl ? modEl.value.trim() : ''}`;
      }
    }
    if (!amount) return '';
    const tempHp = modalForm.querySelector('[data-heal-field="temp_hp"]');
    const maxHp = modalForm.querySelector('[data-heal-field="max_hp"]');
    return JSON.stringify({
      amount,
      temp_hp: tempHp ? tempHp.checked : false,
      max_hp: maxHp ? maxHp.checked : false
    });
  }

  function populateHealEditor(rawValue) {
    const parsed = parseJsonValue(rawValue, null);
    const healObj = Array.isArray(parsed) ? parsed[0] : (parsed && typeof parsed === 'object' ? parsed : null);
    const diceGroup = modalForm.querySelector('[data-dice-group="amount"]');
    if (diceGroup) {
      const { count, diceType, mod } = parseDiceString(healObj ? (healObj.amount || '') : '');
      const countEl = diceGroup.querySelector('[data-dice-count]');
      const typeEl = diceGroup.querySelector('[data-dice-type]');
      const modEl = diceGroup.querySelector('[data-dice-mod]');
      if (countEl) countEl.value = count;
      if (typeEl) typeEl.value = diceType;
      if (modEl) modEl.value = mod;
    }
    const tempHp = modalForm.querySelector('[data-heal-field="temp_hp"]');
    const maxHp = modalForm.querySelector('[data-heal-field="max_hp"]');
    if (tempHp) tempHp.checked = Boolean(healObj && healObj.temp_hp);
    if (maxHp) maxHp.checked = Boolean(healObj && healObj.max_hp);
  }

  function clearHealEditor() {
    const diceGroup = modalForm.querySelector('[data-dice-group="amount"]');
    if (diceGroup) {
      ['[data-dice-count]', '[data-dice-type]', '[data-dice-mod]'].forEach(sel => {
        const el = diceGroup.querySelector(sel);
        if (el) el.value = '';
      });
    }
    const tempHp = modalForm.querySelector('[data-heal-field="temp_hp"]');
    const maxHp = modalForm.querySelector('[data-heal-field="max_hp"]');
    if (tempHp) tempHp.checked = false;
    if (maxHp) maxHp.checked = false;
  }

  async function saveSpellEdits() {
    modalSave.disabled = true;
    setModalStatus('Saving spell...', '');

    const payload = collectEditFormData();
    payload.spell_name = payload.spell_name || 'New Spell';
    payload.icon = payload.icon || '✨';
    payload.level = payload.level || '0';

    const url = editingSpellId ? `/api/spells/id/${editingSpellId}` : '/api/spells';
    const method = editingSpellId ? 'PUT' : 'POST';

    try {
      if (editingSpellId) {
        // PUT request for updating existing spell
        await ApiHelpers.ApiService.updateSpell(editingSpellId, payload);
      } else {
        // POST request for creating new spell
        await ApiHelpers.ApiService.createSpell(payload);
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