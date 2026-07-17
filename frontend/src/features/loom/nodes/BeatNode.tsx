import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import type { FlowNodeData } from '../loomFlow'
import { CompassHandles } from './CompassHandles'
import { ThreadChips } from './ThreadChips'
import { useLoomThreads } from './loomThreadsContext'

export type BeatFlowNode = Node<FlowNodeData, 'beat'>

function BeatNodeImpl({ data }: NodeProps<BeatFlowNode>) {
  const { node, isHead, isCurrent } = data
  const threads = useLoomThreads()
  const primaryThread = threads.find((thread) => thread.id === node.thread_ids[0]) ?? null

  return (
    <div className="loom-node loom-node--beat" data-head={isHead || undefined} data-current={isCurrent || undefined}>
      {primaryThread && <span className="loom-node-spine" data-color={primaryThread.color} aria-hidden="true" />}
      <CompassHandles />
      {isHead && <span className="loom-node-badge loom-node-badge--now">Now</span>}
      {isCurrent && <span className="loom-node-badge loom-node-badge--next">Next</span>}
      <div className="loom-node-title">{node.title}</div>
      {node.session_tag && <div className="loom-node-session">{node.session_tag}</div>}
      <ThreadChips threadIds={node.thread_ids} />
    </div>
  )
}

export const BeatNode = memo(BeatNodeImpl)
