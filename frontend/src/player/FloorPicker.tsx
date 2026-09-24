import type { MapFloor } from '../model/maplabModel'
import { ToggleGroup } from '../components/form/ToggleGroup'

interface FloorPickerProps {
  floors: MapFloor[]
  selectedZ: number
  onSelectFloor: (z: number) => void
}

export function FloorPicker({ floors, selectedZ, onSelectFloor }: FloorPickerProps) {
  return (
    <nav className="player-floor-picker" aria-label="Floors">
      <ToggleGroup
        className="player-floor-picker__choices"
        orientation="vertical"
        multiple={false}
        value={[String(selectedZ)]}
        options={floors.map((floor) => ({
          value: String(floor.z),
          label: floor.z,
          ariaLabel: `Floor ${floor.z}${floor.title ? ` — ${floor.title}` : ''}`,
        }))}
        onValueChange={(values) => {
          const selectedValue = values[0]
          if (selectedValue !== undefined) onSelectFloor(Number(selectedValue))
        }}
      />
    </nav>
  )
}
