import { useMemo } from 'react'
import type { LoomNode, LoomTapestryThread } from '../../api/types'
import type { CardRect } from './swimlaneTypes'
import { buildStitches, buildSpawnLinks } from './stitchGeometry'

interface LoomStitchLayerProps {
  cardRects: Map<number, CardRect>
  threads: LoomTapestryThread[]
  nodes: LoomNode[]
}

/**
 * Absolutely-positioned SVG overlay that draws:
 * (a) cross-lane stitches for shared sessions
 * (b) dotted spawn links from origin sessions to spawned thread start caps
 */
export function LoomStitchLayer({ cardRects, threads, nodes }: LoomStitchLayerProps) {
  const stitches = useMemo(() => {
    const byNode = new Map<number, CardRect[]>()
    for (const rect of cardRects.values()) {
      const existing = byNode.get(rect.nodeId)
      if (existing) {
        existing.push(rect)
      } else {
        byNode.set(rect.nodeId, [rect])
      }
    }

    const shared: { nodeId: number; rects: CardRect[] }[] = []
    for (const [nodeId, rects] of byNode) {
      if (rects.length > 1) {
        const node = nodes.find((n) => n.id === nodeId)
        if (node && node.kind === 'session') {
          shared.push({ nodeId, rects })
        }
      }
    }
    return buildStitches(shared)
  }, [cardRects, nodes])

  const spawnLinks = useMemo(() => {
    const origins: {
      originNodeId: number
      originRect: CardRect
      startCapRect: CardRect
      spawnedThreadId: number
    }[] = []

    for (const thread of threads) {
      if (thread.origin_node_id == null) continue
      const originRect = cardRects.get(thread.origin_node_id)
      if (!originRect) continue

      const startNode = thread.items
        .slice()
        .sort((a, b) => a.position - b.position)[0]
      if (!startNode) continue
      const startCapRect = cardRects.get(startNode.node_id)
      if (!startCapRect) continue

      origins.push({
        originNodeId: thread.origin_node_id,
        originRect,
        startCapRect,
        spawnedThreadId: thread.id,
      })
    }
    return buildSpawnLinks(origins)
  }, [cardRects, threads])

  const hasContent = stitches.length > 0 || spawnLinks.length > 0
  if (!hasContent) return null

  return (
    <svg className="loom-stitch-layer" aria-hidden="true">
      {stitches.map((s, i) => (
        <path
          key={`stitch-${i}`}
          className="loom-stitch"
          d={s.d}
          data-color={`thread-${threads.find((t) => t.id === s.fromThreadId)?.color.split('-')[1] ?? '1'}`}
          fill="none"
          strokeWidth={2}
        />
      ))}
      {spawnLinks.map((link, i) => (
        <path
          key={`spawn-${i}`}
          className="loom-spawn-link"
          d={link.d}
          fill="none"
          stroke="var(--md-outline)"
          strokeWidth={1.5}
          strokeDasharray="6 4"
        />
      ))}
    </svg>
  )
}
