// Spell list-style page demo

document.addEventListener('DOMContentLoaded', async function() {
  const container = document.getElementById('page-container');

  try {
    const response = await fetch('/api/spells');
    if (!response.ok) {
      throw new Error(`Failed to load spells from API: ${response.status}`);
    }

    const spells = await response.json();
    if (!Array.isArray(spells)) {
      throw new Error('Invalid spell data returned from API');
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

    const rangeDisplayMode = localStorage.getItem('range_display_mode') || 'standard';

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

    const classCodes = [...new Set(spells.flatMap(spell => normalizeSpellClasses(spell.classes)))].sort();
    const selectedClasses = new Set(classCodes);

    const rangeSelect = document.getElementById('range-display-mode');
    const classButtons = document.getElementById('class-buttons');

    function getHiddenCardIds() {
      return JSON.parse(localStorage.getItem('hidden_cards') || '[]');
    }

    function getSpellCardId(spell) {
      return spell.id ? `card-${spell.id}` : `card-${String(spell.title || spell.name || '').toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    }

    function createResetHiddenButton() {
      const resetHiddenBtn = document.createElement('button');
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
      return resetHiddenBtn;
    }

    let resetHiddenBtn = null;
    const existingPrintOptions = document.getElementById('print-options');
    if (existingPrintOptions) {
      resetHiddenBtn = createResetHiddenButton();
      const hiddenCards = getHiddenCardIds();
      resetHiddenBtn.style.display = hiddenCards.length > 0 ? 'inline-block' : 'none';
      existingPrintOptions.appendChild(resetHiddenBtn);
    }

    if (rangeSelect) {
      rangeSelect.value = rangeDisplayMode;
      rangeSelect.addEventListener('change', function() {
        localStorage.setItem('range_display_mode', this.value);
        renderSpellList();
      });
    }

    if (classButtons && classCodes.length > 0) {
      classCodes.forEach(cls => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'level-btn active';
        btn.textContent = cls.charAt(0).toUpperCase() + cls.slice(1);
        btn.setAttribute('data-class', cls);

        selectedClasses.add(cls);

        btn.addEventListener('click', function(e) {
          e.preventDefault();
          const classCode = this.getAttribute('data-class');
          if (selectedClasses.has(classCode)) {
            selectedClasses.delete(classCode);
            this.classList.remove('active');
          } else {
            selectedClasses.add(classCode);
            this.classList.add('active');
          }
          renderSpellList();
        });

        classButtons.appendChild(btn);
      });
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
        const spellClasses = normalizeSpellClasses(spell.classes);
        const spellId = getSpellCardId(spell);
        const matchesClass = classCodes.length === 0 || selectedClasses.size === 0
          ? false
          : spellClasses.some(cls => selectedClasses.has(cls));

        if (classCodes.length === 0) {
          return !hiddenCards.includes(spellId);
        }
        if (selectedClasses.size === 0) {
          return false;
        }
        return matchesClass && !hiddenCards.includes(spellId);
      });

      renderListCards(
        '#page-container',
        filteredSpells,
        'Spell Cards — List View',
        'Flexible A4 horizontal width with vertical stacking',
        renderSpellList
      );

      if (resetHiddenBtn) {
        resetHiddenBtn.style.display = hiddenCards.length > 0 ? 'inline-block' : 'none';
      }
    }

    renderSpellList();
  } catch (error) {
    console.error('Error loading spell list:', error);
    if (container) {
      container.innerHTML = `<div style="padding: 20px; color: #800;">Error loading spells: ${error.message}</div>`;
    }
  }
});
