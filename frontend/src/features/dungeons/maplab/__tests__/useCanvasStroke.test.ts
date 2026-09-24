import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useCanvasStroke } from "../useCanvasStroke";
import type { ZoomState } from "../../../../map/useMapCanvasZoom";

function makePointerEvent(overrides: Partial<PointerEvent>): PointerEvent {
  return {
    clientX: 0,
    clientY: 0,
    button: 0,
    preventDefault: () => {},
    ...overrides,
  } as unknown as PointerEvent;
}

describe("useCanvasStroke", () => {
  it("start reports one cell", () => {
    const onStrokeStart = vi.fn();
    const onStrokeCell = vi.fn();
    const onStrokeEnd = vi.fn();
    const zoom: ZoomState = { scale: 1, pan: { x: 0, y: 0 } };
    const bounds = { minX: 0, maxX: 9, minY: 0, maxY: 9 };

    const { result } = renderHook(() =>
      useCanvasStroke({
        enabled: true,
        zoom,
        bounds,
        onStrokeStart,
        onStrokeCell,
        onStrokeEnd,
      }),
    );

    const viewport = document.createElement("div");
    vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0 } as DOMRect);
    // Add setPointerCapture and releasePointerCapture as mock methods
    viewport.setPointerCapture = vi.fn();
    viewport.releasePointerCapture = vi.fn();

    act(() => result.current.setStrokeViewportEl(viewport));

    // Pointer down at (0, 0) client coords -> cell (0, 0) in content
    act(() =>
      result.current.onStrokePointerDown(
        makePointerEvent({ pointerId: 1, clientX: 0, clientY: 0 }),
      ),
    );

    expect(onStrokeStart).toHaveBeenCalledTimes(1);
    expect(onStrokeStart).toHaveBeenCalledWith([0, 0]);
    expect(onStrokeCell).not.toHaveBeenCalled();
    expect(onStrokeEnd).not.toHaveBeenCalled();
  });

  it("a drag across three cells reports each exactly once, in order", () => {
    const onStrokeStart = vi.fn();
    const onStrokeCell = vi.fn();
    const onStrokeEnd = vi.fn();
    const zoom: ZoomState = { scale: 1, pan: { x: 0, y: 0 } };
    const bounds = { minX: 0, maxX: 9, minY: 0, maxY: 9 };

    const { result } = renderHook(() =>
      useCanvasStroke({
        enabled: true,
        zoom,
        bounds,
        onStrokeStart,
        onStrokeCell,
        onStrokeEnd,
      }),
    );

    const viewport = document.createElement("div");
    vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0 } as DOMRect);
    viewport.setPointerCapture = vi.fn();
    viewport.releasePointerCapture = vi.fn();

    act(() => result.current.setStrokeViewportEl(viewport));

    // Pointer down at (0, 0) -> cell (0, 0)
    act(() =>
      result.current.onStrokePointerDown(
        makePointerEvent({ pointerId: 1, clientX: 0, clientY: 0 }),
      ),
    );
    expect(onStrokeStart).toHaveBeenCalledWith([0, 0]);

    // Move to (64, 0) -> cell (1, 0)
    act(() =>
      result.current.onStrokePointerMove(
        makePointerEvent({ pointerId: 1, clientX: 64, clientY: 0 }),
      ),
    );
    expect(onStrokeCell).toHaveBeenCalledWith([1, 0]);
    expect(onStrokeCell).toHaveBeenCalledTimes(1);

    // Move to (128, 0) -> cell (2, 0)
    act(() =>
      result.current.onStrokePointerMove(
        makePointerEvent({ pointerId: 1, clientX: 128, clientY: 0 }),
      ),
    );
    expect(onStrokeCell).toHaveBeenCalledWith([2, 0]);
    expect(onStrokeCell).toHaveBeenCalledTimes(2);

    // Move to (192, 0) -> cell (3, 0)
    act(() =>
      result.current.onStrokePointerMove(
        makePointerEvent({ pointerId: 1, clientX: 192, clientY: 0 }),
      ),
    );
    expect(onStrokeCell).toHaveBeenCalledWith([3, 0]);
    expect(onStrokeCell).toHaveBeenCalledTimes(3);

    // Pointer up
    act(() => result.current.onStrokePointerUp(makePointerEvent({ pointerId: 1 })));
    expect(onStrokeEnd).toHaveBeenCalledTimes(1);
  });

  it("a jump of several cells is filled in by cellsBetween", () => {
    const onStrokeStart = vi.fn();
    const onStrokeCell = vi.fn();
    const onStrokeEnd = vi.fn();
    const zoom: ZoomState = { scale: 1, pan: { x: 0, y: 0 } };
    const bounds = { minX: 0, maxX: 9, minY: 0, maxY: 9 };

    const { result } = renderHook(() =>
      useCanvasStroke({
        enabled: true,
        zoom,
        bounds,
        onStrokeStart,
        onStrokeCell,
        onStrokeEnd,
      }),
    );

    const viewport = document.createElement("div");
    vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0 } as DOMRect);
    viewport.setPointerCapture = vi.fn();
    viewport.releasePointerCapture = vi.fn();

    act(() => result.current.setStrokeViewportEl(viewport));

    // Pointer down at (0, 0) -> cell (0, 0)
    act(() =>
      result.current.onStrokePointerDown(
        makePointerEvent({ pointerId: 1, clientX: 0, clientY: 0 }),
      ),
    );
    expect(onStrokeStart).toHaveBeenCalledWith([0, 0]);

    // Fast jump to (192, 0) -> cell (3, 0): cellsBetween should fill (1,0), (2,0), (3,0)
    act(() =>
      result.current.onStrokePointerMove(
        makePointerEvent({ pointerId: 1, clientX: 192, clientY: 0 }),
      ),
    );

    expect(onStrokeCell).toHaveBeenCalledWith([1, 0]);
    expect(onStrokeCell).toHaveBeenCalledWith([2, 0]);
    expect(onStrokeCell).toHaveBeenCalledWith([3, 0]);
    expect(onStrokeCell).toHaveBeenCalledTimes(3);
  });

  it("enabled: false reports nothing", () => {
    const onStrokeStart = vi.fn();
    const onStrokeCell = vi.fn();
    const onStrokeEnd = vi.fn();
    const zoom: ZoomState = { scale: 1, pan: { x: 0, y: 0 } };
    const bounds = { minX: 0, maxX: 9, minY: 0, maxY: 9 };

    const { result } = renderHook(() =>
      useCanvasStroke({
        enabled: false,
        zoom,
        bounds,
        onStrokeStart,
        onStrokeCell,
        onStrokeEnd,
      }),
    );

    const viewport = document.createElement("div");
    vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0 } as DOMRect);

    act(() => result.current.setStrokeViewportEl(viewport));

    // Pointer down should not start a stroke
    act(() =>
      result.current.onStrokePointerDown(
        makePointerEvent({ pointerId: 1, clientX: 0, clientY: 0 }),
      ),
    );
    expect(onStrokeStart).not.toHaveBeenCalled();

    // Move should not report cells
    act(() =>
      result.current.onStrokePointerMove(
        makePointerEvent({ pointerId: 1, clientX: 64, clientY: 0 }),
      ),
    );
    expect(onStrokeCell).not.toHaveBeenCalled();

    // Up should not report end
    act(() => result.current.onStrokePointerUp(makePointerEvent({ pointerId: 1 })));
    expect(onStrokeEnd).not.toHaveBeenCalled();
  });

  it("a second pointer aborts the stroke", () => {
    const onStrokeStart = vi.fn();
    const onStrokeCell = vi.fn();
    const onStrokeEnd = vi.fn();
    const zoom: ZoomState = { scale: 1, pan: { x: 0, y: 0 } };
    const bounds = { minX: 0, maxX: 9, minY: 0, maxY: 9 };

    const { result } = renderHook(() =>
      useCanvasStroke({
        enabled: true,
        zoom,
        bounds,
        onStrokeStart,
        onStrokeCell,
        onStrokeEnd,
      }),
    );

    const viewport = document.createElement("div");
    vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0 } as DOMRect);
    viewport.setPointerCapture = vi.fn();
    viewport.releasePointerCapture = vi.fn();

    act(() => result.current.setStrokeViewportEl(viewport));

    // First pointer down starts stroke
    act(() =>
      result.current.onStrokePointerDown(
        makePointerEvent({ pointerId: 1, clientX: 0, clientY: 0 }),
      ),
    );
    expect(onStrokeStart).toHaveBeenCalledWith([0, 0]);

    // Move first pointer
    act(() =>
      result.current.onStrokePointerMove(
        makePointerEvent({ pointerId: 1, clientX: 64, clientY: 0 }),
      ),
    );
    expect(onStrokeCell).toHaveBeenCalledWith([1, 0]);

    // Second pointer down arrives
    act(() =>
      result.current.onStrokePointerDown(
        makePointerEvent({ pointerId: 2, clientX: 0, clientY: 64 }),
      ),
    );

    // Move should now be abandoned (even with first pointer)
    act(() =>
      result.current.onStrokePointerMove(
        makePointerEvent({ pointerId: 1, clientX: 128, clientY: 0 }),
      ),
    );
    expect(onStrokeCell).toHaveBeenCalledTimes(1); // No new cell reported

    // Releasing second pointer should not trigger end-cell callback
    // (the stroke was already abandoned)
    act(() => result.current.onStrokePointerUp(makePointerEvent({ pointerId: 2 })));
    expect(onStrokeEnd).not.toHaveBeenCalled();

    // Releasing first pointer also should not report end (stroke was abandoned)
    act(() => result.current.onStrokePointerUp(makePointerEvent({ pointerId: 1 })));
    expect(onStrokeEnd).not.toHaveBeenCalled();
  });

  it("pointercancel ends the stroke cleanly", () => {
    const onStrokeStart = vi.fn();
    const onStrokeCell = vi.fn();
    const onStrokeEnd = vi.fn();
    const zoom: ZoomState = { scale: 1, pan: { x: 0, y: 0 } };
    const bounds = { minX: 0, maxX: 9, minY: 0, maxY: 9 };

    const { result } = renderHook(() =>
      useCanvasStroke({
        enabled: true,
        zoom,
        bounds,
        onStrokeStart,
        onStrokeCell,
        onStrokeEnd,
      }),
    );

    const viewport = document.createElement("div");
    vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0 } as DOMRect);
    viewport.setPointerCapture = vi.fn();
    viewport.releasePointerCapture = vi.fn();

    act(() => result.current.setStrokeViewportEl(viewport));

    // Start stroke
    act(() =>
      result.current.onStrokePointerDown(
        makePointerEvent({ pointerId: 1, clientX: 0, clientY: 0 }),
      ),
    );
    expect(onStrokeStart).toHaveBeenCalledWith([0, 0]);

    // Move
    act(() =>
      result.current.onStrokePointerMove(
        makePointerEvent({ pointerId: 1, clientX: 64, clientY: 0 }),
      ),
    );
    expect(onStrokeCell).toHaveBeenCalledWith([1, 0]);

    // Cancel (simulating browser gesture take-over or finger leaving digitizer)
    // Reuse handlePointerUp since both pointerup and pointercancel trigger it
    act(() => result.current.onStrokePointerUp(makePointerEvent({ pointerId: 1 })));
    expect(onStrokeEnd).toHaveBeenCalledTimes(1);
  });

  it("ignores non-primary pointer", () => {
    const onStrokeStart = vi.fn();
    const zoom: ZoomState = { scale: 1, pan: { x: 0, y: 0 } };
    const bounds = { minX: 0, maxX: 9, minY: 0, maxY: 9 };

    const { result } = renderHook(() =>
      useCanvasStroke({
        enabled: true,
        zoom,
        bounds,
        onStrokeStart,
      }),
    );

    const viewport = document.createElement("div");
    vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0 } as DOMRect);

    act(() => result.current.setStrokeViewportEl(viewport));

    // Secondary button (right-click)
    act(() =>
      result.current.onStrokePointerDown(
        makePointerEvent({ pointerId: 1, button: 2, clientX: 0, clientY: 0 }),
      ),
    );
    expect(onStrokeStart).not.toHaveBeenCalled();
  });

  it("reads current zoom/bounds on move (regression: stale closure)", () => {
    // This test catches the bug where handleStrokePointerMove captured stale zoom/bounds
    // in its closure instead of reading from refs on each invocation.
    const onStrokeStart = vi.fn();
    const onStrokeCell = vi.fn();
    const onStrokeEnd = vi.fn();

    // Start with scale 1, pan (0, 0)
    const initialZoom: ZoomState = { scale: 1, pan: { x: 0, y: 0 } };
    const bounds = { minX: 0, maxX: 9, minY: 0, maxY: 9 };

    const { result, rerender } = renderHook(
      ({ zoom }: { zoom: ZoomState }) =>
        useCanvasStroke({
          enabled: true,
          zoom,
          bounds,
          onStrokeStart,
          onStrokeCell,
          onStrokeEnd,
        }),
      { initialProps: { zoom: initialZoom } },
    );

    const viewport = document.createElement("div");
    vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0 } as DOMRect);
    viewport.setPointerCapture = vi.fn();
    viewport.releasePointerCapture = vi.fn();

    act(() => result.current.setStrokeViewportEl(viewport));

    // Start stroke at (0, 0) with scale 1, pan (0, 0) -> cell (0, 0)
    act(() =>
      result.current.onStrokePointerDown(
        makePointerEvent({ pointerId: 1, clientX: 0, clientY: 0 }),
      ),
    );
    expect(onStrokeStart).toHaveBeenCalledWith([0, 0]);

    // Now re-render with a different zoom: scale 2, pan (0, 0)
    // At scale 2, the same viewport offset maps to different cells because of the scaling
    const newZoom: ZoomState = { scale: 2, pan: { x: 0, y: 0 } };
    act(() => rerender({ zoom: newZoom }));

    // Move to (128, 0) in viewport:
    // - At scale 1: (128, 0) in viewport -> content (128, 0) -> cell (2, 0)
    // - At scale 2: (128, 0) in viewport -> content (128, 0) -> cell (1, 0)
    // If the bug existed (stale zoom in closure), it would report cell (2, 0).
    // With the fix (reads from ref), it correctly reports cell (1, 0).
    act(() =>
      result.current.onStrokePointerMove(
        makePointerEvent({ pointerId: 1, clientX: 128, clientY: 0 }),
      ),
    );

    // The move should use the NEW zoom (scale 2), not the old zoom (scale 1)
    expect(onStrokeCell).toHaveBeenCalledWith([1, 0]);
  });
});
