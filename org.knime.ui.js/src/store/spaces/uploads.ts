import { computed, ref } from "vue";
import { type UseFileDialogOptions, useFileDialog } from "@vueuse/core";
import { API } from "@api";
import { defineStore, storeToRefs } from "pinia";

import {
  type UploadItemStatus,
  useAutoCloseOnCompletion,
} from "@knime/components";
import { rfcErrors, useFileUpload } from "@knime/hub-features";
import { knimeFileFormats, promise as promiseUtils } from "@knime/utils";

import { useDestinationPicker } from "@/components/spaces/DestinationPicker/useDestinationPicker";
import { isBrowser } from "@/environment";
import { getToastsProvider } from "@/plugins/toasts";
import { useApplicationStore } from "../application/application";

import { useSpaceCachingStore } from "./caching";
import { getCustomFetchOptionsForBrowser } from "./common";
import { localRootProjectPath } from "./constants";
import { useSpaceOperationsStore } from "./spaceOperations";

type CompletedUploadData = {
  uploadId: string;
  parentId: string;
  name: string;
};

export const useSpaceUploadsStore = defineStore("space.uploads", () => {
  const hasActiveUpload = ref(false);
  const onCompleteCallbacks = new Map<
    string,
    (complete: CompletedUploadData) => void
  >();
  const $toast = getToastsProvider();

  const spaceOperationsStore = useSpaceOperationsStore();
  const { activeProjectPath } = storeToRefs(useSpaceCachingStore());
  const applicationStore = useApplicationStore();
  const spaceCachingStore = useSpaceCachingStore();
  const { promptDestination, presets } = useDestinationPicker();

  const {
    isPreparingUpload,
    totalFilesBeingPrepared,
    start,
    uploadItems,
    cancel,
    resetState,
    removeItem,
    hasPendingUploads,
    unprocessedUploads,
    setProcessingCompleted,
    setProcessingFailed,
  } = useFileUpload({
    customFetchClientOptions: isBrowser()
      ? getCustomFetchOptionsForBrowser()
      : {},

    onFileUploadComplete: ({ parentId, uploadId, name }) => {
      if (onCompleteCallbacks.has(uploadId)) {
        onCompleteCallbacks.get(uploadId)?.({ parentId, uploadId, name });
        onCompleteCallbacks.delete(uploadId);
      }
    },

    onUploadQueueSizeExceeded: (maxQueueSize) => {
      $toast.show({
        type: "warning",
        headline: "Max concurrent uploads reached",
        message: `You can only upload ${maxQueueSize} files at the same time`,
      });
    },
  });

  /**
   * Uploads given Files array
   * @returns unique uploadIds for every file can later be used to identify the file
   */
  const uploadFiles = async ({
    files,
    parentId,
    isFileWithProcessing,
    completeCallback,
  }: {
    files: File[];
    parentId: string;
    isFileWithProcessing?: (file: File) => boolean;
    completeCallback?: (data: CompletedUploadData) => void;
  }) => {
    hasActiveUpload.value = true;

    if (!parentId || !files) {
      return [];
    }

    try {
      const uploadIds = await start(parentId, files, { isFileWithProcessing });
      if (completeCallback) {
        uploadIds.forEach((id) =>
          onCompleteCallbacks.set(id, completeCallback),
        );
      }
      return uploadIds;
    } catch (error) {
      if (error instanceof rfcErrors.RFCError) {
        const toast = rfcErrors.toToast({
          headline: "There was a problem preparing your upload",
          rfcError: error,
        });

        $toast.show(toast);
      } else {
        consola.error("uploads:: Unexpected error when starting an upload", {
          error,
        });
      }
    }
    return [];
  };

  /**
   * Promise based file chooser with optional filter
   */
  const chooseFiles = ({
    options,
    filter = (files) => files,
  }: {
    options?: Partial<UseFileDialogOptions>;
    filter?: (files: File[]) => File[];
  } = {}) => {
    const { promise, resolve } = promiseUtils.createUnwrappedPromise<
      File[] | null
    >();

    const { open, reset, onChange } = useFileDialog(options);

    onChange((files) => {
      const { activeProjectId } = applicationStore;

      if (!activeProjectId || !files) {
        resolve(null);
        reset();
        return;
      }

      resolve(filter(Array.from(files)));
      reset();
    });

    open();

    return promise;
  };

  const getUploadParentId = (): string | undefined => {
    if (!spaceCachingStore.activeProjectPath) {
      // currently not supported outside the workflow page, which always has an
      // active project id
      // eslint-disable-next-line no-undefined
      return undefined;
    }

    const { spaceId, itemId } = spaceCachingStore.activeProjectPath;

    return itemId === "root" ? spaceId : itemId;
  };

  /**
   * Choose supported files and start upload to the current open space explorer (only works if you have it open).
   * @returns unique uploadIds for every file can later be used to identify the file
   */
  const startUpload = async () => {
    hasActiveUpload.value = true;

    const parentId = getUploadParentId();

    const files = await chooseFiles({
      filter: (selectedFiles) => {
        const filteredFiles = selectedFiles.filter(
          (file) => !knimeFileFormats.KNWF.matches(file),
        );
        if (selectedFiles.length !== filteredFiles.length) {
          $toast.show({
            type: "warning",
            headline: "Importing .knwf file",
            message: "Importing workflows is not yet supported. (Coming soon!)",
          });
        }
        return filteredFiles;
      },
    });

    if (!parentId || !files) {
      return [];
    }

    const updateWorkflowGroupContent = () => {
      const { activeProjectId: projectId } = applicationStore;
      // upload was complete, but the parent container is no longer visible; no need to refresh
      if (
        !projectId ||
        (activeProjectPath.value?.spaceId !== parentId &&
          activeProjectPath.value?.itemId !== parentId)
      ) {
        return;
      }

      spaceOperationsStore.fetchWorkflowGroupContent({
        projectId,
      });
    };

    return uploadFiles({
      files,
      parentId,
      completeCallback: updateWorkflowGroupContent,
    });
  };

  const closeUploadsPanel = () => {
    hasActiveUpload.value = false;
    resetState();
  };

  useAutoCloseOnCompletion<UploadItemStatus>({
    items: uploadItems,
    completedStatus: "complete",
    close: closeUploadsPanel,
  });

  /*
   * This function is used to move items from a local provider to a hub provider.
   *
   * @param itemIds - the item IDs in the local provider of the items to move to hub
   * */
  const moveToHubFromLocalProvider = async ({
    itemIds,
  }: {
    itemIds: string[];
  }): Promise<{
    destinationProviderId: string;
    destinationSpaceId: string;
    remoteItemIds: string[];
  } | null> => {
    if (isBrowser()) {
      return null;
    }

    const destinationResult = await promptDestination(
      presets.UPLOAD_PICKERCONFIG,
    );

    if (destinationResult?.type !== "item") {
      return null;
    }

    const {
      spaceProviderId: destinationProviderId,
      spaceId: destinationSpaceId,
      itemId: destinationItemId,
      resetWorkflow,
    } = destinationResult;

    const remoteItemIds = await API.desktop.uploadToSpace({
      sourceProviderId: localRootProjectPath.spaceProviderId,
      sourceSpaceId: localRootProjectPath.spaceId,
      sourceItemIds: itemIds,
      destinationProviderId,
      destinationSpaceId,
      destinationItemId,
      excludeData: resetWorkflow,
    });

    if (!remoteItemIds || remoteItemIds.length === 0) {
      return null;
    }

    return { destinationProviderId, destinationSpaceId, remoteItemIds };
  };

  return {
    isPreparingUpload,
    totalFilesBeingPrepared,
    hasActiveUpload: computed(
      () => hasActiveUpload.value && uploadItems.value.length > 0,
    ),
    hasPendingUploads,
    uploadItems,
    startUpload,
    uploadFiles,
    cancelUpload: cancel,
    closeUploadsPanel,
    removeItem,
    chooseFiles,
    unprocessedUploads,
    moveToHubFromLocalProvider,
    setProcessingCompleted,
    setProcessingFailed,
  };
});
