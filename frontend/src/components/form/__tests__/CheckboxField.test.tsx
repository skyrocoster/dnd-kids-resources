import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CheckboxField } from '../CheckboxField'

describe('CheckboxField', () => {
  it('renders a checkbox associated with its label', () => {
    render(<CheckboxField label="Concentration" checked={false} onChange={() => {}} />)
    expect(screen.getByLabelText('Concentration')).toHaveProperty('type', 'checkbox')
  })

  it('calls onChange when toggled', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<CheckboxField label="Ritual" checked={false} onChange={onChange} />)
    await user.click(screen.getByLabelText('Ritual'))
    expect(onChange).toHaveBeenCalled()
  })
})
