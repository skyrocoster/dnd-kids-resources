import { useEffect } from "react";

import { ToggleGroup } from "../components/form/ToggleGroup";
import { usePlayerSpellbook } from "./usePlayerSpellbook";
import { usePlayerSpellbookSession } from "./PlayerSpellbookSession";
import "./PlayerSpellbookRoute.css";

export function PlayerSpellbookRoute() {
  const { characters, status } = usePlayerSpellbook();
  const { activeCharacterId, setCharacters, selectCharacter } = usePlayerSpellbookSession();
  const sessionCharacters = characters.map((character) => ({ id: String(character.id) }));

  useEffect(() => {
    setCharacters(sessionCharacters);
  }, [characters, setCharacters]);

  return (
    <main className="player-spellbook" aria-labelledby="player-spellbook-title">
      <header className="player-spellbook-header">
        <h1 id="player-spellbook-title">Spellbook</h1>
        <a className="player-spellbook-map-link" href="/play/map">
          Map
        </a>
      </header>

      {status === "loading" && (
        <p className="player-spellbook-message">Choose a character to see their spells.</p>
      )}
      {status === "error" && (
        <p className="player-spellbook-message">The spellbook didn't load. Ask your DM.</p>
      )}
      {status !== "loading" && status !== "error" && (
        <>
          {characters.length > 0 && (
            <ToggleGroup
              className="player-spellbook-tabs"
              aria-label="Characters"
              multiple={false}
              value={activeCharacterId ? [activeCharacterId] : []}
              options={characters.map((character) => ({
                value: String(character.id),
                label: character.name,
              }))}
              onValueChange={(values) => {
                const selectedCharacterId = values[0];
                if (selectedCharacterId !== undefined) selectCharacter(selectedCharacterId);
              }}
            />
          )}
          <p className="player-spellbook-message">No spells assigned yet.</p>
        </>
      )}
    </main>
  );
}
