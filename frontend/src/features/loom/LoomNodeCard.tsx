import { memo, forwardRef, useCallback } from 'react'
import type { LoomNode } from '../../api/types'

interface LoomNodeCardProps {
  node: LoomNode
  isNow: boolean
  isNext: boolean
  threadColor: string | null
  selected?: boolean
  onClick?: (nodeId: number) => void
  threadId?: number
  bodyIndex?: number
}

function LoomNodeCardImpl(
  { node, isNow, isNext, threadColor, selected, onClick, threadId, bodyIndex }: LoomNodeCardProps,
  ref: React.Ref<HTMLDivElement>,
) {
  const isGhosted = node.kind === 'beat' && !node.fulfilled_at
  const isDraggable = (node.kind === 'beat' || node.kind === 'session') && node.thread_id != null && bodyIndex != null

  const classNames = [
    'loom-node',
    `loom-node--${node.kind}`,
    ...(isGhosted ? ['loom-node--ghosted'] : []),
    ...(selected ? ['loom-node--selected'] : []),
    ...(isDraggable ? ['loom-node--draggable'] : []),
  ].join(' ')

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (!isDraggable) return
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData(
        'application/json',
        JSON.stringify({ action: 'reorder', nodeId: node.id, fromBodyIndex: bodyIndex, sourceThreadId: threadId, nodeKind: node.kind }),
      )
    },
    [isDraggable, node.id, node.kind, bodyIndex, threadId],
  )

  return (
    <div
      ref={ref}
      className={classNames}
      data-head={isNow || undefined}
      data-next={isNext || undefined}
      onClick={(e) => { e.stopPropagation(); onClick?.(node.id) }}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return
        e.preventDefault()
        onClick?.(node.id)
      }}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${node.kind}: ${node.title}`}
      draggable={isDraggable}
      onDragStart={handleDragStart}
    >
      {threadColor && <span className="loom-node-spine" data-color={threadColor} aria-hidden="true" />}
      {isNow && <span className="loom-node-badge loom-node-badge--now">Now</span>}
      {isNext && <span className="loom-node-badge loom-node-badge--next">Next</span>}
      <div className="loom-node-title">{node.title}</div>
    </div>
  )
}

export const LoomNodeCard = memo(forwardRef(LoomNodeCardImpl))
