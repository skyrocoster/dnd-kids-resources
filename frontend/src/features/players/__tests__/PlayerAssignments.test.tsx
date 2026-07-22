import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ManageAssignmentsDialog } from '../PlayerAssignments'

interface Item {
  id: number
  name: string
}

const items: Item[] = [
  { id: 1, name: 'Fireball' },
  { id: 2, name: 'Acid Splash' },
  { id: 3, name: 'Mage Hand' },
]

describe('ManageAssignmentsDialog', () => {
  it('renders the catalog sorted alphabetically with assigned items pre-checked', () => {
    render(
      <ManageAssignmentsDialog
        title="Manage Spells"
        items={items}
        assignedIds={[1]}
        getId={(i: Item) => i.id}
        getLabel={(i: Item) => i.name}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    const labels = screen.getAllByRole('checkbox').map((el) => el.closest('label')?.textContent)
    expect(labels).toEqual(['Acid Splash', 'Fireball', 'Mage Hand'])
    expect(screen.getByLabelText('Fireball')).toBeChecked()
    expect(screen.getByLabelText('Acid Splash')).not.toBeChecked()
  })

  it('filters items by the search box', async () => {
    const user = userEvent.setup()
    render(
      <ManageAssignmentsDialog
        title="Manage Spells"
        items={items}
        assignedIds={[]}
        getId={(i: Item) => i.id}
        getLabel={(i: Item) => i.name}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    await user.type(screen.getByPlaceholderText('Search…'), 'acid')
    expect(screen.getByLabelText('Acid Splash')).toBeInTheDocument()
    expect(screen.queryByLabelText('Fireball')).not.toBeInTheDocument()
  })

  it('stages checkbox toggles and commits the full id list once on Save', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <ManageAssignmentsDialog
        title="Manage Spells"
        items={items}
        assignedIds={[1]}
        getId={(i: Item) => i.id}
        getLabel={(i: Item) => i.name}
        onSave={onSave}
        onClose={onClose}
      />,
    )

    await user.click(screen.getByLabelText('Acid Splash'))
    expect(onSave).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce())
    expect(onSave.mock.calls[0][0].sort()).toEqual([1, 2])
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  })

  it('discards staged changes and makes no API call on Cancel', async () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <ManageAssignmentsDialog
        title="Manage Spells"
        items={items}
        assignedIds={[1]}
        getId={(i: Item) => i.id}
        getLabel={(i: Item) => i.name}
        onSave={onSave}
        onClose={onClose}
      />,
    )

    await user.click(screen.getByLabelText('Acid Splash'))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows a save error inline and keeps the dialog open for retry', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Unable to save'))
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <ManageAssignmentsDialog
        title="Manage Spells"
        items={items}
        assignedIds={[]}
        getId={(i: Item) => i.id}
        getLabel={(i: Item) => i.name}
        onSave={onSave}
        onClose={onClose}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Unable to save')
    expect(onClose).not.toHaveBeenCalled()
  })
})
