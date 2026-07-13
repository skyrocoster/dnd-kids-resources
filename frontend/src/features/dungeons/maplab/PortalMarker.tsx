import { HiddenIcon, LockIcon, TrapIcon, PortalIcon, type LucideIcon } from '../../../components/icons'
import { passagePresentation, type MapPortal, type PassageState } from './maplabModel'

const BADGE_ICONS: Partial<Record<PassageState, LucideIcon>> = {
  hidden: HiddenIcon,
  locked: LockIcon,
  trapped: TrapIcon,
}

interface PortalMarkerProps {
  portal: MapPortal
  cellSize: number
  selected?: boolean
  onClick?: () => void
}

/** Portal marker — always on-square (never wall-attached), so it only needs the cell-centered half
 * of `PropMarker.tsx`'s geometry. Same visual language as stair/prop markers: a neutral-fill ring
 * whose stroke carries the passage-state token, the portal glyph as the primary icon, and a small
 * state badge when locked/trapped/hidden — never hue-alone. */
export function PortalMarker({ portal, cellSize, selected, onClick }: PortalMarkerProps) {
  const cx = (portal.cell[0] + 0.5) * cellSize
  const cy = (portal.cell[1] + 0.5) * cellSize
  const radius = cellSize * 0.32
  const iconSize = cellSize * 0.34

  const presentation = passagePresentation(portal)
  const BadgeIcon = BADGE_ICONS[presentation.state]
  const dasharray = presentation.state === 'hidden' ? '4 3' : undefined
  const label = `${portal.title ?? `Portal ${portal.portal_id}`} — ${presentation.label}`

  return (
    <g
      className="maplab-portal"
      data-state={presentation.state}
      data-selected={selected || undefined}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation()
        onClick?.()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick?.()
        }
      }}
    >
      <title>{portal.title ?? `Portal ${portal.portal_id}`}</title>
      <circle
        className="maplab-portal-marker"
        cx={cx}
        cy={cy}
        r={radius}
        style={{ stroke: `var(${presentation.token})` }}
        strokeDasharray={dasharray}
      />
      <g transform={`translate(${cx - iconSize / 2}, ${cy - iconSize / 2})`}>
        <PortalIcon width={iconSize} height={iconSize} className="maplab-portal-icon" style={{ color: `var(${presentation.token})` }} />
      </g>
      {BadgeIcon && (
        <g transform={`translate(${cx + iconSize / 4}, ${cy + iconSize / 4})`}>
          <BadgeIcon
            width={14}
            height={14}
            className="maplab-portal-state-badge"
            aria-hidden="true"
            style={{ color: `var(${presentation.token})` }}
          />
        </g>
      )}
    </g>
  )
}
