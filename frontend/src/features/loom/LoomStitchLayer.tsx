import { useMemo } from 'react'
import type { LoomNode, LoomTapestryThread } from '../../api/types'
import type { CardRect } from './swimlaneTypes'
import { buildStitches, buildSpawnLinks } from './stitchGeometry'
import type { StitchPath, SpawnLinkPath } from './stitchGeometry'

interface LoomStitchLayerProps {
  cardRects: Map<number, CardRect>
  threads: LoomTapestryThread[]
  nodes: LoomNode[]
  contentSize: { width: number; height: number }
  selectedNodeId?: number | null
  selectedThreadId?: number | null
}

/**
 * Absolutely-positioned SVG overlay that draws:
 * (a) cross-lane stitches for shared sessions
 * (b) dotted spawn links from origin sessions to spawned thread start caps
 */
export function LoomStitchLayer({ cardRects, threads, nodes, contentSize, selectedNodeId, selectedThreadId }: LoomStitchLayerProps) {
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

  function stitchClass(s: StitchPath): string {
    const parts = ['loom-stitch']
    const nodeEmphasized = selectedNodeId != null && s.fromNodeId === selectedNodeId
    const threadConnected = selectedThreadId != null && (s.fromThreadId === selectedThreadId || s.toThreadId === selectedThreadId)
    if (nodeEmphasized || threadConnected) {
      parts.push('loom-stitch--emphasized')
    }
    if (selectedThreadId != null && !threadConnected && !nodeEmphasized) {
      parts.push('loom-stitch--dimmed')
    }
    return parts.join(' ')
  }

  function spawnLinkClass(link: SpawnLinkPath): string {
    const parts = ['loom-spawn-link']
    const originThreadId = cardRects.get(link.originNodeId)?.threadId
    const nodeEmphasized = selectedNodeId != null && link.originNodeId === selectedNodeId
    if (nodeEmphasized) {
      parts.push('loom-spawn-link--emphasized')
    }
    if (selectedThreadId != null && originThreadId !== selectedThreadId && !nodeEmphasized) {
      parts.push('loom-spawn-link--dimmed')
    }
    return parts.join(' ')
  }

  return (
    <svg className="loom-stitch-layer" aria-hidden="true" width={contentSize.width} height={contentSize.height}>
      {stitches.map((s, i) => (
        <path
          key={`stitch-${i}`}
          className={stitchClass(s)}
          d={s.d}
          data-color={`thread-${threads.find((t) => t.id === s.fromThreadId)?.color.split('-')[1] ?? '1'}`}
          fill="none"
          strokeWidth={3}
        />
      ))}
      {stitches.map((s, i) => {
        if (s.fromNodeId !== s.toNodeId) return null
        const node = nodes.find((n) => n.id === s.fromNodeId)
        if (!node?.title) return null
        const dimmed =
          selectedThreadId != null &&
          !(s.fromThreadId === selectedThreadId || s.toThreadId === selectedThreadId) &&
          !(selectedNodeId != null && s.fromNodeId === selectedNodeId)
        const cls = ['loom-stitch-label']
        if (dimmed) cls.push('loom-stitch-label--dimmed')
        return (
          <g key={`label-${i}`} className={cls.join(' ')}>
            <rect
              x={s.labelMidX - 60}
              y={s.labelMidY - 11}
              width={120}
              height={22}
              rx={4}
              className="loom-stitch-label-bg"
            />
            <text
              x={s.labelMidX}
              y={s.labelMidY}
              textAnchor="middle"
              dominantBaseline="central"
              className="loom-stitch-label"
            >
              {node.title}
            </text>
          </g>
        )
      })}
      {spawnLinks.map((link, i) => (
        <path
          key={`spawn-${i}`}
          className={spawnLinkClass(link)}
          d={link.d}
          fill="none"
          data-color={`thread-${threads.find((t) => t.id === link.spawnedThreadId)?.color.split('-')[1] ?? '1'}`}
          strokeWidth={2.5}
          strokeDasharray="6 4"
        />
      ))}
    </svg>
  )
}
