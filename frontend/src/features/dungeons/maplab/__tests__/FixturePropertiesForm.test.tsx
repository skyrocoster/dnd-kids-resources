import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FixturePropertiesForm } from '../FixturePropertiesForm'
import { FIXTURE_TYPES } from '../fixtureTypes'

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
      'encounter',
      'other',
    ])

    fireEvent.change(select, { target: { value: 'mirror' } })
    expect(onChange).toHaveBeenCalledWith('kind', 'mirror')
  })
})
