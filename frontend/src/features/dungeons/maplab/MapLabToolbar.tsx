import { useCallback, useState, type ReactNode } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from '../../../components/icons'
import { resolveMapDensity, AUTO_DENSITY_SIMPLE_THRESHOLD } from '../../../map/mapDensity'
import type { MapDensity } from '../../../map/mapDensity'

export { resolveMapDensity, AUTO_DENSITY_SIMPLE_THRESHOLD }

const TOOLBAR_TRAY_STORAGE_PREFIX = 'dnd-kids-maplab-tray-collapsed:'

function readStoredTrayCollapsed(groupKey: string): boolean {
  try {
    return window.localStorage.getItem(TOOLBAR_TRAY_STORAGE_PREFIX + groupKey) === 'true'
  } catch {
    return false
  }
}

/** Per-group toolbar-tray collapse (Design Phase J1, `docs/dungeon_plan.md`): each toolbar group
 * (Create/Session/View/Status) collapses independently rather than through one unified "compact
 * mode" switch, since a DM running combat wants Session/Status open while rarely touching Create.
 * `localStorage`-backed per `groupKey`, default expanded — same pattern as `docs/design_plan.md`
 * DP2's `useNavCollapse`, keyed per group instead of one global flag. */
export function useToolbarTrayCollapse(groupKey: string): { collapsed: boolean; toggle: () => void } {
  const [collapsed, setCollapsed] = useState<boolean>(() => readStoredTrayCollapsed(groupKey))

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(TOOLBAR_TRAY_STORAGE_PREFIX + groupKey, String(next))
      } catch {
        // localStorage unavailable (e.g. private mode) — collapse state just won't persist
      }
      return next
    })
  }, [groupKey])

  return { collapsed, toggle }
}

export type MapLayerKey = 'outside' | 'props' | 'passages' | 'labels'

const LAYER_VISIBILITY_STORAGE_PREFIX = 'dnd-kids-maplab-layer-visible:'
export const MAP_LAYER_KEYS: MapLayerKey[] = ['outside', 'props', 'passages', 'labels']

function readStoredLayerVisible(key: MapLayerKey): boolean {
  try {
    return window.localStorage.getItem(LAYER_VISIBILITY_STORAGE_PREFIX + key) !== 'false'
  } catch {
    return true
  }
}

/** Tracks visibility of the four map layers — Outside, Props, Passages, Labels — defaulting all
 * to visible (absence of a stored value ≠ `'false'`), persisted per-key in `localStorage`. Same
 * try/catch-and-ignore pattern as `useToolbarTrayCollapse`, inverted default. */
export function useMapLayerVisibility(): {
  visible: Record<MapLayerKey, boolean>
  toggleLayer: (key: MapLayerKey) => void
} {
  const [visible, setVisible] = useState<Record<MapLayerKey, boolean>>(() => {
    const initial = {} as Record<MapLayerKey, boolean>
    for (const key of MAP_LAYER_KEYS) initial[key] = readStoredLayerVisible(key)
    return initial
  })

  const toggleLayer = useCallback((key: MapLayerKey) => {
    setVisible((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      try {
        window.localStorage.setItem(LAYER_VISIBILITY_STORAGE_PREFIX + key, String(next[key]))
      } catch {
        // localStorage unavailable (e.g. private mode) — visibility state just won't persist
      }
      return next
    })
  }, [])

  return { visible, toggleLayer }
}

const DENSITY_STORAGE_KEY = 'dnd-kids-maplab-density'

function readStoredDensity(): MapDensity {
  try {
    const stored = window.localStorage.getItem(DENSITY_STORAGE_KEY)
    if (stored === 'detailed' || stored === 'auto' || stored === 'simple') return stored
  } catch {
    // localStorage unavailable — use default
  }
  return 'auto'
}

/** Persisted density preference for the whole dungeon canvas — `Detailed` / `Auto` / `Simple`.
 *  Same try/catch-and-ignore pattern as `useMapLayerVisibility`. */
export function useMapDensity(): {
  density: MapDensity
  setDensity: (value: MapDensity) => void
} {
  const [density, setDensity] = useState<MapDensity>(() => readStoredDensity())

  const updateDensity = useCallback((value: MapDensity) => {
    setDensity(value)
    try {
      window.localStorage.setItem(DENSITY_STORAGE_KEY, value)
    } catch {
      // localStorage unavailable (e.g. private mode) — density state just won't persist
    }
  }, [])

  return { density, setDensity: updateDensity }
}

/** A collapsible toolbar group: label + chevron toggle always visible (so the group structure
 * stays legible collapsed), controls hidden via width/overflow (never `display:none`) when
 * collapsed. Shared by `MapLabPage`'s Session group and `MapLabEditorPage`'s Create/Session/View/
 * Status groups — the reusable half of J1's per-group collapse. */
export function ToolbarTray({
  groupKey,
  label,
  extraClassName,
  children,
}: {
  groupKey: string
  label: string
  extraClassName?: string
  children: ReactNode
}) {
  const { collapsed, toggle } = useToolbarTrayCollapse(groupKey)
  const ChevronIcon = collapsed ? ChevronDownIcon : ChevronUpIcon
  return (
    <div
      className={`maplab-toolbar-group maplab-toolbar-tray${extraClassName ? ` ${extraClassName}` : ''}`}
      data-collapsed={collapsed || undefined}
    >
      <span className="maplab-toolbar-group-label">{label}</span>
      <button
        type="button"
        className="maplab-toolbar-tray-toggle"
        aria-expanded={!collapsed}
        aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${label} tools`}
        onClick={toggle}
      >
        <ChevronIcon width={14} height={14} aria-hidden="true" />
      </button>
      <div className="maplab-toolbar-tray-controls">{children}</div>
    </div>
  )
}
