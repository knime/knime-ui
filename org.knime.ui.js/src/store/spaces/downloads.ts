import { computed, ref } from "vue";
import { defineStore } from "pinia";

import { type DownloadItem, useAutoCloseOnCompletion } from "@knime/components";
import { rfcErrors, useDownloadArtifact } from "@knime/hub-features";
import type { NamedItemVersion } from "@knime/hub-features/versions";

import { getToastsProvider } from "@/plugins/toasts";

import { getCustomFetchOptions } from "./common";

export const useSpaceDownloadsStore = defineStore("space.downloads", () => {
  const hasActiveDownload = ref(false);
  const $toast = getToastsProvider();

  const {
    start,
    openDownload: openDownloadInBrowser,
    downloadItems,
    cancel,
    resetState,
    removeItem,
  } = useDownloadArtifact({
    customFetchClientOptions: getCustomFetchOptions(),
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
  };
});
