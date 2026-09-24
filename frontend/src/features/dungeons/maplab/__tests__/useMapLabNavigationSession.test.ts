import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { decodeMapLabNavigation, useMapLabNavigationSession } from "../useMapLabNavigationSession";

describe("Map Lab navigation session codec", () => {
  const valid = JSON.stringify({
    activeZ: 0,
    zoom: { scale: 1.5, pan: { x: 12, y: -8 } },
    selectedTarget: { kind: "room", id: 4 },
    focusTarget: { kind: "door", id: 2 },
  });

  it("restores the four navigation fields, including floor zero", () => {
    expect(decodeMapLabNavigation(valid)).toEqual({
      activeZ: 0,
      zoom: { scale: 1.5, pan: { x: 12, y: -8 } },
      selectedTarget: { kind: "room", id: 4 },
      focusTarget: { kind: "door", id: 2 },
    });
  });

  it("rejects malformed fields", () => {
    expect(
      decodeMapLabNavigation(JSON.stringify({ ...JSON.parse(valid), activeZ: 0.5 })),
    ).toBeNull();
    expect(
      decodeMapLabNavigation(
        JSON.stringify({ ...JSON.parse(valid), zoom: { scale: 9, pan: { x: 0, y: 0 } } }),
      ),
    ).toBeNull();
    expect(decodeMapLabNavigation("{not-json")).toBeNull();
  });

  it("drops stale or missing targets without losing valid navigation fields", () => {
    expect(
      decodeMapLabNavigation(
        JSON.stringify({
          activeZ: 2,
          zoom: { scale: 1.5, pan: { x: 12, y: -8 } },
          selectedTarget: { kind: "room", id: -1 },
        }),
      ),
    ).toEqual({
      activeZ: 2,
      zoom: { scale: 1.5, pan: { x: 12, y: -8 } },
      selectedTarget: null,
      focusTarget: null,
    });
  });

  it("hydrates before writing the initial dungeon session", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    sessionStorage.setItem("maplab-navigation:7", valid);
    setItem.mockClear();

    const { result } = renderHook(() => useMapLabNavigationSession(7));

    expect(result.current.state).toEqual(JSON.parse(valid));
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(setItem).toHaveBeenLastCalledWith("maplab-navigation:7", valid);
    setItem.mockRestore();
    sessionStorage.clear();
  });

  it("hydrates the requested dungeon key without borrowing another dungeon session", () => {
    const otherDungeon = JSON.stringify({
      activeZ: 3,
      zoom: { scale: 0.75, pan: { x: -24, y: 16 } },
      selectedTarget: { kind: "prop", id: 9 },
      focusTarget: { kind: "stair", id: 5 },
    });
    sessionStorage.setItem("maplab-navigation:7", otherDungeon);
    sessionStorage.setItem("maplab-navigation:8", valid);

    const { result } = renderHook(() => useMapLabNavigationSession(8));

    expect(result.current.state).toEqual(JSON.parse(valid));
    expect(result.current.state.activeZ).toBe(0);
    expect(result.current.state.selectedTarget).toEqual({ kind: "room", id: 4 });
    expect(result.current.state.focusTarget).toEqual({ kind: "door", id: 2 });
    sessionStorage.clear();
  });
});
