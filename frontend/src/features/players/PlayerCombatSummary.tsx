import type { Player } from "../../api/types";
import { formatMovementSpeeds } from "../npcs/npcModel";
import { hasCombatStats, hasStatblock, playerToMonsterView } from "./playerModel";
import { MonsterStatBlock } from "../monsters/MonsterStatBlock";
import { Disclosure } from "../../components/Disclosure";
import "./PlayerCombatSummary.css";

interface PlayerCombatSummaryProps {
  player: Player;
}

export function PlayerCombatSummary({ player }: PlayerCombatSummaryProps) {
  const speed = formatMovementSpeeds(player.speed);
  const showStatStrip = hasCombatStats(player);
  const showMonsterBlock = hasStatblock(player);

  if (!showStatStrip && !showMonsterBlock) return null;

  return (
    <div>
      {showStatStrip && (
        <div className="player-combat-summary-strip">
          {player.ac != null && (
            <div className="player-combat-summary-strip-item">
              <span className="player-combat-summary-strip-label">AC</span>
              <span className="player-combat-summary-strip-value">{player.ac.value}</span>
            </div>
          )}
          {player.hp != null && (
            <div className="player-combat-summary-strip-item">
              <span className="player-combat-summary-strip-label">HP</span>
              <span className="player-combat-summary-strip-value">{player.hp.average}</span>
            </div>
          )}
          {speed && (
            <div className="player-combat-summary-strip-item">
              <span className="player-combat-summary-strip-label">Speed</span>
              <span className="player-combat-summary-strip-value">{speed}</span>
            </div>
          )}
          {player.initiative != null && (
            <div className="player-combat-summary-strip-item">
              <span className="player-combat-summary-strip-label">Initiative</span>
              <span className="player-combat-summary-strip-value">{player.initiative}</span>
            </div>
          )}
        </div>
      )}

      {showMonsterBlock && (
        <Disclosure
          className="player-combat-summary-disclosure"
          summary="Full Profile"
          defaultOpen={false}
        >
          <MonsterStatBlock
            monster={playerToMonsterView(player)}
            showIdentity={false}
            showStrip={false}
          />
        </Disclosure>
      )}
    </div>
  );
}
