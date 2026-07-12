import { Fragment } from 'react'
import {
  inspectableDescriptor,
  type Inspectable,
} from './maplabModel'

export interface SessionControls {
  onToggleOpen?: () => void
  onToggleLocked?: () => void
  onDisarmTrap?: () => void
}

/** Element-agnostic descriptor panel — a room, door, or stair all resolve through
 * `inspectableDescriptor` to the same {title, typeLabel, icon, token, lines} shape, so one
 * component renders all three (an `Inspectable['kind'] === 'item'` target is reachable through the
 * same path but nothing in this page currently produces one — items aren't rendered yet). Doors and
 * stairs additionally get live session controls (Stage 4) — rooms and items don't carry passage
 * state, so `controls` is only passed for those two kinds. */
export function InspectorPanel({ target, controls }: { target: Inspectable; controls?: SessionControls }) {
  const descriptor = inspectableDescriptor(target)
  const Icon = descriptor.icon
  const isTrapped = target.kind === 'door' ? target.door.trapped : target.kind === 'stair' ? target.stair.trapped : false

  return (
    <div className="maplab-inspector-panel">
      <div className="maplab-inspector-header">
        <Icon width={20} height={20} aria-hidden="true" style={{ color: `var(${descriptor.token})` }} />
        <span className="maplab-inspector-title">{descriptor.title}</span>
        <span className="maplab-inspector-kind">{descriptor.typeLabel}</span>
      </div>
      {descriptor.lines.length > 0 && (
        <dl className="maplab-inspector-lines">
          {descriptor.lines.map((line) => (
            <Fragment key={line.label}>
              <dt className="maplab-inspector-row">{line.label}</dt>
              <dd>{line.value}</dd>
            </Fragment>
          ))}
        </dl>
      )}
      {controls && (
        <div className="maplab-inspector-controls">
          {target.kind === 'door' && controls.onToggleOpen && (
            <button type="button" className="maplab-pill-button maplab-session-control-button" onClick={controls.onToggleOpen}>
              {target.session?.isOpen ? 'Close door' : 'Open door'}
            </button>
          )}
          {controls.onToggleLocked && (
            <button type="button" className="maplab-pill-button maplab-session-control-button" onClick={controls.onToggleLocked}>
              {(target.kind === 'door' || target.kind === 'stair') && target.session?.isLocked
                ? 'Unlock'
                : 'Lock'}
            </button>
          )}
          {isTrapped && controls.onDisarmTrap && (
            <button
              type="button"
              className="maplab-pill-button maplab-session-control-button"
              disabled={(target.kind === 'door' || target.kind === 'stair') && target.session?.trapDisarmed}
              onClick={controls.onDisarmTrap}
            >
              Disarm trap
            </button>
          )}
        </div>
      )}
    </div>
  )
}
