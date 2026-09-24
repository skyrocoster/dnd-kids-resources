import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from "react";
import { IconButton } from "./IconButton";
import { NavCollapseIcon, NavExpandIcon } from "./icons";
import "./SplitPane.css";

interface SplitPaneProps {
  left: ReactNode;
  right: ReactNode;
  defaultLeftWidth?: number;
  minLeftWidth?: number;
  maxLeftWidth?: number;
  leftLabel?: string;
  collapsible?: boolean;
  storageKey?: string;
}

const STEP = 16;
const MOBILE_QUERY = "(max-width: 768px)";
const DEFAULT_STORAGE_KEY = "dnd-kids-browser-rail";

interface SplitPanePreference {
  collapsed: boolean;
  leftWidth: number;
}

function readStoredPreference(storageKey: string): Partial<SplitPanePreference> {
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return {};
    const parsed = JSON.parse(stored) as Partial<SplitPanePreference>;
    return {
      collapsed: parsed.collapsed === true,
      leftWidth: typeof parsed.leftWidth === "number" ? parsed.leftWidth : undefined,
    };
  } catch {
    return {};
  }
}

function writeStoredPreference(storageKey: string, preference: SplitPanePreference) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(preference));
  } catch {
    // localStorage unavailable (e.g. private mode) - collapse state just won't persist
  }
}

export function SplitPane({
  left,
  right,
  defaultLeftWidth = 280,
  minLeftWidth = 180,
  maxLeftWidth = 520,
  leftLabel = "panel",
  collapsible = false,
  storageKey = DEFAULT_STORAGE_KEY,
}: SplitPaneProps) {
  const clamp = useCallback(
    (value: number) => Math.min(maxLeftWidth, Math.max(minLeftWidth, value)),
    [maxLeftWidth, minLeftWidth],
  );
  const [storedPreference] = useState(() => (collapsible ? readStoredPreference(storageKey) : {}));
  const [leftWidth, setLeftWidth] = useState(() =>
    clamp(storedPreference.leftWidth ?? defaultLeftWidth),
  );
  const [collapsed, setCollapsed] = useState(
    () => collapsible && storedPreference.collapsed === true,
  );
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const collapseButtonRef = useRef<HTMLButtonElement>(null);
  const restoreButtonRef = useRef<HTMLButtonElement>(null);
  const focusAfterToggleRef = useRef<"collapse" | "restore" | null>(null);
  const separatorId = useId();
  const effectiveCollapsed = collapsible && collapsed && !isMobile;

  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia(MOBILE_QUERY);
    const syncMobile = () => setIsMobile(media.matches);
    syncMobile();
    media.addEventListener("change", syncMobile);
    return () => media.removeEventListener("change", syncMobile);
  }, []);

  useEffect(() => {
    const focusTarget = focusAfterToggleRef.current;
    if (!focusTarget) return;
    focusAfterToggleRef.current = null;
    if (focusTarget === "restore") {
      restoreButtonRef.current?.focus();
    } else {
      collapseButtonRef.current?.focus();
    }
  }, [effectiveCollapsed]);

  const persistPreference = useCallback(
    (next: SplitPanePreference) => writeStoredPreference(storageKey, next),
    [storageKey],
  );

  const setPersistedLeftWidth = useCallback(
    (nextWidth: number | ((previous: number) => number)) => {
      setLeftWidth((previous) => {
        const width = clamp(typeof nextWidth === "function" ? nextWidth(previous) : nextWidth);
        if (collapsible) persistPreference({ collapsed, leftWidth: width });
        return width;
      });
    },
    [clamp, collapsed, collapsible, persistPreference],
  );

  const setPersistedCollapsed = useCallback(
    (nextCollapsed: boolean) => {
      setCollapsed(nextCollapsed);
      persistPreference({ collapsed: nextCollapsed, leftWidth });
    },
    [leftWidth, persistPreference],
  );

  const handlePointerMove = useCallback(
    (event: globalThis.PointerEvent) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setPersistedLeftWidth(event.clientX - rect.left);
    },
    [setPersistedLeftWidth],
  );

  const stopDragging = useCallback(() => {
    draggingRef.current = false;
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", stopDragging);
  }, [handlePointerMove]);

  const startDragging = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    draggingRef.current = true;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setPersistedLeftWidth((w) => w - STEP);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setPersistedLeftWidth((w) => w + STEP);
    } else if (event.key === "Home") {
      event.preventDefault();
      setPersistedLeftWidth(minLeftWidth);
    } else if (event.key === "End") {
      event.preventDefault();
      setPersistedLeftWidth(maxLeftWidth);
    }
  };

  const collapseRail = () => {
    focusAfterToggleRef.current = "restore";
    setPersistedCollapsed(true);
  };

  const restoreRail = () => {
    focusAfterToggleRef.current = "collapse";
    setPersistedCollapsed(false);
  };

  return (
    <div
      className={`split-pane ${effectiveCollapsed ? "split-pane--collapsed" : ""}`}
      ref={containerRef}
      style={{ "--split-pane-left-width": `${leftWidth}px` } as CSSProperties}
    >
      <div className="split-pane-left" id={separatorId}>
        {collapsible && (
          <div className="split-pane-rail-action">
            <IconButton
              ref={collapseButtonRef}
              label={`Collapse ${leftLabel}`}
              className="split-pane-rail-button"
              title={`Collapse ${leftLabel}`}
              aria-expanded={!effectiveCollapsed}
              aria-controls={separatorId}
              onClick={collapseRail}
            >
              <NavCollapseIcon size={20} aria-hidden="true" />
            </IconButton>
          </div>
        )}
        <div className="split-pane-left-content">{left}</div>
      </div>
      {effectiveCollapsed ? (
        <div className="split-pane-restore">
          <IconButton
            ref={restoreButtonRef}
            label={`Restore ${leftLabel}`}
            className="split-pane-rail-button"
            title={`Restore ${leftLabel}`}
            aria-expanded={false}
            aria-controls={separatorId}
            onClick={restoreRail}
          >
            <NavExpandIcon size={20} aria-hidden="true" />
          </IconButton>
        </div>
      ) : (
        <div
          className="split-pane-handle"
          role="separator"
          aria-orientation="vertical"
          aria-label={`Resize ${leftLabel}`}
          aria-controls={separatorId}
          aria-valuenow={leftWidth}
          aria-valuemin={minLeftWidth}
          aria-valuemax={maxLeftWidth}
          tabIndex={0}
          onPointerDown={startDragging}
          onKeyDown={handleKeyDown}
        />
      )}
      <div className="split-pane-right">{right}</div>
    </div>
  );
}
