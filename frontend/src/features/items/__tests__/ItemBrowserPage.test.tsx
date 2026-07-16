import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import * as api from '../../../api/client'
import type { Item } from '../../../api/types'
import { ItemBrowserPage } from '../ItemBrowserPage'

const ruby: Item = { id: 1, name: 'Ruby', value_gp: 50, category: 'gem', description: 'A red gemstone.' }

describe('ItemBrowserPage', () => {
  it('renders a populated catalog and opens the selected item editor', async () => {
    vi.spyOn(api, 'listItems').mockResolvedValue([ruby])
    const user = userEvent.setup()
    render(<ItemBrowserPage />)
    expect(await screen.findByRole('button', { name: /Ruby/ })).toBeInTheDocument()
    expect(screen.getAllByText('50 gp')).not.toHaveLength(0)
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByRole('dialog', { name: 'Edit Ruby' })).toBeInTheDocument()
  })

  it('shows the empty catalog state', async () => {
    vi.spyOn(api, 'listItems').mockResolvedValue([])
    render(<ItemBrowserPage />)
    await waitFor(() => expect(screen.getByText('No items found.')).toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Start your item catalog' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add your first item' })).toBeInTheDocument()
  })
})
