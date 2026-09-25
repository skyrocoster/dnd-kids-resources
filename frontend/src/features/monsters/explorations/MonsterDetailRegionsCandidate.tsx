import { useId, type ReactNode } from "react";

export interface MonsterDetailRegionCandidatePanel {
  heading: string;
  content: ReactNode;
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
              key={`${panel.heading}-${index}`}
            >
              <h2 id={headingId} className="monster-composition-heading">
                {panel.heading}
              </h2>
              <div className="monster-detail-regions-candidate__content">{panel.content}</div>
            </section>
          );
        })}
      </div>
    </article>
  );
}
