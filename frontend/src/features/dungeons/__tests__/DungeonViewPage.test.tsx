import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import * as api from '../../../api/client'
import type { Dungeon, Encounter } from '../../../api/types'
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
      {
        room_id: 6,
        title: 'Sealed Closet',
        entries: [],
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
      {
        door_id: 3,
        entry_type: 'door',
        title: 'Iron Vault Door',
        content: 'A heavy iron door.',
        leads_to: [4, 3],
        is_hidden: false,
        hidden_dc: null,
        door_mechanics: null,
        trap_ids: [],
      },
      {
        door_id: 4,
        entry_type: 'door',
        title: 'Concealed Passage',
        content: 'A crack in the wall barely wide enough to squeeze through.',
        leads_to: [5, 4],
        is_hidden: true,
        hidden_dc: 14,
        door_mechanics: null,
        trap_ids: [],
      },
    ],
    corridors: [],
    map_image: null,
    map_image_length: 0,
  },
}

// Two-floor variant of islyDungeon for Stage 8 (rail grouped by floor) tests.
const islyDungeonWithFloors: Dungeon = {
  ...islyDungeon,
  data: {
    ...islyDungeon.data,
    floors: [
      { floor_id: 1, title: 'Ground Floor', room_ids: [1, 2, 3], floor_below: null, floor_above: 2 },
      { floor_id: 2, title: 'Second Floor', room_ids: [4, 5, 6], floor_below: 1, floor_above: null },
    ],
    stairs: [
      {
        // Connects Entrance Hall (2, Ground Floor) to Monster Lair (5, Second Floor) — deliberately
        // not room 3/4, which already share a door edge (getExitsFromRoom dedupes by destination).
        stair_id: 1,
        title: 'Stone Stairs',
        leads_to_rooms: [2, 5],
        leads_to_floors: [1, 2],
        is_hidden: false,
        hidden_dc: null,
      },
    ],
  },
}

describe('DungeonViewPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    sessionStorage.clear()
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

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Isly Castle', level: 1 })).toBeInTheDocument())
    // First room should be displayed
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Outside' })).toBeInTheDocument())
  })

  it('displays room title and entries grouped by type', async () => {
    vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeon)

    renderWithRouter(4, 3) // Render Portal Room directly (room 3)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Portal Room' })).toBeInTheDocument())

    // Check for entry groups (labels with icons)
    expect(screen.getByText('Features')).toBeInTheDocument()
    expect(screen.getByText('Traps')).toBeInTheDocument()
    expect(screen.getByText('Encounters')).toBeInTheDocument()
    // Icons are rendered (check by aria-label or role)
    expect(screen.queryByText(/🚪|✨|⚠️|👹|👥/)).not.toBeInTheDocument()
  })

  it('displays hidden entries with DC badge', async () => {
    vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeon)

    renderWithRouter(4, 5) // Render Monster Lair (room 5)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Monster Lair' })).toBeInTheDocument())

    expect(screen.getByText('Hidden Treasure')).toBeInTheDocument()
    // Hidden badge should show with key icon
    expect(screen.getByTitle('Hidden, DC 16')).toBeInTheDocument()
    expect(screen.getByText('DC 16')).toBeInTheDocument()
    // No emoji should be present
    expect(screen.queryByText(/🗝️/)).not.toBeInTheDocument()
  })

  it('displays dice notation as gold pills', async () => {
    vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeon)

    renderWithRouter(4, 5) // Monster Lair

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Monster Lair' })).toBeInTheDocument())

    // Check for dice notation wrapped in gold pill
    const dicePill = screen.getByText('2d6+3')
    expect(dicePill).toHaveClass('dice-pill')
  })

  it('displays count field for entries', async () => {
    vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeon)

    renderWithRouter(4, 5) // Monster Lair (has Ancient Dragon with count: 1)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Monster Lair' })).toBeInTheDocument())

    // Count should display
    expect(screen.getByText('×1')).toBeInTheDocument()
  })

  it('displays container and container_mechanics', async () => {
    vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeon)

    renderWithRouter(4, 4) // Treasure Room

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Treasure Room' })).toBeInTheDocument())

    // Container should display
    expect(screen.getByText(/Container:/)).toBeInTheDocument()
    expect(screen.getByText('wooden chest')).toBeInTheDocument()
    // Mechanics should display
    expect(screen.getByText('(locked, DC 15 to pick)')).toBeInTheDocument()
  })

  it('displays treasure contents with quantity and value', async () => {
    vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeon)

    renderWithRouter(4, 4) // Treasure Room

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Treasure Room' })).toBeInTheDocument(), { timeout: 3000 })

    // Treasure label should display
    expect(screen.getByText(/Treasure:/)).toBeInTheDocument()
    // Treasure items should display with qty and value
    const goldMatches = screen.queryAllByText(/Gold Coins/)
    expect(goldMatches.length).toBeGreaterThan(0)
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
        // Exit card should display door title and destination, and link to the room route
        expect(screen.getByText('Double Stone Doors')).toBeInTheDocument()
        const exitLink = screen.getByRole('link', { name: /Portal Room/ })
        expect(exitLink).toHaveAttribute('href', '/dungeons/4/rooms/3')
      },
      { timeout: 3000 },
    )
  })

  it('shows a hidden door exit card with the key marker and DC', async () => {
    vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeon)

    renderWithRouter(4, 4) // Treasure Room has a hidden door to Monster Lair

    const exitLink = await screen.findByRole('link', { name: /Monster Lair/ })
    expect(exitLink).toHaveClass('hidden')
    expect(exitLink).toHaveAttribute('href', '/dungeons/4/rooms/5')
    expect(exitLink).toHaveTextContent('DC 14')
  })

  it('shows "No visible exits" for a dead-end room', async () => {
    vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeon)

    renderWithRouter(4, 6) // Sealed Closet has no doors

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Sealed Closet' })).toBeInTheDocument())
    expect(screen.getByText('No visible exits.')).toBeInTheDocument()
  })

  it('clicking an exit card navigates to the destination room and moves the rail highlight', async () => {
    vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeon)
    const user = userEvent.setup()

    renderWithRouter(4, 2) // Entrance Hall

    const exitLink = await screen.findByRole('link', { name: /Portal Room/ })
    await user.click(exitLink)

    // Room panel shows the destination room
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Portal Room' })).toBeInTheDocument())

    // Rail highlight moved: Portal Room's rail row is now selected, Entrance Hall's is not
    const railList = screen.getByRole('list')
    expect(within(railList).getByRole('button', { name: /Portal Room/ })).toHaveClass('selected')
    expect(within(railList).getByRole('button', { name: /Entrance Hall/ })).not.toHaveClass('selected')
  })

  it('live reachability walk: every connected room is reachable by following exit cards from the entry room', async () => {
    vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeon)
    const user = userEvent.setup()

    // Entry room (room 1, "Outside") -> Entrance Hall -> Portal Room -> Treasure Room -> Monster Lair
    renderWithRouter(4, 1)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Outside' })).toBeInTheDocument())

    const path = ['Entrance Hall', 'Portal Room', 'Treasure Room', 'Monster Lair']
    for (const roomTitle of path) {
      const exitLink = await screen.findByRole('link', { name: new RegExp(roomTitle) })
      await user.click(exitLink)
      await waitFor(() => expect(screen.getByRole('heading', { name: roomTitle })).toBeInTheDocument())
    }
  })

  it('builds a breadcrumb trail while walking rooms, and truncates when a crumb is clicked', async () => {
    vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeon)
    const user = userEvent.setup()

    renderWithRouter(4, 1) // Outside (entry room)

    const breadcrumbs = () => screen.getByRole('navigation', { name: 'Breadcrumb' })

    // Only the dungeon title crumb + current room so far.
    await waitFor(() => expect(within(breadcrumbs()).getByText('Outside')).toBeInTheDocument())

    await user.click(await screen.findByRole('link', { name: /Entrance Hall/ }))
    await waitFor(() => expect(within(breadcrumbs()).getByText('Entrance Hall')).toBeInTheDocument())

    await user.click(await screen.findByRole('link', { name: /Portal Room/ }))
    await waitFor(() => expect(within(breadcrumbs()).getByText('Portal Room')).toBeInTheDocument())

    // Trail is now Isly Castle › Outside › Entrance Hall › Portal Room (3 room crumbs).
    expect(within(breadcrumbs()).getByText('Outside')).toBeInTheDocument()
    expect(within(breadcrumbs()).getByText('Entrance Hall')).toBeInTheDocument()
    expect(within(breadcrumbs()).getByText('Portal Room')).toBeInTheDocument()

    // Clicking the "Outside" crumb navigates back and truncates the trail.
    await user.click(within(breadcrumbs()).getByRole('link', { name: 'Outside' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Outside' })).toBeInTheDocument())

    expect(within(breadcrumbs()).queryByText('Entrance Hall')).not.toBeInTheDocument()
    expect(within(breadcrumbs()).queryByText('Portal Room')).not.toBeInTheDocument()
  })

  it('persists trail and position across a simulated refresh', async () => {
    vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeon)
    const user = userEvent.setup()

    const { unmount } = renderWithRouter(4, 1)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Outside' })).toBeInTheDocument())

    await user.click(await screen.findByRole('link', { name: /Entrance Hall/ }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Entrance Hall' })).toBeInTheDocument())

    // Simulate a refresh: unmount and re-render fresh at the same room URL.
    unmount()
    renderWithRouter(4, 2)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Entrance Hall' })).toBeInTheDocument())
    const breadcrumbs = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(breadcrumbs).getByText('Outside')).toBeInTheDocument()
    expect(within(breadcrumbs).getByText('Entrance Hall')).toBeInTheDocument()
  })

  it('collapses and re-expands the rail', async () => {
    vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeon)
    const user = userEvent.setup()

    renderWithRouter(4, 1)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Outside' })).toBeInTheDocument())

    expect(screen.getByRole('list')).toBeInTheDocument() // rail room list visible

    await user.click(screen.getByRole('button', { name: 'Hide room index' }))
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    // Room content is still visible while the rail is collapsed.
    expect(screen.getByRole('heading', { name: 'Outside' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show room index' }))
    expect(screen.getByRole('list')).toBeInTheDocument()
  })

  it('shows threat hints in the rail', async () => {
    vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeon)

    renderWithRouter(4, 3) // Portal Room has trap and encounter

    await waitFor(() => expect(screen.getByLabelText('Contains trap')).toBeInTheDocument(), { timeout: 3000 })

    // Portal Room should show threat hints for trap and encounter
    expect(screen.getByLabelText('Contains encounter')).toBeInTheDocument()
  })

  it('resolves a room NPC chip to a real name from the roster (Stage N5)', async () => {
    vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeon)
    vi.spyOn(api, 'listNPCs').mockResolvedValue([{ id: 4, name: 'Elder Rosalind' }])

    renderWithRouter(4, 3) // Portal Room has npcs: [4]

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Portal Room' })).toBeInTheDocument())
    expect(await screen.findByRole('button', { name: /Elder Rosalind/ })).toBeInTheDocument()
    expect(screen.queryByText('NPC #4')).not.toBeInTheDocument()
  })

  it('shows error when dungeon not found', async () => {
    vi.spyOn(api, 'getDungeon').mockRejectedValue(new Error('Dungeon not found'))

    renderWithRouter(4)

    await waitFor(() => {
      expect(screen.getByText(/Dungeon not found/)).toBeInTheDocument()
    })
  })

  describe('door / stair choice-card grid (Stage 10)', () => {
    it('renders exits in a 2-column grid container', async () => {
      vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeon)

      renderWithRouter(4, 2) // Entrance Hall has a door to Portal Room

      const exitLink = await screen.findByRole('link', { name: /Portal Room/ })
      expect(exitLink.parentElement).toHaveClass('dungeon-room-exit-cards')
    })

    it('renders a stair exit with the stairs icon, direction, and destination floor, linking across floors', async () => {
      vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeonWithFloors)

      renderWithRouter(4, 2) // Entrance Hall has a stair to Monster Lair (Second Floor)

      const exitLink = await screen.findByRole('link', { name: /Monster Lair/ })
      expect(exitLink).toHaveAttribute('href', '/dungeons/4/rooms/5')
      expect(exitLink).toHaveTextContent('Stone Stairs')
      expect(exitLink).toHaveTextContent('Up')
      expect(exitLink).toHaveTextContent('Second Floor')
      expect(within(exitLink).getByLabelText('Stairs')).toBeInTheDocument()
      expect(within(exitLink).getByLabelText('Up')).toBeInTheDocument()
    })

    it('shows the reverse stair direction from the destination floor', async () => {
      vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeonWithFloors)

      renderWithRouter(4, 5) // Monster Lair has a stair back to Entrance Hall (Ground Floor)

      const exitLink = await screen.findByRole('link', { name: /Entrance Hall/ })
      expect(exitLink).toHaveTextContent('Down')
      expect(exitLink).toHaveTextContent('Ground Floor')
      expect(within(exitLink).getByLabelText('Down')).toBeInTheDocument()
    })

    it('still shows a hidden door exit card with dashed styling and a DC badge', async () => {
      vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeonWithFloors)

      renderWithRouter(4, 4) // Treasure Room has a hidden door to Monster Lair

      const exitLink = await screen.findByRole('link', { name: /Monster Lair/ })
      expect(exitLink).toHaveClass('hidden')
      expect(exitLink).toHaveAttribute('href', '/dungeons/4/rooms/5')
      expect(exitLink).toHaveTextContent('DC 14')
    })

    it('still shows "No visible exits" for a dead-end room', async () => {
      vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeonWithFloors)

      renderWithRouter(4, 6) // Sealed Closet has no doors or stairs

      await waitFor(() => expect(screen.getByRole('heading', { name: 'Sealed Closet' })).toBeInTheDocument())
      expect(screen.getByText('No visible exits.')).toBeInTheDocument()
    })

    it('extends the reachability walk across the stair between floors', async () => {
      vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeonWithFloors)
      const user = userEvent.setup()

      // Outside -> Entrance Hall -> (stair) -> Monster Lair, crossing Ground Floor to Second Floor.
      renderWithRouter(4, 1)
      await waitFor(() => expect(screen.getByRole('heading', { name: 'Outside' })).toBeInTheDocument())

      const toEntranceHall = await screen.findByRole('link', { name: /Entrance Hall/ })
      await user.click(toEntranceHall)
      await waitFor(() => expect(screen.getByRole('heading', { name: 'Entrance Hall' })).toBeInTheDocument())

      const toMonsterLair = await screen.findByRole('link', { name: /Monster Lair/ })
      await user.click(toMonsterLair)
      await waitFor(() => expect(screen.getByRole('heading', { name: 'Monster Lair' })).toBeInTheDocument())

      // The rail's floor grouping followed: Second Floor is now the open section.
      const secondSection = screen.getByText('Second Floor · 3 rooms').closest('details') as HTMLElement
      expect(secondSection).toHaveAttribute('open')
    })
  })

  it('renders a reserved action slot on each feature tile, filled with "Run encounter" for the encounter tile', async () => {
    vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeon)

    renderWithRouter(4, 3) // Portal Room has feature + trap + encounter entries

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Portal Room' })).toBeInTheDocument())

    const actionSlots = document.querySelectorAll('.feature-tile-actions')
    expect(actionSlots.length).toBe(3)
    const emptySlots = Array.from(actionSlots).filter((slot) => slot.textContent === '')
    expect(emptySlots.length).toBe(2) // feature + trap tiles have no action yet
    expect(screen.getByText('Run encounter')).toBeInTheDocument()
  })

  describe('encounter dock (Stage E6)', () => {
    const baseEncounter: Encounter = {
      id: 1,
      title: 'Guardian Encounter',
      active_index: 0,
      creatures: [
        { monster_id: 1, original_name: 'Guardian', name: 'Guardian', hp_current: 20, hp_max: 20, ac: 16, status: 'alive', conditions: [] },
      ],
    }

    it('opens the dock bound to the room\'s encounter when "Run encounter" is clicked', async () => {
      vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeon)
      vi.spyOn(api, 'getEncounter').mockResolvedValue(baseEncounter)
      vi.spyOn(api, 'updateEncounter').mockResolvedValue(baseEncounter)
      const user = userEvent.setup()

      renderWithRouter(4, 3) // Portal Room, encounter_id 1
      await waitFor(() => expect(screen.getByRole('heading', { name: 'Portal Room' })).toBeInTheDocument())

      await user.click(screen.getByText('Run encounter'))

      const dock = await screen.findByRole('dialog', { name: 'Guardian Encounter' })
      expect(within(dock).getByDisplayValue('Guardian')).toBeInTheDocument()
      expect(api.getEncounter).toHaveBeenCalledWith(1)
    })

    it('supports Next turn inside the dock and closing it', async () => {
      vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeon)
      vi.spyOn(api, 'getEncounter').mockResolvedValue(baseEncounter)
      vi.spyOn(api, 'updateEncounter').mockResolvedValue(baseEncounter)
      const user = userEvent.setup()

      renderWithRouter(4, 3)
      await waitFor(() => expect(screen.getByRole('heading', { name: 'Portal Room' })).toBeInTheDocument())
      await user.click(screen.getByText('Run encounter'))

      const dock = await screen.findByRole('dialog', { name: 'Guardian Encounter' })
      await user.click(within(dock).getByText('Next turn'))
      expect(within(dock).getByText('Round 2')).toBeInTheDocument()

      await user.click(within(dock).getByLabelText('Close window'))
      expect(screen.queryByRole('dialog', { name: 'Guardian Encounter' })).not.toBeInTheDocument()
    })
  })

  describe('NPC dock (Stage N6)', () => {
    it('opens the dock with the clicked NPC\'s name and detail', async () => {
      vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeon)
      vi.spyOn(api, 'listNPCs').mockResolvedValue([{ id: 4, name: 'Elder Rosalind' }])
      vi.spyOn(api, 'getNPC').mockResolvedValue({ id: 4, name: 'Elder Rosalind', race: 'Elf' })
      const user = userEvent.setup()

      renderWithRouter(4, 3) // Portal Room has npcs: [4]
      await waitFor(() => expect(screen.getByRole('heading', { name: 'Portal Room' })).toBeInTheDocument())

      await user.click(await screen.findByRole('button', { name: /Elder Rosalind/ }))

      const dock = await screen.findByRole('dialog', { name: 'Elder Rosalind' })
      expect(within(dock).getByText('Elf')).toBeInTheDocument()
      expect(api.getNPC).toHaveBeenCalledWith(4)
    })

    it('closes the dock via the close button', async () => {
      vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeon)
      vi.spyOn(api, 'listNPCs').mockResolvedValue([{ id: 4, name: 'Elder Rosalind' }])
      vi.spyOn(api, 'getNPC').mockResolvedValue({ id: 4, name: 'Elder Rosalind' })
      const user = userEvent.setup()

      renderWithRouter(4, 3)
      await waitFor(() => expect(screen.getByRole('heading', { name: 'Portal Room' })).toBeInTheDocument())
      await user.click(await screen.findByRole('button', { name: /Elder Rosalind/ }))

      const dock = await screen.findByRole('dialog', { name: 'Elder Rosalind' })
      await user.click(within(dock).getByLabelText('Close window'))
      expect(screen.queryByRole('dialog', { name: 'Elder Rosalind' })).not.toBeInTheDocument()
    })
  })

  describe('rail grouped by floor (Stage 8)', () => {
    it('groups rail rooms into floor sections with the right rooms under each', async () => {
      vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeonWithFloors)

      renderWithRouter(4, 1) // Outside, on Ground Floor

      await waitFor(() => expect(screen.getByRole('heading', { name: 'Outside' })).toBeInTheDocument())

      expect(screen.getByText('Ground Floor · 3 rooms')).toBeInTheDocument()
      expect(screen.getByText('Second Floor · 3 rooms')).toBeInTheDocument()

      const groundSection = screen.getByText('Ground Floor · 3 rooms').closest('details') as HTMLElement
      const secondSection = screen.getByText('Second Floor · 3 rooms').closest('details') as HTMLElement
      expect(within(groundSection).getByRole('button', { name: /Portal Room/ })).toBeInTheDocument()
      expect(within(secondSection).getByRole('button', { name: /Monster Lair/ })).toBeInTheDocument()
      expect(within(groundSection).queryByRole('button', { name: /Monster Lair/ })).not.toBeInTheDocument()
    })

    it('auto-expands the current room floor and collapses the other', async () => {
      vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeonWithFloors)

      renderWithRouter(4, 1) // Outside, on Ground Floor

      await waitFor(() => expect(screen.getByRole('heading', { name: 'Outside' })).toBeInTheDocument())

      const groundSection = screen.getByText('Ground Floor · 3 rooms').closest('details') as HTMLElement
      const secondSection = screen.getByText('Second Floor · 3 rooms').closest('details') as HTMLElement
      expect(groundSection).toHaveAttribute('open')
      expect(secondSection).not.toHaveAttribute('open')
    })

    it('clicking a room on another floor navigates and re-groups the open floor', async () => {
      vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeonWithFloors)
      const user = userEvent.setup()

      renderWithRouter(4, 1) // Outside, on Ground Floor

      await waitFor(() => expect(screen.getByRole('heading', { name: 'Outside' })).toBeInTheDocument())

      const secondSection = screen.getByText('Second Floor · 3 rooms').closest('details') as HTMLElement
      await user.click(within(secondSection).getByRole('button', { name: /Monster Lair/ }))

      await waitFor(() => expect(screen.getByRole('heading', { name: 'Monster Lair' })).toBeInTheDocument())

      const groundSectionAfter = screen.getByText('Ground Floor · 3 rooms').closest('details') as HTMLElement
      const secondSectionAfter = screen.getByText('Second Floor · 3 rooms').closest('details') as HTMLElement
      expect(secondSectionAfter).toHaveAttribute('open')
      expect(groundSectionAfter).not.toHaveAttribute('open')
    })

    it('renders a flat room list with no floor grouping for a single-floor dungeon', async () => {
      vi.spyOn(api, 'getDungeon').mockResolvedValue(islyDungeon) // no floors data

      renderWithRouter(4, 1)

      await waitFor(() => expect(screen.getByRole('heading', { name: 'Outside' })).toBeInTheDocument())

      expect(screen.queryByText(/Ground Floor/)).not.toBeInTheDocument()
      expect(screen.queryAllByRole('group')).toHaveLength(0)
      const railList = screen.getByRole('list')
      expect(within(railList).getByRole('button', { name: /Portal Room/ })).toBeInTheDocument()
      expect(within(railList).getByRole('button', { name: /Monster Lair/ })).toBeInTheDocument()
    })
  })
})
