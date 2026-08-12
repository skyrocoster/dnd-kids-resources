import { fireEvent, render as rtlRender, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseDungeonData } from '../../dungeonModel'
import { mapLabLayout } from '../maplabData'
import { createEmptyMapLayout } from '../../../../model/maplabModel'
import { ViewerRoomRail } from '../ViewerRoomRail'

const parsed = parseDungeonData({
  rooms: [
    {
      room_id: 17,
      title: 'Training Hall',
      entries: [
        { entry_type: 'trap', title: 'Loose Flagstones', content: 'Darts fire from the walls.' },
        { entry_type: 'encounter', title: 'Goblin Drill', content: '2d4 goblins rush the room.', encounter_id: 7 },
      ],
      npcs: [],
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
      room_id: 100,
      title: 'East Wing',
      entries: [{ entry_type: 'monster', title: 'Watcher', content: 'A monster hides in the rafters.' }],
      npcs: [],
    },
  ],
})

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

function render(...args: Parameters<typeof rtlRender>) {
  const result = rtlRender(...args)
  fireEvent.click(screen.getByRole('button', { name: 'Find room…' }))
  return result
}

describe('ViewerRoomRail', () => {
  it('starts closed and opens from its labelled trigger', async () => {
    rtlRender(<ViewerRoomRail layout={mapLabLayout} parsed={parsed} activeRoomId={17} onSelectRoom={vi.fn()} />)
    expect(screen.queryByRole('dialog', { name: 'Find room' })).not.toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Find room…' }))
    expect(screen.getByRole('dialog', { name: 'Find room' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Find room…' })).toHaveFocus()
  })
  it('groups rooms by floor with headings for multi-floor layouts', () => {
    render(
      <ViewerRoomRail layout={mapLabLayout} parsed={parsed} activeRoomId={17} onSelectRoom={vi.fn()} />,
    )

    expect(screen.getByRole('heading', { name: 'Ground Floor', level: 4 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'First Floor', level: 4 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Two-Wing Test Layout', level: 4 })).toBeInTheDocument()

    const groundRooms = within(screen.getByRole('listbox', { name: 'Ground Floor rooms' }))
    expect(groundRooms.getByRole('button', { name: /Training Hall/i })).toBeInTheDocument()
    expect(groundRooms.getByRole('button', { name: 'Armoury' })).toBeInTheDocument()
  })

  it('keeps rooms in roomsOnZ order within a floor', () => {
    render(
      <ViewerRoomRail layout={mapLabLayout} parsed={parsed} activeRoomId={17} onSelectRoom={vi.fn()} />,
    )

    const groundButtons = within(screen.getByRole('listbox', { name: 'Ground Floor rooms' })).getAllByRole('button')
    expect(groundButtons.map((button) => button.textContent ?? '')).toEqual([
      expect.stringContaining('Training Hall'),
      expect.stringContaining('Armoury'),
      expect.stringContaining('Back Stairwell'),
    ])
  })

  it('marks the selected room pressed and selected', () => {
    render(
      <ViewerRoomRail layout={mapLabLayout} parsed={parsed} activeRoomId={23} onSelectRoom={vi.fn()} />,
    )

    const armoury = screen.getByRole('button', { name: 'Armoury' })
    const trainingHall = screen.getByRole('button', { name: /Training Hall/i })
    expect(armoury).toHaveAttribute('aria-pressed', 'true')
    expect(trainingHall).toHaveAttribute('aria-pressed', 'false')
    expect(armoury.closest('.maplab-viewer-rail-room-item')).toHaveAttribute('data-selected')
  })

  it('calls onSelectRoom with the clicked room id', async () => {
    const user = userEvent.setup()
    const onSelectRoom = vi.fn()

    render(
      <ViewerRoomRail layout={mapLabLayout} parsed={parsed} activeRoomId={17} onSelectRoom={onSelectRoom} />,
    )

    await user.click(screen.getByRole('button', { name: 'Armoury' }))
    expect(onSelectRoom).toHaveBeenCalledWith(23)
  })

  it('passes the correct room id for cross-floor clicks', async () => {
    const user = userEvent.setup()
    const onSelectRoom = vi.fn()

    render(
      <ViewerRoomRail layout={mapLabLayout} parsed={parsed} activeRoomId={17} onSelectRoom={onSelectRoom} />,
    )

    await user.click(screen.getByRole('button', { name: 'First Floor Landing' }))
    expect(onSelectRoom).toHaveBeenCalledWith(33)
  })

  it('falls back to the layout title when no dungeon data room matches', () => {
    const layout = {
      ...mapLabLayout,
      rooms: [...mapLabLayout.rooms, { room_id: 101, z: 0, origin: [20, 0] as [number, number], cells: [[0, 0] as [number, number]], title: 'Layout Spare Room' }],
    }

    render(
      <ViewerRoomRail layout={layout} parsed={parsed} activeRoomId={17} onSelectRoom={vi.fn()} />,
    )

    expect(screen.getByRole('button', { name: 'Layout Spare Room' })).toBeInTheDocument()
  })

  it('falls back to a generic room label when neither data nor layout title exists', () => {
    const layout = {
      ...mapLabLayout,
      rooms: [...mapLabLayout.rooms, { room_id: 99, z: 0, origin: [18, 0] as [number, number], cells: [[0, 0] as [number, number]] }],
    }

    render(
      <ViewerRoomRail layout={layout} parsed={parsed} activeRoomId={17} onSelectRoom={vi.fn()} />,
    )

    expect(screen.getByRole('button', { name: 'Room 99' })).toBeInTheDocument()
  })

  it('skips floors with no rooms', () => {
    const layout = {
      ...mapLabLayout,
      floors: [...mapLabLayout.floors, { z: 5, title: 'Empty Floor' }],
    }

    render(
      <ViewerRoomRail layout={layout} parsed={parsed} activeRoomId={17} onSelectRoom={vi.fn()} />,
    )

    expect(screen.queryByRole('heading', { name: 'Empty Floor', level: 4 })).not.toBeInTheDocument()
  })

  it('omits the floor heading when only one populated floor exists', () => {
    const layout = createEmptyMapLayout('Solo Floor')
    layout.rooms = [{ room_id: 17, z: 0, origin: [0, 0], cells: [[0, 0]], title: 'Lone Room' }]

    render(
      <ViewerRoomRail layout={layout} parsed={parseDungeonData({ rooms: [{ room_id: 17, title: 'Lone Room' }] })} activeRoomId={17} onSelectRoom={vi.fn()} />,
    )

    expect(screen.queryByRole('heading', { name: 'Solo Floor', level: 4 })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lone Room' })).toBeInTheDocument()
  })

  it('shows threat hint badges inline', () => {
    render(
      <ViewerRoomRail layout={mapLabLayout} parsed={parsed} activeRoomId={17} onSelectRoom={vi.fn()} />,
    )

    const trainingHall = screen.getByRole('button', { name: /Training Hall/i })
    expect(within(trainingHall).getByText('Trap')).toBeInTheDocument()
    expect(within(trainingHall).getByText('Encounter')).toBeInTheDocument()
    expect(within(trainingHall).getByLabelText('Room hints')).toBeInTheDocument()
  })

  it('shows an NPC hint when a room has explicit NPCs', () => {
    const withNpcs = parseDungeonData({
      rooms: [
        {
          room_id: 17,
          title: 'Training Hall',
          entries: [
            { entry_type: 'trap', title: 'Loose Flagstones', content: 'Darts fire from the walls.' },
            { entry_type: 'encounter', title: 'Goblin Drill', content: '2d4 goblins rush the room.', encounter_id: 7 },
          ],
          npcs: [1, 2],
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
          room_id: 100,
          title: 'East Wing',
          entries: [{ entry_type: 'monster', title: 'Watcher', content: 'A monster hides in the rafters.' }],
          npcs: [],
        },
      ],
    })

    render(
      <ViewerRoomRail layout={mapLabLayout} parsed={withNpcs} activeRoomId={17} onSelectRoom={vi.fn()} />,
    )

    const trainingHall = screen.getByRole('button', { name: /Training Hall/i })
    expect(within(trainingHall).getByText('2 NPCs')).toBeInTheDocument()
  })

  it('shows an NPC hint when a room has marker-derived NPCs', () => {
    const layoutWithMarker = {
      ...mapLabLayout,
      props: [
        ...mapLabLayout.props,
        { prop_id: 10, kind: 'npc', cell: [6, 0] as [number, number], z: 0, npc_id: 5, hidden: false, locked: false, trapped: false },
      ],
    }

    render(
      <ViewerRoomRail layout={layoutWithMarker} parsed={parsed} activeRoomId={23} onSelectRoom={vi.fn()} />,
    )

    const armoury = screen.getByRole('button', { name: /Armoury/ })
    expect(within(armoury).getByText('1 NPC')).toBeInTheDocument()
  })

  it('de-duplicates NPCs that are both explicit and marker-derived', () => {
    const layoutWithMarker = {
      ...mapLabLayout,
      props: [
        ...mapLabLayout.props,
        { prop_id: 10, kind: 'npc', cell: [6, 0] as [number, number], z: 0, npc_id: 1, hidden: false, locked: false, trapped: false },
      ],
    }
    const withExplicitNpc = parseDungeonData({
      rooms: [
        {
          room_id: 17,
          title: 'Training Hall',
          entries: [
            { entry_type: 'trap', title: 'Loose Flagstones', content: 'Darts fire from the walls.' },
            { entry_type: 'encounter', title: 'Goblin Drill', content: '2d4 goblins rush the room.', encounter_id: 7 },
          ],
          npcs: [],
        },
        {
          room_id: 23,
          title: 'Armoury',
          entries: [{ entry_type: 'feature', title: 'Weapon Racks', content: 'Dusty weapons line the walls.' }],
          npcs: [1, 2],
        },
        {
          room_id: 33,
          title: 'First Floor Landing',
          entries: [{ entry_type: 'feature', title: 'Balcony', content: 'A narrow overlook faces the courtyard.' }],
          npcs: [],
        },
        {
          room_id: 100,
          title: 'East Wing',
          entries: [{ entry_type: 'monster', title: 'Watcher', content: 'A monster hides in the rafters.' }],
          npcs: [],
        },
      ],
    })

    render(
      <ViewerRoomRail layout={layoutWithMarker} parsed={withExplicitNpc} activeRoomId={23} onSelectRoom={vi.fn()} />,
    )

    const armoury = screen.getByRole('button', { name: /Armoury/ })
    expect(within(armoury).getByText('2 NPCs')).toBeInTheDocument()
  })

  it('does not show NPC hint when room has no NPCs', () => {
    render(
      <ViewerRoomRail layout={mapLabLayout} parsed={parsed} activeRoomId={23} onSelectRoom={vi.fn()} />,
    )

    const armoury = screen.getByRole('button', { name: 'Armoury' })
    expect(within(armoury).queryByText(/NPC/)).not.toBeInTheDocument()
  })

  it('auto-scrolls the active room into view without throwing', () => {
    const layout = {
      ...createEmptyMapLayout('Long Floor'),
      rooms: Array.from({ length: 20 }, (_, index) => ({
        room_id: index + 1,
        z: 0,
        origin: [index, 0] as [number, number],
        cells: [[0, 0] as [number, number]],
        title: `Room ${index + 1}`,
      })),
    }

    render(
      <ViewerRoomRail layout={layout} parsed={parseDungeonData({ rooms: [] })} activeRoomId={20} onSelectRoom={vi.fn()} />,
    )

    expect(screen.getByRole('button', { name: 'Room 20' })).toBeInTheDocument()
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
  })

  it('shows useful results before typing and prioritizes the active floor', () => {
    render(<ViewerRoomRail layout={mapLabLayout} parsed={parsed} activeRoomId={33} onSelectRoom={vi.fn()} />)

    expect(screen.getByRole('searchbox', { name: 'Find room…' })).toBeInTheDocument()
    expect(screen.getAllByRole('listbox')[0]).toHaveAccessibleName('First Floor rooms')
  })

  it('filters by room number, title, and floor and labels off-map results', async () => {
    const user = userEvent.setup()
    const layout = { ...mapLabLayout, rooms: mapLabLayout.rooms.filter((room) => room.room_id !== 100) }
    render(<ViewerRoomRail layout={layout} parsed={parsed} activeRoomId={17} onSelectRoom={vi.fn()} />)

    await user.type(screen.getByRole('searchbox', { name: 'Find room…' }), '100')
    expect(screen.getByRole('button', { name: /East Wing/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Training Hall/ })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Off map', level: 4 })).toBeInTheDocument()
  })

  it('dismisses after selection and restores focus to Find room', async () => {
    const user = userEvent.setup()
    render(<ViewerRoomRail layout={mapLabLayout} parsed={parsed} activeRoomId={17} onSelectRoom={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Armoury' }))
    expect(screen.queryByRole('dialog', { name: 'Find room' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Find room…' })).toHaveFocus()
  })

  it('dismisses with Escape while keeping rows touch-safe', async () => {
    const user = userEvent.setup()
    render(<ViewerRoomRail layout={mapLabLayout} parsed={parsed} activeRoomId={17} onSelectRoom={vi.fn()} />)

    await user.click(screen.getByRole('searchbox', { name: 'Find room…' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Find room' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Find room…' })).toHaveFocus()
  })
})
