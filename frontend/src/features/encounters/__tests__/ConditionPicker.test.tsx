import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Condition } from '../../../api/types'
import { ConditionPicker } from '../ConditionPicker'

const conditions: Condition[] = [
  { id: 1, name: 'Poisoned' },
  { id: 2, name: 'Prone' },
]

describe('ConditionPicker', () => {
  it('is closed by default and opens on trigger click', async () => {
    render(<ConditionPicker conditions={conditions} selected={[]} onChange={() => {}} />)

    expect(screen.queryByLabelText('Poisoned')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /No conditions/ }))
    expect(screen.getByLabelText('Poisoned')).toBeInTheDocument()
  })

  it('closes on outside click', async () => {
    render(
      <div>
        <ConditionPicker conditions={conditions} selected={[]} onChange={() => {}} />
        <button type="button">outside</button>
      </div>,
    )

    await userEvent.click(screen.getByRole('button', { name: /No conditions/ }))
    expect(screen.getByLabelText('Poisoned')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'outside' }))
    expect(screen.queryByLabelText('Poisoned')).not.toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    render(<ConditionPicker conditions={conditions} selected={[]} onChange={() => {}} />)

    await userEvent.click(screen.getByRole('button', { name: /No conditions/ }))
    expect(screen.getByLabelText('Poisoned')).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByLabelText('Poisoned')).not.toBeInTheDocument()
  })

  it('calls onChange with the toggled condition', async () => {
    const onChange = vi.fn()
    render(<ConditionPicker conditions={conditions} selected={[]} onChange={onChange} />)

    await userEvent.click(screen.getByRole('button', { name: /No conditions/ }))
    await userEvent.click(screen.getByLabelText('Poisoned'))

    expect(onChange).toHaveBeenCalledWith(['Poisoned'])
  })

  it('renders a legacy/custom condition option', async () => {
    render(<ConditionPicker conditions={conditions} selected={['stunned (legacy)']} onChange={() => {}} />)

    await userEvent.click(screen.getByRole('button', { name: /stunned \(legacy\)/ }))
    expect(screen.getByLabelText('stunned (legacy) (custom)')).toBeChecked()
  })
})
