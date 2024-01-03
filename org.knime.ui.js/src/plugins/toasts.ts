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

  const baseProvider = new ToastServiceProvider();

  __toastsProviderSingleton = {
    ...baseProvider,

    removeBy(callback: (toast: Toast) => boolean) {
      this.toasts.value = this.toasts.value.filter((t) => !callback(t));
    },
  };

  return __toastsProviderSingleton;
};
