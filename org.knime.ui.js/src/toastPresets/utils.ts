import type { ToastServiceProvider } from "@knime/components";

export const removeAllToastsByPrefix = (
  $toast: ToastServiceProvider,
  prefix: string,
) => {
  $toast.removeBy((toast) => (toast.id ?? "").startsWith(prefix));
};
