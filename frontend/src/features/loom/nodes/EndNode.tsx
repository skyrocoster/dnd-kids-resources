import { memo } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import type { FlowNodeData } from '../loomFlow'
import { ThreadChips } from './ThreadChips'
import { useLoomThreads } from './loomThreadsContext'

export type EndFlowNode = Node<FlowNodeData, 'end'>

function EndNodeImpl({ data }: NodeProps<EndFlowNode>) {
  const { node, isHead } = data
  const threads = useLoomThreads()
  const primaryThread = threads.find((thread) => thread.id === node.thread_ids[0]) ?? null

  return (
    <div className="loom-node loom-node--end" data-head={isHead || undefined}>
      {primaryThread && <span className="loom-node-spine" data-color={primaryThread.color} aria-hidden="true" />}
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      {isHead && <span className="loom-node-badge loom-node-badge--now">Now</span>}
      <div className="loom-node-title">{node.title}</div>
      <ThreadChips threadIds={node.thread_ids} />
    </div>
  )
}

export const EndNode = memo(EndNodeImpl)
