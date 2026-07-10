(function(window) {
  const API_BASE = '/api';

  async function apiFetch(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, options);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.error || `Failed to load ${path} (${response.status})`);
    }
    return body;
  }

  window.ApiHelpers = window.ApiHelpers || {};
  window.ApiHelpers.API_BASE = API_BASE;
  window.ApiHelpers.apiFetch = apiFetch;

  window.ApiHelpers.ApiService = {
    // Classes
    getClasses: () => apiFetch('/classes'),

    // Abilities
    getAbilities: () => apiFetch('/abilities'),

    // Damage Types
    getDamageTypes: () => apiFetch('/damage_types'),

    // Spell Components
    getSpellComponents: () => apiFetch('/spell-components'),

    // Skills
    getSkills: () => apiFetch('/skills'),
    getSkillByTitle: (title) => apiFetch(`/skills/${title}`),

    // Conditions
    getConditions: () => apiFetch('/conditions'),
    getConditionByTitle: (title) => apiFetch(`/conditions/${title}`),

    // Spells
    getSpells: () => apiFetch('/spells'),
    getSpellByTitle: (title) => apiFetch(`/spells/${title}`),
    getSpellRaw: (id) => apiFetch(`/spells/id/${id}/raw`),
    createSpell: (data) => apiFetch('/spells', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    updateSpell: (id, data) => apiFetch(`/spells/id/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    deleteSpell: (id) => apiFetch(`/spells/${id}`, {
      method: 'DELETE'
    }),

    // Weapons
    getWeapons: () => apiFetch('/weapons'),
    getWeaponByTitle: (title) => apiFetch(`/weapons/${title}`),

    // Monsters
    getMonsters: (query = '', page = 1, perPage = 8) => {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      if (page > 1) params.append('page', page);
      if (perPage) params.append('per_page', perPage);
      const queryString = params.toString() ? `?${params.toString()}` : '';
      return apiFetch(`/monsters${queryString}`);
    },
    getMonsterByTitle: (title) => apiFetch(`/monsters/${title}`),

    // Players
    getPlayers: () => apiFetch('/players'),
    getPlayerById: (id) => apiFetch(`/players/${id}`),
    createPlayer: (data) => apiFetch('/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    updatePlayer: (id, data) => apiFetch(`/players/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    deletePlayer: (id) => apiFetch(`/players/${id}`, {
      method: 'DELETE'
    }),

    // Player Spells
    getPlayerSpells: (playerId) => apiFetch(`/players/${playerId}/spells`),
    addSpellToPlayer: (playerId, spellId, atWill) => apiFetch(`/players/${playerId}/spells`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spell_id: spellId, at_will: atWill })
    }),
    removeSpellFromPlayer: (playerId, spellId) => apiFetch(`/players/${playerId}/spells/${spellId}`, {
      method: 'DELETE'
    }),

    // Player Weapons
    getPlayerWeapons: (playerId) => apiFetch(`/players/${playerId}/weapons`),
    addWeaponToPlayer: (playerId, weaponId) => apiFetch(`/players/${playerId}/weapons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weapon_id: weaponId })
    }),
    removeWeaponFromPlayer: (playerId, weaponId) => apiFetch(`/players/${playerId}/weapons/${weaponId}`, {
      method: 'DELETE'
    }),

    // NPCs
    getNpcs: () => apiFetch('/npcs'),
    getNpcById: (id) => apiFetch(`/npcs/${id}`),
    createNpc: (data) => apiFetch('/npcs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    updateNpc: (id, data) => apiFetch(`/npcs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    deleteNpc: (id) => apiFetch(`/npcs/${id}`, {
      method: 'DELETE'
    }),

    // Quests
    getQuests: () => apiFetch('/quests'),
    getQuestById: (id) => apiFetch(`/quests/${id}`),
    createQuest: (data) => apiFetch('/quests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    updateQuest: (id, data) => apiFetch(`/quests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    deleteQuest: (id) => apiFetch(`/quests/${id}`, {
      method: 'DELETE'
    }),

    // Dungeons
    getDungeons: () => apiFetch('/dungeons'),
    getDungeonById: (id) => apiFetch(`/dungeons/${id}`),
    createDungeon: (data) => apiFetch('/dungeons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    updateDungeon: (id, data) => apiFetch(`/dungeons/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    deleteDungeon: (id) => apiFetch(`/dungeons/${id}`, {
      method: 'DELETE'
    }),

    // Traps
    getTraps: () => apiFetch('/traps'),
    getTrapById: (id) => apiFetch(`/traps/${id}`),
    createTrap: (data) => apiFetch('/traps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    updateTrap: (id, data) => apiFetch(`/traps/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    deleteTrap: (id) => apiFetch(`/traps/${id}`, {
      method: 'DELETE'
    }),

    // Encounters
    getEncounters: () => apiFetch('/encounters'),
    getEncounterById: (id) => apiFetch(`/encounters/${id}`),
    createEncounter: (data) => apiFetch('/encounters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    updateEncounter: (id, data) => apiFetch(`/encounters/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    deleteEncounter: (id) => apiFetch(`/encounters/${id}`, {
      method: 'DELETE'
    }), // All encounter API calls use API_BASE and /encounters path consistently.
  };
})(window);
