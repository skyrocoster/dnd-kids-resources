import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Dialog } from '../Dialog'

describe('Dialog', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <Dialog open={false} title="Confirm" onClose={vi.fn()}>
        <p>Content</p>
      </Dialog>,
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders title and children when open', () => {
    render(
      <Dialog open title="Confirm" onClose={vi.fn()}>
        <p>Are you sure?</p>
      </Dialog>,
    )
    expect(screen.getByRole('dialog', { name: 'Confirm' })).toBeInTheDocument()
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
  })

  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Dialog open title="Confirm" onClose={onClose}>
        <p>Content</p>
      </Dialog>,
    )
    await user.click(screen.getByRole('presentation'))
    expect(onClose).toHaveBeenCalled()
  })

  // VF3: initial focus moves into the dialog
  it.skip('moves focus to the dialog on open', () => {})

  // VF3: Tab/Shift+Tab focus is contained within the dialog
  it.skip('traps focus within the dialog', () => {})

  // VF3: Escape dismisses the dialog when allowed
  it.skip('closes on Escape key press', () => {})

  // VF3: focus returns to the trigger element after close
  it.skip('restores focus to the trigger element on close', () => {})

  // VF3: pending state disables interactive elements
  it.skip('disables buttons and interactive elements when pending is true', () => {})

  // VF3: description is associated via aria-describedby
  it.skip('associates description text via aria-describedby', () => {})

  // VF3: footer renders actions below the body
  it.skip('renders footer slot with actions', () => {})
})
