import { API } from "@api";

import {
  UnsavedChangesAction,
  useUnsavedChangesDialog,
} from "@/composables/useConfirmDialog/useUnsavedChangesDialog";
import { useApplicationStore } from "@/store/application/application";

import type { PageBuilderControl } from "./compositeView";

export const showPageBuilderUnsavedChangesDialog = async (
  activePageBuilder: PageBuilderControl,
): Promise<boolean> => {
  const askToConfirm = useApplicationStore().askToConfirmNodeConfigChanges;

  if (!askToConfirm) {
    await activePageBuilder.updateAndReexecute();
    return true;
  }

  const { action, doNotAskAgain } = await useUnsavedChangesDialog({
    title: "Unsaved composite view changes",
    message:
      "You have unsaved changes in your composite view. Do you want to save them and re-execute the component?",
    doNotAskAgainText:
      "Always save and do not ask again. <br/> (You can still change this in the preferences)",
  });

  if (doNotAskAgain && askToConfirm) {
    await API.desktop.setConfirmNodeConfigChangesPreference(false);
  }

  if (action === UnsavedChangesAction.DISCARD) {
    return true;
  }

  if (action === UnsavedChangesAction.SAVE) {
    await activePageBuilder.updateAndReexecute();
    return true;
  }

  return false;
};
