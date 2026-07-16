import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SplitPane } from '../SplitPane'

describe('SplitPane', () => {
  it('renders both panes', () => {
    render(<SplitPane left={<div>left content</div>} right={<div>right content</div>} />)
    expect(screen.getByText('left content')).toBeInTheDocument()
    expect(screen.getByText('right content')).toBeInTheDocument()
  })

  it('exposes an accessible resize separator', () => {
    render(<SplitPane left={<div>l</div>} right={<div>r</div>} leftLabel="spell list" />)
    expect(screen.getByRole('separator', { name: 'Resize spell list' })).toBeInTheDocument()
  })

  it('widens the left pane on ArrowRight and narrows on ArrowLeft', () => {
    render(<SplitPane left={<div>l</div>} right={<div>r</div>} defaultLeftWidth={280} />)
    const handle = screen.getByRole('separator')
    expect(handle).toHaveAttribute('aria-valuenow', '280')

    fireEvent.keyDown(handle, { key: 'ArrowRight' })
    expect(handle).toHaveAttribute('aria-valuenow', '296')

    fireEvent.keyDown(handle, { key: 'ArrowLeft' })
    fireEvent.keyDown(handle, { key: 'ArrowLeft' })
    expect(handle).toHaveAttribute('aria-valuenow', '264')
  })

  it('clamps to min/max width', () => {
    render(
      <SplitPane
        left={<div>l</div>}
        right={<div>r</div>}
        defaultLeftWidth={180}
        minLeftWidth={180}
        maxLeftWidth={220}
      />,
    )
    const handle = screen.getByRole('separator')
    fireEvent.keyDown(handle, { key: 'ArrowLeft' })
    expect(handle).toHaveAttribute('aria-valuenow', '180')

    fireEvent.keyDown(handle, { key: 'End' })
    expect(handle).toHaveAttribute('aria-valuenow', '220')

    fireEvent.keyDown(handle, { key: 'Home' })
    expect(handle).toHaveAttribute('aria-valuenow', '180')
  })

  // VF2: pointer hit target is wider than the visible divider, without changing its width
  it('expands the pointer hit target without widening the visible divider', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const css = readFileSync(resolve(process.cwd(), 'src/components/SplitPane.css'), 'utf-8')
    const handleRule = css.match(/\.split-pane-handle\s*\{([^}]*)\}/)?.[1] ?? ''
    expect(handleRule).toContain('width: 4px')
    const hitTargetRule = css.match(/\.split-pane-handle::before\s*\{([^}]*)\}/)?.[1] ?? ''
    expect(hitTargetRule).toContain('position: absolute')
  })
})
