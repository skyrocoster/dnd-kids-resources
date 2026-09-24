import { useEffect, useState } from "react";
import type { ZoomState } from "../../../map/useMapCanvasZoom";

export interface MapLabNavigationTarget {
  kind: string;
  id: number;
}

export interface MapLabNavigationState {
  activeZ: number;
  zoom: ZoomState;
  selectedTarget: MapLabNavigationTarget | null;
  focusTarget: MapLabNavigationTarget | null;
}

const DEFAULT_STATE: MapLabNavigationState = {
  activeZ: 0,
  zoom: { scale: 1, pan: { x: 0, y: 0 } },
  selectedTarget: null,
  focusTarget: null,
};

function validTarget(value: unknown): value is MapLabNavigationTarget {
  if (!value || typeof value !== "object") return false;
  const target = value as Record<string, unknown>;
  return (
    typeof target.kind === "string" && Number.isInteger(target.id) && (target.id as number) >= 0
  );
}

function validZoom(value: unknown): value is ZoomState {
  if (!value || typeof value !== "object") return false;
  const zoom = value as Record<string, unknown>;
  const pan = zoom.pan;
  return (
    typeof zoom.scale === "number" &&
    Number.isFinite(zoom.scale) &&
    zoom.scale >= 0.25 &&
    zoom.scale <= 3 &&
    !!pan &&
    typeof pan === "object" &&
    typeof (pan as Record<string, unknown>).x === "number" &&
    Number.isFinite((pan as Record<string, unknown>).x) &&
    typeof (pan as Record<string, unknown>).y === "number" &&
    Number.isFinite((pan as Record<string, unknown>).y)
  );
}

export function decodeMapLabNavigation(value: string | null): MapLabNavigationState | null {
  if (value === null) return null;
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (!parsed || !Number.isInteger(parsed.activeZ) || !validZoom(parsed.zoom)) return null;
    return {
      activeZ: parsed.activeZ as number,
      zoom: parsed.zoom,
      selectedTarget: validTarget(parsed.selectedTarget) ? parsed.selectedTarget : null,
      focusTarget: validTarget(parsed.focusTarget) ? parsed.focusTarget : null,
    };
  } catch {
    return null;
  }
}

export function useMapLabNavigationSession(dungeonId: number | null) {
  const key = dungeonId === null ? null : `maplab-navigation:${dungeonId}`;
  const [state, setState] = useState<MapLabNavigationState>(() => {
    if (key === null) return DEFAULT_STATE;
    return decodeMapLabNavigation(window.sessionStorage.getItem(key)) ?? DEFAULT_STATE;
  });
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);

  useEffect(() => {
    if (key === null) {
      setState(DEFAULT_STATE);
      setHydratedKey(key);
      return;
    }
    let restored: MapLabNavigationState | null = null;
    try {
      restored = decodeMapLabNavigation(window.sessionStorage.getItem(key));
    } catch {
      /* session storage is optional */
    }
    setState(restored ?? DEFAULT_STATE);
    setHydratedKey(key);
  }, [key]);

  useEffect(() => {
    if (key === null || hydratedKey !== key) return;
    try {
      window.sessionStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* session storage is optional */
    }
  }, [hydratedKey, key, state]);

  return { state, setState };
}
