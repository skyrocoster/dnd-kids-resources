import type { LoomNode, LoomTapestryThread } from '../../api/types'

/** One swimlane: a thread plus its ordered nodes and progress boundaries. */
export interface SwimlaneModel {
  thread: LoomTapestryThread
  ordered: LoomNode[]
  currentNodeId: number | null
  nextBeatId: number | null
}

/** Measured DOM rect for a node card, used by the stitch overlay layer. */
export interface CardRect {
  nodeId: number
  threadId: number
  left: number
  top: number
  width: number
  height: number
}
