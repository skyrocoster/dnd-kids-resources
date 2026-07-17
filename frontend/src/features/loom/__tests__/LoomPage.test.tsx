import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { LoomTapestry } from '../../../api/types'
import * as api from '../../../api/client'
import { LoomPage } from '../LoomPage'

function demoTapestry(): LoomTapestry {
  return {
    threads: [{
      id: 1, name: 'The Lost Puppy', color: 'thread-3',
      items: [
        { node_id: 1, position: 0 },
        { node_id: 4, position: 10 },
      ],
    }],
    nodes: [
      { id: 1, kind: 'start', title: 'The Lost Puppy', x: 0, y: 0, thread_ids: [1] },
      { id: 4, kind: 'beat', title: 'Confront the goblin chief', x: 400, y: 75, thread_ids: [1] },
      { id: 9, kind: 'beat', title: 'Mysterious hooded stranger', x: 400, y: 300, thread_ids: [] },
    ],
  }
}

describe('LoomPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the tapestry nodes and the beat bank panel once loaded', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(demoTapestry())

    render(<LoomPage />)

    await waitFor(() => expect(screen.getByText('The Lost Puppy')).toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'The Loom' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Record Session' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Beat' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Manage Threads' })).toBeInTheDocument()
    expect(screen.getByText('Beat Bank (1)')).toBeInTheDocument()
  })

  it('shows an error state with a retry action on load failure', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockRejectedValue(new Error('network down'))

    render(<LoomPage />)

    await waitFor(() => expect(screen.getByText('network down')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('opens the node editor with the beat kind preset from the Add Beat toolbar button', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(demoTapestry())
    const user = userEvent.setup()
    render(<LoomPage />)

    await waitFor(() => expect(screen.getByText('The Lost Puppy')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Add Beat' }))

    expect(screen.getByRole('dialog', { name: 'Add New Beat' })).toBeInTheDocument()
  })

  it('opens the thread manager from the toolbar', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(demoTapestry())
    const user = userEvent.setup()
    render(<LoomPage />)

    await waitFor(() => expect(screen.getByText('The Lost Puppy')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Manage Threads' }))

    const dialog = screen.getByRole('dialog', { name: 'Manage Threads' })
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveTextContent('The Lost Puppy')
  })

  it('shows the empty-tapestry state when there are no threads or nodes', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue({ threads: [], nodes: [] })
    render(<LoomPage />)

    expect(await screen.findByText('Your tapestry is empty')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create your first thread' })).toBeInTheDocument()
  })

  it('renders the PageHeader with title "The Loom"', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(demoTapestry())
    render(<LoomPage />)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'The Loom' })).toBeInTheDocument())
  })

  it('renders the Weaver\'s panel rail', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(demoTapestry())
    render(<LoomPage />)
    await waitFor(() => expect(screen.getByText('The Lost Puppy')).toBeInTheDocument())
    expect(screen.getByRole('complementary', { name: "Weaver's panel" })).toBeInTheDocument()
    expect(screen.getByText('Beat Bank (1)')).toBeInTheDocument()
  })

  it('does not render the old .loom-inspector strip', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(demoTapestry())
    render(<LoomPage />)
    await waitFor(() => expect(screen.getByText('The Lost Puppy')).toBeInTheDocument())
    expect(document.querySelector('.loom-inspector')).not.toBeInTheDocument()
  })
})
