import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { Weapon } from '../../../api/types'
import { PlayerWeaponSection } from '../PlayerWeaponSection'

function makeWeapon(overrides: Partial<Weapon> = {}): Weapon {
  return {
    id: 1,
    name: 'Longsword',
    base_weapon: null,
    rarity: null,
    weapon_category: 'Martial Melee',
    weight: 3,
    req_attune: null,
    property: ['Versatile'],
    focus: [],
    attack: [
      { type: 'melee', damage: '1d8', damage_type: 'slashing', hands: 1 },
    ],
    quick_rules: '1d8 slashing',
    weapon_attack_bonus: null,
    weapon_damage_bonus: null,
    ...overrides,
  }
}

describe('PlayerWeaponSection', () => {
  it('renders empty state when no weapons are assigned', () => {
    render(<PlayerWeaponSection weapons={[]} />)
    expect(screen.getByText('No weapons assigned.')).toBeInTheDocument()
  })

  it('sorts weapons alphabetically by name', () => {
    const weapons = [
      makeWeapon({ id: 1, name: 'Longsword' }),
      makeWeapon({ id: 2, name: 'Battleaxe' }),
      makeWeapon({ id: 3, name: 'Dagger' }),
    ]
    render(<PlayerWeaponSection weapons={weapons} />)

    const names = screen.getAllByText(/Battleaxe|Dagger|Longsword/, { selector: '.weapon-section-name' })
    expect(names).toHaveLength(3)
    expect(names[0]).toHaveTextContent('Battleaxe')
    expect(names[1]).toHaveTextContent('Dagger')
    expect(names[2]).toHaveTextContent('Longsword')
  })

  it('shows quick rules without expanding', () => {
    const weapons = [makeWeapon({ quick_rules: '1d8 slashing' })]
    render(<PlayerWeaponSection weapons={weapons} />)

    expect(screen.getByText(/slashing/)).toBeInTheDocument()
  })

  it('does not render quick rules section when quick_rules is absent', () => {
    const weapons = [makeWeapon({ quick_rules: null })]
    render(<PlayerWeaponSection weapons={weapons} />)

    expect(screen.getByText('Longsword')).toBeInTheDocument()
  })

  it('expands in place to reveal full detail on toggle click', async () => {
    const user = userEvent.setup()
    const weapons = [makeWeapon()]
    render(<PlayerWeaponSection weapons={weapons} />)

    expect(screen.queryByText('Category')).not.toBeInTheDocument()
    expect(screen.queryByText('Properties')).not.toBeInTheDocument()

    const toggle = screen.getByRole('button', { expanded: false })
    await user.click(toggle)

    expect(screen.getByText('Category')).toBeInTheDocument()
    expect(screen.getByText('Properties')).toBeInTheDocument()
    expect(screen.getByText('Versatile')).toBeInTheDocument()
    expect(screen.getByRole('button', { expanded: true })).toBeInTheDocument()

    await user.click(toggle)
    expect(screen.queryByText('Category')).not.toBeInTheDocument()
  })

  it('shows attack descriptions when expanded', async () => {
    const user = userEvent.setup()
    const weapons = [
      makeWeapon({
        attack: [
          { type: 'melee', damage: '1d8', damage_type: 'slashing', hands: 1 },
        ],
      }),
    ]
    render(<PlayerWeaponSection weapons={weapons} />)

    await user.click(screen.getByRole('button'))

    expect(screen.getByText(/melee/)).toBeInTheDocument()
  })

  it('renders meta fields only when present', async () => {
    const user = userEvent.setup()
    const weapons = [makeWeapon({ weight: null, property: [] })]
    render(<PlayerWeaponSection weapons={weapons} />)

    await user.click(screen.getByRole('button'))

    expect(screen.getByText('Category')).toBeInTheDocument()
    expect(screen.queryByText('Weight')).not.toBeInTheDocument()
    expect(screen.queryByText('Properties')).not.toBeInTheDocument()
  })
})
