export interface MonsterVitalsCandidateProps {
  armorClass: {
    value: string;
    note?: string;
  };
  hitPoints: {
    average: string;
    formula?: string;
  };
  speed: string;
}

export function MonsterVitalsCandidate({
  armorClass,
  hitPoints,
  speed,
}: MonsterVitalsCandidateProps) {
  return (
    <article className="monster-composition-card" data-variant="monster">
      <dl className="monster-vitals-candidate" aria-label="Combat statistics">
        <div className="monster-vitals-candidate__tile">
          <dt>AC</dt>
          <dd>
            {armorClass.value}
            {armorClass.note && (
              <span className="monster-vitals-candidate__note"> ({armorClass.note})</span>
            )}
          </dd>
        </div>
        <div className="monster-vitals-candidate__tile monster-vitals-candidate__hit-points">
          <dt>HP</dt>
          <dd>
            <span className="monster-vitals-candidate__average">{hitPoints.average}</span>
            {hitPoints.formula && (
              <span className="monster-vitals-candidate__formula">({hitPoints.formula})</span>
            )}
          </dd>
        </div>
        <div className="monster-vitals-candidate__tile">
          <dt>Speed</dt>
          <dd>{speed}</dd>
        </div>
      </dl>
    </article>
  );
}
