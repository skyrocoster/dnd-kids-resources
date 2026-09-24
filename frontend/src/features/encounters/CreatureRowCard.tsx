import type { Condition, Monster } from '../../api/types'
import { Disclosure } from '../../components/Disclosure'
import { SelectField } from '../../components/form/SelectField'
import { TextField } from '../../components/form/TextField'
import { ToggleGroup } from '../../components/form/ToggleGroup'
import { IconButton } from '../../components/IconButton'
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
  const displayName = row.name || 'Unnamed creature'
  const hpSummary = row.hpCurrent || row.hpMax ? `${row.hpCurrent || '?'} / ${row.hpMax || '?'} HP` : 'No HP set'

  return (
    <div className="creature-row-card" data-variant="monster">
      <div className="creature-row-header">
        <Disclosure
          className="creature-row-disclosure"
          open={!collapsed}
          onOpenChange={onToggleCollapsed}
          summary={
            <>
              {collapsed ? <ChevronDownIcon size={18} aria-hidden /> : <ChevronUpIcon size={18} aria-hidden />}
              <span className="creature-row-name">{displayName}</span>
            </>
          }
        >
          <div className="creature-row-body">
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
                <ToggleGroup
                  className="creature-row-status-chips"
                  aria-label="Status"
                  multiple={false}
                  value={[row.status]}
                  options={STATUS_OPTIONS.map((status) => ({
                    value: status,
                    ariaLabel: status,
                    label: <span className={`creature-row-status-chip creature-row-status-${status}`}>{status}</span>,
                  }))}
                  onValueChange={(values) => {
                    const status = STATUS_OPTIONS.find((option) => option === values[0])
                    if (status) onChange({ status })
                  }}
                />
              </div>
            </div>

            <ConditionPicker
              conditions={conditions}
              selected={row.conditions}
              onChange={(next) => onChange({ conditions: next })}
            />
          </div>
        </Disclosure>

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

        <IconButton
          label={`Remove ${displayName}`}
          className="creature-row-icon-button creature-row-remove"
          onClick={onRemove}
        >
          <TrashIcon size={18} aria-hidden />
        </IconButton>
      </div>
    </div>
  )
}
