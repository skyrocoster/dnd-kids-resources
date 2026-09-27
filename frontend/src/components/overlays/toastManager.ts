import { Toast as Base } from "@base-ui/react/toast";
import type { ToastManager, UseToastManagerReturnValue } from "@base-ui/react/toast";

export function useToast<
  Data extends object = Record<string, unknown>,
>(): UseToastManagerReturnValue<Data> {
  return Base.useToastManager<Data>();
}

export function createToastManager<
  Data extends object = Record<string, unknown>,
>(): ToastManager<Data> {
  return Base.createToastManager<Data>();
}
