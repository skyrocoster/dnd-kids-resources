import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  absoluteCells,
  floorsInLayout,
  layoutBounds,
  paddedBounds,
  roomsOnZ,
} from "../model/maplabModel";
import type { KidMapLayout } from "./curtain";
import type { Bounds, MapLayout } from "../model/maplabModel";
import { IconButton } from "../components/IconButton";
import { FloorPicker } from "./FloorPicker";
import { useMapCanvasZoom, BASE_PX_PER_UNIT } from "../map/useMapCanvasZoom";
import type { ViewportSize, ZoomState } from "../map/useMapCanvasZoom";
import { PlayerVisibleMap } from "../map/PlayerVisibleMap";

const CELL_SIZE = BASE_PX_PER_UNIT;
const MIN_KID_SCALE = 48 / BASE_PX_PER_UNIT;

type Point = { x: number; y: number };

export function PlayerMapRenderer({
  layout,
  openDoorIds,
  partyRoomId,
}: {
  layout: KidMapLayout;
  openDoorIds?: ReadonlySet<number>;
  partyRoomId?: number | null;
}) {
  const ml = layout as unknown as MapLayout;
  const bounds = paddedBounds(ml);
  // Memoized: `floors` feeds the `partyRoomInfo` useMemo, whose identity gates the party-fit
  // effect. A fresh array every render would churn `partyRoomInfo` on each render and re-run that
  // effect forever (setState -> render -> new floors -> ...), hanging any test with a partyRoomId.
  const floors = useMemo(() => floorsInLayout(ml), [ml]);
  const [selectedZ, setSelectedZ] = useState<number>(floors.length > 0 ? floors[0].z : 0);
  const activeFloorInfo = floors.find((f) => f.z === selectedZ);

  const { zoom, handleWheel, handlePointerDown, handlePointerMove, handlePointerUp, fitToBounds } =
    useMapCanvasZoom({ wheelZoomMode: "always", pointerMode: "pan" });

  // Keyboard pan offset — additive on top of gesture pan so arrow-key navigation
  // coexists with the shared pan/zoom hook (which does not expose pan-by-delta).
  const [kbOffset, setKbOffset] = useState({ x: 0, y: 0 });
  const combinedZoom: ZoomState = {
    scale: zoom.scale,
    pan: { x: zoom.pan.x + kbOffset.x, y: zoom.pan.y + kbOffset.y },
  };

  // One floor is on screen at a time, so the fit is to *that floor's* plate — fitting the union of
  // every floor's bounds (what the viewBox spans) left the visible plate small and pushed off-centre
  // by whichever other floor reached furthest.
  const floorBounds = useMemo<Bounds>(() => {
    const roomsHere = roomsOnZ(ml, selectedZ);
    if (roomsHere.length === 0) return bounds;
    const tight = layoutBounds(roomsHere);
    const { padding } = ml.meta;
    return {
      minX: tight.minX - padding.left,
      maxX: tight.maxX + padding.right,
      minY: tight.minY - padding.top,
      maxY: tight.maxY + padding.bottom,
    };
  }, [ml, selectedZ, bounds]);

  // Auto-fit the selected floor: once when the viewport first reports a size, and again whenever the
  // floor changes (a new plate is a new shape, and the old pan would leave it off screen).
  const viewportSizeRef = useRef<ViewportSize | null>(null);
  const fitInputsRef = useRef({ floorBounds, bounds });
  fitInputsRef.current = { floorBounds, bounds };
  const fittedZRef = useRef<number | null>(null);

  const fitSelectedFloor = useCallback(
    (size: ViewportSize, z: number) => {
      fittedZRef.current = z;
      setKbOffset({ x: 0, y: 0 });
      fitToBounds(fitInputsRef.current.floorBounds, size, fitInputsRef.current.bounds, {
        floorScale: MIN_KID_SCALE,
      });
    },
    [fitToBounds],
  );

  const handleViewportResize = useCallback(
    (size: ViewportSize) => {
      viewportSizeRef.current = size;
      if (fittedZRef.current !== null) return;
      fitSelectedFloor(size, selectedZ);
    },
    [fitSelectedFloor, selectedZ],
  );

  useEffect(() => {
    const size = viewportSizeRef.current;
    if (!size || fittedZRef.current === selectedZ) return;
    fitSelectedFloor(size, selectedZ);
  }, [selectedZ, fitSelectedFloor]);

  // Viewport element reference for keyboard panning.
  const viewportElRef = useRef<HTMLElement | null>(null);
  const handleViewportRef = useCallback((el: HTMLElement | null) => {
    viewportElRef.current = el;
  }, []);

  // Keyboard panning via native listener on the MapCanvas viewport.
  useEffect(() => {
    const el = viewportElRef.current;
    if (!el) return;
    const handler = (e: globalThis.KeyboardEvent) => {
      const deltas: Record<string, Point> = {
        ArrowUp: { x: 0, y: 48 },
        ArrowDown: { x: 0, y: -48 },
        ArrowLeft: { x: 48, y: 0 },
        ArrowRight: { x: -48, y: 0 },
      };
      const delta = deltas[e.key];
      if (!delta) return;
      e.preventDefault();
      setKbOffset((kp) => ({ x: kp.x + delta.x, y: kp.y + delta.y }));
    };
    el.addEventListener("keydown", handler);
    return () => el.removeEventListener("keydown", handler);
  }, []);

  const floorWidth = (bounds.maxX - bounds.minX + 1) * CELL_SIZE;
  const floorHeight = (bounds.maxY - bounds.minY + 1) * CELL_SIZE;
  const viewBox = `${bounds.minX * CELL_SIZE} ${bounds.minY * CELL_SIZE} ${floorWidth} ${floorHeight}`;

  // --- Party room highlight and follow ---
  const [following, setFollowing] = useState(true);

  const hatchId = useId();

  const partyRoomInfo = useMemo<{
    room: { room_id: number; title?: string };
    z: number;
    bounds: Bounds;
    cells: [number, number][];
  } | null>(() => {
    if (partyRoomId == null) return null;
    for (const f of floors) {
      const roomsHere = roomsOnZ(ml, f.z);
      const room = roomsHere.find((candidate) => candidate.room_id === partyRoomId);
      if (room) {
        const cells = absoluteCells(room) as [number, number][];
        if (cells.length === 0) return null;
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
        return { room, z: f.z, bounds: { minX, maxX, minY, maxY }, cells };
      }
    }
    return null;
  }, [partyRoomId, ml, floors]);

  const onPanStart = useCallback(
    (e: PointerEvent) => {
      setFollowing(false);
      handlePointerDown(e);
    },
    [handlePointerDown],
  );

  const partyRoomFittedRef = useRef<number | null>(null);

  useEffect(() => {
    if (!partyRoomInfo || !following) return;
    const size = viewportSizeRef.current;
    if (!size) return;

    // If party room is on a different floor, switch — prevent the floor-fit
    // effect from overriding the party-room fit by pre-setting the ref.
    if (partyRoomInfo.z !== selectedZ) {
      fittedZRef.current = partyRoomInfo.z;
      setSelectedZ(partyRoomInfo.z);
      return;
    }

    // Fit to party room bounds
    partyRoomFittedRef.current = partyRoomInfo.room.room_id;
    fittedZRef.current = selectedZ;
    setKbOffset({ x: 0, y: 0 });
    fitToBounds(partyRoomInfo.bounds, size, fitInputsRef.current.bounds, {
      floorScale: MIN_KID_SCALE,
    });
  }, [partyRoomInfo, following, selectedZ, fitToBounds]);

  const handleReturnToParty = useCallback(() => {
    if (!partyRoomInfo) return;
    setFollowing(true);
    partyRoomFittedRef.current = null;
    const size = viewportSizeRef.current;
    if (!size) return;
    if (partyRoomInfo.z !== selectedZ) {
      fittedZRef.current = partyRoomInfo.z;
      setSelectedZ(partyRoomInfo.z);
      return;
    }
    fittedZRef.current = selectedZ;
    setKbOffset({ x: 0, y: 0 });
    fitToBounds(partyRoomInfo.bounds, size, fitInputsRef.current.bounds, {
      floorScale: MIN_KID_SCALE,
    });
  }, [partyRoomInfo, selectedZ, fitToBounds]);

  // (marker, prop, and lock/trap rendering moved to PlayerVisibleMap)

  return (
    <>
      <PlayerVisibleMap
        layout={layout}
        openDoorIds={openDoorIds}
        selectedZ={selectedZ}
        onFloorChange={setSelectedZ}
        bounds={bounds}
        viewBox={viewBox}
        zoom={combinedZoom}
        onWheelZoom={handleWheel}
        onPanStart={onPanStart}
        onPanMove={handlePointerMove}
        onPanEnd={handlePointerUp}
        onViewportResize={handleViewportResize}
        strokeViewportRef={handleViewportRef}
        partyRoomInfo={partyRoomInfo}
        hatchId={hatchId}
        floorBounds={floorBounds}
        activeFloorTitle={activeFloorInfo?.title}
      />
      <FloorPicker floors={floors} selectedZ={selectedZ} onSelectFloor={setSelectedZ} />
      {partyRoomInfo && (
        <IconButton
          type="button"
          label="Return to party room"
          className="player-map-return-btn"
          onClick={handleReturnToParty}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-9 9" />
            <path d="M3 3v6h6" />
            <path d="M3 12h6" />
          </svg>
        </IconButton>
      )}
    </>
  );
}
