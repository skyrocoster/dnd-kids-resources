import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SelectField } from '../SelectField'

const options = [
  { value: 'evocation', label: 'Evocation' },
  { value: 'necromancy', label: 'Necromancy' },
]

describe('SelectField', () => {
  it('renders all options and a placeholder', () => {
    render(<SelectField label="School" options={options} placeholder="Choose a school" value="" onChange={() => {}} />)
    expect(screen.getByText('Evocation')).toBeInTheDocument()
    expect(screen.getByText('Necromancy')).toBeInTheDocument()
    expect(screen.getByText('Choose a school')).toBeInTheDocument()
  })

  it('calls onChange when a new option is selected', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SelectField label="School" options={options} value="" onChange={onChange} />)
    await user.selectOptions(screen.getByLabelText('School'), 'necromancy')
    expect(onChange).toHaveBeenCalled()
  })
})
