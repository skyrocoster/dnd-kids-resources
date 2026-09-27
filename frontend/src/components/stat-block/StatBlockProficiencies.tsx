import type { ReactNode } from "react";
import "./stat-block-primitives.css";

export interface StatBlockProficiency {
  label: string;
  value: ReactNode;
}

export interface StatBlockProficienciesProps {
  items: readonly StatBlockProficiency[];
  ariaLabel?: string;
}

export function StatBlockProficiencies({
  items,
  ariaLabel = "Proficiencies",
}: StatBlockProficienciesProps) {
  if (items.length === 0) return null;

  return (
    <dl className="stat-block-proficiencies" aria-label={ariaLabel}>
      {items.map((item, index) => (
        <div className="stat-block-proficiencies__item" key={`${item.label}-${index}`}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
