import type { ReactNode } from "react";
import { SelectField } from "../../../components/form/SelectField";
import { TextField } from "../../../components/form/TextField";
import { FixturePropertiesForm } from "./FixturePropertiesForm";
import { InspectorPanel } from "./InspectorPanel";
import type { ObstacleInspectorAdapter } from "./InspectorPanel";
import { RoomContentEditor } from "./RoomContentEditor";
import { FIXTURE_TYPES } from "./fixtureTypes";
import type { DungeonEntry, DungeonRoom } from "../dungeonModel";
import type {
  MapCell,
  MapDoor,
  MapFeature,
  MapLayout,
  MapPortal,
  MapProp,
  MapRoom,
  MapStair,
} from "../../../model/maplabModel";

type FixtureKind = "door" | "stair" | "prop" | "portal";

type MapLabEditorSelectionProps = {
  selectionActions: ReactNode;
  selectedItemName: string;
  selectionSheetExpanded: boolean;
  onToggleExpanded: () => void;
  selectedFeature: MapFeature | null;
  selectedDoor: MapDoor | null;
  selectedRoom: MapRoom | null;
  selectedDungeonRoom: DungeonRoom | null;
  selectedProp: MapProp | null;
  selectedStair: MapStair | null;
  selectedStairCell: MapCell | null;
  selectedPortal: MapPortal | null;
  stairUpFloor: number | null;
  stairDownFloor: number | null;
  hasStairInDirection: (direction: "up" | "down") => boolean;
  activeZ: number;
  routeDungeonId?: number;
  layout: MapLayout;
  updateFeatureMeta: (id: number, changes: Record<string, unknown>) => void;
  updateFixtureFlags: (id: number, kind: FixtureKind, changes: Record<string, unknown>) => void;
  updateRoomTitle: (roomId: number, title: string) => void;
  updateRoomWallKind: (roomId: number, wallKind: string) => void;
  updateRoomEntries: (roomId: number, entries: DungeonEntry[] | null | undefined) => void;
  updateRoomNpcs: (roomId: number, npcs: number[]) => void;
  createRoomData: (roomId: number) => void;
  setStairDirection: (z: number, cell: MapCell, direction: "up" | "down", checked: boolean) => void;
  authoredInspectorAdapter: (
    entity: MapDoor | MapProp | MapStair | MapPortal,
    kind: FixtureKind,
    id: number,
    update: MapLabEditorSelectionProps["updateFixtureFlags"],
  ) => ObstacleInspectorAdapter;
  featureKindOptions: ReadonlyArray<{ readonly value: string; readonly label: string }>;
};

export function MapLabEditorSelection({
  selectionActions,
  selectedItemName,
  selectionSheetExpanded,
  onToggleExpanded,
  selectedFeature,
  selectedDoor,
  selectedRoom,
  selectedDungeonRoom,
  selectedProp,
  selectedStair,
  selectedStairCell,
  selectedPortal,
  stairUpFloor,
  stairDownFloor,
  hasStairInDirection,
  activeZ,
  routeDungeonId,
  layout,
  updateFeatureMeta,
  updateFixtureFlags,
  updateRoomTitle,
  updateRoomWallKind,
  updateRoomEntries,
  updateRoomNpcs,
  createRoomData,
  setStairDirection,
  authoredInspectorAdapter,
  featureKindOptions,
}: MapLabEditorSelectionProps) {
  if (!selectionActions) return null;

  return (
    <aside
      className="maplab-inspector-rail maplab-selection-sheet"
      aria-label={`${selectedItemName} editor`}
      data-expanded={selectionSheetExpanded || undefined}
    >
      <div className="maplab-selection-sheet-peek">
        <strong>{selectedItemName}</strong>
        <button
          type="button"
          className="maplab-pill-button maplab-selection-sheet-toggle"
          aria-expanded={selectionSheetExpanded}
          aria-controls="maplab-selection-sheet-content"
          onClick={onToggleExpanded}
        >
          {selectionSheetExpanded ? "Collapse editor" : "Edit"}
        </button>
        {selectionActions}
      </div>
      <div className="maplab-selection-sheet-content" id="maplab-selection-sheet-content">
        {selectedFeature ? (
          <>
            <InspectorPanel target={{ kind: "feature", feature: selectedFeature }} />
            <div className="maplab-field-row maplab-selected-feature-field">
              <SelectField
                label="Kind"
                options={[...featureKindOptions]}
                value={selectedFeature.kind}
                onChange={(event) =>
                  updateFeatureMeta(selectedFeature.feature_id, { kind: event.target.value })
                }
              />
            </div>
            <div className="maplab-field-row maplab-selected-feature-field">
              <TextField
                label="Title"
                type="text"
                value={selectedFeature.title ?? ""}
                onChange={(event) =>
                  updateFeatureMeta(selectedFeature.feature_id, { title: event.target.value })
                }
              />
            </div>
          </>
        ) : selectedDoor ? (
          <>
            <InspectorPanel
              target={{ kind: "door", door: selectedDoor }}
              adapter={authoredInspectorAdapter(
                selectedDoor,
                "door",
                selectedDoor.door_id,
                updateFixtureFlags,
              )}
            />
            <FixturePropertiesForm
              spec={FIXTURE_TYPES.door}
              values={selectedDoor as unknown as Record<string, unknown>}
              onChange={(key, value) =>
                updateFixtureFlags(selectedDoor.door_id, "door", { [key]: value })
              }
            />
          </>
        ) : selectedRoom ? (
          <RoomContentEditor
            key={selectedRoom.room_id}
            room={selectedRoom}
            dungeonRoom={selectedDungeonRoom}
            onUpdateRoomTitle={updateRoomTitle}
            onUpdateRoomWallKind={updateRoomWallKind}
            onUpdateRoomEntries={updateRoomEntries}
            onUpdateRoomNpcs={updateRoomNpcs}
            onCreateRoomData={createRoomData}
          />
        ) : selectedProp ? (
          <>
            <InspectorPanel
              target={{ kind: "prop", prop: selectedProp }}
              adapter={authoredInspectorAdapter(
                selectedProp,
                "prop",
                selectedProp.prop_id,
                updateFixtureFlags,
              )}
            />
            <FixturePropertiesForm
              spec={FIXTURE_TYPES.prop}
              values={{ ...selectedProp, side: selectedProp.side ?? "Off" }}
              onChange={(key, value) =>
                updateFixtureFlags(selectedProp.prop_id, "prop", {
                  [key]: key === "side" && value === "Off" ? undefined : value,
                })
              }
            />
          </>
        ) : selectedStair ? (
          <>
            <InspectorPanel
              target={{ kind: "stair", stair: selectedStair }}
              adapter={authoredInspectorAdapter(
                selectedStair,
                "stair",
                selectedStair.stair_id,
                updateFixtureFlags,
              )}
            />
            <div className="maplab-field-row maplab-stair-direction-row">
              <label htmlFor="maplab-stair-direction-up">
                {stairUpFloor !== null
                  ? `Stairs up to floor ${stairUpFloor}`
                  : "Stairs up (no floor above)"}
              </label>
              <input
                id="maplab-stair-direction-up"
                type="checkbox"
                disabled={stairUpFloor === null || !selectedStairCell}
                checked={hasStairInDirection("up")}
                onChange={(event) =>
                  selectedStairCell &&
                  setStairDirection(activeZ, selectedStairCell, "up", event.target.checked)
                }
              />
            </div>
            <div className="maplab-field-row maplab-stair-direction-row">
              <label htmlFor="maplab-stair-direction-down">
                {stairDownFloor !== null
                  ? `Stairs down to floor ${stairDownFloor}`
                  : "Stairs down (no floor below)"}
              </label>
              <input
                id="maplab-stair-direction-down"
                type="checkbox"
                disabled={stairDownFloor === null || !selectedStairCell}
                checked={hasStairInDirection("down")}
                onChange={(event) =>
                  selectedStairCell &&
                  setStairDirection(activeZ, selectedStairCell, "down", event.target.checked)
                }
              />
            </div>
            <FixturePropertiesForm
              spec={FIXTURE_TYPES.stair}
              values={selectedStair as unknown as Record<string, unknown>}
              onChange={(key, value) =>
                updateFixtureFlags(selectedStair.stair_id, "stair", { [key]: value })
              }
            />
          </>
        ) : selectedPortal ? (
          <>
            <InspectorPanel
              target={{ kind: "portal", portal: selectedPortal }}
              adapter={authoredInspectorAdapter(
                selectedPortal,
                "portal",
                selectedPortal.portal_id,
                updateFixtureFlags,
              )}
            />
            <FixturePropertiesForm
              spec={FIXTURE_TYPES.portal}
              values={selectedPortal as unknown as Record<string, unknown>}
              layout={layout}
              currentDungeonId={routeDungeonId}
              onChange={(key, value) =>
                updateFixtureFlags(selectedPortal.portal_id, "portal", { [key]: value })
              }
            />
          </>
        ) : null}
      </div>
    </aside>
  );
}
