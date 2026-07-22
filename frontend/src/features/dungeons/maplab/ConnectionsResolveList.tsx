import { floorsInLayout, type MapLayout, type MapPortal } from './maplabModel'

interface ConnectionsResolveListProps {
  layout: MapLayout
  onResolve: (portal: MapPortal) => void
}

function floorLabel(layout: MapLayout, z: number): string {
  const floor = floorsInLayout(layout).find((candidate) => candidate.z === z)
  return floor?.title ?? `Floor ${z}`
}

/** Connections resolve list — Stage 2 ships only membership rule 1 (a portal with no destination).
 * The other two row types (incoming link with no return; target dungeon deleted) are cross-dungeon
 * concepts that arrive with Stage 2's gateways. */
export function ConnectionsResolveList({ layout, onResolve }: ConnectionsResolveListProps) {
  const unresolved = layout.portals.filter((portal) => portal.to === undefined)

  return (
    <section className="maplab-connections-resolve-list" aria-label="Connections to resolve">
      <h3 className="maplab-connections-resolve-list-title">To resolve</h3>
      {unresolved.length === 0 ? (
        <p className="maplab-connections-resolve-list-empty">Every connection has both ends. Nothing to resolve.</p>
      ) : (
        <ul className="maplab-connections-resolve-list-items">
          {unresolved.map((portal) => (
            <li key={portal.portal_id} className="maplab-connections-resolve-list-item">
              <span className="maplab-connections-resolve-list-item-label">
                {portal.title ?? `Portal ${portal.portal_id}`} — {floorLabel(layout, portal.z)}
              </span>
              <button
                type="button"
                className="maplab-pill-button maplab-connections-resolve-list-action"
                onClick={() => onResolve(portal)}
              >
                Choose destination
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
