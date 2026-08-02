import { useEffect, useMemo, useState } from 'react'
import { listDungeons, listEncounters, listLootBundles, listNPCs } from '../../../api/client'
import type { Dungeon, Encounter, LootBundle, NPC } from '../../../api/types'
import type { FieldSpec, FixtureTypeSpec } from './fixtureTypes'
import { absoluteCells, floorsInLayout, markersAtCell, roomsOnZ, type MapCell, type MapLayout, type MapRoom } from '../../../model/maplabModel'

interface FixturePropertiesFormProps {
  spec: FixtureTypeSpec
  values: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  /** Only required when `spec.fields` includes a `destinationPicker` field (stairs/portals) — the
   * floor list and room geometry it renders come from the live layout, not a static option list. */
  layout?: MapLayout
  /** Only required for a `destinationPicker` field — excludes the current dungeon from the
   * "another dungeon" gateway picker's option list. */
  currentDungeonId?: number
}

/** Non-blocking warning copy for armed obstacles that are missing an authored DC — a DM may arm
 * an obstacle before its DCs are set ("arming without complete DCs is allowed but warns"), so the
 * form surfaces exactly which expected DCs are still unset rather than blocking the edit. */
function incompleteDcWarnings(values: Record<string, unknown>): string[] {
  const warnings: string[] = []
  if (values.locked === true) {
    if (values.breakDc === undefined) warnings.push('Locked: Break DC not set')
    if (values.pickDc === undefined) warnings.push('Locked: Pick Lock DC not set')
  }
  if (values.hidden === true) {
    if (values.hiddenDc === undefined) warnings.push('Hidden: Perception DC not set')
    if (values.searchDc === undefined) warnings.push('Hidden: Search DC not set')
  }
  if (values.trapped === true && values.searchDc === undefined) {
    warnings.push('Trapped: Search DC not set')
  }
  return warnings
}

/** Renders any `FieldSpec[]` generically — boolean fields as toggles, number/text as inputs,
 * honoring each field's `showWhen` gate. Doors are the only registered fixture type today; a
 * future `window`/`chest` entry in `FIXTURE_TYPES` renders through this same component with no
 * form rewrite, per the Phase D registry seam. */
export function FixturePropertiesForm({ spec, values, onChange, layout, currentDungeonId }: FixturePropertiesFormProps) {
  const dcWarnings = useMemo(() => incompleteDcWarnings(values), [values])
  return (
    <div className="maplab-fixture-form">
      {dcWarnings.length > 0 && (
        <div className="maplab-fixture-dc-warning">
          {dcWarnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      )}
      {spec.fields
        .filter((field) => !field.showWhen || field.showWhen(values))
        .map((field) => (
          <FixtureField
            key={field.key}
            field={field}
            value={values[field.key]}
            onChange={onChange}
            layout={layout}
            currentDungeonId={currentDungeonId}
          />
        ))}
    </div>
  )
}

function FixtureField({
  field,
  value,
  onChange,
  layout,
  currentDungeonId,
}: {
  field: FieldSpec
  value: unknown
  onChange: (key: string, value: unknown) => void
  layout?: MapLayout
  currentDungeonId?: number
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

  if (field.type === 'npcPicker') {
    return <NpcPickerField inputId={inputId} field={field} value={value} onChange={onChange} />
  }

  if (field.type === 'lootBundlePicker') {
    return <LootBundlePickerField inputId={inputId} field={field} value={value} onChange={onChange} />
  }

  if (field.type === 'destinationPicker') {
    return (
      <DestinationPickerField
        inputId={inputId}
        field={field}
        value={value}
        onChange={onChange}
        layout={layout}
        currentDungeonId={currentDungeonId}
      />
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

/** Attaches an NPC to a marker by name rather than a raw id — a custom picker (not the
 * generic `select`) because its options come from the live NPC list, not a static
 * `SelectOption[]`. */
function NpcPickerField({
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
  const [npcs, setNpcs] = useState<NPC[]>([])

  useEffect(() => {
    listNPCs()
      .then(setNpcs)
      .catch(() => setNpcs([]))
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
        <option value="">No NPC</option>
        {npcs.map((npc) => (
          <option key={npc.id} value={npc.id}>
            {npc.name}
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

function isGatewayValue(value: unknown): value is { dungeon_id: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'dungeon_id' in value &&
    typeof (value as { dungeon_id: unknown }).dungeon_id === 'number'
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
  currentDungeonId,
}: {
  inputId: string
  field: FieldSpec
  value: unknown
  onChange: (key: string, value: unknown) => void
  layout?: MapLayout
  currentDungeonId?: number
}) {
  const [mode, setMode] = useState<'here' | 'elsewhere'>(isGatewayValue(value) ? 'elsewhere' : 'here')

  if (!layout) return null

  return (
    <div className="maplab-field-row maplab-destination-picker" role="group" aria-label={field.label}>
      <div className="maplab-destination-mode" role="radiogroup" aria-label={`${field.label} scope`}>
        <label>
          <input
            type="radio"
            name={`${inputId}-mode`}
            checked={mode === 'here'}
            onChange={() => setMode('here')}
          />
          This dungeon
        </label>
        <label>
          <input
            type="radio"
            name={`${inputId}-mode`}
            checked={mode === 'elsewhere'}
            onChange={() => setMode('elsewhere')}
          />
          Another dungeon
        </label>
      </div>
      {mode === 'here' ? (
        <InDungeonDestinationPicker inputId={inputId} field={field} value={value} onChange={onChange} layout={layout} />
      ) : (
        <GatewayDestinationPicker inputId={inputId} field={field} value={value} onChange={onChange} currentDungeonId={currentDungeonId} />
      )}
    </div>
  )
}

function InDungeonDestinationPicker({
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
  layout: MapLayout
}) {
  const destination = isDestinationValue(value) ? value : null
  const floors = useMemo(() => floorsInLayout(layout), [layout])
  const [pickerZ, setPickerZ] = useState<number>(destination?.z ?? floors[0]?.z ?? 0)

  const roomsOnPickerFloor = useMemo(
    () => roomsOnZ(layout, pickerZ),
    [layout, pickerZ]
  )

  const destinationRoomId = useMemo(() => {
    if (!destination || destination.z !== pickerZ) return ''
    const room = roomsOnPickerFloor.find((candidate) =>
      absoluteCells(candidate).some(([x, y]) => x === destination.cell[0] && y === destination.cell[1]),
    )
    return room ? String(room.room_id) : ''
  }, [destination, pickerZ, roomsOnPickerFloor])

  function handleRoomChange(roomIdValue: string) {
    if (roomIdValue === '') return
    const room = roomsOnPickerFloor.find((candidate) => candidate.room_id === Number(roomIdValue))
    if (!room) return
    const cell = pickRandomCell(freeCellsInRoom(layout, pickerZ, room))
    onChange(field.key, { z: pickerZ, cell })
  }

  return (
    <>
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
    </>
  )
}

/** Picks another dungeon as a portal's gateway target — a plain dropdown of every dungeon except
 * the one being edited, producing `{ dungeon_id }`. This document has no access to the target
 * dungeon's layout, so unlike the in-dungeon picker there is no floor/room/cell to choose. */
function GatewayDestinationPicker({
  inputId,
  field,
  value,
  onChange,
  currentDungeonId,
}: {
  inputId: string
  field: FieldSpec
  value: unknown
  onChange: (key: string, value: unknown) => void
  currentDungeonId?: number
}) {
  const [dungeons, setDungeons] = useState<Dungeon[]>([])

  useEffect(() => {
    listDungeons()
      .then(setDungeons)
      .catch(() => setDungeons([]))
  }, [])

  const options = dungeons.filter((dungeon) => dungeon.id !== currentDungeonId)
  const selected = isGatewayValue(value) ? String(value.dungeon_id) : ''
  const selectedDungeon = isGatewayValue(value) ? dungeons.find((dungeon) => dungeon.id === value.dungeon_id) : undefined

  return (
    <>
      <label htmlFor={inputId}>Dungeon</label>
      <select
        id={inputId}
        value={selected}
        onChange={(event) => {
          if (event.target.value === '') return
          onChange(field.key, { dungeon_id: Number(event.target.value) })
        }}
      >
        <option value="">Select a dungeon…</option>
        {options.map((dungeon) => (
          <option key={dungeon.id} value={dungeon.id}>
            {dungeon.title}
          </option>
        ))}
      </select>
      {selected && (
        <span className="maplab-destination-picker-summary">
          {`Leaves to ${selectedDungeon?.title ?? 'another dungeon'}`}
        </span>
      )}
    </>
  )
}

/** Attaches a live loot bundle to a non-encounter prop, retaining its name as a display fallback
 * when the bundle is later unavailable. */
function LootBundlePickerField({
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
  const [bundles, setBundles] = useState<LootBundle[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    listLootBundles()
      .then((result) => {
        setBundles(result)
        setStatus('ready')
      })
      .catch(() => {
        setBundles([])
        setStatus('error')
      })
  }, [])

  const selected =
    typeof value === 'object' && value !== null && 'bundle_id' in value && typeof value.bundle_id === 'number'
      ? String(value.bundle_id)
      : ''

  function handleChange(bundleId: string) {
    if (bundleId === '') {
      onChange(field.key, null)
      return
    }

    const bundle = bundles.find((candidate) => candidate.id === Number(bundleId))
    if (bundle) onChange(field.key, { bundle_id: bundle.id, bundle_name: bundle.name })
  }

  return (
    <label className="maplab-field-row maplab-loot-bundle-picker" htmlFor={inputId}>
      <span className="maplab-loot-bundle-picker-label">{field.label}</span>
      <select id={inputId} value={selected} onChange={(event) => handleChange(event.target.value)}>
        <option value="">{status === 'loading' ? 'Loading loot bundles...' : 'No loot'}</option>
        {bundles.map((bundle) => (
          <option key={bundle.id} value={bundle.id}>
            {bundle.name}
          </option>
        ))}
      </select>
      {status === 'error' && <span className="maplab-loot-bundle-picker-status" role="status">Unable to load loot bundles.</span>}
      {status === 'ready' && bundles.length === 0 && (
        <span className="maplab-loot-bundle-picker-status">No loot bundles available.</span>
      )}
    </label>
  )
}
