// New spell page demo using the shared card renderer and hover preview helper

document.addEventListener('DOMContentLoaded', async function() {
  const statusEl = document.getElementById('page-status');
  const previewLinks = document.getElementById('preview-links');

  try {
    const response = await fetch('/api/spells');
    if (!response.ok) {
      throw new Error(`Failed to load spells from API: ${response.status}`);
    }

    const spells = await response.json();
    if (!Array.isArray(spells)) {
      throw new Error('API returned invalid spell data');
    }

    const classCodes = [...new Set(spells.flatMap(spell => Array.isArray(spell.classes) ? spell.classes : []))].sort();
    const selectedClasses = new Set(classCodes);

    function getFilteredSpells() {
      return spells.filter(spell => {
        const spellClasses = Array.isArray(spell.classes) ? spell.classes : [];
        return selectedClasses.size === 0 || spellClasses.some(cls => selectedClasses.has(cls));
      });
    }

    function renderSpellCards() {
      const filtered = getFilteredSpells();
      document.getElementById('page-container').innerHTML = '';
      renderPaginatedCards(
        '#page-container',
        filtered,
        9,
        'Spell Cards',
        'Database-driven spell cards rendered with a shared card component.'
      );
      statusEl.textContent = `Loaded ${filtered.length} spells.`;
    }

    const classButtons = document.getElementById('class-buttons');
    if (classButtons && classCodes.length > 0) {
      classCodes.forEach(cls => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'preview-link active';
        button.textContent = cls.charAt(0).toUpperCase() + cls.slice(1);
        button.dataset.class = cls;

        button.addEventListener('click', function() {
          const classCode = this.dataset.class;
          if (selectedClasses.has(classCode)) {
            selectedClasses.delete(classCode);
            this.classList.remove('active');
          } else {
            selectedClasses.add(classCode);
            this.classList.add('active');
          }
          renderSpellCards();
        });

        classButtons.appendChild(button);
      });
    }

    renderSpellCards();

    if (spells.length > 0) {
      const sampleSpells = spells.slice(0, 6);
      const heading = document.createElement('div');
      heading.textContent = 'Hover these sample spells to preview the shared card layout:';
      heading.style.fontWeight = '700';
      heading.style.color = '#2c1810';
      heading.style.marginBottom = '6px';
      previewLinks.appendChild(heading);

      sampleSpells.forEach(spell => {
        const link = document.createElement('button');
        link.type = 'button';
        link.className = 'preview-link';
        link.textContent = spell.title;
        attachCardPreviewHover(link, spell);
        previewLinks.appendChild(link);
      });
    }

    statusEl.textContent = `Loaded ${spells.length} spells.`;
  } catch (error) {
    console.error('Error loading spells:', error);
    statusEl.textContent = `Error loading spells: ${error.message}`;
    document.getElementById('page-container').innerHTML = `<p style="color:#8b0000;">${error.message}</p>`;
  }
});
