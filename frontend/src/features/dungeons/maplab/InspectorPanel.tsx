import { Fragment } from 'react'
import { ItemIcon } from '../../../components/icons'
import {
  inspectableDescriptor,
  PASSAGE_STATE_TOKENS,
  type Inspectable,
} from './maplabModel'

export interface SessionControls {
  onToggleOpen?: () => void
  onToggleLocked?: () => void
  onDisarmTrap?: () => void
}

/** Element-agnostic descriptor panel — a room, door, stair, or prop all resolve through
 * `inspectableDescriptor` to the same {title, typeLabel, icon, token, chips, lines} shape, so one
 * component renders all four. `chips` (Design Phase J2) replaces the old State/Also text rows with
 * icon+text pills — empty for a room or a fully-unlocked passage. Doors and stairs additionally get
 * live session controls (Stage 4) —
 * rooms and props don't carry that kind of runtime state, so `controls` is only passed for those two
 * kinds. Props instead get a disabled "Contents" row (Phase F4) — the reserved `MapProp.loot` slot
 * is data-only for now; the loot phase wires this row up rather than adding a new one. */
export function InspectorPanel({ target, controls }: { target: Inspectable; controls?: SessionControls }) {
  const descriptor = inspectableDescriptor(target)
  const Icon = descriptor.icon
  const isTrapped =
    target.kind === 'door'
      ? target.door.trapped
      : target.kind === 'stair'
        ? target.stair.trapped
        : target.kind === 'portal'
          ? target.portal.trapped
          : false

  return (
    <div className="maplab-inspector-panel">
      <div className="maplab-inspector-header">
        <Icon width={20} height={20} aria-hidden="true" style={{ color: `var(${descriptor.token})` }} />
        <span className="maplab-inspector-title">{descriptor.title}</span>
        <span className="maplab-inspector-kind">{descriptor.typeLabel}</span>
      </div>
      {descriptor.chips.length > 0 && (
        <div className="maplab-inspector-chips">
          {descriptor.chips.map((chip) => {
            const ChipIcon = chip.icon
            return (
              <span
                key={chip.state}
                className="maplab-inspector-chip"
                data-state={chip.state}
                style={{ color: `var(${PASSAGE_STATE_TOKENS[chip.state]})` }}
              >
                <ChipIcon width={14} height={14} aria-hidden="true" />
                {chip.label}
              </span>
            )
          })}
        </div>
      )}
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
      {target.kind === 'prop' && (
        <div className="maplab-loot-hook-row" aria-disabled="true">
          <ItemIcon width={16} height={16} aria-hidden="true" />
          <span>Contents — added with the loot system</span>
        </div>
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
              {(target.kind === 'door' || target.kind === 'stair' || target.kind === 'portal') && target.session?.isLocked
                ? 'Unlock'
                : 'Lock'}
            </button>
          )}
          {isTrapped && controls.onDisarmTrap && (
            <button
              type="button"
              className="maplab-pill-button maplab-session-control-button"
              disabled={(target.kind === 'door' || target.kind === 'stair' || target.kind === 'portal') && target.session?.trapDisarmed}
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
