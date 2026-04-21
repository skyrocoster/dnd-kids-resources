document.addEventListener('DOMContentLoaded', async function() {
  const API_BASE = (window.location.protocol === 'file:' || !window.location.origin)
    ? 'http://127.0.0.1:8000'
    : window.location.origin;
  console.log('Weapons Book API_BASE:', API_BASE);
  if (window.location.protocol === 'file:' || !window.location.origin) {
    console.warn('Weapons Book loaded from file://; using http://127.0.0.1:8000 for backend calls.');
  }
  const searchInput = document.getElementById('search-input');
  const weaponList = document.getElementById('weapon-list');
  const weaponDetailShell = document.getElementById('weapon-detail-shell');
  const weaponCount = document.getElementById('weapon-count');

  let weapons = [];
  let selectedWeaponId = null;

  async function apiFetch(path) {
    try {
      const response = await fetch(`${API_BASE}${path}`);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || `Failed to load ${path} (${response.status})`);
      }
      return body;
    } catch (error) {
      throw new Error(`Failed to load ${path}: ${error.message}`);
    }
  }

  function parseJsonValue(value) {
    if (typeof value !== 'string') return value;
    const raw = value.trim();
    if ((raw.startsWith('[') && raw.endsWith(']')) || (raw.startsWith('{') && raw.endsWith('}'))) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        return value;
      }
    }
    return value;
  }

  function formatDisplayValue(value) {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    if (Array.isArray(value)) {
      return value.map(formatDisplayValue).filter(Boolean).join(', ');
    }
    if (typeof value === 'object') {
      if (value.name) {
        return String(value.name);
      }
      return Object.entries(value)
        .map(([key, item]) => {
          const formatted = formatDisplayValue(item);
          return formatted ? `${key}: ${formatted}` : '';
        })
        .filter(Boolean)
        .join(', ');
    }
    return String(value);
  }

  function normalizeWeaponText(weapon) {
    const fields = [
      weapon.name,
      weapon.weapon_category,
      weapon.rarity,
      weapon.base_weapon,
      formatDisplayValue(weapon.property),
      formatDisplayValue(weapon.entries),
      formatDisplayValue(weapon.spells),
      formatDisplayValue(weapon.focus)
    ];
    return fields.filter(Boolean).join(' ').toLowerCase();
  }

  function filterWeapons(term) {
    const normalizedTerm = term.trim().toLowerCase();
    if (!normalizedTerm) {
      return weapons;
    }
    return weapons.filter(weapon => normalizeWeaponText(weapon).includes(normalizedTerm));
  }

  function showPlaceholder(message) {
    weaponDetailShell.innerHTML = `<div class="weapon-detail-placeholder">${message}</div>`;
  }

  function renderWeaponList(items) {
    weaponList.innerHTML = '';
    if (!items.length) {
      weaponList.innerHTML = '<div class="weapon-detail-placeholder">No weapons matched your search.</div>';
      return;
    }

    items.forEach(weapon => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'weapon-list-item';
      if (weapon.id === selectedWeaponId) {
        item.classList.add('selected');
      }

      const title = document.createElement('h2');
      title.className = 'weapon-list-item-title';
      title.textContent = weapon.name || 'Unknown Weapon';
      item.appendChild(title);

      const subtitle = document.createElement('p');
      subtitle.className = 'weapon-list-item-subtitle';
      subtitle.textContent = [weapon.weapon_category, weapon.rarity, weapon.base_weapon]
        .filter(Boolean)
        .join(' · ');
      item.appendChild(subtitle);

      item.addEventListener('click', () => {
        selectedWeaponId = weapon.id;
        renderWeaponList(filterWeapons(searchInput.value));
        displayWeapon(weapon);
      });

      weaponList.appendChild(item);
    });
  }

  function createDetailRow(label, content) {
    if (!content) return null;
    const row = document.createElement('div');
    row.className = 'detail-row';

    const labelEl = document.createElement('span');
    labelEl.className = 'detail-label';
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const valueEl = document.createElement('div');
    valueEl.className = 'detail-value';
    valueEl.textContent = content;
    row.appendChild(valueEl);

    return row;
  }

  function createSection(title, items) {
    if (!items || (Array.isArray(items) && items.length === 0) || !formatDisplayValue(items)) {
      return null;
    }

    const panel = document.createElement('div');
    panel.className = 'detail-panel';
    const heading = document.createElement('h2');
    heading.textContent = title;
    panel.appendChild(heading);

    if (Array.isArray(items)) {
      items.forEach(entry => {
        const paragraph = document.createElement('div');
        paragraph.className = 'detail-item-text';
        paragraph.textContent = formatDisplayValue(entry);
        panel.appendChild(paragraph);
      });
    } else {
      const paragraph = document.createElement('div');
      paragraph.className = 'detail-item-text';
      paragraph.textContent = formatDisplayValue(items);
      panel.appendChild(paragraph);
    }

    return panel;
  }

  function formatAttackEntry(entry) {
    if (!entry || typeof entry !== 'object') {
      return formatDisplayValue(entry);
    }
    const parts = [];
    if (entry.name) {
      parts.push(entry.name);
    }
    if (entry.header) {
      parts.push(entry.header);
    }
    if (entry.attack && typeof entry.attack === 'object') {
      const attack = entry.attack;
      const type = attack.type || attack.name || '';
      const modifier = attack.mod != null ? `+${attack.mod}` : '';
      const range = attack.range ? `Range: ${attack.range}` : '';
      const damage = attack.damage ? `Damage: ${attack.damage}` : '';
      const damageType = attack.damage_type || attack.damageType || '';
      parts.push([type, modifier, range, damage, damageType].filter(Boolean).join(' '));
    }
    if (entry.desc) {
      parts.push(entry.desc);
    }
    if (entry.text) {
      parts.push(entry.text);
    }
    return parts.filter(Boolean).join(' — ');
  }

  function renderAttackSection(attacks) {
    const parsed = Array.isArray(attacks) ? attacks : [attacks];
    const formatted = parsed
      .map(formatAttackEntry)
      .filter(Boolean);
    return formatted.length ? createSection('Attack', formatted) : null;
  }

  function displayWeapon(weapon) {
    weaponDetailShell.innerHTML = '';

    const detailShell = document.createElement('div');
    detailShell.className = 'detail-shell';

    const detailHeader = document.createElement('div');
    detailHeader.className = 'detail-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'detail-title-group';

    const title = document.createElement('h1');
    title.textContent = weapon.name || 'Unknown Weapon';
    titleGroup.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.className = 'detail-subtitle';
    subtitle.textContent = [weapon.weapon_category, weapon.rarity, weapon.base_weapon]
      .filter(Boolean)
      .join(' · ');
    titleGroup.appendChild(subtitle);
    detailHeader.appendChild(titleGroup);

    detailShell.appendChild(detailHeader);

    const details = document.createElement('div');
    details.className = 'detail-panel';

    const rows = [
      { label: 'Category:', value: weapon.weapon_category },
      { label: 'Base weapon:', value: weapon.base_weapon },
      { label: 'Rarity:', value: weapon.rarity },
      { label: 'Weight:', value: weapon.weight ? `${weapon.weight} lb` : '' },
      { label: 'Attunement:', value: weapon.req_attune || 'No' },
      { label: 'Proficiency:', value: weapon.grants_proficiency ? 'Yes' : 'No' },
      { label: 'Ammo type:', value: weapon.ammo_type },
      { label: 'Crit threshold:', value: weapon.crit_threshold },
      { label: 'Bonus spell attack:', value: weapon.bonus_spell_attack },
      { label: 'Bonus save DC:', value: weapon.bonus_spell_save_dc },
      { label: 'Bonus AC:', value: weapon.bonus_ac },
      { label: 'Bonus saving throw:', value: weapon.bonus_saving_throw },
      { label: 'Sentient:', value: weapon.sentient ? 'Yes' : 'No' },
      { label: 'Cursed:', value: weapon.curse ? 'Yes' : 'No' },
      { label: 'Grants language:', value: weapon.grants_language ? 'Yes' : 'No' },
      { label: 'Tier:', value: weapon.tier }
    ];

    rows.forEach(row => {
      const rowEl = createDetailRow(row.label, formatDisplayValue(row.value));
      if (rowEl) {
        details.appendChild(rowEl);
      }
    });

    detailShell.appendChild(details);

    const sections = [
      createSection('Properties', weapon.property),
      createSection('Resist', weapon.resist),
      createSection('Spells', weapon.spells),
      createSection('Focus', weapon.focus),
      createSection('Light', weapon.light),
      renderAttackSection(weapon.attack),
      createSection('Recharge', weapon.recharge),
      createSection('Ability', weapon.ability),
      createSection('Modify Speed', weapon.modify_speed),
      createSection('Description', weapon.entries)
    ].filter(Boolean);

    if (sections.length) {
      sections.forEach(section => detailShell.appendChild(section));
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'weapon-detail-placeholder';
      placeholder.textContent = 'No additional details are available for this weapon.';
      detailShell.appendChild(placeholder);
    }

    weaponDetailShell.appendChild(detailShell);
  }

  function updateCount(count, fallback) {
    if (typeof count === 'number' && count > 0) {
      weaponCount.textContent = `${count} weapon${count === 1 ? '' : 's'} available`;
    } else {
      weaponCount.textContent = fallback || 'Type a weapon name to begin.';
    }
  }

  function handleSearch() {
    const query = searchInput.value.trim();
    if (!query) {
      weaponList.innerHTML = '';
      selectedWeaponId = null;
      updateCount(0, 'Type a weapon name to begin.');
      showPlaceholder('Type a weapon name to begin.');
      return;
    }

    const visible = filterWeapons(query);
    renderWeaponList(visible);
    updateCount(visible.length);

    if (visible.length === 0) {
      selectedWeaponId = null;
      showPlaceholder('No weapons matched your search.');
      return;
    }

    const selected = visible.find(item => item.id === selectedWeaponId) || visible[0];
    selectedWeaponId = selected.id;
    renderWeaponList(visible);
    displayWeapon(selected);
  }

  async function loadWeapons() {
    try {
      weapons = await apiFetch('/api/weapons');
      updateCount(0, 'Type a weapon name to begin.');
      showPlaceholder('Type a weapon name to begin.');
    } catch (error) {
      console.error('Weapons API error:', error);
      weaponList.innerHTML = `<div class="weapon-detail-placeholder">${error.message}</div>`;
      weaponCount.textContent = 'Failed to load weapons';
    }
  }

  searchInput.addEventListener('input', handleSearch);
  await loadWeapons();
});
