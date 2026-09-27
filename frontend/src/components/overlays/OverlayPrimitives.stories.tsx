import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ConfirmDialog } from "./ConfirmDialog";
import { Dialog, DialogClose } from "./Dialog";
import { Popover } from "./Popover";
import { PopoverRoot } from "./PopoverRoot";
import { PreviewCard } from "./PreviewCard";
import { ToastProvider } from "./Toast";
import { useToast } from "./toastManager";
import { Tooltip, TooltipProvider } from "./Tooltip";

const meta = {
  title: "Production/Design System/Overlays",
  tags: ["status-production"],
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const ConfirmDialogOpen: Story = {
  name: "Confirm dialog — destructive action",
  render: () => (
    <ConfirmDialog
      message="Delete the ancient red dragon?"
      confirmLabel="Delete dragon"
      onConfirm={fn()}
      onCancel={fn()}
    />
  ),
};

export const DialogCompound: Story = {
  name: "Dialog — compound API",
  render: () => (
    <Dialog
      defaultOpen
      title="Spell components"
      description="Review the details before continuing."
      footer={<button type="button">Save changes</button>}
    >
      <p>Verbal and somatic components are required.</p>
      <DialogClose>Close from spell details</DialogClose>
    </Dialog>
  ),
};

export const PopoverParts: Story = {
  name: "Popover — shared compound parts",
  render: () => (
    <PopoverRoot defaultOpen>
      <Popover.Trigger>Open spell notes</Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner>
          <Popover.Popup>
            <Popover.Title>Spell notes</Popover.Title>
            <Popover.Description>Components and duration are ready to review.</Popover.Description>
            <Popover.Close>Close</Popover.Close>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </PopoverRoot>
  ),
};

export const PreviewCardOpen: Story = {
  name: "Preview card — open reference preview",
  render: () => (
    <PreviewCard href="#fire-bolt" defaultOpen trigger="Fire Bolt">
      <h2>Fire Bolt</h2>
      <p>Evocation cantrip · 120 feet</p>
    </PreviewCard>
  ),
};

function ToastTrigger() {
  const toast = useToast();
  return (
    <button
      type="button"
      onClick={() => toast.add({ title: "Saved", description: "Your notes are ready." })}
    >
      Show saved notice
    </button>
  );
}

export const ToastNotification: Story = {
  name: "Toast — saved notice",
  render: () => <ToastProvider timeout={0}><ToastTrigger /></ToastProvider>,
};

export const TooltipHint: Story = {
  name: "Tooltip — keyboard-accessible hint",
  render: () => (
    <TooltipProvider>
      <Tooltip defaultOpen trigger="?" content="A short rule reminder." />
    </TooltipProvider>
  ),
};
