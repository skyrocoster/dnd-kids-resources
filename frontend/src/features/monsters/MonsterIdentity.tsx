import { useId } from "react";

export interface MonsterIdentityProps {
  category?: string | null;
  name: string;
  descriptor?: string | null;
  challengeRating?: string | null;
  headingId?: string;
}

export function MonsterIdentity({
  category,
  name,
  descriptor,
  challengeRating,
  headingId: providedHeadingId,
}: MonsterIdentityProps) {
  const generatedHeadingId = useId();
  const headingId = providedHeadingId ?? generatedHeadingId;

  return (
    <header className="monster-identity__header">
      <div className="monster-identity__copy">
        {category && <p className="monster-identity__category">{category}</p>}
        <h2 id={headingId} className="monster-identity__name">
          {name}
        </h2>
        {descriptor && <p className="monster-identity__descriptor">{descriptor}</p>}
      </div>
      {challengeRating && (
        <p className="monster-identity__cr">CR {challengeRating}</p>
      )}
    </header>
  );
}
