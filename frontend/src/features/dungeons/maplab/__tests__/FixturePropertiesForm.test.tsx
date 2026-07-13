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

    it('renders a floor select populated from the layout', () => {
      render(
        <FixturePropertiesForm
          spec={FIXTURE_TYPES.portal}
          values={{ title: '', to: { z: 0, cell: [0, 0] }, hidden: false, locked: false, trapped: false }}
          onChange={vi.fn()}
          layout={layout}
        />,
      )
      const select = screen.getByLabelText('Destination') as HTMLSelectElement
      expect(Array.from(select.options).map((o) => o.textContent)).toEqual(['Ground Floor', 'First Floor'])
    })

    it('switching the floor swaps which floor\'s cells render', () => {
      render(
        <FixturePropertiesForm
          spec={FIXTURE_TYPES.portal}
          values={{ title: '', to: { z: 0, cell: [0, 0] }, hidden: false, locked: false, trapped: false }}
          onChange={vi.fn()}
          layout={layout}
        />,
      )
      expect(screen.getAllByRole('button', { name: /on floor 0/ })).toHaveLength(2)

      const select = screen.getByLabelText('Destination') as HTMLSelectElement
      fireEvent.change(select, { target: { value: '1' } })
      expect(screen.getAllByRole('button', { name: /on floor 1/ })).toHaveLength(1)
    })

    it('clicking a cell sets the destination to that floor + cell', () => {
      const onChange = vi.fn()
      render(
        <FixturePropertiesForm
          spec={FIXTURE_TYPES.portal}
          values={{ title: '', to: { z: 0, cell: [0, 0] }, hidden: false, locked: false, trapped: false }}
          onChange={onChange}
          layout={layout}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: 'Set destination to 1, 0 on floor 0' }))
      expect(onChange).toHaveBeenCalledWith('to', { z: 0, cell: [1, 0] })
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
