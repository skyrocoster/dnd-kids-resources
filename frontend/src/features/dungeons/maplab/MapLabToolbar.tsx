import type { ReactNode } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "../../../components/icons";
import { Disclosure } from "../../../components/Disclosure";
import { useToolbarTrayCollapse } from "./mapLabToolbarState";

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
  groupKey: string;
  label: string;
  extraClassName?: string;
  children: ReactNode;
}) {
  const { collapsed, toggle } = useToolbarTrayCollapse(groupKey);
  const ChevronIcon = collapsed ? ChevronDownIcon : ChevronUpIcon;
  return (
    <Disclosure
      className={`maplab-toolbar-group maplab-toolbar-tray${extraClassName ? ` ${extraClassName}` : ""}`}
      open={!collapsed}
      onOpenChange={() => toggle()}
      data-collapsed={collapsed || undefined}
      summary={
        <>
          <span aria-hidden="true" className="maplab-toolbar-group-label">
            {label}
          </span>
          <span className="visually-hidden">{`${collapsed ? "Expand" : "Collapse"} ${label} tools`}</span>
          <span className="maplab-toolbar-tray-chevron">
            <ChevronIcon width={14} height={14} aria-hidden="true" />
          </span>
        </>
      }
    >
      <div className="maplab-toolbar-tray-controls">{children}</div>
    </Disclosure>
  );
}
