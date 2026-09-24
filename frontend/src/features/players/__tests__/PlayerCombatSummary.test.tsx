import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { Player } from '../../../api/types'
import { PlayerCombatSummary } from '../PlayerCombatSummary'

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 1,
    name: 'Luna Starweaver',
    ...overrides,
  }
}

describe('PlayerCombatSummary', () => {
  it('renders nothing when player has no combat data', () => {
    const { container } = render(<PlayerCombatSummary player={makePlayer()} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders only the fields that are present in the strip', () => {
    const player = makePlayer({
      ac: { value: 16, note: null, alternatives: [] },
      hp: { average: 36, formula: '6d8 + 6' },
      initiative: 3,
    })
    render(<PlayerCombatSummary player={player} />)

    expect(screen.getByText('AC')).toBeInTheDocument()
    expect(screen.getByText('HP')).toBeInTheDocument()
    expect(screen.getByText('16')).toBeInTheDocument()
    expect(screen.getByText('36')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()

    expect(screen.queryByText('Speed')).not.toBeInTheDocument()
  })

  it('renders speed when present via formatMovementSpeeds', () => {
    const player = makePlayer({
      speed: [{ mode: 'walk', feet: 30, note: null, hover: false }],
    })
    render(<PlayerCombatSummary player={player} />)

    expect(screen.getByText('Speed')).toBeInTheDocument()
    expect(screen.getByText('30 ft.')).toBeInTheDocument()
  })

  it('shows Full Profile button only when hasStatblock is true', () => {
    const player = makePlayer({
      abilities: { str: 14, dex: 12, con: 13, int: 10, wis: 11, cha: 9 },
    })
    render(<PlayerCombatSummary player={player} />)

    expect(screen.getByText('Full Profile')).toBeInTheDocument()
  })

  it('Full Profile stays collapsed until toggled', () => {
    const player = makePlayer({
      abilities: { str: 14, dex: 12, con: 13, int: 10, wis: 11, cha: 9 },
    })
    render(<PlayerCombatSummary player={player} />)

    expect(screen.getByRole('button', { expanded: false })).toBeInTheDocument()
    expect(screen.queryByTestId('monster-stat-block')).not.toBeInTheDocument()
  })

  it('toggling Full Profile reveals ability scores', async () => {
    const user = userEvent.setup()
    const player = makePlayer({
      abilities: { str: 14, dex: 12, con: 13, int: 10, wis: 11, cha: 9 },
    })
    render(<PlayerCombatSummary player={player} />)

    await user.click(screen.getByText('Full Profile'))

    expect(screen.getByRole('button', { expanded: true })).toBeInTheDocument()
    expect(screen.getByText('STR')).toBeInTheDocument()
    expect(screen.getByText('14')).toBeInTheDocument()
  })

  it('opens and closes Full Profile with the keyboard', async () => {
    const user = userEvent.setup()
    const player = makePlayer({
      abilities: { str: 14, dex: 12, con: 13, int: 10, wis: 11, cha: 9 },
    })
    render(<PlayerCombatSummary player={player} />)

    const toggle = screen.getByRole('button', { name: 'Full Profile', expanded: false })
    await user.tab()
    expect(toggle).toHaveFocus()

    await user.keyboard(' ')
    expect(screen.getByRole('button', { name: 'Full Profile', expanded: true })).toBeInTheDocument()
    expect(screen.getByText('STR')).toBeInTheDocument()

    await user.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: 'Full Profile', expanded: false })).toBeInTheDocument()
    expect(screen.queryByText('STR')).not.toBeInTheDocument()
  })
})
