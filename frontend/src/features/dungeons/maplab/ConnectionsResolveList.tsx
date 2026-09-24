import type { Dungeon, IncomingGateway } from "../../../api/types";
import { Button } from "../../../components/Button";
import { StatePanel } from "../../../components/StatePanel";
import { floorsInLayout, type MapLayout, type MapPortal } from "../../../model/maplabModel";

interface ConnectionsResolveListProps {
  layout: MapLayout;
  dungeons: Dungeon[];
  incomingGateways: IncomingGateway[];
  connectionsLoaded: boolean;
  connectionsLoadError: boolean;
  onResolve: (portal: MapPortal) => void;
  onRemoveGateway: (portal: MapPortal) => void;
  onAddReturnGateway: (gateway: IncomingGateway) => void;
}

function floorLabel(layout: MapLayout, z: number): string {
  const floor = floorsInLayout(layout).find((candidate) => candidate.z === z);
  return floor?.title ?? `Floor ${z}`;
}

/** Connections resolve list: surfaces every unfinished cross-dungeon connection for this layout —
 * a portal with no destination, a gateway whose target dungeon no longer exists, and other
 * dungeons' gateways that point here with no portal here pointing back. */
export function ConnectionsResolveList({
  layout,
  dungeons,
  incomingGateways,
  connectionsLoaded,
  connectionsLoadError,
  onResolve,
  onRemoveGateway,
  onAddReturnGateway,
}: ConnectionsResolveListProps) {
  if (connectionsLoadError) {
    return (
      <section className="maplab-connections-resolve-list" aria-label="Connections to resolve">
        <h3 className="maplab-connections-resolve-list-title">To resolve</h3>
        <StatePanel status="error" title="Couldn't load connections" message="Try again shortly." />
      </section>
    );
  }

  const unresolved = layout.portals.filter((portal) => portal.to === undefined);

  // A gateway can only be judged broken against a dungeon list we actually have. Until the fetch
  // lands, `dungeons` is empty and every valid gateway would read as broken — offering [remove]
  // on links that are fine.
  const dungeonIds = new Set(dungeons.map((dungeon) => dungeon.id));
  const brokenGateways = connectionsLoaded
    ? layout.portals.filter(
        (portal) => portal.to?.dungeon_id !== undefined && !dungeonIds.has(portal.to.dungeon_id),
      )
    : [];

  const gatewaysWithoutReturn = incomingGateways.filter(
    (gateway) => !layout.portals.some((portal) => portal.to?.dungeon_id === gateway.dungeon_id),
  );

  const nothingToResolve =
    unresolved.length === 0 && brokenGateways.length === 0 && gatewaysWithoutReturn.length === 0;

  return (
    <section className="maplab-connections-resolve-list" aria-label="Connections to resolve">
      <h3 className="maplab-connections-resolve-list-title">To resolve</h3>
      {nothingToResolve ? (
        <p className="maplab-connections-resolve-list-empty">
          Every connection has both ends. Nothing to resolve.
        </p>
      ) : (
        <ul className="maplab-connections-resolve-list-items">
          {unresolved.map((portal) => (
            <li
              key={`unresolved-${portal.portal_id}`}
              className="maplab-connections-resolve-list-item"
            >
              <span className="maplab-connections-resolve-list-item-label">
                {portal.title ?? `Portal ${portal.portal_id}`} — {floorLabel(layout, portal.z)}
              </span>
              <Button
                type="button"
                className="maplab-pill-button maplab-connections-resolve-list-action"
                onClick={() => onResolve(portal)}
              >
                Choose destination
              </Button>
            </li>
          ))}
          {brokenGateways.map((portal) => (
            <li key={`broken-${portal.portal_id}`} className="maplab-connections-resolve-list-item">
              <span className="maplab-connections-resolve-list-item-label">
                {portal.title ?? `Portal ${portal.portal_id}`} — {floorLabel(layout, portal.z)}{" "}
                links to a dungeon that no longer exists
              </span>
              <Button
                type="button"
                className="maplab-pill-button maplab-connections-resolve-list-action"
                onClick={() => onResolve(portal)}
              >
                Repoint
              </Button>
              <Button
                type="button"
                className="maplab-pill-button maplab-connections-resolve-list-action"
                onClick={() => onRemoveGateway(portal)}
              >
                Remove
              </Button>
            </li>
          ))}
          {gatewaysWithoutReturn.map((gateway) => (
            <li
              key={`incoming-${gateway.dungeon_id}-${gateway.portal_id}`}
              className="maplab-connections-resolve-list-item"
            >
              <span className="maplab-connections-resolve-list-item-label">
                {gateway.dungeon_title} links here, at square {gateway.cell[0]},{gateway.cell[1]}
              </span>
              <Button
                type="button"
                className="maplab-pill-button maplab-connections-resolve-list-action"
                onClick={() => onAddReturnGateway(gateway)}
              >
                Add the return gateway
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
