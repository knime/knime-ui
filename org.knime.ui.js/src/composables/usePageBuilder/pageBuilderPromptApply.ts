import { API } from "@api";

import { useConfirmDialog } from "@/composables/useConfirmDialog";
import type { PageBuilderControl } from "@/composables/usePageBuilder/usePageBuilder";
import { useApplicationStore } from "@/store/application/application";

const { show } = useConfirmDialog();

export const promptConfirmationAndApply = async (
  activePageBuilder: PageBuilderControl,
): Promise<boolean> => {
  let discardChanges = false;

  const prompt = () =>
    show({
      title: "Unsaved composite view changes",
      message:
        "You have unsaved changes in your composite view. Do you want to apply them and re-execute the component?",
      doNotAskAgainText:
        "Always apply and do not ask again. <br/> (You can still change this in the preferences)",

      buttons: [
        {
          type: "cancel",
          label: "Cancel",
        },
        {
          type: "cancel",
          label: "Discard",
          flushRight: true,
          customHandler: ({ cancel }) => {
            discardChanges = true;
            cancel();
          },
        },
        {
          type: "confirm",
          label: "Apply",
          flushRight: false,
        },
      ],
    });

  const askToConfirm = useApplicationStore().askToConfirmNodeConfigChanges;

  const { confirmed, doNotAskAgain } = askToConfirm
    ? await prompt()
    : { confirmed: true, doNotAskAgain: true };

  if (doNotAskAgain && askToConfirm) {
    await API.desktop.setConfirmNodeConfigChangesPreference(false);
  }

  if (discardChanges) {
    return true;
  }

  if (confirmed) {
    await activePageBuilder.updateAndReexecute();
    return true;
  }

  return false;
};
