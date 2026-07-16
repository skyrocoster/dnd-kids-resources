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

  it('moves focus to the dialog on open', () => {
    render(
      <Dialog
        open
        title="Confirm"
        onClose={vi.fn()}
        footer={<button type="button">First action</button>}
      >
        <p>Content</p>
      </Dialog>,
    )
    expect(screen.getByRole('button', { name: 'First action' })).toHaveFocus()
  })

  it('focuses the dialog itself when no focusable content exists', () => {
    render(
      <Dialog open title="Confirm" onClose={vi.fn()}>
        <p>Content</p>
      </Dialog>,
    )
    expect(screen.getByRole('dialog')).toHaveFocus()
  })

  it('traps focus within the dialog', async () => {
    const user = userEvent.setup()
    render(
      <Dialog
        open
        title="Confirm"
        onClose={vi.fn()}
        footer={
          <>
            <button type="button">Cancel</button>
            <button type="button">Confirm</button>
          </>
        }
      >
        <p>Content</p>
      </Dialog>,
    )
    const cancel = screen.getByRole('button', { name: 'Cancel' })
    const confirm = screen.getByRole('button', { name: 'Confirm' })
    expect(cancel).toHaveFocus()

    await user.tab()
    expect(confirm).toHaveFocus()

    await user.tab()
    expect(cancel).toHaveFocus()

    await user.tab({ shift: true })
    expect(confirm).toHaveFocus()
  })

  it('closes on Escape key press', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Dialog open title="Confirm" onClose={onClose}>
        <p>Content</p>
      </Dialog>,
    )
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('does not close on Escape while pending', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Dialog open title="Confirm" onClose={onClose} pending>
        <p>Content</p>
      </Dialog>,
    )
    await user.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('restores focus to the trigger element on close', () => {
    const trigger = document.createElement('button')
    trigger.textContent = 'Open dialog'
    document.body.appendChild(trigger)
    trigger.focus()
    expect(trigger).toHaveFocus()

    const { rerender } = render(
      <Dialog open title="Confirm" onClose={vi.fn()}>
        <p>Content</p>
      </Dialog>,
    )
    expect(trigger).not.toHaveFocus()

    rerender(
      <Dialog open={false} title="Confirm" onClose={vi.fn()}>
        <p>Content</p>
      </Dialog>,
    )
    expect(trigger).toHaveFocus()
    trigger.remove()
  })

  it('disables buttons and interactive elements when pending is true', () => {
    render(
      <Dialog
        open
        title="Confirm"
        onClose={vi.fn()}
        pending
        footer={
          <>
            <button type="button">Cancel</button>
            <button type="button">Confirm</button>
          </>
        }
      >
        <p>Content</p>
      </Dialog>,
    )
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled()
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-busy', 'true')
  })

  it('associates description text via aria-describedby', () => {
    render(
      <Dialog open title="Confirm" description="This cannot be undone." onClose={vi.fn()}>
        <p>Content</p>
      </Dialog>,
    )
    const dialog = screen.getByRole('dialog')
    const descId = dialog.getAttribute('aria-describedby')
    expect(descId).toBeTruthy()
    expect(screen.getByText('This cannot be undone.')).toHaveAttribute('id', descId as string)
  })

  it('renders footer slot with actions', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    render(
      <Dialog
        open
        title="Confirm"
        onClose={vi.fn()}
        footer={<button type="button" onClick={onAction}>Do it</button>}
      >
        <p>Content</p>
      </Dialog>,
    )
    await user.click(screen.getByRole('button', { name: 'Do it' }))
    expect(onAction).toHaveBeenCalled()
  })
})
