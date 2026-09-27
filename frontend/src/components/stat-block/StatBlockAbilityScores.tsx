import "./stat-block-primitives.css";

export interface StatBlockAbilityScore {
  key: string;
  score: number;
  modifier: string;
}

export interface StatBlockAbilityScoresProps {
  abilities: readonly StatBlockAbilityScore[];
}

export function StatBlockAbilityScores({ abilities }: StatBlockAbilityScoresProps) {
  if (abilities.length === 0) return null;

  return (
    <dl className="stat-block-ability-scores" aria-label="Ability scores and modifiers">
      {abilities.map((ability) => (
        <div className="stat-block-ability-scores__item" key={ability.key}>
          <dt>{ability.key}</dt>
          <dd>
            {ability.score}
            <span className="stat-block-ability-scores__modifier">{ability.modifier}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
