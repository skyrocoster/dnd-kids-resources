import { Popover as BasePopover } from "@base-ui/react/popover";
import { PopoverRoot } from "./PopoverRoot";

/**
 * Shared, non-modal anchored popover parts. Configure close focus on Popup with
 * Base UI's `finalFocus` prop when a consumer needs a specific focus policy.
 */
export const Popover = {
  Root: PopoverRoot,
  Trigger: BasePopover.Trigger,
  Portal: BasePopover.Portal,
  Positioner: BasePopover.Positioner,
  Popup: BasePopover.Popup,
  Arrow: BasePopover.Arrow,
  Backdrop: BasePopover.Backdrop,
  Title: BasePopover.Title,
  Description: BasePopover.Description,
  Close: BasePopover.Close,
  Viewport: BasePopover.Viewport,
};
