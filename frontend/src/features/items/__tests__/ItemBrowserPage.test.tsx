import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../../api/client'
import type { Item } from '../../../api/types'
import { ItemBrowserPage } from '../ItemBrowserPage'

const ruby: Item = { id: 1, name: 'Ruby', value_gp: 50, category: 'gem', description: 'A red gemstone.' }
const rope: Item = { id: 2, name: 'Rope', value_gp: 1, category: 'gear', description: '50 feet of rope.' }

describe('ItemBrowserPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders a populated catalog and opens the selected item editor', async () => {
    vi.spyOn(api, 'listItems').mockResolvedValue([ruby])
    const user = userEvent.setup()
    render(<ItemBrowserPage />)
    expect(await screen.findByRole('button', { name: /Ruby/ })).toBeInTheDocument()
    expect(screen.getAllByText('50 gp')).not.toHaveLength(0)
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByRole('dialog', { name: 'Edit Item: Ruby' })).toBeInTheDocument()
  })

  it('shows the empty catalog state', async () => {
    vi.spyOn(api, 'listItems').mockResolvedValue([])
    render(<ItemBrowserPage />)
    await waitFor(() => expect(screen.getByText('No items found.')).toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Start your item catalog' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add your first item' })).toBeInTheDocument()
  })

  it('shows an error message when loading fails', async () => {
    vi.spyOn(api, 'listItems').mockRejectedValue(new Error('load failed'))
    render(<ItemBrowserPage />)
    await waitFor(() => expect(screen.getByText(/load failed/)).toBeInTheDocument())
    expect(screen.queryByRole('heading', { name: 'Start your item catalog' })).not.toBeInTheDocument()
  })

  it('filtering to no matches shows a filtered-empty state', async () => {
    vi.spyOn(api, 'listItems').mockResolvedValue([ruby, rope])
    const user = userEvent.setup()
    render(<ItemBrowserPage />)
    await screen.findByRole('button', { name: /Ruby/ })

    await user.type(screen.getByRole('searchbox'), 'zzz-no-match')
    await waitFor(() => expect(screen.getByText('No items found.')).toBeInTheDocument())
  })

  it('shows the chapter icon tab in the header', async () => {
    vi.spyOn(api, 'listItems').mockResolvedValue([ruby])
    render(<ItemBrowserPage />)
    await screen.findByRole('button', { name: /Ruby/ })
    expect(screen.getByRole('tab', { name: 'Items' })).toBeInTheDocument()
  })

  it('Back to items clears the selected detail', async () => {
    vi.spyOn(api, 'listItems').mockResolvedValue([ruby])
    const user = userEvent.setup()
    render(<ItemBrowserPage />)
    await screen.findByRole('heading', { name: 'Ruby' })

    await user.click(screen.getByRole('button', { name: 'Back to items' }))
    expect(screen.queryByRole('heading', { name: 'Ruby' })).not.toBeInTheDocument()
  })

  it('shows a pending confirm dialog while deleting', async () => {
    vi.spyOn(api, 'listItems').mockResolvedValue([ruby])
    let resolveDelete: () => void = () => {}
    vi.spyOn(api, 'deleteItem').mockImplementation(() => new Promise((resolve) => { resolveDelete = () => resolve(undefined) }))
    const user = userEvent.setup()
    render(<ItemBrowserPage />)
    await screen.findByRole('heading', { name: 'Ruby' })

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const dialog = screen.getByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(screen.getByRole('alertdialog')).toHaveAttribute('aria-busy', 'true'))

    resolveDelete()
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })
})
