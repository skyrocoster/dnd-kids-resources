import { useId, type ReactNode } from "react";

export interface MonsterDetailRegionPanel {
  title: string;
  subtitle?: string | null;
  text: ReactNode;
}

export interface MonsterDetailRegionsProps {
  panels: readonly MonsterDetailRegionPanel[];
}

export function MonsterDetailRegions({ panels }: MonsterDetailRegionsProps) {
  const headingPrefix = useId();

  if (panels.length === 0) return null;

  return (
    <div className="monster-detail-regions">
      {panels.map((panel, index) => {
        const headingId = `${headingPrefix}-region-${index}`;

        return (
          <section
            className="monster-detail-regions__panel"
            aria-labelledby={headingId}
            key={`${panel.title}-${index}`}
          >
            <h3 id={headingId} className="monster-stat-block-heading">
              {panel.title}
            </h3>
            {panel.subtitle && (
              <h4 className="monster-detail-regions__subtitle">{panel.subtitle}</h4>
            )}
            <div className="monster-detail-regions__content">{panel.text}</div>
          </section>
        );
      })}
    </div>
  );
}
