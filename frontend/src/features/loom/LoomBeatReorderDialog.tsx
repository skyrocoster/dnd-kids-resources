import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { GripVertical } from 'lucide-react'
import { reorderLoomThreadItem } from '../../api/client'
import type { LoomNode, LoomTapestryThread } from '../../api/types'
import { Dialog } from '../../components/Dialog'
import { threadOrdered } from './loomGraph'
import { beatReorderTarget, type OrderedBeat } from './beatReorder'
import './LoomEditor.css'

interface LoomBeatReorderDialogProps {
  thread: LoomTapestryThread
  nodes: LoomNode[]
  onReordered: () => void
  onError: (msg: string) => void
  onClose: () => void
}

function move<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const next = items.slice()
  const [item] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, item)
  return next
}

export function LoomBeatReorderDialog({ thread, nodes, onReordered, onError, onClose }: LoomBeatReorderDialogProps) {
  const rowRefs = useRef<Map<number, HTMLLIElement>>(new Map())
  const dragState = useRef<{ nodeId: number; fromIndex: number } | null>(null)
  const [draggingNodeId, setDraggingNodeId] = useState<number | null>(null)
  const [pending, setPending] = useState(false)

  const beats = useMemo(() => {
    return threadOrdered(thread, nodes)
      .filter((node) => node.kind === 'beat')
      .map((node) => ({ nodeId: node.id, position: node.position }))
  }, [thread, nodes])
  const nodesById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])
  const [order, setOrder] = useState<OrderedBeat[]>(beats)

  useEffect(() => {
    setOrder(beats)
  }, [beats])

  const findDropIndex = (clientY: number): number => {
    for (let index = 0; index < order.length; index += 1) {
      const row = rowRefs.current.get(order[index].nodeId)
      if (!row) continue
      const rect = row.getBoundingClientRect()
      if (clientY < rect.top + rect.height / 2) return index
    }
    return order.length
  }

  const handlePointerMove = (event: PointerEvent) => {
    if (dragState.current) event.preventDefault()
  }

  const handlePointerUp = async (event: PointerEvent) => {
    const drag = dragState.current
    if (!drag) return
    const rawToIndex = findDropIndex(event.clientY)
    const toIndex = rawToIndex > drag.fromIndex ? rawToIndex - 1 : rawToIndex
    dragState.current = null
    setDraggingNodeId(null)
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)

    const target = beatReorderTarget(order, drag.fromIndex, toIndex)
    if (!target) return

    const previousOrder = order
    setOrder(move(order, drag.fromIndex, toIndex))
    setPending(true)
    try {
      await reorderLoomThreadItem(thread.id, target.nodeId, { position: target.position })
      onReordered()
    } catch (err) {
      setOrder(previousOrder)
      onError(err instanceof Error ? err.message : 'Failed to reorder the beats.')
    } finally {
      setPending(false)
    }
  }

  const startDrag = (nodeId: number, fromIndex: number) => (event: ReactPointerEvent) => {
    if (pending) return
    event.preventDefault()
    dragState.current = { nodeId, fromIndex }
    setDraggingNodeId(nodeId)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  return (
    <Dialog
      open
      title="Reorder Beats"
      description={`${thread.name}: Sessions are locked in the past; only upcoming beats can be reordered.`}
      onClose={onClose}
      pending={pending}
      className="loom-beat-reorder-dialog"
    >
      {order.length <= 1 ? (
        <p className="loom-beat-reorder-empty">This thread has no upcoming beats to reorder.</p>
      ) : (
        <ol className="loom-beat-reorder-list">
          {order.map((beat, index) => (
            <li
              key={beat.nodeId}
              ref={(element) => {
                if (element) rowRefs.current.set(beat.nodeId, element)
                else rowRefs.current.delete(beat.nodeId)
              }}
              className="loom-beat-reorder-row"
              data-dragging={draggingNodeId === beat.nodeId || undefined}
            >
              <button
                type="button"
                className="loom-beat-reorder-handle"
                aria-label={`Drag ${nodesById.get(beat.nodeId)?.title ?? 'beat'} to reorder`}
                disabled={pending}
                onPointerDown={startDrag(beat.nodeId, index)}
              >
                <GripVertical size={20} aria-hidden="true" />
              </button>
              <span>{nodesById.get(beat.nodeId)?.title ?? 'Untitled beat'}</span>
            </li>
          ))}
        </ol>
      )}
    </Dialog>
  )
}
