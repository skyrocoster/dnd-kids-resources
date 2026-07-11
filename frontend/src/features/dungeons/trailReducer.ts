/** Pure reducer for the breadcrumb trail of visited room IDs.
 * Appends a new room, or — since the dungeon graph has cycles — collapses
 * back to an earlier visit of the same room instead of appending a duplicate.
 */
export type Trail = number[]

export function trailReducer(trail: Trail, roomId: number): Trail {
  const existingIndex = trail.indexOf(roomId)
  if (existingIndex !== -1) {
    return trail.slice(0, existingIndex + 1)
  }
  return [...trail, roomId]
}
