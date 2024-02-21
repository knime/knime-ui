import {
  ToastServiceProvider,
  type Toast,
} from "webapps-common/ui/services/toast";

type RemoveBy = (callback: (toast: Toast) => boolean) => void;

let __toastsProviderSingleton:
  | (ToastServiceProvider & { removeBy: RemoveBy })
  | null = null;

export const getToastsProvider = (): ToastServiceProvider & {
  removeBy: RemoveBy;
} => {
  if (__toastsProviderSingleton) {
    return __toastsProviderSingleton;
  }

  __toastsProviderSingleton = new ToastServiceProvider();
  return __toastsProviderSingleton;
};
