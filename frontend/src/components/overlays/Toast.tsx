import { Toast as Base } from "@base-ui/react/toast";
import type { ToastManagerAddOptions, ToastProviderProps as BaseProps } from "@base-ui/react/toast";
import type { ReactNode } from "react";
import "./OverlayPrimitives.css";
export interface ToastProviderProps extends Omit<BaseProps, "children"> {
  children: ReactNode;
  dismissLabel?: ReactNode;
}
export type ToastOptions<Data extends object = Record<string, unknown>> =
  ToastManagerAddOptions<Data>;
function Region({ dismissLabel }: { dismissLabel: ReactNode }) {
  const { toasts } = Base.useToastManager();
  return (
    <Base.Portal>
      <Base.Viewport className="overlay-toast-viewport">
        {toasts.map((toast) => (
          <Base.Root className="overlay-toast" key={toast.id} toast={toast}>
            <Base.Content className="overlay-toast-content">
              <div className="overlay-toast-text">
                <Base.Title className="overlay-toast-title" />
                <Base.Description className="overlay-toast-description" />
              </div>
              <div className="overlay-toast-actions">
                {toast.actionProps && (
                  <Base.Action {...toast.actionProps} className="overlay-toast-action" />
                )}
                <Base.Close className="overlay-toast-close">{dismissLabel}</Base.Close>
              </div>
            </Base.Content>
          </Base.Root>
        ))}
      </Base.Viewport>
    </Base.Portal>
  );
}
export function ToastProvider({
  children,
  dismissLabel = "Dismiss",
  ...props
}: ToastProviderProps) {
  return (
    <Base.Provider {...props}>
      {children}
      <Region dismissLabel={dismissLabel} />
    </Base.Provider>
  );
}
