import { useId } from 'react'
import { DICE_COUNT_OPTIONS, DICE_TYPE_OPTIONS } from './constants'
import { formatDiceString, parseDiceString } from './dice'
import './DiceRollField.css'

interface DiceRollFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
}

export function DiceRollField({ label, value, onChange }: DiceRollFieldProps) {
  const id = useId()
  const { count, dieType, mod } = parseDiceString(value)

  const update = (patch: Partial<{ count: string; dieType: string; mod: string }>) => {
    onChange(formatDiceString({ count, dieType, mod, ...patch }))
  }

  return (
    <div className="form-field dice-roll-field">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <div className="dice-roll-group" id={id}>
        <select
          className="form-control dice-roll-count"
          aria-label={`${label} dice count`}
          value={count}
          onChange={(e) => update({ count: e.target.value })}
        >
          <option value="">—</option>
          {DICE_COUNT_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span className="dice-roll-sep">d</span>
        <select
          className="form-control dice-roll-type"
          aria-label={`${label} die type`}
          value={dieType}
          onChange={(e) => update({ dieType: e.target.value })}
        >
          <option value="">—</option>
          {DICE_TYPE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              d{n}
            </option>
          ))}
        </select>
        <input
          type="text"
          className="form-control dice-roll-mod"
          aria-label={`${label} modifier`}
          placeholder="+0"
          value={mod}
          onChange={(e) => update({ mod: e.target.value })}
        />
      </div>
    </div>
  )
}
