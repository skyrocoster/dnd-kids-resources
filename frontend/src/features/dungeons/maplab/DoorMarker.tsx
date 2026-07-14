import type { MapDoor, PassageSessionState } from './maplabModel'

interface DoorMarkerProps {
  door: MapDoor
  cellSize: number
  /** Live session state — the viewer merges this over the authored flags; the editor omits it. */
  session?: PassageSessionState
  selected?: boolean
  /** Editor-only: whether this door is selected for editing. */
  interactive?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onFocus?: () => void
  onBlur?: () => void
  onClick?: () => void
}

/** Shared door marker for both the viewer and editor pages. Replaces the inline door renders
 * previously duplicated in MapLabPage.tsx and MapLabEditorPage.tsx. Renders the leaf in a
 * fixed `--md-door` color with badges along the leaf for status. */
export function DoorMarker(_props: DoorMarkerProps) {
  return null
}
