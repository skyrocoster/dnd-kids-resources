import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import * as api from '../../../api/client'
import type { Item } from '../../../api/types'
import { ItemEditor } from '../ItemEditor'

describe('ItemEditor', () => {
  it('creates an item from the form fields', async () => {
    const createItem = vi.spyOn(api, 'createItem').mockResolvedValue({ id: 1, name: 'Rope', value_gp: 1.5, category: 'gear', description: null })
    const onSaved = vi.fn()
    const user = userEvent.setup()
    render(<ItemEditor onClose={() => {}} onSaved={onSaved} />)
    await user.type(screen.getByLabelText('Name'), 'Rope')
    await user.type(screen.getByLabelText('Value (gp)'), '1.5')
    await user.selectOptions(screen.getByLabelText('Category'), 'gear')
    await user.click(screen.getByRole('button', { name: 'Create Item' }))
    await waitFor(() => expect(createItem).toHaveBeenCalledWith({ name: 'Rope', value_gp: 1.5, category: 'gear', description: null }))
    expect(onSaved).toHaveBeenCalled()
  })

  it('updates an existing item', async () => {
    const item: Item = { id: 4, name: 'Ruby', value_gp: 50, category: 'gem', description: null }
    const updateItem = vi.spyOn(api, 'updateItem').mockResolvedValue(item)
    const user = userEvent.setup()
    render(<ItemEditor item={item} onClose={() => {}} onSaved={() => {}} />)
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    await waitFor(() => expect(updateItem).toHaveBeenCalledWith(4, { name: 'Ruby', value_gp: 50, category: 'gem', description: null }))
  })

  describe('Dialog contract', () => {
    it('renders with the expected title and focuses the first field', () => {
      render(<ItemEditor onClose={() => {}} onSaved={() => {}} />)
      expect(screen.getByRole('dialog', { name: 'Add New Item' })).toBeInTheDocument()
      expect(screen.getByLabelText('Name')).toHaveFocus()
    })

    it('uses the item title when editing', () => {
      const item: Item = { id: 4, name: 'Ruby', value_gp: 50, category: 'gem', description: null }
      render(<ItemEditor item={item} onClose={() => {}} onSaved={() => {}} />)
      expect(screen.getByRole('dialog', { name: 'Edit Item: Ruby' })).toBeInTheDocument()
    })

    it('closes on Cancel and on Escape', async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      render(<ItemEditor onClose={onClose} onSaved={() => {}} />)

      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(onClose).toHaveBeenCalledTimes(1)

      await user.keyboard('{Escape}')
      expect(onClose).toHaveBeenCalledTimes(2)
    })

    it('reports save status via an accessible status region', async () => {
      vi.spyOn(api, 'createItem').mockRejectedValue(new Error('Unable to save'))
      const user = userEvent.setup()
      render(<ItemEditor onClose={() => {}} onSaved={() => {}} />)

      await user.type(screen.getByLabelText('Name'), 'Rope')
      await user.type(screen.getByLabelText('Value (gp)'), '1')
      await user.click(screen.getByRole('button', { name: 'Create Item' }))

      expect(await screen.findByRole('status')).toHaveTextContent('Unable to save')
    })
  })
})
