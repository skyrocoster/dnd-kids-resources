import { useId } from "react";

export interface MonsterAbilityScoreCandidateValue {
  key: string;
  score: number;
  modifier: string;
}

export interface MonsterAbilityScoresCandidateProps {
  abilities: readonly MonsterAbilityScoreCandidateValue[];
}

export function MonsterAbilityScoresCandidate({ abilities }: MonsterAbilityScoresCandidateProps) {
  const headingId = useId();

  return (
    <article className="monster-composition-card" data-variant="monster">
      <section aria-labelledby={headingId}>
        <h2 id={headingId} className="monster-composition-heading">
          Abilities
        </h2>
        <dl className="monster-ability-scores-candidate" aria-label="Ability scores and modifiers">
          {abilities.map((ability) => (
            <div className="monster-ability-scores-candidate__tile" key={ability.key}>
              <dt>{ability.key}</dt>
              <dd>
                {ability.score}
                <span className="monster-ability-scores-candidate__modifier">
                  {ability.modifier}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </article>
  );
}
