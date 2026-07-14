import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DiceText } from '../DiceText'

describe('DiceText', () => {
  it('renders plain text with no dice notation unchanged', () => {
    render(<DiceText text="A bolt of fire streaks toward a target." />)
    expect(screen.getByText('A bolt of fire streaks toward a target.')).toBeInTheDocument()
  })

  it('wraps dice notation in a pill', () => {
    const { container } = render(<DiceText text="Deals 8d6 fire damage." />)
    const pill = container.querySelector('.dice-pill')
    expect(pill).not.toBeNull()
    expect(pill).toHaveTextContent('8d6')
  })

  it('handles dice notation with a modifier', () => {
    const { container } = render(<DiceText text="You gain 2d6+3 hit points." />)
    expect(container.querySelector('.dice-pill')).toHaveTextContent('2d6+3')
  })

  it('handles multiple dice expressions in one string', () => {
    const { container } = render(<DiceText text="Roll 1d20 to hit, then 2d6 damage." />)
    const pills = container.querySelectorAll('.dice-pill')
    expect(pills).toHaveLength(2)
    expect(pills[0]).toHaveTextContent('1d20')
    expect(pills[1]).toHaveTextContent('2d6')
  })

  it('normalizes whitespace inside a modifier', () => {
    const { container } = render(<DiceText text="Deals 1d8 + 2 slashing damage." />)
    expect(container.querySelector('.dice-pill')).toHaveTextContent('1d8+2')
  })

  it('prepends DiceIcon glyph to each pill', () => {
    const { container } = render(<DiceText text="Deals 8d6 fire damage." />)
    const pill = container.querySelector('.dice-pill')
    expect(pill?.querySelector('svg')).not.toBeNull()
  })

  it('applies data-variant from role prop', () => {
    const { container } = render(<DiceText text="4d10" role="spell" />)
    const wrapper = container.querySelector('.dice-text')
    expect(wrapper).toHaveAttribute('data-variant', 'spell')
  })

  it('omits data-variant when no role prop', () => {
    const { container } = render(<DiceText text="2d6" />)
    const wrapper = container.querySelector('.dice-text')
    expect(wrapper).not.toHaveAttribute('data-variant')
  })

  it('renders glyph for monster variant', () => {
    const { container } = render(<DiceText text="3d8+2" role="monster" />)
    const pill = container.querySelector('.dice-pill')
    expect(pill?.querySelector('svg')).not.toBeNull()
    expect(pill).toHaveTextContent('3d8+2')
  })

  it('renders glyph for weapon variant', () => {
    const { container } = render(<DiceText text="1d12" role="weapon" />)
    const pill = container.querySelector('.dice-pill')
    expect(pill?.querySelector('svg')).not.toBeNull()
    expect(pill).toHaveTextContent('1d12')
  })
})
