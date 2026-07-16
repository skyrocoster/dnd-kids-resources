import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../../api/client'
import { LootBundleBrowserPage } from '../LootBundleBrowserPage'

describe('LootBundleBrowserPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the selected bundle with its computed total', async () => {
    vi.spyOn(api, 'listLootBundles').mockResolvedValue([{
      id: 1,
      name: 'Bandit Cache',
      gold: 12.5,
      contents: [{ kind: 'item', ref_id: 1, name: 'Ruby', value_gp: 50, category: 'gem', quantity: 2 }],
    }])
    render(<MemoryRouter><LootBundleBrowserPage /></MemoryRouter>)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Bandit Cache' })).toBeInTheDocument())
    expect(screen.getAllByText('112.5 gp')).toHaveLength(2)
    expect(screen.getByText('2 × Ruby')).toBeInTheDocument()
    expect(document.querySelector('.search-list')).toHaveAttribute('data-variant', 'loot')
    expect(document.querySelector('.card')).toHaveAttribute('data-variant', 'loot')
  })

  it('shows an actionable empty bundle state', async () => {
    vi.spyOn(api, 'listLootBundles').mockResolvedValue([])
    render(<MemoryRouter><LootBundleBrowserPage /></MemoryRouter>)

    await waitFor(() => expect(screen.getByText('No loot bundles found.')).toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Build the first reward' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create a loot bundle' })).toBeInTheDocument()
  })

  it('shows an error message when loading fails', async () => {
    vi.spyOn(api, 'listLootBundles').mockRejectedValue(new Error('bundle load failed'))
    render(<MemoryRouter><LootBundleBrowserPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText(/bundle load failed/)).toBeInTheDocument())
    expect(screen.queryByRole('heading', { name: 'Build the first reward' })).not.toBeInTheDocument()
  })

  it('filtering to no matches shows a filtered-empty state', async () => {
    vi.spyOn(api, 'listLootBundles').mockResolvedValue([
      { id: 1, name: 'Bandit Cache', gold: 12.5, contents: [] },
      { id: 2, name: 'Dragon Hoard', gold: 500, contents: [] },
    ])
    const user = userEvent.setup()
    render(<MemoryRouter><LootBundleBrowserPage /></MemoryRouter>)
    await screen.findByRole('heading', { name: 'Bandit Cache' })

    await user.type(screen.getByRole('searchbox'), 'zzz-no-match')
    await waitFor(() => expect(screen.getByText('No loot bundles found.')).toBeInTheDocument())
  })

  it('shows the chapter icon tab in the header', async () => {
    vi.spyOn(api, 'listLootBundles').mockResolvedValue([{ id: 1, name: 'Bandit Cache', gold: 12.5, contents: [] }])
    render(<MemoryRouter><LootBundleBrowserPage /></MemoryRouter>)
    await screen.findByRole('heading', { name: 'Bandit Cache' })
    expect(screen.getByRole('tab', { name: 'Loot Bundles' })).toBeInTheDocument()
  })

  it('Back to loot bundles clears the selected detail', async () => {
    vi.spyOn(api, 'listLootBundles').mockResolvedValue([{ id: 1, name: 'Bandit Cache', gold: 12.5, contents: [] }])
    const user = userEvent.setup()
    render(<MemoryRouter><LootBundleBrowserPage /></MemoryRouter>)
    await screen.findByRole('heading', { name: 'Bandit Cache' })

    await user.click(screen.getByRole('button', { name: 'Back to loot bundles' }))
    expect(screen.queryByRole('heading', { name: 'Bandit Cache' })).not.toBeInTheDocument()
  })

  it('shows a pending confirm dialog while deleting', async () => {
    vi.spyOn(api, 'listLootBundles').mockResolvedValue([{ id: 1, name: 'Bandit Cache', gold: 12.5, contents: [] }])
    let resolveDelete: () => void = () => {}
    vi.spyOn(api, 'deleteLootBundle').mockImplementation(() => new Promise((resolve) => { resolveDelete = () => resolve(undefined) }))
    const user = userEvent.setup()
    render(<MemoryRouter><LootBundleBrowserPage /></MemoryRouter>)
    await screen.findByRole('heading', { name: 'Bandit Cache' })

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const dialog = screen.getByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(screen.getByRole('alertdialog')).toHaveAttribute('aria-busy', 'true'))

    resolveDelete()
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })
})
