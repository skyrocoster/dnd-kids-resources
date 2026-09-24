import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  initialPlayerSpellbookViewState,
  PlayerSpellbookSessionContext,
  type PlayerSpellbookCharacter,
  type PlayerSpellbookSessionValue,
  type PlayerSpellbookViewState,
} from "./playerSpellbookSessionContext";

export function PlayerSpellbookSessionProvider({ children }: { children: ReactNode }) {
  const [activeCharacterId, setActiveCharacterId] = useState<string | null>(null);
  const [characterViews, setCharacterViews] = useState<Record<string, PlayerSpellbookViewState>>(
    {},
  );

  const setCharacters = useCallback((characters: readonly PlayerSpellbookCharacter[]) => {
    setActiveCharacterId((current) => {
      if (current && characters.some((character) => character.id === current)) return current;
      return characters[0]?.id ?? null;
    });
  }, []);

  const selectCharacter = useCallback((characterId: string) => {
    setActiveCharacterId(characterId);
  }, []);

  const updateCharacterView = useCallback(
    (characterId: string, changes: Partial<PlayerSpellbookViewState>) => {
      setCharacterViews((current) => ({
        ...current,
        [characterId]: { ...initialPlayerSpellbookViewState, ...current[characterId], ...changes },
      }));
    },
    [],
  );

  const value = useMemo<PlayerSpellbookSessionValue>(
    () => ({
      activeCharacterId,
      characterViews,
      setCharacters,
      selectCharacter,
      updateCharacterView,
    }),
    [activeCharacterId, characterViews, selectCharacter, setCharacters, updateCharacterView],
  );

  return (
    <PlayerSpellbookSessionContext.Provider value={value}>
      {children}
    </PlayerSpellbookSessionContext.Provider>
  );
}
