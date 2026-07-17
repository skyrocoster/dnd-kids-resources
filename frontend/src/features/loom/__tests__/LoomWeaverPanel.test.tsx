import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import type { LoomNode, LoomEdge, LoomThread } from '../../../api/types'
import { LoomWeaverPanel } from '../LoomWeaverPanel'

const threads: LoomThread[] = [{ id: 1, name: 'The Lost Puppy', color: 'thread-3' }]

const plannedAnchor: LoomNode = {
  id: 4,
  kind: 'anchor',
  title: 'Confront the goblin chief',
  status: 'planned',
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
  vaultNodes: [],
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
  onCancelBridge: noop,
}

describe('LoomWeaverPanel', () => {
  it.skip('renders a selected node\'s title, kind, and status', () => {
    // LU2 — Weaver's panel: un-skip when the panel renders selection details
    render(<LoomWeaverPanel {...baseProps} selectedNode={plannedAnchor} />)
    expect(screen.getByText('Confront the goblin chief')).toBeInTheDocument()
    expect(screen.getByText(/Anchor/)).toBeInTheDocument()
    expect(screen.getByText(/planned/)).toBeInTheDocument()
  })

  it.skip('renders the legend when selection is null', () => {
    // LU2 — Weaver's panel: un-skip when the panel renders the legend as the default section
    render(<LoomWeaverPanel {...baseProps} selectedNode={null} />)
    expect(screen.getByText(/Woven/)).toBeInTheDocument()
    expect(screen.getByText(/Beacon/)).toBeInTheDocument()
  })

  it.skip('shows contextual actions for a planned anchor', () => {
    // LU2 — Weaver's panel: un-skip when the panel renders action buttons
    render(<LoomWeaverPanel {...baseProps} selectedNode={plannedAnchor} />)
    expect(screen.getByRole('button', { name: 'Mark Reached' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mark Abandoned' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it.skip('shows the edge action for an edge selection', () => {
    // LU2 — Weaver's panel: un-skip when the panel renders edge details + Delete Edge
    render(<LoomWeaverPanel {...baseProps} selectedNode={null} selectedEdge={edge} />)
    expect(screen.getByText(/Edge selected/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete Edge' })).toBeInTheDocument()
  })

  it.skip('shows a bridge-in-progress hint when bridgeSource is set', () => {
    // LU2 — Weaver's panel: un-skip when the panel renders the bridge hint
    render(<LoomWeaverPanel {...baseProps} selectedNode={null} bridgeSource={updateNode} />)
    expect(screen.getByText(/Bridging from/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })
})
