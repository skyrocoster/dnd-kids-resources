import { useId, type ReactNode } from "react";

export interface MonsterDetailRegionCandidatePanel {
  title: string;
  subtitle: string;
  text: ReactNode;
}

export interface MonsterDetailRegionsCandidateProps {
  panels: readonly MonsterDetailRegionCandidatePanel[];
}

export function MonsterDetailRegionsCandidate({ panels }: MonsterDetailRegionsCandidateProps) {
  const headingPrefix = useId();

  return (
    <article className="monster-composition-card" data-variant="monster">
      <div className="monster-detail-regions-candidate">
        {panels.map((panel, index) => {
          const headingId = `${headingPrefix}-region-${index}`;

          return (
            <section
              className="monster-detail-regions-candidate__panel"
              aria-labelledby={headingId}
              key={`${panel.title}-${index}`}
            >
              <h2 id={headingId} className="monster-composition-heading">
                {panel.title}
              </h2>
              <h3 className="monster-detail-regions-candidate__subtitle">{panel.subtitle}</h3>
              <div className="monster-detail-regions-candidate__content">{panel.text}</div>
            </section>
          );
        })}
      </div>
    </article>
  );
}
