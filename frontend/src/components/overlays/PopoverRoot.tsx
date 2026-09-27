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

export function PopoverRoot({
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
