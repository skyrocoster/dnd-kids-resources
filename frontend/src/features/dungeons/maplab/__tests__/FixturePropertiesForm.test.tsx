import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FixturePropertiesForm } from '../FixturePropertiesForm'
import { FIXTURE_TYPES } from '../fixtureTypes'
import type { MapLayout } from '../maplabModel'

describe('FixturePropertiesForm', () => {
  it('renders a select field with the kind options and dispatches on change', () => {
    const onChange = vi.fn()
    render(
      <FixturePropertiesForm
        spec={FIXTURE_TYPES.prop}
        values={{ kind: 'chest', hidden: false, locked: false, trapped: false }}
        onChange={onChange}
      />,
    )

    const select = screen.getByLabelText('Kind') as HTMLSelectElement
    expect(select.tagName).toBe('SELECT')
    expect(Array.from(select.options).map((o) => o.value)).toEqual([
      'chest',
      'table',
      'mirror',
      'barrel',
      'statue',
      'window',
      'encounter',
      'other',
    ])

    fireEvent.change(select, { target: { value: 'mirror' } })
    expect(onChange).toHaveBeenCalledWith('kind', 'mirror')
  })

  describe('DestinationPickerField (stair/portal)', () => {
    const layout: MapLayout = {
      meta: { cellSizeFt: 5, padding: 0 },
      rooms: [
        { room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0], [1, 0]] },
        { room_id: 2, z: 1, origin: [0, 0], cells: [[3, 3]] },
      ],
      doors: [],
      stairs: [],
      floors: [
        { z: 0, title: 'Ground Floor' },
        { z: 1, title: 'First Floor' },
      ],
      props: [],
      portals: [],
    }

    it('renders a floor select and a room select populated from the layout', () => {
      render(
        <FixturePropertiesForm
          spec={FIXTURE_TYPES.portal}
          values={{ title: '', to: { z: 0, cell: [0, 0] }, hidden: false, locked: false, trapped: false }}
          onChange={vi.fn()}
          layout={layout}
        />,
      )
      const floorSelect = screen.getByLabelText('Floor') as HTMLSelectElement
      expect(Array.from(floorSelect.options).map((o) => o.textContent)).toEqual(['Ground Floor', 'First Floor'])

      const roomSelect = screen.getByLabelText('Room') as HTMLSelectElement
      expect(Array.from(roomSelect.options).map((o) => o.textContent)).toEqual(['Select a room…', 'Room 1'])
    })

    it("switching the floor swaps which floor's rooms are offered", () => {
      render(
        <FixturePropertiesForm
          spec={FIXTURE_TYPES.portal}
          values={{ title: '', to: { z: 0, cell: [0, 0] }, hidden: false, locked: false, trapped: false }}
          onChange={vi.fn()}
          layout={layout}
        />,
      )
      expect(Array.from((screen.getByLabelText('Room') as HTMLSelectElement).options).map((o) => o.textContent)).toEqual([
        'Select a room…',
        'Room 1',
      ])

      const floorSelect = screen.getByLabelText('Floor') as HTMLSelectElement
      fireEvent.change(floorSelect, { target: { value: '1' } })
      expect(Array.from((screen.getByLabelText('Room') as HTMLSelectElement).options).map((o) => o.textContent)).toEqual([
        'Select a room…',
        'Room 2',
      ])
    })

    it('selecting a room sets the destination to a free cell inside that room', () => {
      const onChange = vi.fn()
      vi.spyOn(Math, 'random').mockReturnValue(0)
      render(
        <FixturePropertiesForm
          spec={FIXTURE_TYPES.portal}
          values={{ title: '', to: { z: 0, cell: [0, 0] }, hidden: false, locked: false, trapped: false }}
          onChange={onChange}
          layout={layout}
        />,
      )
      fireEvent.change(screen.getByLabelText('Room'), { target: { value: '1' } })
      expect(onChange).toHaveBeenCalledWith('to', { z: 0, cell: [0, 0] })
      vi.restoreAllMocks()
    })

    it('renders nothing when no layout is supplied', () => {
      const { container } = render(
        <FixturePropertiesForm
          spec={FIXTURE_TYPES.portal}
          values={{ title: '', to: { z: 0, cell: [0, 0] }, hidden: false, locked: false, trapped: false }}
          onChange={vi.fn()}
        />,
      )
      expect(container.querySelector('select#maplab-field-to')).toBeNull()
    })
  })
})
