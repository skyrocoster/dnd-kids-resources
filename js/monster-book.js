document.addEventListener('DOMContentLoaded', async function() {
  const { apiFetch } = ApiHelpers;
  const { escapeHtml } = DomUtils;
  const { parseJsonValue, formatDisplayValue, normalizeSearchText, getQueryParam } = DataUtils;

  const searchInput = document.getElementById('search-input');
  const monsterListEl = document.getElementById('monster-list');
  const monsterDetailShell = document.getElementById('monster-detail-shell');
  const monsterCount = document.getElementById('monster-count');

  let monsters = [];
  let selectedMonsterTitle = null;
  let suppressInputChange = false;

  function formatAttackDescription(attack) {
    if (!attack || typeof attack !== 'object') return '';

    const type = typeof attack.type === 'string' && attack.type.trim()
      ? `${attack.type.trim()[0].toUpperCase()}${attack.type.trim().slice(1)} attack`
      : 'Attack';

    const mod = Number(attack.mod);
    const roll = Number.isFinite(mod)
      ? `1d20 ${mod >= 0 ? '+' : '-'} ${Math.abs(mod)}`
      : '1d20';

    const parts = [`${type} (${roll}).`];

    if (attack.range !== undefined && attack.range !== null && String(attack.range).trim() !== '') {
      parts.push(`Range: ${String(attack.range).trim()}${String(attack.range).toString().match(/\d$/) ? ' ft.' : ''}`);
    }

    if (attack.targets !== undefined && attack.targets !== null && String(attack.targets).trim() !== '') {
      parts.push(`Targets: ${String(attack.targets).trim()}.`);
    }

    if (attack.damage || attack.damage_mod !== undefined || attack.damage_type) {
      let damageText = attack.damage ? String(attack.damage).trim() : '1d6';
      const damageMod = Number(attack.damage_mod);
      if (Number.isFinite(damageMod)) {
        damageText += ` ${damageMod >= 0 ? '+' : '-'} ${Math.abs(damageMod)}`;
      }
      if (attack.damage_type) {
        damageText += ` (${String(attack.damage_type).trim()})`;
      }
      parts.push(`Damage: ${damageText}.`);
    }

    return parts.filter(Boolean).join(' ');
  }

  function renderStatsGrid(detail) {
    if (!Array.isArray(detail.content)) return '';
    const container = document.createElement('div');
    container.className = 'stat-grid';

    detail.content.forEach(stat => {
      const card = document.createElement('div');
      card.className = 'stat-card';
      card.style.backgroundColor = stat.color || '#7f8c8d';
      card.style.color = 'white';

      const name = document.createElement('span');
      name.className = 'stat-name';
      name.textContent = stat.name || stat.code || '';

      const value = document.createElement('span');
      value.className = 'stat-value';
      value.textContent = `${stat.emoji ? stat.emoji + ' ' : ''}${stat.value || ''}`;

      card.appendChild(name);
      card.appendChild(value);
      container.appendChild(card);
    });

    return container.outerHTML;
  }

  function renderSavesGrid(detail) {
    if (!Array.isArray(detail.content)) return '';
    const container = document.createElement('div');
    container.className = 'save-grid';

    detail.content.forEach(save => {
      const card = document.createElement('div');
      card.className = 'save-card';
      card.style.backgroundColor = save.color || '#7f8c8d';
      card.style.color = 'white';

      const name = document.createElement('span');
      name.className = 'stat-name';
      name.textContent = save.name || save.code || '';

      const value = document.createElement('span');
      value.className = 'stat-value';
      const displayText = typeof save.modifier === 'number'
        ? `${save.modifier >= 0 ? '+' : ''}${save.modifier} ${save.emoji || ''}`.trim()
        : `${String(save.modifier !== undefined && save.modifier !== null ? save.modifier : save.value || '')} ${save.emoji || ''}`.trim();
      value.textContent = displayText;

      card.appendChild(name);
      card.appendChild(value);
      container.appendChild(card);
    });

    return container.outerHTML;
  }

  function renderSkillsGrid(detail) {
    if (!Array.isArray(detail.content)) return '';
    const container = document.createElement('div');
    container.className = 'save-grid';

    detail.content.forEach(skill => {
      const card = document.createElement('div');
      card.className = 'save-card';
      card.style.backgroundColor = skill.color || '#7f8c8d';
      card.style.color = 'white';

      const name = document.createElement('span');
      name.className = 'stat-name';
      name.textContent = skill.name || skill.code || '';

      const value = document.createElement('span');
      value.className = 'stat-value';
      const displayText = typeof skill.modifier === 'number'
        ? `${skill.modifier >= 0 ? '+' : ''}${skill.modifier} ${skill.emoji || ''}`.trim()
        : `${String(skill.modifier !== undefined && skill.modifier !== null ? skill.modifier : skill.value || '')} ${skill.emoji || ''}`.trim();
      value.textContent = displayText;

      card.appendChild(name);
      card.appendChild(value);
      container.appendChild(card);
    });

    return container.outerHTML;
  }

  function renderDetail(detail) {
    const row = document.createElement('div');
    row.className = 'detail-row';

    const label = document.createElement('span');
    label.className = 'detail-label';
    label.textContent = detail.label || '';
    row.appendChild(label);

    const value = document.createElement('div');
    value.className = 'detail-value';
    if (detail.type === 'stats_grid') {
      value.innerHTML = renderStatsGrid(detail);
    } else if (detail.type === 'saves_grid') {
      value.innerHTML = renderSavesGrid(detail);
    } else if (detail.type === 'skills_grid') {
      value.innerHTML = renderSkillsGrid(detail);
    } else {
      value.textContent = formatDisplayValue(detail.content);
    }

    row.appendChild(value);
    return row;
  }

  function renderSectionItem(item) {
    if (item === null || item === undefined || item === '') {
      return null;
    }

    const parsed = parseJsonValue(item);
    if (Array.isArray(parsed)) {
      const wrapper = document.createElement('div');
      parsed.forEach(subItem => {
        const child = renderSectionItem(subItem);
        if (child) wrapper.appendChild(child);
      });
      return wrapper.children.length ? wrapper : null;
    }

    const itemContainer = document.createElement('div');
    itemContainer.className = 'detail-item';

    if (typeof parsed === 'string' || typeof parsed === 'number' || typeof parsed === 'boolean') {
      const text = document.createElement('div');
      text.className = 'detail-item-text';
      text.textContent = String(parsed);
      itemContainer.appendChild(text);
      return itemContainer;
    }

    if (typeof parsed === 'object') {
      if (parsed.name) {
        const title = document.createElement('div');
        title.className = 'detail-item-title';
        title.textContent = parsed.name;
        itemContainer.appendChild(title);
      }
      if (parsed.attack && typeof parsed.attack === 'object') {
        const attackText = formatAttackDescription(parsed.attack);
        if (attackText) {
          itemContainer.appendChild(createTextBlock(attackText));
        }
      }
      if (parsed.header) itemContainer.appendChild(createTextBlock(parsed.header));
      if (parsed.desc) itemContainer.appendChild(createTextBlock(parsed.desc));
      if (parsed.text) itemContainer.appendChild(createTextBlock(parsed.text));

      const other = [];
      for (const [key, value] of Object.entries(parsed)) {
        if (['name', 'header', 'desc', 'text', 'attack'].includes(key)) continue;
        if (value === null || value === undefined || value === '') continue;
        const formatted = formatDisplayValue(value);
        if (formatted) other.push(`${key}: ${formatted}`);
      }
      if (other.length) itemContainer.appendChild(createTextBlock(other.join(' · ')));
      if (!itemContainer.children.length) itemContainer.appendChild(createTextBlock(JSON.stringify(parsed, null, 2)));
      return itemContainer;
    }

    return null;
  }

  function createTextBlock(text) {
    const block = document.createElement('div');
    block.className = 'detail-item-text';
    block.textContent = String(text);
    return block;
  }

  function renderSectionPanel(title, items) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return null;
    }

    const panel = document.createElement('div');
    panel.className = 'detail-panel';
    const heading = document.createElement('h2');
    heading.textContent = title;
    panel.appendChild(heading);

    items.forEach(item => {
      const itemNode = renderSectionItem(item);
      if (itemNode) panel.appendChild(itemNode);
    });
    return panel;
  }

  function displayMonster(monster) {
    monsterDetailShell.innerHTML = '';

    const detailShell = document.createElement('div');
    detailShell.className = 'detail-shell';

    const detailHeader = document.createElement('div');
    detailHeader.className = 'detail-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'detail-title-group';

    const title = document.createElement('h1');
    title.className = 'detail-title';
    title.textContent = monster.title || monster.name || 'Unknown Monster';

    const subtitle = document.createElement('p');
    subtitle.className = 'detail-subtitle';
    subtitle.textContent = monster.explanation || monster.type || '';

    titleGroup.appendChild(title);
    titleGroup.appendChild(subtitle);
    detailHeader.appendChild(titleGroup);
    detailShell.appendChild(detailHeader);

    const contentGrid = document.createElement('div');
    contentGrid.className = 'detail-grid';

    const mainPanel = document.createElement('div');
    mainPanel.className = 'detail-panel';
    const heading = document.createElement('h2');
    heading.textContent = 'Details';
    mainPanel.appendChild(heading);

    if (monster.details && Array.isArray(monster.details) && monster.details.length > 0) {
      monster.details.forEach(detail => {
        mainPanel.appendChild(renderDetail(detail));
      });
    } else {
      const empty = document.createElement('div');
      empty.className = 'detail-value';
      empty.textContent = 'No details available.';
      mainPanel.appendChild(empty);
    }

    contentGrid.appendChild(mainPanel);

    const sections = [
      { title: 'Traits', items: monster.traits },
      { title: 'Actions', items: monster.actions },
      { title: 'Bonus Actions', items: monster.bonus_actions },
      { title: 'Reactions', items: monster.reactions },
      { title: 'Legendary Actions', items: monster.legendary_actions },
      { title: 'Mythic Actions', items: monster.mythic_actions },
      { title: 'Spellcasting', items: monster.spellcasting }
    ];

    sections.forEach(section => {
      const sectionPanel = renderSectionPanel(section.title, section.items);
      if (sectionPanel) contentGrid.appendChild(sectionPanel);
    });

    detailShell.appendChild(contentGrid);
    monsterDetailShell.appendChild(detailShell);
  }

  function showPlaceholder(message) {
    monsterDetailShell.innerHTML = `<div class="monster-detail-placeholder">${escapeHtml(message)}</div>`;
  }

  function selectMonster(title, clearSearch = false) {
    selectedMonsterTitle = title;
    const items = Array.from(monsterListEl.children);
    items.forEach(item => item.classList.toggle('selected', item.dataset.title === title));

    if (clearSearch && searchInput.value.trim()) {
      suppressInputChange = true;
      searchInput.value = '';
      monsterListEl.innerHTML = '';
      updateMonsterCount(0, 'Type a monster name to begin.');
    }

    loadMonsterDetail(title);
  }

  async function loadMonsterDetail(title) {
    if (!title) {
      showPlaceholder('Select a monster from the list.');
      return;
    }
    showPlaceholder(`Loading ${title}...`);
    try {
      const monster = await apiFetch(`/monsters/${encodeURIComponent(title)}`);
      displayMonster(monster);
    } catch (error) {
      showPlaceholder(error.message || 'Monster not found.');
    }
  }

  function renderMonsterList(items) {
    monsterListEl.innerHTML = '';
    if (!items.length) {
      monsterListEl.innerHTML = '<div class="monster-detail-placeholder">No monsters found.</div>';
      return;
    }
    items.forEach(monster => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'monster-list-item';
      item.dataset.title = monster.name;
      item.innerHTML = `
        <div class="monster-list-item-title">${escapeHtml(monster.name)}</div>
        <div class="monster-list-item-subtitle">Click to view details</div>
      `;
      item.addEventListener('click', () => selectMonster(monster.name, true));
      monsterListEl.appendChild(item);
    });
  }

  function updateMonsterCount(count, fallback) {
    if (typeof count === 'number' && count > 0) {
      monsterCount.textContent = `${count} monster${count === 1 ? '' : 's'} available`;
    } else {
      monsterCount.textContent = fallback || 'Type a monster name to begin.';
    }
  }

  function filterMonsters(term) {
    const lower = term.trim().toLowerCase();
    if (!lower) return monsters;
    return monsters.filter(monster => monster.name.toLowerCase().includes(lower));
  }

  searchInput.addEventListener('input', () => {
    if (suppressInputChange) {
      suppressInputChange = false;
      return;
    }

    const query = searchInput.value.trim();
    if (!query) {
      monsterListEl.innerHTML = '';
      updateMonsterCount(0, 'Type a monster name to begin.');
      showPlaceholder('Type a monster name to begin.');
      selectedMonsterTitle = null;
      return;
    }

    const filtered = filterMonsters(query);
    renderMonsterList(filtered);
    updateMonsterCount(filtered.length);
    if (!filtered.find(monster => monster.name === selectedMonsterTitle)) {
      if (filtered.length) {
        selectMonster(filtered[0].name);
      } else {
        showPlaceholder('No monsters match your search.');
      }
    }
  });

  async function loadMonsters() {
    try {
      monsters = await apiFetch('/monsters');
      monsters.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }));
      const requestedTitle = getQueryParam('title');

      if (requestedTitle) {
        searchInput.value = requestedTitle;
        const visibleMonsters = filterMonsters(requestedTitle);
        renderMonsterList(visibleMonsters);
        updateMonsterCount(visibleMonsters.length);

        if (visibleMonsters.length > 0) {
          const requestedMonster = visibleMonsters.find(monster => String(monster.name).toLowerCase() === String(requestedTitle).toLowerCase());
          selectMonster(requestedMonster ? requestedMonster.name : visibleMonsters[0].name);
        } else {
          showPlaceholder(`No monsters matched "${requestedTitle}".`);
        }
      } else {
        monsterListEl.innerHTML = '';
        updateMonsterCount(0, 'Type a monster name to begin.');
        showPlaceholder('Type a monster name to begin.');
      }
    } catch (error) {
      showPlaceholder(error.message || 'Could not load monster list.');
      monsterCount.textContent = 'Error loading monsters';
    }
  }

  loadMonsters();
});
