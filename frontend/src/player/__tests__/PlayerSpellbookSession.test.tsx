import { useEffect } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  PlayerSpellbookSessionProvider,
  usePlayerSpellbookSession,
  type PlayerSpellbookCharacter,
} from '../PlayerSpellbookSession'

const characters: PlayerSpellbookCharacter[] = [{ id: 'wizard' }, { id: 'ranger' }]

function Route({ characterId }: { characterId: string }) {
  const session = usePlayerSpellbookSession()
  useEffect(() => session.setCharacters(characters), [session])
  const view = session.characterViews[characterId]
  return (
    <div>
      <output data-testid="active">{session.activeCharacterId}</output>
      <output data-testid="view">{view?.expandedSpellId ?? 'none'}</output>
      <button onClick={() => session.updateCharacterView(characterId, { expandedSpellId: 'magic-missile' })}>
        Expand
      </button>
      <button onClick={() => session.selectCharacter('ranger')}>Ranger</button>
    </div>
  )
}

describe('PlayerSpellbookSessionProvider', () => {
  it('survives child route unmount/remount and keeps views distinct per character', () => {
    const { rerender } = render(
      <PlayerSpellbookSessionProvider>
        <Route characterId="wizard" />
      </PlayerSpellbookSessionProvider>,
    )

    expect(screen.getByTestId('active')).toHaveTextContent('wizard')
    screen.getByRole('button', { name: 'Expand' }).click()
    screen.getByRole('button', { name: 'Ranger' }).click()
    rerender(
      <PlayerSpellbookSessionProvider>
        <Route characterId="ranger" />
      </PlayerSpellbookSessionProvider>,
    )
    expect(screen.getByTestId('active')).toHaveTextContent('ranger')
    expect(screen.getByTestId('view')).toHaveTextContent('none')
    rerender(
      <PlayerSpellbookSessionProvider>
        <Route characterId="wizard" />
      </PlayerSpellbookSessionProvider>,
    )
    expect(screen.getByTestId('view')).toHaveTextContent('magic-missile')
  })

  it('initializes from response order and retains a selected id during quiet updates', () => {
    function Harness({ list }: { list: PlayerSpellbookCharacter[] }) {
      const session = usePlayerSpellbookSession()
      useEffect(() => session.setCharacters(list), [list, session])
      return <output data-testid="active">{session.activeCharacterId}</output>
    }
    const { rerender } = render(
      <PlayerSpellbookSessionProvider>
        <Harness list={characters} />
      </PlayerSpellbookSessionProvider>,
    )
    expect(screen.getByTestId('active')).toHaveTextContent('wizard')
    rerender(
      <PlayerSpellbookSessionProvider>
        <Harness list={[{ id: 'ranger' }, { id: 'wizard' }]} />
      </PlayerSpellbookSessionProvider>,
    )
    expect(screen.getByTestId('active')).toHaveTextContent('wizard')
  })
})
