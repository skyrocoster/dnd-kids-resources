import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import * as api from "../../../../api/client";
import { MapLabEditorPage } from "../MapLabEditorPage";
import { mapLabLayout } from "../maplabData";
import { DungeonRouteContextProvider, type DungeonRouteContext } from "../dungeonRouteContext";

const mapLabLayoutFixture: Record<string, unknown> = { ...mapLabLayout };

function renderMapLabEditorPage(
  initialEntry: string = "/dungeons/4/edit",
  route: DungeonRouteContext = {
    dungeonId: 4,
    dungeon: { id: 4, title: "Test Dungeon", data: {} },
    status: "ready",
    error: null,
  },
) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <DungeonRouteContextProvider value={route}>
        <MapLabEditorPage />
      </DungeonRouteContextProvider>
    </MemoryRouter>,
  );
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

function armPassageTool(tool: "door" | "stair" | "portal") {
  fireEvent.click(screen.getByRole("button", { name: "Choose passage tool" }));
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${tool}$`, "i") }));
}

function armTerrainTool(tool: "river" | "trees") {
  fireEvent.click(screen.getByRole("button", { name: "Choose terrain tool" }));
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${tool}$`, "i") }));
}

function openViewPopover() {
  fireEvent.click(screen.getByRole("button", { name: "View" }));
}

function clientPointForCell(cell: [number, number], bounds: { minX: number; minY: number }) {
  return { clientX: (cell[0] - bounds.minX) * 64, clientY: (cell[1] - bounds.minY) * 64 };
}

function dragRoomBrush(
  container: HTMLElement,
  bounds: { minX: number; minY: number },
  cells: Array<[number, number]>,
) {
  const viewport = container.querySelector(".maplab-canvas-viewport") as HTMLElement;
  fireEvent.pointerDown(viewport, {
    pointerId: 1,
    button: 0,
    ...clientPointForCell(cells[0], bounds),
  });
  for (const cell of cells.slice(1)) {
    fireEvent.pointerMove(window, { pointerId: 1, ...clientPointForCell(cell, bounds) });
  }
  fireEvent.pointerUp(window, { pointerId: 1 });
}

describe("MapLabEditorPage (Stage 03 — editable per-side padding)", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
    vi.useFakeTimers();
    vi.spyOn(api, "getDungeon").mockResolvedValue({ id: 4, title: "Test Dungeon", data: {} });
    vi.spyOn(api, "listNPCs").mockResolvedValue([]);
    vi.spyOn(api, "updateDungeon").mockResolvedValue({ id: 4, title: "Test Dungeon", data: {} });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("changing the Top padding input autosaves with the updated value", async () => {
    const layout = {
      meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
      rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: "Room 1" }],
      doors: [],
      stairs: [],
      floors: [{ z: 0, title: "Ground Floor" }],
      props: [],
    };
    vi.spyOn(api, "getDungeonLayout").mockResolvedValue({ data: layout });
    const saveSpy = vi.spyOn(api, "saveDungeonLayout").mockResolvedValue({ data: layout });
    renderMapLabEditorPage();
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Map" }));
    const topInput = screen.getByLabelText("Top") as HTMLInputElement;
    expect(topInput).toBeInTheDocument();
    expect(topInput.value).toBe("3");
    fireEvent.change(topInput, { target: { value: "5" } });
    await act(async () => {
      vi.advanceTimersByTime(700);
      await Promise.resolve();
    });
    expect(saveSpy).toHaveBeenCalledTimes(1);
    const savedData = saveSpy.mock.calls[0][1].data as {
      meta: { padding: { top: number; right: number; bottom: number; left: number } };
    };
    expect(savedData.meta.padding).toMatchObject({ top: 5, right: 3, bottom: 3, left: 3 });
  });

  it("Map popover Reset unsaved changes requires confirmation and stays open for the internal action", async () => {
    const layout = {
      meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
      rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: "Room 1" }],
      doors: [],
      stairs: [],
      floors: [{ z: 0, title: "Ground Floor" }],
      props: [],
    };
    vi.spyOn(api, "getDungeonLayout").mockResolvedValue({ data: layout });
    vi.spyOn(api, "saveDungeonLayout").mockResolvedValue({ data: layout });
    renderMapLabEditorPage();
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Map" }));
    const topInput = screen.getByLabelText("Top") as HTMLInputElement;
    fireEvent.change(topInput, { target: { value: "5" } });
    expect(topInput.value).toBe("5");
    fireEvent.click(screen.getByRole("button", { name: "Reset unsaved changes" }));
    expect(topInput).toBeInTheDocument();
    expect(
      screen.getByText("Discard unsaved changes and restore the last saved layout?"),
    ).toBeInTheDocument();
    expect(topInput.value).toBe("5");
    fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
    await flush();
    expect(
      screen.queryByText("Discard unsaved changes and restore the last saved layout?"),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Top")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Map" }));
    expect((screen.getByLabelText("Top") as HTMLInputElement).value).toBe("3");
  });

  it("pointer-down creates a feature and drag-stroke extends it via the brush model", async () => {
    const layout = {
      meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
      rooms: [],
      doors: [],
      stairs: [],
      floors: [{ z: 0, title: "Ground Floor" }],
      props: [],
      features: [],
    };
    vi.spyOn(api, "getDungeonLayout").mockResolvedValue({ data: layout });
    vi.spyOn(api, "saveDungeonLayout").mockResolvedValue({ data: layout });
    const { container } = renderMapLabEditorPage();
    await flush();
    armTerrainTool("trees");
    expect(container.querySelectorAll(".maplab-feature-cell")).toHaveLength(0);
    dragRoomBrush(container, { minX: -3, minY: -3 }, [[0, 0]]);
    expect(container.querySelectorAll(".maplab-feature-cell")).toHaveLength(1);
    dragRoomBrush(container, { minX: -3, minY: -3 }, [
      [0, 0],
      [1, 0],
      [2, 0],
    ]);
    expect(container.querySelectorAll(".maplab-feature-cell")).toHaveLength(3);
  });

  it("erase stroke removes cells when feature is selected and erase is armed", async () => {
    const layout = {
      meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
      rooms: [],
      doors: [],
      stairs: [],
      floors: [{ z: 0, title: "Ground Floor" }],
      props: [],
      features: [],
    };
    vi.spyOn(api, "getDungeonLayout").mockResolvedValue({ data: layout });
    vi.spyOn(api, "saveDungeonLayout").mockResolvedValue({ data: layout });
    const { container } = renderMapLabEditorPage();
    await flush();
    armTerrainTool("river");
    dragRoomBrush(container, { minX: -3, minY: -3 }, [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
    ]);
    expect(container.querySelectorAll(".maplab-feature-cell")).toHaveLength(5);
    fireEvent.click(screen.getByRole("button", { name: "Erase" }));
    dragRoomBrush(container, { minX: -3, minY: -3 }, [
      [0, 0],
      [1, 0],
    ]);
    expect(container.querySelectorAll(".maplab-feature-cell")).toHaveLength(3);
  });
});

describe("MapLabEditorPage (density control)", () => {
  afterEach(() => {
    window.localStorage.removeItem("dnd-kids-maplab-density");
  });
  it("renders Detailed / Auto / Simple buttons in the View toolbar", async () => {
    vi.spyOn(api, "getDungeonLayout").mockResolvedValue({
      data: {
        meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
        rooms: [],
        doors: [],
        stairs: [],
        floors: [{ z: 0, title: "Ground Floor" }],
        props: [],
      },
    });
    vi.spyOn(api, "saveDungeonLayout").mockResolvedValue({ data: {} });
    renderMapLabEditorPage();
    await flush();
    openViewPopover();
    expect(screen.getByRole("button", { name: "Detailed" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Auto" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Simple" })).toBeInTheDocument();
  });
  it("clicking Density sets it active and persists", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "getDungeonLayout").mockResolvedValue({
      data: {
        meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
        rooms: [],
        doors: [],
        stairs: [],
        floors: [{ z: 0, title: "Ground Floor" }],
        props: [],
      },
    });
    vi.spyOn(api, "saveDungeonLayout").mockResolvedValue({ data: {} });
    renderMapLabEditorPage();
    await flush();
    openViewPopover();
    await user.click(screen.getByRole("button", { name: "Detailed" }));
    expect(screen.getByRole("button", { name: "Detailed" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(window.localStorage.getItem("dnd-kids-maplab-density")).toBe("detailed");
  });
});

describe("MapLabEditorPage (Map Lab UX Pass Stage 1 — cross-floor door leak)", () => {
  const stackedLayout = {
    meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
    rooms: [
      { room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: "Ground Room" },
      { room_id: 2, z: 1, origin: [0, 0], cells: [[0, 0]], title: "Upper Room" },
    ],
    doors: [
      { door_id: 1, cell: [0, 0], side: "N", z: 0, hidden: false, locked: false, trapped: false },
    ],
    stairs: [],
    floors: [
      { z: 0, title: "Ground Floor" },
      { z: 1, title: "First Floor" },
    ],
    props: [],
  };
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it("a door on the floor below does not cut a wall out of the room above it", async () => {
    vi.spyOn(api, "getDungeonLayout").mockResolvedValue({ data: stackedLayout });
    vi.spyOn(api, "saveDungeonLayout").mockResolvedValue({ data: stackedLayout });
    const { container } = renderMapLabEditorPage();
    await flush();
    expect(container.querySelectorAll(".maplab-room .maplab-wall")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "First Floor" }));
    expect(container.querySelectorAll(".maplab-room .maplab-wall")).toHaveLength(4);
  });
  it("door placement on the floor above offers the wall over a lower-floor door", async () => {
    vi.spyOn(api, "getDungeonLayout").mockResolvedValue({ data: stackedLayout });
    vi.spyOn(api, "saveDungeonLayout").mockResolvedValue({ data: stackedLayout });
    const { container } = renderMapLabEditorPage();
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "First Floor" }));
    armPassageTool("door");
    expect(container.querySelectorAll(".maplab-door-placement-edge")).toHaveLength(4);
  });
});

describe("MapLabEditorPage (Map Lab UX Pass Stage 4 — editor hotkeys)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
    vi.spyOn(api, "getDungeon").mockResolvedValue({ id: 4, title: "Test Dungeon", data: {} });
    vi.spyOn(api, "listNPCs").mockResolvedValue([]);
    vi.spyOn(api, "updateDungeon").mockResolvedValue({ id: 4, title: "Test Dungeon", data: {} });
    vi.spyOn(api, "getDungeonLayout").mockResolvedValue({ data: mapLabLayoutFixture });
    vi.spyOn(api, "saveDungeonLayout").mockResolvedValue({ data: mapLabLayoutFixture });
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });
  it("arms tools from editor hotkeys and remembers grouped sub-tools", async () => {
    renderMapLabEditorPage();
    await flush();
    fireEvent.keyDown(window, { key: "r" });
    expect(screen.getByRole("button", { name: "Room" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyDown(window, { key: "s" });
    fireEvent.click(screen.getByRole("button", { name: "Choose passage tool" }));
    expect(screen.getByRole("button", { name: "Stair" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyDown(window, { key: "t" });
    fireEvent.click(screen.getByRole("button", { name: "Choose terrain tool" }));
    expect(screen.getByRole("button", { name: "Trees" })).toHaveAttribute("aria-pressed", "true");
  });
  it("ignores tool hotkeys while typing in an editor input", async () => {
    renderMapLabEditorPage();
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Map" }));
    fireEvent.keyDown(screen.getByLabelText("Top"), { key: "r" });
    expect(screen.getByRole("button", { name: "Select" })).toHaveAttribute("aria-pressed", "true");
  });
  it("quick-select filters a flyout and Enter arms the top match without firing hotkeys", async () => {
    renderMapLabEditorPage();
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Choose prop kind" }));
    await act(async () => {
      vi.runOnlyPendingTimers();
    });
    const filter = screen.getByRole("searchbox", { name: "Filter prop tools" });
    expect(filter).toHaveFocus();
    fireEvent.change(filter, { target: { value: "table" } });
    expect(screen.getByRole("button", { name: "Table" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Chest" })).not.toBeInTheDocument();
    fireEvent.keyDown(filter, { key: "ArrowDown" });
    expect(filter).toHaveFocus();
    expect(screen.getByRole("button", { name: "Select" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyDown(filter, { key: "Enter" });
    expect(screen.queryByRole("searchbox", { name: "Filter prop tools" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Choose prop kind" }));
    expect(screen.getByRole("button", { name: "Table" })).toHaveAttribute("aria-pressed", "true");
  });
  it("ordered Escape reaches the arbiter from flyout search and returns focus without enabling typing hotkeys", async () => {
    renderMapLabEditorPage();
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Room" }));
    const flyoutTrigger = screen.getByRole("button", { name: "Choose prop kind" });
    fireEvent.click(flyoutTrigger);
    await act(async () => {
      vi.runOnlyPendingTimers();
    });
    const filter = screen.getByRole("searchbox", { name: "Filter prop tools" });
    expect(filter).toHaveFocus();
    fireEvent.keyDown(filter, { key: "r" });
    expect(screen.getByRole("button", { name: "Room" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyDown(filter, { key: "Escape" });
    expect(screen.queryByRole("searchbox", { name: "Filter prop tools" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Room" })).toHaveAttribute("aria-pressed", "true");
    expect(flyoutTrigger).toHaveFocus();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("button", { name: "Select" })).toHaveAttribute("aria-pressed", "true");
  });
  it("Connections closes before selection and disarming, one Escape owner per press", async () => {
    const { container } = renderMapLabEditorPage();
    await flush();
    fireEvent.click(container.querySelector(".maplab-room") as Element);
    expect(container.querySelector(".maplab-inspector-rail")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Room" }));
    const connectionsTrigger = screen.getByRole("button", { name: /Connections/ });
    fireEvent.click(connectionsTrigger);
    expect(screen.getByRole("dialog", { name: "Connection utilities" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Connection utilities" })).not.toBeInTheDocument();
    expect(container.querySelector(".maplab-inspector-rail")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Room" })).toHaveAttribute("aria-pressed", "true");
    expect(connectionsTrigger).toHaveFocus();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(container.querySelector(".maplab-inspector-rail")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Room" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("button", { name: "Select" })).toHaveAttribute("aria-pressed", "true");
  });
  it("Escape closes an open popover before disarming the current tool", async () => {
    renderMapLabEditorPage();
    await flush();
    fireEvent.keyDown(window, { key: "r" });
    fireEvent.click(screen.getByRole("button", { name: "Map" }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByLabelText("Top")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Room" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("button", { name: "Select" })).toHaveAttribute("aria-pressed", "true");
  });
  it("second click on armed tool disarms to Select and shows Escape hint", async () => {
    renderMapLabEditorPage();
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Room" }));
    expect(screen.getByRole("button", { name: "Room" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Room" })).toHaveAttribute(
      "title",
      "Click again or press Escape to return to Select.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Room" }));
    expect(screen.getByRole("button", { name: "Select" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Room" })).not.toHaveAttribute("title");
  });
  it("wires Ctrl+Z and Ctrl+Shift+Z to editor history", async () => {
    const layout = {
      meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
      rooms: [],
      doors: [],
      stairs: [],
      floors: [{ z: 0, title: "Ground Floor" }],
      props: [],
    };
    vi.spyOn(api, "getDungeonLayout").mockResolvedValue({ data: layout });
    vi.spyOn(api, "saveDungeonLayout").mockResolvedValue({ data: layout });
    const { container } = renderMapLabEditorPage();
    await flush();
    fireEvent.keyDown(window, { key: "r" });
    dragRoomBrush(container, { minX: -3, minY: -3 }, [[0, 0]]);
    expect(screen.getByRole("button", { name: "Undo" })).toBeEnabled();
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(screen.getByRole("button", { name: "Redo" })).toBeEnabled();
    fireEvent.keyDown(window, { key: "z", ctrlKey: true, shiftKey: true });
    expect(screen.getByRole("button", { name: "Undo" })).toBeEnabled();
  });
});

describe("MapLabEditorPage (Map Lab UX Pass — tablet navigation drawer)", () => {
  it("keeps floor choices in the toolbar and exposes the accessible Find room trigger and panel", async () => {
    const { container } = renderMapLabEditorPage();
    await flush();
    expect(
      container.querySelector('.maplab-toolbar [role="group"][aria-label="Dungeon floors"]'),
    ).toBeInTheDocument();
    const finder = screen.getByRole("button", { name: "Find room…" });
    expect(finder).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("dialog", { name: "Find room" })).not.toBeInTheDocument();
    fireEvent.click(finder);
    expect(finder).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("searchbox", { name: "Find room…" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close room finder" }));
    expect(finder).toHaveAttribute("aria-expanded", "false");
  });
  it("closes the room finder from Escape and the close button without disarming a tool", async () => {
    renderMapLabEditorPage();
    await flush();
    fireEvent.keyDown(window, { key: "r" });
    fireEvent.click(screen.getByRole("button", { name: "Find room…" }));
    fireEvent.keyDown(screen.getByRole("searchbox", { name: "Find room…" }), { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Find room" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Room" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Find room…" }));
    expect(screen.getByRole("dialog", { name: "Find room" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close room finder" }));
    expect(screen.queryByRole("dialog", { name: "Find room" })).not.toBeInTheDocument();
  });
  it("labels rooms missing from the layout as off-map results and keeps on-map rooms in their floor group", async () => {
    const onMapRoom = { room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: "On Map" };
    const offMapRoom = { room_id: 2, title: "Off Map", entries: [], npcs: [] };
    const layout = {
      meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
      rooms: [onMapRoom],
      doors: [],
      stairs: [],
      floors: [{ z: 0, title: "Ground Floor" }],
      props: [],
      portals: [],
    };
    vi.spyOn(api, "getDungeon").mockResolvedValue({
      id: 4,
      title: "Test Dungeon",
      data: { rooms: [onMapRoom, offMapRoom] },
    });
    vi.spyOn(api, "getDungeonLayout").mockResolvedValue({ data: layout });
    renderMapLabEditorPage();
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Find room…" }));
    expect(screen.getByRole("heading", { name: "Off map", level: 4 })).toBeInTheDocument();
    expect(
      within(screen.getByRole("listbox", { name: "Off map rooms" })).getByRole("button", {
        name: /Off Map/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("listbox", { name: "Ground Floor rooms" })).toBeInTheDocument();
  });
  it("off-map rooms do not render as canvas room groups", async () => {
    const onMapRoom = { room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: "On Map" };
    const offMapRoom = { room_id: 2, z: 0, origin: [0, 0], cells: [], title: "Off Map" };
    const layout = {
      meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
      rooms: [onMapRoom, offMapRoom],
      doors: [],
      stairs: [],
      floors: [{ z: 0, title: "Ground Floor" }],
      props: [],
      portals: [],
    };
    vi.spyOn(api, "getDungeonLayout").mockResolvedValue({ data: layout });
    const { container } = renderMapLabEditorPage();
    await flush();
    expect(container.querySelectorAll(".maplab-room")).toHaveLength(1);
  });
});
