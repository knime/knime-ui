import { useKdsDynamicModal } from "@knime/kds-components";

export enum UnsavedChangesAction {
  SAVE = "save",
  DISCARD = "discard",
  CANCEL = "cancel",
}

interface UnsavedChangesDialogResult {
  action: UnsavedChangesAction;
  doNotAskAgain?: boolean;
}

export const useUnsavedChangesDialog = async (config: {
  title: string;
  message: string;
  doNotAskAgain?: {
    label: string;
    subText?: string;
  };
}): Promise<UnsavedChangesDialogResult> => {
  const { askConfirmation } = useKdsDynamicModal();

  let shouldDiscard = false;

  const { confirmed, doNotAskAgain } = await askConfirmation({
    ...config,
    buttons: [
      { type: "cancel", label: "Cancel", flushLeft: true, autofocus: true },
      {
        type: "cancel",
        label: "Discard changes",
        variant: "outlined",
        customHandler: ({ cancel }) => {
          shouldDiscard = true;
          cancel();
        },
      },
      { type: "confirm", label: "Save changes" },
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
