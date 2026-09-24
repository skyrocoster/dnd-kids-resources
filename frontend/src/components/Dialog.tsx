import { useId } from "react";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import "./Dialog.css";
import "./OverlayPrimitives.css";

interface LegacyDialogProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  pending?: boolean;
  role?: "dialog" | "alertdialog";
  className?: string;
}

export interface CompoundDialogProps {
  trigger?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  closeLabel?: ReactNode | null;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean | "trap-focus";
  disablePointerDismissal?: boolean;
  triggerProps?: Omit<ComponentPropsWithoutRef<"button">, "children">;
  popupClassName?: string;
}
export type DialogProps = LegacyDialogProps | CompoundDialogProps;
export type DialogCloseProps = ComponentPropsWithoutRef<"button">;
export function DialogClose({ className, type = "button", ...props }: DialogCloseProps) {
  return (
    <BaseDialog.Close
      {...props}
      type={type}
      className={["overlay-dialog-close", className].filter(Boolean).join(" ")}
    />
  );
}
export function Dialog(props: DialogProps) {
  if ("onClose" in props) return <LegacyDialog {...(props as LegacyDialogProps)} />;
  return <CompoundDialog {...(props as CompoundDialogProps)} />;
}
function CompoundDialog({
  trigger,
  title,
  description,
  children,
  footer,
  closeLabel = "Close",
  open,
  defaultOpen,
  onOpenChange,
  modal,
  disablePointerDismissal,
  triggerProps,
  popupClassName,
}: CompoundDialogProps) {
  return (
    <BaseDialog.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      modal={modal}
      disablePointerDismissal={disablePointerDismissal}
    >
      {trigger && (
        <BaseDialog.Trigger
          {...triggerProps}
          className={["overlay-dialog-trigger", triggerProps?.className].filter(Boolean).join(" ")}
        >
          {trigger}
        </BaseDialog.Trigger>
      )}
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="overlay-dialog-backdrop" />
        <BaseDialog.Viewport className="overlay-dialog-viewport">
          <BaseDialog.Popup
            className={["overlay-dialog-popup", popupClassName].filter(Boolean).join(" ")}
          >
            <BaseDialog.Title className="overlay-dialog-title">{title}</BaseDialog.Title>
            {description && (
              <BaseDialog.Description className="overlay-dialog-description">
                {description}
              </BaseDialog.Description>
            )}
            <div>{children}</div>
            {(footer || closeLabel) && (
              <div className="overlay-dialog-footer">
                {footer}
                {closeLabel && <DialogClose>{closeLabel}</DialogClose>}
              </div>
            )}
          </BaseDialog.Popup>
        </BaseDialog.Viewport>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
function LegacyDialog({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  pending = false,
  role = "dialog",
  className,
}: LegacyDialogProps) {
  const titleId = useId();
  const descId = useId();

  return (
    <BaseDialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !pending) onClose();
      }}
    >
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="dialog-backdrop" />
        <BaseDialog.Viewport className="dialog-viewport">
          <BaseDialog.Popup
            className={className ? `dialog ${className}` : "dialog"}
            role={role}
            aria-modal="true"
            aria-busy={pending || undefined}
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
          >
            <header className="dialog-header">
              <BaseDialog.Title id={titleId} className="dialog-title">
                {title}
              </BaseDialog.Title>
              {description && (
                <BaseDialog.Description id={descId} className="dialog-description">
                  {description}
                </BaseDialog.Description>
              )}
            </header>
            <fieldset className="dialog-fieldset" disabled={pending} inert={pending}>
              {children && <div className="dialog-body">{children}</div>}
              {footer && <footer className="dialog-footer">{footer}</footer>}
            </fieldset>
          </BaseDialog.Popup>
        </BaseDialog.Viewport>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
