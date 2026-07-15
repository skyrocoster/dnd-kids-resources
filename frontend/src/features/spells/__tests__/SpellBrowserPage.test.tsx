import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../../api/client'
import type { Spell } from '../../../api/types'
import { SpellBrowserPage } from '../SpellBrowserPage'
import { targetSpell } from './spellFixtures'

const spells: Spell[] = [
  {
    ...targetSpell,
    id: 2,
    name: 'Cure Wounds',
    level: 1,
    description: 'A creature regains 1d8+3 hit points.',
    casting_times: ['1 action'],
    range: 'Touch',
  },
  targetSpell,
]

describe('SpellBrowserPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('lists spells sorted by level and shows the first spell selected', async () => {
    vi.spyOn(api, 'listSpells').mockResolvedValue(spells)

    render(<SpellBrowserPage />)

    await waitFor(() => expect(screen.getByRole('heading', { name: /Cure Wounds/ })).toBeInTheDocument())
    expect(screen.getByRole('heading', { name: /Cure Wounds/ })).toBeInTheDocument()
  })

  it('selecting a different spell updates the detail pane', async () => {
    vi.spyOn(api, 'listSpells').mockResolvedValue(spells)
    const user = userEvent.setup()

    render(<SpellBrowserPage />)
    await waitFor(() => expect(screen.getByText('Plant Growth')).toBeInTheDocument())

    await user.click(screen.getByText('Plant Growth'))
    expect(screen.getByRole('heading', { name: /Plant Growth/ })).toBeInTheDocument()
    expect(screen.getByText('1 action or 8 hours')).toBeInTheDocument()
    expect(screen.getByText('V, S')).toBeInTheDocument()
  })

  it('opens the editor when New Spell is clicked', async () => {
    vi.spyOn(api, 'listSpells').mockResolvedValue(spells)
    const user = userEvent.setup()

    render(<SpellBrowserPage />)
    await waitFor(() => expect(screen.getByRole('heading', { name: /Cure Wounds/ })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'New Spell' }))
    expect(screen.getByRole('dialog', { name: 'Add new spell' })).toBeInTheDocument()
  })

  it('shows an error message when loading fails', async () => {
    vi.spyOn(api, 'listSpells').mockRejectedValue(new Error('network down'))

    render(<SpellBrowserPage />)
    await waitFor(() => expect(screen.getByText(/network down/)).toBeInTheDocument())
  })
})
