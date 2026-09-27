import { useId, type ReactNode } from "react";
import "./DetailRegionGrid.css";

export interface DetailRegionGridItem {
  title: string;
  subtitle?: ReactNode;
  content: ReactNode;
}

export interface DetailRegionGridProps {
  regions: readonly DetailRegionGridItem[];
}

export function DetailRegionGrid({ regions }: DetailRegionGridProps) {
  const headingPrefix = useId();

  if (regions.length === 0) return null;

  return (
    <div className="detail-region-grid">
      {regions.map((region, index) => {
        const headingId = `${headingPrefix}-region-${index}`;

        return (
          <section
            className="detail-region-grid__item"
            aria-labelledby={headingId}
            key={`${region.title}-${index}`}
          >
            <h3 id={headingId} className="detail-region-grid__title">
              {region.title}
            </h3>
            {region.subtitle != null && (
              <h4 className="detail-region-grid__subtitle">{region.subtitle}</h4>
            )}
            <div className="detail-region-grid__content">{region.content}</div>
          </section>
        );
      })}
    </div>
  );
}
