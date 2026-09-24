import type { MenuItemDefinition } from "./menuTypes";
type Item = Exclude<MenuItemDefinition, { separator: true }>;
export function MenuItemContent({ item }: { item: Item }) {
  return (
    <>
      <span className="ds-menu-icon">{item.icon}</span>
      <span className="ds-menu-label">{item.label}</span>
      {item.shortcut && <span className="ds-menu-shortcut">{item.shortcut}</span>}
    </>
  );
}
