import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../../../api/client'
import type { NPC } from '../../../../api/types'
import { parseDungeonData } from '../../dungeonModel'
import type { MapLayout, MapRoom } from '../../../../model/maplabModel'
import { RoomDetailsPanel } from '../RoomDetailsPanel'

const room: MapRoom = {
  room_id: 17,
  z: 0,
  origin: [0, 0],
  cells: [[0, 0]],
  title: 'Layout Hall',
}

const parsed = parseDungeonData({
  rooms: [
    {
      room_id: 17,
      title: 'Training Hall',
      npcs: [9],
      entries: [
        { entry_type: 'feature', title: 'Fountain', content: 'Water flows for 1d4 rounds.' },
        {
          entry_type: 'treasure',
          title: 'Cache',
          content: 'Coins in the alcove.',
          treasure_contents: [{ name: 'Ruby', quantity: 2 }],
        },
        { entry_type: 'encounter', title: 'Ambush', content: '2d6 goblins attack.', encounter_id: 7 },
      ],
    },
  ],
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(api, 'listNPCs').mockResolvedValue([{ id: 9, name: 'Mira' }] as NPC[])
})

describe('RoomDetailsPanel', () => {
  it('renders the room title and grouped entry sections', async () => {
    render(
      <RoomDetailsPanel
        room={room}
        dungeonRoom={parsed.rooms?.[0] ?? null}
        parsed={parsed}
        dungeonId={4}
        onRunEncounter={vi.fn()}
        onOpenNpc={vi.fn()}
      />,
    )

    expect(screen.getByText('Training Hall')).toBeInTheDocument()
    expect(screen.getByText('Features')).toBeInTheDocument()
    expect(screen.getByText('Treasure')).toBeInTheDocument()
    expect(screen.getByText('Encounters')).toBeInTheDocument()
  })

  it('renders treasure contents inline within the entry tile', () => {
    render(
      <RoomDetailsPanel
        room={room}
        dungeonRoom={parsed.rooms?.[0] ?? null}
        parsed={parsed}
        dungeonId={4}
        onRunEncounter={vi.fn()}
        onOpenNpc={vi.fn()}
      />,
    )

    expect(screen.getByText('Treasure: 2 x Ruby')).toBeInTheDocument()
  })

  it('fires the encounter callback from Run encounter buttons', async () => {
    const user = userEvent.setup()
    const onRunEncounter = vi.fn()

    render(
      <RoomDetailsPanel
        room={room}
        dungeonRoom={parsed.rooms?.[0] ?? null}
        parsed={parsed}
        dungeonId={4}
        onRunEncounter={onRunEncounter}
        onOpenNpc={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Run encounter' }))
    expect(onRunEncounter).toHaveBeenCalledWith(7)
  })

  it('renders NPC chips for rooms with NPC ids', async () => {
    render(
      <RoomDetailsPanel
        room={room}
        dungeonRoom={parsed.rooms?.[0] ?? null}
        parsed={parsed}
        dungeonId={4}
        onRunEncounter={vi.fn()}
        onOpenNpc={vi.fn()}
      />,
    )

    expect(await screen.findByRole('button', { name: 'Mira' })).toBeInTheDocument()
  })

  it('shows the muted empty-content state for layout-only rooms', () => {
    render(
      <RoomDetailsPanel
        room={room}
        dungeonRoom={null}
        parsed={parsed}
        dungeonId={4}
        onRunEncounter={vi.fn()}
        onOpenNpc={vi.fn()}
      />,
    )

    expect(screen.getByText('Layout Hall')).toBeInTheDocument()
    expect(screen.getByText('This room has no content data yet.')).toBeInTheDocument()
  })

  it('shows the no-selection prompt when no room is active', () => {
    render(
      <RoomDetailsPanel
        room={null}
        dungeonRoom={null}
        parsed={parsed}
        dungeonId={4}
        onRunEncounter={vi.fn()}
        onOpenNpc={vi.fn()}
      />,
    )

    expect(screen.getByText('Select a room on the map to see its details.')).toBeInTheDocument()
  })

  it('shows "This room is empty." when the room has no entries', () => {
    const emptyParsed = parseDungeonData({ rooms: [{ room_id: 17, title: 'Training Hall', entries: [], npcs: [] }] })

    render(
      <RoomDetailsPanel
        room={room}
        dungeonRoom={emptyParsed.rooms?.[0] ?? null}
        parsed={emptyParsed}
        dungeonId={4}
        onRunEncounter={vi.fn()}
        onOpenNpc={vi.fn()}
      />,
    )

    expect(screen.getByText('This room is empty.')).toBeInTheDocument()
  })

  it('does not crash when optional NPC and entry data are missing', () => {
    const sparseParsed = parseDungeonData({ rooms: [{ room_id: 17, title: 'Sparse Room' }] })

    render(
      <RoomDetailsPanel
        room={room}
        dungeonRoom={sparseParsed.rooms?.[0] ?? null}
        parsed={sparseParsed}
        dungeonId={4}
        onRunEncounter={vi.fn()}
        onOpenNpc={vi.fn()}
      />,
    )

    expect(screen.getByText('Sparse Room')).toBeInTheDocument()
    expect(screen.getByText('This room is empty.')).toBeInTheDocument()
  })

  it('calls onPartyIsHere when the Party is here button is clicked', async () => {
    const user = userEvent.setup()
    const onPartyIsHere = vi.fn()

    render(
      <RoomDetailsPanel
        room={room}
        dungeonRoom={parsed.rooms?.[0] ?? null}
        parsed={parsed}
        dungeonId={4}
        onRunEncounter={vi.fn()}
        onOpenNpc={vi.fn()}
        onPartyIsHere={onPartyIsHere}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Party is here' }))
    expect(onPartyIsHere).toHaveBeenCalledOnce()
  })

  it('shows an inline error with role="status" when actionError is provided', () => {
    render(
      <RoomDetailsPanel
        room={room}
        dungeonRoom={parsed.rooms?.[0] ?? null}
        parsed={parsed}
        dungeonId={4}
        onRunEncounter={vi.fn()}
        onOpenNpc={vi.fn()}
        onPartyIsHere={vi.fn()}
        actionError="Failed to set party location"
      />,
    )

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Failed to set party location')
  })

  describe('Marker-derived NPCs', () => {
    it('shows an NPC marker standing in the room', async () => {
      const layout: MapLayout = {
        meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
        rooms: [room],
        doors: [],
        stairs: [],
        floors: [{ z: 0 }],
        props: [
          { prop_id: 1, kind: 'npc', cell: [0, 0], npc_id: 15, hidden: false, locked: false, trapped: false },
        ],
        portals: [],
        features: [],
      }

      vi.mocked(api.listNPCs).mockResolvedValueOnce([
        { id: 9, name: 'Mira' },
        { id: 15, name: 'Elara' },
      ] as NPC[])

      render(
        <RoomDetailsPanel
          room={room}
          dungeonRoom={parsed.rooms?.[0] ?? null}
          parsed={parsed}
          dungeonId={4}
          layout={layout}
          onRunEncounter={vi.fn()}
          onOpenNpc={vi.fn()}
        />,
      )

      expect(await screen.findByRole('button', { name: 'Mira' })).toBeInTheDocument()
      expect(await screen.findByRole('button', { name: 'Elara' })).toBeInTheDocument()
    })

    it('de-duplicates an NPC in both explicit list and marker', async () => {
      const layout: MapLayout = {
        meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
        rooms: [room],
        doors: [],
        stairs: [],
        floors: [{ z: 0 }],
        props: [
          { prop_id: 1, kind: 'npc', cell: [0, 0], npc_id: 9, hidden: false, locked: false, trapped: false },
        ],
        portals: [],
        features: [],
      }

      vi.mocked(api.listNPCs).mockResolvedValueOnce([{ id: 9, name: 'Mira' }] as NPC[])

      render(
        <RoomDetailsPanel
          room={room}
          dungeonRoom={parsed.rooms?.[0] ?? null}
          parsed={parsed}
          dungeonId={4}
          layout={layout}
          onRunEncounter={vi.fn()}
          onOpenNpc={vi.fn()}
        />,
      )

      const miraBtns = await screen.findAllByRole('button', { name: 'Mira' })
      expect(miraBtns).toHaveLength(1)
    })

    it('excludes a marker in a different room', async () => {
      const layout: MapLayout = {
        meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
        rooms: [room],
        doors: [],
        stairs: [],
        floors: [{ z: 0 }],
        props: [
          { prop_id: 1, kind: 'npc', cell: [9, 9], npc_id: 15, hidden: false, locked: false, trapped: false },
        ],
        portals: [],
        features: [],
      }

      vi.mocked(api.listNPCs).mockResolvedValueOnce([
        { id: 9, name: 'Mira' },
        { id: 15, name: 'Elara' },
      ] as NPC[])

      render(
        <RoomDetailsPanel
          room={room}
          dungeonRoom={parsed.rooms?.[0] ?? null}
          parsed={parsed}
          dungeonId={4}
          layout={layout}
          onRunEncounter={vi.fn()}
          onOpenNpc={vi.fn()}
        />,
      )

      expect(await screen.findByRole('button', { name: 'Mira' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Elara' })).not.toBeInTheDocument()
    })

    it('excludes a marker on a different floor', async () => {
      const layout: MapLayout = {
        meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
        rooms: [room],
        doors: [],
        stairs: [],
        floors: [{ z: 0 }, { z: 1 }],
        props: [
          { prop_id: 1, kind: 'npc', z: 1, cell: [0, 0], npc_id: 15, hidden: false, locked: false, trapped: false },
        ],
        portals: [],
        features: [],
      }

      vi.mocked(api.listNPCs).mockResolvedValueOnce([
        { id: 9, name: 'Mira' },
        { id: 15, name: 'Elara' },
      ] as NPC[])

      render(
        <RoomDetailsPanel
          room={room}
          dungeonRoom={parsed.rooms?.[0] ?? null}
          parsed={parsed}
          dungeonId={4}
          layout={layout}
          onRunEncounter={vi.fn()}
          onOpenNpc={vi.fn()}
        />,
      )

      expect(await screen.findByRole('button', { name: 'Mira' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Elara' })).not.toBeInTheDocument()
    })

    it('shows markers in a layout-only room with no dungeon content data', async () => {
      const layout: MapLayout = {
        meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
        rooms: [room],
        doors: [],
        stairs: [],
        floors: [{ z: 0 }],
        props: [
          { prop_id: 1, kind: 'npc', cell: [0, 0], npc_id: 15, hidden: false, locked: false, trapped: false },
        ],
        portals: [],
        features: [],
      }

      vi.mocked(api.listNPCs).mockResolvedValueOnce([{ id: 15, name: 'Elara' }] as NPC[])

      render(
        <RoomDetailsPanel
          room={room}
          dungeonRoom={null}
          parsed={parsed}
          dungeonId={4}
          layout={layout}
          onRunEncounter={vi.fn()}
          onOpenNpc={vi.fn()}
        />,
      )

      expect(await screen.findByRole('button', { name: 'Elara' })).toBeInTheDocument()
    })
  })
})
