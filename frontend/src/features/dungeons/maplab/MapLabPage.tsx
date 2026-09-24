import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./MapLabPage.css";
import { getAtTheTable, listDungeons, setAtTheTable } from "../../../api/client";
import { Button } from "../../../components/Button";
import { MapLabRouteState } from "./MapLabRouteState";
import { useDungeonShellContext } from "./dungeonRouteContext";
import { useMapLabLayout } from "./useMapLabLayout";
import { useMapLabSessionState, type SessionFixtureKind } from "./useMapLabSessionState";
import { useMapCanvasZoom, type ViewportSize } from "../../../map/useMapCanvasZoom";
import { useMapLabNavigationSession } from "./useMapLabNavigationSession";
import { EyeIcon } from "../../../components/icons";
import { Popover } from "../../../components/Popover";
import { ToggleGroup } from "../../../components/form/ToggleGroup";
import { ToolbarTray } from "./MapLabToolbar";
import { MAP_LAYER_KEYS, useMapDensity, useMapLayerVisibility } from "./mapLabToolbarState";
import { resolveMapDensity } from "../../../map/mapDensity";
import { parseDungeonData } from "../dungeonModel";
import { type ObstacleInspectorAdapter } from "./InspectorPanel";
import { useActiveRoom } from "./useActiveRoom";
import { MapLabViewerCanvas } from "./MapLabViewerCanvas";
import { MapLabViewerOverlays } from "./MapLabViewerOverlays";
import {
  doorsOnFloor,
  floorsInLayout,
  otherFloorZ,
  paddedBounds,
  portalsOnFloor,
  propsOnFloor,
  roomsOnZ,
  stairCellForZ,
  stairEndpointsForZ,
  type Inspectable,
  type MapDoor,
  type MapPortal,
  type MapProp,
  type MapStair,
  type SessionFixtureState,
  defaultFixtureState,
  type FixtureState,
} from "../../../model/maplabModel";

const CELL_SIZE = 64;

/** One Armed-column leaf for the shared inspector's `onToggleArmed` — a sparse session override
 *  carrying just that obstacle's armed value, merged onto the fixture's existing override. */
function obstacleArmedLeaf(
  obstacle: "concealment" | "lock" | "trap",
  armed: boolean,
): SessionFixtureState {
  if (obstacle === "concealment") return { obstacles: { concealment: { armed } } };
  if (obstacle === "lock") return { obstacles: { lock: { armed } } };
  return { obstacles: { trap: { armed } } };
}
/** Merge a sparse session leaf onto a fixture's current override, then drop any leaf whose value
 *  equals the authored value — a leaf equal to authored is redundant because the fallback already
 *  produces it (handoff §3.2 "removes values equal to authored state"), while an explicit value
 *  that differs from authored (including an explicit `false`) is preserved ("preserves sparse
 *  explicit false"). Returns `undefined` when no override remains, so the fixture's session entry
 *  is removed entirely. */
function mergeSparseLeaf(
  authored: FixtureState,
  current: SessionFixtureState | undefined,
  patch: SessionFixtureState,
): SessionFixtureState | undefined {
  const obstacles: SessionFixtureState["obstacles"] = {
    concealment: {
      ...(current?.obstacles?.concealment ?? {}),
      ...(patch.obstacles?.concealment ?? {}),
    },
    lock: { ...(current?.obstacles?.lock ?? {}), ...(patch.obstacles?.lock ?? {}) },
    trap: { ...(current?.obstacles?.trap ?? {}), ...(patch.obstacles?.trap ?? {}) },
  };
  const merged: SessionFixtureState = { ...current, ...patch };

  if (patch.obstacles || current?.obstacles) {
    if (
      obstacles.concealment?.armed !== undefined &&
      obstacles.concealment.armed === authored.obstacles.concealment.armed
    ) {
      delete obstacles.concealment;
    }
    if (obstacles.lock) {
      if (
        obstacles.lock.armed !== undefined &&
        obstacles.lock.armed === authored.obstacles.lock.armed
      )
        delete obstacles.lock.armed;
      if (
        obstacles.lock.shown !== undefined &&
        obstacles.lock.shown === authored.obstacles.lock.shown
      )
        delete obstacles.lock.shown;
      if (Object.keys(obstacles.lock).length === 0) delete obstacles.lock;
    }
    if (obstacles.trap) {
      if (
        obstacles.trap.armed !== undefined &&
        obstacles.trap.armed === authored.obstacles.trap.armed
      )
        delete obstacles.trap.armed;
      if (
        obstacles.trap.shown !== undefined &&
        obstacles.trap.shown === authored.obstacles.trap.shown
      )
        delete obstacles.trap.shown;
      if (Object.keys(obstacles.trap).length === 0) delete obstacles.trap;
    }
    if (Object.keys(obstacles).length === 0) delete merged.obstacles;
    else merged.obstacles = obstacles;
  }
  if (merged.open !== undefined && merged.open === authored.open) delete merged.open;
  return Object.keys(merged).length === 0 ? undefined : merged;
}

type InspectableKind = Inspectable["kind"];
interface InspectableRef {
  kind: InspectableKind;
  id: number;
}

/** Map Lab prototype page — Stage M2.3: walls, and door/stair affordances with state + details. */
export function MapLabPage() {
  const route = useDungeonShellContext();
  const navigate = useNavigate();
  const [otherDungeonTitles, setOtherDungeonTitles] = useState<Record<number, string>>({});
  const {
    layout,
    loading: layoutLoading,
    status: layoutStatus,
    error: layoutError,
  } = useMapLabLayout(route.dungeonId);
  const [parsed, setParsed] = useState(() => parseDungeonData(route.dungeon?.data ?? {}));
  const floors = useMemo(() => floorsInLayout(layout), [layout]);
  const { state: navigationState, setState: setNavigationState } = useMapLabNavigationSession(
    route.dungeonId,
  );
  const [activeZ, setActiveZ] = useState<number>(navigationState.activeZ ?? floors[0]?.z ?? 0);
  // The inspector follows one explicitly selected object — the same rule the editor uses. Click,
  // Enter/Space, and keyboard focus select; hovering only highlights, and nothing clears the
  // selection except selecting something else or re-selecting the same object.
  const [selectedInspectable, setSelectedInspectable] = useState<InspectableRef | null>(
    navigationState.selectedTarget as InspectableRef | null,
  );
  const focusSelectedRef = useRef(false);
  const {
    doorSessions,
    stairSessions,
    portalSessions,
    propSessions,
    partyRoomId,
    setPartyRoomId,
    resetSessions,
    writeFixture,
    resetFixture,
    writeError,
    actionError,
    clearActionError,
  } = useMapLabSessionState(route.dungeonId);
  const [resetDungeonConfirmOpen, setResetDungeonConfirmOpen] = useState(false);
  const [atTableDungeonId, setAtTableDungeonId] = useState<number | null>(null);
  const [atTablePending, setAtTablePending] = useState(false);
  const [atTableError, setAtTableError] = useState<string | null>(null);
  const [partyRoomActionActive, setPartyRoomActionActive] = useState(false);
  const [activeEncounterId, setActiveEncounterId] = useState<number | null>(null);
  const [activeNpcId, setActiveNpcId] = useState<number | null>(null);
  const [portalNavigationError, setPortalNavigationError] = useState<string | null>(null);
  const zoomApi = useMapCanvasZoom({ initialZoom: navigationState.zoom });
  const { centerOn } = zoomApi;
  const navigationRouteKey = useRef(route.dungeonId);
  useEffect(() => {
    if (navigationRouteKey.current !== route.dungeonId) {
      navigationRouteKey.current = route.dungeonId;
      if (navigationState.activeZ !== undefined) {
        setActiveZ(navigationState.activeZ);
        return;
      }
    }
    setNavigationState((current) => ({
      ...current,
      activeZ,
      zoom: zoomApi.zoom,
      selectedTarget: selectedInspectable,
    }));
  }, [
    activeZ,
    setNavigationState,
    navigationState.activeZ,
    route.dungeonId,
    selectedInspectable,
    zoomApi.zoom,
  ]);
  const [viewportSize, setViewportSize] = useState<ViewportSize>({ width: 0, height: 0 });
  const handleViewportResize = useCallback((size: ViewportSize) => setViewportSize(size), []);
  const { visible: layerVisible, toggleLayer } = useMapLayerVisibility();
  const { density, setDensity } = useMapDensity();
  const [viewPopoverOpen, setViewPopoverOpen] = useState(false);
  const [finderOpen, setFinderOpen] = useState(false);
  const viewPopoverTriggerRef = useRef<HTMLButtonElement>(null);
  const simplified = resolveMapDensity(density, zoomApi.zoom.scale) === "simple";
  const allLayersHidden = MAP_LAYER_KEYS.every((key) => !layerVisible[key]);

  useEffect(() => {
    setParsed(parseDungeonData(route.dungeon?.data ?? {}));
  }, [route.dungeon?.data]);

  useEffect(() => {
    listDungeons()
      .then((dungeons) =>
        setOtherDungeonTitles(Object.fromEntries(dungeons.map((d) => [d.id, d.title]))),
      )
      .catch(() => setOtherDungeonTitles({}));
  }, []);

  useEffect(() => {
    getAtTheTable()
      .then((response) => setAtTableDungeonId(response.dungeon_id ?? null))
      .catch(() => setAtTableDungeonId(null));
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (viewPopoverOpen) {
        setViewPopoverOpen(false);
        return;
      }
      if (finderOpen) {
        setFinderOpen(false);
        return;
      }
      if (activeEncounterId !== null) {
        setActiveEncounterId(null);
        return;
      }
      if (activeNpcId !== null) {
        setActiveNpcId(null);
        return;
      }
      if (resetDungeonConfirmOpen) {
        setResetDungeonConfirmOpen(false);
        return;
      }
      setSelectedInspectable(null);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [activeEncounterId, activeNpcId, finderOpen, resetDungeonConfirmOpen, viewPopoverOpen]);

  const isAtTable = route.dungeonId !== null && atTableDungeonId === route.dungeonId;
  const viewerError =
    (partyRoomActionActive ? null : actionError) ?? atTableError ?? portalNavigationError;

  function clearViewerStatus() {
    clearActionError();
    setAtTableError(null);
    setPartyRoomActionActive(false);
  }

  async function putThisDungeonAtTheTable() {
    if (route.dungeonId === null) return;
    clearViewerStatus();
    setAtTablePending(true);
    try {
      const response = await setAtTheTable({ dungeon_id: route.dungeonId });
      setAtTableDungeonId(response.dungeon_id ?? null);
    } catch {
      setAtTableError("Couldn't put this map at the table. Try again.");
    } finally {
      setAtTablePending(false);
    }
  }

  useEffect(() => {
    const firstFloor = floors[0];
    if (!firstFloor) return;
    if (!floors.some((floor) => floor.z === activeZ)) {
      setActiveZ(firstFloor.z);
    }
  }, [activeZ, floors]);

  const rooms = useMemo(() => roomsOnZ(layout, activeZ), [layout, activeZ]);
  const stairs = useMemo(() => stairEndpointsForZ(layout, activeZ), [layout, activeZ]);
  const doors = useMemo(() => doorsOnFloor(layout, activeZ), [layout, activeZ]);
  const props = useMemo(() => propsOnFloor(layout, activeZ), [layout, activeZ]);
  const portals = useMemo(() => portalsOnFloor(layout, activeZ), [layout, activeZ]);
  const features = useMemo(() => layout.features.filter((f) => f.z === activeZ), [layout, activeZ]);

  // Bounds computed over every room, not just the active floor, so the viewBox stays
  // aligned across floor switches — proving shared coordinate space across z. Padded by
  // meta.padding on every side: the margin of visible "unknown space" around authored content.
  const bounds = useMemo(() => paddedBounds(layout), [layout]);
  const viewBox = `${bounds.minX * CELL_SIZE} ${bounds.minY * CELL_SIZE} ${
    (bounds.maxX - bounds.minX + 1) * CELL_SIZE
  } ${(bounds.maxY - bounds.minY + 1) * CELL_SIZE}`;
  const contentCell = useCallback(
    (cell: [number, number]) => ({
      x: cell[0] - bounds.minX,
      y: cell[1] - bounds.minY,
    }),
    [bounds.minX, bounds.minY],
  );

  // Scale ruler: one cell, ticked at both ends, sits in the padding band above the rooms.
  const rulerX1 = (bounds.minX + 1) * CELL_SIZE;
  const rulerX2 = rulerX1 + CELL_SIZE;
  const rulerY = (bounds.minY + 1.5) * CELL_SIZE;
  const rulerTick = CELL_SIZE * 0.12;

  const { activeRoomId, setActiveRoomId, activeLayoutRoom, activeDungeonRoom } = useActiveRoom(
    layout,
    activeZ,
    parsed,
    setActiveZ,
  );

  /** Focus an object — from the keyboard or as the first half of a click — selects it. */
  const pendingConnectionNavigation = useRef<{
    kind: "stair" | "portal";
    id: number;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);

  function focusInspectable(ref: InspectableRef) {
    focusSelectedRef.current = true;
    setSelectedInspectable(ref);
    setNavigationState((current) => ({ ...current, focusTarget: ref }));
    const fixture =
      ref.kind === "room"
        ? layout.rooms.find((room) => room.room_id === ref.id)
        : ref.kind === "door"
          ? layout.doors.find((door) => door.door_id === ref.id)
          : ref.kind === "stair"
            ? layout.stairs.find((stair) => stair.stair_id === ref.id)
            : ref.kind === "portal"
              ? layout.portals.find((portal) => portal.portal_id === ref.id)
              : layout.props.find((prop) => prop.prop_id === ref.id);
    const cell =
      fixture && "cell" in fixture
        ? fixture.cell
        : fixture && "origin" in fixture
          ? fixture.origin
          : fixture && "from" in fixture
            ? fixture.from.z === activeZ
              ? fixture.from.cell
              : fixture.to.cell
            : null;
    if (cell) zoomApi.centerOn(contentCell(cell), viewportSize);
  }

  function navigateStair(stair: MapStair) {
    const pending = pendingConnectionNavigation.current;
    if (pending?.kind === "stair" && pending.id === stair.stair_id) {
      clearTimeout(pending.timer);
      pendingConnectionNavigation.current = null;
      focusInspectable({ kind: "stair", id: stair.stair_id });
      return;
    }
    if (pending) clearTimeout(pending.timer);
    const targetZ = otherFloorZ(stair, activeZ);
    const targetCell = stairCellForZ(stair, targetZ);
    setActiveZ(targetZ);
    if (targetCell && viewportSize.width > 0 && viewportSize.height > 0)
      zoomApi.centerOn(contentCell(targetCell), viewportSize);
    pendingConnectionNavigation.current = {
      kind: "stair",
      id: stair.stair_id,
      timer: setTimeout(() => {
        pendingConnectionNavigation.current = null;
      }, 250),
    };
  }

  function navigatePortal(portal: MapPortal) {
    const pending = pendingConnectionNavigation.current;
    if (pending?.kind === "portal" && pending.id === portal.portal_id) {
      clearTimeout(pending.timer);
      pendingConnectionNavigation.current = null;
      focusInspectable({ kind: "portal", id: portal.portal_id });
      return;
    }
    if (pending) clearTimeout(pending.timer);
    performPortalNavigation(portal);
    pendingConnectionNavigation.current = {
      kind: "portal",
      id: portal.portal_id,
      timer: setTimeout(() => {
        pendingConnectionNavigation.current = null;
      }, 250),
    };
  }

  function performPortalNavigation(portal: MapPortal) {
    const destination = portal.to;
    setPortalNavigationError(null);
    if (!destination) {
      setPortalNavigationError("This portal has no destination.");
      return;
    }
    if (destination.dungeon_id !== undefined) {
      navigate(`/dungeons/${destination.dungeon_id}`);
      return;
    }
    if (destination.z !== undefined && destination.cell) {
      setActiveZ(destination.z);
      if (viewportSize.width > 0 && viewportSize.height > 0)
        zoomApi.centerOn(contentCell(destination.cell), viewportSize);
      return;
    }
    setPortalNavigationError("This portal has no destination.");
  }

  useEffect(() => {
    const target = navigationState.focusTarget;
    if (!target) return;
    setSelectedInspectable(target as InspectableRef);
    const fixture =
      target.kind === "room"
        ? layout.rooms.find((room) => room.room_id === target.id)
        : target.kind === "door"
          ? layout.doors.find((door) => door.door_id === target.id)
          : target.kind === "stair"
            ? layout.stairs.find((stair) => stair.stair_id === target.id)
            : target.kind === "portal"
              ? layout.portals.find((portal) => portal.portal_id === target.id)
              : layout.props.find((prop) => prop.prop_id === target.id);
    const cell =
      fixture && "cell" in fixture
        ? fixture.cell
        : fixture && "origin" in fixture
          ? fixture.origin
          : fixture && "from" in fixture
            ? fixture.from.z === activeZ
              ? fixture.from.cell
              : fixture.to.cell
            : null;
    if (cell) centerOn(contentCell(cell), viewportSize);
    setNavigationState((current) =>
      current.focusTarget === target ? { ...current, focusTarget: null } : current,
    );
  }, [
    activeZ,
    centerOn,
    contentCell,
    layout,
    navigationState.focusTarget,
    setNavigationState,
    viewportSize,
  ]);

  /** Click selects, and clicking the already-selected object again clears the selection. A click
   * that also moved focus here has already selected through `focusInspectable`, so it must not
   * immediately toggle that selection back off. */
  function clickInspectable(ref: InspectableRef) {
    if (focusSelectedRef.current) {
      focusSelectedRef.current = false;
      setSelectedInspectable(ref);
      return;
    }
    setSelectedInspectable((current) =>
      current && current.kind === ref.kind && current.id === ref.id ? null : ref,
    );
  }

  function doorSession(door: MapDoor): SessionFixtureState | undefined {
    return doorSessions[door.door_id];
  }

  function stairSession(stair: MapStair): SessionFixtureState | undefined {
    return stairSessions[stair.stair_id];
  }

  function portalSession(portal: MapPortal): SessionFixtureState | undefined {
    return portalSessions[portal.portal_id];
  }

  function propSession(prop: MapProp): SessionFixtureState | undefined {
    return propSessions[prop.prop_id];
  }

  /** DM View's adapter for the shared obstacle inspector. The panel reads effective
   *  Open/Armed/Shown leaves (authored + session) and every write here emits a contextual sparse
   *  session leaf immediately, rolling back to the last server-confirmed value on failure (the
   *  hook does the rollback; `writeError` surfaces the failed write inline, role=status). */
  function dmViewFixtureAdapter(
    kind: SessionFixtureKind,
    id: number,
    fixture: MapDoor | MapStair | MapPortal | MapProp,
    session: SessionFixtureState | undefined,
  ): ObstacleInspectorAdapter {
    const authored = fixture.state ?? defaultFixtureState();
    const write = (patch: SessionFixtureState) => {
      clearViewerStatus();
      writeFixture(kind, id, mergeSparseLeaf(authored, session, patch));
    };
    return {
      heading: "World now",
      onToggleOpen: (open) => write({ open }),
      onToggleArmed: (obstacle, armed) => write(obstacleArmedLeaf(obstacle, armed)),
      onToggleShown: (obstacle, shown) => {
        if (obstacle === "lock") write({ obstacles: { lock: { shown } } });
        else if (obstacle === "trap") write({ obstacles: { trap: { shown } } });
      },
      onReset: () => {
        clearViewerStatus();
        resetFixture(kind, id);
      },
      resetDisabled: !session,
      writeError,
    };
  }

  if (route.status === "loading" || layoutLoading) {
    return (
      <MapLabRouteState title="Loading map" message="Loading dungeon map…" variant="loading" />
    );
  }

  if (layoutStatus === "error") {
    return (
      <MapLabRouteState
        title={route.dungeon?.title ?? "Dungeon layout unavailable"}
        message={layoutError?.message ?? "Failed to load dungeon layout."}
        variant="error"
      />
    );
  }

  const activeRef: InspectableRef | null = selectedInspectable;
  const pinnedDoorId = selectedInspectable?.kind === "door" ? selectedInspectable.id : null;

  let activeInspectable: Inspectable | null = null;
  let activeAdapter: ObstacleInspectorAdapter | undefined;
  if (activeRef?.kind === "door") {
    const door = layout.doors.find((d) => d.door_id === activeRef.id);
    if (door) {
      activeInspectable = { kind: "door", door, session: doorSession(door) };
      activeAdapter = dmViewFixtureAdapter("door", door.door_id, door, doorSession(door));
    }
  } else if (activeRef?.kind === "stair") {
    const stair = layout.stairs.find((s) => s.stair_id === activeRef.id);
    if (stair) {
      activeInspectable = { kind: "stair", stair, session: stairSession(stair) };
      activeAdapter = dmViewFixtureAdapter("stair", stair.stair_id, stair, stairSession(stair));
    }
  } else if (activeRef?.kind === "room") {
    const room = layout.rooms.find((r) => r.room_id === activeRef.id);
    if (room) activeInspectable = { kind: "room", room };
  } else if (activeRef?.kind === "prop") {
    const prop = layout.props.find((p) => p.prop_id === activeRef.id);
    if (prop) {
      activeInspectable = { kind: "prop", prop, session: propSession(prop) };
      activeAdapter = dmViewFixtureAdapter("prop", prop.prop_id, prop, propSession(prop));
    }
  } else if (activeRef?.kind === "portal") {
    const portal = layout.portals.find((p) => p.portal_id === activeRef.id);
    if (portal) {
      activeInspectable = { kind: "portal", portal, session: portalSession(portal) };
      activeAdapter = dmViewFixtureAdapter(
        "portal",
        portal.portal_id,
        portal,
        portalSession(portal),
      );
    }
  }

  return (
    <div className="maplab-page">
      {layoutStatus === "empty" && (
        <p className="maplab-subtitle">
          No saved layout yet. This dungeon is starting from a blank map.
        </p>
      )}

      <div className="maplab-toolbar">
        <ToolbarTray groupKey="viewer-session" label="Session">
          <Button
            type="button"
            className="maplab-pill-button maplab-session-reset-button"
            onClick={() => setResetDungeonConfirmOpen(true)}
          >
            Reset dungeon
          </Button>
          <Button
            type="button"
            className="maplab-pill-button maplab-at-table-button"
            aria-pressed={isAtTable}
            data-active={isAtTable || undefined}
            disabled={atTablePending || isAtTable}
            onClick={putThisDungeonAtTheTable}
          >
            {isAtTable ? "At the table" : "Put at the table"}
          </Button>
        </ToolbarTray>
        <div className="maplab-view-popover-wrap">
          <Popover.Root
            open={viewPopoverOpen}
            onOpenChange={(open) => {
              setViewPopoverOpen(open);
              if (open) setFinderOpen(false);
            }}
          >
            <Popover.Trigger
              ref={viewPopoverTriggerRef}
              type="button"
              className="maplab-pill-button"
              data-active={viewPopoverOpen || undefined}
            >
              <EyeIcon width={18} height={18} aria-hidden="true" />
              View
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner
                side="bottom"
                align="end"
                className="maplab-view-popover-positioner"
              >
                <Popover.Popup
                  className="maplab-view-popover"
                  aria-label="View settings"
                  finalFocus={(closeType) =>
                    closeType === "keyboard" ? viewPopoverTriggerRef.current : undefined
                  }
                >
                  <ToggleGroup
                    className="maplab-view-toggle-group"
                    aria-label="Map layers"
                    multiple
                    value={MAP_LAYER_KEYS.filter((key) => layerVisible[key])}
                    options={[
                      { value: "outside", label: "Outside" },
                      { value: "props", label: "Props" },
                      { value: "passages", label: "Passages" },
                      { value: "labels", label: "Labels" },
                    ]}
                    onValueChange={(values) => {
                      const changedLayer = MAP_LAYER_KEYS.find(
                        (key) => values.includes(key) !== layerVisible[key],
                      );
                      if (changedLayer) toggleLayer(changedLayer);
                    }}
                  />
                  <ToggleGroup
                    className="maplab-view-toggle-group"
                    aria-label="Map density"
                    multiple={false}
                    value={[density]}
                    options={[
                      { value: "detailed", label: "Detailed" },
                      { value: "auto", label: "Auto" },
                      { value: "simple", label: "Simple" },
                    ]}
                    onValueChange={(values) => {
                      const nextDensity = values[0];
                      if (
                        nextDensity === "detailed" ||
                        nextDensity === "auto" ||
                        nextDensity === "simple"
                      ) {
                        setDensity(nextDensity);
                      }
                    }}
                  />
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        </div>
        <ToggleGroup
          className="maplab-floor-tabs"
          aria-label="Dungeon floors"
          multiple={false}
          value={[String(activeZ)]}
          options={floors.map((floor) => ({
            value: String(floor.z),
            label: floor.title ?? `Floor ${floor.z}`,
          }))}
          onValueChange={(values) => {
            const selectedZ = values[0];
            if (selectedZ !== undefined) setActiveZ(Number(selectedZ));
          }}
        />
      </div>

      <MapLabViewerCanvas
        layout={layout}
        parsed={parsed}
        activeZ={activeZ}
        activeRoomId={activeRoomId}
        partyRoomId={partyRoomId}
        rooms={rooms}
        doors={doors}
        stairs={stairs}
        portals={portals}
        props={props}
        features={features}
        bounds={bounds}
        viewBox={viewBox}
        rulerX1={rulerX1}
        rulerX2={rulerX2}
        rulerY={rulerY}
        rulerTick={rulerTick}
        layerVisible={layerVisible}
        simplified={simplified}
        allLayersHidden={allLayersHidden}
        zoom={zoomApi.zoom}
        viewerError={viewerError}
        selectedInspectable={selectedInspectable}
        pinnedDoorId={pinnedDoorId}
        onSelectRoom={(id) => {
          setActiveRoomId(id);
        }}
        onFocus={focusInspectable}
        onClick={clickInspectable}
        onClearSelection={() => setSelectedInspectable(null)}
        onSetActiveZ={setActiveZ}
        onNavigate={navigate}
        onNavigateStair={navigateStair}
        onNavigatePortal={navigatePortal}
        onSetActiveEncounterId={setActiveEncounterId}
        onWheelZoom={zoomApi.handleWheel}
        onPanStart={zoomApi.handlePointerDown}
        onPanMove={zoomApi.handlePointerMove}
        onPanEnd={zoomApi.handlePointerUp}
        onViewportResize={handleViewportResize}
        onFit={() => zoomApi.fitToBounds(bounds, viewportSize, bounds)}
        onZoomIn={() => zoomApi.zoomIn(viewportSize)}
        onZoomOut={() => zoomApi.zoomOut(viewportSize)}
        doorSession={doorSession}
        stairSession={stairSession}
        portalSession={portalSession}
        propSession={propSession}
        finderOpen={finderOpen}
        onFinderOpenChange={(open) => {
          setFinderOpen(open);
          if (open) setViewPopoverOpen(false);
        }}
      >
        {/*
        <button
          type="button"
          className="maplab-pill-button maplab-viewer-rail-toggle"
          aria-label="Open room navigation"
          aria-expanded={roomsDrawerOpen}
          aria-controls="maplab-viewer-room-rail"
          onClick={() => setRoomsDrawerOpen((open) => !open)}
        />
           Rooms
        </button>
        <div
          id="maplab-viewer-room-rail"
          className="maplab-viewer-rail-container"
          data-open={roomsDrawerOpen || undefined}
          data-collapsed={desktopRailCollapsed || undefined}
        />
          <ViewerRoomRail
            layout={layout}
            parsed={parsed}
            activeRoomId={activeRoomId}
            onSelectRoom={(id) => {
              setActiveRoomId(id)
              setRoomsDrawerOpen(false)
            }}
         >
        </div>
        <button
          type="button"
          className="maplab-viewer-rail-seam"
          aria-label={desktopRailCollapsed ? 'Show room rail' : 'Hide room rail'}
          aria-expanded={!desktopRailCollapsed}
          aria-controls="maplab-viewer-room-rail"
          onClick={() => setDesktopRailCollapsed((c) => !c)}
        />
        <button
          type="button"
          className="maplab-viewer-rail-backdrop"
          aria-label="Close room navigation"
          tabIndex={roomsDrawerOpen ? 0 : -1}
          onClick={() => setRoomsDrawerOpen(false)}
        />

        <div className="maplab-canvas-area">
          {allLayersHidden ? (
            <p className="maplab-canvas-filtered-empty">All layers are hidden. Turn one on to see the map.</p>
          ) : (
          <MapCanvas
            viewBox={viewBox}
            bounds={bounds}
            zoom={zoomApi.zoom}
            ariaLabel={`Dungeon floor map — ${activeFloor?.title ?? `Floor ${activeZ}`}`}
            variant="neutral"
            onWheelZoom={zoomApi.handleWheel}
            onPanStart={zoomApi.handlePointerDown}
            onPanMove={zoomApi.handlePointerMove}
            onPanEnd={zoomApi.handlePointerUp}
            onViewportResize={handleViewportResize}
            panHint="Drag to pan. Pinch or scroll to zoom."
            bottomCenterSlot={
              viewerError ? (
                <p className="maplab-viewer-status" role="status">{viewerError}</p>
              ) : null
            }
            controlsSlot={
              <>
                <button
                  type="button"
                  className="maplab-pill-button maplab-zoom-button"
                  aria-label="Fit map to viewport"
                  onClick={() => zoomApi.fitToBounds(bounds, viewportSize, bounds)}
                >
                  <FitIcon width={22} height={22} aria-hidden="true" />
                </button>
                <div className="maplab-zoom-cluster">
                  <button
                    type="button"
                    className="maplab-pill-button maplab-zoom-button"
                    aria-label="Zoom in"
                    onClick={() => zoomApi.zoomIn(viewportSize)}
                  >
                    <ZoomInIcon width={22} height={22} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="maplab-pill-button maplab-zoom-button"
                    aria-label="Zoom out"
                    onClick={() => zoomApi.zoomOut(viewportSize)}
                  >
                    <ZoomOutIcon width={22} height={22} aria-hidden="true" />
                  </button>
                </div>
              </>
            }
          >
          <defs>
            <pattern id="feature-river-pattern" patternUnits="userSpaceOnUse" width={CELL_SIZE} height={CELL_SIZE}>
              <rect width={CELL_SIZE} height={CELL_SIZE} fill="var(--feature-river-fill)" />
              <line x1={0} y1={CELL_SIZE * 0.35} x2={CELL_SIZE} y2={CELL_SIZE * 0.35} stroke="var(--md-arcane)" strokeWidth={1.5} strokeDasharray="4 3" />
              <line x1={0} y1={CELL_SIZE * 0.65} x2={CELL_SIZE} y2={CELL_SIZE * 0.65} stroke="var(--md-arcane)" strokeWidth={1.5} strokeDasharray="4 3" />
            </pattern>
            <pattern id="feature-trees-pattern" patternUnits="userSpaceOnUse" width={CELL_SIZE} height={CELL_SIZE}>
              <rect width={CELL_SIZE} height={CELL_SIZE} fill="var(--feature-trees-fill)" />
              <circle cx={CELL_SIZE * 0.25} cy={CELL_SIZE * 0.3} r={3} fill="var(--md-nature)" opacity={0.55} />
              <circle cx={CELL_SIZE * 0.7} cy={CELL_SIZE * 0.45} r={2.5} fill="var(--md-nature)" opacity={0.45} />
              <circle cx={CELL_SIZE * 0.4} cy={CELL_SIZE * 0.7} r={3.5} fill="var(--md-nature)" opacity={0.4} />
              <circle cx={CELL_SIZE * 0.75} cy={CELL_SIZE * 0.75} r={2} fill="var(--md-nature)" opacity={0.55} />
            </pattern>
          </defs>

          {layerVisible.outside && (
            <rect
              className="maplab-unknown-space"
              x={bounds.minX * CELL_SIZE}
              y={bounds.minY * CELL_SIZE}
              width={(bounds.maxX - bounds.minX + 1) * CELL_SIZE}
              height={(bounds.maxY - bounds.minY + 1) * CELL_SIZE}
              fill="var(--maplab-outside-fill)"
            />
          )}

          {layerVisible.outside && features.map((feature) => (
            <g key={feature.feature_id} className="maplab-feature" data-feature-kind={feature.kind}>
              {feature.cells.map(([x, y]) => (
                <rect
                  key={`${x}-${y}`}
                  className="maplab-feature-cell"
                  x={x * CELL_SIZE}
                  y={y * CELL_SIZE}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  fill={`url(#feature-${feature.kind}-pattern)`}
                />
              ))}
            </g>
          ))}

          <g className="maplab-scale-ruler">
            <line x1={rulerX1} y1={rulerY} x2={rulerX2} y2={rulerY} />
            <line x1={rulerX1} y1={rulerY - rulerTick} x2={rulerX1} y2={rulerY + rulerTick} />
            <line x1={rulerX2} y1={rulerY - rulerTick} x2={rulerX2} y2={rulerY + rulerTick} />
            <text x={(rulerX1 + rulerX2) / 2} y={rulerY - rulerTick - 6} textAnchor="middle">
              1 square = 5 ft
            </text>
          </g>

          {rooms.map((room) => {
            const isSelected = room.room_id === activeRoomId
            const isPartyRoom = room.room_id === partyRoomId
            const center = roomLabelAnchor(room, CELL_SIZE)
            return (
              <g
                key={room.room_id}
                className="maplab-room"
                data-selected={isSelected || undefined}
                data-party={isPartyRoom || undefined}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`${room.title ?? `Room ${room.room_id}`}${isPartyRoom ? ' (party location)' : ''}`}
                onClick={() => {
                  setActiveRoomId(room.room_id)
                  clickInspectable({ kind: 'room', id: room.room_id })
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setActiveRoomId(room.room_id)
                    clickInspectable({ kind: 'room', id: room.room_id })
                  }
                }}
                onFocus={() => {
                  focusInspectable({ kind: 'room', id: room.room_id })
                  setActiveRoomId(room.room_id)
                }}
              >
                {absoluteCells(room).map(([x, y]) => (
                  <rect
                    key={`${x}-${y}`}
                    className="maplab-room-cell"
                    x={x * CELL_SIZE}
                    y={y * CELL_SIZE}
                    width={CELL_SIZE}
                    height={CELL_SIZE}
                  />
                ))}
                {nonDoorWallSegments(room, doors).map((edge) => {
                  const segment = doorWallSegment(edge, CELL_SIZE)
                  return (
                    <line
                      key={`${edge.cell[0]}-${edge.cell[1]}-${edge.side}`}
                      className="maplab-wall"
                      data-wall-kind={room.wallKind ?? 'solid'}
                      x1={segment.x1}
                      y1={segment.y1}
                      x2={segment.x2}
                      y2={segment.y2}
                    />
                  )
                })}
                {layerVisible.labels && (
                  <text className="maplab-room-title" x={center.x} y={center.y}>
                    {room.title ?? `Room ${room.room_id}`}
                  </text>
                )}
              </g>
            )
          })}

          {layerVisible.passages && doors.map((door) => {
            const isPinned = pinnedDoorId === door.door_id
            return (
              <DoorMarker
                key={door.door_id}
                door={door}
                cellSize={CELL_SIZE}
                session={doorSession(door)}
                selected={isPinned}
                onFocus={() => focusInspectable({ kind: 'door', id: door.door_id })}
                onClick={() => clickInspectable({ kind: 'door', id: door.door_id })}
              />
            )
          })}
          {layerVisible.passages && (
            <g className="maplab-door-badge-layer" aria-hidden="true">
              {doors.map((door) => <DoorBadgeLayer key={door.door_id} door={door} cellSize={CELL_SIZE} session={doorSession(door)} />)}
            </g>
          )}

          {layerVisible.passages && stairs.map((stair) => {
            const cell = stairCellForZ(stair, activeZ)
            if (!cell) return null
            const session = stairSession(stair)
            const { dx, dy, grouped } = markerOffset(layout, activeZ, cell, 'stair', stair.stair_id)
            const targetZ = otherFloorZ(stair, activeZ)
            return (
              <StairMarker
                key={stair.stair_id}
                stair={stair}
                cellSize={CELL_SIZE}
                cell={cell}
                activeZ={activeZ}
                session={session}
                offset={{ dx, dy }}
                grouped={grouped}
                simplified={simplified}
                destinationLabel={`go to floor ${targetZ}`}
                selected={selectedInspectable?.kind === 'stair' && selectedInspectable.id === stair.stair_id}
                onFocus={() => focusInspectable({ kind: 'stair', id: stair.stair_id })}
                onClick={() => {
                  // A stair's primary action is still travel; selecting it for the inspector rides
                  // along so its session controls are reachable from the floor it started on.
                  clickInspectable({ kind: 'stair', id: stair.stair_id })
                  setActiveZ(targetZ)
                }}
              />
            )
          })}

          {layerVisible.passages && portals.map((portal) => {
            const { dx, dy, grouped } = markerOffset(layout, activeZ, portal.cell, 'portal', portal.portal_id)
            return (
              <PortalMarker
                key={portal.portal_id}
                portal={portal}
                cellSize={CELL_SIZE}
                session={portalSession(portal)}
                offset={{ dx, dy }}
                grouped={grouped}
                simplified={simplified}
                selected={selectedInspectable?.kind === 'portal' && selectedInspectable.id === portal.portal_id}
                onFocus={() => focusInspectable({ kind: 'portal', id: portal.portal_id })}
                onClick={() => {
                  clickInspectable({ kind: 'portal', id: portal.portal_id })
                   setPortalNavigationError(null)
                   if (portal.to?.dungeon_id !== undefined) {
                     navigate(`/dungeons/${portal.to.dungeon_id}`)
                   } else if (portal.to?.z !== undefined) {
                     setActiveZ(portal.to.z)
                     if (portal.to.cell) zoomApi.centerOn({ x: portal.to.cell[0], y: portal.to.cell[1] }, viewportSize)
                   } else {
                     setPortalNavigationError('This portal has no destination.')
                   }
                }}
              />
            )
          })}

          {layerVisible.props && props.map((prop) => {
            const propOffset = prop.side === undefined ? markerOffset(layout, activeZ, prop.cell, 'prop', prop.prop_id) : undefined
            return (
              <PropMarker
                key={prop.prop_id}
                prop={prop}
                cellSize={CELL_SIZE}
                session={propSession(prop)}
                offset={propOffset}
                grouped={propOffset?.grouped}
                simplified={simplified}
                selected={selectedInspectable?.kind === 'prop' && selectedInspectable.id === prop.prop_id}
                onFocus={() => focusInspectable({ kind: 'prop', id: prop.prop_id })}
                onClick={() => {
                  // Every prop selects into the inspector — that is how its loot summary and
                  // disclosure controls are reached. Encounter props still open the dock as well.
                  clickInspectable({ kind: 'prop', id: prop.prop_id })
                  if (prop.kind === 'encounter' && prop.encounter_id != null) {
                    setActiveEncounterId(prop.encounter_id)
                  }
                }}
              />
            )
          })}
          </MapCanvas>
          )}
          </MapLabViewerCanvas>
        */}

        <MapLabViewerOverlays
          activeInspectable={activeInspectable}
          activeAdapter={activeAdapter}
          otherDungeonTitles={otherDungeonTitles}
          activeLayoutRoom={activeLayoutRoom}
          activeDungeonRoom={activeDungeonRoom}
          parsed={parsed}
          dungeonId={route.dungeonId ?? 0}
          layout={layout}
          onRunEncounter={setActiveEncounterId}
          onOpenNpc={setActiveNpcId}
          onPartyIsHere={() => {
            clearViewerStatus();
            setPartyRoomActionActive(true);
            setPartyRoomId(activeRoomId);
          }}
          actionError={partyRoomActionActive ? actionError : null}
          clearActionError={clearActionError}
          activeEncounterId={activeEncounterId}
          onCloseEncounter={() => setActiveEncounterId(null)}
          activeNpcId={activeNpcId}
          onCloseNpc={() => setActiveNpcId(null)}
          resetDungeonConfirmOpen={resetDungeonConfirmOpen}
          dungeonTitle={route.dungeon?.title}
          onConfirmReset={() => {
            clearViewerStatus();
            resetSessions();
            setResetDungeonConfirmOpen(false);
          }}
          onCancelReset={() => setResetDungeonConfirmOpen(false)}
        />
      </MapLabViewerCanvas>
    </div>
  );
}
