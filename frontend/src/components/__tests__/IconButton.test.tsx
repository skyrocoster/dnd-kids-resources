import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { IconButton } from '../IconButton'

describe('IconButton', () => {
  it('renders with an accessible label', () => {
    render(
      <IconButton label="Close">
        <span aria-hidden="true">×</span>
      </IconButton>,
    )
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <IconButton label="Delete" onClick={onClick}>
        <span aria-hidden="true">×</span>
      </IconButton>,
    )
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onClick).toHaveBeenCalled()
  })

  it('defaults type to button', () => {
    render(
      <IconButton label="Menu">
        <span aria-hidden="true">≡</span>
      </IconButton>,
    )
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('type', 'button')
  })

  // VF1: focus-visible ring uses foundation token
  it('shows focus-visible ring using --md-primary token', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const css = readFileSync(resolve(process.cwd(), 'src/components/IconButton.css'), 'utf-8')
    const focusRule = css.match(/\.icon-btn:focus-visible\s*\{([^}]*)\}/)?.[1] ?? ''
    expect(focusRule).toContain('var(--md-primary)')
  })

  // VF2: touch target is at least 48x48px
  it('button has 48px minimum width and height', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const css = readFileSync(resolve(process.cwd(), 'src/components/IconButton.css'), 'utf-8')
    const rule = css.match(/\.icon-btn\s*\{([^}]*)\}/)?.[1] ?? ''
    expect(rule).toContain('width: var(--control-height)')
    expect(rule).toContain('height: var(--control-height)')
  })
})
