import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { LoomNode, LoomSession, LoomTapestry } from '../../../api/types'
import * as api from '../../../api/client'
import { LoomPage } from '../LoomPage'

const sessions: LoomSession[] = [
  { id: 1, ordinal: 1, name: 'Session 1', played_on: null, notes: null },
  { id: 2, ordinal: 2, name: 'Session 2', played_on: null, notes: null },
  { id: 3, ordinal: 3, name: 'Session 3', played_on: null, notes: null },
  { id: 4, ordinal: 4, name: 'Session 4', played_on: null, notes: null },
]

function demoTapestry(): LoomTapestry {
  return {
    threads: [{ id: 1, name: 'The Lost Puppy', color: 'thread-3' }],
    nodes: [
      { id: 1, kind: 'start', title: 'The Lost Puppy', thread_id: 1, session_id: 1, position: 0, carried_count: 0 },
      { id: 2, kind: 'session', title: 'Puppy goes missing', thread_id: 1, session_id: 2, position: 10, carried_count: 0 },
      { id: 4, kind: 'beat', title: 'Confront the goblin chief', thread_id: 1, session_id: 3, position: 20, carried_count: 0 },
      { id: 5, kind: 'end', title: 'Resolve: The Lost Puppy', thread_id: 1, session_id: 4, position: 30, carried_count: 0 },
      { id: 9, kind: 'beat', title: 'Mysterious hooded stranger', thread_id: null, position: 0, carried_count: 0 },
    ],
    sessions,
  }
}

describe('LoomPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the tapestry nodes and the beat bank tray once loaded', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(demoTapestry())

    render(<LoomPage />)

    await waitFor(() => expect(screen.getAllByText('The Lost Puppy').length).toBeGreaterThan(0))
    expect(screen.getByRole('heading', { name: 'The Loom' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Record Session' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Beat' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Manage Threads' })).toBeInTheDocument()
    expect(screen.getByText('Beat Bank (1)')).toBeInTheDocument()
  })

  it('renders Now and Next badges on the active thread', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(demoTapestry())

    render(<LoomPage />)

    await waitFor(() => expect(screen.getAllByText('The Lost Puppy').length).toBeGreaterThan(0))
    expect(screen.getAllByText('Now').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Next').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('button', { name: 'beat: Confront the goblin chief' })).toHaveClass('loom-node--ghosted')
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

    await waitFor(() => expect(screen.getAllByText('The Lost Puppy').length).toBeGreaterThan(0))
    await user.click(screen.getByRole('button', { name: 'Add Beat' }))

    expect(screen.getByRole('dialog', { name: 'Add New Beat' })).toBeInTheDocument()
  })

  it('opens the thread manager from the toolbar', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(demoTapestry())
    const user = userEvent.setup()
    render(<LoomPage />)

    await waitFor(() => expect(screen.getAllByText('The Lost Puppy').length).toBeGreaterThan(0))
    await user.click(screen.getByRole('button', { name: 'Manage Threads' }))

    const dialog = screen.getByRole('dialog', { name: 'Manage Threads' })
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveTextContent('The Lost Puppy')
  })

  it('shows the empty-tapestry state when there are no threads or nodes', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue({ threads: [], nodes: [], sessions: [] })
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
    await waitFor(() => expect(screen.getAllByText('The Lost Puppy').length).toBeGreaterThan(0))
    expect(screen.getByRole('complementary', { name: "Weaver's panel" })).toBeInTheDocument()
  })

  it('shows the beat bank tray below the swimlanes', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(demoTapestry())
    render(<LoomPage />)
    await waitFor(() => expect(screen.getAllByText('The Lost Puppy').length).toBeGreaterThan(0))
    expect(screen.getByRole('region', { name: 'Beat Bank' })).toBeInTheDocument()
    expect(screen.getByText('Mysterious hooded stranger')).toBeInTheDocument()
  })

  it('does not render the old .loom-inspector strip', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(demoTapestry())
    render(<LoomPage />)
    await waitFor(() => expect(screen.getAllByText('The Lost Puppy').length).toBeGreaterThan(0))
    expect(document.querySelector('.loom-inspector')).not.toBeInTheDocument()
  })

  it('renders clickable insertion gaps in the lane track', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(demoTapestry())
    render(<LoomPage />)
    await waitFor(() => expect(screen.getAllByText('The Lost Puppy').length).toBeGreaterThan(0))
    const gaps = document.querySelectorAll('.loom-lane-gap')
    expect(gaps.length).toBeGreaterThan(0)
  })

  it('opens the node editor when a gap is clicked', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(demoTapestry())
    const user = userEvent.setup()
    render(<LoomPage />)
    await waitFor(() => expect(screen.getAllByText('The Lost Puppy').length).toBeGreaterThan(0))
    const gaps = document.querySelectorAll('.loom-lane-gap')
    expect(gaps.length).toBeGreaterThan(0)
    await user.click(gaps[0])
    expect(screen.getByRole('dialog', { name: /Add New Beat/ })).toBeInTheDocument()
  })

  it('creates a node and inserts it at the gap position on save', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(demoTapestry())
    const createdNode: LoomNode = { id: 99, kind: 'beat', title: 'New Beat', thread_id: null, position: 0, carried_count: 0 }
    const createLoomNodeSpy = vi.spyOn(api, 'createLoomNode').mockResolvedValue(createdNode)
    const insertSpy = vi.spyOn(api, 'insertLoomThreadItem').mockResolvedValue({} as any)
    const user = userEvent.setup()
    render(<LoomPage />)
    await waitFor(() => expect(screen.getAllByText('The Lost Puppy').length).toBeGreaterThan(0))
    const gaps = document.querySelectorAll('.loom-lane-gap')
    await user.click(gaps[0])
    await user.type(screen.getByLabelText('Title'), 'New Beat')
    await user.click(screen.getByRole('button', { name: 'Create Node' }))
    await waitFor(() => {
      expect(createLoomNodeSpy).toHaveBeenCalled()
      expect(insertSpy).toHaveBeenCalledWith(1, { node_id: 99, position: expect.any(Number) })
    })
  })

  it('renders warp gaps in the grid view', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(demoTapestry())
    render(<LoomPage />)
    await waitFor(() => expect(screen.getAllByText('The Lost Puppy').length).toBeGreaterThan(0))
    const gaps = document.querySelectorAll('.loom-lane-gap')
    expect(gaps.length).toBeGreaterThan(0)
  })
})
