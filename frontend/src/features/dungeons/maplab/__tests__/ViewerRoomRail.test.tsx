import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseDungeonData } from '../../dungeonModel'
import { mapLabLayout } from '../maplabData'
import { createEmptyMapLayout } from '../maplabModel'
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

describe('ViewerRoomRail', () => {
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
})
