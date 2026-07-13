import { useEffect, useMemo, useState } from 'react'
import { listEncounters } from '../../../api/client'
import type { Encounter } from '../../../api/types'
import type { FieldSpec, FixtureTypeSpec } from './fixtureTypes'
import { absoluteCells, floorsInLayout, roomsOnZ, type MapCell, type MapLayout } from './maplabModel'

interface FixturePropertiesFormProps {
  spec: FixtureTypeSpec
  values: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  /** Only required when `spec.fields` includes a `destinationPicker` field (stairs/portals) — the
   * floor list and room geometry it renders come from the live layout, not a static option list. */
  layout?: MapLayout
}

/** Renders any `FieldSpec[]` generically — boolean fields as toggles, number/text as inputs,
 * honoring each field's `showWhen` gate. Doors are the only registered fixture type today; a
 * future `window`/`chest` entry in `FIXTURE_TYPES` renders through this same component with no
 * form rewrite, per the Phase D registry seam. */
export function FixturePropertiesForm({ spec, values, onChange, layout }: FixturePropertiesFormProps) {
  return (
    <div className="maplab-fixture-form">
      {spec.fields
        .filter((field) => !field.showWhen || field.showWhen(values))
        .map((field) => (
          <FixtureField key={field.key} field={field} value={values[field.key]} onChange={onChange} layout={layout} />
        ))}
    </div>
  )
}

function FixtureField({
  field,
  value,
  onChange,
  layout,
}: {
  field: FieldSpec
  value: unknown
  onChange: (key: string, value: unknown) => void
  layout?: MapLayout
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

  if (field.type === 'destinationPicker') {
    return <DestinationPickerField inputId={inputId} field={field} value={value} onChange={onChange} layout={layout} />
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

const DESTINATION_PICKER_CELL_SIZE = 16

function isDestinationValue(value: unknown): value is { z: number; cell: MapCell } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'z' in value &&
    'cell' in value &&
    Array.isArray((value as { cell: unknown }).cell)
  )
}

/** Picks a stair/portal destination as a floor + exact cell: a `<select>` for the floor, then a
 * read-only mini floor-plan of that floor's rooms where clicking a cell sets `{z, cell}`. Modeled
 * on `EncounterPickerField`'s seam (its own labeled field row) but sources its options from the
 * live layout rather than an API call, since floors/rooms are already loaded into editor state. */
function DestinationPickerField({
  inputId,
  field,
  value,
  onChange,
  layout,
}: {
  inputId: string
  field: FieldSpec
  value: unknown
  onChange: (key: string, value: unknown) => void
  layout?: MapLayout
}) {
  const destination = isDestinationValue(value) ? value : null
  const floors = useMemo(() => (layout ? floorsInLayout(layout) : []), [layout])
  const [pickerZ, setPickerZ] = useState<number>(destination?.z ?? floors[0]?.z ?? 0)

  const roomsOnPickerFloor = useMemo(
    () => (layout ? roomsOnZ(layout, pickerZ) : []),
    [layout, pickerZ]
  )
  const pickerCells = useMemo(
    () => roomsOnPickerFloor.flatMap((room) => absoluteCells(room)),
    [roomsOnPickerFloor]
  )
  const pickerBounds = useMemo(() => {
    if (pickerCells.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
    const xs = pickerCells.map(([x]) => x)
    const ys = pickerCells.map(([, y]) => y)
    return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
  }, [pickerCells])

  if (!layout) return null

  const viewBoxWidth = (pickerBounds.maxX - pickerBounds.minX + 1) * DESTINATION_PICKER_CELL_SIZE
  const viewBoxHeight = (pickerBounds.maxY - pickerBounds.minY + 1) * DESTINATION_PICKER_CELL_SIZE

  return (
    <div className="maplab-field-row maplab-destination-picker">
      <label htmlFor={inputId}>{field.label}</label>
      <select
        id={inputId}
        value={pickerZ}
        onChange={(event) => setPickerZ(Number(event.target.value))}
      >
        {floors.map((floor) => (
          <option key={floor.z} value={floor.z}>
            {floor.title ?? `Floor ${floor.z}`}
          </option>
        ))}
      </select>
      <svg
        className="maplab-destination-picker-map"
        viewBox={`${pickerBounds.minX * DESTINATION_PICKER_CELL_SIZE} ${pickerBounds.minY * DESTINATION_PICKER_CELL_SIZE} ${viewBoxWidth} ${viewBoxHeight}`}
        role="group"
        aria-label={`Pick a cell on floor ${pickerZ}`}
      >
        {pickerCells.map(([x, y]) => {
          const isTarget = destination !== null && destination.z === pickerZ && destination.cell[0] === x && destination.cell[1] === y
          return (
            <rect
              key={`${x}-${y}`}
              className="maplab-destination-picker-cell"
              data-selected={isTarget || undefined}
              x={x * DESTINATION_PICKER_CELL_SIZE}
              y={y * DESTINATION_PICKER_CELL_SIZE}
              width={DESTINATION_PICKER_CELL_SIZE}
              height={DESTINATION_PICKER_CELL_SIZE}
              role="button"
              aria-label={`Set destination to ${x}, ${y} on floor ${pickerZ}`}
              onClick={() => onChange(field.key, { z: pickerZ, cell: [x, y] })}
            />
          )
        })}
      </svg>
      {destination && (
        <span className="maplab-destination-picker-summary">
          {`Floor ${destination.z}, cell ${destination.cell[0]}, ${destination.cell[1]}`}
        </span>
      )}
    </div>
  )
}
