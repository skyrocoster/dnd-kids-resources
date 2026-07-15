import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { parseDungeonData, type DungeonData } from '../../dungeonModel'
import { mapLabLayout } from '../maplabData'
import { createEmptyMapLayout, type MapLayout } from '../maplabModel'
import { useActiveRoom } from '../useActiveRoom'

function buildData(roomIds: number[]): DungeonData {
  return parseDungeonData({
    rooms: roomIds.map((roomId) => ({ room_id: roomId, title: `Room ${roomId}`, entries: [], npcs: [] })),
  })
}

function ActiveRoomHarness({
  layout = mapLabLayout,
  parsed = buildData([17, 23, 33]),
}: {
  layout?: MapLayout
  parsed?: DungeonData
}) {
  const [activeZ, setActiveZ] = React.useState<number>(0)
  const active = useActiveRoom(layout, activeZ, parsed, setActiveZ)

  return (
    <div>
      <div>active-room:{active.activeRoomId ?? 'none'}</div>
      <div>active-z:{activeZ}</div>
      <button type="button" onClick={() => active.setActiveRoomId(23)}>set-23</button>
      <button type="button" onClick={() => active.setActiveRoomId(33)}>set-33</button>
      <button type="button" onClick={() => setActiveZ(1)}>floor-1</button>
    </div>
  )
}

describe('useActiveRoom', () => {
  it('defaults to first room with matching data on the initial floor', () => {
    render(<ActiveRoomHarness parsed={buildData([23, 33])} />)
    expect(screen.getByText('active-room:23')).toBeInTheDocument()
  })

  it('falls back to the first layout room when no data matches', () => {
    render(<ActiveRoomHarness parsed={buildData([999])} />)
    expect(screen.getByText('active-room:17')).toBeInTheDocument()
  })

  it('stays null when the layout has no rooms', () => {
    render(<ActiveRoomHarness layout={createEmptyMapLayout()} parsed={buildData([1])} />)
    expect(screen.getByText('active-room:none')).toBeInTheDocument()
  })

  it('setActiveRoomId changes the active room', async () => {
    const user = userEvent.setup()
    render(<ActiveRoomHarness />)

    await user.click(screen.getByRole('button', { name: 'set-23' }))
    expect(screen.getByText('active-room:23')).toBeInTheDocument()
  })

  it('setActiveRoomId triggers a floor change when the room is on another floor', async () => {
    const user = userEvent.setup()
    render(<ActiveRoomHarness />)

    await user.click(screen.getByRole('button', { name: 'set-33' }))
    expect(screen.getByText('active-z:1')).toBeInTheDocument()
    expect(screen.getByText('active-room:33')).toBeInTheDocument()
  })

  it('floor switches re-default the active room on the new floor', async () => {
    const user = userEvent.setup()
    render(<ActiveRoomHarness parsed={buildData([23, 33])} />)

    await user.click(screen.getByRole('button', { name: 'floor-1' }))
    expect(screen.getByText('active-z:1')).toBeInTheDocument()
    expect(screen.getByText('active-room:33')).toBeInTheDocument()
  })
})
