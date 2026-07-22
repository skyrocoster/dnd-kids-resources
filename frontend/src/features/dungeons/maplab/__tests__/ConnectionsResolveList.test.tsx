import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createEmptyMapLayout, type MapLayout, type MapPortal } from '../maplabModel'
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

function layoutWithPortals(portals: MapPortal[]): MapLayout {
  return { ...createEmptyMapLayout(), portals }
}

describe('ConnectionsResolveList', () => {
  it('renders one row per unresolved portal', () => {
    render(<ConnectionsResolveList layout={layoutWithPortals([resolvedPortal, unresolvedPortal])} onResolve={vi.fn()} />)

    expect(screen.getByText(/Cellar tunnel/)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Choose destination' })).toHaveLength(1)
  })

  it('shows the empty-state copy when nothing is unresolved', () => {
    render(<ConnectionsResolveList layout={layoutWithPortals([resolvedPortal])} onResolve={vi.fn()} />)

    expect(screen.getByText('Every connection has both ends. Nothing to resolve.')).toBeInTheDocument()
  })

  it('fires onResolve with the portal when its action is clicked', async () => {
    const user = userEvent.setup()
    const onResolve = vi.fn()
    render(<ConnectionsResolveList layout={layoutWithPortals([unresolvedPortal])} onResolve={onResolve} />)

    await user.click(screen.getByRole('button', { name: 'Choose destination' }))

    expect(onResolve).toHaveBeenCalledWith(unresolvedPortal)
  })
})
