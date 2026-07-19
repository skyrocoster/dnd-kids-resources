import type { LoomNode, LoomTapestryThread } from '../../api/types'
import { threadOrdered, currentPosition, threadHead, nextBeat } from './loomGraph'
import { LoomNodeCard } from './LoomNodeCard'

interface LoomLaneProps {
  thread: LoomTapestryThread
  nodes: LoomNode[]
  selectedNodeId?: number | null
  onSelectNode?: (nodeId: number) => void
  onRegisterRect?: (nodeId: number, threadId: number, el: HTMLElement | null) => void
}

export function LoomLane({ thread, nodes, selectedNodeId, onSelectNode, onRegisterRect }: LoomLaneProps) {
  const ordered = threadOrdered(thread, nodes)
  const current = currentPosition(thread, nodes)
  const head = threadHead(thread, nodes)
  const next = nextBeat(thread, nodes)

  const currentNodeId = current?.nodeId ?? null
  const nextBeatId = next?.id ?? null

  const startNode = ordered.find((n) => n.kind === 'start')
  const endNode = ordered.slice().reverse().find((n) => n.kind === 'end')
  const bodyNodes = ordered.filter((n) => n.kind !== 'start' && n.kind !== 'end')

  return (
    <article className="loom-lane" aria-labelledby={`loom-lane-title-${thread.id}`}>
      <header className="loom-lane-header">
        <span className="loom-weaver-thread-swatch" data-color={thread.color} aria-hidden="true" />
        <div>
          <h2 className="loom-lane-title" id={`loom-lane-title-${thread.id}`}>{thread.name}</h2>
          {thread.description && <p className="loom-lane-description">{thread.description}</p>}
        </div>
      </header>
      <div className="loom-lane-row">
      {startNode && (
        <div className="loom-lane-cap loom-lane-cap--start">
          <LoomNodeCard
            node={startNode}
            isNow={head?.id === startNode.id || currentNodeId === startNode.id}
            isNext={nextBeatId === startNode.id}
            threadColor={thread.color}
            selected={selectedNodeId === startNode.id}
            onClick={onSelectNode}
            onRegisterRect={onRegisterRect}
            threadId={thread.id}
          />
        </div>
      )}
      <div className="loom-lane-track">
        {bodyNodes.map((node) => (
          <LoomNodeCard
            key={node.id}
            node={node}
            isNow={head?.id === node.id || currentNodeId === node.id}
            isNext={nextBeatId === node.id}
            threadColor={thread.color}
            selected={selectedNodeId === node.id}
            onClick={onSelectNode}
            onRegisterRect={onRegisterRect}
            threadId={thread.id}
          />
        ))}
      </div>
      {endNode && (
        <div className="loom-lane-cap loom-lane-cap--end">
          <LoomNodeCard
            node={endNode}
            isNow={head?.id === endNode.id || currentNodeId === endNode.id}
            isNext={nextBeatId === endNode.id}
            threadColor={thread.color}
            selected={selectedNodeId === endNode.id}
            onClick={onSelectNode}
            onRegisterRect={onRegisterRect}
            threadId={thread.id}
          />
        </div>
      )}
      </div>
    </article>
  )
}
