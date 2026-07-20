export interface OrderedBeat {
  nodeId: number
  position: number
}

/** Returns the API payload needed to place a beat in its new narrative slot. */
export function beatReorderTarget(
  beats: OrderedBeat[],
  fromIndex: number,
  toIndex: number,
): { nodeId: number; position: number } | null {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= beats.length ||
    toIndex > beats.length
  ) {
    return null
  }

  const newOrder = beats.slice()
  const [moved] = newOrder.splice(fromIndex, 1)
  newOrder.splice(toIndex, 0, moved)
  const follower = newOrder[toIndex + 1]

  return { nodeId: moved.nodeId, position: follower?.position ?? Number.MAX_SAFE_INTEGER }
}
