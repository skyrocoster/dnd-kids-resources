import { useId } from "react";

export interface MonsterIdentityCandidateProps {
  category: string;
  name: string;
  descriptor: string;
  challengeRating?: string | null;
}

export function MonsterIdentityCandidate({
  category,
  name,
  descriptor,
  challengeRating,
}: MonsterIdentityCandidateProps) {
  const headingId = useId();

  return (
    <article
      className="monster-composition-card monster-identity-candidate"
      data-variant="monster"
      aria-labelledby={headingId}
    >
      <header className="monster-identity-candidate__header">
        <div className="monster-identity-candidate__copy">
          <p className="monster-identity-candidate__category">{category}</p>
          <h2 id={headingId} className="monster-identity-candidate__name">
            {name}
          </h2>
          <p className="monster-identity-candidate__descriptor">{descriptor}</p>
        </div>
        {challengeRating && (
          <p className="monster-identity-candidate__cr">CR {challengeRating}</p>
        )}
      </header>
    </article>
  );
}
