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

    expect(screen.queryByRole('checkbox', { name: 'Poisoned' })).not.toBeInTheDocument()

    const trigger = screen.getByRole('button', { name: /No conditions/ })
    await userEvent.click(trigger)
    expect(screen.getByRole('checkbox', { name: 'Poisoned' })).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Condition options' })).toBeInTheDocument()

    await userEvent.click(trigger)
    expect(screen.queryByRole('checkbox', { name: 'Poisoned' })).not.toBeInTheDocument()
  })

  it('closes on outside click', async () => {
    render(
      <div>
        <ConditionPicker conditions={conditions} selected={[]} onChange={() => {}} />
        <button type="button">outside</button>
      </div>,
    )

    await userEvent.click(screen.getByRole('button', { name: /No conditions/ }))
    expect(screen.getByRole('checkbox', { name: 'Poisoned' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'outside' }))
    expect(screen.queryByRole('checkbox', { name: 'Poisoned' })).not.toBeInTheDocument()
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    render(<ConditionPicker conditions={conditions} selected={[]} onChange={() => {}} />)

    const trigger = screen.getByRole('button', { name: /No conditions/ })
    await userEvent.click(trigger)
    expect(screen.getByRole('checkbox', { name: 'Poisoned' })).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('checkbox', { name: 'Poisoned' })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('calls onChange with the toggled condition', async () => {
    const onChange = vi.fn()
    render(<ConditionPicker conditions={conditions} selected={[]} onChange={onChange} />)

    await userEvent.click(screen.getByRole('button', { name: /No conditions/ }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Poisoned' }))

    expect(onChange).toHaveBeenCalledWith(['Poisoned'])
  })

  it('keeps checkbox state controlled by selected', async () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <ConditionPicker conditions={conditions} selected={['Poisoned']} onChange={onChange} />,
    )

    await userEvent.click(screen.getByRole('button', { name: /Poisoned/ }))
    const poisoned = screen.getByRole('checkbox', { name: 'Poisoned' })
    expect(poisoned).toBeChecked()

    await userEvent.click(poisoned)
    expect(onChange).toHaveBeenCalledWith([])
    expect(poisoned).toBeChecked()

    rerender(<ConditionPicker conditions={conditions} selected={[]} onChange={onChange} />)
    expect(screen.getByRole('checkbox', { name: 'Poisoned' })).not.toBeChecked()
  })

  it('renders a legacy/custom condition option', async () => {
    render(<ConditionPicker conditions={conditions} selected={['stunned (legacy)']} onChange={() => {}} />)

    await userEvent.click(screen.getByRole('button', { name: /stunned \(legacy\)/ }))
    expect(screen.getByRole('checkbox', { name: 'stunned (legacy) (custom)' })).toBeChecked()
  })
})
