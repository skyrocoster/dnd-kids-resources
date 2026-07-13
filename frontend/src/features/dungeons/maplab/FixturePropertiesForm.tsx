import { useEffect, useState } from 'react'
import { listEncounters } from '../../../api/client'
import type { Encounter } from '../../../api/types'
import type { FieldSpec, FixtureTypeSpec } from './fixtureTypes'

interface FixturePropertiesFormProps {
  spec: FixtureTypeSpec
  values: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

/** Renders any `FieldSpec[]` generically — boolean fields as toggles, number/text as inputs,
 * honoring each field's `showWhen` gate. Doors are the only registered fixture type today; a
 * future `window`/`chest` entry in `FIXTURE_TYPES` renders through this same component with no
 * form rewrite, per the Phase D registry seam. */
export function FixturePropertiesForm({ spec, values, onChange }: FixturePropertiesFormProps) {
  return (
    <div className="maplab-fixture-form">
      {spec.fields
        .filter((field) => !field.showWhen || field.showWhen(values))
        .map((field) => (
          <FixtureField key={field.key} field={field} value={values[field.key]} onChange={onChange} />
        ))}
    </div>
  )
}

function FixtureField({
  field,
  value,
  onChange,
}: {
  field: FieldSpec
  value: unknown
  onChange: (key: string, value: unknown) => void
}) {
  const inputId = `maplab-field-${field.key}`

  if (field.type === 'boolean') {
    return (
      <label className="maplab-field-row" htmlFor={inputId}>
        <span>{field.label}</span>
        <input
          id={inputId}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(field.key, event.target.checked)}
        />
      </label>
    )
  }

  if (field.type === 'select') {
    return (
      <label className="maplab-field-row" htmlFor={inputId}>
        <span>{field.label}</span>
        <select
          id={inputId}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(field.key, event.target.value)}
        >
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    )
  }

  if (field.type === 'encounterPicker') {
    return <EncounterPickerField inputId={inputId} field={field} value={value} onChange={onChange} />
  }

  if (field.type === 'number') {
    return (
      <label className="maplab-field-row" htmlFor={inputId}>
        <span>{field.label}</span>
        <input
          id={inputId}
          type="number"
          value={typeof value === 'number' ? value : ''}
          onChange={(event) => onChange(field.key, event.target.value === '' ? undefined : Number(event.target.value))}
        />
      </label>
    )
  }

  return (
    <label className="maplab-field-row" htmlFor={inputId}>
      <span>{field.label}</span>
      <input
        id={inputId}
        type="text"
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(field.key, event.target.value)}
      />
    </label>
  )
}

/** Attaches an encounter to a marker by title rather than a raw id — a custom picker (not the
 * generic `select`) because its options come from the live encounter list, not a static
 * `SelectOption[]`. */
function EncounterPickerField({
  inputId,
  field,
  value,
  onChange,
}: {
  inputId: string
  field: FieldSpec
  value: unknown
  onChange: (key: string, value: unknown) => void
}) {
  const [encounters, setEncounters] = useState<Encounter[]>([])

  useEffect(() => {
    listEncounters()
      .then(setEncounters)
      .catch(() => setEncounters([]))
  }, [])

  const selected = typeof value === 'number' ? String(value) : ''

  return (
    <label className="maplab-field-row" htmlFor={inputId}>
      <span>{field.label}</span>
      <select
        id={inputId}
        value={selected}
        onChange={(event) => onChange(field.key, event.target.value === '' ? null : Number(event.target.value))}
      >
        <option value="">No encounter</option>
        {encounters.map((encounter) => (
          <option key={encounter.id} value={encounter.id}>
            {encounter.title}
          </option>
        ))}
      </select>
    </label>
  )
}
