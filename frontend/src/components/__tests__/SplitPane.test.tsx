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
})
