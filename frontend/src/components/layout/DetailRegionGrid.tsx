import { useId, type CSSProperties, type ReactNode } from "react";
import "./DetailRegionGrid.css";

export interface DetailRegionGridItem {
  title: string;
  subtitle?: ReactNode;
  content: ReactNode;
}

export interface DetailRegionGridProps {
  regions: readonly DetailRegionGridItem[];
  /** Number of columns, or auto to wrap cards before their text becomes too narrow. Defaults to 3. */
  columns?: number | "auto";
  /** Heading level for region titles; nested grids can use a deeper level. Defaults to 3. */
  headingLevel?: 3 | 4 | 5;
}

export function DetailRegionGrid({
  regions,
  columns = 3,
  headingLevel = 3,
}: DetailRegionGridProps) {
  const headingPrefix = useId();
  const Heading = `h${headingLevel}` as const;
  const Subtitle = `h${headingLevel + 1}` as "h4" | "h5" | "h6";

  if (regions.length === 0) return null;

  return (
    <div
      className="detail-region-grid"
      data-columns={columns === "auto" ? "auto" : undefined}
      style={
        columns === "auto" ? undefined : ({ "--detail-region-columns": columns } as CSSProperties)
      }
    >
      {regions.map((region, index) => {
        const headingId = `${headingPrefix}-region-${index}`;

        return (
          <section
            className="detail-region-grid__item"
            aria-labelledby={headingId}
            key={`${region.title}-${index}`}
          >
            <Heading id={headingId} className="detail-region-grid__title">
              {region.title}
            </Heading>
            {region.subtitle != null && (
              <Subtitle className="detail-region-grid__subtitle">{region.subtitle}</Subtitle>
            )}
            <div className="detail-region-grid__content">{region.content}</div>
          </section>
        );
      })}
    </div>
  );
}
