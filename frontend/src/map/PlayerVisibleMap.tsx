import type { ReactNode } from "react";
import {
  absoluteCells,
  roomLabelAnchor,
  doorSwingGeometry,
  doorWallSegment,
  doorsOnFloor,
  findDoorAtEdge,
  gridMarkerOffset,
  markersAtCell,
  otherFloorZ,
  roomWallSegments,
  roomsOnZ,
  stairCellForZ,
  stairDirection,
  stairEndpointsForZ,
} from "../model/maplabModel";
import type { KidMapLayout } from "../player/curtain";
import type {
  Bounds,
  MapDoor,
  MapLayout,
  MapPortal,
  MapProp,
  MapStair,
} from "../model/maplabModel";
import { boundedBadgeLayout, playerFixtureBadge, type MarkerBadge } from "./markerBadges";
import { BadgeDisc } from "./BadgeDisc";
import { MapCanvas } from "./MapCanvas";
import { BASE_PX_PER_UNIT } from "./useMapCanvasZoom";
import type { ViewportSize, ZoomState } from "./useMapCanvasZoom";
import {
  type KidMarkerKind,
  kidFamilyTokens,
  kidMarkerFamily,
  kidMarkerIcon,
  onSquareMarkerGeometry,
  openingMarkerGeometry,
  wallAttachedMarkerGeometry,
} from "./markerShapeModel";

const CELL_SIZE = BASE_PX_PER_UNIT;
const LABEL_PX = 16;
const LABEL_HALO_PX = 4;
const DOOR_PX = 8;
const DISC_RADIUS_PX = 14;

/** Room titles are sized in map units, not screen pixels, so they zoom with the plate instead of
 * being hidden when the map gets small — a label that vanishes tells a kid nothing. The size is
 * capped to the room's own box so the name stays inside its room at every zoom. */
const LABEL_UNITS = 0.34 * CELL_SIZE;
const LABEL_MIN_UNITS = 0.2 * CELL_SIZE;
const LABEL_HALO_RATIO = LABEL_HALO_PX / LABEL_PX;
/** Rough advance width of one character as a fraction of font size, for the fit cap. */
const LABEL_CHAR_WIDTH_RATIO = 0.55;

function roomLabelFontSize(cells: [number, number][], title: string): number {
  if (cells.length === 0 || title.length === 0) return LABEL_UNITS;
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const [x, y] of cells) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const boxWidth = (maxX - minX + 1) * CELL_SIZE;
  const boxHeight = (maxY - minY + 1) * CELL_SIZE;
  const byWidth = (boxWidth * 0.9) / (title.length * LABEL_CHAR_WIDTH_RATIO);
  const byHeight = boxHeight * 0.5;
  return Math.max(LABEL_MIN_UNITS, Math.min(LABEL_UNITS, byWidth, byHeight));
}

/** The single badge the player map shows for a fixture, per the player policy: at most one
 *  icon-only status per fixture, Trap before Lock, and only statuses that are armed and shown.
 *  The winning descriptor comes from the shared neutral badge vocabulary, restricted to the one
 *  player-legal active-and-shown status emitted by the curtain; concealment and loot never reach
 *  the player map. */
function playerStatusDescriptor(
  fixture: MapDoor | MapStair | MapProp | MapPortal,
): MarkerBadge | null {
  return playerFixtureBadge(fixture);
}

export interface PartyRoomInfo {
  room: { room_id: number; title?: string };
  z: number;
  bounds: Bounds;
  cells: [number, number][];
}

export interface PlayerVisibleMapProps {
  layout: KidMapLayout;
  openDoorIds?: ReadonlySet<number>;
  selectedZ: number;
  onFloorChange: (z: number) => void;
  bounds: Bounds;
  viewBox: string;
  zoom: ZoomState;
  onWheelZoom?: (e: WheelEvent) => void;
  onPanStart?: (e: PointerEvent) => void;
  onPanMove?: (e: PointerEvent) => void;
  onPanEnd?: (e: PointerEvent) => void;
  onViewportResize?: (size: ViewportSize) => void;
  strokeViewportRef?: (el: HTMLElement | null) => void;
  partyRoomInfo: PartyRoomInfo | null;
  hatchId: string;
  floorBounds: Bounds;
  activeFloorTitle?: string;
}

export function PlayerVisibleMap({
  layout,
  openDoorIds,
  selectedZ,
  onFloorChange,
  bounds,
  viewBox,
  zoom,
  onWheelZoom,
  onPanStart,
  onPanMove,
  onPanEnd,
  onViewportResize,
  strokeViewportRef,
  partyRoomInfo,
  hatchId,
  floorBounds,
  activeFloorTitle,
}: PlayerVisibleMapProps) {
  const ml = layout as unknown as MapLayout;
  const rooms = roomsOnZ(ml, selectedZ);
  const doors = doorsOnFloor(ml, selectedZ);
  // An open door has no token at all — the doorway is a hole in the wall with the leaf swung out of
  // it, so its wall edge is skipped too (a closed door still keeps the wall running through its disc).
  const openDoors = doors.filter((door) => openDoorIds?.has(door.door_id) ?? false);

  // --- On-square markers (portals, on-square props) with fan-out ---
  const onSquareMarkerEls = (() => {
    const cellMarkers = new Map<string, { cell: [number, number]; kind: KidMarkerKind }[]>();
    const cells = new Map<string, [number, number]>();
    const addToCell = (cell: [number, number], kind: KidMarkerKind) => {
      const key = `${cell[0]},${cell[1]}`;
      cells.set(key, cell);
      if (!cellMarkers.has(key)) cellMarkers.set(key, []);
      cellMarkers.get(key)!.push({ cell, kind });
    };
    // Collect portals
    if (layout.portals) {
      for (const p of layout.portals) {
        if (p.z === selectedZ) addToCell(p.cell, { kind: "portal" });
      }
    }
    // Collect on-square props
    if (layout.props) {
      for (const p of layout.props) {
        if (p.z !== selectedZ || p.side) continue;
        const mk: KidMarkerKind =
          p.kind === "window"
            ? { kind: "window" }
            : p.kind === "chest"
              ? { kind: "chest" }
              : p.kind === "table"
                ? { kind: "table" }
                : p.kind === "mirror"
                  ? { kind: "mirror" }
                  : p.kind === "barrel"
                    ? { kind: "barrel" }
                    : p.kind === "statue"
                      ? { kind: "statue" }
                      : p.kind === "npc"
                        ? { kind: "npc" }
                        : { kind: "other" };
        addToCell(p.cell, mk);
      }
    }
    return Array.from(cellMarkers.entries()).flatMap(([key, collected]) => {
      const cell = cells.get(key)!;
      // Use markersAtCell only for count and ordering (fan-out needs total count)
      const allAtCell = markersAtCell(ml, selectedZ, cell);
      const nonStairCount = allAtCell.filter((marker) => marker.type !== "stair").length;
      return collected.map((item, idx) => {
        const offset = gridMarkerOffset(nonStairCount, idx);
        const geo = onSquareMarkerGeometry(cell, CELL_SIZE, {
          offset: { dx: offset.dx, dy: offset.dy },
          grouped: nonStairCount > 1,
        });
        const Icon = kidMarkerIcon(item.kind);
        const { fill, on } = kidFamilyTokens(kidMarkerFamily(item.kind));
        const iconSize = geo.iconSize;
        return (
          <g key={`cell-${key}-${idx}`} className="kid-on-square-marker">
            <circle
              className="kid-marker-disc"
              cx={geo.cx}
              cy={geo.cy}
              r={geo.radius}
              style={{ fill: `var(${fill})`, stroke: `var(${on})` }}
            />
            <g transform={`translate(${geo.cx - iconSize / 2}, ${geo.cy - iconSize / 2})`}>
              <Icon width={iconSize} height={iconSize} style={{ color: `var(${on})` }} />
            </g>
          </g>
        );
      });
    });
  })();

  // --- Wall-attached props ---
  const wallPropEls = layout.props
    .filter((prop) => prop.z === selectedZ && prop.side)
    .map((prop, idx) => {
      if (!prop.side) return null;
      // A window is an opening, so it straddles its wall at doorway size; anything else hung on a
      // wall stays the smaller fixture disc.
      const geo =
        prop.kind === "window"
          ? openingMarkerGeometry(prop.cell, prop.side, CELL_SIZE)
          : wallAttachedMarkerGeometry(prop.cell, prop.side, CELL_SIZE);
      const mk: KidMarkerKind =
        prop.kind === "window"
          ? { kind: "window" }
          : prop.kind === "chest"
            ? { kind: "chest" }
            : prop.kind === "table"
              ? { kind: "table" }
              : prop.kind === "mirror"
                ? { kind: "mirror" }
                : prop.kind === "barrel"
                  ? { kind: "barrel" }
                  : prop.kind === "statue"
                    ? { kind: "statue" }
                    : prop.kind === "npc"
                      ? { kind: "npc" }
                      : { kind: "other" };
      const Icon = kidMarkerIcon(mk);
      const { fill, on } = kidFamilyTokens(kidMarkerFamily(mk));
      return (
        <g key={`wall-prop-${idx}`} className="kid-wall-marker">
          <circle
            className="kid-marker-disc"
            cx={geo.cx}
            cy={geo.cy}
            r={geo.radius}
            style={{ fill: `var(${fill})`, stroke: `var(${on})` }}
          />
          <g transform={`translate(${geo.cx - geo.iconSize / 2}, ${geo.cy - geo.iconSize / 2})`}>
            <Icon width={geo.iconSize} height={geo.iconSize} style={{ color: `var(${on})` }} />
          </g>
        </g>
      );
    });

  // --- Lock/trap cues for disclosed conditions ---
  // Player policy: at most one icon-only badge per fixture — Trap before Lock, only statuses the
  // player can see (armed and shown), and no status text or fixture title. The badge is driven by
  // the shared fixture-state descriptor (winning icon, tokens, and accessible label) and bounded
  // to the owning cell so the cue uses the same geometry at every zoom.

  const lockTrapEls: ReactNode[] = [];

  const addCue = (
    key: string,
    cell: [number, number],
    fixture: MapDoor | MapStair | MapProp | MapPortal,
  ) => {
    const descriptor = playerStatusDescriptor(fixture);
    if (!descriptor) return;
    const geometry = boundedBadgeLayout(
      cell[0] * CELL_SIZE,
      cell[1] * CELL_SIZE,
      CELL_SIZE,
      (cell[0] + 0.5) * CELL_SIZE,
      (cell[1] + 0.5) * CELL_SIZE,
      DISC_RADIUS_PX,
      DISC_RADIUS_PX,
    );
    lockTrapEls.push(
      <BadgeDisc
        badge={descriptor}
        cx={geometry.cx}
        cy={geometry.cy}
        radius={geometry.radius}
        key={key}
        className={`player-map-cue player-map-cue--${descriptor.key}`}
        discClassName="player-map-cue-disc"
        dataBadge={descriptor.key}
      />,
    );
  };

  for (const door of doors) {
    const isOpen = openDoorIds?.has(door.door_id) ?? false;
    if (isOpen) continue;
    addCue(`door-${door.door_id}`, door.cell, door);
  }

  for (const stair of stairEndpointsForZ(ml, selectedZ)) {
    const cell = stairCellForZ(stair, selectedZ);
    if (!cell) continue;
    if (stairDirection(stair, selectedZ) === "level") continue;
    addCue(`stair-${stair.stair_id}-${selectedZ}`, cell, stair);
  }

  for (const prop of ml.props ?? []) {
    if (prop.z !== selectedZ) continue;
    addCue(`prop-${prop.prop_id}`, prop.cell, prop);
  }

  for (const portal of ml.portals ?? []) {
    if (portal.z !== selectedZ) continue;
    addCue(`portal-${portal.portal_id}`, portal.cell, portal);
  }

  return (
    <div className="player-map-region" role="region" aria-label="Dungeon map">
      <MapCanvas
        viewBox={viewBox}
        bounds={bounds}
        zoom={zoom}
        ariaLabel="Dungeon map layout"
        onWheelZoom={onWheelZoom ?? (() => {})}
        onPanStart={onPanStart ?? (() => {})}
        onPanMove={onPanMove ?? (() => {})}
        onPanEnd={onPanEnd ?? (() => {})}
        onViewportResize={onViewportResize ?? (() => {})}
        strokeViewportRef={strokeViewportRef}
        variant="neutral"
      >
        {partyRoomInfo && (
          <defs>
            <pattern
              id={hatchId}
              patternUnits="userSpaceOnUse"
              width={10}
              height={10}
              patternTransform={`scale(${zoom.scale > 0 ? 1 / zoom.scale : 1})`}
            >
              <line
                x1="0"
                y1="0"
                x2="10"
                y2="10"
                stroke="var(--kid-map-party-hatch)"
                strokeWidth={1.5}
              />
              <line
                x1="10"
                y1="0"
                x2="0"
                y2="10"
                stroke="var(--kid-map-party-hatch)"
                strokeWidth={1.5}
              />
            </pattern>
          </defs>
        )}
        <g data-floor={selectedZ} data-testfloor="true">
          <rect
            className="player-map-floor"
            x={floorBounds.minX * CELL_SIZE}
            y={floorBounds.minY * CELL_SIZE}
            width={(floorBounds.maxX - floorBounds.minX + 1) * CELL_SIZE}
            height={(floorBounds.maxY - floorBounds.minY + 1) * CELL_SIZE}
          />
          {rooms
            .filter((room) => absoluteCells(room).length > 0)
            .map((room) => {
              const center = roomLabelAnchor(room, CELL_SIZE);
              const cells = absoluteCells(room);
              const title = room.title ?? `Room ${room.room_id}`;
              const fontSize = roomLabelFontSize(cells as [number, number][], title);
              const strokeWidth = fontSize * LABEL_HALO_RATIO;
              const isParty = partyRoomInfo != null && room.room_id === partyRoomInfo.room.room_id;
              return (
                <g key={room.room_id} className="player-map-room" data-room-id={room.room_id}>
                  {cells.map(([x, y]) => (
                    <rect
                      key={`${x}-${y}`}
                      className={`player-map-room-cell${isParty ? " player-map-room-cell--party" : ""}`}
                      data-room-cell={`${x},${y}`}
                      x={x * CELL_SIZE}
                      y={y * CELL_SIZE}
                      width={CELL_SIZE}
                      height={CELL_SIZE}
                    />
                  ))}
                  {isParty &&
                    cells.map(([x, y]) => (
                      <rect
                        key={`party-hatch-${x}-${y}`}
                        x={x * CELL_SIZE}
                        y={y * CELL_SIZE}
                        width={CELL_SIZE}
                        height={CELL_SIZE}
                        fill={`url(#${hatchId})`}
                        pointerEvents="none"
                      />
                    ))}
                  {/* Every perimeter edge except an open doorway: a closed kid door is a disc with the
                  wall running through it, so leaving that edge unwalled left a hole the disc didn't
                  fill — but an open door has no disc, and needs the gap to read as a way through. */}
                  {roomWallSegments(room)
                    .filter((edge) => findDoorAtEdge(edge, openDoors) === undefined)
                    .map((edge) => {
                      const segment = doorWallSegment(edge, CELL_SIZE);
                      return (
                        <line
                          key={`${edge.cell[0]}-${edge.cell[1]}-${edge.side}`}
                          className="player-map-wall"
                          {...segment}
                        />
                      );
                    })}
                  <text
                    className="player-map-room-title"
                    x={center.x}
                    y={center.y}
                    style={{ fontSize, strokeWidth }}
                  >
                    {title}
                  </text>
                </g>
              );
            })}
          {doors.map((door) => {
            const isOpen = openDoorIds?.has(door.door_id) ?? false;
            const swingDoorWidth = DOOR_PX / zoom.scale;

            // Open: the token is gone entirely, leaving the gap in the wall plus the swung leaf — the
            // way an open door reads on a real plan, and one fewer thing on screen for a kid to parse.
            if (isOpen) {
              const swing = doorSwingGeometry(door, CELL_SIZE);
              return (
                <g
                  key={door.door_id}
                  className="player-map-door"
                  data-door-id={door.door_id}
                  data-door-open="true"
                >
                  <line
                    className="player-map-door-leaf"
                    x1={swing.hinge.x}
                    y1={swing.hinge.y}
                    x2={swing.leafTip.x}
                    y2={swing.leafTip.y}
                    style={{ strokeWidth: swingDoorWidth }}
                  />
                  <path
                    className="player-map-door-swing"
                    d={`M ${swing.leafTip.x} ${swing.leafTip.y} A ${swing.radius} ${swing.radius} 0 0 ${swing.sweepFlag} ${swing.farJamb.x} ${swing.farJamb.y}`}
                    style={{ strokeWidth: swingDoorWidth / 2 }}
                  />
                </g>
              );
            }

            // Closed: sized against the cell, not in constant screen pixels — a doorway is one cell
            // wide and the disc has to keep filling it at every zoom.
            const geo = openingMarkerGeometry(door.cell, door.side, CELL_SIZE);
            const doorKind: KidMarkerKind = { kind: "door", open: false };
            const DoorIcon = kidMarkerIcon(doorKind);
            const { on: doorOn } = kidFamilyTokens(kidMarkerFamily(doorKind));
            const iconSize = geo.iconSize;

            return (
              <g
                key={door.door_id}
                className="player-map-door"
                data-door-id={door.door_id}
                data-door-open="false"
              >
                <circle className="player-map-door-disc" cx={geo.cx} cy={geo.cy} r={geo.radius} />
                <g transform={`translate(${geo.cx - iconSize / 2}, ${geo.cy - iconSize / 2})`}>
                  <DoorIcon
                    width={iconSize}
                    height={iconSize}
                    style={{ color: `var(${doorOn})` }}
                  />
                </g>
              </g>
            );
          })}
          {stairEndpointsForZ(ml, selectedZ).map((stair) => {
            const cell = stairCellForZ(stair, selectedZ);
            if (!cell) return null;
            const direction = stairDirection(stair, selectedZ);
            if (direction === "level") return null;
            const cx = (cell[0] + 0.5) * CELL_SIZE;
            const cy = (cell[1] + 0.5) * CELL_SIZE;
            const discR = DISC_RADIUS_PX / zoom.scale;
            const stairKind: KidMarkerKind = {
              kind: "stair",
              stairDir: direction === "up" ? "up" : "down",
            };
            const StairIcon = kidMarkerIcon(stairKind);
            const iconSize = discR * 1.2;
            const { on: stairOn } = kidFamilyTokens(kidMarkerFamily(stairKind));
            const otherZ = otherFloorZ(stair, selectedZ);
            return (
              <g
                key={`stair-${stair.stair_id}-${selectedZ}`}
                className="player-map-stair"
                data-stair-id={stair.stair_id}
                data-stair-direction={direction}
                role="button"
                tabIndex={0}
                aria-label={`Go to floor ${otherZ}`}
                onClick={() => {
                  if (otherZ !== null) onFloorChange(otherZ);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (otherZ !== null) onFloorChange(otherZ);
                  }
                }}
              >
                <circle className="player-map-stair-disc" cx={cx} cy={cy} r={discR} />
                <g transform={`translate(${cx - iconSize / 2}, ${cy - iconSize / 2})`}>
                  <StairIcon
                    width={iconSize}
                    height={iconSize}
                    style={{ color: `var(${stairOn})` }}
                  />
                </g>
              </g>
            );
          })}
          {onSquareMarkerEls}
          {wallPropEls}
          {lockTrapEls}
          {activeFloorTitle && (
            <text
              className="player-map-floor-title"
              x={(floorBounds.minX + 0.5) * CELL_SIZE}
              y={(floorBounds.minY + 0.75) * CELL_SIZE}
              style={{ fontSize: LABEL_PX / zoom.scale }}
            >
              {activeFloorTitle}
            </text>
          )}
        </g>
      </MapCanvas>
    </div>
  );
}
