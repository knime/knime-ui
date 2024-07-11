import { ToastServiceProvider } from "@knime/components";

let __toastsProviderSingleton: ToastServiceProvider | null = null;

export const getToastsProvider = () => {
  if (__toastsProviderSingleton) {
    return __toastsProviderSingleton;
  }

  __toastsProviderSingleton = new ToastServiceProvider();
  return __toastsProviderSingleton;
};
