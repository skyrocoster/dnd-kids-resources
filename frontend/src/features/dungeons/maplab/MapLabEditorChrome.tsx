import { createPortal } from "react-dom";
import type { Dispatch, RefObject, SetStateAction } from "react";
import type { Dungeon, IncomingGateway } from "../../../api/types";
import type { DungeonData } from "../dungeonModel";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  DoorClosedIcon,
  EraserIcon,
  EyeIcon,
  LinkIcon,
  MapIcon,
  MousePointer2,
  PlusIcon,
  PortalIcon,
  PropIcon,
  RoomIcon,
  SaveIcon,
  StairsIcon,
  Trees,
  Waves,
} from "../../../components/icons";
import { ToggleGroup } from "../../../components/form/ToggleGroup";
import { Popover } from "../../../components/Popover";
import { ConnectionsResolveList } from "./ConnectionsResolveList";
import { ToolbarTray } from "./MapLabToolbar";
import { PROP_KIND_ICONS, PROP_KIND_OPTIONS } from "./fixtureTypes";
import type { MapLayout, MapPortal } from "../../../model/maplabModel";
import { ViewerRoomRail } from "./ViewerRoomRail";

type ArmedTool = "select" | "room" | "door" | "stair" | "portal" | "prop" | "river" | "trees";
type ToolFlyout = "passages" | "terrain" | "prop";
type LayerVisibility = { outside: boolean; props: boolean; passages: boolean; labels: boolean };

export interface MapLabEditorChromeState {
  layout: MapLayout;
  activeZ: number;
  selectedRoomId: number | null;
}

export interface MapLabEditorChromeProps {
  state: MapLabEditorChromeState;
  floors: Array<{ z: number; title?: string | null }>;
  hasFloorAbove: boolean;
  hasFloorBelow: boolean;
  addFloorAbove: () => void;
  addFloorBelow: () => void;
  armedTool: ArmedTool;
  lastPassageTool: "door" | "stair" | "portal";
  lastTerrainTool: "river" | "trees";
  openFlyout: ToolFlyout | null;
  setOpenFlyout: Dispatch<SetStateAction<ToolFlyout | null>>;
  setArmedTool: Dispatch<SetStateAction<ArmedTool>>;
  setPlacementError: Dispatch<SetStateAction<string | null>>;
  brushArmed: boolean;
  eraseArmed: boolean;
  setEraseArmed: Dispatch<SetStateAction<boolean>>;
  selectedPropKind: string;
  flyoutFilter: string;
  setFlyoutFilter: Dispatch<SetStateAction<string>>;
  passagesFlyoutRef: RefObject<HTMLDivElement | null>;
  terrainFlyoutRef: RefObject<HTMLDivElement | null>;
  propFlyoutRef: RefObject<HTMLDivElement | null>;
  passagesMenuRef: RefObject<HTMLDivElement | null>;
  terrainMenuRef: RefObject<HTMLDivElement | null>;
  propMenuRef: RefObject<HTMLDivElement | null>;
  passageToolOptions: Array<{
    key: "door" | "stair" | "portal";
    label: string;
    icon: typeof DoorClosedIcon;
    active: boolean;
  }>;
  propKindOptions: typeof PROP_KIND_OPTIONS;
  terrainToolOptions: Array<{
    key: "river" | "trees";
    label: string;
    icon: typeof Waves;
    active: boolean;
  }>;
  activatePassageTool: (tool: "door" | "stair" | "portal") => void;
  activatePropKind: (kind: string) => void;
  activateTerrainTool: (tool: "river" | "trees") => void;
  activateTopFilteredTool: () => void;
  layerVisible: LayerVisibility;
  toggleLayer: (layer: keyof LayerVisibility) => void;
  viewPopoverOpen: boolean;
  setViewPopoverOpen: Dispatch<SetStateAction<boolean>>;
  viewTriggerRef: RefObject<HTMLButtonElement | null>;
  mapPopoverOpen: boolean;
  setMapPopoverOpen: Dispatch<SetStateAction<boolean>>;
  mapTriggerRef: RefObject<HTMLButtonElement | null>;
  showGhostFloor: boolean;
  setShowGhostFloor: Dispatch<SetStateAction<boolean>>;
  ghostZ: number | null;
  density: "auto" | "detailed" | "simple";
  setDensity: (density: "auto" | "detailed" | "simple") => void;
  updatePadding: (padding: MapLayout["meta"]["padding"]) => void;
  setConfirmingReset: Dispatch<SetStateAction<boolean>>;
  saveStatus: { status: "idle" | "saving" | "saved" | "error" };
  statusSlot: HTMLElement | null;
  setActiveZ: (z: number) => void;
  parsed: DungeonData;
  onSelectRoom: (roomId: number) => void;
  dungeons: Dungeon[];
  incomingGateways: IncomingGateway[];
  connectionsLoaded: boolean;
  connectionsLoadError: boolean;
  selectPortal: (id: number | null) => void;
  setGatewayToRemove: Dispatch<SetStateAction<MapPortal | null>>;
  handleAddReturnGateway: (gateway: IncomingGateway) => void;
  openUtility: "finder" | "connections" | null;
  setOpenUtility: Dispatch<SetStateAction<"finder" | "connections" | null>>;
  connectionsTriggerRef: RefObject<HTMLButtonElement | null>;
  onNewRoom: () => void;
}

const statusLabel = (status: MapLabEditorChromeProps["saveStatus"]["status"]) =>
  status === "saving"
    ? "Saving…"
    : status === "saved"
      ? "Saved"
      : status === "error"
        ? "Save failed"
        : "";

export function MapLabEditorChrome(props: MapLabEditorChromeProps) {
  const {
    state,
    floors,
    hasFloorAbove,
    hasFloorBelow,
    addFloorAbove,
    addFloorBelow,
    armedTool,
    setArmedTool,
    setPlacementError,
    brushArmed,
    eraseArmed,
    setEraseArmed,
    lastPassageTool,
    lastTerrainTool,
    openFlyout,
    setOpenFlyout,
    passagesFlyoutRef,
    passagesMenuRef,
    propFlyoutRef,
    propMenuRef,
    terrainFlyoutRef,
    terrainMenuRef,
    passageToolOptions,
    propKindOptions,
    terrainToolOptions,
    selectedPropKind,
    activatePassageTool,
    activatePropKind,
    activateTerrainTool,
    activateTopFilteredTool,
    flyoutFilter,
    setFlyoutFilter,
    dungeons,
    incomingGateways,
    connectionsLoaded,
    connectionsLoadError,
    selectPortal,
    setGatewayToRemove,
    handleAddReturnGateway,
  } = props;
  const dungeonIds = new Set(dungeons.map((dungeon) => dungeon.id));
  const resolutionCount =
    state.layout.portals.filter((portal) => portal.to === undefined).length +
    (connectionsLoaded
      ? state.layout.portals.filter(
          (portal) => portal.to?.dungeon_id !== undefined && !dungeonIds.has(portal.to.dungeon_id),
        ).length
      : 0) +
    incomingGateways.filter(
      (gateway) =>
        !state.layout.portals.some((portal) => portal.to?.dungeon_id === gateway.dungeon_id),
    ).length;
  const filter = (label: string) => (
    <input
      type="search"
      className="maplab-tool-palette-filter"
      aria-label={label}
      placeholder="Filter tools"
      value={flyoutFilter}
      onChange={(e) => setFlyoutFilter(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          activateTopFilteredTool();
        }
      }}
    />
  );
  const toolMenu = (
    kind: ToolFlyout,
    groupRef: RefObject<HTMLDivElement | null>,
    menuRef: RefObject<HTMLDivElement | null>,
    options: Array<{ key: string; label: string; icon: typeof DoorClosedIcon; active: boolean }>,
    choose: (key: string) => void,
    label: string,
    triggerLabel: string,
  ) => (
    <Popover.Root
      open={openFlyout === kind}
      closeOnEscape={false}
      onOpenChange={(open) => setOpenFlyout(open ? kind : null)}
    >
      <Popover.Trigger
        type="button"
        className="maplab-pill-button maplab-tool-palette-flyout-toggle"
        aria-label={triggerLabel}
        aria-expanded={openFlyout === kind}
      >
        {openFlyout === kind ? (
          <ChevronUpIcon width={14} height={14} aria-hidden="true" />
        ) : (
          <ChevronDownIcon width={14} height={14} aria-hidden="true" />
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          anchor={groupRef}
          side="bottom"
          align="start"
          sideOffset={4}
          className="maplab-tool-palette-positioner"
        >
          <Popover.Popup
            className="maplab-tool-palette-flyout"
            ref={menuRef}
            initialFocus={false}
            finalFocus={false}
          >
            {filter(label)}
            {options.length === 0 ? (
              <p className="maplab-tool-palette-empty">No tools match that.</p>
            ) : (
              <ul aria-label={label.replace(/^Filter /, "")}>
                {options.map((option) => {
                  const Icon = option.icon;
                  return (
                    <li key={option.key}>
                      <button
                        type="button"
                        className="maplab-pill-button"
                        aria-pressed={option.active}
                        data-active={option.active || undefined}
                        onClick={() => choose(option.key)}
                      >
                        <Icon width={16} height={16} aria-hidden="true" />
                        {option.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
  return (
    <>
      {props.statusSlot &&
        createPortal(
          <span
            className="maplab-editor-save-status"
            data-status={props.saveStatus.status}
            role="status"
            aria-live="polite"
          >
            <SaveIcon width={16} height={16} aria-hidden="true" />
            {statusLabel(props.saveStatus.status)}
          </span>,
          props.statusSlot,
        )}
      <div className="maplab-toolbar">
        <div className="maplab-toolbar-row maplab-toolbar-row--commands">
          <ToolbarTray groupKey="editor-primary" label="Primary">
            <div className="maplab-tool-palette" role="group" aria-label="Primary drawing tools">
              <button
                type="button"
                className="maplab-pill-button maplab-tool-palette-button"
                aria-pressed={armedTool === "select"}
                data-active={armedTool === "select" || undefined}
                onClick={() => {
                  setArmedTool("select");
                  setPlacementError(null);
                }}
              >
                <MousePointer2 width={18} height={18} aria-hidden="true" />
                Select
              </button>
              <button
                type="button"
                className="maplab-pill-button maplab-tool-palette-button"
                aria-pressed={armedTool === "room"}
                data-active={armedTool === "room" || undefined}
                title={
                  armedTool === "room"
                    ? "Click again or press Escape to return to Select."
                    : undefined
                }
                onClick={() => {
                  setArmedTool(armedTool === "room" ? "select" : "room");
                  setPlacementError(null);
                }}
              >
                <RoomIcon width={18} height={18} aria-hidden="true" />
                Room
              </button>
            </div>
          </ToolbarTray>
          <ToolbarTray groupKey="editor-active-options" label="Active tool options">
            <div className="maplab-tool-palette" role="group" aria-label="Active tool options">
              <div className="maplab-tool-palette-group" ref={passagesFlyoutRef}>
                <button
                  type="button"
                  className="maplab-pill-button maplab-tool-palette-button"
                  aria-label="Passage tools"
                  aria-pressed={["door", "stair", "portal"].includes(armedTool)}
                  data-active={["door", "stair", "portal"].includes(armedTool) || undefined}
                  onClick={() => {
                    setArmedTool(
                      ["door", "stair", "portal"].includes(armedTool) ? "select" : lastPassageTool,
                    );
                    setPlacementError(null);
                    setOpenFlyout(null);
                  }}
                >
                  {lastPassageTool === "stair" ? (
                    <StairsIcon width={18} height={18} aria-hidden="true" />
                  ) : lastPassageTool === "portal" ? (
                    <PortalIcon width={18} height={18} aria-hidden="true" />
                  ) : (
                    <DoorClosedIcon width={18} height={18} aria-hidden="true" />
                  )}
                  Passages
                </button>
                {toolMenu(
                  "passages",
                  passagesFlyoutRef,
                  passagesMenuRef,
                  passageToolOptions,
                  (key) => activatePassageTool(key as "door" | "stair" | "portal"),
                  "Filter passage tools",
                  "Choose passage tool",
                )}
              </div>
              <div className="maplab-tool-palette-group" ref={propFlyoutRef}>
                <button
                  type="button"
                  className="maplab-pill-button maplab-tool-palette-button"
                  aria-pressed={armedTool === "prop"}
                  data-active={armedTool === "prop" || undefined}
                  onClick={() => {
                    setArmedTool(armedTool === "prop" ? "select" : "prop");
                    setPlacementError(null);
                    setOpenFlyout(null);
                  }}
                >
                  <PropIcon width={18} height={18} aria-hidden="true" />
                  Prop
                </button>
                {toolMenu(
                  "prop",
                  propFlyoutRef,
                  propMenuRef,
                  propKindOptions.map((o) => ({
                    key: o.value,
                    label: o.label,
                    icon: PROP_KIND_ICONS[o.value as keyof typeof PROP_KIND_ICONS],
                    active: selectedPropKind === o.value,
                  })),
                  activatePropKind,
                  "Filter prop tools",
                  "Choose prop kind",
                )}
              </div>
              <div className="maplab-tool-palette-group" ref={terrainFlyoutRef}>
                <button
                  type="button"
                  className="maplab-pill-button maplab-tool-palette-button"
                  aria-pressed={armedTool === "river" || armedTool === "trees"}
                  data-active={armedTool === "river" || armedTool === "trees" || undefined}
                  onClick={() => {
                    setArmedTool(
                      armedTool === "river" || armedTool === "trees" ? "select" : lastTerrainTool,
                    );
                    setPlacementError(null);
                    setOpenFlyout(null);
                  }}
                >
                  {lastTerrainTool === "trees" ? (
                    <Trees width={18} height={18} aria-hidden="true" />
                  ) : (
                    <Waves width={18} height={18} aria-hidden="true" />
                  )}
                  Terrain
                </button>
                {toolMenu(
                  "terrain",
                  terrainFlyoutRef,
                  terrainMenuRef,
                  terrainToolOptions,
                  (key) => activateTerrainTool(key as "river" | "trees"),
                  "Filter terrain tools",
                  "Choose terrain tool",
                )}
              </div>
            </div>
            {brushArmed && (
              <div className="maplab-tool-options" role="group" aria-label="Brush options">
                <button
                  type="button"
                  className="maplab-pill-button maplab-tool-options-erase"
                  aria-pressed={eraseArmed}
                  data-active={eraseArmed || undefined}
                  onClick={() => setEraseArmed((a) => !a)}
                >
                  <EraserIcon width={18} height={18} aria-hidden="true" />
                  Erase
                </button>
              </div>
            )}
          </ToolbarTray>
          <div className="maplab-view-popover-wrap">
            <Popover.Root
              open={props.viewPopoverOpen}
              closeOnEscape={false}
              onOpenChange={(open) => {
                props.setViewPopoverOpen(open);
                if (open) {
                  props.setMapPopoverOpen(false);
                  props.setOpenUtility(null);
                }
              }}
            >
              <Popover.Trigger
                ref={props.viewTriggerRef}
                type="button"
                className="maplab-pill-button maplab-editor-toolbar-button"
                aria-haspopup="true"
              >
                <EyeIcon width={18} height={18} aria-hidden="true" />
                View
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Positioner side="bottom" align="end">
                  <Popover.Popup
                    className="maplab-view-popover"
                    role="menu"
                    initialFocus={false}
                    finalFocus={(closeType) =>
                      closeType === "keyboard" ? props.viewTriggerRef : false
                    }
                  >
                    {(["outside", "props", "passages", "labels"] as const).map((layer) => (
                      <button
                        key={layer}
                        type="button"
                        className="maplab-pill-button maplab-layer-toggle-button"
                        aria-pressed={props.layerVisible[layer]}
                        onClick={() => props.toggleLayer(layer)}
                      >
                        {layer[0].toUpperCase() + layer.slice(1)}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="maplab-pill-button"
                      aria-pressed={props.showGhostFloor}
                      disabled={props.ghostZ === null}
                      onClick={() => props.setShowGhostFloor((a) => !a)}
                    >
                      Ghost lower floor
                    </button>
                    <button
                      type="button"
                      className="maplab-pill-button"
                      aria-pressed={props.density === "detailed"}
                      onClick={() => props.setDensity("detailed")}
                    >
                      Detailed
                    </button>
                    <button
                      type="button"
                      className="maplab-pill-button"
                      aria-pressed={props.density === "auto"}
                      onClick={() => props.setDensity("auto")}
                    >
                      Auto
                    </button>
                    <button
                      type="button"
                      className="maplab-pill-button"
                      aria-pressed={props.density === "simple"}
                      onClick={() => props.setDensity("simple")}
                    >
                      Simple
                    </button>
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
          </div>
          <div className="maplab-map-popover-wrap">
            <Popover.Root
              open={props.mapPopoverOpen}
              closeOnEscape={false}
              onOpenChange={(open) => {
                props.setMapPopoverOpen(open);
                if (open) {
                  props.setViewPopoverOpen(false);
                  props.setOpenUtility(null);
                }
              }}
            >
              <Popover.Trigger
                ref={props.mapTriggerRef}
                type="button"
                className="maplab-pill-button maplab-editor-toolbar-button"
                aria-haspopup="true"
              >
                <MapIcon width={18} height={18} aria-hidden="true" />
                Map
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Positioner side="bottom" align="end">
                  <Popover.Popup
                    className="maplab-map-popover"
                    role="menu"
                    initialFocus={false}
                    finalFocus={(closeType) =>
                      closeType === "keyboard" ? props.mapTriggerRef : false
                    }
                  >
                    {(["top", "right", "bottom", "left"] as const).map((side) => (
                      <label
                        key={side}
                        className="maplab-field-row maplab-room-content-field maplab-editor-padding-input"
                      >
                        <span>{side[0].toUpperCase() + side.slice(1)}</span>
                        <input
                          type="number"
                          min={0}
                          value={state.layout.meta.padding[side]}
                          onChange={(e) =>
                            props.updatePadding({
                              ...state.layout.meta.padding,
                              [side]: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                    ))}
                    <button
                      type="button"
                      className="maplab-pill-button maplab-editor-toolbar-button"
                      onClick={() => props.setConfirmingReset(true)}
                    >
                      Reset unsaved changes
                    </button>
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
          </div>
        </div>
        <div className="maplab-toolbar-row maplab-toolbar-row--navigation">
          <ToggleGroup
            className="maplab-floor-tabs"
            aria-label="Dungeon floors"
            multiple={false}
            value={[String(state.activeZ)]}
            options={floors.map((floor) => ({
              value: String(floor.z),
              label: floor.title ?? `Floor ${floor.z}`,
            }))}
            onValueChange={(values) => {
              const selectedFloor = values[0];
              if (selectedFloor !== undefined) props.setActiveZ(Number(selectedFloor));
            }}
          />
          <div className="maplab-editor-floor-actions" aria-label="Floor actions">
            <button
              type="button"
              className="maplab-pill-button maplab-editor-floor-action"
              disabled={hasFloorAbove}
              onClick={addFloorAbove}
            >
              <PlusIcon width={16} height={16} aria-hidden="true" />
              Add floor above
            </button>
            <button
              type="button"
              className="maplab-pill-button maplab-editor-floor-action"
              disabled={hasFloorBelow}
              onClick={addFloorBelow}
            >
              <PlusIcon width={16} height={16} aria-hidden="true" />
              Add floor below
            </button>
          </div>
          <button
            type="button"
            className="maplab-pill-button maplab-editor-room-list-new"
            onClick={props.onNewRoom}
          >
            <PlusIcon width={16} height={16} aria-hidden="true" />
            New room
          </button>
          <ViewerRoomRail
            layout={state.layout}
            parsed={props.parsed}
            activeRoomId={state.selectedRoomId}
            onSelectRoom={props.onSelectRoom}
            open={props.openUtility === "finder"}
            onOpenChange={(open) => {
              props.setOpenUtility(open ? "finder" : null);
              if (open) {
                props.setViewPopoverOpen(false);
                props.setMapPopoverOpen(false);
              }
            }}
          />
          <div className="maplab-connections-utility">
            <Popover.Root
              open={props.openUtility === "connections"}
              closeOnEscape={false}
              onOpenChange={(open) => {
                props.setOpenUtility(open ? "connections" : null);
                if (open) {
                  props.setViewPopoverOpen(false);
                  props.setMapPopoverOpen(false);
                }
              }}
            >
              <Popover.Trigger
                ref={props.connectionsTriggerRef}
                type="button"
                className="maplab-pill-button"
                aria-haspopup="dialog"
                aria-expanded={props.openUtility === "connections"}
              >
                <LinkIcon width={18} height={18} aria-hidden="true" />
                Connections ({resolutionCount})
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Positioner side="bottom" align="end">
                  <Popover.Popup
                    className="maplab-connections-panel"
                    role="dialog"
                    aria-label="Connection utilities"
                    initialFocus={false}
                    finalFocus={(closeType) =>
                      closeType === "keyboard" ? props.connectionsTriggerRef : false
                    }
                  >
                    <ConnectionsResolveList
                      layout={state.layout}
                      dungeons={dungeons}
                      incomingGateways={incomingGateways}
                      connectionsLoaded={connectionsLoaded}
                      connectionsLoadError={connectionsLoadError}
                      onResolve={(portal) => {
                        props.setActiveZ(portal.z);
                        selectPortal(portal.portal_id);
                        props.setOpenUtility(null);
                        props.connectionsTriggerRef.current?.focus();
                      }}
                      onRemoveGateway={setGatewayToRemove}
                      onAddReturnGateway={handleAddReturnGateway}
                    />
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
          </div>
        </div>
      </div>
    </>
  );
}
