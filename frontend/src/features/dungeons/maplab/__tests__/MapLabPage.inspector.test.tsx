import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { act, render, screen, fireEvent, within } from '@testing-library/react'
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

beforeEach(() => {
  window.sessionStorage.clear()
  vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: mapLabLayout as unknown as Record<string, unknown> })
  vi.spyOn(api, 'listNPCs').mockResolvedValue([{ id: 9, name: 'Mira' }])
  vi.spyOn(api, 'getNPC').mockResolvedValue(miraNpc)
  vi.spyOn(api, 'getDungeonSessionState').mockRejectedValue(new api.ApiError(404, 'Session state not found'))
  vi.spyOn(api, 'saveDungeonSessionState').mockResolvedValue(undefined as unknown as { data: Record<string, unknown> })
  vi.spyOn(api, 'resetDungeonSessionState').mockResolvedValue(undefined)
  Element.prototype.scrollIntoView = vi.fn()
})

describe('MapLabPage (Stage 3 — Generic inspector)', () => {
  it('shows the room descriptor (title, size, description) in the same panel when selected', async () => {
    const user = userEvent.setup()
    const { container } = renderMapLabPage()
    await flush()

    expect(screen.getByText('Select a room, door, stair, or prop for details.')).toBeInTheDocument()

    const hall = screen.getByRole('button', { name: 'Combat Training Hall' })
    await user.click(hall)

    const panel = container.querySelector('.maplab-inspector-panel-container')!
    expect(panel.querySelector('.maplab-inspector-title')).toHaveTextContent('Combat Training Hall')
    expect(panel.querySelector('.maplab-inspector-kind')).toHaveTextContent('Room')
    expect(panel).toHaveTextContent('24 squares')
    expect(panel).toHaveTextContent(/training/)

    await user.unhover(hall)
    expect(panel.querySelector('.maplab-inspector-title')).toHaveTextContent('Combat Training Hall')
    await user.click(hall)
    expect(screen.getByText('Select a room, door, stair, or prop for details.')).toBeInTheDocument()
  })

  it('shows the room descriptor on keyboard focus too, same as doors/stairs', async () => {
    const { container } = renderMapLabPage()
    await flush()
    const armoury = within(screen.getByRole('group', { name: /dungeon floor map/i })).getByRole('button', { name: 'Armoury' })
    fireEvent.focus(armoury)

    const panel = container.querySelector('.maplab-inspector-panel-container')!
    expect(panel.querySelector('.maplab-inspector-title')).toHaveTextContent('Armoury')
    expect(panel).toHaveTextContent('12 squares')
  })

  it('door and stair inspection still work through the same generalized panel', async () => {
    const user = userEvent.setup()
    await renderLoadedMapLabPage()

    const door = screen.getByRole('button', { name: /Heavy Stone Door/ })
    await user.click(door)
    expect(screen.getByText('Door')).toBeInTheDocument()
    expect(screen.getByText('Locked')).toBeInTheDocument()

    const stair = screen.getByRole('button', { name: /Stone Stairs.*floor 1/i })
    await user.click(stair)
    expect(screen.getByText('Stair')).toBeInTheDocument()
    expect(screen.queryByText('Unlocked')).not.toBeInTheDocument()
  })

  it('rooms do not render World now or Players know subheadings — only passages get live/knowledge controls', async () => {
    const user = userEvent.setup()
    const { container } = renderMapLabPage()
    await flush()

    const hall = screen.getByRole('button', { name: 'Combat Training Hall' })
    await user.click(hall)

    const panel = container.querySelector('.maplab-inspector-panel-container')!
    expect(panel.querySelector('.maplab-inspector-title')).toHaveTextContent('Combat Training Hall')
    expect(panel.querySelector('.maplab-inspector-subheading')).not.toBeInTheDocument()
    expect(screen.queryByText('World now')).not.toBeInTheDocument()
    expect(screen.queryByText('Players know')).not.toBeInTheDocument()
  })
})

describe('MapLabPage (Design Phase J2 — Passage-state chips)', () => {
  it('renders an icon+text chip for the locked door, and the old State/Also rows are gone', async () => {
    const user = userEvent.setup()
    const { container } = await renderLoadedMapLabPage()

    const door = screen.getByRole('button', { name: /Heavy Stone Door.*Locked/ })
    await user.click(door)

    const chipRow = container.querySelector('.maplab-inspector-chips')!
    expect(chipRow).toBeInTheDocument()
    const chip = chipRow.querySelector('.maplab-inspector-chip[data-state="locked"]')!
    expect(chip).toHaveTextContent('Locked')
    expect(chip.querySelector('svg')).toBeTruthy()
    expect(screen.queryByText('State')).not.toBeInTheDocument()
    expect(screen.queryByText('Also')).not.toBeInTheDocument()
  })

  it('renders zero chips for the fully-unlocked stair — absence is the clean state', async () => {
    const user = userEvent.setup()
    const { container } = await renderLoadedMapLabPage()

    const stair = screen.getByRole('button', { name: /Stone Stairs.*floor 1/i })
    await user.click(stair)

    expect(container.querySelector('.maplab-inspector-chips')).not.toBeInTheDocument()
  })
})

describe('MapLabPage (Stage F2 — Prop rendering)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the seeded chest prop with its kind icon, locked state, and inspector details when selected', async () => {
    const user = userEvent.setup()
    renderMapLabPage()
    await flush()

    const chest = screen.getByRole('button', { name: /Treasure Chest.*Locked/i })
    expect(chest).toHaveAttribute('data-state', 'locked')
    expect(chest.querySelector('svg')).toBeTruthy()

    await user.click(chest)
    expect(screen.getByText('Prop')).toBeInTheDocument()
    expect(screen.getByText('Break: DC not set · Pick 16')).toBeInTheDocument()
  })

  it('renders an on-wall prop anchored at the wall midpoint, smaller than an on-square prop', async () => {
    const wallProp = {
      prop_id: 900,
      kind: 'mirror',
      cell: [0, 0] as [number, number],
      side: 'N' as const,
      title: 'Wall Mirror',
      hidden: false,
      locked: false,
      trapped: false,
    }
    const backendLayout = { ...mapLabLayout, props: [...mapLabLayout.props, wallProp] }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: backendLayout })

    renderMapLabPage()
    await flush()

    const mirror = screen.getByRole('button', { name: /Wall Mirror/i })
    const chest = screen.getByRole('button', { name: /Treasure Chest/i })
    const mirrorCircle = mirror.querySelector('circle')!
    const chestCircle = chest.querySelector('circle')!

    expect(mirrorCircle.getAttribute('cy')).toBe('0')
    expect(Number(mirrorCircle.getAttribute('r'))).toBeLessThan(Number(chestCircle.getAttribute('r')))
  })

  it('renders a hidden prop with a dashed marker outline', async () => {
    const hiddenProp = {
      prop_id: 901,
      kind: 'chest',
      cell: [0, 0] as [number, number],
      title: 'Hidden Chest',
      hidden: true,
      locked: false,
      trapped: false,
      state: {
        open: false,
        obstacles: {
          concealment: { armed: true },
          lock: { armed: false, shown: false },
          trap: { armed: false, shown: false },
        },
      },
    }
    const backendLayout = { ...mapLabLayout, props: [...mapLabLayout.props, hiddenProp] }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: backendLayout })

    renderMapLabPage()
    await flush()

    const hiddenChest = screen.getByRole('button', { name: /Hidden Chest/i })
    expect(hiddenChest).toHaveAttribute('data-state', 'concealed')
    expect(hiddenChest.querySelector('circle')).toHaveAttribute('stroke-dasharray')
  })
})

describe('Design Phase M — Loot on the map', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a live loot summary and badge for a loot-bearing prop', async () => {
    const user = userEvent.setup()
    const lootChest = {
      ...mapLabLayout.props[0],
      loot: { bundle_id: 12, bundle_name: 'Goblin Chest' },
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({
      data: { ...mapLabLayout, props: [lootChest] } as unknown as Record<string, unknown>,
    })
    vi.spyOn(api, 'getLootBundle').mockResolvedValue({
      id: 12,
      name: 'Goblin Chest',
      gold: 12.5,
      contents: [
        { kind: 'item', ref_id: 3, name: 'Ruby', value_gp: 50, category: 'gem', quantity: 2 },
        { kind: 'weapon', ref_id: 4, name: 'Shortsword', value_gp: null, quantity: 1 },
      ],
    })

    renderMapLabPage()
    await flush()

    const chest = screen.getByRole('button', { name: /Treasure Chest.*loot assigned/i })
    expect(chest.querySelector('[data-badge="multiple-statuses"]')).toBeInTheDocument()

    await user.click(chest)
    expect(await screen.findByLabelText('Loot contents')).toBeInTheDocument()
    expect(screen.getByText('Goblin Chest')).toBeInTheDocument()
    expect(screen.getByText('112.5 gp')).toBeInTheDocument()
    expect(screen.getByText('Gold: 12.5 gp')).toBeInTheDocument()
    expect(screen.getByText('2 x Ruby (50 gp)')).toBeInTheDocument()
    expect(screen.getByText('1 x Shortsword')).toBeInTheDocument()
  })

  it('shows loading then the cached name when the linked bundle was removed', async () => {
    const user = userEvent.setup()
    let rejectBundle!: (reason?: unknown) => void
    const lootChest = {
      ...mapLabLayout.props[0],
      loot: { bundle_id: 12, bundle_name: 'Lost Cache' },
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({
      data: { ...mapLabLayout, props: [lootChest] } as unknown as Record<string, unknown>,
    })
    vi.spyOn(api, 'getLootBundle').mockReturnValue(
      new Promise((_, reject) => {
        rejectBundle = reject
      }),
    )

    renderMapLabPage()
    await flush()
    await user.click(screen.getByRole('button', { name: /Treasure Chest/i }))
    expect(screen.getByRole('status')).toHaveTextContent('Opening the treasure cache...')

    await act(async () => {
      rejectBundle(new api.ApiError(404, 'Not found'))
    })
    expect(await screen.findByRole('status')).toHaveTextContent('Lost Cache was removed')
  })

  it('identifies a gold-only bundle instead of leaving its contents blank', async () => {
    const user = userEvent.setup()
    const lootChest = {
      ...mapLabLayout.props[0],
      loot: { bundle_id: 12, bundle_name: 'Loose Coin' },
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({
      data: { ...mapLabLayout, props: [lootChest] } as unknown as Record<string, unknown>,
    })
    vi.spyOn(api, 'getLootBundle').mockResolvedValue({ id: 12, name: 'Loose Coin', gold: 8, contents: [] })

    renderMapLabPage()
    await flush()
    await user.click(screen.getByRole('button', { name: /Treasure Chest/i }))

    expect(await screen.findByText('This bundle holds gold only.')).toBeInTheDocument()
  })
})

describe('MapLabPage (Stage F4 — loot hook affordance)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not show a loot summary for a prop without loot', async () => {
    const user = userEvent.setup()
    renderMapLabPage()
    await flush()

    const chest = screen.getByRole('button', { name: /Treasure Chest.*Locked/i })
    expect(chest.querySelector('[data-badge="loot"]')).not.toBeInTheDocument()
    await user.click(chest)
    expect(screen.queryByLabelText('Loot contents')).not.toBeInTheDocument()

    const door = screen.getAllByRole('button', { name: /Door/i })[0]
    await user.click(door)
    expect(screen.queryByLabelText('Loot contents')).not.toBeInTheDocument()
  })
})

describe('MapLabPage (R4 viewer room-reading surface)', () => {
  it('shows the default room details panel after load', async () => {
    await renderLoadedMapLabPage()

    const details = screen.getByLabelText('Room details')
    expect(within(details).getByRole('heading', { name: 'Training Hall', level: 3 })).toBeInTheDocument()
    expect(within(details).getByText('Features')).toBeInTheDocument()
    expect(within(details).getByText('Trap')).toBeInTheDocument()
  })

  it('room click switches the details panel content', async () => {
    const user = userEvent.setup()
    await renderLoadedMapLabPage()

    await user.click(within(screen.getByRole('group', { name: /dungeon floor map/i })).getByRole('button', { name: 'Armoury' }))
    expect(screen.getByText('Weapon Racks')).toBeInTheDocument()
    expect(screen.queryByText('Loose Flagstones')).not.toBeInTheDocument()
  })

  it('room keyboard selection updates the details panel', async () => {
    const user = userEvent.setup()
    await renderLoadedMapLabPage()

    const armoury = within(screen.getByRole('group', { name: /dungeon floor map/i })).getByRole('button', { name: 'Armoury' })
    armoury.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByText('Weapon Racks')).toBeInTheDocument()
  })

  it('floor switches re-default the active room and its details', async () => {
    const user = userEvent.setup()
    await renderLoadedMapLabPage()

    await user.click(screen.getByRole('tab', { name: 'First Floor' }))
    expect(screen.getByText('Balcony')).toBeInTheDocument()
    expect(screen.queryByText('Banner')).not.toBeInTheDocument()
  })

  it('stair travel updates the room details on the destination floor', async () => {
    const user = userEvent.setup()
    await renderLoadedMapLabPage()

    await user.click(screen.getByRole('button', { name: /Stone Stairs.*floor 1/i }))
    expect(screen.getByRole('heading', { name: 'First Floor Landing', level: 3 })).toBeInTheDocument()
    expect(screen.getByText('Balcony')).toBeInTheDocument()
  })

  it('encounter entries launch the encounter dock', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'getEncounter').mockResolvedValue({
      id: 7,
      title: 'Goblin Drill',
      active_index: 0,
      creatures: [],
    })
    vi.spyOn(api, 'getConditions').mockResolvedValue([])

    await renderLoadedMapLabPage()
    await user.click(screen.getByRole('button', { name: 'Run encounter' }))

    expect(await screen.findByRole('dialog', { name: 'Goblin Drill' })).toBeInTheDocument()
  })

  it('NPC chips open the NPC dock', async () => {
    const user = userEvent.setup()
    await renderLoadedMapLabPage()

    await user.click(await screen.findByRole('button', { name: 'Mira' }))
    expect(await screen.findByRole('dialog', { name: 'Mira' })).toBeInTheDocument()
    expect(screen.getByTestId('npc-stat-card')).toBeInTheDocument()
    expect(screen.getByText('Black hair, brown eyes')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('18')).toBeInTheDocument()
    expect(screen.getByText('30 ft., climb 20 ft.')).toBeInTheDocument()
    expect(screen.getByText('+3')).toBeInTheDocument()
  })

  it('NPC dock reports a load failure through StatePanel, not a bare alert', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'getNPC').mockRejectedValue(new Error('Failed to load NPC.'))

    await renderLoadedMapLabPage()
    await user.click(await screen.findByRole('button', { name: 'Mira' }))

    const dock = await screen.findByRole('dialog', { name: 'NPC #9' })
    expect(await within(dock).findByText('Failed to load NPC.')).toBeInTheDocument()
    expect(within(dock).getByText('Something went wrong')).toBeInTheDocument()
    expect(within(dock).queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByTestId('npc-stat-card')).not.toBeInTheDocument()
  })

  it('layout-only rooms show the empty content state', async () => {
    const user = userEvent.setup()
    await renderLoadedMapLabPage()

    await user.click(within(screen.getByRole('group', { name: /dungeon floor map/i })).getByRole('button', { name: 'Back Stairwell' }))
    expect(screen.getByText('This room has no content data yet.')).toBeInTheDocument()
  })

  it('fixture inspection still works while the details panel shows the active room', async () => {
    const user = userEvent.setup()
    await renderLoadedMapLabPage()

    await user.click(screen.getByRole('button', { name: /Heavy Stone Door/ }))
    expect(screen.getByText('Door')).toBeInTheDocument()
    expect(within(screen.getByLabelText('Room details')).getByRole('heading', { name: 'Training Hall', level: 3 })).toBeInTheDocument()
  })

  it('data-only rooms are not invented on the map', async () => {
    await renderLoadedMapLabPage()
    expect(within(screen.getByRole('group', { name: /dungeon floor map/i })).queryByRole('button', { name: 'Data Only Room' })).not.toBeInTheDocument()
  })
})
