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

  it('uses shared loading and error states instead of an empty catalog', async () => {
    vi.spyOn(api, 'listItems').mockRejectedValue(new Error('catalog unavailable'))
    vi.spyOn(api, 'listWeapons').mockRejectedValue(new Error('catalog unavailable'))
    render(<><AddItemPanel onAdd={() => {}} onClose={() => {}} /><AddWeaponPanel onAdd={() => {}} onClose={() => {}} /></>)

    expect(screen.getAllByText('Loading…')).toHaveLength(2)
    expect(await screen.findAllByText('Something went wrong')).toHaveLength(2)
    expect(screen.queryByText('No items found.')).not.toBeInTheDocument()
    expect(screen.queryByText('No weapons found.')).not.toBeInTheDocument()
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

  it('duplicate selection increments quantity instead of adding a new row', async () => {
    vi.spyOn(api, 'listItems').mockResolvedValue([{ id: 1, name: 'Ruby', value_gp: 50, category: 'gem', description: null }])
    const user = userEvent.setup()
    render(<LootBundleEditor onClose={() => {}} onSaved={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Add Item' }))
    const rubyButton = await screen.findByRole('button', { name: /Ruby/ })
    await user.click(rubyButton)
    expect(screen.getByDisplayValue('1')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Ruby/ }))
    expect(screen.getByDisplayValue('2')).toBeInTheDocument()
  })

  it('shows "Value pending" for weapons without a price', async () => {
    vi.spyOn(api, 'listItems').mockResolvedValue([])
    vi.spyOn(api, 'listWeapons').mockResolvedValue([{ id: 2, name: 'Longsword' }] as any)
    const user = userEvent.setup()
    render(<LootBundleEditor onClose={() => {}} onSaved={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Add Weapon' }))
    await user.click(await screen.findByRole('button', { name: /Longsword/ }))
    expect(screen.getByText('Value pending')).toBeInTheDocument()
  })

  it('renders a long bundle with many items and updates the total', async () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}`, value_gp: (i + 1) * 10, category: null, description: null }))
    vi.spyOn(api, 'listItems').mockResolvedValue(items)
    const user = userEvent.setup()
    render(<LootBundleEditor onClose={() => {}} onSaved={() => {}} />)

    await user.type(screen.getByLabelText('Name'), 'Big Pile')
    await user.click(screen.getByRole('button', { name: 'Add Item' }))
    for (const item of items) {
      const button = await screen.findByText(item.name)
      await user.click(button.closest('button')!)
    }

    const entryItems = screen.getByText('Total value:')
    expect(entryItems).toHaveTextContent('550 gp')

    expect(screen.getByText('Total value:')).toHaveTextContent('550 gp')
  })
})

describe('LootBundleEditor Dialog contract', () => {
  it('renders with the expected title for add mode', () => {
    render(<LootBundleEditor onClose={() => {}} onSaved={() => {}} />)
    expect(screen.getByRole('dialog', { name: 'Add New Loot Bundle' })).toBeInTheDocument()
  })

  it('renders with the expected title for edit mode', () => {
    const existing: any = { id: 1, name: 'Chest', gold: 0, contents: [] }
    render(<LootBundleEditor bundle={existing} onClose={() => {}} onSaved={() => {}} />)
    expect(screen.getByRole('dialog', { name: 'Edit Loot Bundle: Chest' })).toBeInTheDocument()
  })

  it('closes on Cancel and on Escape', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<LootBundleEditor onClose={onClose} onSaved={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(1)

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('reports save status via an accessible status region', async () => {
    vi.spyOn(api, 'createLootBundle').mockRejectedValue(new Error('Unable to save'))
    vi.spyOn(api, 'listItems').mockResolvedValue([])
    const user = userEvent.setup()
    render(<LootBundleEditor onClose={() => {}} onSaved={() => {}} />)

    await user.type(screen.getByLabelText('Name'), 'Chest')
    await user.click(screen.getByRole('button', { name: 'Create Loot Bundle' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Unable to save')
  })
})

describe('VW6 control conventions', () => {
  it('uses the workspace touch target and narrow breakpoint conventions', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const root = process.cwd()
    expect(readFileSync(resolve(root, 'src/features/loot/AddCatalogPanel.css'), 'utf-8')).toContain('width: var(--control-height)')
    expect(readFileSync(resolve(root, 'src/features/loot/LootBundleEditor.css'), 'utf-8')).toContain('@media (max-width: 520px)')
  })
})
