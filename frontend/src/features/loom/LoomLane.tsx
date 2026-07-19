import { useCallback, useState } from 'react'
import type { LoomNode, LoomTapestryThread } from '../../api/types'
import { threadOrdered, currentPosition, threadHead, nextBeat } from './loomGraph'
import { LoomNodeCard } from './LoomNodeCard'

interface LoomLaneProps {
  thread: LoomTapestryThread
  nodes: LoomNode[]
  selectedNodeId?: number | null
  onSelectNode?: (nodeId: number) => void
  onRegisterRect?: (nodeId: number, threadId: number, el: HTMLElement | null) => void
  onGapClick?: (threadId: number, position: number) => void
  onReorder?: (threadId: number, nodeId: number, fromBodyIndex: number, toBodyIndex: number) => void
  onGapRestore?: (nodeId: number, threadId: number, position: number) => void
}

function Gap({
  threadId,
  position,
  index,
  onGapClick,
  onReorder,
  onGapRestore,
}: {
  threadId: number
  position: number
  index: number
  onGapClick?: (threadId: number, position: number) => void
  onReorder?: (threadId: number, nodeId: number, fromBodyIndex: number, toBodyIndex: number) => void
  onGapRestore?: (nodeId: number, threadId: number, position: number) => void
}) {
  const [dragOver, setDragOver] = useState(false)

  const handleClick = useCallback(() => {
    onGapClick?.(threadId, position)
  }, [onGapClick, threadId, position])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(true)
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const raw = e.dataTransfer.getData('application/json')
      if (!raw) return
      try {
        const data = JSON.parse(raw)
        if (data.action === 'reorder') {
          onReorder?.(threadId, data.nodeId, data.fromBodyIndex, index)
        } else if (data.action === 'restore') {
          onGapRestore?.(data.nodeId, threadId, position)
        }
      } catch {
        // ignore parse errors
      }
    },
    [onReorder, onGapRestore, threadId, position, index],
  )

  return (
    <div
      className={`loom-lane-gap${dragOver ? ' loom-lane-gap--drag-over' : ''}`}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      aria-label={`Insert at position ${position}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
    >
      <span className="loom-lane-gap-icon" aria-hidden="true">+</span>
    </div>
  )
}

export function LoomLane({
  thread,
  nodes,
  selectedNodeId,
  onSelectNode,
  onRegisterRect,
  onGapClick,
  onReorder,
  onGapRestore,
}: LoomLaneProps) {
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
        {bodyNodes.map((node, idx) => {
          const item = thread.items.find((i) => i.node_id === node.id)
          const gapPos = item?.position ?? idx * 10
          return (
            <div key={node.id} className="loom-lane-card-group">
              <Gap
                threadId={thread.id}
                position={gapPos}
                index={idx}
                onGapClick={onGapClick}
                onReorder={onReorder}
                onGapRestore={onGapRestore}
              />
              <LoomNodeCard
                node={node}
                isNow={head?.id === node.id || currentNodeId === node.id}
                isNext={nextBeatId === node.id}
                threadColor={thread.color}
                selected={selectedNodeId === node.id}
                onClick={onSelectNode}
                onRegisterRect={onRegisterRect}
                threadId={thread.id}
                bodyIndex={idx}
              />
            </div>
          )
        })}
        <Gap
          threadId={thread.id}
          position={Number.MAX_SAFE_INTEGER}
          index={bodyNodes.length}
          onGapClick={onGapClick}
          onReorder={onReorder}
          onGapRestore={onGapRestore}
        />
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
