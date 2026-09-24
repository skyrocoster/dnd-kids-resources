import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Dungeon, IncomingGateway } from '../../../../api/types'
import { createEmptyMapLayout, type MapLayout, type MapPortal } from '../../../../model/maplabModel'
import { ConnectionsResolveList } from '../ConnectionsResolveList'

const resolvedPortal: MapPortal = {
  portal_id: 1,
  z: 0,
  cell: [1, 1],
  to: { z: 1, cell: [5, 5] },
  hidden: false,
  locked: false,
  trapped: false,
}

const unresolvedPortal: MapPortal = {
  portal_id: 2,
  z: 0,
  cell: [2, 2],
  title: 'Cellar tunnel',
  hidden: false,
  locked: false,
  trapped: false,
}

const brokenGatewayPortal: MapPortal = {
  portal_id: 3,
  z: 0,
  cell: [3, 3],
  title: 'Old gateway',
  to: { dungeon_id: 999 },
  hidden: false,
  locked: false,
  trapped: false,
}

const validGatewayPortal: MapPortal = {
  portal_id: 4,
  z: 0,
  cell: [4, 4],
  title: 'Valid gateway',
  to: { dungeon_id: 42 },
  hidden: false,
  locked: false,
  trapped: false,
}

const existingDungeon: Dungeon = { id: 42, title: 'The Castle', data: {} }

const incomingGateway: IncomingGateway = {
  dungeon_id: 7,
  dungeon_title: 'The Castle',
  portal_id: 10,
  title: 'Castle gate',
  z: 0,
  cell: [2, 9],
}

function layoutWithPortals(portals: MapPortal[]): MapLayout {
  return { ...createEmptyMapLayout(), portals }
}

function renderList(overrides: Partial<Parameters<typeof ConnectionsResolveList>[0]> = {}) {
  const onResolve = vi.fn()
  const onRemoveGateway = vi.fn()
  const onAddReturnGateway = vi.fn()
  render(
    <ConnectionsResolveList
      layout={layoutWithPortals([resolvedPortal])}
      dungeons={[existingDungeon]}
      incomingGateways={[]}
      connectionsLoaded
      connectionsLoadError={false}
      onResolve={onResolve}
      onRemoveGateway={onRemoveGateway}
      onAddReturnGateway={onAddReturnGateway}
      {...overrides}
    />,
  )
  return { onResolve, onRemoveGateway, onAddReturnGateway }
}

describe('ConnectionsResolveList', () => {
  it('renders one row per unresolved portal', () => {
    renderList({ layout: layoutWithPortals([resolvedPortal, unresolvedPortal]) })

    expect(screen.getByText(/Cellar tunnel/)).toBeInTheDocument()
    const chooseButton = screen.getByRole('button', { name: 'Choose destination' })
    expect(screen.getAllByRole('button', { name: 'Choose destination' })).toHaveLength(1)
    expect(chooseButton).toHaveAttribute('type', 'button')
    expect(chooseButton).toHaveClass('maplab-pill-button', 'maplab-connections-resolve-list-action')
    expect(chooseButton).not.toBeDisabled()
  })

  it('shows the empty-state copy when nothing is unresolved', () => {
    renderList({ layout: layoutWithPortals([resolvedPortal]) })

    expect(screen.getByText('Every connection has both ends. Nothing to resolve.')).toBeInTheDocument()
  })

  it('fires onResolve with the portal when its action is clicked', async () => {
    const user = userEvent.setup()
    const { onResolve } = renderList({ layout: layoutWithPortals([unresolvedPortal]) })

    await user.click(screen.getByRole('button', { name: 'Choose destination' }))

    expect(onResolve).toHaveBeenCalledWith(unresolvedPortal)
  })

  it('renders a repoint/remove row for a gateway whose target dungeon no longer exists', async () => {
    const user = userEvent.setup()
    const { onResolve, onRemoveGateway } = renderList({
      layout: layoutWithPortals([brokenGatewayPortal]),
      dungeons: [existingDungeon],
    })

    expect(screen.getByText(/Old gateway/)).toBeInTheDocument()

    const repointButton = screen.getByRole('button', { name: 'Repoint' })
    expect(repointButton).toHaveAttribute('type', 'button')
    expect(repointButton).toHaveClass('maplab-pill-button', 'maplab-connections-resolve-list-action')
    await user.click(repointButton)
    expect(onResolve).toHaveBeenCalledWith(brokenGatewayPortal)

    const removeButton = screen.getByRole('button', { name: 'Remove' })
    expect(removeButton).toHaveAttribute('type', 'button')
    expect(removeButton).toHaveClass('maplab-pill-button', 'maplab-connections-resolve-list-action')
    await user.click(removeButton)
    expect(onRemoveGateway).toHaveBeenCalledWith(brokenGatewayPortal)
  })

  it('does not flag a gateway whose target dungeon still exists', () => {
    renderList({
      layout: layoutWithPortals([validGatewayPortal]),
      dungeons: [existingDungeon],
    })

    expect(screen.getByText('Every connection has both ends. Nothing to resolve.')).toBeInTheDocument()
  })

  it('renders an add-return-gateway row for an incoming gateway with no return', async () => {
    const user = userEvent.setup()
    const { onAddReturnGateway } = renderList({
      layout: layoutWithPortals([]),
      incomingGateways: [incomingGateway],
    })

    expect(screen.getByText(/The Castle links here, at square 2,9/)).toBeInTheDocument()

    const addReturnButton = screen.getByRole('button', { name: 'Add the return gateway' })
    expect(addReturnButton).toHaveAttribute('type', 'button')
    expect(addReturnButton).toHaveClass('maplab-pill-button', 'maplab-connections-resolve-list-action')
    await user.click(addReturnButton)
    expect(onAddReturnGateway).toHaveBeenCalledWith(incomingGateway)
  })

  it('does not flag any gateway as broken before the dungeon list has loaded', () => {
    renderList({
      layout: layoutWithPortals([validGatewayPortal, brokenGatewayPortal]),
      dungeons: [],
      connectionsLoaded: false,
    })

    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument()
    expect(screen.getByText('Every connection has both ends. Nothing to resolve.')).toBeInTheDocument()
  })

  it('shows only the error panel when connections fail to load', () => {
    renderList({
      layout: layoutWithPortals([validGatewayPortal, unresolvedPortal]),
      dungeons: [],
      connectionsLoaded: false,
      connectionsLoadError: true,
    })

    expect(screen.getByText("Couldn't load connections")).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Choose destination' })).not.toBeInTheDocument()
    expect(screen.queryByText('Every connection has both ends. Nothing to resolve.')).not.toBeInTheDocument()
  })

  it('does not flag an incoming gateway that already has a return portal', () => {
    renderList({
      layout: layoutWithPortals([{ ...validGatewayPortal, to: { dungeon_id: incomingGateway.dungeon_id } }]),
      dungeons: [{ id: incomingGateway.dungeon_id, title: incomingGateway.dungeon_title, data: {} }],
      incomingGateways: [incomingGateway],
    })

    expect(screen.getByText('Every connection has both ends. Nothing to resolve.')).toBeInTheDocument()
  })
})
