import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import type { FlowNodeData } from '../loomFlow'
import { CompassHandles } from './CompassHandles'
import { ThreadChips } from './ThreadChips'
import { useLoomThreads } from './loomThreadsContext'

export type SessionFlowNode = Node<FlowNodeData, 'session'>

function SessionNodeImpl({ data }: NodeProps<SessionFlowNode>) {
  const { node, isHead } = data
  const threads = useLoomThreads()
  const primaryThread = threads.find((thread) => thread.id === node.thread_ids[0]) ?? null

  return (
    <div className="loom-node loom-node--session" data-head={isHead || undefined}>
      {primaryThread && <span className="loom-node-spine" data-color={primaryThread.color} aria-hidden="true" />}
      <CompassHandles />
      {isHead && <span className="loom-node-badge loom-node-badge--now">Now</span>}
      <div className="loom-node-title">{node.title}</div>
      {node.session_tag && <div className="loom-node-session">{node.session_tag}</div>}
      <ThreadChips threadIds={node.thread_ids} />
    </div>
  )
}

export const SessionNode = memo(SessionNodeImpl)
