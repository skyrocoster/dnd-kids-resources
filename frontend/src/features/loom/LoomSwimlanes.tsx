import { useCallback } from 'react'
import type { LoomNode, LoomTapestryThread } from '../../api/types'
import { LoomLane } from './LoomLane'
import { LoomStitchLayer } from './LoomStitchLayer'
import { useCardRects } from './useCardRects'

interface LoomSwimlanesProps {
  threads: LoomTapestryThread[]
  nodes: LoomNode[]
  selectedNodeId?: number | null
  onSelectNode?: (nodeId: number) => void
  onGapClick?: (threadId: number, position: number) => void
  onReorder?: (threadId: number, nodeId: number, fromBodyIndex: number, toBodyIndex: number) => void
  onCrossLaneDrop?: (nodeId: number, sourceThreadId: number, targetThreadId: number, position: number, nodeKind: 'beat' | 'session') => void
  onGapRestore?: (nodeId: number, threadId: number, position: number) => void
}

export function LoomSwimlanes({
  threads,
  nodes,
  selectedNodeId,
  onSelectNode,
  onGapClick,
  onReorder,
  onCrossLaneDrop,
  onGapRestore,
}: LoomSwimlanesProps) {
  const { scrollRef, registerCard, cardRects, contentSize } = useCardRects()

  const scrollRefCallback = useCallback(
    (el: HTMLDivElement | null) => {
      scrollRef.current = el
    },
    [scrollRef],
  )

  return (
    <section
      className="loom-canvas-area loom-swimlanes"
      aria-label="Thread swimlanes"
      ref={scrollRefCallback}
    >
      <LoomStitchLayer cardRects={cardRects} threads={threads} nodes={nodes} contentSize={contentSize} />
      {threads.map((thread) => (
        <LoomLane
          key={thread.id}
          thread={thread}
          nodes={nodes}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          onRegisterRect={registerCard}
          onGapClick={onGapClick}
          onReorder={onReorder}
          onCrossLaneDrop={onCrossLaneDrop}
          onGapRestore={onGapRestore}
        />
      ))}
    </section>
  )
}
