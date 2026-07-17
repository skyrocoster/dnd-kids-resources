const legendRows = [
  { key: 'update', label: 'Woven update', tone: 'update', glyph: '■' },
  { key: 'planned', label: 'Beacon anchor', tone: 'anchor', glyph: '◇' },
  { key: 'reached', label: 'Reached anchor', tone: 'anchor-filled', glyph: '◆' },
  { key: 'abandoned', label: 'Abandoned anchor', tone: 'abandoned', glyph: '△' },
  { key: 'now', label: 'Now', tone: 'now', glyph: 'N' },
  { key: 'next', label: 'Next', tone: 'next', glyph: '→' },
] as const

/** Legend section of the Weaver's panel, shown when nothing is selected.
 *  Each row carries a shape + label so the semantics do not rely on hue alone. */
export function LoomLegend() {
  return (
    <div className="loom-legend" aria-label="Loom legend">
      <p className="loom-weaver-copy">Select a thread update, anchor, or edge to inspect it here.</p>
      <ul className="loom-legend-list">
        {legendRows.map((row) => (
          <li key={row.key} className="loom-legend-row">
            <span className="loom-legend-key" data-tone={row.tone} aria-hidden="true">
              {row.glyph}
            </span>
            <span>{row.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
