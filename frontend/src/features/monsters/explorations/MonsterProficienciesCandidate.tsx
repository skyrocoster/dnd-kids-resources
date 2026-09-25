export interface MonsterProficienciesCandidateProps {
  savingThrows: string;
  skills: string;
}

export function MonsterProficienciesCandidate({
  savingThrows,
  skills,
}: MonsterProficienciesCandidateProps) {
  return (
    <article className="monster-composition-card" data-variant="monster">
      <dl className="monster-proficiencies-candidate" aria-label="Saving throws and skills">
        <div className="monster-proficiencies-candidate__tile">
          <dt>Saving Throws</dt>
          <dd>{savingThrows}</dd>
        </div>
        <div className="monster-proficiencies-candidate__tile">
          <dt>Skills</dt>
          <dd>{skills}</dd>
        </div>
      </dl>
    </article>
  );
}
