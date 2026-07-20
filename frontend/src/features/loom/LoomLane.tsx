import { useCallback, useState } from 'react'
import type { LoomNode, LoomTapestryThread } from '../../api/types'
import { threadOrdered, currentPosition, threadHead, nextBeat } from './loomGraph'
import { LoomNodeCard } from './LoomNodeCard'

interface LoomLaneProps {
  thread: LoomTapestryThread
  nodes: LoomNode[]
  selectedNodeId?: number | null
  onSelectNode?: (nodeId: number) => void
  selectedThreadId?: number | null
  onSelectThread?: (threadId: number) => void
  onRegisterRect?: (nodeId: number, threadId: number, el: HTMLElement | null) => void
  onGapClick?: (threadId: number, position: number) => void
  onReorder?: (threadId: number, nodeId: number, fromBodyIndex: number, toBodyIndex: number) => void
  onCrossLaneDrop?: (nodeId: number, sourceThreadId: number, targetThreadId: number, position: number, nodeKind: 'beat' | 'session') => void
  onGapRestore?: (nodeId: number, threadId: number, position: number) => void
}

interface DropZoneCallbacks {
  onReorder?: (threadId: number, nodeId: number, fromBodyIndex: number, toBodyIndex: number) => void
  onCrossLaneDrop?: (nodeId: number, sourceThreadId: number, targetThreadId: number, position: number, nodeKind: 'beat' | 'session') => void
  onGapRestore?: (nodeId: number, threadId: number, position: number) => void
}

/** Shared drag-over/drop handling for a lane slot (the gap plus whatever card sits next to it). */
function useDropZone(threadId: number, position: number, index: number, callbacks: DropZoneCallbacks) {
  const { onReorder, onCrossLaneDrop, onGapRestore } = callbacks
  const [dragOver, setDragOver] = useState(false)

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
          if (data.sourceThreadId === threadId) {
            onReorder?.(threadId, data.nodeId, data.fromBodyIndex, index)
          } else {
            onCrossLaneDrop?.(data.nodeId, data.sourceThreadId, threadId, position, data.nodeKind)
          }
        } else if (data.action === 'restore') {
          onGapRestore?.(data.nodeId, threadId, position)
        }
      } catch {
        // ignore parse errors
      }
    },
    [onReorder, onCrossLaneDrop, onGapRestore, threadId, position, index],
  )

  return { dragOver, handleDragOver, handleDragEnter, handleDragLeave, handleDrop }
}

function Gap({
  threadId,
  position,
  dragOver,
  onGapClick,
}: {
  threadId: number
  position: number
  dragOver: boolean
  onGapClick?: (threadId: number, position: number) => void
}) {
  const handleClick = useCallback(() => {
    onGapClick?.(threadId, position)
  }, [onGapClick, threadId, position])

  return (
    <div
      className={`loom-lane-gap${dragOver ? ' loom-lane-gap--drag-over' : ''}`}
      onClick={handleClick}
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

/** A gap paired with the card that follows it — the whole group is one drop target, not just the gap sliver. */
function CardGroup({
  threadId,
  position,
  index,
  onGapClick,
  onReorder,
  onCrossLaneDrop,
  onGapRestore,
  children,
}: DropZoneCallbacks & {
  threadId: number
  position: number
  index: number
  onGapClick?: (threadId: number, position: number) => void
  children: React.ReactNode
}) {
  const { dragOver, handleDragOver, handleDragEnter, handleDragLeave, handleDrop } = useDropZone(
    threadId,
    position,
    index,
    { onReorder, onCrossLaneDrop, onGapRestore },
  )

  return (
    <div
      className="loom-lane-card-group"
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Gap threadId={threadId} position={position} dragOver={dragOver} onGapClick={onGapClick} />
      {children}
    </div>
  )
}

export function LoomLane({
  thread,
  nodes,
  selectedNodeId,
  onSelectNode,
  selectedThreadId,
  onSelectThread,
  onRegisterRect,
  onGapClick,
  onReorder,
  onCrossLaneDrop,
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
    <article
      className={`loom-lane${selectedThreadId === thread.id ? ' loom-lane--selected' : ''}${selectedThreadId != null && selectedThreadId !== thread.id ? ' loom-lane--dimmed' : ''}`}
      aria-labelledby={`loom-lane-title-${thread.id}`}
    >
      <header
        className="loom-lane-header"
        onClick={(e) => { e.stopPropagation(); onSelectThread?.(thread.id) }}
        role="button"
        tabIndex={0}
        aria-pressed={selectedThreadId === thread.id}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelectThread?.(thread.id)
          }
        }}
      >
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
        <div className="loom-lane-weft-line" aria-hidden="true" />
        {bodyNodes.map((node, idx) => {
          const item = thread.items.find((i) => i.node_id === node.id)
          const gapPos = item?.position ?? idx * 10
          return (
            <CardGroup
              key={node.id}
              threadId={thread.id}
              position={gapPos}
              index={idx}
              onGapClick={onGapClick}
              onReorder={onReorder}
              onCrossLaneDrop={onCrossLaneDrop}
              onGapRestore={onGapRestore}
            >
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
            </CardGroup>
          )
        })}
        <CardGroup
          threadId={thread.id}
          position={Number.MAX_SAFE_INTEGER}
          index={bodyNodes.length}
          onGapClick={onGapClick}
          onReorder={onReorder}
          onCrossLaneDrop={onCrossLaneDrop}
          onGapRestore={onGapRestore}
        >
          {null}
        </CardGroup>
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
