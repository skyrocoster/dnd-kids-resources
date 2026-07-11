import { render, screen, waitFor } from '@testing-library/react'
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
    stats: { strength: 14 },
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
    expect(screen.getByRole('option', { name: /Emery Hart/ })).toBeInTheDocument()
  })

  it('selecting an NPC shows their detail card', async () => {
    vi.spyOn(api, 'listNPCs').mockResolvedValue(npcs)
    const user = userEvent.setup()

    render(<NPCBrowserPage />)
    await waitFor(() => expect(screen.getByText('Kessa Moor')).toBeInTheDocument())

    await user.click(screen.getByText('Kessa Moor'))
    expect(screen.getByRole('heading', { name: 'Kessa Moor' })).toBeInTheDocument()
  })

  it('renders the dossier via NPCStatCard: name, an ability modifier, and the composed appearance sentence', async () => {
    vi.spyOn(api, 'listNPCs').mockResolvedValue(npcs)

    render(<NPCBrowserPage />)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Emery Hart' })).toBeInTheDocument())
    expect(screen.getByText('+2')).toBeInTheDocument() // STR modifier for score 14
    expect(screen.getByText('Black hair, brown eyes')).toBeInTheDocument()
  })

  it('opens the editor when New NPC is clicked', async () => {
    vi.spyOn(api, 'listNPCs').mockResolvedValue(npcs)
    const user = userEvent.setup()

    render(<NPCBrowserPage />)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Emery Hart' })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'New NPC' }))
    expect(screen.getByRole('dialog', { name: 'Add new NPC' })).toBeInTheDocument()
  })

  it('shows an error message when loading fails', async () => {
    vi.spyOn(api, 'listNPCs').mockRejectedValue(new Error('boom'))

    render(<NPCBrowserPage />)
    await waitFor(() => expect(screen.getByText('boom')).toBeInTheDocument())
  })
})
