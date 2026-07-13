import type { Condition, Monster } from '../../api/types'
import { SelectField } from '../../components/form/SelectField'
import { TextField } from '../../components/form/TextField'
import { ChevronDownIcon, ChevronUpIcon, ShieldIcon, TrashIcon } from '../../components/icons'
import { ConditionPicker } from './ConditionPicker'
import type { EncounterCreatureRow } from './encounterForm'
import './CreatureRowCard.css'

const STATUS_OPTIONS = ['alive', 'unconscious', 'dead', 'fled'] as const

interface CreatureRowCardProps {
  row: EncounterCreatureRow
  monsters: Monster[]
  conditions: Condition[]
  collapsed: boolean
  onToggleCollapsed: () => void
  onPickMonster: (monsterId: string) => void
  onChange: (fields: Partial<EncounterCreatureRow>) => void
  onRemove: () => void
}

export function CreatureRowCard({
  row,
  monsters,
  conditions,
  collapsed,
  onToggleCollapsed,
  onPickMonster,
  onChange,
  onRemove,
}: CreatureRowCardProps) {
  const panelId = `creature-row-panel-${row.id}`
  const displayName = row.name || 'Unnamed creature'
  const hpSummary = row.hpCurrent || row.hpMax ? `${row.hpCurrent || '?'} / ${row.hpMax || '?'} HP` : 'No HP set'

  return (
    <div className="creature-row-card" data-variant="monster">
      <div className="creature-row-header">
        <button
          type="button"
          className="creature-row-toggle"
          aria-expanded={!collapsed}
          aria-controls={panelId}
          onClick={onToggleCollapsed}
        >
          {collapsed ? <ChevronDownIcon size={18} aria-hidden /> : <ChevronUpIcon size={18} aria-hidden />}
          <span className="creature-row-name">{displayName}</span>
        </button>

        <span className="creature-row-summary-stat">
          <ShieldIcon size={14} aria-hidden />
          {row.ac || '—'}
        </span>
        <span className="creature-row-summary-stat">{hpSummary}</span>
        <span className={`creature-row-status-chip creature-row-status-${row.status}`}>{row.status}</span>
        {row.conditions.length > 0 && (
          <span className="creature-row-condition-count">
            {row.conditions.length} condition{row.conditions.length === 1 ? '' : 's'}
          </span>
        )}

        <button
          type="button"
          className="creature-row-icon-button creature-row-remove"
          onClick={onRemove}
          aria-label={`Remove ${displayName}`}
        >
          <TrashIcon size={18} aria-hidden />
        </button>
      </div>

      {!collapsed && (
        <div id={panelId} className="creature-row-body">
          <div className="creature-row-identity">
            <SelectField
              label="Monster"
              value={row.monsterId}
              onChange={(e) => onPickMonster(e.target.value)}
              options={monsters.map((m) => ({ value: String(m.id), label: m.name }))}
              placeholder="Choose a monster…"
            />
            <TextField label="Display Name" value={row.name} onChange={(e) => onChange({ name: e.target.value })} />
          </div>

          <div className="creature-row-stats">
            <TextField
              label="HP Current"
              type="number"
              value={row.hpCurrent}
              onChange={(e) => onChange({ hpCurrent: e.target.value })}
            />
            <TextField
              label="HP Max"
              type="number"
              value={row.hpMax}
              onChange={(e) => onChange({ hpMax: e.target.value })}
            />
            <TextField label="AC" type="number" value={row.ac} onChange={(e) => onChange({ ac: e.target.value })} />

            <div className="creature-row-status-field">
              <span className="form-label">Status</span>
              <div className="creature-row-status-chips" role="group" aria-label="Status">
                {STATUS_OPTIONS.map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={`creature-row-status-chip creature-row-status-${status} ${
                      row.status === status ? 'selected' : ''
                    }`}
                    onClick={() => onChange({ status })}
                    aria-pressed={row.status === status}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <ConditionPicker
            conditions={conditions}
            selected={row.conditions}
            onChange={(next) => onChange({ conditions: next })}
          />
        </div>
      )}
    </div>
  )
}
