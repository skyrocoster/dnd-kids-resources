import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MapSessionStateBlob } from "../../../../api/types";
import { useMapLabSessionState } from "../useMapLabSessionState";

const { mockGet, mockSave, mockReset, MockApiError } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockSave: vi.fn(),
  mockReset: vi.fn(),
  MockApiError: class extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock("../../../../api/client", () => ({
  getDungeonSessionState: mockGet,
  saveDungeonSessionState: mockSave,
  resetDungeonSessionState: mockReset,
  ApiError: MockApiError,
}));

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("useMapLabSessionState", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockSave.mockReset();
    mockReset.mockReset();
  });

  it("loads persisted partyRoomId from session blob", async () => {
    mockGet.mockResolvedValue({
      data: { partyRoomId: 5 },
    } as unknown as MapSessionStateBlob);
    mockSave.mockResolvedValue(undefined as unknown as { data: Record<string, unknown> });

    const { result } = renderHook(() => useMapLabSessionState(4));
    await flush();
    await flush();

    expect(result.current.partyRoomId).toBe(5);
  });

  it("defaults partyRoomId to null when blob has no partyRoomId", async () => {
    mockGet.mockResolvedValue({
      data: { doors: {} },
    } as unknown as MapSessionStateBlob);
    mockSave.mockResolvedValue(undefined as unknown as { data: Record<string, unknown> });

    const { result } = renderHook(() => useMapLabSessionState(4));
    await flush();
    await flush();

    expect(result.current.partyRoomId).toBeNull();
  });

  it("defaults partyRoomId to null on 404", async () => {
    mockGet.mockRejectedValue(new MockApiError(404, "not found"));
    mockSave.mockResolvedValue(undefined as unknown as { data: Record<string, unknown> });

    const { result } = renderHook(() => useMapLabSessionState(4));
    await flush();
    await flush();

    expect(result.current.partyRoomId).toBeNull();
    expect(result.current.loadStatus).toBe("empty");
  });

  it("saves partyRoomId in the PUT payload when setPartyRoomId is called", async () => {
    mockGet.mockResolvedValue({
      data: {},
    } as unknown as MapSessionStateBlob);
    mockSave.mockResolvedValue(undefined as unknown as { data: Record<string, unknown> });

    const { result } = renderHook(() => useMapLabSessionState(4));

    // Wait for the initial load and its save-suppression effect to settle.
    await waitFor(() => expect(result.current.loadStatus).toBe("ready"));
    await flush();

    // Verify initial state after load
    expect(result.current.loadStatus).toBe("ready");
    expect(result.current.partyRoomId).toBeNull();

    act(() => {
      result.current.setPartyRoomId(7);
    });

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    const payload = mockSave.mock.calls[0][1].data as Record<string, unknown>;
    expect(payload.partyRoomId).toBe(7);
  });

  it("resets partyRoomId to null on resetSessions and issues DELETE", async () => {
    mockGet.mockResolvedValue({
      data: { partyRoomId: 5 },
    } as unknown as MapSessionStateBlob);
    mockSave.mockResolvedValue(undefined as unknown as { data: Record<string, unknown> });
    mockReset.mockResolvedValue(undefined);

    const { result } = renderHook(() => useMapLabSessionState(4));

    // Wait for load
    await flush();
    await flush();

    expect(result.current.partyRoomId).toBe(5);

    act(() => {
      result.current.resetSessions();
    });
    await flush();

    expect(result.current.partyRoomId).toBeNull();
    expect(mockReset).toHaveBeenCalledTimes(1);
    // The skipNextSave flag should prevent an immediate PUT
    expect(mockSave).toHaveBeenCalledTimes(0);
  });

  it("does not save when dungeonId is null", async () => {
    mockSave.mockResolvedValue(undefined as unknown as { data: Record<string, unknown> });

    const { result } = renderHook(() => useMapLabSessionState(null));

    expect(result.current.partyRoomId).toBeNull();
    expect(result.current.loadStatus).toBe("error");

    act(() => {
      result.current.setPartyRoomId(3);
    });
    await flush();

    expect(mockSave).not.toHaveBeenCalled();
  });
});
