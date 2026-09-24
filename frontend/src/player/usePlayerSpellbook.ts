import { useEffect, useRef, useState } from "react";

import { getPlayerSpellbook } from "../api/client";

export const PLAYER_SPELLBOOK_POLL_INTERVAL_MS = 5_000;

export type PlayerSpellbookStatus = "loading" | "ready" | "empty" | "error";
export type PlayerSpellbookCharacter = Awaited<ReturnType<typeof getPlayerSpellbook>>[number];

export interface PlayerSpellbook {
  characters: PlayerSpellbookCharacter[];
  status: PlayerSpellbookStatus;
  error: Error | null;
}

const INITIAL_STATE: PlayerSpellbook = {
  characters: [],
  status: "loading",
  error: null,
};

export function usePlayerSpellbook(): PlayerSpellbook {
  const [state, setState] = useState<PlayerSpellbook>(INITIAL_STATE);
  const lastGoodFrame = useRef<PlayerSpellbook | null>(null);

  useEffect(() => {
    let cancelled = false;
    let activeRequest: AbortController | null = null;
    let pollTimer: number | null = null;

    const scheduleNext = () => {
      if (cancelled) return;
      pollTimer = window.setTimeout(() => void poll(), PLAYER_SPELLBOOK_POLL_INTERVAL_MS);
    };

    const poll = async () => {
      activeRequest?.abort();
      const request = new AbortController();
      activeRequest = request;

      try {
        const characters = await getPlayerSpellbook(request.signal);
        if (cancelled || request.signal.aborted) return;

        const frame: PlayerSpellbook = {
          characters,
          status: characters.length === 0 ? "empty" : "ready",
          error: null,
        };
        lastGoodFrame.current = frame;
        setState(frame);
      } catch (error: unknown) {
        if (cancelled || request.signal.aborted) return;

        if (lastGoodFrame.current) {
          setState(lastGoodFrame.current);
          scheduleNext();
          return;
        }

        setState({
          characters: [],
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
