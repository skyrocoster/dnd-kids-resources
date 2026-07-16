import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../../api/client'
import type { Weapon } from '../../../api/types'
import { WeaponEditor } from '../WeaponEditor'

describe('WeaponEditor', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(api, 'getWeaponProperties').mockResolvedValue([])
    vi.spyOn(api, 'getDamageTypes').mockResolvedValue([])
  })

  it('creates a weapon from the form fields', async () => {
    const created: Weapon = { id: 1, name: 'Longsword' }
    const createWeapon = vi.spyOn(api, 'createWeapon').mockResolvedValue(created)
    const onSaved = vi.fn()
    const user = userEvent.setup()
    render(<WeaponEditor onClose={() => {}} onSaved={onSaved} />)

    await user.type(screen.getByLabelText('Name'), 'Longsword')
    await user.click(screen.getByRole('button', { name: 'Create Weapon' }))

    await waitFor(() => expect(createWeapon).toHaveBeenCalledOnce())
    expect(createWeapon).toHaveBeenCalledWith(expect.objectContaining({ name: 'Longsword' }))
    expect(onSaved).toHaveBeenCalledWith(created)
  })

  it('updates an existing weapon', async () => {
    const weapon: Weapon = { id: 4, name: 'Dagger' }
    const updateWeapon = vi.spyOn(api, 'updateWeapon').mockResolvedValue(weapon)
    const user = userEvent.setup()
    render(<WeaponEditor weapon={weapon} onClose={() => {}} onSaved={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(updateWeapon).toHaveBeenCalledWith(4, expect.objectContaining({ name: 'Dagger' })))
  })

  describe('Dialog contract', () => {
    it('renders with the expected title and focuses the first field', () => {
      render(<WeaponEditor onClose={() => {}} onSaved={() => {}} />)
      expect(screen.getByRole('dialog', { name: 'Add New Weapon' })).toBeInTheDocument()
      expect(screen.getByLabelText('Name')).toHaveFocus()
    })

    it('uses the weapon title when editing', () => {
      const weapon: Weapon = { id: 4, name: 'Dagger' }
      render(<WeaponEditor weapon={weapon} onClose={() => {}} onSaved={() => {}} />)
      expect(screen.getByRole('dialog', { name: 'Edit Weapon: Dagger' })).toBeInTheDocument()
    })

    it('closes on Cancel and on Escape', async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      render(<WeaponEditor onClose={onClose} onSaved={() => {}} />)

      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(onClose).toHaveBeenCalledTimes(1)

      await user.keyboard('{Escape}')
      expect(onClose).toHaveBeenCalledTimes(2)
    })

    it('reports save status via an accessible status region', async () => {
      vi.spyOn(api, 'createWeapon').mockRejectedValue(new Error('Unable to save'))
      const user = userEvent.setup()
      render(<WeaponEditor onClose={() => {}} onSaved={() => {}} />)

      await user.type(screen.getByLabelText('Name'), 'Broken Sword')
      await user.click(screen.getByRole('button', { name: 'Create Weapon' }))

      expect(await screen.findByRole('status')).toHaveTextContent('Unable to save')
    })

    it('disables Cancel and Save while saving, suppressing Escape', async () => {
      let resolveCreate: (weapon: Weapon) => void = () => {}
      vi.spyOn(api, 'createWeapon').mockReturnValue(
        new Promise((resolve) => {
          resolveCreate = resolve
        }),
      )
      const onClose = vi.fn()
      const user = userEvent.setup()
      render(<WeaponEditor onClose={onClose} onSaved={() => {}} />)

      await user.type(screen.getByLabelText('Name'), 'Pending Weapon')
      await user.click(screen.getByRole('button', { name: 'Create Weapon' }))

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Create Weapon' })).toBeDisabled()

      await user.keyboard('{Escape}')
      expect(onClose).not.toHaveBeenCalled()

      resolveCreate({ id: 1, name: 'Pending Weapon' })
    })
  })
})
