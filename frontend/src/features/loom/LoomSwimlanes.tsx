import type { CSSProperties } from 'react'
import { useEffect, useRef } from 'react'
import type { LoomNode, LoomSession, LoomTapestryThread } from '../../api/types'
import { LoomLane } from './LoomLane'
import { getFellDividerElement, isFellDividerFullyVisible, scrollToFellDivider } from './currentPositionScroll'

type LoomGridStyle = CSSProperties & { '--loom-session-count': number }

interface LoomSwimlanesProps {
  threads: LoomTapestryThread[]
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
  onDividerVisibilityChange?: (isVisible: boolean) => void
  placingNodeId?: number | null
}

export function LoomSwimlanes({
  threads,
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
  onDividerVisibilityChange,
  placingNodeId,
}: LoomSwimlanesProps) {
  const gridRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return

    const divider = getFellDividerElement()
    if (!divider) return

    scrollToFellDivider(grid, divider)
    const isVisible = isFellDividerFullyVisible(grid, divider)
    onDividerVisibilityChange?.(isVisible)

    const handleScroll = () => {
      const divider = getFellDividerElement()
      if (!divider) return
      const isVisible = isFellDividerFullyVisible(grid, divider)
      onDividerVisibilityChange?.(isVisible)
    }

    grid.addEventListener('scroll', handleScroll)
    return () => {
      grid.removeEventListener('scroll', handleScroll)
    }
  }, [onDividerVisibilityChange])

  return (
    <section
      ref={gridRef}
      className="loom-canvas-area loom-grid"
      aria-label="Session grid"
      style={{ '--loom-session-count': sessions.length } as LoomGridStyle}
    >
      <div className="loom-grid-headers">
        <div className="loom-grid-corner" />
        {sessions.map((s) => (
          <div key={s.id} className="loom-grid-col-header">
            <span className="loom-grid-col-ordinal">{s.ordinal}.</span>
            <span className="loom-grid-col-name">{s.name}</span>
          </div>
        ))}
        <div className="loom-grid-col-header loom-grid-col-header--fell" aria-label="Current position" />
        <div className="loom-grid-col-header loom-grid-col-header--warp" aria-label="Planned beats">Planned beats</div>
      </div>
      {threads.map((thread) => (
        <LoomLane
          key={thread.id}
          thread={thread}
          nodes={nodes}
          sessions={sessions}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          selectedThreadId={selectedThreadId}
          onSelectThread={onSelectThread}
          onGapClick={onGapClick}
          onReorder={onReorder}
          onCrossLaneDrop={onCrossLaneDrop}
          onGapRestore={onGapRestore}
          onCardEdit={onCardEdit}
          onCardBank={onCardBank}
          onCardDelete={onCardDelete}
          placingNodeId={placingNodeId}
        />
      ))}
    </section>
  )
}
