import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../../api/client'
import type { Encounter, Monster } from '../../../api/types'
import { EncounterRunnerPage } from '../EncounterRunnerPage'

const baseEncounter: Encounter = {
  id: 7,
  title: 'Kennels',
  active_index: 0,
  creatures: [
    { monster_id: 1, original_name: 'Goblin', name: 'Goblin', hp_current: 7, hp_max: 7, ac: 15, status: 'alive', conditions: [] },
    { monster_id: 2, original_name: 'Wolf', name: 'Wolf', hp_current: 11, hp_max: 11, ac: 13, status: 'alive', conditions: [] },
  ],
}

function renderPage(encounterId = 7) {
  return render(
    <MemoryRouter initialEntries={[`/encounters/${encounterId}/run`]}>
      <Routes>
        <Route path="/encounters/:id/run" element={<EncounterRunnerPage />} />
      </Routes>
    </MemoryRouter>
  )
}

function cardByName(name: string): HTMLElement {
  return screen.getByDisplayValue(name).closest('.combatant-card') as HTMLElement
}

function allCardNames(): string[] {
  return screen.getAllByLabelText('Combatant name').map((el) => (el as HTMLInputElement).value)
}

describe('EncounterRunnerPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('renders the board from a mocked encounter', async () => {
    vi.spyOn(api, 'getEncounter').mockResolvedValue(baseEncounter)
    vi.spyOn(api, 'updateEncounter').mockResolvedValue(baseEncounter)

    renderPage()

    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.getByRole('heading', { name: 'Kennels' })).toBeInTheDocument()
    expect(allCardNames()).toEqual(['Goblin', 'Wolf'])
    expect(screen.getByText('Round 1')).toBeInTheDocument()
  })

  it('−10 damages HP and moves the meter into the critical tier', async () => {
    vi.spyOn(api, 'getEncounter').mockResolvedValue(baseEncounter)
    vi.spyOn(api, 'updateEncounter').mockResolvedValue(baseEncounter)

    renderPage()
    await act(async () => {
      await Promise.resolve()
    })

    const card = cardByName('Goblin')
    fireEvent.click(within(card).getByLabelText('Damage 10'))

    expect(card.className).toContain('combatant-card-down')
    expect(within(card).getByText('0', { selector: '.combatant-hp-number' })).toBeInTheDocument()
  })

  it('Set… applies a custom HP value', async () => {
    vi.spyOn(api, 'getEncounter').mockResolvedValue(baseEncounter)
    vi.spyOn(api, 'updateEncounter').mockResolvedValue(baseEncounter)

    renderPage()
    await act(async () => {
      await Promise.resolve()
    })

    const card = cardByName('Goblin')
    fireEvent.click(within(card).getByText('Set…'))
    fireEvent.change(within(card).getByLabelText('Set HP'), { target: { value: '1' } })
    fireEvent.click(within(card).getByText('Apply'))

    expect(within(card).getByText('1', { selector: '.combatant-hp-number' })).toBeInTheDocument()
    expect(card.className).toContain('combatant-card-critical')
  })

  it('duplicate adds a card and remove drops one', async () => {
    vi.spyOn(api, 'getEncounter').mockResolvedValue(baseEncounter)
    vi.spyOn(api, 'updateEncounter').mockResolvedValue(baseEncounter)

    renderPage()
    await act(async () => {
      await Promise.resolve()
    })

    const card = cardByName('Goblin')
    fireEvent.click(within(card).getByLabelText('Duplicate combatant'))
    expect(allCardNames()).toEqual(['Goblin', 'Goblin', 'Wolf'])

    const [first] = screen.getAllByDisplayValue('Goblin')
    fireEvent.click(within(first.closest('.combatant-card') as HTMLElement).getByLabelText('Remove combatant'))
    expect(allCardNames()).toEqual(['Goblin', 'Wolf'])
  })

  it('add-monster inserts a combatant from the search panel', async () => {
    vi.spyOn(api, 'getEncounter').mockResolvedValue(baseEncounter)
    vi.spyOn(api, 'updateEncounter').mockResolvedValue(baseEncounter)
    const monster: Monster = { id: 99, name: 'Owlbear', ac: { '13': null }, hp: { average: 59 } }
    vi.spyOn(api, 'listMonsters').mockResolvedValue([monster])

    renderPage()
    await act(async () => {
      await Promise.resolve()
    })

    fireEvent.click(screen.getByText('Add monster'))
    await act(async () => {
      await Promise.resolve()
    })
    fireEvent.click(screen.getByRole('option', { name: /Owlbear/ }))

    expect(allCardNames()).toEqual(['Goblin', 'Wolf', 'Owlbear'])
  })

  it('▲/▼ reorder changes combatant order', async () => {
    vi.spyOn(api, 'getEncounter').mockResolvedValue(baseEncounter)
    vi.spyOn(api, 'updateEncounter').mockResolvedValue(baseEncounter)

    renderPage()
    await act(async () => {
      await Promise.resolve()
    })

    expect(allCardNames()).toEqual(['Goblin', 'Wolf'])
    const wolfCard = cardByName('Wolf')
    fireEvent.click(within(wolfCard).getByLabelText('Move Wolf up'))
    expect(allCardNames()).toEqual(['Wolf', 'Goblin'])
  })

  it('Next turn advances the highlight and wraps to round 2', async () => {
    vi.spyOn(api, 'getEncounter').mockResolvedValue(baseEncounter)
    vi.spyOn(api, 'updateEncounter').mockResolvedValue(baseEncounter)

    renderPage()
    await act(async () => {
      await Promise.resolve()
    })

    expect(cardByName('Goblin').querySelector('.combatant-card-on-deck')).not.toBeNull()

    fireEvent.click(screen.getByText('Next turn'))
    expect(cardByName('Wolf').querySelector('.combatant-card-on-deck')).not.toBeNull()
    expect(screen.getByText('Round 1')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Next turn'))
    expect(cardByName('Goblin').querySelector('.combatant-card-on-deck')).not.toBeNull()
    expect(screen.getByText('Round 2')).toBeInTheDocument()
  })

  // TODO (R0): condition display stubs
  it.skip('toggles conditions on a combatant card', () => {
    // R1: implement live-edit via ConditionPicker
  })

  it.skip('conditions persist through save/reload', () => {
    // R1: verify round-trip through updateEncounter
  })
})
