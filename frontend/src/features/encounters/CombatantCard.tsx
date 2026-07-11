import { useState } from 'react'
import type { PointerEvent } from 'react'
import type { RunnerCombatant } from './encounterRunner'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CopyIcon,
  GripIcon,
  MinusIcon,
  PlusIcon,
  ShieldIcon,
  SkullIcon,
  TrashIcon,
} from '../../components/icons'
import './CombatantCard.css'

export type HpTier = 'healthy' | 'bloodied' | 'critical' | 'down'

export function hpTier(hpCurrent: number | null | undefined, hpMax: number | null | undefined): HpTier {
  if (hpCurrent == null || hpCurrent <= 0) return 'down'
  if (!hpMax || hpMax <= 0) return 'healthy'
  const pct = hpCurrent / hpMax
  if (pct <= 0.25) return 'critical'
  if (pct <= 0.5) return 'bloodied'
  return 'healthy'
}

const STATUS_OPTIONS = ['alive', 'unconscious', 'dead', 'fled'] as const

interface CombatantCardProps {
  combatant: RunnerCombatant
  isActive: boolean
  index: number
  count: number
  onAdjustHp: (delta: number) => void
  onSetHp: (hp: number) => void
  onSetStatus: (status: string) => void
  onRename: (name: string) => void
  onDuplicate: () => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onSetActive: () => void
  onDragHandlePointerDown: (event: PointerEvent) => void
}

export function CombatantCard({
  combatant,
  isActive,
  index,
  count,
  onAdjustHp,
  onSetHp,
  onSetStatus,
  onRename,
  onDuplicate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onSetActive,
  onDragHandlePointerDown,
}: CombatantCardProps) {
  const [isSetOpen, setIsSetOpen] = useState(false)
  const [setValue, setSetValue] = useState('')

  const hpMax = combatant.hp_max ?? null
  const hpCurrent = combatant.hp_current ?? 0
  const tier = hpTier(combatant.hp_current, hpMax)
  const pct = hpMax && hpMax > 0 ? Math.max(0, Math.min(100, (hpCurrent / hpMax) * 100)) : 100

  const applySet = () => {
    const value = Number(setValue)
    if (Number.isFinite(value)) onSetHp(value)
    setSetValue('')
    setIsSetOpen(false)
  }

  return (
    <div
      className={`combatant-card combatant-card-${tier} ${isActive ? 'active' : ''}`}
      data-testid={`combatant-card-${combatant.clientId}`}
    >
      {isActive && <span className="combatant-card-on-deck">On deck</span>}

      <div className="combatant-card-header">
        <button
          type="button"
          className="combatant-drag-handle"
          style={{ touchAction: 'none' }}
          onPointerDown={onDragHandlePointerDown}
          aria-label={`Drag to reorder ${combatant.name || 'combatant'}`}
        >
          <GripIcon size={20} aria-hidden />
        </button>

        <div className="combatant-reorder-buttons">
          <button
            type="button"
            className="combatant-reorder-button"
            onClick={onMoveUp}
            disabled={index === 0}
            aria-label={`Move ${combatant.name || 'combatant'} up`}
          >
            <ChevronUpIcon size={16} aria-hidden />
          </button>
          <button
            type="button"
            className="combatant-reorder-button"
            onClick={onMoveDown}
            disabled={index === count - 1}
            aria-label={`Move ${combatant.name || 'combatant'} down`}
          >
            <ChevronDownIcon size={16} aria-hidden />
          </button>
        </div>

        <input
          className="combatant-name-input"
          value={combatant.name ?? ''}
          onChange={(e) => onRename(e.target.value)}
          aria-label="Combatant name"
        />

        <span className="combatant-ac">
          <ShieldIcon size={14} aria-hidden />
          {combatant.ac ?? '—'}
        </span>

        <button
          type="button"
          className={`combatant-active-toggle ${isActive ? 'active' : ''}`}
          onClick={onSetActive}
          aria-pressed={isActive}
        >
          {isActive ? 'Active' : 'Set active'}
        </button>

        <button type="button" className="combatant-icon-button" onClick={onDuplicate} aria-label="Duplicate combatant">
          <CopyIcon size={18} aria-hidden />
        </button>
        <button
          type="button"
          className="combatant-icon-button combatant-remove"
          onClick={onRemove}
          aria-label="Remove combatant"
        >
          <TrashIcon size={18} aria-hidden />
        </button>
      </div>

      <div className="combatant-status-chips" role="group" aria-label="Status">
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            type="button"
            className={`combatant-status-chip combatant-status-${status} ${combatant.status === status ? 'selected' : ''}`}
            onClick={() => onSetStatus(status)}
            aria-pressed={combatant.status === status}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="combatant-hp-row">
        <div className="combatant-hp-meter" role="img" aria-label={`${hpCurrent} of ${hpMax ?? '?'} hit points`}>
          <div className="combatant-hp-meter-fill" style={{ width: `${pct}%` }} />
          <div className="combatant-hp-meter-label">
            {tier === 'down' && <SkullIcon size={18} aria-hidden />}
            <span className="combatant-hp-number">{hpCurrent}</span>
            <span className="combatant-hp-max"> / {hpMax ?? '?'}</span>
          </div>
        </div>
      </div>

      <div className="combatant-stepper-rail">
        <div className="combatant-stepper-group">
          <button type="button" className="combatant-stepper" onClick={() => onAdjustHp(-10)} aria-label="Damage 10">
            <MinusIcon size={14} aria-hidden />10
          </button>
          <button type="button" className="combatant-stepper" onClick={() => onAdjustHp(-2)} aria-label="Damage 2">
            <MinusIcon size={14} aria-hidden />2
          </button>
          <button type="button" className="combatant-stepper" onClick={() => onAdjustHp(-1)} aria-label="Damage 1">
            <MinusIcon size={14} aria-hidden />1
          </button>
        </div>
        <div className="combatant-stepper-group">
          <button type="button" className="combatant-stepper" onClick={() => onAdjustHp(1)} aria-label="Heal 1">
            <PlusIcon size={14} aria-hidden />1
          </button>
          <button type="button" className="combatant-stepper" onClick={() => onAdjustHp(2)} aria-label="Heal 2">
            <PlusIcon size={14} aria-hidden />2
          </button>
          <button type="button" className="combatant-stepper" onClick={() => onAdjustHp(10)} aria-label="Heal 10">
            <PlusIcon size={14} aria-hidden />10
          </button>
        </div>
        <div className="combatant-set-wrap">
          <button type="button" className="combatant-set-toggle" onClick={() => setIsSetOpen((v) => !v)}>
            Set…
          </button>
          {isSetOpen && (
            <div className="combatant-set-popover">
              <label className="visually-hidden" htmlFor={`set-hp-${combatant.clientId}`}>
                Set HP
              </label>
              <input
                id={`set-hp-${combatant.clientId}`}
                type="number"
                className="combatant-set-input"
                value={setValue}
                onChange={(e) => setSetValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applySet()}
                autoFocus
              />
              <button type="button" className="combatant-set-apply" onClick={applySet}>
                Apply
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
