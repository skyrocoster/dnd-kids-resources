import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../../api/client'
import type { LoomThread } from '../../../api/types'
import { LoomThreadManager } from '../LoomThreadManager'

const threads: LoomThread[] = [
  { id: 1, name: 'The Lost Puppy', color: 'thread-3' },
  { id: 2, name: 'Goblin Trouble', color: 'thread-1' },
]

describe('LoomThreadManager', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('lists existing threads', () => {
    render(<LoomThreadManager threads={threads} onClose={() => {}} onChanged={() => {}} />)
    expect(screen.getByText('The Lost Puppy')).toBeInTheDocument()
    expect(screen.getByText('Goblin Trouble')).toBeInTheDocument()
  })

  it('creates a new thread with the selected color', async () => {
    const createLoomThread = vi
      .spyOn(api, 'createLoomThread')
      .mockResolvedValue({ id: 3, name: 'New Thread', color: 'thread-2' })
    const onChanged = vi.fn()
    const user = userEvent.setup()
    render(<LoomThreadManager threads={threads} onClose={() => {}} onChanged={onChanged} />)

    await user.click(screen.getByRole('button', { name: 'New Thread' }))
    await user.type(screen.getByLabelText('Name'), 'New Thread')
    await user.click(screen.getByRole('radio', { name: 'thread-2' }))
    await user.click(screen.getByRole('button', { name: 'Create Thread' }))

    await waitFor(() => expect(createLoomThread).toHaveBeenCalledOnce())
    expect(createLoomThread).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'New Thread', color: 'thread-2' }),
    )
    expect(onChanged).toHaveBeenCalled()
  })

  it('renames and recolors an existing thread', async () => {
    const updateLoomThread = vi
      .spyOn(api, 'updateLoomThread')
      .mockResolvedValue({ id: 1, name: 'Renamed', color: 'thread-4' })
    const user = userEvent.setup()
    render(<LoomThreadManager threads={threads} onClose={() => {}} onChanged={() => {}} />)

    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0])
    const nameField = screen.getByLabelText('Name')
    await user.clear(nameField)
    await user.type(nameField, 'Renamed')
    await user.click(screen.getByRole('radio', { name: 'thread-4' }))
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() =>
      expect(updateLoomThread).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'Renamed', color: 'thread-4' })),
    )
  })

  it('deletes a thread after confirmation', async () => {
    const deleteLoomThread = vi.spyOn(api, 'deleteLoomThread').mockResolvedValue(undefined)
    const onChanged = vi.fn()
    const user = userEvent.setup()
    render(<LoomThreadManager threads={threads} onClose={() => {}} onChanged={onChanged} />)

    await user.click(screen.getByRole('button', { name: 'Delete The Lost Puppy' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(deleteLoomThread).toHaveBeenCalledWith(1))
    expect(onChanged).toHaveBeenCalled()
  })
})
