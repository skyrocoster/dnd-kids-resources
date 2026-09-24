import { Menubar as Base } from "@base-ui/react/menubar";
import type { ComponentPropsWithoutRef } from "react";
import { Menu } from "./Menu";
import type { MenubarDefinition } from "./menuTypes";
import "./menus.css";
export interface MenubarProps extends ComponentPropsWithoutRef<"div"> {
  menus: readonly MenubarDefinition[];
  disabled?: boolean;
  modal?: boolean;
  orientation?: "horizontal" | "vertical";
  loopFocus?: boolean;
}
export function Menubar({
  menus,
  disabled,
  modal,
  orientation = "horizontal",
  loopFocus,
  className,
  ...rest
}: MenubarProps) {
  return (
    <Base
      {...rest}
      className={["ds-menubar", className].filter(Boolean).join(" ")}
      disabled={disabled}
      modal={modal}
      orientation={orientation}
      loopFocus={loopFocus}
    >
      {menus.map((menu) => (
        <Menu
          key={menu.id}
          trigger={menu.label}
          items={menu.items}
          disabled={menu.disabled}
          triggerClassName="ds-menubar-trigger"
          positionerProps={{ sideOffset: 4 }}
        />
      ))}
    </Base>
  );
}
