import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Condition } from '../../../api/types'
import { AddPlayerPanel } from '../AddPlayerPanel'

const conditions: Condition[] = [
  { id: 1, name: 'Prone' },
  { id: 2, name: 'Poisoned' },
  { id: 3, name: 'Stunned' },
]

describe('AddPlayerPanel', () => {
  it('renders the panel with name field and condition picker', () => {
    render(<AddPlayerPanel conditions={conditions} onAdd={() => {}} onClose={() => {}} />)

    expect(screen.getByText('Add player')).toBeInTheDocument()
    const close = screen.getByRole('button', { name: 'Close add player panel' })
    expect(close).toHaveAttribute('type', 'button')
    expect(close).toHaveClass('icon-btn', 'add-player-panel-close')
    expect(screen.getByPlaceholderText('Enter player name…')).toBeInTheDocument()
    expect(screen.getByText('No conditions')).toBeInTheDocument()
    const cancel = screen.getByRole('button', { name: 'Cancel' })
    expect(cancel).toHaveAttribute('type', 'button')
    expect(cancel).toHaveClass('btn', 'btn--secondary', 'btn--normal', 'add-player-panel-cancel')
    const add = screen.getByRole('button', { name: 'Add' })
    expect(add).toHaveAttribute('type', 'button')
    expect(add).toHaveClass('btn', 'btn--primary', 'btn--normal', 'add-player-panel-add')
    expect(add).toBeDisabled()
  })

  it('enables Add when a name is entered', () => {
    render(<AddPlayerPanel conditions={conditions} onAdd={() => {}} onClose={() => {}} />)

    fireEvent.change(screen.getByPlaceholderText('Enter player name…'), { target: { value: 'Frodo' } })
    expect(screen.getByRole('button', { name: 'Add' })).not.toBeDisabled()
  })

  it('disables Add when name is only whitespace', () => {
    render(<AddPlayerPanel conditions={conditions} onAdd={() => {}} onClose={() => {}} />)

    fireEvent.change(screen.getByPlaceholderText('Enter player name…'), { target: { value: '   ' } })
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
  })

  it('calls onAdd with trimmed name and no conditions when Add is clicked', () => {
    const onAdd = vi.fn()
    render(<AddPlayerPanel conditions={conditions} onAdd={onAdd} onClose={() => {}} />)

    fireEvent.change(screen.getByPlaceholderText('Enter player name…'), { target: { value: '  Frodo  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(onAdd).toHaveBeenCalledWith('Frodo', undefined)
  })

  it('includes selected conditions in onAdd', () => {
    const onAdd = vi.fn()
    render(<AddPlayerPanel conditions={conditions} onAdd={onAdd} onClose={() => {}} />)

    fireEvent.change(screen.getByPlaceholderText('Enter player name…'), { target: { value: 'Frodo' } })
    fireEvent.click(screen.getByText('No conditions'))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Prone' }))

    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(onAdd).toHaveBeenCalledWith('Frodo', ['Prone'])
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    render(<AddPlayerPanel conditions={conditions} onAdd={() => {}} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'Close add player panel' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn()
    render(<AddPlayerPanel conditions={conditions} onAdd={() => {}} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('submits on Enter key', () => {
    const onAdd = vi.fn()
    render(<AddPlayerPanel conditions={conditions} onAdd={onAdd} onClose={() => {}} />)

    const input = screen.getByPlaceholderText('Enter player name…')
    fireEvent.change(input, { target: { value: 'Gandalf' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onAdd).toHaveBeenCalledWith('Gandalf', undefined)
  })

  it('does not submit on Enter when name is empty', () => {
    const onAdd = vi.fn()
    render(<AddPlayerPanel conditions={conditions} onAdd={onAdd} onClose={() => {}} />)

    const input = screen.getByPlaceholderText('Enter player name…')
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onAdd).not.toHaveBeenCalled()
  })

  it('closes condition picker and calls onAdd with multiple conditions', () => {
    const onAdd = vi.fn()
    render(<AddPlayerPanel conditions={conditions} onAdd={onAdd} onClose={() => {}} />)

    fireEvent.change(screen.getByPlaceholderText('Enter player name…'), { target: { value: 'Frodo' } })
    fireEvent.click(screen.getByText('No conditions'))

    fireEvent.click(screen.getByRole('checkbox', { name: 'Prone' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Poisoned' }))

    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(onAdd).toHaveBeenCalledWith('Frodo', ['Prone', 'Poisoned'])
  })
})
