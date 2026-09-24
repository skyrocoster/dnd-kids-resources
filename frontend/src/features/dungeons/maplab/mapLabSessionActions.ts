import {
  defaultFixtureState,
  effectiveFixtureState,
  type FixtureState,
  type MapDoor,
  type MapLayout,
  type MapPortal,
  type MapProp,
  type MapStair,
  type PassageSessionState,
  type SessionFixtureState,
} from "../../../model/maplabModel";
import type { PassageSessionMap } from "../../../player/curtain";

export type SessionMap = Record<number, SessionFixtureState>;

function fixtureStateToPassageState(state: FixtureState): PassageSessionState {
  return {
    isOpen: state.open ?? false,
    isLocked: state.obstacles.lock.armed,
    trapDisarmed: !state.obstacles.trap.armed,
  };
}

export function doorSession(doorSessions: SessionMap, door: MapDoor): PassageSessionState {
  const override = doorSessions[door.door_id];
  const effective = effectiveFixtureState(door.state ?? defaultFixtureState(), override);
  return fixtureStateToPassageState(effective);
}

export function stairSession(stairSessions: SessionMap, stair: MapStair): PassageSessionState {
  const override = stairSessions[stair.stair_id];
  const effective = effectiveFixtureState(stair.state ?? defaultFixtureState(), override);
  return fixtureStateToPassageState(effective);
}

export function portalSession(portalSessions: SessionMap, portal: MapPortal): PassageSessionState {
  const override = portalSessions[portal.portal_id];
  const effective = effectiveFixtureState(portal.state ?? defaultFixtureState(), override);
  return fixtureStateToPassageState(effective);
}

export function propSession(propSessions: SessionMap, prop: MapProp): PassageSessionState {
  const override = propSessions[prop.prop_id];
  const effective = effectiveFixtureState(prop.state ?? defaultFixtureState(), override);
  return fixtureStateToPassageState(effective);
}

export function toggleDoorOpen(doorSessions: SessionMap, door: MapDoor): SessionFixtureState {
  const currentOverride = doorSessions[door.door_id];
  const effective = effectiveFixtureState(door.state ?? defaultFixtureState(), currentOverride);
  return {
    ...(currentOverride ?? {}),
    open: !effective.open,
  };
}

export function toggleDoorLocked(doorSessions: SessionMap, door: MapDoor): SessionFixtureState {
  const currentOverride = doorSessions[door.door_id];
  const effective = effectiveFixtureState(door.state ?? defaultFixtureState(), currentOverride);
  return {
    ...(currentOverride ?? {}),
    obstacles: {
      ...(currentOverride?.obstacles ?? {}),
      lock: {
        ...(currentOverride?.obstacles?.lock ?? {}),
        armed: !effective.obstacles.lock.armed,
      },
    },
  };
}

export function disarmDoorTrap(doorSessions: SessionMap, door: MapDoor): SessionFixtureState {
  const currentOverride = doorSessions[door.door_id];
  return {
    ...(currentOverride ?? {}),
    obstacles: {
      ...(currentOverride?.obstacles ?? {}),
      trap: {
        ...(currentOverride?.obstacles?.trap ?? {}),
        armed: false,
      },
    },
  };
}

export function toggleStairLocked(stairSessions: SessionMap, stair: MapStair): SessionFixtureState {
  const currentOverride = stairSessions[stair.stair_id];
  const effective = effectiveFixtureState(stair.state ?? defaultFixtureState(), currentOverride);
  return {
    ...(currentOverride ?? {}),
    obstacles: {
      ...(currentOverride?.obstacles ?? {}),
      lock: {
        ...(currentOverride?.obstacles?.lock ?? {}),
        armed: !effective.obstacles.lock.armed,
      },
    },
  };
}

export function disarmStairTrap(stairSessions: SessionMap, stair: MapStair): SessionFixtureState {
  const currentOverride = stairSessions[stair.stair_id];
  return {
    ...(currentOverride ?? {}),
    obstacles: {
      ...(currentOverride?.obstacles ?? {}),
      trap: {
        ...(currentOverride?.obstacles?.trap ?? {}),
        armed: false,
      },
    },
  };
}

export function togglePortalLocked(
  portalSessions: SessionMap,
  portal: MapPortal,
): SessionFixtureState {
  const currentOverride = portalSessions[portal.portal_id];
  const effective = effectiveFixtureState(portal.state ?? defaultFixtureState(), currentOverride);
  return {
    ...(currentOverride ?? {}),
    obstacles: {
      ...(currentOverride?.obstacles ?? {}),
      lock: {
        ...(currentOverride?.obstacles?.lock ?? {}),
        armed: !effective.obstacles.lock.armed,
      },
    },
  };
}

export function disarmPortalTrap(
  portalSessions: SessionMap,
  portal: MapPortal,
): SessionFixtureState {
  const currentOverride = portalSessions[portal.portal_id];
  return {
    ...(currentOverride ?? {}),
    obstacles: {
      ...(currentOverride?.obstacles ?? {}),
      trap: {
        ...(currentOverride?.obstacles?.trap ?? {}),
        armed: false,
      },
    },
  };
}

export function buildPreviewSessionMap(
  layout: MapLayout,
  doorSessions: SessionMap,
  stairSessions: SessionMap,
  portalSessions: SessionMap,
): PassageSessionMap {
  return {
    doors: Object.fromEntries(
      layout.doors.map((d) => [
        String(d.door_id),
        doorSessions[d.door_id] ?? ({} as SessionFixtureState),
      ]),
    ),
    stairs: Object.fromEntries(
      layout.stairs.map((s) => [
        String(s.stair_id),
        stairSessions[s.stair_id] ?? ({} as SessionFixtureState),
      ]),
    ),
    portals: Object.fromEntries(
      layout.portals.map((p) => [
        String(p.portal_id),
        portalSessions[p.portal_id] ?? ({} as SessionFixtureState),
      ]),
    ),
  } as PassageSessionMap;
}

export function getStairTrapDisarmed(stair: MapStair, session: SessionFixtureState): boolean {
  return stair.trapped && session.obstacles?.trap?.armed === false;
}
