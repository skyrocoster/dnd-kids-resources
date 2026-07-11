import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import * as api from '../../../api/client'
import type { Dungeon } from '../../../api/types'
import { DungeonViewPage } from '../DungeonViewPage'

const islyDungeon: Dungeon = {
  id: 4,
  title: 'Isly Castle',
  data: {
    general_info: { title: 'Isly Castle', size: null, walls: null, floor: null, temperature: null, illumination: null },
    rooms: [
      {
        room_id: 1,
        title: 'Outside',
        entries: [],
      },
      {
        room_id: 2,
        title: 'Entrance Hall',
        entries: [
          {
            entry_type: 'feature',
            title: 'Pillars',
            content: 'Two large stone pillars engraved with writings.',
            is_hidden: false,
            hidden_dc: null,
            container: null,
            container_mechanics: null,
            count: null,
            monster_id: null,
            encounter_id: null,
            trap_ids: [],
            treasure_contents: [],
          },
        ],
      },
      {
        room_id: 3,
        title: 'Portal Room',
        entries: [
          {
            entry_type: 'feature',
            title: 'Stone Archways',
            content: 'Two rows of large archways set upon marble pedestals.',
            is_hidden: false,
            hidden_dc: null,
            container: null,
            container_mechanics: null,
            count: null,
            monster_id: null,
            encounter_id: null,
            trap_ids: [],
            treasure_contents: [],
          },
          {
            entry_type: 'trap',
            title: 'Paralysing Light',
            content: 'Attempting to touch or use a portal without the portal master results in a paralysing spell (DC 18 Con save).',
            is_hidden: false,
            hidden_dc: null,
            container: null,
            container_mechanics: null,
            count: null,
            monster_id: null,
            encounter_id: null,
            trap_ids: [],
            treasure_contents: [],
          },
          {
            entry_type: 'encounter',
            title: 'Guardian Encounter',
            content: 'An encounter with magical guardians protecting the portal.',
            is_hidden: false,
            hidden_dc: null,
            container: null,
            container_mechanics: null,
            count: null,
            monster_id: null,
            encounter_id: 1,
            trap_ids: [],
            treasure_contents: [],
          },
        ],
        npcs: [4],
      },
      {
        room_id: 4,
        title: 'Treasure Room',
        entries: [
          {
            entry_type: 'treasure',
            title: 'Gold Coins',
            content: 'A pile of gold coins in a wooden chest.',
            is_hidden: false,
            hidden_dc: null,
            container: 'wooden chest',
            container_mechanics: 'locked, DC 15 to pick',
            count: 250,
            monster_id: null,
            encounter_id: null,
            trap_ids: [1],
            treasure_contents: [
              { quantity: 250, name: 'Gold Coins', value: 250 },
              { quantity: 1, name: 'Gem', value: 500 },
            ],
          },
        ],
      },
      {
        room_id: 5,
        title: 'Monster Lair',
        entries: [
          {
            entry_type: 'monster',
            title: 'Ancient Dragon',
            content: 'A massive dragon dealing 2d6+3 damage with each attack.',
            is_hidden: false,
            hidden_dc: null,
            container: null,
            container_mechanics: null,
            count: 1,
            monster_id: 42,
            encounter_id: null,
            trap_ids: [],
            treasure_contents: [],
          },
          {
            entry_type: 'feature',
            title: 'Hidden Treasure',
            content: 'A secret stash of treasure.',
            is_hidden: true,
            hidden_dc: 16,
            container: null,
            container_mechanics: null,
            count: null,
            monster_id: null,
            encounter_id: null,
            trap_ids: [],
            treasure_contents: [],
          },
        ],
      },
    ],
    doors: [
      {
        door_id: 1,
        entry_type: 'door',
        title: 'Great Double Wooden Doors',
        content: '',
        leads_to: [2, 1],
        is_hidden: false,
        hidden_dc: null,
        door_mechanics: null,
        trap_ids: [],
      },
      {
        door_id: 2,
        entry_type: 'door',
        title: 'Double Stone Doors',
        content: 'Inscribed with large runes.',
        leads_to: [3, 2],
        is_hidden: false,
        hidden_dc: null,
        door_mechanics: null,
        trap_ids: [],
      },
    ],
    corridors: [],
    map_image: null,
    map_image_length: 0,
  },
}

describe('DungeonViewPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  const renderWithRouter = (dungeonId?: number, roomId?: number) => {
    const initialPath = dungeonId
      ? roomId
        ? `/dungeons/${dungeonId}/rooms/${roomId}`
        : `/dungeons/${dungeonId}`
      : '/dungeons/4'

    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/dungeons/:dungeonId" element={<DungeonViewPage />} />
          <Route path="/dungeons/:dungeonId/rooms/:roomId" element={<DungeonViewPage />} />
        </Routes>
      </MemoryRouter>,
    )
  }

  it('loads dungeon and displays room content', async () => {
    vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeon)

    renderWithRouter(4)

    await waitFor(() => expect(screen.getByText('Isly Castle')).toBeInTheDocument())
    // First room should be displayed
    expect(screen.getByText('Outside')).toBeInTheDocument()
  })

  it('displays room title and entries grouped by type', async () => {
    vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeon)
    const user = userEvent.setup()

    renderWithRouter(4, 3) // Render Portal Room directly (room 3)

    await waitFor(() => expect(screen.getByText('Portal Room')).toBeInTheDocument())

    // Check for entry groups (emoji + label)
    expect(screen.getByText(/✨ Features/)).toBeInTheDocument()
    expect(screen.getByText(/⚠️ Traps/)).toBeInTheDocument()
    expect(screen.getByText(/👥 Encounters/)).toBeInTheDocument()
  })

  it('displays hidden entries with DC badge', async () => {
    vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeon)

    renderWithRouter(4, 5) // Render Monster Lair (room 5)

    await waitFor(() => expect(screen.getByText('Monster Lair')).toBeInTheDocument())

    expect(screen.getByText('Hidden Treasure')).toBeInTheDocument()
    // Hidden badge should show
    expect(screen.getByTitle('Hidden, DC 16')).toBeInTheDocument()
    expect(screen.getByText(/🗝️ DC 16/)).toBeInTheDocument()
  })

  it('displays dice notation as gold pills', async () => {
    vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeon)

    renderWithRouter(4, 5) // Monster Lair

    await waitFor(() => expect(screen.getByText('Monster Lair')).toBeInTheDocument())

    // Check for dice notation wrapped in gold pill
    const dicePill = screen.getByText('2d6+3')
    expect(dicePill).toHaveClass('dice-pill')
  })

  it('displays count field for entries', async () => {
    vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeon)

    renderWithRouter(4, 5) // Monster Lair (has Ancient Dragon with count: 1)

    await waitFor(() => expect(screen.getByText('Monster Lair')).toBeInTheDocument())

    // Count should display
    expect(screen.getByText('×1')).toBeInTheDocument()
  })

  it('displays container and container_mechanics', async () => {
    vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeon)

    renderWithRouter(4, 4) // Treasure Room

    await waitFor(() => expect(screen.getByText('Treasure Room')).toBeInTheDocument())

    // Container should display
    expect(screen.getByText(/Container:/)).toBeInTheDocument()
    expect(screen.getByText('wooden chest')).toBeInTheDocument()
    // Mechanics should display
    expect(screen.getByText('(locked, DC 15 to pick)')).toBeInTheDocument()
  })

  it('displays treasure contents with quantity and value', async () => {
    vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeon)

    renderWithRouter(4, 4) // Treasure Room

    await waitFor(() => expect(screen.getByText('Treasure Room')).toBeInTheDocument(), { timeout: 3000 })

    // Treasure label should display
    expect(screen.getByText(/Treasure:/)).toBeInTheDocument()
    // Treasure items should display with qty and value
    const goldText = screen.queryByText(/Gold Coins/)
    expect(goldText).toBeInTheDocument()
    expect(screen.getByText('(250gp)')).toBeInTheDocument()
    expect(screen.getByText('Gem')).toBeInTheDocument()
    expect(screen.getByText('(500gp)')).toBeInTheDocument()
  })

  it('displays cross-reference chips for monster_id and trap_ids', async () => {
    vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeon)

    renderWithRouter(4, 5) // Monster Lair with monster_id

    await waitFor(
      () => {
        expect(screen.getByText('Monster #42')).toBeInTheDocument()
      },
      { timeout: 3000 },
    )
  })

  it('displays exit choice cards for navigation', async () => {
    vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeon)

    renderWithRouter(4, 2) // Entrance Hall which has a door to Portal Room

    await waitFor(
      () => {
        // Exit card should display door title and destination
        expect(screen.getByText('Double Stone Doors')).toBeInTheDocument()
        expect(screen.getByText('Portal Room')).toBeInTheDocument()
      },
      { timeout: 3000 },
    )
  })

  it('shows threat hints in the rail', async () => {
    vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeon)

    renderWithRouter(4, 3) // Portal Room has trap and encounter

    await waitFor(() => expect(screen.getByTitle('Contains trap')).toBeInTheDocument(), { timeout: 3000 })

    // Portal Room should show threat hints for trap and encounter
    expect(screen.getByTitle('Contains encounter')).toBeInTheDocument()
  })

  it('shows error when dungeon not found', async () => {
    vi.spyOn(api, 'getDungeon').mockRejectedValue(new Error('Dungeon not found'))

    renderWithRouter(4)

    await waitFor(() => {
      expect(screen.getByText(/Dungeon not found/)).toBeInTheDocument()
    })
  })
})
