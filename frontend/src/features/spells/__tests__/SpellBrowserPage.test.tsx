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

  it('shows quick rules before the full description', async () => {
    vi.spyOn(api, 'listSpells').mockResolvedValue(spells)
    const user = userEvent.setup()

    render(<SpellBrowserPage />)
    await screen.findByText('Plant Growth')

    await user.click(screen.getByText('Plant Growth'))
    const quickRules = screen.getByText(targetSpell.quick_rules!)
    const description = screen.getByText(targetSpell.description)

    expect(quickRules.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('renders quick-rule dice and generic spell value fallbacks without token syntax', async () => {
    const spellWithReferences: Spell = {
      ...targetSpell,
      id: 10,
      name: 'Reference Bolt',
      level: 0,
      quick_rules: 'Roll 1d20 + {spell_attack_bonus}; target saves against {spell_save_dc}.',
      description: 'Full reference description.',
    }
    vi.spyOn(api, 'listSpells').mockResolvedValue([spellWithReferences])

    const { container } = render(<SpellBrowserPage />)
    await screen.findByRole('heading', { name: /Reference Bolt/ })

    expect(container.querySelector('.spell-browser-quick-rules .dice-pill')).toHaveTextContent('1d20')
    expect(container).toHaveTextContent('Roll 1d20 + your spell attack bonus; target saves against your spell save DC.')
    expect(container.textContent).not.toContain('{spell_attack_bonus}')
    expect(container.textContent).not.toContain('{spell_save_dc}')
  })
  it('opens the editor when New Spell is clicked', async () => {
    vi.spyOn(api, 'listSpells').mockResolvedValue(spells)
    const user = userEvent.setup()

    render(<SpellBrowserPage />)
    await waitFor(() => expect(screen.getByRole('heading', { name: /Cure Wounds/ })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'New Spell' }))
    expect(screen.getByRole('dialog', { name: 'Add New Spell' })).toBeInTheDocument()
  })

  it('shows an error message when loading fails', async () => {
    vi.spyOn(api, 'listSpells').mockRejectedValue(new Error('network down'))

    render(<SpellBrowserPage />)
    await waitFor(() => expect(screen.getByText(/network down/)).toBeInTheDocument())
  })

  it('keeps the loading state distinct from an empty collection', () => {
    let resolve!: (value: Spell[]) => void
    vi.spyOn(api, 'listSpells').mockReturnValue(new Promise((done) => { resolve = done }))

    render(<SpellBrowserPage />)

    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(screen.queryByText('No spells found.')).not.toBeInTheDocument()
    resolve([])
  })

  it('shows filtered-empty state and returns from the detail view', async () => {
    vi.spyOn(api, 'listSpells').mockResolvedValue(spells)
    const user = userEvent.setup()
    render(<SpellBrowserPage />)

    await screen.findByRole('heading', { name: /Cure Wounds/ })
    await user.type(screen.getByRole('searchbox'), 'missing')
    expect(screen.getByText('No matches')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back to spells' }))
    expect(screen.getByText('Select an item')).toBeInTheDocument()
  })
})
