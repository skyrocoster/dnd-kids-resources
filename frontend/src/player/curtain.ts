/**
 * Player-view transform ("the curtain").
 *
 * Takes the full dungeon layout and returns the kid-visible subset.
 * Fields declared as `never` or `whenKnown` are stripped; only `always` fields survive.
 * Encounter markers and features are excluded entirely from the returned layout.
 */
import type {
  MapLayout,
  MapRoom,
  MapDoor,
  MapStair,
  MapFloor,
  MapProp,
  MapPortal,
  MapLayoutMeta,
  FixtureState,
  PassageSessionState,
  SessionFixtureState,
} from "../model/maplabModel";
import { effectiveFixtureState, fixtureStateFromFlags } from "../model/maplabModel";

type KidField<T, K extends keyof T = keyof T> = Pick<T, K>;

type KidRoom = KidField<MapRoom>;
type KidFloor = KidField<MapFloor>;
type KidMeta = Pick<MapLayoutMeta, "cellSizeFt" | "padding">;
type KidDoor = Pick<MapDoor, "door_id" | "cell" | "side" | "z" | "title"> & KidFixtureFacts;
type KidStair = Pick<MapStair, "stair_id" | "from" | "to" | "title"> & KidFixtureFacts;
type KidProp = Pick<MapProp, "prop_id" | "kind" | "cell" | "side" | "z" | "title"> &
  KidFixtureFacts;
type KidPortal = Pick<MapPortal, "portal_id" | "cell" | "z" | "title" | "to"> & KidFixtureFacts;

interface KidFixtureFacts {
  state?: MapDoor["state"] | "open" | "closed";
  locked?: boolean;
  trapped?: boolean;
}

export interface PassageSessionMap {
  doors?: Record<string, PassageSessionState | SessionFixtureState>;
  stairs?: Record<string, PassageSessionState | SessionFixtureState>;
  props?: Record<string, SessionFixtureState>;
  portals?: Record<string, PassageSessionState | SessionFixtureState>;
}

export interface KidMapLayout {
  meta: KidMeta;
  rooms: KidRoom[];
  doors: KidDoor[];
  stairs: KidStair[];
  floors: KidFloor[];
  props: KidProp[];
  portals: KidPortal[];
}

// ── Transform ──────────────────────────────────────────────────────────────

/** The session blob's own curtain. A passage's session record carries `open` (SessionFixtureState)
 * or legacy `isOpen` (PassageSessionState); only open/closed is kid-visible, so this returns the
 * set of open door ids and nothing else — locked, trapped, and concealment never leave this function. */
export function playerOpenDoorIds(
  doors: Record<string, { open?: boolean; isOpen?: boolean }> | undefined,
): Set<number> {
  const open = new Set<number>();
  for (const [id, state] of Object.entries(doors ?? {})) {
    if (state?.open || state?.isOpen) open.add(Number(id));
  }
  return open;
}

export function playerViewTransform(layout: MapLayout, sessions?: PassageSessionMap): KidMapLayout {
  const sessionFor = (kind: keyof PassageSessionMap, id: number) => sessions?.[kind]?.[String(id)];
  const fixture = <
    T extends { hidden?: boolean; locked?: boolean; trapped?: boolean; state?: unknown },
  >(
    value: T,
    session: SessionFixtureState | PassageSessionState | undefined,
  ) => {
    const sessionValue = session as
      | (SessionFixtureState & {
          hidden?: boolean;
          locked?: boolean;
          trapped?: boolean;
          isOpen?: boolean;
        })
      | undefined;
    const authored = (value.state ??
      fixtureStateFromFlags(value as Parameters<typeof fixtureStateFromFlags>[0])) as FixtureState;
    const effective = effectiveFixtureState(authored, sessionValue);
    const open = sessionValue?.open ?? sessionValue?.isOpen ?? effective.open;
    const hidden = sessionValue?.hidden ?? (value.state === undefined ? value.hidden : undefined);
    return {
      visible: !(hidden === true || effective.obstacles.concealment.armed),
      state: open ? ("open" as const) : ("closed" as const),
      locked:
        effective.obstacles.lock.armed && effective.obstacles.lock.shown
          ? (true as const)
          : undefined,
      trapped:
        effective.obstacles.trap.armed && effective.obstacles.trap.shown
          ? (true as const)
          : undefined,
    };
  };
  const facts = (value: ReturnType<typeof fixture>) => ({
    state: value.state,
    ...(value.locked ? { locked: true as const } : {}),
    ...(value.trapped ? { trapped: true as const } : {}),
  });
  return {
    meta: { cellSizeFt: layout.meta.cellSizeFt, padding: layout.meta.padding },
    rooms: layout.rooms,
    doors: layout.doors
      .map((d) => ({ d, effective: fixture(d, sessionFor("doors", d.door_id)) }))
      .filter(({ effective }) => effective.visible)
      .map(({ d, effective }) => ({
        door_id: d.door_id,
        cell: d.cell,
        side: d.side,
        z: d.z,
        title: d.title,
        ...facts(effective),
      })),
    stairs: layout.stairs
      .map((s) => ({ s, effective: fixture(s, sessionFor("stairs", s.stair_id)) }))
      .filter(({ effective }) => effective.visible)
      .map(({ s, effective }) => ({
        stair_id: s.stair_id,
        from: s.from,
        to: s.to,
        title: s.title,
        ...facts(effective),
      })),
    floors: layout.floors,
    props: layout.props
      .filter((p) => p.kind !== "encounter")
      .map((p) => ({ p, effective: fixture(p, sessionFor("props", p.prop_id)) }))
      .filter(({ effective }) => effective.visible)
      .map(({ p, effective }) => ({
        prop_id: p.prop_id,
        kind: p.kind,
        cell: p.cell,
        side: p.side,
        z: p.z,
        title: p.title,
        ...facts(effective),
      })),
    portals: layout.portals
      .map((p) => ({ p, effective: fixture(p, sessionFor("portals", p.portal_id)) }))
      .filter(({ effective }) => effective.visible)
      .map(({ p, effective }) => ({
        portal_id: p.portal_id,
        cell: p.cell,
        z: p.z,
        title: p.title,
        to: p.to,
        ...facts(effective),
      })),
  };
}
