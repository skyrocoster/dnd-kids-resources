import { useEffect, useRef, useState } from "react";
import { ApiError, getAtTheTable, getDungeonLayout, getDungeonSessionState } from "../api/client";
import { normalizeLayout, type MapLayout, type SessionFixtureState } from "../model/maplabModel";
import { playerOpenDoorIds, playerViewTransform, type KidMapLayout } from "./curtain";

export const PLAYER_MAP_POLL_INTERVAL_MS = 5_000;

export type PlayerMapDataStatus = "loading" | "ready" | "empty" | "error";

export interface PlayerMapData {
  dungeonId: number | null;
  layout: KidMapLayout | null;
  /** Doors the DM has opened in this dungeon's session. Open/closed only — the session blob's
   * locked and trapped flags are dropped by the curtain and never reach the tablet. */
  openDoorIds: ReadonlySet<number>;
  /** The party room id from the session blob, null if unset or session unavailable. */
  partyRoomId: number | null;
  status: PlayerMapDataStatus;
  error: Error | null;
}

const NO_OPEN_DOORS: ReadonlySet<number> = new Set<number>();

const INITIAL_STATE: PlayerMapData = {
  dungeonId: null,
  layout: null,
  openDoorIds: NO_OPEN_DOORS,
  partyRoomId: null,
  status: "loading",
  error: null,
};

export function usePlayerMapData(): PlayerMapData {
  const [state, setState] = useState<PlayerMapData>(INITIAL_STATE);
  const lastGoodFrame = useRef<PlayerMapData | null>(null);

  useEffect(() => {
    let cancelled = false;
    let activeRequest: AbortController | null = null;
    let pollTimer: number | null = null;

    const scheduleNext = () => {
      if (cancelled) return;
      pollTimer = window.setTimeout(() => void poll(), PLAYER_MAP_POLL_INTERVAL_MS);
    };

    const poll = async () => {
      activeRequest?.abort();
      const request = new AbortController();
      activeRequest = request;

      try {
        const pointer = await getAtTheTable(request.signal);
        if (cancelled || request.signal.aborted) return;

        const dungeonId = pointer.dungeon_id;
        if (dungeonId == null) {
          lastGoodFrame.current = null;
          setState({
            dungeonId: null,
            layout: null,
            openDoorIds: NO_OPEN_DOORS,
            partyRoomId: null,
            status: "empty",
            error: null,
          });
          scheduleNext();
          return;
        }

        const blob = await getDungeonLayout(dungeonId, request.signal);
        if (cancelled || request.signal.aborted) return;

        // A dungeon with no session row yet (404) simply has no open doors — that must not fail the
        // whole frame, so this one call swallows its own error rather than joining the catch below.
        // On the first frame, any failure degrades to default (closed, unlocked, armed) state so
        // the tablet layout still reaches the player. On a later frame, a transient session-read
        // failure throws to the outer catch which retains the last confirmed frame.
        const session = await getDungeonSessionState(dungeonId, request.signal)
          .then((s) => {
            const data = s.data as {
              doors?: Record<string, SessionFixtureState>;
              stairs?: Record<string, SessionFixtureState>;
              props?: Record<string, SessionFixtureState>;
              portals?: Record<string, SessionFixtureState>;
              partyRoomId?: number | null;
            };
            return {
              doors: data.doors,
              stairs: data.stairs,
              props: data.props,
              portals: data.portals,
              partyRoomId: data.partyRoomId ?? null,
            };
          })
          .catch((err: unknown) => {
            if (err instanceof ApiError && err.status === 404) {
              return {
                doors: undefined,
                stairs: undefined,
                props: undefined,
                portals: undefined,
                partyRoomId: null,
              };
            }
            if (!lastGoodFrame.current) {
              return {
                doors: undefined,
                stairs: undefined,
                props: undefined,
                portals: undefined,
                partyRoomId: null,
              };
            }
            throw err;
          });
        if (cancelled || request.signal.aborted) return;

        const layout = playerViewTransform(normalizeLayout(blob.data as unknown as MapLayout), {
          doors: session.doors,
          stairs: session.stairs,
          props: session.props,
          portals: session.portals,
        });
        const frame: PlayerMapData = {
          dungeonId,
          layout,
          openDoorIds: playerOpenDoorIds(session.doors),
          partyRoomId: session.partyRoomId,
          status: "ready",
          error: null,
        };
        lastGoodFrame.current = frame;
        setState(frame);
      } catch (error: unknown) {
        if (cancelled || request.signal.aborted) return;

        if (error instanceof ApiError && error.status === 404) {
          lastGoodFrame.current = null;
          setState({
            dungeonId: null,
            layout: null,
            openDoorIds: NO_OPEN_DOORS,
            partyRoomId: null,
            status: "empty",
            error: null,
          });
          scheduleNext();
          return;
        }

        if (lastGoodFrame.current) {
          setState(lastGoodFrame.current);
          scheduleNext();
          return;
        }

        setState({
          dungeonId: null,
          layout: null,
          openDoorIds: NO_OPEN_DOORS,
          partyRoomId: null,
          status: "error",
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }

      scheduleNext();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (pollTimer !== null) {
          window.clearTimeout(pollTimer);
          pollTimer = null;
        }
        void poll();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    void poll();

    return () => {
      cancelled = true;
      if (pollTimer !== null) {
        window.clearTimeout(pollTimer);
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
      activeRequest?.abort();
    };
  }, []);

  return state;
}
