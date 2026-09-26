export interface MonsterAbilityScore {
  key: string;
  score: number;
  modifier: string;
}

export interface MonsterAbilityScoresProps {
  abilities: readonly MonsterAbilityScore[];
}

export function MonsterAbilityScores({ abilities }: MonsterAbilityScoresProps) {
  if (abilities.length === 0) return null;

  return (
    <dl className="monster-ability-scores" aria-label="Ability scores and modifiers">
      {abilities.map((ability) => (
        <div className="monster-ability-scores__tile" key={ability.key}>
          <dt>{ability.key}</dt>
          <dd>
            {ability.score}
            <span className="monster-ability-scores__modifier">
              {ability.modifier}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
