import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FloatingWindow } from '../FloatingWindow'

describe('FloatingWindow', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('renders the title and children', () => {
    render(
      <FloatingWindow title="Kennels" storageKey="test-position" onClose={vi.fn()}>
        <p>Board content</p>
      </FloatingWindow>
    )

    expect(screen.getByRole('dialog', { name: 'Kennels' })).toBeInTheDocument()
    expect(screen.getByText('Board content')).toBeInTheDocument()
  })

  it('minimizes and restores, hiding the body while minimized', () => {
    render(
      <FloatingWindow title="Kennels" storageKey="test-position" onClose={vi.fn()}>
        <p>Board content</p>
      </FloatingWindow>
    )

    fireEvent.click(screen.getByLabelText('Minimize window'))
    expect(screen.queryByText('Board content')).not.toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Restore window'))
    expect(screen.getByText('Board content')).toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    render(
      <FloatingWindow title="Kennels" storageKey="test-position" onClose={onClose}>
        <p>Board content</p>
      </FloatingWindow>
    )

    fireEvent.click(screen.getByLabelText('Close window'))
    expect(onClose).toHaveBeenCalled()
  })

  it('drags via pointer events and persists the new position to sessionStorage', () => {
    const { unmount } = render(
      <FloatingWindow title="Kennels" storageKey="test-position" onClose={vi.fn()}>
        <p>Board content</p>
      </FloatingWindow>
    )

    const header = screen.getByRole('dialog', { name: 'Kennels' }).querySelector('.floating-window-header') as HTMLElement
    fireEvent.pointerDown(header, { clientX: 100, clientY: 100 })
    fireEvent.pointerMove(window, { clientX: 150, clientY: 180 })
    fireEvent.pointerUp(window, { clientX: 150, clientY: 180 })

    const stored = JSON.parse(sessionStorage.getItem('test-position') as string)
    expect(stored.x).toBe(24 + 50)
    expect(stored.y).toBe(24 + 80)

    unmount()

    render(
      <FloatingWindow title="Kennels" storageKey="test-position" onClose={vi.fn()}>
        <p>Board content</p>
      </FloatingWindow>
    )
    const dialog = screen.getByRole('dialog', { name: 'Kennels' })
    expect(dialog).toHaveStyle({ left: '74px', top: '104px' })
  })
})
