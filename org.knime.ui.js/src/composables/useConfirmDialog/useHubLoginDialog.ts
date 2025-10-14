import { useSpaceAuthStore } from "@/store/spaces/auth";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { getToastPresets } from "@/toastPresets";

import { useConfirmDialog } from ".";

export enum HubLoginAction {
  LOGIN = "login",
  CANCEL = "cancel",
  ERROR = "error",
}

export const useHubLoginDialog = async ({
  title,
  message,
  hubId,
}: {
  title: string;
  message: string;
  hubId: string;
}): Promise<HubLoginAction> => {
  const { show: showConfirmDialog, cancel } = useConfirmDialog();
  const spaceAuthStore = useSpaceAuthStore();
  const providersStore = useSpaceProvidersStore();

  const providerNameOrId = providersStore.spaceProviders[hubId]?.name ?? hubId;

  const { confirmed } = await showConfirmDialog({
    title,
    message,
    buttons: [
      { type: "cancel", label: "Not now" },
      {
        type: "confirm",
        label: `Log in to ${providerNameOrId}`,
        flushRight: true,
      },
    ],
  });

  if (confirmed) {
    try {
      await spaceAuthStore.connectProvider({ spaceProviderId: hubId });
      return HubLoginAction.LOGIN;
    } catch (error: unknown) {
      cancel();

      getToastPresets().toastPresets.spaces.auth.connectFailed({
        error,
        providerName: providerNameOrId,
      });
      return HubLoginAction.ERROR;
    }
  }

  return HubLoginAction.CANCEL;
};
