import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import * as api from '../../../../api/client'
import type { NPC } from '../../../../api/types'
import { mapLabLayout } from '../maplabData'
import { MapLabPage } from '../MapLabPage'
import { DungeonRouteContextProvider, type DungeonRouteContext } from '../dungeonRouteContext'

const dungeonDataFixture = {
  rooms: [
    {
      room_id: 17,
      title: 'Training Hall',
      npcs: [9],
      entries: [
        { entry_type: 'feature', title: 'Banner', content: 'Ancient banners hang above the arena.' },
        { entry_type: 'trap', title: 'Loose Flagstones', content: 'Creatures trigger 1d6 darts.' },
        { entry_type: 'encounter', title: 'Goblin Drill', content: '2d4 goblins rush the room.', encounter_id: 7 },
        { entry_type: 'treasure', title: 'Hidden Cache', content: 'A niche in the wall.', treasure_contents: [{ name: 'Ruby', quantity: 2 }] },
      ],
    },
    {
      room_id: 23,
      title: 'Armoury',
      entries: [{ entry_type: 'feature', title: 'Weapon Racks', content: 'Dusty weapons line the walls.' }],
      npcs: [],
    },
    {
      room_id: 33,
      title: 'First Floor Landing',
      entries: [{ entry_type: 'feature', title: 'Balcony', content: 'A narrow overlook faces the courtyard.' }],
      npcs: [],
    },
    {
      room_id: 404,
      title: 'Data Only Room',
      entries: [{ entry_type: 'feature', title: 'Ghost Note', content: 'No geometry should render this.' }],
      npcs: [],
    },
  ],
}

function renderMapLabPage(
  initialEntry: string = '/dungeons/4',
  route: DungeonRouteContext = {
    dungeonId: 4,
    dungeon: { id: 4, title: 'Test Dungeon', data: dungeonDataFixture },
    status: 'ready',
    error: null,
  },
) {
  if (!vi.isMockFunction(api.getDungeonLayout)) {
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: mapLabLayout as unknown as Record<string, unknown> })
  }
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <DungeonRouteContextProvider value={route}>
        <MapLabPage />
      </DungeonRouteContextProvider>
    </MemoryRouter>,
  )
}

async function renderLoadedMapLabPage(initialEntry: string = '/dungeons/4') {
  const utils = renderMapLabPage(initialEntry)
  await flush()
  return utils
}

async function flush() {
  await act(async () => {
    await Promise.resolve()
  })
}

const miraNpc: NPC = {
  id: 9,
  name: 'Mira',
  race: 'Human',
  background: 'Scout',
  appearance: { hair_colour: 'black', eye_colour: 'brown' },
  notes: 'A careful scout.',
  ac: { value: 15, note: null, alternatives: [] },
  hp: { average: 18, formula: '4d8' },
  speed: [
    { mode: 'walk', feet: 30, note: null, hover: false },
    { mode: 'climb', feet: 20, note: null, hover: false },
  ],
  abilities: { str: 10, dex: 16, con: 12, int: 11, wis: 14, cha: 9 },
}

// These behavior tests were written against the small `mapLabLayout` sample from maplabData.ts
// (6x4 hall, L-shape Armoury, seeded chest/trap-door), so pin that as the default backend layout
// here; per-test `vi.spyOn` calls still override it where a test supplies its own `backendLayout`.
beforeEach(() => {
  vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: mapLabLayout as unknown as Record<string, unknown> })
  vi.spyOn(api, 'listNPCs').mockResolvedValue([{ id: 9, name: 'Mira' }])
  vi.spyOn(api, 'getNPC').mockResolvedValue(miraNpc)
  vi.spyOn(api, 'getDungeonSessionState').mockRejectedValue(new api.ApiError(404, 'Session state not found'))
  vi.spyOn(api, 'saveDungeonSessionState').mockResolvedValue(undefined as unknown as { data: Record<string, unknown> })
  vi.spyOn(api, 'resetDungeonSessionState').mockResolvedValue(undefined)
  Element.prototype.scrollIntoView = vi.fn()
})

describe('Design Phase J1 — toolbar trays', () => {
  const STORAGE_KEY = 'dnd-kids-maplab-tray-collapsed:viewer-session'

  afterEach(() => {
    window.localStorage.removeItem(STORAGE_KEY)
  })

  it('Session tray collapses on toggle, hiding its controls', async () => {
    const user = userEvent.setup()
    renderMapLabPage()
    await flush()

    expect(screen.getByRole('button', { name: 'Reset dungeon' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Collapse Session tools' }))

    expect(screen.getByRole('button', { name: 'Expand Session tools' })).toBeInTheDocument()
    const tray = document.querySelector('.maplab-toolbar-tray')
    expect(tray).toHaveAttribute('data-collapsed')
  })

  it('toolbar tray collapse state persists across remount via localStorage', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'true')
    renderMapLabPage()
    await flush()

    expect(screen.getByRole('button', { name: 'Expand Session tools' })).toBeInTheDocument()
  })
})

it('desktop seam collapses and restores the rail; desktop room pick does not close it', async () => {
  const user = userEvent.setup()
  await renderLoadedMapLabPage()
  const container = document.querySelector('.maplab-viewer-rail-container') as HTMLElement

  // Seam handle present with correct initial state
  const seam = document.querySelector('.maplab-viewer-rail-seam') as HTMLButtonElement
  expect(seam).toBeInTheDocument()
  expect(seam).toHaveAttribute('aria-label', 'Hide room rail')
  expect(seam).toHaveAttribute('aria-expanded', 'true')
  expect(seam).toHaveAttribute('aria-controls', 'maplab-viewer-room-rail')
  expect(container).not.toHaveAttribute('data-collapsed')

  // Collapse the rail
  await user.click(seam)
  expect(container).toHaveAttribute('data-collapsed')
  expect(seam).toHaveAttribute('aria-label', 'Show room rail')
  expect(seam).toHaveAttribute('aria-expanded', 'false')

  // Restore the rail
  await user.click(seam)
  expect(container).not.toHaveAttribute('data-collapsed')
  expect(seam).toHaveAttribute('aria-label', 'Hide room rail')
  expect(seam).toHaveAttribute('aria-expanded', 'true')

  // Desktop room pick does NOT collapse the desktop rail
  const rail = screen.getByRole('navigation', { name: 'Room navigation' })
  await user.click(within(rail).getByRole('button', { name: 'Armoury' }))
  expect(container).not.toHaveAttribute('data-collapsed')
})

describe('MapLabPage (Stage 1 — Wall kind rendering)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders wall lines with data-wall-kind="open" when wallKind is set', async () => {
    const openWallRoom = {
      ...mapLabLayout.rooms.find((r) => r.room_id === 17)!,
      wallKind: 'open',
    }
    const backendLayout = { ...mapLabLayout, rooms: [openWallRoom, ...mapLabLayout.rooms.filter((r) => r.room_id !== 17)] }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: backendLayout })

    renderMapLabPage()
    await flush()

    const hall = screen.getByRole('button', { name: 'Combat Training Hall' })
    const walls = hall.querySelectorAll('.maplab-wall')
    expect(walls.length).toBeGreaterThan(0)
    walls.forEach((wall) => {
      expect(wall).toHaveAttribute('data-wall-kind', 'open')
    })
  })

  it('renders wall lines with data-wall-kind="solid" when no wallKind is set', async () => {
    renderMapLabPage()
    await flush()

    const hall = screen.getByRole('button', { name: 'Combat Training Hall' })
    const walls = hall.querySelectorAll('.maplab-wall')
    expect(walls.length).toBeGreaterThan(0)
    walls.forEach((wall) => {
      expect(wall).toHaveAttribute('data-wall-kind', 'solid')
    })
  })
})

describe('MapLabPage (density control)', () => {
  afterEach(() => {
    window.localStorage.removeItem('dnd-kids-maplab-density')
  })

  it('renders Detailed / Auto / Simple buttons in the View toolbar', async () => {
    const user = userEvent.setup()
    renderMapLabPage()
    await flush()

    // Controls are absent until the View popover opens
    expect(screen.queryByRole('button', { name: 'Detailed' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Auto' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Simple' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'View' }))

    expect(screen.getByRole('button', { name: 'Detailed' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Auto' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Simple' })).toBeInTheDocument()
  })

  it('defaults to Auto pressed', async () => {
    const user = userEvent.setup()
    renderMapLabPage()
    await flush()
    await user.click(screen.getByRole('button', { name: 'View' }))
    expect(screen.getByRole('button', { name: 'Auto' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Detailed' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Simple' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicking Detailed sets it active', async () => {
    const user = userEvent.setup()
    renderMapLabPage()
    await flush()
    await user.click(screen.getByRole('button', { name: 'View' }))
    await user.click(screen.getByRole('button', { name: 'Detailed' }))
    expect(screen.getByRole('button', { name: 'Detailed' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Auto' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Simple' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicking Simple sets it active and persists', async () => {
    const user = userEvent.setup()
    renderMapLabPage()
    await flush()
    await user.click(screen.getByRole('button', { name: 'View' }))
    await user.click(screen.getByRole('button', { name: 'Simple' }))
    expect(screen.getByRole('button', { name: 'Simple' })).toHaveAttribute('aria-pressed', 'true')
    expect(window.localStorage.getItem('dnd-kids-maplab-density')).toBe('simple')
  })
})

describe('MapLabPage (View popover)', () => {
  it('closes on outside click', async () => {
    const user = userEvent.setup()
    renderMapLabPage()
    await flush()

    await user.click(screen.getByRole('button', { name: 'View' }))
    expect(screen.getByRole('button', { name: 'Detailed' })).toBeInTheDocument()

    // Click a toolbar button outside the popover
    await user.click(screen.getByRole('button', { name: 'Reset dungeon' }))
    expect(screen.queryByRole('button', { name: 'Detailed' })).not.toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    renderMapLabPage()
    await flush()

    await user.click(screen.getByRole('button', { name: 'View' }))
    expect(screen.getByRole('button', { name: 'Detailed' })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('button', { name: 'Detailed' })).not.toBeInTheDocument()
  })
})

describe('MapLabPage (Session view — layer toggles)', () => {
  afterEach(() => {
    for (const key of ['outside', 'props', 'passages', 'labels']) {
      window.localStorage.removeItem(`dnd-kids-maplab-layer-visible:${key}`)
    }
  })

  it('toggling Outside off hides the unknown-space rect and back on restores it', async () => {
    const user = userEvent.setup()
    const { container } = await renderLoadedMapLabPage()
    await user.click(screen.getByRole('button', { name: 'View' }))

    expect(container.querySelector('.maplab-unknown-space')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Outside' }))
    expect(container.querySelector('.maplab-unknown-space')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Outside' }))
    expect(container.querySelector('.maplab-unknown-space')).toBeInTheDocument()
  })

  it('toggling Props off hides prop markers and back on restores them', async () => {
    const user = userEvent.setup()
    await renderLoadedMapLabPage()
    await user.click(screen.getByRole('button', { name: 'View' }))

    expect(screen.getByRole('button', { name: /Treasure Chest/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Props' }))
    expect(screen.queryByRole('button', { name: /Treasure Chest/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Props' }))
    expect(screen.getByRole('button', { name: /Treasure Chest/i })).toBeInTheDocument()
  })

  it('toggling Passages off hides doors, stairs, and portals together, and back on restores them', async () => {
    const user = userEvent.setup()
    await renderLoadedMapLabPage()
    await user.click(screen.getByRole('button', { name: 'View' }))

    expect(screen.getByRole('button', { name: /Heavy Stone Door/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Stone Stairs.*floor 1/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Passages' }))
    expect(screen.queryByRole('button', { name: /Heavy Stone Door/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Stone Stairs/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Passages' }))
    expect(screen.getByRole('button', { name: /Heavy Stone Door/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Stone Stairs.*floor 1/i })).toBeInTheDocument()
  })

  it('toggling Labels off hides room title text and back on restores it', async () => {
    const user = userEvent.setup()
    await renderLoadedMapLabPage()
    await user.click(screen.getByRole('button', { name: 'View' }))

    expect(screen.getByText('Combat Training Hall')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Labels' }))
    expect(screen.queryByText('Combat Training Hall')).not.toBeInTheDocument()
    // The room itself (as an interactive element) is unaffected — only its title text hides.
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Labels' }))
    expect(screen.getByText('Combat Training Hall')).toBeInTheDocument()
  })

  it('turning off every layer replaces the canvas with the filtered-empty message', async () => {
    const user = userEvent.setup()
    await renderLoadedMapLabPage()
    await user.click(screen.getByRole('button', { name: 'View' }))

    await user.click(screen.getByRole('button', { name: 'Outside' }))
    await user.click(screen.getByRole('button', { name: 'Props' }))
    await user.click(screen.getByRole('button', { name: 'Passages' }))
    await user.click(screen.getByRole('button', { name: 'Labels' }))

    expect(screen.getByText('All layers are hidden. Turn one on to see the map.')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /dungeon floor map/i })).not.toBeInTheDocument()
    // The toolbar toggles remain visible so the DM can turn a layer back on.
    expect(screen.getByRole('button', { name: 'Outside' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Outside' }))
    expect(screen.queryByText('All layers are hidden. Turn one on to see the map.')).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: /dungeon floor map/i })).toBeInTheDocument()
  })
})
