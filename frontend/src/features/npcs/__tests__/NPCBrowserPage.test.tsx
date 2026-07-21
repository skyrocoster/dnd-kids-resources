import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../../api/client'
import type { NPC } from '../../../api/types'
import { NPCBrowserPage } from '../NPCBrowserPage'

const npcs: NPC[] = [
  {
    id: 1,
    name: 'Emery Hart',
    race: 'Human',
    background: 'Village Guard',
    abilities: { str: 14, dex: null, con: null, int: null, wis: null, cha: null },
    speed: [
      { mode: 'walk', feet: 30, note: null, hover: false },
      { mode: 'climb', feet: 20, note: null, hover: false },
    ],
    languages: ['Common', 'Halfling'],
    appearance: { hair_colour: 'black', eye_colour: 'brown' },
  },
  { id: 2, name: 'Kessa Moor', race: 'Halfling', background: 'Merchant' },
]

describe('NPCBrowserPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('lists NPCs sorted by name and shows the first one selected', async () => {
    vi.spyOn(api, 'listNPCs').mockResolvedValue(npcs)

    render(<NPCBrowserPage />)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Emery Hart' })).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /Emery Hart/ })).toBeInTheDocument()
  })

  it('selecting an NPC shows their detail card', async () => {
    vi.spyOn(api, 'listNPCs').mockResolvedValue(npcs)
    const user = userEvent.setup()

    render(<NPCBrowserPage />)
    await waitFor(() => expect(screen.getByText('Kessa Moor')).toBeInTheDocument())

    await user.click(screen.getByText('Kessa Moor'))
    expect(screen.getByRole('heading', { name: 'Kessa Moor' })).toBeInTheDocument()
  })

  it('renders the dossier via NPCStatCard: name, an ability modifier, movement, languages, and appearance', async () => {
    vi.spyOn(api, 'listNPCs').mockResolvedValue(npcs)

    render(<NPCBrowserPage />)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Emery Hart' })).toBeInTheDocument())
    expect(screen.getByText('+2')).toBeInTheDocument() // STR modifier for score 14
    expect(screen.getByText('Black hair, brown eyes')).toBeInTheDocument()
    expect(screen.getByText('30 ft., climb 20 ft.')).toBeInTheDocument()
    expect(screen.getByText('Common, Halfling')).toBeInTheDocument()
  })

  it('opens the editor when New NPC is clicked', async () => {
    vi.spyOn(api, 'listNPCs').mockResolvedValue(npcs)
    const user = userEvent.setup()

    render(<NPCBrowserPage />)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Emery Hart' })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'New NPC' }))
    expect(screen.getByRole('dialog', { name: 'Add New NPC' })).toBeInTheDocument()
  })

  it('shows an error message when loading fails', async () => {
    vi.spyOn(api, 'listNPCs').mockRejectedValue(new Error('boom'))

    render(<NPCBrowserPage />)
    await waitFor(() => expect(screen.getByText('boom')).toBeInTheDocument())
  })

  it('shows empty state when there are no NPCs', async () => {
    vi.spyOn(api, 'listNPCs').mockResolvedValue([])

    render(<NPCBrowserPage />)
    await waitFor(() => expect(screen.getByText('No NPCs found.')).toBeInTheDocument())
    expect(screen.getByText(/Choose an NPC/)).toBeInTheDocument()
  })

  it('filtering to no matches shows filtered-empty state', async () => {
    vi.spyOn(api, 'listNPCs').mockResolvedValue(npcs)
    const user = userEvent.setup()

    render(<NPCBrowserPage />)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Emery Hart' })).toBeInTheDocument())

    await user.type(screen.getByRole('searchbox'), 'zzz-no-match')
    await waitFor(() => expect(screen.getByText('No NPCs found.')).toBeInTheDocument())
  })

  it('shows chapter icon tab in header', async () => {
    vi.spyOn(api, 'listNPCs').mockResolvedValue(npcs)

    render(<NPCBrowserPage />)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Emery Hart' })).toBeInTheDocument())
    expect(screen.getByRole('tab', { name: 'NPCs' })).toBeInTheDocument()
  })

  it('Back to NPCs clears the selected detail', async () => {
    vi.spyOn(api, 'listNPCs').mockResolvedValue(npcs)
    const user = userEvent.setup()

    render(<NPCBrowserPage />)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Emery Hart' })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Back to NPCs' }))
    expect(screen.queryByRole('heading', { name: 'Emery Hart' })).not.toBeInTheDocument()
    expect(screen.getByText(/Choose an NPC/)).toBeInTheDocument()
  })

  it('shows a pending confirm dialog while deleting', async () => {
    vi.spyOn(api, 'listNPCs').mockResolvedValue(npcs)
    let resolveDelete: () => void = () => {}
    vi.spyOn(api, 'deleteNPC').mockImplementation(() => new Promise((resolve) => { resolveDelete = () => resolve(undefined) }))
    const user = userEvent.setup()

    render(<NPCBrowserPage />)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Emery Hart' })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(screen.getByRole('alertdialog')).toHaveAttribute('aria-busy', 'true'))

    resolveDelete()
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })
})
