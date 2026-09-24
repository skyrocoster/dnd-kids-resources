import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ChangeEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { CheckboxField } from '../CheckboxField'

describe('CheckboxField', () => {
  it('keeps checked state controlled and forwards a real React change event', async () => {
    const user = userEvent.setup()
    const observedEvent: {
      target: EventTarget | null
      currentTarget: EventTarget | null
      type: string
      nativeEvent: Event | null
      checked: boolean | null
    } = {
      target: null,
      currentTarget: null,
      type: '',
      nativeEvent: null,
      checked: null,
    }
    const onChange = vi.fn((event: ChangeEvent<HTMLInputElement>) => {
      observedEvent.target = event.target
      observedEvent.currentTarget = event.currentTarget
      observedEvent.type = event.type
      observedEvent.nativeEvent = event.nativeEvent
      observedEvent.checked = event.currentTarget.checked
    })

    render(<CheckboxField label="Concentration" checked={false} onChange={onChange} />)
    const checkbox = screen.getByRole('checkbox', { name: 'Concentration' })

    await user.click(checkbox)

    expect(onChange).toHaveBeenCalledOnce()
    expect(observedEvent.target).toBe(checkbox)
    expect(observedEvent.currentTarget).toBe(checkbox)
    expect(observedEvent.type).toBe('change')
    expect(observedEvent.nativeEvent).toBeInstanceOf(Event)
    expect(observedEvent.checked).toBe(true)
    expect(checkbox).toHaveProperty('checked', false)
  })

  it('allows its default checked state to change when uncontrolled', async () => {
    const user = userEvent.setup()
    render(<CheckboxField label="Ritual" defaultChecked />)
    const checkbox = screen.getByRole('checkbox', { name: 'Ritual' })

    expect(checkbox).toHaveProperty('checked', true)
    await user.click(checkbox)
    expect(checkbox).toHaveProperty('checked', false)
  })

  it('retains its associated label and presentation classes', () => {
    const { container } = render(<CheckboxField label="Verbal component" defaultChecked />)
    const checkbox = screen.getByRole('checkbox', { name: 'Verbal component' }) as HTMLInputElement
    const label = screen.getByText('Verbal component', { selector: 'label' }) as HTMLLabelElement

    expect(checkbox.type).toBe('checkbox')
    expect(label.htmlFor).toBe(checkbox.id)
    expect(label.control).toBe(checkbox)
    expect(container.firstElementChild?.className).toBe('form-field form-field-checkbox')
    expect(checkbox.className).toBe('form-checkbox')
    expect(label.className).toBe('form-label form-label-checkbox')
  })

  it('does not toggle or emit a change when disabled', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<CheckboxField label="Disabled option" checked={false} disabled onChange={onChange} />)
    const checkbox = screen.getByRole('checkbox', { name: 'Disabled option' })

    await user.click(checkbox)

    expect(checkbox).toHaveProperty('disabled', true)
    expect(checkbox).toHaveProperty('checked', false)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('participates in its associated form with native name, value, and required behavior', () => {
    render(
      <>
        <form aria-label="Spell form" id="spell-form" />
        <CheckboxField
          label="Ritual"
          form="spell-form"
          name="ritual"
          value="yes"
          required
          defaultChecked
        />
      </>,
    )
    const form = screen.getByRole('form', { name: 'Spell form' }) as HTMLFormElement
    const checkbox = screen.getByRole('checkbox', { name: 'Ritual' }) as HTMLInputElement

    expect(checkbox.form).toBe(form)
    expect(checkbox.name).toBe('ritual')
    expect(checkbox.value).toBe('yes')
    expect(checkbox.required).toBe(true)
    expect(checkbox.checkValidity()).toBe(true)
    expect(new FormData(form).get('ritual')).toBe('yes')
  })
})
