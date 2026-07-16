import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../../api/client'
import type { Player } from '../../../api/types'
import { PlayerEditor } from '../PlayerEditor'

describe('PlayerEditor', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('creates a player from the form fields', async () => {
    const created: Player = { id: 1, name: 'Aria' }
    const createPlayer = vi.spyOn(api, 'createPlayer').mockResolvedValue(created)
    const onSaved = vi.fn()
    const user = userEvent.setup()
    render(<PlayerEditor onClose={() => {}} onSaved={onSaved} />)

    await user.type(screen.getByLabelText('Name'), 'Aria')
    await user.click(screen.getByRole('button', { name: 'Create Player' }))

    await waitFor(() => expect(createPlayer).toHaveBeenCalledOnce())
    expect(createPlayer).toHaveBeenCalledWith(expect.objectContaining({ name: 'Aria' }))
    expect(onSaved).toHaveBeenCalledWith(created)
  })

  it('updates an existing player', async () => {
    const player: Player = { id: 4, name: 'Bram' }
    const updatePlayer = vi.spyOn(api, 'updatePlayer').mockResolvedValue(player)
    const user = userEvent.setup()
    render(<PlayerEditor player={player} onClose={() => {}} onSaved={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(updatePlayer).toHaveBeenCalledWith(4, expect.objectContaining({ name: 'Bram' })))
  })

  describe('Dialog contract', () => {
    it('renders with the expected title and focuses the first field', () => {
      render(<PlayerEditor onClose={() => {}} onSaved={() => {}} />)
      expect(screen.getByRole('dialog', { name: 'Add New Player' })).toBeInTheDocument()
      expect(screen.getByLabelText('Name')).toHaveFocus()
    })

    it('uses the player title when editing', () => {
      const player: Player = { id: 4, name: 'Bram' }
      render(<PlayerEditor player={player} onClose={() => {}} onSaved={() => {}} />)
      expect(screen.getByRole('dialog', { name: 'Edit Player: Bram' })).toBeInTheDocument()
    })

    it('closes on Cancel and on Escape', async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      render(<PlayerEditor onClose={onClose} onSaved={() => {}} />)

      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(onClose).toHaveBeenCalledTimes(1)

      await user.keyboard('{Escape}')
      expect(onClose).toHaveBeenCalledTimes(2)
    })

    it('reports save status via an accessible status region', async () => {
      vi.spyOn(api, 'createPlayer').mockRejectedValue(new Error('Unable to save'))
      const user = userEvent.setup()
      render(<PlayerEditor onClose={() => {}} onSaved={() => {}} />)

      await user.type(screen.getByLabelText('Name'), 'Failed Player')
      await user.click(screen.getByRole('button', { name: 'Create Player' }))

      expect(await screen.findByRole('status')).toHaveTextContent('Unable to save')
    })

    it('disables Cancel and Save while saving, suppressing Escape', async () => {
      let resolveCreate: (player: Player) => void = () => {}
      vi.spyOn(api, 'createPlayer').mockReturnValue(
        new Promise((resolve) => {
          resolveCreate = resolve
        }),
      )
      const onClose = vi.fn()
      const user = userEvent.setup()
      render(<PlayerEditor onClose={onClose} onSaved={() => {}} />)

      await user.type(screen.getByLabelText('Name'), 'Pending Player')
      await user.click(screen.getByRole('button', { name: 'Create Player' }))

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Create Player' })).toBeDisabled()

      await user.keyboard('{Escape}')
      expect(onClose).not.toHaveBeenCalled()

      resolveCreate({ id: 1, name: 'Pending Player' })
    })
  })
})
