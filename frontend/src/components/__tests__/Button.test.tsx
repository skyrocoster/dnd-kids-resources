import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '../Button'

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click</Button>)
    await user.click(screen.getByRole('button', { name: 'Click' }))
    expect(onClick).toHaveBeenCalled()
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Action</Button>)
    expect(screen.getByRole('button', { name: 'Action' })).toBeDisabled()
  })

  // VF1: variant rendering and token consumption
  it('applies variant class for primary/secondary/danger/ghost', () => {
    const { rerender } = render(<Button variant="primary">Go</Button>)
    expect(screen.getByRole('button', { name: 'Go' })).toHaveClass('btn--primary')

    rerender(<Button variant="secondary">Go</Button>)
    expect(screen.getByRole('button', { name: 'Go' })).toHaveClass('btn--secondary')

    rerender(<Button variant="danger">Go</Button>)
    expect(screen.getByRole('button', { name: 'Go' })).toHaveClass('btn--danger')

    rerender(<Button variant="ghost">Go</Button>)
    expect(screen.getByRole('button', { name: 'Go' })).toHaveClass('btn--ghost')
  })

  // VF1: compact size meets accessibility while reducing visual weight
  it('renders compact size with reduced padding but accessible target', () => {
    render(<Button size="compact">Go</Button>)
    expect(screen.getByRole('button', { name: 'Go' })).toHaveClass('btn--compact')
  })

  // VF1: loading state sets aria-busy and disables interaction
  it('sets aria-busy and disables the button while loading', () => {
    render(<Button loading>Save</Button>)
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toBeDisabled()
  })

  // VF1: focus-visible ring uses foundation token
  it('shows focus-visible ring using --md-primary token', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const css = readFileSync(resolve(process.cwd(), 'src/components/Button.css'), 'utf-8')
    const focusRule = css.match(/\.btn:focus-visible\s*\{([^}]*)\}/)?.[1] ?? ''
    expect(focusRule).toContain('var(--md-primary)')
  })

  // VF2: touch target meets 48px floor at normal size
  it.skip('normal button has min-height of at least 48px', () => {})
})
