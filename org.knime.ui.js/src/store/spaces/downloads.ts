import { computed, ref } from "vue";
import { API } from "@api";
import { defineStore } from "pinia";

import { type DownloadItem, useAutoCloseOnCompletion } from "@knime/components";
import { rfcErrors, useDownloadArtifact } from "@knime/hub-features";
import type { NamedItemVersion } from "@knime/hub-features/versions";

import { useDestinationPicker } from "@/components/spaces/DestinationPicker/useDestinationPicker";
import { isBrowser } from "@/environment";
import { getToastsProvider } from "@/plugins/toasts";

import { useSpaceCachingStore } from "./caching";
import { getCustomFetchOptionsForBrowser } from "./common";
import { useSpaceOperationsStore } from "./spaceOperations";

export const useSpaceDownloadsStore = defineStore("space.downloads", () => {
  const hasActiveDownload = ref(false);
  const $toast = getToastsProvider();
  const { promptDestination, presets } = useDestinationPicker();

  const {
    start,
    openDownload: openDownloadInBrowser,
    downloadItems,
    cancel,
    resetState,
    removeItem,
  } = useDownloadArtifact({
    customFetchClientOptions: isBrowser()
      ? getCustomFetchOptionsForBrowser()
      : {},
  });

  const startDownload = async ({
    itemId,
    version,
    name,
  }: {
    itemId: string;
    version?: NamedItemVersion["version"];
    name: string;
  }) => {
    hasActiveDownload.value = true;
    try {
      await start({ itemId, version, name });
    } catch (error: unknown) {
      if (error instanceof rfcErrors.RFCError) {
        const toast = rfcErrors.toToast({
          headline: "There was a problem preparing your download",
          rfcError: error,
        });
        $toast.show(toast);
      } else {
        consola.error(
          "downloads:: Unexpected error when starting a download",
          error,
        );
      }
    }
  };

  const closeDownloadPanel = () => {
    hasActiveDownload.value = false;
    resetState();
  };

  const hasPendingDownloads = computed(
    () =>
      downloadItems.value.filter(({ status }) => status === "IN_PROGRESS")
        .length > 0,
  );

  // for triggering the download of an item manually
  const openDownload = (downloadUrl?: string) => {
    if (!downloadUrl) {
      return;
    }
    openDownloadInBrowser(downloadUrl);
  };

  useAutoCloseOnCompletion<DownloadItem["status"]>({
    items: downloadItems,
    completedStatus: "READY",
    close: closeDownloadPanel,
  });

  /*
   * Move items from a hub space to the local space provider
   * Takes the space context from the space explorer
   *
   * @param projectId - The project ID to take the space context from
   * @param itemIds - The itemIDs of the items in the Hub space
   */
  const moveToLocalProviderFromHub = async ({
    projectId,
  }: {
    projectId: string;
  }) => {
    if (isBrowser()) {
      return;
    }

    // Takes space context from space explorer
    const { spaceId: sourceSpaceId, spaceProviderId: sourceProviderId } =
      useSpaceCachingStore().projectPath[projectId];
    const { currentSelectedItemIds } = useSpaceOperationsStore();

    const destinationResult = await promptDestination(
      presets.DOWNLOAD_PICKERCONFIG,
    );

    if (destinationResult?.type === "item") {
      const {
        spaceProviderId: destinationProviderId,
        spaceId: destinationSpaceId,
        itemId: destinationItemId,
        resetWorkflow,
      } = destinationResult;

      await API.desktop.downloadFromSpace({
        sourceProviderId,
        sourceSpaceId,
        sourceItemIds: currentSelectedItemIds,
        destinationProviderId,
        destinationSpaceId,
        destinationItemId,
        excludeData: resetWorkflow,
      });
    }
  };

  return {
    startDownload,
    downloadItems,
    cancel,
    removeItem,
    closeDownloadPanel,
    hasPendingDownloads,
    hasActiveDownload: computed(
      () => hasActiveDownload.value && downloadItems.value?.length > 0,
    ),
    openDownload,
    moveToLocalProviderFromHub,
  };
});
