import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { MenuItemContent } from "./MenuItemContent";
import type { MenuItemDefinition } from "./menuTypes";
import "./menus.css";

export interface ContextMenuProps extends Omit<
  ComponentPropsWithoutRef<"div">,
  "children" | "onChange"
> {
  children: ReactNode;
  items: readonly MenuItemDefinition[];
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  popupClassName?: string;
}

/** Right-click and long-press menu for any consumer-owned region. */
export function ContextMenu({
  children,
  items,
  open,
  defaultOpen,
  onOpenChange,
  disabled,
  popupClassName,
  className,
  ...triggerProps
}: ContextMenuProps) {
  return (
    <BaseContextMenu.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={(nextOpen) => onOpenChange?.(nextOpen)}
      disabled={disabled}
    >
      <BaseContextMenu.Trigger
        {...triggerProps}
        className={["ds-context-trigger", className].filter(Boolean).join(" ")}
      >
        {children}
      </BaseContextMenu.Trigger>
      <BaseContextMenu.Portal>
        <BaseContextMenu.Positioner className="ds-menu-positioner" sideOffset={4}>
          <BaseContextMenu.Popup
            className={["ds-menu-popup", popupClassName].filter(Boolean).join(" ")}
          >
            {items.map((item) => {
              if ("separator" in item) {
                return <BaseContextMenu.Separator className="ds-menu-separator" key={item.id} />;
              }

              if (item.href) {
                return (
                  <BaseContextMenu.LinkItem
                    className="ds-menu-item"
                    href={item.href}
                    target={item.target}
                    label={item.textValue}
                    closeOnClick={item.closeOnSelect}
                    key={item.id}
                  >
                    <MenuItemContent item={item} />
                  </BaseContextMenu.LinkItem>
                );
              }

              return (
                <BaseContextMenu.Item
                  className="ds-menu-item"
                  disabled={item.disabled}
                  label={item.textValue}
                  closeOnClick={item.closeOnSelect}
                  onClick={() => item.onSelect?.()}
                  key={item.id}
                >
                  <MenuItemContent item={item} />
                </BaseContextMenu.Item>
              );
            })}
          </BaseContextMenu.Popup>
        </BaseContextMenu.Positioner>
      </BaseContextMenu.Portal>
    </BaseContextMenu.Root>
  );
}
