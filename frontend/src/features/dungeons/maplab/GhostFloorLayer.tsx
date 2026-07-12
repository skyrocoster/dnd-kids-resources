import type { MapDoor, MapProp, MapRoom } from './maplabModel'

interface GhostFloorLayerProps {
  rooms: MapRoom[]
  doors: MapDoor[]
  props: MapProp[]
  cellSize: number
}

/** Presentational layer for ghosted (non-interactive) lower-floor objects when the editor displays
 * the floor below the active one for alignment reference. Stage G1 will implement rendering;
 * G0 is a stub. */
export function GhostFloorLayer(_props: GhostFloorLayerProps) {
  // TODO: implement rendering in G1
  return null
}
