import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../../../../api/client";
import type { Dungeon } from "../../../../api/types";
import { useMapLabEditor } from "../useMapLabEditor";

const initialDungeon: Dungeon = {
  id: 4,
  title: "Test Dungeon",
  data: {
    rooms: [{ room_id: 1, title: "Loaded Room", entries: [], npcs: [9] }],
  },
};

const initialLayout = {
  meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
  rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: "Loaded Room" }],
  doors: [],
  stairs: [],
  floors: [{ z: 0, title: "Ground Floor" }],
  props: [],
  portals: [],
};

describe("useMapLabEditor", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads layout and dungeon data together", async () => {
    const layoutSpy = vi.spyOn(api, "getDungeonLayout").mockResolvedValue({ data: initialLayout });
    const dungeonSpy = vi.spyOn(api, "getDungeon").mockResolvedValue(initialDungeon);

    const { result } = renderHook(() => useMapLabEditor(4, initialDungeon));

    await act(async () => {
      await Promise.resolve();
    });

    expect(layoutSpy).toHaveBeenCalledWith(4);
    expect(dungeonSpy).toHaveBeenCalledWith(4);
    expect(result.current.loadStatus.status).toBe("ready");
    expect(result.current.dungeonData.rooms).toHaveLength(1);
    expect(result.current.dungeonData.rooms?.[0]).toMatchObject({
      room_id: 1,
      title: "Loaded Room",
    });
  });

  it("keeps layout loading when dungeon data fetch fails", async () => {
    vi.spyOn(api, "getDungeonLayout").mockResolvedValue({ data: initialLayout });
    vi.spyOn(api, "getDungeon").mockRejectedValue(new api.ApiError(404, "missing"));

    const { result } = renderHook(() => useMapLabEditor(4, null));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.loadStatus.status).toBe("ready");
    expect(result.current.dungeonDataStatus.status).toBe("error");
  });

  it("addRoom creates matching layout and dungeon-data rooms", async () => {
    vi.spyOn(api, "getDungeonLayout").mockResolvedValue({ data: initialLayout });
    vi.spyOn(api, "getDungeon").mockResolvedValue(initialDungeon);
    const saveLayoutSpy = vi
      .spyOn(api, "saveDungeonLayout")
      .mockResolvedValue({ data: initialLayout });
    const updateDungeonSpy = vi.spyOn(api, "updateDungeon").mockResolvedValue(initialDungeon);

    const { result } = renderHook(() => useMapLabEditor(4, initialDungeon));

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.addRoom();
    });

    expect(result.current.state.layout.rooms).toHaveLength(2);
    expect(result.current.dungeonData.rooms).toHaveLength(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(saveLayoutSpy).toHaveBeenCalledTimes(1);
    expect(updateDungeonSpy).toHaveBeenCalledTimes(1);
  });

  it("deleteRoom removes both room records", async () => {
    const layout = {
      ...initialLayout,
      rooms: [
        ...initialLayout.rooms,
        { room_id: 2, z: 0, origin: [1, 0], cells: [[1, 0]], title: "Second" },
      ],
    };
    const loadedRooms =
      (initialDungeon.data.rooms as
        Array<{ room_id: number; title: string; entries: []; npcs: [] }> | undefined) ?? [];
    vi.spyOn(api, "getDungeonLayout").mockResolvedValue({ data: layout });
    vi.spyOn(api, "getDungeon").mockResolvedValue({
      ...initialDungeon,
      data: { rooms: [...loadedRooms, { room_id: 2, title: "Second", entries: [], npcs: [] }] },
    });
    vi.spyOn(api, "saveDungeonLayout").mockResolvedValue({ data: layout });
    vi.spyOn(api, "updateDungeon").mockResolvedValue(initialDungeon);

    const { result } = renderHook(() => useMapLabEditor(4, initialDungeon));

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.deleteRoom(2);
    });

    expect(result.current.state.layout.rooms.map((room) => room.room_id)).toEqual([1]);
    expect(result.current.dungeonData.rooms?.map((room) => room.room_id)).toEqual([1]);
  });

  it("dropEmptyRoom removes both records, is undoable, and autosaves", async () => {
    const layout = {
      ...initialLayout,
      rooms: [
        ...initialLayout.rooms,
        { room_id: 2, z: 0, origin: [1, 0], cells: [[1, 0]], title: "Second" },
      ],
    };
    const loadedRooms =
      (initialDungeon.data.rooms as
        Array<{ room_id: number; title: string; entries: []; npcs: [] }> | undefined) ?? [];
    vi.spyOn(api, "getDungeonLayout").mockResolvedValue({ data: layout });
    vi.spyOn(api, "getDungeon").mockResolvedValue({
      ...initialDungeon,
      data: { rooms: [...loadedRooms, { room_id: 2, title: "Second", entries: [], npcs: [] }] },
    });
    const saveDungeonLayoutSpy = vi
      .spyOn(api, "saveDungeonLayout")
      .mockResolvedValue({ data: layout });
    const updateDungeonSpy = vi.spyOn(api, "updateDungeon").mockResolvedValue(initialDungeon);

    const { result } = renderHook(() => useMapLabEditor(4, initialDungeon));

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.dropEmptyRoom(2);
    });

    expect(result.current.state.layout.rooms.map((room) => room.room_id)).toEqual([1]);
    expect(result.current.dungeonData.rooms?.map((room) => room.room_id)).toEqual([1]);
    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.undo();
    });

    expect(result.current.state.layout.rooms.map((room) => room.room_id)).toEqual([1, 2]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(saveDungeonLayoutSpy).toHaveBeenCalled();
    expect(updateDungeonSpy).toHaveBeenCalled();
  });

  it("updateRoomTitle syncs the layout cache and dungeon data", async () => {
    vi.spyOn(api, "getDungeonLayout").mockResolvedValue({ data: initialLayout });
    vi.spyOn(api, "getDungeon").mockResolvedValue(initialDungeon);
    const updateDungeonSpy = vi.spyOn(api, "updateDungeon").mockResolvedValue(initialDungeon);
    vi.spyOn(api, "saveDungeonLayout").mockResolvedValue({ data: initialLayout });

    const { result } = renderHook(() => useMapLabEditor(4, initialDungeon));

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.updateRoomTitle(1, "Renamed Room");
    });

    expect(result.current.state.layout.rooms[0].title).toBe("Renamed Room");
    expect(result.current.dungeonData.rooms?.[0].title).toBe("Renamed Room");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    const payload = updateDungeonSpy.mock.calls[0][1].data as { rooms: Array<{ title: string }> };
    expect(payload.rooms[0].title).toBe("Renamed Room");
  });

  it("reports dual save failures through the combined status", async () => {
    vi.spyOn(api, "getDungeonLayout").mockResolvedValue({ data: initialLayout });
    vi.spyOn(api, "getDungeon").mockResolvedValue(initialDungeon);
    vi.spyOn(api, "saveDungeonLayout").mockRejectedValue(new Error("layout down"));
    vi.spyOn(api, "updateDungeon").mockResolvedValue(initialDungeon);

    const { result } = renderHook(() => useMapLabEditor(4, initialDungeon));

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.updateRoomTitle(1, "Renamed Room");
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(result.current.layoutSyncStatus.status).toBe("error");
    expect(result.current.dataSyncStatus.status).toBe("saved");
    expect(result.current.saveStatus.status).toBe("error");
  });

  it("updateRoomWallKind dispatches the room wallKind update and autosaves", async () => {
    vi.spyOn(api, "getDungeonLayout").mockResolvedValue({ data: initialLayout });
    vi.spyOn(api, "getDungeon").mockResolvedValue(initialDungeon);
    const saveLayoutSpy = vi
      .spyOn(api, "saveDungeonLayout")
      .mockResolvedValue({ data: initialLayout });

    const { result } = renderHook(() => useMapLabEditor(4, initialDungeon));

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.updateRoomWallKind(1, "natural");
    });

    expect(result.current.state.layout.rooms[0]).toMatchObject({ wallKind: "natural" });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(saveLayoutSpy).toHaveBeenCalledTimes(1);
    const savedData = saveLayoutSpy.mock.calls[0][1].data as { rooms: Array<{ wallKind: string }> };
    expect(savedData.rooms[0].wallKind).toBe("natural");
  });

  it("resetToLastLoadedLayout restores both blobs", async () => {
    vi.spyOn(api, "getDungeonLayout").mockResolvedValue({ data: initialLayout });
    vi.spyOn(api, "getDungeon").mockResolvedValue(initialDungeon);
    vi.spyOn(api, "saveDungeonLayout").mockResolvedValue({ data: initialLayout });
    vi.spyOn(api, "updateDungeon").mockResolvedValue(initialDungeon);

    const { result } = renderHook(() => useMapLabEditor(4, initialDungeon));

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.updateRoomTitle(1, "Renamed Room");
      result.current.addRoom();
    });

    act(() => {
      result.current.resetToLastLoadedLayout();
    });

    expect(result.current.state.layout.rooms).toHaveLength(1);
    expect(result.current.dungeonData.rooms).toHaveLength(1);
    expect(result.current.dungeonData.rooms?.[0].title).toBe("Loaded Room");
  });

  it("exposes undo and redo with layout autosaves", async () => {
    vi.spyOn(api, "getDungeonLayout").mockResolvedValue({ data: initialLayout });
    vi.spyOn(api, "getDungeon").mockResolvedValue(initialDungeon);
    const saveLayoutSpy = vi
      .spyOn(api, "saveDungeonLayout")
      .mockResolvedValue({ data: initialLayout });
    const { result } = renderHook(() => useMapLabEditor(4, initialDungeon));

    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      result.current.addDoor([2, 2], "N");
    });
    expect(result.current.canUndo).toBe(true);
    act(() => {
      result.current.undo();
    });
    expect(result.current.state.layout.doors).toHaveLength(0);
    expect(result.current.canRedo).toBe(true);
    act(() => {
      result.current.redo();
    });
    expect(result.current.state.layout.doors).toHaveLength(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(saveLayoutSpy).toHaveBeenCalledTimes(1);
  });

  it("collects ghost rooms (content-free, off-map) on load and autosaves", async () => {
    const layoutWithGhost = {
      meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
      rooms: [
        { room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: "Loaded Room" },
        { room_id: 2, z: 0, origin: [0, 0], cells: [] },
      ],
      doors: [],
      stairs: [],
      floors: [{ z: 0, title: "Ground Floor" }],
      props: [],
      portals: [],
    };
    const dungeonWithContent = {
      id: 4,
      title: "Test Dungeon",
      data: {
        rooms: [{ room_id: 1, title: "Loaded Room", entries: [], npcs: [9] }],
      },
    };

    vi.spyOn(api, "getDungeonLayout").mockResolvedValue({ data: layoutWithGhost });
    vi.spyOn(api, "getDungeon").mockResolvedValue(dungeonWithContent);
    const saveLayoutSpy = vi
      .spyOn(api, "saveDungeonLayout")
      .mockResolvedValue({ data: layoutWithGhost });
    const updateDungeonSpy = vi.spyOn(api, "updateDungeon").mockResolvedValue(dungeonWithContent);

    const { result } = renderHook(() => useMapLabEditor(4, dungeonWithContent));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.state.layout.rooms).toHaveLength(1);
    expect(result.current.state.layout.rooms[0].room_id).toBe(1);
    expect(result.current.dungeonData.rooms).toHaveLength(1);
    expect(result.current.dungeonData.rooms?.[0].room_id).toBe(1);
    expect(result.current.dungeonData.rooms?.[0].title).toBe("Loaded Room");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(saveLayoutSpy).toHaveBeenCalled();
    expect(updateDungeonSpy).toHaveBeenCalled();
  });
});
