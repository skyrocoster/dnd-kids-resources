import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Popover } from "../Popover";

function PopoverPanel({
  closeOnOutsidePress,
  closeOnEscape,
}: {
  closeOnOutsidePress?: boolean;
  closeOnEscape?: boolean;
}) {
  return (
    <>
      <div>Outside area</div>
      <Popover.Root
        defaultOpen
        closeOnOutsidePress={closeOnOutsidePress}
        closeOnEscape={closeOnEscape}
      >
        <Popover.Trigger>Toggle panel</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner side="bottom" align="start">
            <Popover.Popup>
              <button type="button">Panel action</button>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </>
  );
}

describe("Popover", () => {
  it("opens an anchored popup from an uncontrolled trigger", async () => {
    const user = userEvent.setup();
    render(
      <Popover.Root>
        <Popover.Trigger>Toggle panel</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner side="bottom" align="start">
            <Popover.Popup>Panel content</Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>,
    );

    const trigger = screen.getByRole("button", { name: "Toggle panel" });
    await user.click(trigger);

    const popup = screen.getByText("Panel content");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute("aria-controls", popup.closest("[id]")?.id);
    expect(popup.closest("[data-side]")).toHaveAttribute("data-side", "bottom");
  });

  it("supports controlled open state", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <Popover.Root open={false} onOpenChange={onOpenChange}>
        <Popover.Trigger>Toggle panel</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup>Panel content</Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>,
    );

    await user.click(screen.getByRole("button", { name: "Toggle panel" }));
    expect(onOpenChange).toHaveBeenCalledWith(
      true,
      expect.objectContaining({ reason: "trigger-press" }),
    );
    expect(screen.queryByText("Panel content")).not.toBeInTheDocument();

    rerender(
      <Popover.Root open onOpenChange={onOpenChange}>
        <Popover.Trigger>Toggle panel</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup>Panel content</Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>,
    );
    expect(screen.getByText("Panel content")).toBeInTheDocument();
  });

  it("lets consumers block outside-press dismissal while allowing Escape", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <>
        <div>Outside area</div>
        <Popover.Root defaultOpen closeOnOutsidePress={false} onOpenChange={onOpenChange}>
          <Popover.Trigger>Toggle panel</Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner>
              <Popover.Popup>
                <button type="button">Panel action</button>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      </>,
    );

    await user.click(screen.getByText("Outside area"));
    expect(screen.getByRole("button", { name: "Panel action" })).toBeVisible();
    expect(onOpenChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Panel action" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("button", { name: "Panel action" })).not.toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledWith(
      false,
      expect.objectContaining({ reason: "escape-key" }),
    );
  });

  it("lets consumers block Escape dismissal", async () => {
    const user = userEvent.setup();
    render(<PopoverPanel closeOnEscape={false} />);

    await user.click(screen.getByRole("button", { name: "Panel action" }));
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Panel action" })).toBeVisible();
  });

  it("can return focus on Escape without stealing it after an outside pointer press", async () => {
    const user = userEvent.setup();

    function FocusPolicyPopover() {
      const triggerRef = useRef<HTMLButtonElement>(null);
      return (
        <>
          <button type="button">Outside action</button>
          <Popover.Root>
            <Popover.Trigger ref={triggerRef}>Toggle panel</Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner>
                <Popover.Popup
                  finalFocus={(closeType) => (closeType === "keyboard" ? triggerRef : false)}
                >
                  <button type="button">Panel action</button>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        </>
      );
    }

    const { rerender } = render(<FocusPolicyPopover />);
    const trigger = screen.getByRole("button", { name: "Toggle panel" });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Panel action" }));
    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();

    rerender(<FocusPolicyPopover />);
    await user.click(trigger);
    const outsideAction = screen.getByRole("button", { name: "Outside action" });
    await user.click(outsideAction);
    expect(outsideAction).toHaveFocus();
  });
});
