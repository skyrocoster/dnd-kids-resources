import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import type { LoomNode, LoomEdge, LoomThread } from '../../../api/types'
import { LoomWeaverPanel } from '../LoomWeaverPanel'

const threads: LoomThread[] = [{ id: 1, name: 'The Lost Puppy', color: 'thread-3' }]

const plannedAnchor: LoomNode = {
  id: 4,
  kind: 'anchor',
  title: 'Confront the goblin chief',
  body: 'The goblin chief knows where the puppy ended up.',
  status: 'planned',
  session_tag: 'Session 12',
  x: 400,
  y: 75,
  thread_ids: [1],
}

const updateNode: LoomNode = {
  id: 1,
  kind: 'update',
  title: 'Puppy goes missing in the village',
  x: 0,
  y: 0,
  thread_ids: [1],
}

const edge: LoomEdge = { id: 1, source_id: 1, target_id: 4 }

const noop = () => {}

const baseProps = {
  selectedEdge: null,
  threads,
  threadCounts: { 1: 2 },
  vaultNodes: [],
  focusedThreadId: null,
  canBridgeFromSelected: false,
  bridgeSource: null,
  onBridge: noop,
  onMarkReached: noop,
  onMarkAbandoned: noop,
  onEdit: noop,
  onDeleteNode: noop,
  onDeleteEdge: noop,
  onSelectVaultNode: noop,
  onOpenThreadManager: noop,
  onFocusThread: noop,
  onClearThreadFocus: noop,
  onCancelBridge: noop,
}

describe('LoomWeaverPanel', () => {
  it('renders a selected node\'s title, kind, and status', () => {
    render(<LoomWeaverPanel {...baseProps} selectedNode={plannedAnchor} />)
    expect(screen.getByText('Confront the goblin chief')).toBeInTheDocument()
    expect(screen.getByText('Anchor')).toBeInTheDocument()
    expect(screen.getByText('Planned')).toBeInTheDocument()
    expect(screen.getByText('Session 12')).toBeInTheDocument()
    expect(screen.getByText('The goblin chief knows where the puppy ended up.')).toBeInTheDocument()
    expect(screen.getAllByText('The Lost Puppy')).toHaveLength(2)
  })

  it('renders the legend when selection is null', () => {
    render(<LoomWeaverPanel {...baseProps} selectedNode={null} />)
    expect(screen.getByText('Woven update')).toBeInTheDocument()
    expect(screen.getByText('Beacon anchor')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /The Lost Puppy/i })).toHaveTextContent('2 nodes')
  })

  it('shows contextual actions for a planned anchor', () => {
    render(<LoomWeaverPanel {...baseProps} selectedNode={plannedAnchor} />)
    expect(screen.getByRole('button', { name: 'Mark Reached' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mark Abandoned' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('shows the edge action for an edge selection', () => {
    render(<LoomWeaverPanel {...baseProps} selectedNode={null} selectedEdge={edge} />)
    expect(screen.getByText(/Edge selected/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete Edge' })).toBeInTheDocument()
  })

  it('shows a bridge-in-progress hint when bridgeSource is set', () => {
    render(<LoomWeaverPanel {...baseProps} selectedNode={null} bridgeSource={updateNode} />)
    expect(screen.getByText(/Bridging from/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('calls the vault callback when a vault node is clicked', async () => {
    const user = userEvent.setup()
    const onSelectVaultNode = vi.fn()

    render(
      <LoomWeaverPanel
        {...baseProps}
        selectedNode={null}
        vaultNodes={[{ id: 7, kind: 'update', title: 'Mysterious hooded stranger', x: 1, y: 2, thread_ids: [] }]}
        onSelectVaultNode={onSelectVaultNode}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Mysterious hooded stranger' }))
    expect(onSelectVaultNode).toHaveBeenCalledWith({
      id: 7,
      kind: 'update',
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
