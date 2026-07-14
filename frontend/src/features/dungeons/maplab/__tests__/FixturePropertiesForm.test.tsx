import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import * as api from '../../../../api/client'
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

  describe('Phase M — Loot bundle picker', () => {
    it('shows bundle options and writes or clears prop.loot', async () => {
      vi.spyOn(api, 'listLootBundles').mockResolvedValue([
        { id: 12, name: 'Goblin Chest', gold: 25, contents: [] },
        { id: 24, name: 'Wizard Cache', gold: 50, contents: [] },
      ])
      const onChange = vi.fn()
      render(
        <FixturePropertiesForm
          spec={FIXTURE_TYPES.prop}
          values={{ kind: 'chest', hidden: false, locked: false, trapped: false }}
          onChange={onChange}
        />,
      )

      const select = await screen.findByLabelText('Loot bundle') as HTMLSelectElement
      expect(Array.from(select.options).map((option) => option.textContent)).toEqual([
        'No loot',
        'Goblin Chest',
        'Wizard Cache',
      ])

      fireEvent.change(select, { target: { value: '24' } })
      expect(onChange).toHaveBeenCalledWith('loot', { bundle_id: 24, bundle_name: 'Wizard Cache' })

      fireEvent.change(select, { target: { value: '' } })
      expect(onChange).toHaveBeenCalledWith('loot', null)
    })

    it('explains when no loot bundles can be loaded', async () => {
      vi.spyOn(api, 'listLootBundles').mockRejectedValue(new Error('Offline'))
      render(
        <FixturePropertiesForm
          spec={FIXTURE_TYPES.prop}
          values={{ kind: 'chest', hidden: false, locked: false, trapped: false }}
          onChange={vi.fn()}
        />,
      )

      expect(await screen.findByRole('status')).toHaveTextContent('Unable to load loot bundles.')
    })
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
