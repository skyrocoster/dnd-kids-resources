import { useEffect, useMemo, useState } from 'react'
import { listEncounters } from '../../../api/client'
import type { Encounter } from '../../../api/types'
import type { FieldSpec, FixtureTypeSpec } from './fixtureTypes'
import { absoluteCells, floorsInLayout, markersAtCell, roomsOnZ, type MapCell, type MapLayout, type MapRoom } from './maplabModel'

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

function isDestinationValue(value: unknown): value is { z: number; cell: MapCell } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'z' in value &&
    'cell' in value &&
    Array.isArray((value as { cell: unknown }).cell)
  )
}

/** Cells in `room` not already occupied by another marker (stair/portal/on-square prop) on floor
 * `z` — falls back to every cell in the room if all of them are already occupied (the grouped
 * marker layout supports up to `MAX_MARKERS_PER_CELL` sharing one cell anyway). */
function freeCellsInRoom(layout: MapLayout, z: number, room: MapRoom): MapCell[] {
  const cells = absoluteCells(room)
  const free = cells.filter((cell) => markersAtCell(layout, z, cell).length === 0)
  return free.length > 0 ? free : cells
}

function pickRandomCell(cells: MapCell[]): MapCell {
  return cells[Math.floor(Math.random() * cells.length)]
}

/** Picks a stair/portal destination as a floor + room: a `<select>` for the floor, then a
 * `<select>` for one of that floor's rooms. Choosing a room drops the marker on a random free
 * square inside it — the DM picks *where* narratively (which room), not a precise pixel, so this
 * replaces the earlier click-a-cell mini floor-plan (which rendered too small to use reliably).
 * Exact repositioning is deferred — see "Known debt" in `docs/dungeon_plan.md` for the planned
 * drag-to-reposition follow-up. */
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

  const destinationRoomId = useMemo(() => {
    if (!destination || destination.z !== pickerZ) return ''
    const room = roomsOnPickerFloor.find((candidate) =>
      absoluteCells(candidate).some(([x, y]) => x === destination.cell[0] && y === destination.cell[1]),
    )
    return room ? String(room.room_id) : ''
  }, [destination, pickerZ, roomsOnPickerFloor])

  if (!layout) return null

  function handleRoomChange(roomIdValue: string) {
    if (roomIdValue === '' || !layout) return
    const room = roomsOnPickerFloor.find((candidate) => candidate.room_id === Number(roomIdValue))
    if (!room) return
    const cell = pickRandomCell(freeCellsInRoom(layout, pickerZ, room))
    onChange(field.key, { z: pickerZ, cell })
  }

  return (
    <div className="maplab-field-row maplab-destination-picker" role="group" aria-label={field.label}>
      <label htmlFor={`${inputId}-floor`}>Floor</label>
      <select
        id={`${inputId}-floor`}
        value={pickerZ}
        onChange={(event) => setPickerZ(Number(event.target.value))}
      >
        {floors.map((floor) => (
          <option key={floor.z} value={floor.z}>
            {floor.title ?? `Floor ${floor.z}`}
          </option>
        ))}
      </select>
      <label htmlFor={inputId}>Room</label>
      <select
        id={inputId}
        value={destinationRoomId}
        onChange={(event) => handleRoomChange(event.target.value)}
      >
        <option value="">Select a room…</option>
        {roomsOnPickerFloor.map((room) => (
          <option key={room.room_id} value={room.room_id}>
            {room.title ?? `Room ${room.room_id}`}
          </option>
        ))}
      </select>
      {destination && (
        <span className="maplab-destination-picker-summary">
          {`Floor ${destination.z}, cell ${destination.cell[0]}, ${destination.cell[1]}`}
        </span>
      )}
    </div>
  )
}
