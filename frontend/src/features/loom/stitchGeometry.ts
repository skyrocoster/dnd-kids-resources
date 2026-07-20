import type { CardRect } from './swimlaneTypes'

export interface StitchPath {
  fromNodeId: number
  toNodeId: number
  fromThreadId: number
  toThreadId: number
  d: string
  labelMidX: number
  labelMidY: number
}

export interface SpawnLinkPath {
  originNodeId: number
  spawnedThreadId: number
  d: string
}

/** Vertical center of a CardRect. */
function cy(r: CardRect): number {
  return r.top + r.height / 2
}

/** Right edge x of a CardRect. */
function right(r: CardRect): number {
  return r.left + r.width
}

/**
 * Compute a cubic-bezier path between two card rects that sit in different lanes.
 * The path exits the right side of `from` and enters the left side of `to`,
 * curving vertically to span the lane gap.
 */
export function stitchPath(from: CardRect, to: CardRect): string {
  const x0 = right(from)
  const y0 = cy(from)
  const x1 = to.left
  const y1 = cy(to)
  const dx = Math.abs(x1 - x0)
  const c = Math.max(dx * 0.4, 40)
  return `M ${x0} ${y0} C ${x0 + c} ${y0}, ${x1 - c} ${y1}, ${x1} ${y1}`
}

/**
 * Compute a vertical-drop then horizontal path for a spawn link.
 * Drops from the bottom-center of the origin session down to the top-center
 * of the spawned thread's start cap, then goes horizontal.
 */
export function spawnLinkPath(origin: CardRect, startCap: CardRect): string {
  const x0 = origin.left + origin.width / 2
  const y0 = origin.top + origin.height
  const x1 = startCap.left + startCap.width / 2
  const y1 = startCap.top
  const midY = y0 + (y1 - y0) * 0.5
  return `M ${x0} ${y0} L ${x0} ${midY} L ${x1} ${midY} L ${x1} ${y1}`
}

/**
 * Build stitch paths for shared sessions that appear in multiple lanes.
 * For each shared node, connect every adjacent pair of its instances
 * (sorted by thread order).
 */
export function buildStitches(
  sharedNodes: { nodeId: number; rects: CardRect[] }[],
): StitchPath[] {
  const paths: StitchPath[] = []
  for (const { nodeId, rects } of sharedNodes) {
    for (let i = 0; i < rects.length - 1; i++) {
      const from = rects[i]
      const to = rects[i + 1]
      if (!from || !to) continue
      const fromCX = from.left + from.width / 2
      const fromCY = from.top + from.height / 2
      const toCX = to.left + to.width / 2
      const toCY = to.top + to.height / 2

      paths.push({
        fromNodeId: nodeId,
        toNodeId: nodeId,
        fromThreadId: from.threadId,
        toThreadId: to.threadId,
        d: stitchPath(from, to),
        labelMidX: (fromCX + toCX) / 2,
        labelMidY: (fromCY + toCY) / 2 - 8,
      })
    }
  }
  return paths
}

/**
 * Build spawn-link paths from origin sessions to their spawned thread start caps.
 */
export function buildSpawnLinks(
  origins: { originNodeId: number; originRect: CardRect; startCapRect: CardRect; spawnedThreadId: number }[],
): SpawnLinkPath[] {
  return origins.map(({ originNodeId, originRect, startCapRect, spawnedThreadId }) => ({
    originNodeId,
    spawnedThreadId,
    d: spawnLinkPath(originRect, startCapRect),
  }))
}
