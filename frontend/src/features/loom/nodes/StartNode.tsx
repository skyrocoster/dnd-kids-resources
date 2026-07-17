import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import type { FlowNodeData } from '../loomFlow'
import { CompassHandles } from './CompassHandles'
import { ThreadChips } from './ThreadChips'
import { useLoomThreads } from './loomThreadsContext'

export type StartFlowNode = Node<FlowNodeData, 'start'>

function StartNodeImpl({ data }: NodeProps<StartFlowNode>) {
  const { node, isHead } = data
  const threads = useLoomThreads()
  const primaryThread = threads.find((thread) => thread.id === node.thread_ids[0]) ?? null

  return (
    <div className="loom-node loom-node--start" data-head={isHead || undefined}>
      {primaryThread && <span className="loom-node-spine" data-color={primaryThread.color} aria-hidden="true" />}
      <CompassHandles />
      {isHead && <span className="loom-node-badge loom-node-badge--now">Now</span>}
      <div className="loom-node-title">{node.title}</div>
      <ThreadChips threadIds={node.thread_ids} />
    </div>
  )
}

export const StartNode = memo(StartNodeImpl)
