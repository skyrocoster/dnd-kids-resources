import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { SplitPane } from '../SplitPane'

const STORAGE_KEY = 'test-browser-rail'

function StatefulLeft() {
  const [value, setValue] = useState('')
  return (
    <label>
      Filter
      <input value={value} onChange={(event) => setValue(event.target.value)} />
    </label>
  )
}

describe('SplitPane', () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY)
    vi.restoreAllMocks()
  })

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

  it('collapses and restores the left rail with labelled icon controls', async () => {
    const user = userEvent.setup()
    render(
      <SplitPane
        left={<div>list content</div>}
        right={<div>detail content</div>}
        leftLabel="spell list"
        collapsible
        storageKey={STORAGE_KEY}
      />,
    )

    const collapseButton = screen.getByRole('button', { name: 'Collapse spell list' })
    expect(collapseButton).toHaveAttribute('type', 'button')
    await user.click(collapseButton)

    expect(screen.queryByRole('separator')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Restore spell list' })).toHaveFocus()
    expect(screen.getByText('list content')).toBeInTheDocument()
    expect(window.localStorage.getItem(STORAGE_KEY)).toContain('"collapsed":true')

    const restoreButton = screen.getByRole('button', { name: 'Restore spell list' })
    expect(restoreButton).toHaveAttribute('type', 'button')
    await user.click(restoreButton)

    expect(screen.getByRole('separator', { name: 'Resize spell list' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Collapse spell list' })).toHaveFocus()
  })

  it('persists the expanded width and restores it on remount', () => {
    const { unmount } = render(
      <SplitPane
        left={<div>l</div>}
        right={<div>r</div>}
        defaultLeftWidth={280}
        collapsible
        storageKey={STORAGE_KEY}
      />,
    )

    fireEvent.keyDown(screen.getByRole('separator'), { key: 'ArrowRight' })
    expect(window.localStorage.getItem(STORAGE_KEY)).toContain('"leftWidth":296')

    unmount()
    render(
      <SplitPane
        left={<div>l</div>}
        right={<div>r</div>}
        defaultLeftWidth={280}
        collapsible
        storageKey={STORAGE_KEY}
      />,
    )

    expect(screen.getByRole('separator')).toHaveAttribute('aria-valuenow', '296')
  })

  it('preserves mounted child state while collapsed', async () => {
    const user = userEvent.setup()
    render(
      <SplitPane
        left={<StatefulLeft />}
        right={<div>detail</div>}
        leftLabel="item list"
        collapsible
        storageKey={STORAGE_KEY}
      />,
    )

    await user.type(screen.getByLabelText('Filter'), 'rope')
    await user.click(screen.getByRole('button', { name: 'Collapse item list' }))
    await user.click(screen.getByRole('button', { name: 'Restore item list' }))

    expect(screen.getByLabelText('Filter')).toHaveValue('rope')
  })

  it('falls back to in-memory collapse state when storage write fails', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })
    const user = userEvent.setup()
    render(
      <SplitPane
        left={<div>list</div>}
        right={<div>detail</div>}
        leftLabel="monster list"
        collapsible
        storageKey={STORAGE_KEY}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Collapse monster list' }))

    expect(screen.getByRole('button', { name: 'Restore monster list' })).toBeInTheDocument()
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
