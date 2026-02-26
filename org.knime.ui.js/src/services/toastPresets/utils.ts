import type { ToastServiceProvider } from "@knime/components";

export const removeAllToastsByIds = (
  $toast: ToastServiceProvider,
  toastIds: Set<string>,
) => {
  toastIds.forEach((toastId: string) => {
    $toast.remove(toastId);
  });
};
