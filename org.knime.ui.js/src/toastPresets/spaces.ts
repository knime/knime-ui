import type { VNode } from "vue";

import type { ToastServiceProvider } from "@knime/components";

import { defaultErrorPresetHandler } from "./defaultErrorPresetHandler";
import { type ToastPresetErrorHandler, type ToastPresetHandler } from "./types";
import { removeAllToastsByPrefix } from "./utils";

type SpacesAuthToastPresets = {
  connectFailed: ToastPresetErrorHandler<{
    providerName?: string;
  }>;
};

type SpacesCrudToastPresets = {
  createSpaceFailed: ToastPresetErrorHandler;
  renameSpaceFailed: ToastPresetErrorHandler;

  createWorkflowFailed: ToastPresetErrorHandler;
  deleteItemsFailed: ToastPresetErrorHandler;

  fetchWorkflowGroupFailed: ToastPresetErrorHandler;
  fetchProviderSpacesFailed: ToastPresetErrorHandler;
  reloadProviderSpacesFailed: ToastPresetErrorHandler;
  moveItemsFailed: ToastPresetErrorHandler;
  copyItemsFailed: ToastPresetErrorHandler;
  moveOrCopyOpenItemsWarning: ToastPresetHandler<{
    isCopy: boolean;
    component?: VNode | null;
  }>;
  renameItemFailed: ToastPresetErrorHandler<{ newName: string }>;

  createFolderFailed: ToastPresetErrorHandler;
};

type SpacesRevealToastPresets = {
  revealProjectFailed: ToastPresetErrorHandler;
  nameHasChanged: ToastPresetHandler<{
    oldItemName: string;
    newItemName: string;
  }>;
};

export type SpacesToastPresets = {
  auth: SpacesAuthToastPresets;
  crud: SpacesCrudToastPresets;
  reveal: SpacesRevealToastPresets;
};

const REVEAL_PROJECT_ID_PREFIX = "__REVEAL_PROJECT";

export const getPresets = (
  $toast: ToastServiceProvider,
): SpacesToastPresets => {
  return {
    auth: {
      connectFailed: ({ error, providerName }) =>
        defaultErrorPresetHandler($toast, error, {
          type: "error",
          message: `Could not connect to ${providerName ?? "remote"}`,
        }),
    },

    crud: {
      createWorkflowFailed: ({ error }) =>
        defaultErrorPresetHandler($toast, error, {
          type: "error",
          headline: "Error creating workflow",
        }),
      deleteItemsFailed: ({ error }) =>
        defaultErrorPresetHandler($toast, error, {
          type: "error",
          headline: "Error deleting items",
        }),
      fetchProviderSpacesFailed: ({ error }) =>
        defaultErrorPresetHandler($toast, error, {
          type: "error",
          headline: "Error fetching provider spaces",
        }),
      reloadProviderSpacesFailed: ({ error }) =>
        defaultErrorPresetHandler($toast, error, {
          type: "error",
          headline: "Error fetching provider spaces",
        }),

      fetchWorkflowGroupFailed: ({ error }) =>
        defaultErrorPresetHandler($toast, error, {
          type: "error",
          headline: "Error while fetching workflow group content",
        }),

      createSpaceFailed: ({ error }) =>
        defaultErrorPresetHandler($toast, error, {
          type: "error",
          headline: "Error while creating space",
        }),
      createFolderFailed: ({ error }) =>
        defaultErrorPresetHandler($toast, error, {
          type: "error",
          headline: "Create folder failed",
          message: "Error while creating folder",
        }),
      moveItemsFailed: ({ error }) =>
        defaultErrorPresetHandler($toast, error, {
          type: "error",
          headline: "Error moving items", // "There was a problem moving your files"
        }),
      copyItemsFailed: ({ error }) =>
        defaultErrorPresetHandler($toast, error, {
          type: "error",
          headline: "Error copying items",
        }),
      moveOrCopyOpenItemsWarning: ({ isCopy, component }) =>
        $toast.show({
          headline: `Could not ${isCopy ? "copy" : "move"} items`,
          type: "warning",
          component,
        }),
      renameItemFailed: ({ error, newName }) =>
        defaultErrorPresetHandler($toast, error, {
          type: "error",
          headline: "Rename failed",
          message: `Could not rename the selected item with the new name "${newName}". Please, try again`,
        }),
      renameSpaceFailed: ({ error }) =>
        defaultErrorPresetHandler($toast, error, {
          type: "error",
          headline: "Error while renaming space",
        }),
    },
    reveal: {
      revealProjectFailed: ({ error }) => {
        removeAllToastsByPrefix($toast, REVEAL_PROJECT_ID_PREFIX);
        return defaultErrorPresetHandler($toast, error, {
          id: `${REVEAL_PROJECT_ID_PREFIX}_ERROR`,
          type: "error",
          headline: "Project not found",
          message: "Could not reveal project in Space Explorer.",
          autoRemove: true,
        });
      },
      nameHasChanged: ({ oldItemName, newItemName }) => {
        removeAllToastsByPrefix($toast, REVEAL_PROJECT_ID_PREFIX);
        return $toast.show({
          id: `${REVEAL_PROJECT_ID_PREFIX}_NAME_CHANGED`,
          type: "warning",
          headline: "Name has changed",
          message: `The project name has changed from "${oldItemName}" to "${newItemName}" on the remote Hub`,
          autoRemove: true,
        });
      },
    },
  };
};
