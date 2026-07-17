import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ReactFlowProvider, type NodeProps } from '@xyflow/react'
import type { LoomNode, LoomThread } from '../../../api/types'
import { AnchorNode, type AnchorFlowNode } from '../nodes/AnchorNode'
import { LoomThreadsContext } from '../nodes/loomThreadsContext'

const threads: LoomThread[] = [
  { id: 1, name: 'The Lost Puppy', color: 'thread-3' },
  { id: 2, name: 'Goblin Trouble', color: 'thread-1' },
]

function makeProps(node: LoomNode, isHead: boolean, isNextAnchor: boolean): NodeProps<AnchorFlowNode> {
  return {
    id: String(node.id),
    type: 'anchor',
    data: { node, isHead, isNextAnchor },
    selected: false,
    dragging: false,
    zIndex: 0,
    isConnectable: true,
    positionAbsoluteX: node.x,
    positionAbsoluteY: node.y,
  } as unknown as NodeProps<AnchorFlowNode>
}

function renderAnchor(node: LoomNode, isHead = false, isNextAnchor = false) {
  return render(
    <ReactFlowProvider>
      <LoomThreadsContext.Provider value={threads}>
        <AnchorNode {...makeProps(node, isHead, isNextAnchor)} />
      </LoomThreadsContext.Provider>
    </ReactFlowProvider>,
  )
}

describe('AnchorNode', () => {
  it('renders a planned anchor with the Next badge and thread chips', () => {
    const node: LoomNode = { id: 4, kind: 'anchor', title: 'Confront the goblin chief', status: 'planned', x: 0, y: 0, thread_ids: [1, 2] }
    renderAnchor(node, false, true)
    expect(screen.getByText('Confront the goblin chief')).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
    expect(document.querySelectorAll('.loom-thread-chip')).toHaveLength(2)
  })

  it('renders a reached anchor as a head with the Now badge', () => {
    const node: LoomNode = { id: 5, kind: 'anchor', title: 'Puppy reunion festival', status: 'reached', x: 0, y: 0, thread_ids: [1] }
    const { container } = renderAnchor(node, true, false)
    expect(screen.getByText('Now')).toBeInTheDocument()
    expect(container.querySelector('.loom-node--anchor')).toHaveAttribute('data-status', 'reached')
  })

  it('renders an abandoned anchor with the abandoned status', () => {
    const node: LoomNode = { id: 6, kind: 'anchor', title: 'Secret tunnel discovered', status: 'abandoned', x: 0, y: 0, thread_ids: [] }
    const { container } = renderAnchor(node)
    expect(container.querySelector('.loom-node--anchor')).toHaveAttribute('data-status', 'abandoned')
    expect(screen.queryByText('Now')).not.toBeInTheDocument()
    expect(screen.queryByText('Next')).not.toBeInTheDocument()
  })
})
