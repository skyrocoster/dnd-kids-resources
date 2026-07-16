import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import * as api from '../../../api/client'
import { AddItemPanel } from '../AddItemPanel'
import { AddWeaponPanel } from '../AddWeaponPanel'
import { LootBundleEditor } from '../LootBundleEditor'

describe('loot catalog pickers', () => {
  it('render catalog results and add selected entries', async () => {
    vi.spyOn(api, 'listItems').mockResolvedValue([{ id: 1, name: 'Ruby', value_gp: 50, category: 'gem', description: null }])
    vi.spyOn(api, 'listWeapons').mockResolvedValue([{ id: 2, name: 'Longsword' }])
    const addItem = vi.fn()
    const addWeapon = vi.fn()
    const user = userEvent.setup()
    render(<><AddItemPanel onAdd={addItem} onClose={() => {}} /><AddWeaponPanel onAdd={addWeapon} onClose={() => {}} /></>)

    await user.click(await screen.findByRole('button', { name: /Ruby/ }))
    await user.click(await screen.findByRole('button', { name: /Longsword/ }))
    expect(addItem).toHaveBeenCalledWith(expect.objectContaining({ name: 'Ruby', value_gp: 50 }))
    expect(addWeapon).toHaveBeenCalledWith(expect.objectContaining({ name: 'Longsword' }))
  })
})

describe('LootBundleEditor', () => {
  it('adds an item, updates the live total, and saves its snapshot', async () => {
    vi.spyOn(api, 'listItems').mockResolvedValue([{ id: 1, name: 'Ruby', value_gp: 50, category: 'gem', description: null }])
    const create = vi.spyOn(api, 'createLootBundle').mockResolvedValue({ id: 3, name: 'Chest', gold: 12.5, contents: [] })
    const user = userEvent.setup()
    render(<LootBundleEditor onClose={() => {}} onSaved={() => {}} />)

    await user.type(screen.getByLabelText('Name'), 'Chest')
    await user.clear(screen.getByLabelText('Gold (gp)'))
    await user.type(screen.getByLabelText('Gold (gp)'), '12.5')
    await user.click(screen.getByRole('button', { name: 'Add Item' }))
    await user.click(await screen.findByRole('button', { name: /Ruby/ }))
    expect(screen.getByText('Total value:')).toHaveTextContent('62.5 gp')
    await user.click(screen.getByRole('button', { name: 'Create Loot Bundle' }))

    await waitFor(() => expect(create).toHaveBeenCalledWith({ name: 'Chest', gold: 12.5, contents: [expect.objectContaining({ kind: 'item', name: 'Ruby', value_gp: 50, quantity: 1 })] }))
  })
})
