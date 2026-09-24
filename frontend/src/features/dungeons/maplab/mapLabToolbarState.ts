import { useCallback, useState } from "react";
import type { MapDensity } from "../../../map/mapDensity";

const TOOLBAR_TRAY_STORAGE_PREFIX = "dnd-kids-maplab-tray-collapsed:";

function readStoredTrayCollapsed(groupKey: string): boolean {
  try {
    return window.localStorage.getItem(TOOLBAR_TRAY_STORAGE_PREFIX + groupKey) === "true";
  } catch {
    return false;
  }
}

/** Per-group toolbar-tray collapse: each toolbar group persists independently in localStorage. */
export function useToolbarTrayCollapse(groupKey: string): {
  collapsed: boolean;
  toggle: () => void;
} {
  const [collapsed, setCollapsed] = useState<boolean>(() => readStoredTrayCollapsed(groupKey));

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(TOOLBAR_TRAY_STORAGE_PREFIX + groupKey, String(next));
      } catch {
        // localStorage unavailable (e.g. private mode) — collapse state just won't persist
      }
      return next;
    });
  }, [groupKey]);

  return { collapsed, toggle };
}

export type MapLayerKey = "outside" | "props" | "passages" | "labels";

const LAYER_VISIBILITY_STORAGE_PREFIX = "dnd-kids-maplab-layer-visible:";
export const MAP_LAYER_KEYS: MapLayerKey[] = ["outside", "props", "passages", "labels"];

function readStoredLayerVisible(key: MapLayerKey): boolean {
  try {
    return window.localStorage.getItem(LAYER_VISIBILITY_STORAGE_PREFIX + key) !== "false";
  } catch {
    return true;
  }
}

/** Tracks visibility of the four map layers, defaulting all to visible and persisting each key. */
export function useMapLayerVisibility(): {
  visible: Record<MapLayerKey, boolean>;
  toggleLayer: (key: MapLayerKey) => void;
} {
  const [visible, setVisible] = useState<Record<MapLayerKey, boolean>>(() => {
    const initial = {} as Record<MapLayerKey, boolean>;
    for (const key of MAP_LAYER_KEYS) initial[key] = readStoredLayerVisible(key);
    return initial;
  });

  const toggleLayer = useCallback((key: MapLayerKey) => {
    setVisible((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        window.localStorage.setItem(LAYER_VISIBILITY_STORAGE_PREFIX + key, String(next[key]));
      } catch {
        // localStorage unavailable (e.g. private mode) — visibility state just won't persist
      }
      return next;
    });
  }, []);

  return { visible, toggleLayer };
}

const DENSITY_STORAGE_KEY = "dnd-kids-maplab-density";

function readStoredDensity(): MapDensity {
  try {
    const stored = window.localStorage.getItem(DENSITY_STORAGE_KEY);
    if (stored === "detailed" || stored === "auto" || stored === "simple") return stored;
  } catch {
    // localStorage unavailable — use default
  }
  return "auto";
}

/** Persisted density preference for the whole dungeon canvas. */
export function useMapDensity(): {
  density: MapDensity;
  setDensity: (value: MapDensity) => void;
} {
  const [density, setDensity] = useState<MapDensity>(() => readStoredDensity());

  const updateDensity = useCallback((value: MapDensity) => {
    setDensity(value);
    try {
      window.localStorage.setItem(DENSITY_STORAGE_KEY, value);
    } catch {
      // localStorage unavailable (e.g. private mode) — density state just won't persist
    }
  }, []);

  return { density, setDensity: updateDensity };
}
