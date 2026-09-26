export interface MonsterProficienciesProps {
  savingThrows?: string | null;
  skills?: string | null;
}

export function MonsterProficiencies({ savingThrows, skills }: MonsterProficienciesProps) {
  if (!savingThrows && !skills) return null;

  return (
    <dl className="monster-proficiencies" aria-label="Saving throws and skills">
      {savingThrows && (
        <div className="monster-proficiencies__tile">
          <dt>Saving Throws</dt>
          <dd>{savingThrows}</dd>
        </div>
      )}
      {skills && (
        <div className="monster-proficiencies__tile">
          <dt>Skills</dt>
          <dd>{skills}</dd>
        </div>
      )}
    </dl>
  );
}
