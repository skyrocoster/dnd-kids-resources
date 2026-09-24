import { act, fireEvent, render, screen } from "@testing-library/react";
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

function openViewPopover() {
  fireEvent.click(screen.getByRole("button", { name: "View" }));
}

beforeEach(() => {
  window.sessionStorage.clear();
  vi.restoreAllMocks();
  vi.useFakeTimers();
  vi.spyOn(api, "getDungeon").mockResolvedValue({ id: 4, title: "Test Dungeon", data: {} });
  vi.spyOn(api, "listNPCs").mockResolvedValue([]);
  vi.spyOn(api, "updateDungeon").mockResolvedValue({ id: 4, title: "Test Dungeon", data: {} });
  vi.spyOn(api, "getDungeonLayout").mockResolvedValue({
    data: mapLabLayoutFixture as unknown as Record<string, unknown>,
  });
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe("MapLabEditorPage (Stage G0 — Ghost Objects scaffolding)", () => {
  const oneFloorLayout = {
    meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
    rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: "Room 1" }],
    doors: [],
    stairs: [],
    floors: [{ z: 0, title: "Ground Floor" }],
    props: [],
  };

  const twoFloorLayout = {
    meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
    rooms: [
      { room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: "Ground Room" },
      { room_id: 2, z: 1, origin: [0, 0], cells: [[0, 0]], title: "Upper Room" },
    ],
    doors: [],
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

  it('View toolbar group appears with "Ghost lower floor" toggle (Stage G0)', async () => {
    vi.spyOn(api, "getDungeonLayout").mockResolvedValue({ data: oneFloorLayout });
    vi.spyOn(api, "saveDungeonLayout").mockResolvedValue({ data: oneFloorLayout });

    renderMapLabEditorPage();
    await flush();

    expect(screen.getByRole("button", { name: "View" })).toBeInTheDocument();
    openViewPopover();
    expect(screen.getByRole("button", { name: /ghost lower floor/i })).toBeInTheDocument();
  });

  it("ghost floor toggle is disabled when there is no lower floor (Stage G0)", async () => {
    vi.spyOn(api, "getDungeonLayout").mockResolvedValue({ data: oneFloorLayout });
    vi.spyOn(api, "saveDungeonLayout").mockResolvedValue({ data: oneFloorLayout });

    renderMapLabEditorPage();
    await flush();

    openViewPopover();
    expect(screen.getByRole("button", { name: /ghost lower floor/i })).toBeDisabled();
  });

  it("ghost floor toggle enables/disables via aria-pressed (Stage G0)", async () => {
    vi.spyOn(api, "getDungeonLayout").mockResolvedValue({ data: twoFloorLayout });
    vi.spyOn(api, "saveDungeonLayout").mockResolvedValue({ data: twoFloorLayout });

    renderMapLabEditorPage();
    await flush();

    fireEvent.click(screen.getByRole("button", { name: "First Floor" }));

    openViewPopover();
    const toggle = screen.getByRole("button", { name: /ghost lower floor/i });
    expect(toggle).not.toBeDisabled();
    expect(toggle).toHaveClass("form-advanced-toggle", "maplab-view-toggle");
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });
});

describe("MapLabEditorPage (Stage G1 — Ghost floor rendering)", () => {
  const twoFloorLayout = {
    meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
    rooms: [
      { room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: "Ground Room" },
      { room_id: 2, z: 1, origin: [0, 0], cells: [[0, 0]], title: "Upper Room" },
    ],
    doors: [],
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

  it("enabled ghost floor renders lower-floor rooms as read-only overlays (Stage G1)", async () => {
    vi.spyOn(api, "getDungeonLayout").mockResolvedValue({ data: twoFloorLayout });
    vi.spyOn(api, "saveDungeonLayout").mockResolvedValue({ data: twoFloorLayout });

    const { container } = renderMapLabEditorPage();
    await flush();

    fireEvent.click(screen.getByRole("button", { name: "First Floor" }));
    expect(container.querySelector(".maplab-ghost-layer")).not.toBeInTheDocument();

    openViewPopover();
    fireEvent.click(screen.getByRole("button", { name: /ghost lower floor/i }));

    const ghostLayer = container.querySelector(".maplab-ghost-layer");
    expect(ghostLayer).toBeInTheDocument();
    expect(ghostLayer?.textContent).toMatch(/Ground Room/);
  });

  it("ghost floor objects sit behind active floor and stay non-interactive (Stage G1)", async () => {
    vi.spyOn(api, "getDungeonLayout").mockResolvedValue({ data: twoFloorLayout });
    vi.spyOn(api, "saveDungeonLayout").mockResolvedValue({ data: twoFloorLayout });

    const { container } = renderMapLabEditorPage();
    await flush();

    fireEvent.click(screen.getByRole("button", { name: "First Floor" }));
    openViewPopover();
    fireEvent.click(screen.getByRole("button", { name: /ghost lower floor/i }));

    const ghostLayer = container.querySelector(".maplab-ghost-layer");
    expect(ghostLayer).toHaveAttribute("aria-hidden", "true");
    expect(ghostLayer?.querySelector('[role="button"]')).not.toBeInTheDocument();
    expect(ghostLayer?.querySelector("[tabindex]")).not.toBeInTheDocument();

    // The ghost layer must precede the active floor's rooms in document order, so it renders
    // behind them (SVG paints later siblings on top).
    const activeRoom = container.querySelector(".maplab-room");
    const position = ghostLayer?.compareDocumentPosition(activeRoom as Node);
    expect((position as number) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("ghostFloorZ returns the nearest z < activeZ that has rooms (Stage G1)", async () => {
    vi.spyOn(api, "getDungeonLayout").mockResolvedValue({ data: twoFloorLayout });
    vi.spyOn(api, "saveDungeonLayout").mockResolvedValue({ data: twoFloorLayout });

    renderMapLabEditorPage();
    await flush();

    // Floor 0 (the lowest with rooms) has no lower floor to ghost.
    openViewPopover();
    expect(screen.getByRole("button", { name: /ghost lower floor/i })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "First Floor" }));
    openViewPopover();
    expect(screen.getByRole("button", { name: /ghost lower floor/i })).not.toBeDisabled();
  });
});

describe("MapLabEditorPage (Stage G2 — ghost treatment design pass)", () => {
  const twoFloorLayoutWithProp = {
    meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
    rooms: [
      { room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: "Ground Room" },
      { room_id: 2, z: 1, origin: [0, 0], cells: [[0, 0]], title: "Upper Room" },
    ],
    doors: [],
    stairs: [],
    floors: [
      { z: 0, title: "Ground Floor" },
      { z: 1, title: "First Floor" },
    ],
    props: [
      {
        prop_id: 1,
        kind: "chest",
        cell: [0, 0],
        z: 0,
        title: "Ghost Chest",
        hidden: false,
        locked: true,
        trapped: false,
      },
    ],
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("a ghosted lower-floor prop renders inside the ghost layer, non-interactive, alongside ghost rooms/doors (Stage G2)", async () => {
    vi.spyOn(api, "getDungeonLayout").mockResolvedValue({ data: twoFloorLayoutWithProp });
    vi.spyOn(api, "saveDungeonLayout").mockResolvedValue({ data: twoFloorLayoutWithProp });

    const { container } = renderMapLabEditorPage();
    await flush();

    fireEvent.click(screen.getByRole("button", { name: "First Floor" }));
    openViewPopover();
    fireEvent.click(screen.getByRole("button", { name: /ghost lower floor/i }));

    const ghostLayer = container.querySelector(".maplab-ghost-layer");
    const ghostProp = ghostLayer?.querySelector(".maplab-prop");
    expect(ghostProp).toBeInTheDocument();
    expect(ghostProp).not.toHaveAttribute("role");
    expect(ghostProp).not.toHaveAttribute("tabindex");
  });
});
