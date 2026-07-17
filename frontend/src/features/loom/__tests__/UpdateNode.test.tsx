import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ReactFlowProvider, type NodeProps } from '@xyflow/react'
import type { LoomNode, LoomThread } from '../../../api/types'
import { UpdateNode, type UpdateFlowNode } from '../nodes/UpdateNode'
import { LoomThreadsContext } from '../nodes/loomThreadsContext'

const threads: LoomThread[] = [{ id: 1, name: 'The Lost Puppy', color: 'thread-3' }]

function makeProps(node: LoomNode, isHead: boolean): NodeProps<UpdateFlowNode> {
  return {
    id: String(node.id),
    type: 'update',
    data: { node, isHead, isNextAnchor: false },
    selected: false,
    dragging: false,
    zIndex: 0,
    isConnectable: true,
    positionAbsoluteX: node.x,
    positionAbsoluteY: node.y,
  } as unknown as NodeProps<UpdateFlowNode>
}

describe('UpdateNode', () => {
  it('renders title, session tag, and thread chips', () => {
    const node: LoomNode = {
      id: 3,
      kind: 'update',
      title: 'Tracks lead to the goblin cave',
      session_tag: 'Session 4',
      x: 0,
      y: 0,
      thread_ids: [1],
    }
    const { container } = render(
      <ReactFlowProvider>
        <LoomThreadsContext.Provider value={threads}>
          <UpdateNode {...makeProps(node, true)} />
        </LoomThreadsContext.Provider>
      </ReactFlowProvider>,
    )
    expect(screen.getByText('Tracks lead to the goblin cave')).toBeInTheDocument()
    expect(screen.getByText('Session 4')).toBeInTheDocument()
    expect(screen.getByText('Now')).toBeInTheDocument()
    expect(document.querySelectorAll('.loom-thread-chip')).toHaveLength(1)
    expect(container.querySelector('.loom-node-spine')).toHaveAttribute('data-color', 'thread-3')
  })

  it('renders a vault node (no thread membership) without chips or badges', () => {
    const node: LoomNode = { id: 7, kind: 'update', title: 'Mysterious hooded stranger', x: 0, y: 0, thread_ids: [] }
    render(
      <ReactFlowProvider>
        <LoomThreadsContext.Provider value={threads}>
          <UpdateNode {...makeProps(node, false)} />
        </LoomThreadsContext.Provider>
      </ReactFlowProvider>,
    )
    expect(screen.queryByText('Now')).not.toBeInTheDocument()
    expect(document.querySelectorAll('.loom-thread-chip')).toHaveLength(0)
  })
})
