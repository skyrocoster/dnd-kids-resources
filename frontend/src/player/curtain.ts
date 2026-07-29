/**
 * Player-view transform ("the curtain").
 *
 * Takes the full dungeon layout plus party knowledge and returns the kid-visible subset.
 * Fields declared as `never` or `whenKnown` are stripped; only `always` fields survive.
 * Encounter markers and features are excluded entirely from the returned layout.
 */
import type { MapKnowledge, MapKnowledgeItem } from '../api/types'
import type {
  MapLayout,
  MapRoom,
  MapDoor,
  MapStair,
  MapFloor,
  MapProp,
  MapPortal,
  MapLayoutMeta,
  PassageSessionState,
} from '../model/maplabModel'
import { effectivePassageState } from '../model/maplabModel'

type Visibility = 'never' | 'always' | 'whenKnown'

// ── Per‑field visibility declarations ──────────────────────────────────────
// Every key must be listed; adding a model field causes a TS error here.
// `whenKnown` currently resolves to "stripped" because no knowledge record exists.

const roomVis = {
  room_id: 'always',
  z: 'always',
  origin: 'always',
  cells: 'always',
  title: 'always',
  description: 'always',
  kind: 'always',
  wallKind: 'always',
} as const satisfies Record<keyof MapRoom, Visibility>

const doorVis = {
  door_id: 'always',
  cell: 'always',
  side: 'always',
  z: 'always',
  title: 'always',
  hidden: 'whenKnown',
  locked: 'whenKnown',
  trapped: 'whenKnown',
  breakDc: 'never',
  pickDc: 'never',
  hiddenDc: 'never',
  searchDc: 'never',
  note: 'never',
} as const satisfies Record<keyof MapDoor, Visibility>

const stairVis = {
  stair_id: 'always',
  from: 'always',
  to: 'always',
  title: 'always',
  hidden: 'whenKnown',
  locked: 'whenKnown',
  trapped: 'whenKnown',
  breakDc: 'never',
  pickDc: 'never',
  hiddenDc: 'never',
  searchDc: 'never',
  note: 'never',
} as const satisfies Record<keyof MapStair, Visibility>

const propVis = {
  prop_id: 'always',
  kind: 'always',
  cell: 'always',
  side: 'always',
  z: 'always',
  title: 'always',
  loot: 'always',
  encounter_id: 'never',
  npc_id: 'never',
  hidden: 'whenKnown',
  locked: 'whenKnown',
  trapped: 'whenKnown',
  breakDc: 'never',
  pickDc: 'never',
  hiddenDc: 'never',
  searchDc: 'never',
  note: 'never',
} as const satisfies Record<keyof MapProp, Visibility>

const portalVis = {
  portal_id: 'always',
  cell: 'always',
  z: 'always',
  title: 'always',
  to: 'always',
  hidden: 'whenKnown',
  locked: 'whenKnown',
  trapped: 'whenKnown',
  breakDc: 'never',
  pickDc: 'never',
  hiddenDc: 'never',
  searchDc: 'never',
  note: 'never',
} as const satisfies Record<keyof MapPortal, Visibility>

const floorVis = {
  z: 'always',
  title: 'always',
} as const satisfies Record<keyof MapFloor, Visibility>

const metaVis = {
  cellSizeFt: 'always',
  padding: 'always',
} as const satisfies Record<keyof MapLayoutMeta, Visibility>

// ── Derived types ──────────────────────────────────────────────────────────

export interface PassageSessionMap {
  doors?: Record<string, PassageSessionState>
  stairs?: Record<string, PassageSessionState>
  portals?: Record<string, PassageSessionState>
}

type KidField<T, V extends Record<keyof T, Visibility>> = {
  [K in keyof T as V[K] extends 'always' ? K : never]: T[K]
} & {
  [K in keyof T as V[K] extends 'whenKnown' ? K : never]?: T[K]
}

type KidRoom = KidField<MapRoom, typeof roomVis>
type KidDoor = KidField<MapDoor, typeof doorVis>
type KidStair = KidField<MapStair, typeof stairVis>
type KidFloor = KidField<MapFloor, typeof floorVis>
type KidProp = KidField<MapProp, typeof propVis>
type KidPortal = KidField<MapPortal, typeof portalVis>
type KidMeta = KidField<MapLayoutMeta, typeof metaVis>

export interface KidMapLayout {
  meta: KidMeta
  rooms: KidRoom[]
  doors: KidDoor[]
  stairs: KidStair[]
  floors: KidFloor[]
  props: KidProp[]
  portals: KidPortal[]
}

// ── Runtime pick helper ────────────────────────────────────────────────────

function pickAlways<T, V extends Record<keyof T, Visibility>>(
  obj: T,
  vis: V,
): KidField<T, V> {
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    if (vis[key as keyof T] === 'always') {
      result[key] = (obj as Record<string, unknown>)[key]
    }
  }
  return result as unknown as KidField<T, V>
}

// ── Knowledge-aware pick helper ────────────────────────────────────────────

function pickKnown(
  obj: { hidden: boolean; locked: boolean; trapped: boolean },
  knowledge: MapKnowledgeItem | undefined,
  effective: { locked: boolean; trapped: boolean },
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  if (knowledge?.exists) result.hidden = obj.hidden
  if (knowledge?.lock) result.locked = effective.locked
  if (knowledge?.trap) result.trapped = effective.trapped
  return result
}

// ── Transform ──────────────────────────────────────────────────────────────

/** The session blob's own curtain. A passage's session record carries `isOpen`, `isLocked` and
 * `trapDisarmed`; only open/closed is kid-visible, so this returns the set of open door ids and
 * nothing else — locked and trapped never leave this function. */
export function playerOpenDoorIds(
  doors: Record<string, { isOpen?: boolean }> | undefined,
): Set<number> {
  const open = new Set<number>()
  for (const [id, state] of Object.entries(doors ?? {})) {
    if (state?.isOpen) open.add(Number(id))
  }
  return open
}

export function playerViewTransform(
  layout: MapLayout,
  knowledge?: MapKnowledge,
  sessions?: PassageSessionMap,
): KidMapLayout {
  return {
    meta: pickAlways(layout.meta, metaVis),
    rooms: layout.rooms.map(r => pickAlways(r, roomVis)),
    doors: layout.doors
      .filter(d => !d.hidden || knowledge?.doors?.[String(d.door_id)]?.exists === true)
      .map(d => ({
        ...pickAlways(d, doorVis),
        ...pickKnown(d, knowledge?.doors?.[String(d.door_id)], effectivePassageState(d, sessions?.doors?.[String(d.door_id)])),
      })),
    stairs: layout.stairs
      .filter(s => !s.hidden || knowledge?.stairs?.[String(s.stair_id)]?.exists === true)
      .map(s => ({
        ...pickAlways(s, stairVis),
        ...pickKnown(s, knowledge?.stairs?.[String(s.stair_id)], effectivePassageState(s, sessions?.stairs?.[String(s.stair_id)])),
      })),
    floors: layout.floors.map(f => pickAlways(f, floorVis)),
    props: layout.props
      .filter(p => p.kind !== 'encounter')
      .filter(p => !p.hidden || knowledge?.props?.[String(p.prop_id)]?.exists === true)
      .map(p => ({
        ...pickAlways(p, propVis),
        ...pickKnown(p, knowledge?.props?.[String(p.prop_id)], p),
      })),
    portals: layout.portals
      .filter(p => !p.hidden || knowledge?.portals?.[String(p.portal_id)]?.exists === true)
      .map(p => ({
        ...pickAlways(p, portalVis),
        ...pickKnown(p, knowledge?.portals?.[String(p.portal_id)], effectivePassageState(p, sessions?.portals?.[String(p.portal_id)])),
      })),
  }
}
