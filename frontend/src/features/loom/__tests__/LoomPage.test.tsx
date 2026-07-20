import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
    expect(screen.getByRole('button', { name: 'Advance Campaign' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Beat' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Manage Threads' })).toBeInTheDocument()
    expect(screen.getByText('Beat Bank (1)')).toBeInTheDocument()
  })

  it('renders the sticky toolbar with all three commands', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(demoTapestry())

    render(<LoomPage />)

    await waitFor(() => expect(screen.getAllByText('The Lost Puppy').length).toBeGreaterThan(0))
    const toolbar = document.querySelector('.loom-page-header')
    expect(toolbar).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Advance Campaign' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Beat' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Manage Threads' })).toBeInTheDocument()
  })

  it('renders Now and Next badges on the active thread', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(demoTapestry())

    render(<LoomPage />)

    await waitFor(() => expect(screen.getAllByText('The Lost Puppy').length).toBeGreaterThan(0))
    expect(screen.getAllByText('Current').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Next').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('button', { name: 'beat: Confront the goblin chief' })).toHaveClass('loom-node--ghosted')
  })

  it('shows an error state with a retry action on load failure', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockRejectedValue(new Error('network down'))

    render(<LoomPage />)

    await waitFor(() => expect(screen.getByText('The Loom couldn\'t load')).toBeInTheDocument())
    expect(screen.getByText('network down')).toBeInTheDocument()
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

    expect(await screen.findByText('No story threads found')).toBeInTheDocument()
    expect(screen.getByText('Create a thread to start tracking campaign progress.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Thread' })).toBeInTheDocument()
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
    const user = userEvent.setup()
    render(<LoomPage />)
    await waitFor(() => expect(screen.getAllByText('The Lost Puppy').length).toBeGreaterThan(0))
    expect(screen.getByRole('region', { name: 'Beat Bank' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Beat Bank/ }))
    expect(screen.getByText('Mysterious hooded stranger')).toBeInTheDocument()
  })

  it('shows the inspector toggle that opens and closes the drawer', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(demoTapestry())
    const user = userEvent.setup()
    render(<LoomPage />)
    await waitFor(() => expect(screen.getAllByText('The Lost Puppy').length).toBeGreaterThan(0))

    const toggle = screen.getByRole('button', { name: 'Inspector' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Close inspector' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close inspector' }))
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes the inspector drawer on Escape', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(demoTapestry())
    const user = userEvent.setup()
    render(<LoomPage />)
    await waitFor(() => expect(screen.getAllByText('The Lost Puppy').length).toBeGreaterThan(0))

    const toggle = screen.getByRole('button', { name: 'Inspector' })
    await user.click(toggle)
    expect(screen.getByRole('button', { name: 'Close inspector' })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('button', { name: 'Close inspector' })).not.toBeInTheDocument()
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('does not change .loom-canvas-column class when the inspector drawer opens', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(demoTapestry())
    const user = userEvent.setup()
    render(<LoomPage />)
    await waitFor(() => expect(screen.getAllByText('The Lost Puppy').length).toBeGreaterThan(0))

    const canvasColumn = document.querySelector('.loom-canvas-column')!
    const classNameBefore = canvasColumn.className

    await user.click(screen.getByRole('button', { name: 'Inspector' }))
    const classNameAfter = canvasColumn.className

    expect(classNameAfter).toBe(classNameBefore)
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

  it('opens the session log wizard from Advance Campaign', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(demoTapestry())
    const user = userEvent.setup()
    render(<LoomPage />)
    await waitFor(() => expect(screen.getAllByText('The Lost Puppy').length).toBeGreaterThan(0))
    await user.click(screen.getByRole('button', { name: 'Advance Campaign' }))
    expect(screen.getByRole('dialog', { name: 'Log Session' })).toBeInTheDocument()
  })

  it('submits the session log with live thread outcomes and reloads', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(demoTapestry())
    const logSpy = vi.spyOn(api, 'logLoomSession').mockResolvedValue(
      { id: 5, ordinal: 5, name: 'Session 5', played_on: null, notes: null },
    )
    const user = userEvent.setup()
    render(<LoomPage />)
    await waitFor(() => expect(screen.getAllByText('The Lost Puppy').length).toBeGreaterThan(0))
    await user.click(screen.getByRole('button', { name: 'Advance Campaign' }))
    expect(screen.getByRole('dialog', { name: 'Log Session' })).toBeInTheDocument()

    await user.type(screen.getByLabelText('Session Name'), 'Session 5')
    await user.click(screen.getByRole('button', { name: 'Save Session' }))

    await waitFor(() => {
      expect(logSpy).toHaveBeenCalledWith({
        ordinal: 5,
        name: 'Session 5',
        played_on: null,
        notes: null,
        outcomes: { 1: { outcome: 'happened' } },
      })
    })
    expect(screen.queryByRole('dialog', { name: 'Log Session' })).not.toBeInTheDocument()
  })

  it('shows error and keeps dialog open when log fails', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(demoTapestry())
    vi.spyOn(api, 'logLoomSession').mockRejectedValue(new Error('Duplicate ordinal'))
    const user = userEvent.setup()
    render(<LoomPage />)
    await waitFor(() => expect(screen.getAllByText('The Lost Puppy').length).toBeGreaterThan(0))
    await user.click(screen.getByRole('button', { name: 'Advance Campaign' }))
    await user.type(screen.getByLabelText('Session Name'), 'Session X')
    await user.click(screen.getByRole('button', { name: 'Save Session' }))

    await waitFor(() => {
      expect(screen.getAllByText('Duplicate ordinal').length).toBeGreaterThan(0)
    })
    expect(screen.getByRole('dialog', { name: 'Log Session' })).toBeInTheDocument()
  })

  it('submits quiet outcomes for threads without a pending beat', async () => {
    const quietTapestry = {
      threads: [
        { id: 1, name: 'Live Thread', color: 'thread-1' as const },
        { id: 2, name: 'Quiet Thread', color: 'thread-2' as const },
      ],
      nodes: [
        { id: 1, kind: 'start' as const, title: 'Start', thread_id: 1, session_id: null, position: 0, carried_count: 0 },
        { id: 2, kind: 'beat' as const, title: 'Pending Beat', thread_id: 1, position: 10, carried_count: 0 },
        { id: 3, kind: 'end' as const, title: 'End', thread_id: 1, position: 20, carried_count: 0 },
        { id: 4, kind: 'start' as const, title: 'Quiet Start', thread_id: 2, session_id: null, position: 0, carried_count: 0 },
        { id: 5, kind: 'end' as const, title: 'Quiet End', thread_id: 2, position: 10, carried_count: 0 },
      ],
      sessions: [{ id: 1, ordinal: 1, name: 'Session 1', played_on: null, notes: null }],
    }
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(quietTapestry)
    const logSpy = vi.spyOn(api, 'logLoomSession').mockResolvedValue(
      { id: 2, ordinal: 2, name: 'Session 2', played_on: null, notes: null },
    )
    const user = userEvent.setup()
    render(<LoomPage />)
    await waitFor(() => expect(screen.getByText('Live Thread')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Advance Campaign' }))
    await user.type(screen.getByLabelText('Session Name'), 'Session 2')
    await user.click(screen.getByRole('button', { name: 'Save Session' }))

    await waitFor(() => {
      expect(logSpy).toHaveBeenCalledWith(expect.objectContaining({
        outcomes: {
          1: { outcome: 'happened' },
          2: { outcome: 'quiet' },
        },
      }))
    })
  })

  it('renders card action buttons on a placed beat card', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(demoTapestry())
    render(<LoomPage />)
    await waitFor(() => expect(screen.getAllByText('The Lost Puppy').length).toBeGreaterThan(0))
    expect(screen.getByRole('button', { name: 'Edit beat' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bank beat' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete beat' })).toBeInTheDocument()
  })

  it('opens the node editor when Edit is clicked on a beat card', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(demoTapestry())
    const user = userEvent.setup()
    render(<LoomPage />)
    await waitFor(() => expect(screen.getAllByText('The Lost Puppy').length).toBeGreaterThan(0))
    await user.click(screen.getByRole('button', { name: 'Edit beat' }))
    expect(screen.getByRole('dialog', { name: /Edit Beat/ })).toBeInTheDocument()
  })

  it('calls bankLoomNode when Bank is clicked on a beat card', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(demoTapestry())
    const bankSpy = vi.spyOn(api, 'bankLoomNode').mockResolvedValue({} as any)
    const user = userEvent.setup()
    render(<LoomPage />)
    await waitFor(() => expect(screen.getAllByText('The Lost Puppy').length).toBeGreaterThan(0))
    await user.click(screen.getByRole('button', { name: 'Bank beat' }))
    await waitFor(() => expect(bankSpy).toHaveBeenCalledWith(4))
  })

  it('shows delete confirmation when Delete is clicked on a beat card', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(demoTapestry())
    const user = userEvent.setup()
    render(<LoomPage />)
    await waitFor(() => expect(screen.getAllByText('The Lost Puppy').length).toBeGreaterThan(0))
    await user.click(screen.getByRole('button', { name: 'Delete beat' }))
    expect(screen.getByText(/Delete "Confront the goblin chief"/)).toBeInTheDocument()
  })

  it('calls reorderLoomThreadItem on same-thread warp reorder', async () => {
    const tapestry = {
      threads: [{ id: 1, name: 'The Lost Puppy', color: 'thread-3' as const }],
      nodes: [
        { id: 1, kind: 'start' as const, title: 'Start', thread_id: 1, session_id: 1, position: 0, carried_count: 0 },
        { id: 2, kind: 'beat' as const, title: 'Beat A', thread_id: 1, session_id: null, position: 10, carried_count: 0 },
        { id: 3, kind: 'beat' as const, title: 'Beat B', thread_id: 1, session_id: null, position: 20, carried_count: 0 },
        { id: 4, kind: 'end' as const, title: 'End', thread_id: 1, session_id: 4, position: 30, carried_count: 0 },
      ],
      sessions: [
        { id: 1, ordinal: 1, name: 'Session 1', played_on: null, notes: null },
        { id: 4, ordinal: 4, name: 'Session 4', played_on: null, notes: null },
      ],
    }
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(tapestry)
    const reorderSpy = vi.spyOn(api, 'reorderLoomThreadItem').mockResolvedValue({} as any)
    render(<LoomPage />)
    await waitFor(() => expect(screen.getAllByText('The Lost Puppy').length).toBeGreaterThan(0))

    const dt = {
      getData: () => JSON.stringify({ action: 'reorder', nodeId: 3, fromBodyIndex: 1, sourceThreadId: 1, nodeKind: 'beat' }),
      setData: vi.fn(),
    } as unknown as DataTransfer

    const beatB = screen.getByRole('button', { name: 'beat: Beat B' })
    fireEvent.dragStart(beatB, { dataTransfer: dt })

    const cardGroups = document.querySelectorAll('.loom-lane-card-group')
    expect(cardGroups.length).toBe(3)
    fireEvent.drop(cardGroups[0], { dataTransfer: dt })

    await waitFor(() => {
      expect(reorderSpy).toHaveBeenCalledWith(1, 3, { position: 10 })
    })
  })

  it('shows banner error when reorderLoomThreadItem fails', async () => {
    const tapestry = {
      threads: [{ id: 1, name: 'The Lost Puppy', color: 'thread-3' as const }],
      nodes: [
        { id: 1, kind: 'start' as const, title: 'Start', thread_id: 1, session_id: 1, position: 0, carried_count: 0 },
        { id: 2, kind: 'beat' as const, title: 'Beat A', thread_id: 1, session_id: null, position: 10, carried_count: 0 },
        { id: 3, kind: 'beat' as const, title: 'Beat B', thread_id: 1, session_id: null, position: 20, carried_count: 0 },
        { id: 4, kind: 'end' as const, title: 'End', thread_id: 1, session_id: 4, position: 30, carried_count: 0 },
      ],
      sessions: [
        { id: 1, ordinal: 1, name: 'Session 1', played_on: null, notes: null },
        { id: 4, ordinal: 4, name: 'Session 4', played_on: null, notes: null },
      ],
    }
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(tapestry)
    vi.spyOn(api, 'reorderLoomThreadItem').mockRejectedValue(new Error('Reorder failed'))
    render(<LoomPage />)
    await waitFor(() => expect(screen.getAllByText('The Lost Puppy').length).toBeGreaterThan(0))

    const dt = {
      getData: () => JSON.stringify({ action: 'reorder', nodeId: 3, fromBodyIndex: 1, sourceThreadId: 1, nodeKind: 'beat' }),
      setData: vi.fn(),
    } as unknown as DataTransfer

    const beatB = screen.getByRole('button', { name: 'beat: Beat B' })
    fireEvent.dragStart(beatB, { dataTransfer: dt })

    const cardGroups = document.querySelectorAll('.loom-lane-card-group')
    fireEvent.drop(cardGroups[0], { dataTransfer: dt })

    await waitFor(() => expect(screen.getByText('Reorder failed')).toBeInTheDocument())
  })

  it('calls moveLoomThreadItem on cross-lane drop', async () => {
    const tapestry = {
      threads: [
        { id: 1, name: 'Thread A', color: 'thread-3' as const },
        { id: 2, name: 'Thread B', color: 'thread-1' as const },
      ],
      nodes: [
        { id: 1, kind: 'start' as const, title: 'Start A', thread_id: 1, session_id: 1, position: 0, carried_count: 0 },
        { id: 2, kind: 'beat' as const, title: 'Beat A', thread_id: 1, session_id: null, position: 10, carried_count: 0 },
        { id: 3, kind: 'end' as const, title: 'End A', thread_id: 1, session_id: 4, position: 20, carried_count: 0 },
        { id: 4, kind: 'start' as const, title: 'Start B', thread_id: 2, session_id: 1, position: 0, carried_count: 0 },
        { id: 5, kind: 'end' as const, title: 'End B', thread_id: 2, session_id: 4, position: 10, carried_count: 0 },
      ],
      sessions: [
        { id: 1, ordinal: 1, name: 'Session 1', played_on: null, notes: null },
        { id: 4, ordinal: 4, name: 'Session 4', played_on: null, notes: null },
      ],
    }
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(tapestry)
    const moveSpy = vi.spyOn(api, 'moveLoomThreadItem').mockResolvedValue({} as any)
    render(<LoomPage />)
    await waitFor(() => expect(screen.getByText('Thread A')).toBeInTheDocument())

    const dt = {
      getData: () => JSON.stringify({ action: 'reorder', nodeId: 2, fromBodyIndex: 0, sourceThreadId: 1, nodeKind: 'beat' }),
      setData: vi.fn(),
    } as unknown as DataTransfer

    const beatA = screen.getByRole('button', { name: 'beat: Beat A' })
    fireEvent.dragStart(beatA, { dataTransfer: dt })

    const rows = document.querySelectorAll('.loom-grid-row')
    expect(rows.length).toBe(2)
    const row2Gaps = rows[1].querySelectorAll('.loom-lane-gap')
    expect(row2Gaps.length).toBeGreaterThan(0)
    fireEvent.drop(row2Gaps[0], { dataTransfer: dt })

    await waitFor(() => {
      expect(moveSpy).toHaveBeenCalledWith(1, 2, { target_thread_id: 2, position: expect.any(Number) })
    })
  })

  it('shows banner error when cross-lane move fails', async () => {
    const tapestry = {
      threads: [
        { id: 1, name: 'Thread A', color: 'thread-3' as const },
        { id: 2, name: 'Thread B', color: 'thread-1' as const },
      ],
      nodes: [
        { id: 1, kind: 'start' as const, title: 'Start A', thread_id: 1, session_id: 1, position: 0, carried_count: 0 },
        { id: 2, kind: 'beat' as const, title: 'Beat A', thread_id: 1, session_id: null, position: 10, carried_count: 0 },
        { id: 3, kind: 'end' as const, title: 'End A', thread_id: 1, session_id: 4, position: 20, carried_count: 0 },
        { id: 4, kind: 'start' as const, title: 'Start B', thread_id: 2, session_id: 1, position: 0, carried_count: 0 },
        { id: 5, kind: 'end' as const, title: 'End B', thread_id: 2, session_id: 4, position: 10, carried_count: 0 },
      ],
      sessions: [
        { id: 1, ordinal: 1, name: 'Session 1', played_on: null, notes: null },
        { id: 4, ordinal: 4, name: 'Session 4', played_on: null, notes: null },
      ],
    }
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(tapestry)
    vi.spyOn(api, 'moveLoomThreadItem').mockRejectedValue(new Error('Move failed'))
    render(<LoomPage />)
    await waitFor(() => expect(screen.getByText('Thread A')).toBeInTheDocument())

    const dt = {
      getData: () => JSON.stringify({ action: 'reorder', nodeId: 2, fromBodyIndex: 0, sourceThreadId: 1, nodeKind: 'beat' }),
      setData: vi.fn(),
    } as unknown as DataTransfer

    const beatA = screen.getByRole('button', { name: 'beat: Beat A' })
    fireEvent.dragStart(beatA, { dataTransfer: dt })

    const rows = document.querySelectorAll('.loom-grid-row')
    const row2Gaps = rows[1].querySelectorAll('.loom-lane-gap')
    fireEvent.drop(row2Gaps[0], { dataTransfer: dt })

    await waitFor(() => expect(screen.getByText('Move failed')).toBeInTheDocument())
  })

  it('does not render card action buttons on banked beats', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(demoTapestry())
    const user = userEvent.setup()
    render(<LoomPage />)
    await waitFor(() => expect(screen.getAllByText('The Lost Puppy').length).toBeGreaterThan(0))
    await user.click(screen.getByRole('button', { name: /Beat Bank/ }))
    const bankedBeat = screen.getByText('Mysterious hooded stranger')
    expect(bankedBeat).toBeInTheDocument()
    expect(screen.queryAllByRole('button', { name: 'Edit beat' })).toHaveLength(1)
  })

  it('banks a beat dropped from a warp lane onto the Beat Bank section', async () => {
    const tapestry = {
      threads: [{ id: 1, name: 'The Lost Puppy', color: 'thread-3' as const }],
      nodes: [
        { id: 1, kind: 'start' as const, title: 'Start', thread_id: 1, session_id: 1, position: 0, carried_count: 0 },
        { id: 2, kind: 'beat' as const, title: 'Warp Beat', thread_id: 1, session_id: null, position: 10, carried_count: 0 },
        { id: 3, kind: 'end' as const, title: 'End', thread_id: 1, session_id: 4, position: 20, carried_count: 0 },
      ],
      sessions: [
        { id: 1, ordinal: 1, name: 'Session 1', played_on: null, notes: null },
        { id: 4, ordinal: 4, name: 'Session 4', played_on: null, notes: null },
      ],
    }
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(tapestry)
    const bankSpy = vi.spyOn(api, 'bankLoomNode').mockResolvedValue({} as any)
    render(<LoomPage />)
    await waitFor(() => expect(screen.getAllByText('The Lost Puppy').length).toBeGreaterThan(0))

    const dt = {
      getData: () => JSON.stringify({ action: 'reorder', nodeId: 2, fromBodyIndex: 0, sourceThreadId: 1, nodeKind: 'beat' }),
      setData: vi.fn(),
    } as unknown as DataTransfer

    const beatCard = screen.getByRole('button', { name: 'beat: Warp Beat' })
    fireEvent.dragStart(beatCard, { dataTransfer: dt })
    const bankSection = screen.getByText('Beat Bank (0)').closest('section')!
    fireEvent.drop(bankSection, { dataTransfer: dt })

    await waitFor(() => expect(bankSpy).toHaveBeenCalledWith(2))
  })

  it('rejects session drops on the Beat Bank section', async () => {
    const tapestry = {
      threads: [{ id: 1, name: 'The Lost Puppy', color: 'thread-3' as const }],
      nodes: [
        { id: 1, kind: 'start' as const, title: 'Start', thread_id: 1, session_id: 1, position: 0, carried_count: 0 },
        { id: 2, kind: 'session' as const, title: 'A Session', thread_id: 1, session_id: 2, position: 10, carried_count: 0 },
        { id: 3, kind: 'end' as const, title: 'End', thread_id: 1, session_id: 4, position: 20, carried_count: 0 },
      ],
      sessions: [
        { id: 1, ordinal: 1, name: 'Session 1', played_on: null, notes: null },
        { id: 2, ordinal: 2, name: 'Session 2', played_on: null, notes: null },
        { id: 4, ordinal: 4, name: 'Session 4', played_on: null, notes: null },
      ],
    }
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(tapestry)
    const bankSpy = vi.spyOn(api, 'bankLoomNode').mockResolvedValue({} as any)
    render(<LoomPage />)
    await waitFor(() => expect(screen.getAllByText('The Lost Puppy').length).toBeGreaterThan(0))

    const dt = {
      getData: () => JSON.stringify({ action: 'reorder', nodeId: 2, fromBodyIndex: 0, sourceThreadId: 1, nodeKind: 'session' }),
      setData: vi.fn(),
    } as unknown as DataTransfer

    const bankSection = screen.getByText('Beat Bank (0)').closest('section')!
    fireEvent.drop(bankSection, { dataTransfer: dt })
    await waitFor(() => expect(bankSpy).not.toHaveBeenCalled())
  })

  it('shows banner error when bank-by-drop fails', async () => {
    const tapestry = {
      threads: [{ id: 1, name: 'The Lost Puppy', color: 'thread-3' as const }],
      nodes: [
        { id: 1, kind: 'start' as const, title: 'Start', thread_id: 1, session_id: 1, position: 0, carried_count: 0 },
        { id: 2, kind: 'beat' as const, title: 'Warp Beat', thread_id: 1, session_id: null, position: 10, carried_count: 0 },
        { id: 3, kind: 'end' as const, title: 'End', thread_id: 1, session_id: 4, position: 20, carried_count: 0 },
      ],
      sessions: [
        { id: 1, ordinal: 1, name: 'Session 1', played_on: null, notes: null },
        { id: 4, ordinal: 4, name: 'Session 4', played_on: null, notes: null },
      ],
    }
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(tapestry)
    vi.spyOn(api, 'bankLoomNode').mockRejectedValue(new Error('Cannot bank now'))
    render(<LoomPage />)
    await waitFor(() => expect(screen.getAllByText('The Lost Puppy').length).toBeGreaterThan(0))

    const dt = {
      getData: () => JSON.stringify({ action: 'reorder', nodeId: 2, fromBodyIndex: 0, sourceThreadId: 1, nodeKind: 'beat' }),
      setData: vi.fn(),
    } as unknown as DataTransfer

    const beatCard = screen.getByRole('button', { name: 'beat: Warp Beat' })
    fireEvent.dragStart(beatCard, { dataTransfer: dt })
    const bankSection = screen.getByText('Beat Bank (0)').closest('section')!
    fireEvent.drop(bankSection, { dataTransfer: dt })

    await waitFor(() => expect(screen.getByText('Cannot bank now')).toBeInTheDocument())
  })

  it('restores a banked beat dropped onto a warp gap', async () => {
    const tapestry = {
      threads: [{ id: 1, name: 'The Lost Puppy', color: 'thread-3' as const }],
      nodes: [
        { id: 1, kind: 'start' as const, title: 'Start', thread_id: 1, session_id: 1, position: 0, carried_count: 0 },
        { id: 2, kind: 'beat' as const, title: 'Warp Beat', thread_id: 1, session_id: null, position: 10, carried_count: 0 },
        { id: 3, kind: 'end' as const, title: 'End', thread_id: 1, session_id: 4, position: 20, carried_count: 0 },
        { id: 9, kind: 'beat' as const, title: 'Banked Beat', thread_id: null, position: 0, carried_count: 0 },
      ],
      sessions: [
        { id: 1, ordinal: 1, name: 'Session 1', played_on: null, notes: null },
        { id: 4, ordinal: 4, name: 'Session 4', played_on: null, notes: null },
      ],
    }
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(tapestry)
    const insertSpy = vi.spyOn(api, 'insertLoomThreadItem').mockResolvedValue({} as any)
    render(<LoomPage />)
    await waitFor(() => expect(screen.getAllByText('The Lost Puppy').length).toBeGreaterThan(0))

    const dt = {
      getData: () => JSON.stringify({ action: 'restore', nodeId: 9 }),
      setData: vi.fn(),
    } as unknown as DataTransfer

    const gap = screen.getByRole('button', { name: /Insert at position 10/ })
    fireEvent.drop(gap, { dataTransfer: dt })

    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalledWith(1, { node_id: 9, position: 10 })
    })
  })

  it('shows banner error when restore-by-gap fails', async () => {
    const tapestry = {
      threads: [{ id: 1, name: 'The Lost Puppy', color: 'thread-3' as const }],
      nodes: [
        { id: 1, kind: 'start' as const, title: 'Start', thread_id: 1, session_id: 1, position: 0, carried_count: 0 },
        { id: 2, kind: 'beat' as const, title: 'Warp Beat', thread_id: 1, session_id: null, position: 10, carried_count: 0 },
        { id: 3, kind: 'end' as const, title: 'End', thread_id: 1, session_id: 4, position: 20, carried_count: 0 },
        { id: 9, kind: 'beat' as const, title: 'Banked Beat', thread_id: null, position: 0, carried_count: 0 },
      ],
      sessions: [
        { id: 1, ordinal: 1, name: 'Session 1', played_on: null, notes: null },
        { id: 4, ordinal: 4, name: 'Session 4', played_on: null, notes: null },
      ],
    }
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(tapestry)
    vi.spyOn(api, 'insertLoomThreadItem').mockRejectedValue(new Error('Server rejected'))
    render(<LoomPage />)
    await waitFor(() => expect(screen.getAllByText('The Lost Puppy').length).toBeGreaterThan(0))

    const dt = {
      getData: () => JSON.stringify({ action: 'restore', nodeId: 9 }),
      setData: vi.fn(),
    } as unknown as DataTransfer

    const gap = screen.getByRole('button', { name: /Insert at position 10/ })
    fireEvent.drop(gap, { dataTransfer: dt })

    await waitFor(() => expect(screen.getByText('Server rejected')).toBeInTheDocument())
  })

  it('shows a guard message and does not enter placement mode when no threads exist', async () => {
    const noThreadTapestry: LoomTapestry = {
      threads: [],
      nodes: [
        { id: 9, kind: 'beat', title: 'Mysterious hooded stranger', thread_id: null, position: 0, carried_count: 0 },
      ],
      sessions: [],
    }
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(noThreadTapestry)
    const user = userEvent.setup()
    render(<LoomPage />)
    await waitFor(() => expect(screen.getByText('Beat Bank (1)')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Beat Bank/ }))
    await user.click(screen.getByText('Mysterious hooded stranger'))

    expect(screen.getByText('Create a thread before placing this beat.')).toBeInTheDocument()
    expect(document.querySelectorAll('.loom-lane-gap--drag-over')).toHaveLength(0)

    const guard = document.querySelector('.loom-beat-bank-tray-guard') as HTMLElement
    await user.click(within(guard).getByRole('button', { name: 'Manage Threads' }))
    expect(screen.getByRole('dialog', { name: 'Manage Threads' })).toBeInTheDocument()
  })

  it('activates placement mode and restores the banked beat when a highlighted gap is clicked', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(demoTapestry())
    const insertSpy = vi.spyOn(api, 'insertLoomThreadItem').mockResolvedValue({} as any)
    const user = userEvent.setup()
    render(<LoomPage />)
    await waitFor(() => expect(screen.getAllByText('The Lost Puppy').length).toBeGreaterThan(0))

    await user.click(screen.getByRole('button', { name: /Beat Bank/ }))
    await user.click(screen.getByText('Mysterious hooded stranger'))

    const gaps = document.querySelectorAll('.loom-lane-gap')
    expect(gaps.length).toBeGreaterThan(0)
    gaps.forEach((gap) => expect(gap).toHaveClass('loom-lane-gap--drag-over'))

    await user.click(gaps[0])

    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalledWith(1, { node_id: 9, position: expect.any(Number) })
    })
    expect(document.querySelectorAll('.loom-lane-gap--drag-over')).toHaveLength(0)
  })

  it('cancels placement mode on Escape without restoring the beat', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(demoTapestry())
    const insertSpy = vi.spyOn(api, 'insertLoomThreadItem').mockResolvedValue({} as any)
    const user = userEvent.setup()
    render(<LoomPage />)
    await waitFor(() => expect(screen.getAllByText('The Lost Puppy').length).toBeGreaterThan(0))

    await user.click(screen.getByRole('button', { name: /Beat Bank/ }))
    await user.click(screen.getByText('Mysterious hooded stranger'))

    expect(document.querySelectorAll('.loom-lane-gap--drag-over').length).toBeGreaterThan(0)

    await user.keyboard('{Escape}')

    expect(document.querySelectorAll('.loom-lane-gap--drag-over')).toHaveLength(0)
    expect(insertSpy).not.toHaveBeenCalled()

    const gaps = document.querySelectorAll('.loom-lane-gap')
    await user.click(gaps[0])
    expect(screen.getByRole('dialog', { name: /Add New Beat/ })).toBeInTheDocument()
    expect(insertSpy).not.toHaveBeenCalled()
  })
})

describe('LoomPage — Jump to current control', () => {
  it('exposes the divider visibility callback prop on LoomSwimlanes', async () => {
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(demoTapestry())
    const { container } = render(<LoomPage />)
    await waitFor(() => expect(screen.getAllByText('The Lost Puppy').length).toBeGreaterThan(0))

    const swimlanes = container.querySelector('.loom-grid')
    expect(swimlanes).toBeInTheDocument()
  })
})

describe('LoomPage — not_reached and banked outcome selection', () => {
  it('supports not_reached and banked outcome selection', async () => {
    const multiThreadTapestry = {
      threads: [
        { id: 1, name: 'Thread A', color: 'thread-1' as const },
        { id: 2, name: 'Thread B', color: 'thread-2' as const },
        { id: 3, name: 'Thread C', color: 'thread-3' as const },
      ],
      nodes: [
        { id: 1, kind: 'start' as const, title: 'Start A', thread_id: 1, session_id: null, position: 0, carried_count: 0 },
        { id: 2, kind: 'beat' as const, title: 'Beat A', thread_id: 1, position: 10, carried_count: 0 },
        { id: 3, kind: 'end' as const, title: 'End A', thread_id: 1, position: 20, carried_count: 0 },
        { id: 4, kind: 'start' as const, title: 'Start B', thread_id: 2, session_id: null, position: 0, carried_count: 0 },
        { id: 5, kind: 'beat' as const, title: 'Beat B', thread_id: 2, position: 10, carried_count: 0 },
        { id: 6, kind: 'end' as const, title: 'End B', thread_id: 2, position: 20, carried_count: 0 },
        { id: 7, kind: 'start' as const, title: 'Start C', thread_id: 3, session_id: null, position: 0, carried_count: 0 },
        { id: 8, kind: 'beat' as const, title: 'Beat C', thread_id: 3, position: 10, carried_count: 0 },
        { id: 9, kind: 'end' as const, title: 'End C', thread_id: 3, position: 20, carried_count: 0 },
      ],
      sessions: [{ id: 1, ordinal: 1, name: 'Session 1', played_on: null, notes: null }],
    }
    vi.spyOn(api, 'getLoomTapestry').mockResolvedValue(multiThreadTapestry)
    const logSpy = vi.spyOn(api, 'logLoomSession').mockResolvedValue(
      { id: 2, ordinal: 2, name: 'Session 2', played_on: null, notes: null },
    )
    const user = userEvent.setup()
    render(<LoomPage />)
    await waitFor(() => expect(screen.getByText('Thread A')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Advance Campaign' }))

    const outcomeSelects = screen.getAllByRole('combobox', { name: 'Outcome' })
    expect(outcomeSelects).toHaveLength(3)

    await user.selectOptions(outcomeSelects[0], 'happened')
    await user.selectOptions(outcomeSelects[1], 'not_reached')
    await user.selectOptions(outcomeSelects[2], 'banked')

    await user.type(screen.getByLabelText('Session Name'), 'Session 2')
    await user.click(screen.getByRole('button', { name: 'Save Session' }))

    await waitFor(() => {
      expect(logSpy).toHaveBeenCalledWith(expect.objectContaining({
        outcomes: {
          1: { outcome: 'happened' },
          2: { outcome: 'not_reached' },
          3: { outcome: 'banked' },
        },
      }))
    })
  })
})
