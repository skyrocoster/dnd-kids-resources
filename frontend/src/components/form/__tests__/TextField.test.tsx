import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TextField } from '../TextField'

describe('TextField', () => {
  it('renders an input associated with its label', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TextField label="Spell name" value="" onChange={onChange} />)
    const input = screen.getByLabelText('Spell name')
    await user.type(input, 'F')
    expect(onChange).toHaveBeenCalled()
  })

  it('renders a textarea when multiline', () => {
    render(<TextField label="Description" multiline value="" onChange={() => {}} />)
    expect(screen.getByLabelText('Description').tagName).toBe('TEXTAREA')
  })

  it('shows an error message and marks the field invalid', () => {
    render(<TextField label="Spell name" value="" onChange={() => {}} error="Required" />)
    expect(screen.getByText('Required')).toBeInTheDocument()
    expect(screen.getByLabelText('Spell name')).toHaveAttribute('aria-invalid', 'true')
  })
})
