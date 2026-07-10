import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MultiSelectField } from '../MultiSelectField'

const options = [
  { value: 'wizard', label: 'Wizard' },
  { value: 'sorcerer', label: 'Sorcerer' },
]

describe('MultiSelectField', () => {
  it('renders a checkbox per option, checked per the selected list', () => {
    render(<MultiSelectField label="Classes" options={options} selected={['wizard']} onChange={() => {}} />)
    expect(screen.getByLabelText('Wizard')).toBeChecked()
    expect(screen.getByLabelText('Sorcerer')).not.toBeChecked()
  })

  it('adds a value when an unselected option is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<MultiSelectField label="Classes" options={options} selected={['wizard']} onChange={onChange} />)
    await user.click(screen.getByLabelText('Sorcerer'))
    expect(onChange).toHaveBeenCalledWith(['wizard', 'sorcerer'])
  })

  it('removes a value when a selected option is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<MultiSelectField label="Classes" options={options} selected={['wizard', 'sorcerer']} onChange={onChange} />)
    await user.click(screen.getByLabelText('Wizard'))
    expect(onChange).toHaveBeenCalledWith(['sorcerer'])
  })
})
