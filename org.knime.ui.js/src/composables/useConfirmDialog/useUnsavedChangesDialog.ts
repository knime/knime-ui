import { type PropertyBasedConfig, useConfirmDialog } from ".";

export enum UnsavedChangesAction {
  SAVE = "save",
  DISCARD = "discard",
  CANCEL = "cancel",
}

interface UnsavedChangesDialogResult {
  action: UnsavedChangesAction;
  doNotAskAgain?: boolean;
}

export const useUnsavedChangesDialog = async (
  config: Pick<PropertyBasedConfig, "title" | "message" | "doNotAskAgainText">,
): Promise<UnsavedChangesDialogResult> => {
  const { show: showConfirmDialog } = useConfirmDialog();

  let shouldDiscard = false;

  const { confirmed, doNotAskAgain } = await showConfirmDialog({
    ...config,
    focusButton: 0,
    buttons: [
      { type: "cancel", label: "Cancel" },
      {
        type: "cancel",
        label: "Discard changes",
        flushRight: true,
        customHandler: ({ cancel }) => {
          shouldDiscard = true;
          cancel();
        },
      },
      { type: "confirm", label: "Save changes", flushRight: true },
    ],
  });

  if (shouldDiscard) {
    return { action: UnsavedChangesAction.DISCARD, doNotAskAgain };
  }

  return {
    action: confirmed ? UnsavedChangesAction.SAVE : UnsavedChangesAction.CANCEL,
    doNotAskAgain,
  };
};
