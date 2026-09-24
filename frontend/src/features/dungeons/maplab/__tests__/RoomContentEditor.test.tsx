import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../../../../api/client";
import type { DungeonEntry, DungeonRoom } from "../../dungeonModel";
import type { MapRoom } from "../../../../model/maplabModel";
import { RoomContentEditor } from "../RoomContentEditor";

const room: MapRoom = {
  room_id: 7,
  z: 0,
  origin: [0, 0],
  cells: [[0, 0]],
  title: "Map room title",
  description: "A quiet cave.",
  kind: "Cavern",
  wallKind: "natural",
};

const existingEntry: DungeonEntry = {
  entry_type: "feature",
  title: "Old statue",
  content: "A stone statue stands here.",
};

const dungeonRoom: DungeonRoom = {
  room_id: 7,
  title: "Authored room title",
  entries: [existingEntry],
  npcs: [5],
};

function renderEditor(overrides: { dungeonRoom?: DungeonRoom | null } = {}) {
  const callbacks = {
    onUpdateRoomTitle: vi.fn(),
    onUpdateRoomWallKind: vi.fn(),
    onUpdateRoomEntries: vi.fn(),
    onUpdateRoomNpcs: vi.fn(),
    onCreateRoomData: vi.fn(),
  };

  const result = render(
    <RoomContentEditor
      room={room}
      dungeonRoom={overrides.dungeonRoom === undefined ? dungeonRoom : overrides.dungeonRoom}
      {...callbacks}
    />,
  );

  return { ...result, callbacks };
}

describe("RoomContentEditor", () => {
  beforeEach(() => {
    vi.spyOn(api, "listNPCs").mockResolvedValue([
      { id: 5, name: "Mira" },
      { id: 6, name: "Tobin" },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders shared room fields with their current values and dispatches string changes", () => {
    const { callbacks } = renderEditor();

    const title = screen.getByLabelText("Title") as HTMLInputElement;
    expect(title.value).toBe("Authored room title");
    expect(title).toHaveClass("form-control");
    fireEvent.change(title, { target: { value: "Updated room" } });
    expect(callbacks.onUpdateRoomTitle).toHaveBeenCalledWith(7, "Updated room");

    const wallKind = screen.getByLabelText("Wall kind") as HTMLSelectElement;
    expect(wallKind.value).toBe("natural");
    expect(Array.from(wallKind.options).map((option) => option.value)).toEqual([
      "solid",
      "natural",
      "open",
    ]);
    expect(Array.from(wallKind.options).map((option) => option.textContent)).toEqual([
      "Solid",
      "Natural",
      "Open",
    ]);
    expect(wallKind).toHaveClass("form-control");
    fireEvent.change(wallKind, { target: { value: "open" } });
    expect(callbacks.onUpdateRoomWallKind).toHaveBeenCalledWith(7, "open");
  });

  it("keeps entry edits staged until submit, appends the entry, and resets the draft", () => {
    const { container, callbacks } = renderEditor();
    const openEntryForm = screen.getByRole("button", { name: "Add entry" });
    expect(openEntryForm).toHaveAttribute("type", "button");
    expect(openEntryForm).toHaveClass("maplab-pill-button", "maplab-editor-toolbar-button");
    expect(openEntryForm).not.toHaveClass("btn");
    fireEvent.click(openEntryForm);
    expect(screen.getByRole("button", { name: "Close entry form" })).toHaveAttribute(
      "type",
      "button",
    );

    const entryForm = container.querySelector(".maplab-room-content-entry-form") as HTMLFormElement;
    const entryFields = within(entryForm);
    const type = entryFields.getByLabelText("Type") as HTMLSelectElement;
    const title = entryFields.getByLabelText("Title") as HTMLInputElement;
    const content = entryFields.getByLabelText("Content") as HTMLTextAreaElement;

    expect(type.value).toBe("feature");
    expect(Array.from(type.options).map((option) => option.value)).toEqual([
      "feature",
      "encounter",
      "monster",
      "trap",
      "treasure",
      "npc",
      "trick",
      "door",
    ]);
    expect(title.value).toBe("");
    expect(content.value).toBe("");
    expect(type).toHaveClass("form-control");
    expect(title).toHaveClass("form-control");
    expect(content).toHaveClass("form-control", "form-textarea");

    fireEvent.change(type, { target: { value: "trap" } });
    fireEvent.change(title, { target: { value: "Poison darts" } });
    fireEvent.change(content, { target: { value: "A dart trap fires from the wall." } });
    expect(callbacks.onUpdateRoomEntries).not.toHaveBeenCalled();

    const submitEntry = entryFields.getByRole("button", { name: "Add entry" });
    expect(submitEntry).toHaveAttribute("type", "submit");
    expect(submitEntry).toHaveClass("maplab-pill-button", "maplab-editor-toolbar-button");
    fireEvent.click(submitEntry);
    expect(callbacks.onUpdateRoomEntries).toHaveBeenCalledWith(7, [
      existingEntry,
      { entry_type: "trap", title: "Poison darts", content: "A dart trap fires from the wall." },
    ]);
    expect(type.value).toBe("feature");
    expect(title.value).toBe("");
    expect(content.value).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Close entry form" }));
    expect(container.querySelector(".maplab-room-content-entry-form")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add entry" })).toHaveAttribute("type", "button");
  });

  it("updates NPC assignment immediately and preserves selected IDs absent from the roster", async () => {
    const { callbacks } = renderEditor({ dungeonRoom: { ...dungeonRoom, npcs: [5, 99] } });
    const editNpcs = screen.getByRole("button", { name: "Edit NPCs" });
    expect(editNpcs).toHaveAttribute("type", "button");
    expect(editNpcs).toHaveClass("maplab-pill-button", "maplab-editor-toolbar-button");
    expect(editNpcs).not.toHaveClass("btn");
    fireEvent.click(editNpcs);

    expect(screen.getByRole("group", { name: "Edit NPCs" })).toBeInTheDocument();
    const done = screen.getByRole("button", { name: "Done" });
    expect(done).toHaveAttribute("type", "button");
    expect(done).toHaveClass("maplab-pill-button", "maplab-editor-toolbar-button");
    const mira = await screen.findByLabelText("Mira");
    const tobin = await screen.findByLabelText("Tobin");
    expect(tobin).toHaveAttribute("type", "checkbox");
    expect(tobin).toHaveClass("form-checkbox");
    expect(tobin).not.toBeChecked();
    expect(mira).toBeChecked();

    fireEvent.click(tobin);
    expect(callbacks.onUpdateRoomNpcs).toHaveBeenNthCalledWith(1, 7, [5, 99, 6]);
    expect(tobin).toBeChecked();

    fireEvent.click(mira);
    expect(callbacks.onUpdateRoomNpcs).toHaveBeenNthCalledWith(2, 7, [99, 6]);
    expect(mira).not.toBeChecked();

    fireEvent.click(done);
    expect(screen.queryByRole("group", { name: "Edit NPCs" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit NPCs" })).toBeInTheDocument();
  });

  it("opens and closes the NPC and entry editors with keyboard-operable buttons", async () => {
    const user = userEvent.setup();
    const { container } = renderEditor();

    const editNpcs = screen.getByRole("button", { name: "Edit NPCs" });
    editNpcs.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("group", { name: "Edit NPCs" })).toBeInTheDocument();
    const done = screen.getByRole("button", { name: "Done" });
    done.focus();
    await user.keyboard(" ");
    expect(screen.queryByRole("group", { name: "Edit NPCs" })).not.toBeInTheDocument();

    const addEntry = screen.getByRole("button", { name: "Add entry" });
    addEntry.focus();
    await user.keyboard(" ");
    expect(container.querySelector(".maplab-room-content-entry-form")).toBeInTheDocument();
    const closeEntryForm = screen.getByRole("button", { name: "Close entry form" });
    closeEntryForm.focus();
    await user.keyboard("{Enter}");
    expect(container.querySelector(".maplab-room-content-entry-form")).not.toBeInTheDocument();
  });

  it("uses the ordinary create-room action as a button and passes the room ID", () => {
    const { callbacks } = renderEditor({ dungeonRoom: null });
    const createRoomData = screen.getByRole("button", { name: "Create room data" });

    expect(createRoomData).toHaveAttribute("type", "button");
    expect(createRoomData).toHaveClass("maplab-pill-button", "maplab-editor-toolbar-button");
    fireEvent.click(createRoomData);

    expect(callbacks.onCreateRoomData).toHaveBeenCalledWith(7);
  });
});
