import { ToastServiceProvider } from "webapps-common/ui/services/toast";

let __toastsProviderSingleton: ToastServiceProvider | null = null;

export const getToastsProvider = () => {
  if (__toastsProviderSingleton) {
    return __toastsProviderSingleton;
  }

  __toastsProviderSingleton = new ToastServiceProvider();
  return __toastsProviderSingleton;
};
