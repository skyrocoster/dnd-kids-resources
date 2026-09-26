export interface MonsterVitalsProps {
  armorClass?: {
    value: string | number;
    note?: string | null;
  } | null;
  hitPoints?: {
    average: string | number;
    formula?: string | null;
  } | null;
  speed?: string | null;
}

export function MonsterVitals({ armorClass, hitPoints, speed }: MonsterVitalsProps) {
  if (!armorClass && !hitPoints && !speed) return null;

  return (
    <dl className="monster-vitals" aria-label="Combat statistics">
      {armorClass && (
        <div className="monster-vitals__tile">
          <dt>AC</dt>
          <dd>
            {armorClass.value}
            {armorClass.note && (
              <span className="monster-vitals__note"> ({armorClass.note})</span>
            )}
          </dd>
        </div>
      )}
      {hitPoints && (
        <div className="monster-vitals__tile monster-vitals__hit-points">
          <dt>HP</dt>
          <dd>
            <span className="monster-vitals__average">{hitPoints.average}</span>
            {hitPoints.formula && (
              <span className="monster-vitals__formula">({hitPoints.formula})</span>
            )}
          </dd>
        </div>
      )}
      {speed && (
        <div className="monster-vitals__tile">
          <dt>Speed</dt>
          <dd>{speed}</dd>
        </div>
      )}
    </dl>
  );
}
