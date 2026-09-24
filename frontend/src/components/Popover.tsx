import { Popover as BasePopover } from "@base-ui/react/popover";
import type { ComponentProps } from "react";

type BasePopoverRootProps = ComponentProps<typeof BasePopover.Root>;

export interface PopoverRootProps extends Omit<BasePopoverRootProps, "onOpenChange"> {
  /** Whether a pointer press outside the popup closes it. Defaults to true. */
  closeOnOutsidePress?: boolean;
  /** Whether Escape closes the popup. Defaults to true. */
  closeOnEscape?: boolean;
  onOpenChange?: BasePopoverRootProps["onOpenChange"];
}

function Root({
  closeOnOutsidePress = true,
  closeOnEscape = true,
  onOpenChange,
  ...props
}: PopoverRootProps) {
  return (
    <BasePopover.Root
      {...props}
      onOpenChange={(open, eventDetails) => {
        if (
          !open &&
          ((eventDetails.reason === "outside-press" && !closeOnOutsidePress) ||
            (eventDetails.reason === "escape-key" && !closeOnEscape))
        ) {
          eventDetails.cancel();
          return;
        }

        onOpenChange?.(open, eventDetails);
      }}
    />
  );
}

/**
 * Shared, non-modal anchored popover parts. Configure close focus on Popup with
 * Base UI's `finalFocus` prop when a consumer needs a specific focus policy.
 */
export const Popover = {
  Root,
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
