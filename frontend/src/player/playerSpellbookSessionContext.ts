import { createContext, useContext } from "react";

export type PlayerSpellbookBrowseMode = "browse" | "search";

export interface PlayerSpellbookCharacter {
  id: string;
}

export interface PlayerSpellbookViewState {
  browseMode: PlayerSpellbookBrowseMode;
  openCategory: string | null;
  openSlotSection: string | null;
  expandedSpellId: string | null;
  scrollPosition: number;
}

export interface PlayerSpellbookSessionValue {
  activeCharacterId: string | null;
  characterViews: Record<string, PlayerSpellbookViewState>;
  setCharacters: (characters: readonly PlayerSpellbookCharacter[]) => void;
  selectCharacter: (characterId: string) => void;
  updateCharacterView: (characterId: string, changes: Partial<PlayerSpellbookViewState>) => void;
}

export const initialPlayerSpellbookViewState: PlayerSpellbookViewState = {
  browseMode: "browse",
  openCategory: null,
  openSlotSection: null,
  expandedSpellId: null,
  scrollPosition: 0,
};

export const PlayerSpellbookSessionContext = createContext<PlayerSpellbookSessionValue | null>(
  null,
);

export function usePlayerSpellbookSession(): PlayerSpellbookSessionValue {
  const session = useContext(PlayerSpellbookSessionContext);
  if (!session) {
    throw new Error("usePlayerSpellbookSession must be used within PlayerSpellbookSessionProvider");
  }
  return session;
}
