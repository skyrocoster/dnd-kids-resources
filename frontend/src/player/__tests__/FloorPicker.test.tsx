import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FloorPicker } from '../FloorPicker'

describe('FloorPicker', () => {
  const floors = [
    { z: -1, title: 'Basement' },
    { z: 0, title: 'Ground Floor' },
    { z: 1 },
  ]

  it('renders floors in ascending z order', () => {
    render(<FloorPicker floors={floors} selectedZ={0} onSelectFloor={() => {}} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(3)
    expect(buttons[0]).toHaveTextContent('-1')
    expect(buttons[1]).toHaveTextContent('0')
    expect(buttons[2]).toHaveTextContent('1')
  })

  it('displays raw z numeral as label', () => {
    render(<FloorPicker floors={floors} selectedZ={0} onSelectFloor={() => {}} />)
    expect(screen.getByText('-1')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('styles the selected floor option as pressed', () => {
    render(<FloorPicker floors={floors} selectedZ={0} onSelectFloor={() => {}} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).not.toHaveAttribute('data-pressed')
    expect(buttons[1]).toHaveAttribute('data-pressed')
    expect(buttons[2]).not.toHaveAttribute('data-pressed')
  })

  it('sets aria-pressed on the selected floor', () => {
    render(<FloorPicker floors={floors} selectedZ={-1} onSelectFloor={() => {}} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true')
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'false')
    expect(buttons[2]).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onSelectFloor with the floor z when clicked', async () => {
    const onSelect = vi.fn()
    render(<FloorPicker floors={floors} selectedZ={0} onSelectFloor={onSelect} />)
    const buttons = screen.getAllByRole('button')

    await userEvent.click(buttons[0])
    expect(onSelect).toHaveBeenCalledWith(-1)

    await userEvent.click(buttons[2])
    expect(onSelect).toHaveBeenCalledWith(1)
  })

  it('keeps selection controlled by selectedZ', () => {
    const { rerender } = render(
      <FloorPicker floors={floors} selectedZ={0} onSelectFloor={() => {}} />,
    )
    expect(screen.getByRole('button', { name: 'Floor 0 — Ground Floor' })).toHaveAttribute('aria-pressed', 'true')

    rerender(<FloorPicker floors={floors} selectedZ={1} onSelectFloor={() => {}} />)
    expect(screen.getByRole('button', { name: 'Floor 0 — Ground Floor' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Floor 1' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('selects a floor with the vertical keyboard controls and reports a numeric z', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<FloorPicker floors={floors} selectedZ={0} onSelectFloor={onSelect} />)
    screen.getByRole('button', { name: 'Floor 0 — Ground Floor' }).focus()

    await user.keyboard('{ArrowDown}')
    await user.keyboard(' ')

    expect(screen.getByRole('button', { name: 'Floor 1' })).toHaveFocus()
    expect(onSelect).toHaveBeenCalledWith(1)
  })

  it('does not clear the controlled selection when the selected floor is toggled', async () => {
    const onSelect = vi.fn()
    render(<FloorPicker floors={floors} selectedZ={0} onSelectFloor={onSelect} />)
    const selectedFloor = screen.getByRole('button', { name: 'Floor 0 — Ground Floor' })
    await userEvent.click(selectedFloor)

    expect(selectedFloor).toHaveAttribute('aria-pressed', 'true')
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('provides accessible labels including optional title', () => {
    render(<FloorPicker floors={floors} selectedZ={0} onSelectFloor={() => {}} />)
    expect(screen.getByLabelText('Floor -1 — Basement')).toBeInTheDocument()
    expect(screen.getByLabelText('Floor 0 — Ground Floor')).toBeInTheDocument()
    expect(screen.getByLabelText('Floor 1')).toBeInTheDocument()
  })
})
