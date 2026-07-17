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

function makeProps(node: LoomNode, isHead: boolean): NodeProps<AnchorFlowNode> {
  return {
    id: String(node.id),
    type: node.kind === 'end' ? 'end' : 'start',
    data: { node, isHead, isCurrent: false, isBanked: false },
    selected: false,
    dragging: false,
    zIndex: 0,
    isConnectable: true,
    positionAbsoluteX: node.x,
    positionAbsoluteY: node.y,
  } as unknown as NodeProps<AnchorFlowNode>
}

function renderAnchor(node: LoomNode, isHead = false) {
  return render(
    <ReactFlowProvider>
      <LoomThreadsContext.Provider value={threads}>
        <AnchorNode {...makeProps(node, isHead)} />
      </LoomThreadsContext.Provider>
    </ReactFlowProvider>,
  )
}

describe('AnchorNode (legacy compat)', () => {
  it('renders a start node with the Now badge and thread chips', () => {
    const node: LoomNode = { id: 1, kind: 'start', title: 'The Lost Puppy', x: 0, y: 0, thread_ids: [1, 2] }
    const { container } = renderAnchor(node, true)
    expect(screen.getByText('The Lost Puppy')).toBeInTheDocument()
    expect(screen.getByText('Now')).toBeInTheDocument()
    expect(document.querySelectorAll('.loom-thread-chip')).toHaveLength(2)
    expect(container.querySelector('.loom-node-spine')).toHaveAttribute('data-color', 'thread-3')
  })

  it('renders a start node without the Now badge when not head', () => {
    const node: LoomNode = { id: 1, kind: 'start', title: 'The Lost Puppy', x: 0, y: 0, thread_ids: [1] }
    renderAnchor(node, false)
    expect(screen.queryByText('Now')).not.toBeInTheDocument()
  })
})
