import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { LoomTapestry } from '../../../api/types'
import * as api from '../../../api/client'
import { LoomPage } from '../LoomPage'

function demoTapestry(): LoomTapestry {
  return {
    threads: [{ id: 1, name: 'The Lost Puppy', color: 'thread-3' }],
    nodes: [
      { id: 1, kind: 'update', title: 'Puppy goes missing in the village', x: 0, y: 0, thread_ids: [1] },
      { id: 4, kind: 'anchor', title: 'Confront the goblin chief', status: 'planned', x: 400, y: 75, thread_ids: [1] },
      { id: 7, kind: 'update', title: 'Mysterious hooded stranger', x: 400, y: 300, thread_ids: [] },
    ],
    edges: [{ id: 1, source_id: 1, target_id: 4 }],
  }
}

describe('LoomPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the tapestry nodes and the vault panel once loaded', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(demoTapestry())

    render(<LoomPage />)

    await waitFor(() => expect(screen.getByText('Puppy goes missing in the village')).toBeInTheDocument())
    expect(screen.getByText('Idea Vault (1)')).toBeInTheDocument()
  })

  it('shows an error state with a retry action on load failure', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockRejectedValue(new Error('network down'))

    render(<LoomPage />)

    await waitFor(() => expect(screen.getByText('network down')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('opens the node editor with the anchor kind preset from the New Anchor toolbar button', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(demoTapestry())
    const user = userEvent.setup()
    render(<LoomPage />)

    await waitFor(() => expect(screen.getByText('Puppy goes missing in the village')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'New Anchor' }))

    expect(screen.getByRole('dialog', { name: 'Add New Anchor' })).toBeInTheDocument()
  })

  it('opens the thread manager from the toolbar', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(demoTapestry())
    const user = userEvent.setup()
    render(<LoomPage />)

    await waitFor(() => expect(screen.getByText('Puppy goes missing in the village')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Manage Threads' }))

    expect(screen.getByRole('dialog', { name: 'Manage Threads' })).toBeInTheDocument()
    expect(screen.getByText('The Lost Puppy')).toBeInTheDocument()
  })

  it('shows the empty-tapestry state when there are no threads or nodes', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue({ threads: [], nodes: [], edges: [] })
    render(<LoomPage />)

    expect(await screen.findByText('Your tapestry is empty')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create your first thread' })).toBeInTheDocument()
  })
})
