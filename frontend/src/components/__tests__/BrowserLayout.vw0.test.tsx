import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../api/client'
import type {
  Spell,
  Weapon,
  Player,
  Quest,
  Monster,
  NPC,
  Item,
  LootBundle,
  Encounter,
  Dungeon,
} from '../../api/types'

/* ------------------------------------------------------------------ */
/*  Fixture data                                                      */
/* ------------------------------------------------------------------ */

const spellA: Spell = {
  id: 1,
  name: 'Cure Wounds',
  level: 1,
  school: 'Evocation',
  description: 'A creature regains 1d8+3 hit points.',
  alternate_description: null,
  casting_times: ['1 action'],
  range: 'Touch',
  duration: 'Instantaneous',
  components: ['V', 'S'],
  materials: null,
  concentration: false,
  ritual: false,
  higher_levels: { text: '', damage_by_slot: {} },
  damage: [],
  healing: { amount: null, temp_hp: false, max_hp: false },
  attacks: [],
  area_of_effect: { shape: null, size: null },
}

const spellB: Spell = {
  id: 2,
  name: 'Fireball',
  level: 3,
  school: 'Evocation',
  description: 'A bright streak flashes.',
  alternate_description: null,
  casting_times: ['1 action'],
  range: '150 feet',
  duration: 'Instantaneous',
  components: ['V', 'S', 'M'],
  materials: 'A tiny ball of bat guano and sulfur.',
  concentration: false,
  ritual: false,
  higher_levels: { text: '', damage_by_slot: {} },
  damage: [],
  healing: { amount: null, temp_hp: false, max_hp: false },
  attacks: [],
  area_of_effect: { shape: null, size: null },
}

const weaponA: Weapon = {
  id: 1,
  name: 'Longsword',
  base_weapon: 'Longsword',
  rarity: 'Common',
  weapon_category: 'Martial',
  weight: 3,
  req_attune: null,
  property: [],
  focus: [],
  attack: [],
  entries: [],
}

const weaponB: Weapon = {
  id: 2,
  name: 'Dagger',
  base_weapon: 'Dagger',
  rarity: 'Common',
  weapon_category: 'Simple',
  weight: 1,
  req_attune: null,
  property: [],
  focus: [],
  attack: [],
  entries: [],
}

const playerA: Player = {
  id: 1,
  name: 'Aelindra',
  class_: 'Wizard',
  level: 5,
}

const playerB: Player = {
  id: 2,
  name: 'Brom',
  class_: 'Fighter',
  level: 3,
}

const questA: Quest = {
  id: 1,
  title: 'Lost Mine',
  summary: 'Find the mine.',
  reward: [],
  objectives: [],
  details: [],
}

const questB: Quest = {
  id: 2,
  title: 'Dragon Attack',
  summary: 'Defend the village.',
  reward: [],
  objectives: [],
  details: [],
}

const monsterA: Monster = {
  id: 1,
  name: 'Goblin',
  aliases: [],
  sizes: ['small'],
  family: null,
  alignment: null,
  creature_type: null,
  ac: { value: 15, note: null, alternatives: [] },
  hp: { average: 7, formula: '2d6' },
  speed: [{ mode: 'walk', feet: 30, note: null, hover: false }],
  abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
  saving_throws: {},
  skills: {},
  passive_perception: null,
  damage_resistances: [],
  damage_immunities: [],
  damage_vulnerabilities: [],
  condition_immunities: [],
  senses: [],
  languages: [],
  audio_path: null,
  features: {
    traits: [],
    spellcasting: [],
    actions: [],
    bonus_actions: [],
    reactions: [],
    reaction_intro: null,
    legendary_actions: [],
    legendary_intro: null,
    legendary_actions_per_round: null,
    mythic_actions: [],
  },
  cr: '1/4',
  cr_sort: 0.25,
  cr_note: null,
  experience_points: null,
}

const monsterB: Monster = {
  id: 2,
  name: 'Orc',
  aliases: [],
  sizes: ['medium'],
  family: null,
  alignment: null,
  creature_type: null,
  ac: { value: 13, note: null, alternatives: [] },
  hp: { average: 15, formula: '2d8+6' },
  speed: [{ mode: 'walk', feet: 30, note: null, hover: false }],
  abilities: { str: 16, dex: 12, con: 16, int: 7, wis: 11, cha: 10 },
  saving_throws: {},
  skills: {},
  passive_perception: null,
  damage_resistances: [],
  damage_immunities: [],
  damage_vulnerabilities: [],
  condition_immunities: [],
  senses: [],
  languages: [],
  audio_path: null,
  features: {
    traits: [],
    spellcasting: [],
    actions: [],
    bonus_actions: [],
    reactions: [],
    reaction_intro: null,
    legendary_actions: [],
    legendary_intro: null,
    legendary_actions_per_round: null,
    mythic_actions: [],
  },
  cr: '1/2',
  cr_sort: 0.5,
  cr_note: null,
  experience_points: null,
}

const npcA: NPC = {
  id: 1,
  name: 'Eldra',
  race: 'Elf',
  gender: 'Female',
  background: 'Sage',
  stats: { str: 10, dex: 14, con: 12, int: 16, wis: 13, cha: 11 },
  appearance: { summary: 'Tall with silver hair.' },
  armor_class: 12,
  hit_points: 22,
  speed: '30 ft.',
  notes: 'A helpful wizard.',
}

const npcB: NPC = {
  id: 2,
  name: 'Grett',
  race: 'Human',
  gender: 'Male',
  background: 'Soldier',
  stats: { str: 16, dex: 12, con: 14, int: 10, wis: 11, cha: 12 },
  appearance: { summary: 'Stocky build.' },
  armor_class: 16,
  hit_points: 45,
  speed: '30 ft.',
  notes: 'Retired guard.',
}

const itemA: Item = {
  id: 1,
  name: 'Healing Potion',
  value_gp: 50,
  category: 'Potion',
  description: 'Restores 2d4+2 hit points.',
}

const itemB: Item = {
  id: 2,
  name: 'Rope',
  value_gp: 1,
  category: 'Adventuring Gear',
  description: '50 feet of hempen rope.',
}

const lootA: LootBundle = {
  id: 1,
  name: 'Goblin Stash',
  gold: 25,
  contents: [],
}

const lootB: LootBundle = {
  id: 2,
  name: 'Dragon Hoard',
  gold: 500,
  contents: [],
}

const encounterA: Encounter = {
  id: 1,
  title: 'Goblin Ambush',
  creatures: [
    {
      monster_id: 1,
      original_name: 'Goblin',
      name: 'Goblin',
      hp_current: 7,
      hp_max: 7,
      ac: 15,
      status: 'alive',
      conditions: [],
    },
  ],
}

const encounterB: Encounter = {
  id: 2,
  title: 'Orc Warband',
  creatures: [],
}

const dungeonA: Dungeon = {
  id: 1,
  title: 'Cave of Wonders',
  data: {},
}

const dungeonB: Dungeon = {
  id: 2,
  title: 'Shadow Fortress',
  data: {},
}

/* ------------------------------------------------------------------ */
/*  Standard browsers — Spells, Weapons, Players, Quests              */
/* ------------------------------------------------------------------ */

describe('VW0 standard browsers', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('SpellBrowser: lists sorted spells, first selected, detail updates on click', async () => {
    vi.spyOn(api, 'listSpells').mockResolvedValue([spellB, spellA])
    const user = userEvent.setup()

    const { SpellBrowserPage } = await import('../../features/spells/SpellBrowserPage')
    render(<SpellBrowserPage />)

    await waitFor(() => expect(screen.getByRole('heading', { name: /Cure Wounds/ })).toBeInTheDocument())
    expect(screen.getAllByText(/1st Level/)).not.toHaveLength(0)

    await user.click(screen.getByText('Fireball'))
    expect(screen.getByRole('heading', { name: /Fireball/ })).toBeInTheDocument()
    expect(screen.getByText('150 feet')).toBeInTheDocument()
  })

  it('SpellBrowser: opens editor on New Spell click', async () => {
    vi.spyOn(api, 'listSpells').mockResolvedValue([spellA])
    const user = userEvent.setup()

    const { SpellBrowserPage } = await import('../../features/spells/SpellBrowserPage')
    render(<SpellBrowserPage />)

    await waitFor(() => expect(screen.getByRole('heading', { name: /Cure Wounds/ })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'New Spell' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('SpellBrowser: shows error on API failure', async () => {
    vi.spyOn(api, 'listSpells').mockRejectedValue(new Error('network down'))

    const { SpellBrowserPage } = await import('../../features/spells/SpellBrowserPage')
    render(<SpellBrowserPage />)

    await waitFor(() => expect(screen.getByText(/network down/)).toBeInTheDocument())
  })

  it('SpellBrowser: shows no-selection prompt when no items', async () => {
    vi.spyOn(api, 'listSpells').mockResolvedValue([])

    const { SpellBrowserPage } = await import('../../features/spells/SpellBrowserPage')
    render(<SpellBrowserPage />)

    await waitFor(() => expect(screen.getByText(/No spells found/)).toBeInTheDocument())
  })

  it('WeaponBrowser: lists weapons sorted, first selected, detail updates on click', async () => {
    vi.spyOn(api, 'listWeapons').mockResolvedValue([weaponB, weaponA])
    const user = userEvent.setup()

    const { WeaponBrowserPage } = await import('../../features/weapons/WeaponBrowserPage')
    render(<WeaponBrowserPage />)

    await waitFor(() => expect(screen.getByRole('heading', { name: /Dagger/ })).toBeInTheDocument())

    await user.click(screen.getByText('Longsword'))
    expect(screen.getByRole('heading', { name: /Longsword/ })).toBeInTheDocument()
  })

  it('WeaponBrowser: opens editor on New Weapon click', async () => {
    vi.spyOn(api, 'listWeapons').mockResolvedValue([weaponA])
    const user = userEvent.setup()

    const { WeaponBrowserPage } = await import('../../features/weapons/WeaponBrowserPage')
    render(<WeaponBrowserPage />)

    await waitFor(() => expect(screen.getByRole('heading', { name: /Longsword/ })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'New Weapon' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('WeaponBrowser: shows error on API failure', async () => {
    vi.spyOn(api, 'listWeapons').mockRejectedValue(new Error('network down'))

    const { WeaponBrowserPage } = await import('../../features/weapons/WeaponBrowserPage')
    render(<WeaponBrowserPage />)

    await waitFor(() => expect(screen.getByText(/network down/)).toBeInTheDocument())
  })

  it('PlayerBrowser: lists players sorted, first selected, detail updates on click', async () => {
    vi.spyOn(api, 'listPlayers').mockResolvedValue([playerB, playerA])
    vi.spyOn(api, 'listSpells').mockResolvedValue([])
    vi.spyOn(api, 'listWeapons').mockResolvedValue([])
    const user = userEvent.setup()

    const { PlayerBrowserPage } = await import('../../features/players/PlayerBrowserPage')
    render(<PlayerBrowserPage />)

    await waitFor(() => expect(screen.getByRole('heading', { name: /Aelindra/ })).toBeInTheDocument())

    await user.click(screen.getByText('Brom'))
    expect(screen.getByRole('heading', { name: /Brom/ })).toBeInTheDocument()
  })

  it('PlayerBrowser: opens editor on New Player click', async () => {
    vi.spyOn(api, 'listPlayers').mockResolvedValue([playerA])
    vi.spyOn(api, 'listSpells').mockResolvedValue([])
    vi.spyOn(api, 'listWeapons').mockResolvedValue([])
    const user = userEvent.setup()

    const { PlayerBrowserPage } = await import('../../features/players/PlayerBrowserPage')
    render(<PlayerBrowserPage />)

    await waitFor(() => expect(screen.getByRole('heading', { name: /Aelindra/ })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'New Player' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('QuestBrowser: lists quests sorted, first selected, detail updates on click', async () => {
    vi.spyOn(api, 'listQuests').mockResolvedValue([questB, questA])
    vi.spyOn(api, 'listNPCs').mockResolvedValue([])
    vi.spyOn(api, 'listDungeons').mockResolvedValue([])
    const user = userEvent.setup()

    const { QuestBrowserPage } = await import('../../features/quests/QuestBrowserPage')
    render(<QuestBrowserPage />)

    await waitFor(() => expect(screen.getByRole('heading', { name: /Dragon Attack/ })).toBeInTheDocument())

    await user.click(screen.getByText('Lost Mine'))
    expect(screen.getByRole('heading', { name: /Lost Mine/ })).toBeInTheDocument()
  })

  it('QuestBrowser: opens editor on New Quest click', async () => {
    vi.spyOn(api, 'listQuests').mockResolvedValue([questA])
    vi.spyOn(api, 'listNPCs').mockResolvedValue([])
    vi.spyOn(api, 'listDungeons').mockResolvedValue([])
    const user = userEvent.setup()

    const { QuestBrowserPage } = await import('../../features/quests/QuestBrowserPage')
    render(<QuestBrowserPage />)

    await waitFor(() => expect(screen.getByRole('heading', { name: /Lost Mine/ })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'New Quest' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

/* ------------------------------------------------------------------ */
/*  Role-rich browsers — Monsters, NPCs, Items, Loot                  */
/* ------------------------------------------------------------------ */

describe('VW0 role-rich browsers', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('MonsterBrowser: lists sorted monsters, first selected, detail shows stat block', async () => {
    vi.spyOn(api, 'listMonsters').mockResolvedValue([monsterB, monsterA])

    const { MonsterBrowserPage } = await import('../../features/monsters/MonsterBrowserPage')
    render(
      <MemoryRouter>
        <MonsterBrowserPage />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByRole('heading', { name: /Goblin/ })).toBeInTheDocument())
    expect(screen.getAllByText(/CR 1\/4/).length).toBeGreaterThan(0)
  })

  it('MonsterBrowser: navigates to edit route on Edit click', async () => {
    vi.spyOn(api, 'listMonsters').mockResolvedValue([monsterA])

    const { MonsterBrowserPage } = await import('../../features/monsters/MonsterBrowserPage')
    render(
      <MemoryRouter initialEntries={['/monsters']}>
        <Routes>
          <Route path="/monsters" element={<MonsterBrowserPage />} />
          <Route path="/monsters/:id/edit" element={<p>Edit page</p>} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByRole('heading', { name: /Goblin/ })).toBeInTheDocument())
    await userEvent.setup().click(screen.getByRole('button', { name: /Edit/ }))
    expect(screen.getByText('Edit page')).toBeInTheDocument()
  })

  it('NPCBrowser: lists NPCs sorted, first selected, detail shows NPCStatCard', async () => {
    vi.spyOn(api, 'listNPCs').mockResolvedValue([npcB, npcA])

    const { NPCBrowserPage } = await import('../../features/npcs/NPCBrowserPage')
    render(<NPCBrowserPage />)

    await waitFor(() => expect(screen.getByRole('heading', { name: /Eldra/ })).toBeInTheDocument())
    expect(screen.getAllByText(/Elf/).length).toBeGreaterThan(0)
  })

  it('NPCBrowser: opens editor on New NPC click', async () => {
    vi.spyOn(api, 'listNPCs').mockResolvedValue([npcA])
    const user = userEvent.setup()

    const { NPCBrowserPage } = await import('../../features/npcs/NPCBrowserPage')
    render(<NPCBrowserPage />)

    await waitFor(() => expect(screen.getByRole('heading', { name: /Eldra/ })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'New NPC' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('ItemBrowser: lists items sorted, first selected, detail shows Card with category', async () => {
    vi.spyOn(api, 'listItems').mockResolvedValue([itemB, itemA])
    const user = userEvent.setup()

    const { ItemBrowserPage } = await import('../../features/items/ItemBrowserPage')
    render(<ItemBrowserPage />)

    await waitFor(() => expect(screen.getByRole('heading', { name: /Healing Potion/ })).toBeInTheDocument())

    await user.click(screen.getByText('Rope'))
    expect(screen.getByRole('heading', { name: /Rope/ })).toBeInTheDocument()
  })

  it('ItemBrowser: shows rich empty state when no items', async () => {
    vi.spyOn(api, 'listItems').mockResolvedValue([])

    const { ItemBrowserPage } = await import('../../features/items/ItemBrowserPage')
    render(<ItemBrowserPage />)

    await waitFor(() => expect(screen.getByText(/Start your item catalog/)).toBeInTheDocument())
  })

  it('LootBundleBrowser: lists bundles, first selected, detail shows gold and contents', async () => {
    vi.spyOn(api, 'listLootBundles').mockResolvedValue([lootB, lootA])
    const user = userEvent.setup()

    const { LootBundleBrowserPage } = await import('../../features/loot/LootBundleBrowserPage')
    render(<LootBundleBrowserPage />)

    await waitFor(() => expect(screen.getByRole('heading', { name: /Dragon Hoard/ })).toBeInTheDocument())

    await user.click(screen.getByText('Goblin Stash'))
    expect(screen.getByRole('heading', { name: /Goblin Stash/ })).toBeInTheDocument()
  })

  it('LootBundleBrowser: shows rich empty state when no bundles', async () => {
    vi.spyOn(api, 'listLootBundles').mockResolvedValue([])

    const { LootBundleBrowserPage } = await import('../../features/loot/LootBundleBrowserPage')
    render(<LootBundleBrowserPage />)

    await waitFor(() => expect(screen.getByText(/Build the first reward/)).toBeInTheDocument())
  })
})

/* ------------------------------------------------------------------ */
/*  Action browsers — Encounters, Dungeons                            */
/* ------------------------------------------------------------------ */

describe('VW0 action browsers', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it.skip('EncounterBrowser: lists encounters, first selected, detail shows creature list', async () => {
    vi.spyOn(api, 'listEncounters').mockResolvedValue([encounterB, encounterA])
    vi.spyOn(api, 'listMonsters').mockResolvedValue([])
    const user = userEvent.setup()

    const { EncounterBrowserPage } = await import('../../features/encounters/EncounterBrowserPage')
    render(
      <MemoryRouter>
        <EncounterBrowserPage />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByRole('heading', { name: /Goblin Ambush/ })).toBeInTheDocument())
    expect(screen.getByText('Goblin')).toBeInTheDocument()

    await user.click(screen.getByText('Orc Warband'))
    expect(screen.getByRole('heading', { name: /Orc Warband/ })).toBeInTheDocument()
    expect(screen.getByText('No creatures in this encounter.')).toBeInTheDocument()
  })

  it.skip('EncounterBrowser: Run button navigates to runner route', async () => {
    vi.spyOn(api, 'listEncounters').mockResolvedValue([encounterA])
    vi.spyOn(api, 'listMonsters').mockResolvedValue([])

    const { EncounterBrowserPage } = await import('../../features/encounters/EncounterBrowserPage')
    render(
      <MemoryRouter initialEntries={['/encounters']}>
        <Routes>
          <Route path="/encounters" element={<EncounterBrowserPage />} />
          <Route path="/encounters/:id/run" element={<p>Runner page</p>} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByRole('heading', { name: /Goblin Ambush/ })).toBeInTheDocument())
    await userEvent.setup().click(screen.getByRole('button', { name: /Run/ }))
    expect(screen.getByText('Runner page')).toBeInTheDocument()
  })

  it.skip('DungeonBrowser: lists dungeons, first selected, detail shows room count', async () => {
    vi.spyOn(api, 'listDungeons').mockResolvedValue([dungeonB, dungeonA])

    const { DungeonBrowserPage } = await import('../../features/dungeons/DungeonBrowserPage')
    render(
      <MemoryRouter>
        <DungeonBrowserPage />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByRole('heading', { name: /Cave of Wonders/ })).toBeInTheDocument())
  })

  it.skip('DungeonBrowser: create button navigates to editor route', async () => {
    vi.spyOn(api, 'listDungeons').mockResolvedValue([])
    vi.spyOn(api, 'createDungeon').mockResolvedValue({ id: 99, title: 'Untitled Dungeon', data: {} })

    const { DungeonBrowserPage } = await import('../../features/dungeons/DungeonBrowserPage')
    render(
      <MemoryRouter initialEntries={['/dungeons']}>
        <Routes>
          <Route path="/dungeons" element={<DungeonBrowserPage />} />
          <Route path="/dungeons/:id/edit" element={<p>Edit dungeon</p>} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByRole('button', { name: /New Dungeon/ })).toBeInTheDocument())
    await userEvent.setup().click(screen.getByRole('button', { name: /New Dungeon/ }))
    await waitFor(() => expect(screen.getByText('Edit dungeon')).toBeInTheDocument())
  })

  it.skip('DungeonBrowser: Enter button navigates to dungeon route', async () => {
    vi.spyOn(api, 'listDungeons').mockResolvedValue([dungeonA])

    const { DungeonBrowserPage } = await import('../../features/dungeons/DungeonBrowserPage')
    render(
      <MemoryRouter initialEntries={['/dungeons']}>
        <Routes>
          <Route path="/dungeons" element={<DungeonBrowserPage />} />
          <Route path="/dungeons/:id" element={<p>Dungeon viewer</p>} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByRole('heading', { name: /Cave of Wonders/ })).toBeInTheDocument())
    await userEvent.setup().click(screen.getByRole('button', { name: /Enter/ }))
    expect(screen.getByText('Dungeon viewer')).toBeInTheDocument()
  })
})

/* ------------------------------------------------------------------ */
/*  BrowserLayout unit — the new shared component                     */
/* ------------------------------------------------------------------ */

describe('BrowserLayout', () => {
  it('renders title, actions, list, and detail in correct regions', async () => {
    const { BrowserLayout } = await import('../BrowserLayout')

    render(
      <BrowserLayout
        title="Test Browser"
        actions={<button type="button">New Item</button>}
        list={<p>List content</p>}
        detail={<p>Detail content</p>}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Test Browser' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New Item' })).toBeInTheDocument()
    expect(screen.getByText('List content')).toBeInTheDocument()
    expect(screen.getByText('Detail content')).toBeInTheDocument()
  })

  it('renders error with role="alert" when error prop is provided', async () => {
    const { BrowserLayout } = await import('../BrowserLayout')

    render(
      <BrowserLayout
        title="Test"
        error="Something broke"
        list={<p>List</p>}
        detail={<p>Detail</p>}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Something broke')
  })

  it('does not render error region when error is null', async () => {
    const { BrowserLayout } = await import('../BrowserLayout')

    render(
      <BrowserLayout
        title="Test"
        error={null}
        list={<p>List</p>}
        detail={<p>Detail</p>}
      />,
    )

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders editor and dialog when provided', async () => {
    const { BrowserLayout } = await import('../BrowserLayout')

    render(
      <BrowserLayout
        title="Test"
        list={<p>List</p>}
        detail={<p>Detail</p>}
        editor={<div data-testid="editor">Editor modal</div>}
        dialog={<div data-testid="dialog">Confirm dialog</div>}
      />,
    )

    expect(screen.getByTestId('editor')).toBeInTheDocument()
    expect(screen.getByTestId('dialog')).toBeInTheDocument()
  })
})
