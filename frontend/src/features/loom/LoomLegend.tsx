const legendRows = [
  { key: 'start', label: 'Start node', tone: 'start', glyph: '▶' },
  { key: 'end', label: 'End node', tone: 'end', glyph: '■' },
  { key: 'beat', label: 'Story beat', tone: 'beat', glyph: '◆' },
  { key: 'session', label: 'Recorded session', tone: 'session', glyph: '●' },
  { key: 'now', label: 'Now', tone: 'now', glyph: 'N' },
  { key: 'next', label: 'Next', tone: 'next', glyph: '→' },
] as const

/** Legend section of the Weaver's panel, shown when nothing is selected.
 *  Each row carries a shape + label so the semantics do not rely on hue alone. */
export function LoomLegend() {
  return (
    <div className="loom-legend" aria-label="Loom legend">
      <p className="loom-weaver-copy">Select a node on the tapestry to inspect it here.</p>
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
