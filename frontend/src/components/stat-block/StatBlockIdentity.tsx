import { useId, type ReactNode } from "react";
import "./stat-block-primitives.css";

export interface StatBlockIdentityProps {
  eyebrow?: ReactNode;
  name: string;
  description?: ReactNode;
  accessory?: ReactNode;
  headingId?: string;
}

export function StatBlockIdentity({
  eyebrow,
  name,
  description,
  accessory,
  headingId: providedHeadingId,
}: StatBlockIdentityProps) {
  const generatedHeadingId = useId();
  const headingId = providedHeadingId ?? generatedHeadingId;

  return (
    <header className="stat-block-identity">
      <div className="stat-block-identity__copy">
        {eyebrow != null && <p className="stat-block-identity__eyebrow">{eyebrow}</p>}
        <h2 id={headingId} className="stat-block-identity__name">
          {name}
        </h2>
        {description != null && <p className="stat-block-identity__description">{description}</p>}
      </div>
      {accessory != null && <div className="stat-block-identity__accessory">{accessory}</div>}
    </header>
  );
}
