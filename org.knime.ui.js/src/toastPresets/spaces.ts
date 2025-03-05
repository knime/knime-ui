import type { VNode } from "vue";

import type { ToastServiceProvider } from "@knime/components";

import { defaultErrorPresetHandler } from "./defaultErrorPresetHandler";
import { type ToastPresetErrorHandler, type ToastPresetHandler } from "./types";
import { removeAllToastsByIds } from "./utils";

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
  fetchProviderSpaceGroupsFailed: ToastPresetErrorHandler;
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

type FetchProviderSpacesFailedParam = {
  error?: unknown;
  failedProviderNames?: string[];
};

const toastIds = new Set<string>();

export const getPresets = (
  $toast: ToastServiceProvider,
): SpacesToastPresets => {
  return {
    auth: {
      connectFailed: ({ error, providerName }) =>
        defaultErrorPresetHandler($toast, error, {
          type: "error",
          headline: `Could not connect to ${providerName ?? "remote"}`,
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
      fetchProviderSpaceGroupsFailed: (
        param: FetchProviderSpacesFailedParam,
      ) => {
        let error: unknown;
        if (param.failedProviderNames) {
          error = new Error(
            `Could not load spaces for:\n${param.failedProviderNames
              .map((providerName) => `- ${providerName}`)
              .join("\n")}`,
          );
        } else {
          error = param.error;
        }
        return defaultErrorPresetHandler($toast, error, {
          type: "error",
          headline: "Error fetching provider space groups",
        });
      },
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
          message: `Could not rename the selected item with the new name "${newName}". ${
            (error as Error).message
          }`,
        }),
      renameSpaceFailed: ({ error }) =>
        defaultErrorPresetHandler($toast, error, {
          type: "error",
          headline: "Error while renaming space",
        }),
    },
    reveal: {
      revealProjectFailed: ({ error }) => {
        removeAllToastsByIds($toast, toastIds);
        toastIds.clear();
        return defaultErrorPresetHandler($toast, error, {
          type: "error",
          headline: "Project not found",
          message: "Could not reveal project in Space Explorer.",
          autoRemove: true,
        });
      },
      nameHasChanged: ({ oldItemName, newItemName }) => {
        removeAllToastsByIds($toast, toastIds);
        toastIds.clear();
        return $toast.show({
          type: "warning",
          headline: "Name has changed",
          message: `The project name has changed from "${oldItemName}" to "${newItemName}" on the remote Hub`,
          autoRemove: true,
        });
      },
    },
  };
};
