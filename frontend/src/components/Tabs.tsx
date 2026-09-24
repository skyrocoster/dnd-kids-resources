import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, KeyboardEvent, ReactNode } from "react";
import { Button } from "./Button";
import "./Tabs.css";
export interface TabDefinition {
  id: string;
  label: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}
export interface TabsProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  tabs: readonly TabDefinition[];
  defaultSelectedId?: string;
  selectedId?: string;
  onSelectedIdChange?: (selectedId: string) => void;
  ariaLabel?: string;
  tabListContainer?: HTMLElement | null;
  navigationClassName?: string;
}
const TOLERANCE = 1;
type ScrollState = { hasOverflow: boolean; canScrollStart: boolean; canScrollEnd: boolean };
const INITIAL: ScrollState = { hasOverflow: false, canScrollStart: false, canScrollEnd: false };
function initial(tabs: readonly TabDefinition[], id?: string) {
  return tabs.find((t) => t.id === id && !t.disabled)?.id ?? tabs.find((t) => !t.disabled)?.id;
}
function scrollState(el: HTMLDivElement, left = el.scrollLeft): ScrollState {
  const max = Math.max(0, el.scrollWidth - el.clientWidth),
    pos = Math.max(0, left);
  return {
    hasOverflow: max > TOLERANCE,
    canScrollStart: pos > TOLERANCE,
    canScrollEnd: pos < max - TOLERANCE,
  };
}
function domId(prefix: string, id: string, suffix: "tab" | "panel") {
  return `${prefix}-${encodeURIComponent(id)}-${suffix}`;
}
export function Tabs({
  tabs,
  defaultSelectedId,
  selectedId: selectedProp,
  onSelectedIdChange,
  ariaLabel = "Tabs",
  className,
  tabListContainer,
  navigationClassName,
  ...rest
}: TabsProps) {
  const [uncontrolled, setUncontrolled] = useState(() => initial(tabs, defaultSelectedId)),
    [overflow, setOverflow] = useState(INITIAL);
  const scrollRef = useRef<HTMLDivElement | null>(null),
    tabRefs = useRef(new Map<string, HTMLElement>()),
    idPrefix = `tabs-${useId().replaceAll(":", "")}`,
    enabled = useMemo(() => tabs.filter((t) => !t.disabled), [tabs]),
    requested = selectedProp ?? uncontrolled,
    lastRequested = useRef(requested),
    selectedDef = tabs.find((t) => t.id === requested && !t.disabled) ?? enabled[0],
    selected = selectedDef?.id,
    key = JSON.stringify(
      tabs.map((t) => [t.id, typeof t.label === "string" ? t.label : null, Boolean(t.disabled)]),
    );
  const setState = useCallback(
      (next: ScrollState) =>
        setOverflow((cur) =>
          cur.hasOverflow === next.hasOverflow &&
          cur.canScrollStart === next.canScrollStart &&
          cur.canScrollEnd === next.canScrollEnd
            ? cur
            : next,
        ),
      [],
    ),
    update = useCallback(() => {
      if (scrollRef.current) setState(scrollState(scrollRef.current));
    }, [setState]);
  const reveal = useCallback((id: string) => {
    const el = scrollRef.current,
      tab = tabRefs.current.get(id);
    if (!el || !tab) return;
    const a = el.getBoundingClientRect(),
      b = tab.getBoundingClientRect();
    if (b.left < a.left) el.scrollLeft -= a.left - b.left;
    else if (b.right > a.right) el.scrollLeft += b.right - a.right;
  }, []);
  const wheel = useCallback(
    (e: WheelEvent) => {
      const el = e.currentTarget;
      if (!(el instanceof HTMLDivElement)) return;
      const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : 0,
        max = Math.max(0, el.scrollWidth - el.clientWidth),
        target = Math.min(max, Math.max(0, el.scrollLeft + delta));
      if (!delta || target === el.scrollLeft) return;
      e.preventDefault();
      el.scrollLeft = target;
      setState(scrollState(el, target));
    },
    [setState],
  );
  useEffect(() => {
    if (selectedProp === undefined && uncontrolled !== selected) setUncontrolled(selected);
  }, [selected, selectedProp, uncontrolled]);
  useEffect(() => {
    lastRequested.current = requested;
  }, [requested]);
  useLayoutEffect(() => {
    for (const tab of tabs) {
      const el = tabRefs.current.get(tab.id);
      if (el instanceof HTMLButtonElement) el.disabled = Boolean(tab.disabled);
    }
  }, [tabs, key]);
  useEffect(() => {
    if (selected) reveal(selected);
  }, [reveal, selected]);
  useEffect(() => {
    update();
  }, [key, update]);
  useEffect(() => {
    const el = scrollRef.current,
      list = el?.firstElementChild;
    if (!el || !(list instanceof HTMLElement)) return;
    el.addEventListener("scroll", update, { passive: true });
    el.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("resize", update);
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    ro?.observe(el);
    ro?.observe(list);
    const mo = typeof MutationObserver === "undefined" ? null : new MutationObserver(update);
    mo?.observe(list, {
      attributeFilter: ["class", "disabled", "style"],
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });
    update();
    return () => {
      el.removeEventListener("scroll", update);
      el.removeEventListener("wheel", wheel);
      window.removeEventListener("resize", update);
      ro?.disconnect();
      mo?.disconnect();
    };
  }, [update, wheel]);
  const activate = useCallback(
    (id: string, focus = false) => {
      const tab = tabs.find((t) => t.id === id);
      if (!tab || tab.disabled) return;
      const current = lastRequested.current;
      if (selectedProp === undefined && current !== id) setUncontrolled(id);
      if (current !== id) {
        lastRequested.current = id;
        onSelectedIdChange?.(id);
      }
      if (focus) tabRefs.current.get(id)?.focus();
    },
    [onSelectedIdChange, selectedProp, tabs],
  );
  const keyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>, id: string) => {
      const i = enabled.findIndex((t) => t.id === id);
      if (i < 0) return;
      let n: number;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") n = (i + 1) % enabled.length;
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
        n = (i - 1 + enabled.length) % enabled.length;
      else if (e.key === "Home") n = 0;
      else if (e.key === "End") n = enabled.length - 1;
      else return;
      e.preventDefault();
      activate(enabled[n].id, true);
    },
    [activate, enabled],
  );
  const scroll = (direction: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const max = Math.max(0, el.scrollWidth - el.clientWidth),
      target = Math.min(
        max,
        Math.max(0, el.scrollLeft + direction * Math.max(el.clientWidth - 48, 1)),
      );
    if (target !== el.scrollLeft) {
      el.scrollLeft = target;
      setState(scrollState(el, target));
    }
  };
  const navigation = (
    <div
      className={["cmt-tabs__navigation", navigationClassName].filter(Boolean).join(" ")}
      data-overflow={overflow.hasOverflow ? "true" : "false"}
      data-testid="tabs-navigation"
    >
      {overflow.hasOverflow && (
        <Button
          className="cmt-tabs__scroll-button"
          type="button"
          aria-label="Scroll tabs left"
          disabled={!overflow.canScrollStart}
          onClick={() => scroll(-1)}
        >
          <ChevronLeft aria-hidden="true" focusable="false" />
        </Button>
      )}
      <div
        className="cmt-tabs__viewport"
        data-hidden-start={overflow.canScrollStart ? "true" : "false"}
        data-hidden-end={overflow.canScrollEnd ? "true" : "false"}
      >
        <div ref={scrollRef} className="cmt-tabs__scroll" data-testid="tabs-scroll">
          <BaseTabs.List
            className="cmt-tabs__list"
            aria-label={ariaLabel}
            aria-orientation="horizontal"
          >
            {tabs.map((tab) => {
              const tid = domId(idPrefix, tab.id, "tab"),
                pid = domId(idPrefix, tab.id, "panel");
              return (
                <BaseTabs.Tab
                  key={tab.id}
                  ref={(el) => {
                    if (el) tabRefs.current.set(tab.id, el);
                    else tabRefs.current.delete(tab.id);
                  }}
                  className="cmt-tabs__tab"
                  id={tid}
                  value={tab.id}
                  aria-controls={pid}
                  disabled={tab.disabled}
                  onKeyDown={(e) => keyDown(e, tab.id)}
                  onFocus={() => reveal(tab.id)}
                >
                  {tab.label}
                </BaseTabs.Tab>
              );
            })}
          </BaseTabs.List>
        </div>
      </div>
      {overflow.hasOverflow && (
        <Button
          className="cmt-tabs__scroll-button"
          type="button"
          aria-label="Scroll tabs right"
          disabled={!overflow.canScrollEnd}
          onClick={() => scroll(1)}
        >
          <ChevronRight aria-hidden="true" focusable="false" />
        </Button>
      )}
    </div>
  );
  return (
    <BaseTabs.Root
      {...rest}
      className={["cmt-tabs", className].filter(Boolean).join(" ")}
      data-testid="tabs"
      value={selected ?? null}
      onValueChange={(v) => {
        if (typeof v === "string") activate(v);
      }}
    >
      <span
        className="cmt-tabs__hidden"
        aria-live="polite"
        data-selection-status
        data-testid="tabs-selection-status"
      >
        Active tab: {selectedDef?.label ?? "None"}
      </span>
      {tabListContainer ? createPortal(navigation, tabListContainer) : navigation}
      <div className="cmt-tabs__panel-viewport">
        {tabs.map((tab) => {
          const tid = domId(idPrefix, tab.id, "tab"),
            pid = domId(idPrefix, tab.id, "panel");
          return (
            <BaseTabs.Panel
              key={tab.id}
              id={pid}
              className="cmt-tabs__panel"
              value={tab.id}
              keepMounted
              render={<section />}
              aria-labelledby={tid}
              tabIndex={0}
              data-tab-panel={tab.id}
              data-testid={`tabs-panel-${tab.id}`}
            >
              {tab.content}
            </BaseTabs.Panel>
          );
        })}
      </div>
    </BaseTabs.Root>
  );
}
