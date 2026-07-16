import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../../api/client'
import type { Condition, Encounter, Monster } from '../../../api/types'
import { EncounterRunnerPage } from '../EncounterRunnerPage'

const conditionList: Condition[] = [
  { id: 1, name: 'Prone' },
  { id: 2, name: 'Poisoned' },
]

const baseEncounter: Encounter = {
  id: 7,
  title: 'Kennels',
  active_index: 0,
  creatures: [
    { monster_id: 1, original_name: 'Goblin', name: 'Goblin', hp_current: 7, hp_max: 7, ac: 15, status: 'alive', conditions: [] },
    { monster_id: 2, original_name: 'Wolf', name: 'Wolf', hp_current: 11, hp_max: 11, ac: 13, status: 'alive', conditions: [] },
  ],
}

function monster(overrides: Partial<Monster>): Monster {
  return {
    id: 1,
    name: 'Monster',
    aliases: [],
    sizes: [],
    family: null,
    alignment: null,
    creature_type: null,
    ac: null,
    hp: null,
    speed: [],
    abilities: null,
    saving_throws: {},
    skills: {},
    passive_perception: null,
    damage_resistances: [],
    damage_immunities: [],
    damage_vulnerabilities: [],
    condition_immunities: [],
    senses: [],
    languages: [],
    audio_path: null,
    features: {
      traits: [],
      spellcasting: [],
      actions: [],
      bonus_actions: [],
      reactions: [],
      reaction_intro: null,
      legendary_actions: [],
      legendary_intro: null,
      legendary_actions_per_round: null,
      mythic_actions: [],
    },
    cr: null,
    cr_sort: null,
    cr_note: null,
    experience_points: null,
    ...overrides,
  }
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
    const owlbear = monster({ id: 99, name: 'Owlbear', ac: { value: 13, note: null, alternatives: [] }, hp: { average: 59, formula: null } })
    vi.spyOn(api, 'listMonsters').mockResolvedValue([owlbear])

    renderPage()
    await act(async () => {
      await Promise.resolve()
    })

    fireEvent.click(screen.getByText('Add monster'))
    await act(async () => {
      await Promise.resolve()
    })
    fireEvent.click(screen.getByRole('button', { name: /Owlbear/ }))

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

  it('renders no condition chips when a combatant has none', async () => {
    vi.spyOn(api, 'getEncounter').mockResolvedValue(baseEncounter)
    vi.spyOn(api, 'updateEncounter').mockResolvedValue(baseEncounter)
    vi.spyOn(api, 'getConditions').mockResolvedValue(conditionList)

    renderPage()
    await act(async () => {
      await Promise.resolve()
    })

    const card = cardByName('Goblin')
    expect(within(card).queryByRole('group', { name: 'Conditions' })).not.toBeInTheDocument()
    expect(within(card).getByText('No conditions')).toBeInTheDocument()
  })

  it('toggles conditions on a combatant card', async () => {
    vi.spyOn(api, 'getEncounter').mockResolvedValue(baseEncounter)
    vi.spyOn(api, 'updateEncounter').mockResolvedValue(baseEncounter)
    vi.spyOn(api, 'getConditions').mockResolvedValue(conditionList)

    renderPage()
    await act(async () => {
      await Promise.resolve()
    })

    const card = cardByName('Goblin')
    fireEvent.click(within(card).getByText('No conditions'))
    fireEvent.click(within(card).getByLabelText('Prone'))

    expect(within(card).getByRole('group', { name: 'Conditions' })).toBeInTheDocument()
    expect(within(within(card).getByRole('group', { name: 'Conditions' })).getByText('Prone')).toBeInTheDocument()
  })

  it('add-player button renders in the board header', async () => {
    vi.spyOn(api, 'getEncounter').mockResolvedValue(baseEncounter)
    vi.spyOn(api, 'updateEncounter').mockResolvedValue(baseEncounter)
    vi.spyOn(api, 'getConditions').mockResolvedValue(conditionList)

    renderPage()
    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.getByRole('button', { name: 'Add player' })).toBeInTheDocument()
  })

  const addPlayerButton = () => screen.getByRole('button', { name: 'Add player' })

  it('add-player panel opens and accepts a name', async () => {
    vi.spyOn(api, 'getEncounter').mockResolvedValue(baseEncounter)
    vi.spyOn(api, 'updateEncounter').mockResolvedValue(baseEncounter)
    vi.spyOn(api, 'getConditions').mockResolvedValue(conditionList)

    renderPage()
    await act(async () => {
      await Promise.resolve()
    })

    fireEvent.click(addPlayerButton())
    expect(screen.getByPlaceholderText('Enter player name…')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Enter player name…'), { target: { value: 'Frodo' } })
    expect(screen.getByText('Add')).not.toBeDisabled()

    fireEvent.click(screen.getByText('Add'))
    fireEvent.click(addPlayerButton())
    expect(allCardNames()).toEqual(['Goblin', 'Wolf', 'Frodo'])
  })

  it('player card suppresses HP meter, stepper rail, AC, and status pills', async () => {
    vi.spyOn(api, 'getEncounter').mockResolvedValue(baseEncounter)
    vi.spyOn(api, 'updateEncounter').mockResolvedValue(baseEncounter)
    vi.spyOn(api, 'getConditions').mockResolvedValue(conditionList)

    renderPage()
    await act(async () => {
      await Promise.resolve()
    })

    fireEvent.click(addPlayerButton())
    fireEvent.change(screen.getByPlaceholderText('Enter player name…'), { target: { value: 'Frodo' } })
    fireEvent.click(screen.getByText('Add'))
    fireEvent.click(addPlayerButton())

    const playerCard = cardByName('Frodo')
    expect(playerCard).toHaveClass('combatant-card-player')
    expect(within(playerCard).getByLabelText('Player character')).toBeInTheDocument()
    expect(within(playerCard).queryByRole('group', { name: 'Status' })).not.toBeInTheDocument()
    expect(within(playerCard).queryByRole('img', { name: /hit points/i })).not.toBeInTheDocument()
    expect(within(playerCard).queryByLabelText('Damage 10')).not.toBeInTheDocument()
    expect(within(playerCard).queryByLabelText('Heal 1')).not.toBeInTheDocument()
    expect(within(playerCard).queryByText('Set…')).not.toBeInTheDocument()
    expect(within(playerCard).queryByText('—')).not.toBeInTheDocument()
    expect(within(playerCard).queryByText('AC')).not.toBeInTheDocument()

    expect(within(playerCard).getByDisplayValue('Frodo')).toBeInTheDocument()
  })

  it('player card allows condition toggling', async () => {
    vi.spyOn(api, 'getEncounter').mockResolvedValue(baseEncounter)
    vi.spyOn(api, 'updateEncounter').mockResolvedValue(baseEncounter)
    vi.spyOn(api, 'getConditions').mockResolvedValue(conditionList)

    renderPage()
    await act(async () => {
      await Promise.resolve()
    })

    fireEvent.click(addPlayerButton())
    fireEvent.change(screen.getByPlaceholderText('Enter player name…'), { target: { value: 'Frodo' } })
    fireEvent.click(screen.getByText('Add'))
    fireEvent.click(addPlayerButton())

    const playerCard = cardByName('Frodo')
    fireEvent.click(within(playerCard).getByText('No conditions'))
    fireEvent.click(within(playerCard).getByLabelText('Prone'))

    expect(within(playerCard).getByRole('group', { name: 'Conditions' })).toBeInTheDocument()
  })

  // ── VT0 scaffold seams ────────────────────────────────────────────────────
  // These it.skip seams carry real assertion bodies for VT1 to unskip.

  it.skip('shows a recoverable error state when the encounter fails to load (VT1 load-error)', async () => {
    // VT1: useEncounterRunner must surface a load-error state; EncounterRunnerPage
    // must render it with a retry action and a link back to /encounters.
    vi.spyOn(api, 'getEncounter').mockRejectedValue(new Error('network down'))

    renderPage()

    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/could not load/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to encounters/i })).toBeInTheDocument()
  })

  it.skip('ordinary runner controls meet the 48px touch-target floor (VT1 touch targets)', async () => {
    // VT1: header buttons (Next turn, Add monster, Add player) and card controls
    // (stepper, reorder, status chip, condition picker trigger) must meet --control-height (48px).
    vi.spyOn(api, 'getEncounter').mockResolvedValue(baseEncounter)
    vi.spyOn(api, 'updateEncounter').mockResolvedValue(baseEncounter)
    vi.spyOn(api, 'getConditions').mockResolvedValue(conditionList)

    renderPage()
    await act(async () => { await Promise.resolve() })

    const nextTurn = screen.getByText('Next turn').closest('button')!
    const addMonster = screen.getByText('Add monster').closest('button')!
    const addPlayer = screen.getByText('Add player').closest('button')!
    const card = cardByName('Goblin')
    const stepper = within(card).getByLabelText('Damage 1')
    const reorderUp = within(card).getByLabelText(/Move.*up/)
    const statusChip = within(card).getByLabelText(/alive/i)
    const conditionTrigger = within(card).getByText('No conditions')

    for (const el of [nextTurn, addMonster, addPlayer, stepper, reorderUp, statusChip, conditionTrigger]) {
      const rect = el.getBoundingClientRect()
      expect(rect.height).toBeGreaterThanOrEqual(48)
    }
  })

  it.skip('table-time actions are visually separated from roster-management actions (VT1 action groups)', async () => {
    // VT1: CombatantCard must group table-time controls (HP stepper, status, conditions)
    // separately from roster-management controls (duplicate, remove, reorder).
    // Assert via distinct group containers with aria-label or role="group".
    vi.spyOn(api, 'getEncounter').mockResolvedValue(baseEncounter)
    vi.spyOn(api, 'updateEncounter').mockResolvedValue(baseEncounter)
    vi.spyOn(api, 'getConditions').mockResolvedValue(conditionList)

    renderPage()
    await act(async () => { await Promise.resolve() })

    const card = cardByName('Goblin')
    expect(within(card).getByRole('group', { name: /combat actions/i })).toBeInTheDocument()
    expect(within(card).getByRole('group', { name: /roster management/i })).toBeInTheDocument()
  })

  it.skip('runner header actions are reachable in a narrow viewport (VT1 narrow reachability)', async () => {
    // VT1: at 520px width, the runner header must keep Next turn, Add monster, Add player
    // reachable without horizontal overflow. The combatant list must remain scrollable.
    vi.spyOn(api, 'getEncounter').mockResolvedValue(baseEncounter)
    vi.spyOn(api, 'updateEncounter').mockResolvedValue(baseEncounter)

    renderPage()
    await act(async () => { await Promise.resolve() })

    Object.defineProperty(document.querySelector('.encounter-runner-header')!, 'offsetWidth', { value: 520 })
    const header = screen.getByText('Round 1').closest('.encounter-runner-header')!
    expect(header.scrollWidth).toBeLessThanOrEqual(header.clientWidth + 1)
  })

  it.skip('compact dock mode controls meet the 48px touch-target floor (VT1 dock targets)', async () => {
    // VT1: EncounterDock wraps EncounterRunnerBoard in compact mode.
    // Even in compact mode, interactive controls must remain >= 48px or document a compact exception.
    // This seam verifies the intent — the actual compact-mode rendering needs a dock harness.
    // Expected: stepper buttons, status chips, condition picker trigger remain >= 48px in compact mode.
    expect(true).toBe(true) // placeholder — VT1 will render the actual compact dock
  })

  it('conditions persist through save/reload', async () => {
    vi.spyOn(api, 'getEncounter').mockResolvedValue(baseEncounter)
    const updateSpy = vi.spyOn(api, 'updateEncounter').mockResolvedValue(baseEncounter)
    vi.spyOn(api, 'getConditions').mockResolvedValue(conditionList)

    renderPage()
    await act(async () => {
      await Promise.resolve()
    })

    const card = cardByName('Goblin')
    fireEvent.click(within(card).getByText('No conditions'))
    fireEvent.click(within(card).getByLabelText('Prone'))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })

    expect(updateSpy).toHaveBeenCalledTimes(1)
    expect(updateSpy.mock.calls[0][1].creatures![0].conditions).toEqual(['Prone'])
  })
})
