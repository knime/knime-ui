import { API } from "@api";

import {
  UnsavedChangesAction,
  useUnsavedChangesDialog,
} from "@/composables/useConfirmDialog/useUnsavedChangesDialog";
import { useApplicationStore } from "@/store/application/application";

import type { PageBuilderApi } from "./compositeView";

export const showPageBuilderUnsavedChangesDialog = async (
  activePageBuilder: PageBuilderApi,
): Promise<boolean> => {
  const askToConfirm = useApplicationStore().askToConfirmNodeConfigChanges;

  if (!askToConfirm) {
    await activePageBuilder.applyAndExecute();
    return true;
  }

  const { action, doNotAskAgain } = await useUnsavedChangesDialog({
    title: "Unsaved composite view changes",
    message:
      "You have unsaved changes in your composite view. Do you want to save them and re-execute the component?",
    doNotAskAgain: {
      label: "Always save and do not ask again.",
      helperText: "(You can still change this in the preferences)",
    },
  });

  if (doNotAskAgain && askToConfirm) {
    await API.desktop.setConfirmNodeConfigChangesPreference(false);
  }

  if (action === UnsavedChangesAction.DISCARD) {
    return true;
  }

  if (action === UnsavedChangesAction.SAVE) {
    await activePageBuilder.applyAndExecute();
    return true;
  }

  return false;
};
