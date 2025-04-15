import { computed, ref } from "vue";
import { useFileDialog } from "@vueuse/core";
import { defineStore, storeToRefs } from "pinia";

import {
  type UploadItemStatus,
  useAutoCloseOnCompletion,
} from "@knime/components";
import { rfcErrors, useFileUpload } from "@knime/hub-features";
import { knimeFileFormats } from "@knime/utils";

import { API } from "@/api";
import { useDestinationPicker } from "@/components/spaces/DestinationPicker/useDestinationPicker";
import { isBrowser } from "@/environment";
import { getToastsProvider } from "@/plugins/toasts";
import { createUnwrappedPromise } from "@/util/createUnwrappedPromise";
import { useApplicationStore } from "../application/application";

import { localRootProjectPath, useSpaceCachingStore } from "./caching";
import { getCustomFetchOptions } from "./common";
import { useSpaceOperationsStore } from "./spaceOperations";

export const useSpaceUploadsStore = defineStore("space.uploads", () => {
  const hasActiveUpload = ref(false);
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
  } = useFileUpload({
    customFetchClientOptions: getCustomFetchOptions(),

    onFileUploadComplete: ({ parentId }) => {
      const { activeProjectId } = applicationStore;
      // upload was complete, but the parent container is no longer visible; no need to refresh
      if (
        !activeProjectId ||
        (activeProjectPath.value?.spaceId !== parentId &&
          activeProjectPath.value?.itemId !== parentId)
      ) {
        return;
      }

      spaceOperationsStore.fetchWorkflowGroupContent({
        projectId: activeProjectId,
      });
    },

    onUploadQueueSizeExceeded: (maxQueueSize) => {
      $toast.show({
        type: "warning",
        headline: "Max concurrent uploads reached",
        message: `You can only upload ${maxQueueSize} files at the same time`,
      });
    },
  });

  const getFilesToUpload = () => {
    const { promise, resolve } = createUnwrappedPromise<File[] | null>();

    const { open, reset, onChange } = useFileDialog();

    onChange((files) => {
      const { activeProjectId } = applicationStore;

      if (!activeProjectId || !files) {
        resolve(null);
        reset();
        return;
      }

      const selectedFiles = [...files];
      const hasSelectedKnwfFiles = selectedFiles.some((file) =>
        knimeFileFormats.KNWF.matches(file),
      );

      if (hasSelectedKnwfFiles) {
        $toast.show({
          type: "warning",
          headline: "Importing .knwf file",
          message: "Importing workflows is not yet supported. (Coming soon!)",
        });
      }

      const withoutKnwfFiles = selectedFiles.filter(
        (file) => !knimeFileFormats.KNWF.matches(file),
      );

      resolve(withoutKnwfFiles);
      reset();
    });

    open();

    return promise;
  };

  const getUploadParentId = (): string | null => {
    if (!spaceCachingStore.activeProjectPath) {
      // currently not supported outside the workflow page, which always has an
      // active project id
      return null;
    }

    const { spaceId, itemId } = spaceCachingStore.activeProjectPath;

    return itemId === "root" ? spaceId : itemId;
  };

  const startUpload = async () => {
    hasActiveUpload.value = true;

    const parentId = getUploadParentId();
    const files = await getFilesToUpload();

    if (!parentId || !files) {
      return;
    }

    try {
      await start(parentId, files);
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
    cancelUpload: cancel,
    closeUploadsPanel,
    removeItem,
    unprocessedUploads,
    moveToHubFromLocalProvider,
  };
});
