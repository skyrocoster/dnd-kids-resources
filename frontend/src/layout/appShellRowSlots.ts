import { createContext, useContext } from "react";

export type AppShellRowSlots = {
  identitySlot: HTMLElement | null;
  tabsSlot: HTMLElement | null;
};

export const AppShellRowSlotsContext = createContext<AppShellRowSlots>({
  identitySlot: null,
  tabsSlot: null,
});

export function useAppShellRowSlots(): AppShellRowSlots {
  return useContext(AppShellRowSlotsContext);
}
