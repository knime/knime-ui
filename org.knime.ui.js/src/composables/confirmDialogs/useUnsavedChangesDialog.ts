import {
  type UseKdsConfirmDialogPropertyBasedConfig,
  useKdsConfirmDialog,
} from "@knime/kds-components";

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
  config: Pick<
    UseKdsConfirmDialogPropertyBasedConfig,
    "title" | "message" | "doNotAskAgain"
  >,
): Promise<UnsavedChangesDialogResult> => {
  const { show: showConfirmDialog } = useKdsConfirmDialog();

  let shouldDiscard = false;

  const { confirmed, doNotAskAgain } = await showConfirmDialog({
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
