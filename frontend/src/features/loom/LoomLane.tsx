import { useCallback, useState } from 'react'
import type { LoomNode, LoomSession, LoomTapestryThread } from '../../api/types'
import { threadOrdered, currentPosition, threadHead, nextBeat, isThreadAlive } from './loomGraph'
import { LoomNodeCard } from './LoomNodeCard'

interface LoomLaneProps {
  thread: LoomTapestryThread
  nodes: LoomNode[]
  sessions: LoomSession[]
  selectedNodeId?: number | null
  onSelectNode?: (nodeId: number) => void
  selectedThreadId?: number | null
  onSelectThread?: (threadId: number) => void
  onGapClick?: (threadId: number, position: number) => void
  onReorder?: (threadId: number, nodeId: number, fromBodyIndex: number, toBodyIndex: number) => void
  onCrossLaneDrop?: (nodeId: number, sourceThreadId: number, targetThreadId: number, position: number, nodeKind: 'beat' | 'session') => void
  onGapRestore?: (nodeId: number, threadId: number, position: number) => void
  onCardEdit?: (node: LoomNode) => void
  onCardBank?: (node: LoomNode) => void
  onCardDelete?: (node: LoomNode) => void
}

interface DropZoneCallbacks {
  onReorder?: (threadId: number, nodeId: number, fromBodyIndex: number, toBodyIndex: number) => void
  onCrossLaneDrop?: (nodeId: number, sourceThreadId: number, targetThreadId: number, position: number, nodeKind: 'beat' | 'session') => void
  onGapRestore?: (nodeId: number, threadId: number, position: number) => void
}

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
  sessions,
  selectedNodeId,
  onSelectNode,
  selectedThreadId,
  onSelectThread,
  onGapClick,
  onReorder,
  onCrossLaneDrop,
  onGapRestore,
  onCardEdit,
  onCardBank,
  onCardDelete,
}: LoomLaneProps) {
  const ordered = threadOrdered(thread, nodes)
  const current = currentPosition(thread, nodes)
  const head = threadHead(thread, nodes)
  const next = nextBeat(thread, nodes)

  const currentNodeId = current?.nodeId ?? null
  const nextBeatId = next?.id ?? null

  const warpNodes = ordered.filter((n) => n.kind !== 'start' && n.kind !== 'end' && n.session_id == null)

  const originNode = thread.origin_node_id != null
    ? nodes.find((n) => n.id === thread.origin_node_id)
    : null

  return (
    <div
      className={`loom-grid-row${selectedThreadId === thread.id ? ' loom-grid-row--selected' : ''}${selectedThreadId != null && selectedThreadId !== thread.id ? ' loom-grid-row--dimmed' : ''}`}
    >
      <div
        className="loom-grid-thread-label"
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
        <span className="loom-grid-thread-name">{thread.name}</span>
      </div>
      {sessions.map((session) => {
        const node = nodes.find((n) => n.thread_id === thread.id && n.session_id === session.id)
        const alive = isThreadAlive(thread, session.ordinal, nodes, sessions)

        if (node) {
          return (
            <div key={session.id} className="loom-grid-cell loom-grid-cell--real loom-grid-cell--cloth" aria-label={`Session ${session.ordinal} played`}>
              <LoomNodeCard
                node={node}
                isNow={head?.id === node.id || currentNodeId === node.id}
                isNext={nextBeatId === node.id}
                threadColor={thread.color}
                selected={selectedNodeId === node.id}
                onClick={onSelectNode}
                threadId={thread.id}
                originNodeTitle={originNode?.title}
                onEdit={onCardEdit}
                onBank={onCardBank}
                onDelete={onCardDelete}
              />
            </div>
          )
        }

        if (alive) {
          return <div key={session.id} className="loom-grid-cell loom-grid-cell--quiet" />
        }

        return <div key={session.id} className="loom-grid-cell loom-grid-cell--outside-life" />
      })}
      <div className="loom-grid-fell-edge" role="separator" aria-label="Fell edge" />
      <div className="loom-grid-warp" aria-label="Warp lane">
        <div className="loom-grid-warp-divider" aria-hidden="true" />
        {warpNodes.map((node, idx) => (
          <CardGroup
            key={node.id}
            threadId={thread.id}
            position={node.position}
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
              threadId={thread.id}
              bodyIndex={idx}
              onEdit={onCardEdit}
              onBank={onCardBank}
              onDelete={onCardDelete}
            />
          </CardGroup>
        ))}
        <CardGroup
          threadId={thread.id}
          position={Number.MAX_SAFE_INTEGER}
          index={warpNodes.length}
          onGapClick={onGapClick}
          onReorder={onReorder}
          onCrossLaneDrop={onCrossLaneDrop}
          onGapRestore={onGapRestore}
        >
          {null}
        </CardGroup>
      </div>
    </div>
  )
}
