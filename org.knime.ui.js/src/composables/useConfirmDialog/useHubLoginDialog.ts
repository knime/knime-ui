import { useHubAuth } from "@/components/kai/useHubAuth";

import { useConfirmDialog } from ".";

export enum HubLoginAction {
  LOGIN = "login",
  CANCEL = "cancel",
}

export const useHubLoginDialog = async ({
  title,
  message,
}: {
  title: string;
  message: string;
}): Promise<HubLoginAction> => {
  const { show: showConfirmDialog } = useConfirmDialog();
  const { authenticateWithHub, hubID } = useHubAuth();

  const { confirmed } = await showConfirmDialog({
    title,
    message,
    buttons: [
      { type: "cancel", label: "Not now" },
      {
        type: "confirm",
        label: `Log in to ${hubID.value}`,
        flushRight: true,
        customHandler: ({ confirm }) => {
          confirm();
        },
      },
    ],
  });

  if (confirmed) {
    await authenticateWithHub();
    return HubLoginAction.LOGIN;
  }

  return HubLoginAction.CANCEL;
};
