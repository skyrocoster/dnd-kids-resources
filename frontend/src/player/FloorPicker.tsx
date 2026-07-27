import type { MapFloor } from '../model/maplabModel'

interface FloorPickerProps {
  floors: MapFloor[]
  selectedZ: number
  onSelectFloor: (z: number) => void
}

export function FloorPicker({ floors, selectedZ, onSelectFloor }: FloorPickerProps) {
  return (
    <nav className="player-floor-picker" aria-label="Floors">
      {floors.map((floor) => (
        <button
          key={floor.z}
          className={
            'player-floor-slab' +
            (floor.z === selectedZ ? ' player-floor-slab--selected' : '')
          }
          aria-label={`Floor ${floor.z}${floor.title ? ` — ${floor.title}` : ''}`}
          aria-pressed={floor.z === selectedZ}
          onClick={() => onSelectFloor(floor.z)}
        >
          {floor.z}
        </button>
      ))}
    </nav>
  )
}
