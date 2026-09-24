import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FEATURE_KIND_OPTIONS, createEmptyMapLayout, type MapCell, type MapFeature, type MapStair } from '../../../../model/maplabModel'
import { MapLabEditorSelection } from '../MapLabEditorSelection'

const selectedFeature: MapFeature = {
  feature_id: 9,
  z: 0,
  kind: 'river',
  title: 'North stream',
  cells: [[2, 3]],
}

const selectedStair: MapStair = {
  stair_id: 5,
  from: { z: 0, cell: [3, 4] },
  to: { z: 1, cell: [3, 4] },
  hidden: false,
  locked: false,
  trapped: false,
  title: 'Stone stairs',
}

function selectionProps(selectionSheetExpanded = false) {
  return {
    selectionActions: <button type="button">Delete feature</button>,
    selectedItemName: 'North stream',
    selectionSheetExpanded,
    onToggleExpanded: vi.fn(),
    selectedFeature,
    selectedDoor: null,
    selectedRoom: null,
    selectedDungeonRoom: null,
    selectedProp: null,
    selectedStair: null,
    selectedStairCell: null,
    selectedPortal: null,
    stairUpFloor: null,
    stairDownFloor: null,
    hasStairInDirection: () => false,
    activeZ: 0,
    layout: createEmptyMapLayout(),
    updateFeatureMeta: vi.fn(),
    updateFixtureFlags: vi.fn(),
    updateRoomTitle: vi.fn(),
    updateRoomWallKind: vi.fn(),
    updateRoomEntries: vi.fn(),
    updateRoomNpcs: vi.fn(),
    createRoomData: vi.fn(),
    setStairDirection: vi.fn(),
    authoredInspectorAdapter: vi.fn(() => ({})),
    featureKindOptions: FEATURE_KIND_OPTIONS,
  }
}

function stairSelectionProps() {
  return {
    ...selectionProps(),
    selectedFeature: null,
    selectedStair,
    selectedStairCell: [5, 6] as MapCell,
    stairUpFloor: 2,
    stairDownFloor: 0,
    hasStairInDirection: vi.fn((direction: 'up' | 'down') => direction === 'up'),
    activeZ: 1,
  }
}

describe('MapLabEditorSelection selected feature fields', () => {
  it('keeps the current Kind options and Title values and reports string changes', () => {
    const props = selectionProps()
    render(<MapLabEditorSelection {...props} />)

    const kind = screen.getByLabelText('Kind') as HTMLSelectElement
    expect(kind.value).toBe('river')
    expect(Array.from(kind.options).map((option) => option.value)).toEqual(['river', 'trees'])
    expect(Array.from(kind.options).map((option) => option.textContent)).toEqual(['River', 'Trees'])
    expect(kind).toHaveClass('form-control')
    fireEvent.change(kind, { target: { value: 'trees' } })
    expect(props.updateFeatureMeta).toHaveBeenCalledWith(9, { kind: 'trees' })

    const title = screen.getByLabelText('Title') as HTMLInputElement
    expect(title.value).toBe('North stream')
    expect(title).toHaveClass('form-control')
    fireEvent.change(title, { target: { value: 'Pine grove' } })
    expect(props.updateFeatureMeta).toHaveBeenCalledWith(9, { title: 'Pine grove' })
  })

  it('preserves the native selection-sheet toggle, expanded state, and supplied actions', async () => {
    const user = userEvent.setup()
    const props = selectionProps()
    const { rerender } = render(<MapLabEditorSelection {...props} />)

    const sheet = screen.getByRole('complementary', { name: 'North stream editor' })
    expect(sheet).toHaveClass('maplab-inspector-rail', 'maplab-selection-sheet')
    expect(sheet).not.toHaveAttribute('data-expanded')
    expect(screen.getByRole('button', { name: 'Delete feature' })).toBeInTheDocument()

    const toggle = screen.getByRole('button', { name: 'Edit' })
    expect(toggle).toHaveAttribute('type', 'button')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAttribute('aria-controls', 'maplab-selection-sheet-content')
    fireEvent.click(toggle)
    expect(props.onToggleExpanded).toHaveBeenCalledOnce()

    toggle.focus()
    await user.keyboard('{Enter}')
    expect(props.onToggleExpanded).toHaveBeenCalledTimes(2)

    rerender(<MapLabEditorSelection {...props} selectionSheetExpanded />)
    expect(screen.getByRole('button', { name: 'Collapse editor' })).toHaveAttribute('aria-expanded', 'true')
    expect(sheet).toHaveAttribute('data-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Delete feature' })).toBeInTheDocument()
  })
})

describe('MapLabEditorSelection stair direction controls', () => {
  it('retains native floor-aware checkboxes, checked state, and the direction callback values', () => {
    const props = stairSelectionProps()
    render(<MapLabEditorSelection {...props} />)

    const up = screen.getByRole('checkbox', { name: 'Stairs up to floor 2' })
    const down = screen.getByRole('checkbox', { name: 'Stairs down to floor 0' })
    expect(up).toHaveAttribute('type', 'checkbox')
    expect(down).toHaveAttribute('type', 'checkbox')
    expect(up).toBeChecked()
    expect(down).not.toBeChecked()
    expect(up).toBeEnabled()
    expect(down).toBeEnabled()

    fireEvent.click(up)
    fireEvent.click(down)
    expect(props.setStairDirection).toHaveBeenNthCalledWith(1, 1, [5, 6], 'up', false)
    expect(props.setStairDirection).toHaveBeenNthCalledWith(2, 1, [5, 6], 'down', true)
  })

  it('keeps missing-floor labels and disables directions without a floor or selected stair cell', () => {
    const props = stairSelectionProps()
    const { rerender } = render(<MapLabEditorSelection {...props} stairUpFloor={null} />)

    const noUpperFloor = screen.getByRole('checkbox', { name: 'Stairs up (no floor above)' })
    const downToFloor = screen.getByRole('checkbox', { name: 'Stairs down to floor 0' })
    expect(noUpperFloor).toBeDisabled()
    expect(downToFloor).toBeEnabled()

    rerender(<MapLabEditorSelection {...props} selectedStairCell={null} />)
    expect(screen.getByRole('checkbox', { name: 'Stairs up to floor 2' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Stairs down to floor 0' })).toBeDisabled()
  })
})
