import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Card } from '../Card'
import { DiceText } from '../DiceText'

describe('Card', () => {
  it('renders title, subtitle, and tag', () => {
    render(<Card title="Fireball" subtitle="3rd-level evocation" tag="Evocation" variant="spell" />)
    expect(screen.getByText('Fireball')).toBeInTheDocument()
    expect(screen.getByText('3rd-level evocation')).toBeInTheDocument()
    expect(screen.getByText('Evocation')).toBeInTheDocument()
  })

  it('applies the variant as a data attribute for accent theming', () => {
    const { container } = render(<Card title="Owlbear" variant="monster" />)
    expect(container.querySelector('.card')).toHaveAttribute('data-variant', 'monster')
  })

  it('renders children in the body and composes with DiceText', () => {
    render(
      <Card title="Fireball" variant="spell">
        <DiceText text="Deals 8d6 fire damage." />
      </Card>,
    )
    expect(screen.getByText(/fire damage/)).toBeInTheDocument()
  })

  it('renders an optional footer', () => {
    render(<Card title="Longsword" variant="weapon" footer="Requires proficiency" />)
    expect(screen.getByText('Requires proficiency')).toBeInTheDocument()
  })

  // VF2: Card migrates its radius values onto the foundation token scale
  it('consumes the radius tokens for its outer and tag corners', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const css = readFileSync(resolve(process.cwd(), 'src/components/Card.css'), 'utf-8')
    const cardRule = css.match(/\.card\s*\{([^}]*)\}/)?.[1] ?? ''
    expect(cardRule).toContain('border-radius: var(--radius-lg)')
    const tagRule = css.match(/\.card-tag\s*\{([^}]*)\}/)?.[1] ?? ''
    expect(tagRule).toContain('border-radius: var(--radius-full)')
  })
})
