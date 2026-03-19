import { useKdsDynamicModal } from "@knime/kds-components";

import { getToastPresets } from "@/services/toastPresets";
import { useSpaceAuthStore } from "@/store/spaces/auth";
import { useSpaceProvidersStore } from "@/store/spaces/providers";

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
  const { askConfirmation, close } = useKdsDynamicModal();
  const spaceAuthStore = useSpaceAuthStore();
  const providersStore = useSpaceProvidersStore();

  const providerNameOrId = providersStore.spaceProviders[hubId]?.name ?? hubId;

  const { confirmed } = await askConfirmation({
    headline: title,
    message,
    buttons: [
      { type: "cancel", label: "Not now" },
      {
        type: "confirm",
        label: `Log in to ${providerNameOrId}`,
      },
    ],
  });

  if (confirmed) {
    try {
      await spaceAuthStore.connectProvider({ spaceProviderId: hubId });
      return HubLoginAction.LOGIN;
    } catch (error: unknown) {
      consola.error("useHubLoginDialog:: Hub login failed", {
        hubId,
        provider: providerNameOrId,
        error,
      });
      close();

      getToastPresets().toastPresets.spaces.auth.connectFailed({
        error,
        providerName: providerNameOrId,
      });
      return HubLoginAction.ERROR;
    }
  }

  return HubLoginAction.CANCEL;
};
