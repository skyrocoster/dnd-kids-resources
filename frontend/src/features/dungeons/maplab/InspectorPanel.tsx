import { Fragment, useEffect, useState } from 'react'
import { CoinsIcon, SwordsIcon } from '../../../components/icons'
import { ApiError, getLootBundle } from '../../../api/client'
import type { LootBundle } from '../../../api/types'
import { categoryIcon } from '../../loot/itemCategories'
import { computeBundleTotal, formatGp } from '../../loot/lootTotals'
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
 * kinds. Props can additionally resolve their soft-referenced loot bundle live. */
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
      {target.kind === 'prop' && target.prop.loot && <LootSummaryShell loot={target.prop.loot} />}
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

function LootSummaryShell({ loot }: { loot: { bundle_id: number; bundle_name?: string } }) {
  const [bundle, setBundle] = useState<LootBundle | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading')

  useEffect(() => {
    let active = true
    setBundle(null)
    setStatus('loading')

    getLootBundle(loot.bundle_id)
      .then((result) => {
        if (!active) return
        setBundle(result)
        setStatus('ready')
      })
      .catch((error: unknown) => {
        if (!active) return
        setStatus(error instanceof ApiError && error.status === 404 ? 'missing' : 'error')
      })

    return () => {
      active = false
    }
  }, [loot.bundle_id])

  if (status === 'loading') {
    return (
      <div className="maplab-loot-summary maplab-loot-summary-status" role="status">
        <CoinsIcon width={16} height={16} aria-hidden="true" />
        <span>Opening the treasure cache...</span>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="maplab-loot-summary maplab-loot-summary-missing" role="status">
        <CoinsIcon width={16} height={16} aria-hidden="true" />
        <span>Could not open {loot.bundle_name ?? 'this loot bundle'}.</span>
      </div>
    )
  }

  if (status === 'missing' || !bundle) {
    return (
      <div className="maplab-loot-summary maplab-loot-summary-missing" role="status">
        <CoinsIcon width={16} height={16} aria-hidden="true" />
        <span>{loot.bundle_name ? `${loot.bundle_name} was removed` : 'This loot bundle was removed'}</span>
      </div>
    )
  }

  const contents = bundle.contents ?? []
  return (
    <section className="maplab-loot-summary" aria-label="Loot contents">
      <div className="maplab-loot-summary-header">
        <CoinsIcon width={16} height={16} aria-hidden="true" />
        <span>{bundle.name}</span>
        <strong>{formatGp(computeBundleTotal(bundle.gold, contents))}</strong>
      </div>
      <div className="maplab-loot-gold">Gold: {formatGp(bundle.gold)}</div>
      {contents.length > 0 ? (
        <ul className="maplab-loot-entries">
          {contents.map((entry, index) => {
            const EntryIcon = entry.kind === 'weapon' ? SwordsIcon : categoryIcon(entry.category)
            const value = entry.value_gp === null ? null : formatGp(entry.value_gp)
            return (
              <li key={`${entry.kind}-${entry.ref_id ?? entry.name}-${index}`}>
                <EntryIcon width={14} height={14} aria-hidden="true" />
                <span>{entry.quantity} x {entry.name}{value ? ` (${value})` : ''}</span>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="maplab-loot-empty">This bundle holds gold only.</p>
      )}
    </section>
  )
}
