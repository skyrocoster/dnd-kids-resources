import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import type { LoomNode, LoomThread } from '../../../api/types'
import { LoomWeaverPanel } from '../LoomWeaverPanel'

const threads: LoomThread[] = [{ id: 1, name: 'The Lost Puppy', color: 'thread-3' }]

const beatNode: LoomNode = {
  id: 4,
  kind: 'beat',
  title: 'Confront the goblin chief',
  body: 'The goblin chief knows where the puppy ended up.',
  session_tag: 'Session 12',
  x: 400,
  y: 75,
  thread_ids: [1],
}

const sessionNode: LoomNode = {
  id: 1,
  kind: 'session',
  title: 'Puppy goes missing in the village',
  x: 0,
  y: 0,
  thread_ids: [1],
}

const noop = () => {}

const baseProps = {
  threads,
  threadCounts: { 1: 2 },
  bankedNodes: [],
  focusedThreadId: null,
  onEdit: noop,
  onDeleteNode: noop,
  onSelectBankedNode: noop,
  onOpenThreadManager: noop,
  onFocusThread: noop,
  onClearThreadFocus: noop,
}

describe('LoomWeaverPanel', () => {
  it('renders a selected beat node\'s title and kind', () => {
    render(<LoomWeaverPanel {...baseProps} selectedNode={beatNode} />)
    expect(screen.getByText('Confront the goblin chief')).toBeInTheDocument()
    expect(screen.getByText('Story Beat')).toBeInTheDocument()
    expect(screen.getByText('Session 12')).toBeInTheDocument()
    expect(screen.getByText('The goblin chief knows where the puppy ended up.')).toBeInTheDocument()
    expect(screen.getAllByText('The Lost Puppy')).toHaveLength(2)
  })

  it('renders a selected session node\'s kind', () => {
    render(<LoomWeaverPanel {...baseProps} selectedNode={sessionNode} />)
    expect(screen.getByText('Puppy goes missing in the village')).toBeInTheDocument()
    expect(screen.getAllByText('Session').length).toBeGreaterThanOrEqual(2)
  })

  it('renders the legend when selection is null', () => {
    render(<LoomWeaverPanel {...baseProps} selectedNode={null} />)
    expect(screen.getByText('Story beat')).toBeInTheDocument()
    expect(screen.getByText('Recorded session')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /The Lost Puppy/i })).toHaveTextContent('2 nodes')
  })

  it('shows edit/delete actions for a beat node', () => {
    render(<LoomWeaverPanel {...baseProps} selectedNode={beatNode} />)
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('hides edit/delete for start/end nodes', () => {
    const startNode: LoomNode = { id: 1, kind: 'start', title: 'The Lost Puppy', x: 0, y: 0, thread_ids: [1] }
    render(<LoomWeaverPanel {...baseProps} selectedNode={startNode} />)
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('calls the vault callback when a banked node is clicked', async () => {
    const user = userEvent.setup()
    const onSelectBankedNode = vi.fn()

    render(
      <LoomWeaverPanel
        {...baseProps}
        selectedNode={null}
        bankedNodes={[{ id: 9, kind: 'beat', title: 'Mysterious hooded stranger', x: 1, y: 2, thread_ids: [] }]}
        onSelectBankedNode={onSelectBankedNode}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Mysterious hooded stranger' }))
    expect(onSelectBankedNode).toHaveBeenCalledWith({
      id: 9,
      kind: 'beat',
      title: 'Mysterious hooded stranger',
      x: 1,
      y: 2,
      thread_ids: [],
    })
  })

  it('focuses a thread and exposes a clear-focus action', async () => {
    const user = userEvent.setup()
    const onFocusThread = vi.fn()
    const onClearThreadFocus = vi.fn()

    render(
      <LoomWeaverPanel
        {...baseProps}
        selectedNode={null}
        focusedThreadId={1}
        onFocusThread={onFocusThread}
        onClearThreadFocus={onClearThreadFocus}
      />,
    )

    await user.click(screen.getByRole('button', { name: /The Lost Puppy/i }))
    expect(onFocusThread).toHaveBeenCalledWith(1)
    await user.click(screen.getByRole('button', { name: 'Clear focus' }))
    expect(onClearThreadFocus).toHaveBeenCalled()
  })
})
