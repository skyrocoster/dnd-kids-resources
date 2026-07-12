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
