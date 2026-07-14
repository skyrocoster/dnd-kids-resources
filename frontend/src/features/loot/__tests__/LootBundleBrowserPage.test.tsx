import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import * as api from '../../../api/client'
import { LootBundleBrowserPage } from '../LootBundleBrowserPage'

describe('LootBundleBrowserPage', () => {
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
})
