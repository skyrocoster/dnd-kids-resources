import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type PlayerSpellbookBrowseMode = 'browse' | 'search'

export interface PlayerSpellbookCharacter {
  id: string
}

export interface PlayerSpellbookViewState {
  browseMode: PlayerSpellbookBrowseMode
  openCategory: string | null
  openSlotSection: string | null
  expandedSpellId: string | null
  scrollPosition: number
}

export interface PlayerSpellbookSessionValue {
  activeCharacterId: string | null
  characterViews: Record<string, PlayerSpellbookViewState>
  setCharacters: (characters: readonly PlayerSpellbookCharacter[]) => void
  selectCharacter: (characterId: string) => void
  updateCharacterView: (characterId: string, changes: Partial<PlayerSpellbookViewState>) => void
}

const defaultView: PlayerSpellbookViewState = {
  browseMode: 'browse',
  openCategory: null,
  openSlotSection: null,
  expandedSpellId: null,
  scrollPosition: 0,
}

const PlayerSpellbookSessionContext = createContext<PlayerSpellbookSessionValue | null>(null)

export function PlayerSpellbookSessionProvider({ children }: { children: ReactNode }) {
  const [activeCharacterId, setActiveCharacterId] = useState<string | null>(null)
  const [characterViews, setCharacterViews] = useState<Record<string, PlayerSpellbookViewState>>({})

  const setCharacters = (characters: readonly PlayerSpellbookCharacter[]) => {
    setActiveCharacterId((current) => {
      if (current && characters.some((character) => character.id === current)) return current
      return characters[0]?.id ?? null
    })
  }

  const selectCharacter = (characterId: string) => {
    setActiveCharacterId(characterId)
  }

  const updateCharacterView = (
    characterId: string,
    changes: Partial<PlayerSpellbookViewState>,
  ) => {
    setCharacterViews((current) => ({
      ...current,
      [characterId]: { ...defaultView, ...current[characterId], ...changes },
    }))
  }

  return (
    <PlayerSpellbookSessionContext.Provider
      value={useMemo(
        () => ({
          activeCharacterId,
          characterViews,
          setCharacters,
          selectCharacter,
          updateCharacterView,
        }),
        [activeCharacterId, characterViews],
      )}
    >
      {children}
    </PlayerSpellbookSessionContext.Provider>
  )
}

export function usePlayerSpellbookSession() {
  const session = useContext(PlayerSpellbookSessionContext)
  if (!session) {
    throw new Error('usePlayerSpellbookSession must be used within PlayerSpellbookSessionProvider')
  }
  return session
}
