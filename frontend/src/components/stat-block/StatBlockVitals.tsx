import type { ReactNode } from "react";
import "./stat-block-primitives.css";

export interface StatBlockVital {
  label: string;
  value: ReactNode;
  emphasis?: boolean;
}

export interface StatBlockVitalsProps {
  items: readonly StatBlockVital[];
  ariaLabel?: string;
}

export function StatBlockVitals({
  items,
  ariaLabel = "Statistics",
}: StatBlockVitalsProps) {
  if (items.length === 0) return null;

  return (
    <dl className="stat-block-vitals" aria-label={ariaLabel}>
      {items.map((item, index) => (
        <div
          className={`stat-block-vitals__item${item.emphasis ? " stat-block-vitals__item--emphasis" : ""}`}
          key={`${item.label}-${index}`}
        >
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
