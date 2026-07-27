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

  it('marks the selected floor slab', () => {
    render(<FloorPicker floors={floors} selectedZ={0} onSelectFloor={() => {}} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).not.toHaveClass('player-floor-slab--selected')
    expect(buttons[1]).toHaveClass('player-floor-slab--selected')
    expect(buttons[2]).not.toHaveClass('player-floor-slab--selected')
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

  it('provides accessible labels including optional title', () => {
    render(<FloorPicker floors={floors} selectedZ={0} onSelectFloor={() => {}} />)
    expect(screen.getByLabelText('Floor -1 — Basement')).toBeInTheDocument()
    expect(screen.getByLabelText('Floor 0 — Ground Floor')).toBeInTheDocument()
    expect(screen.getByLabelText('Floor 1')).toBeInTheDocument()
  })
})
