<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onBeforeMount,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";

import {
  DownloadProgressPanel,
  HintProvider,
  ToastStack,
  useBeforeUnload,
} from "@knime/components";
import { ConfirmDialog } from "@knime/kds-components";
import { getMetaOrCtrlKey, promise as promiseUtils } from "@knime/utils";

import BlockUi from "@/components/application/BlockUi.vue";
import CreateWorkflowModal from "@/components/application/CreateWorkflowModal.vue";
import DownloadBanner from "@/components/application/DownloadBanner.vue";
import ErrorOverlay from "@/components/application/ErrorOverlay.vue";
import HotkeyHandler from "@/components/application/HotkeyHandler.vue";
import GlobalLoader from "@/components/common/GlobalLoader.vue";
import UpdateBanner from "@/components/common/UpdateBanner.vue";
import { DynamicEnvRenderer, isBrowser, isDesktop } from "@/environment";
import { performanceTracker } from "@/performanceTracker";
import { useApplicationStore } from "@/store/application/application";
import { useGlobalLoaderStore } from "@/store/application/globalLoader";
import { useLifecycleStore } from "@/store/application/lifecycle";
import { useApplicationSettingsStore } from "@/store/application/settings";
import { useSpaceDownloadsStore } from "@/store/spaces/downloads";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { useSpaceUploadsStore } from "@/store/spaces/uploads";
import { useUIControlsStore } from "@/store/uiControls/uiControls";
import { getToastPresets } from "@/toastPresets";
import { KANVAS_ID } from "@/util/getKanvasDomElement";

import AppHeaderSkeleton from "./application/AppHeader/AppHeaderSkeleton.vue";
import AppSkeletonLoader from "./application/AppSkeletonLoader/AppSkeletonLoader.vue";
import DevTools from "./application/DevTools.vue";
import ShortcutsOverviewDialog from "./application/ShortcutsOverviewDialog.vue";
import DestinationPickerModal from "./spaces/DestinationPicker/DestinationPickerModal.vue";
import { useGlobalErrorReporting } from "./useGlobalErrorReporting";
import { useIdleUserTracking } from "./useIdleUserTracking";

/**
 * Main page and entry point of KNIME AP Next
 * Initiates application state
 * Defines the router outlet
 */

const UploadProgressPanel = defineAsyncComponent(() =>
  import("@knime/components").then(
    ({ UploadProgressPanel }) => UploadProgressPanel,
  ),
);

if (performanceTracker.isCanvasPerfMode()) {
  performance.mark("knime:app:start");
}

const loaded = ref(false);
const error = ref<{ message: string; stack?: string } | null>(null);

const $router = useRouter();
const $route = useRoute();

const applicationStore = useApplicationStore();
const globalLoaderStore = useGlobalLoaderStore();
const lifecycleStore = useLifecycleStore();
const applicationSettingsStore = useApplicationSettingsStore();
const { devMode } = storeToRefs(applicationSettingsStore);
const uiControls = useUIControlsStore();
const spaceUploadsStore = useSpaceUploadsStore();
const {
  hasActiveUpload,
  hasPendingUploads,
  isPreparingUpload,
  uploadItems,
  totalFilesBeingPrepared,
} = storeToRefs(spaceUploadsStore);
const isUploadPanelExpanded = ref(true);
const spaceDownloadsStore = useSpaceDownloadsStore();
const { hasActiveDownload, hasPendingDownloads, downloadItems } =
  storeToRefs(spaceDownloadsStore);
const isDownloadPanelExpanded = ref(true);

const showUploadPanel = computed(
  () => hasActiveUpload.value || isPreparingUpload.value,
);
const showDownloadPanel = computed(() => hasActiveDownload.value);

useBeforeUnload({
  hasUnsavedChanges: () => hasPendingUploads.value || hasPendingDownloads.value,
});

const AppHeader = defineAsyncComponent({
  loadingComponent: AppHeaderSkeleton,
  loader: () => {
    const componentPromise = import(
      "@/components/application/AppHeader/AppHeader.vue"
    );
    const { promise, resolve } =
      promiseUtils.createUnwrappedPromise<Awaited<typeof componentPromise>>();

    // make sure the AppHeader component is not fully loaded until the application
    // is initialized
    watch(loaded, () => componentPromise.then(resolve), { once: true });

    return promise;
  },
});

const setContentHeight = () => {
  let mainContentHeight = "100vh";

  if (isDesktop()) {
    mainContentHeight = "calc(100vh - var(--app-header-height))";
  } else if (uiControls.shouldDisplayDownloadAPButton) {
    mainContentHeight = "calc(100vh - var(--app-download-banner-height))";
  }

  document.documentElement.style.setProperty(
    "--app-main-content-height",
    mainContentHeight,
  );
};

const setup = async () => {
  try {
    await Promise.all([
      lifecycleStore.initializeApplication({ $router }),

      // These fonts will be pre-loaded at application startup with the given font-weights,
      // to prevent text-jumping
      document.fonts.load("400 1em Roboto"),
      document.fonts.load("400 1em Roboto Mono"),
      document.fonts.load("400 1em Roboto Condensed"),
      document.fonts.load("700 1em Roboto Condensed"),
      document.fonts.load("italic 400 1em Roboto Condensed"),
      document.fonts.load("italic 700 1em Roboto Condensed"),
    ]);

    // calculate content height based on running environment
    setContentHeight();

    // render the application
    loaded.value = true;
  } catch (_error) {
    if (_error instanceof Error) {
      error.value = { message: _error.message, stack: _error.stack };
    } else {
      error.value = { message: "Unknown application error" };
      consola.fatal("Initialization failed", { error: _error });
    }
    return;
  }

  // fetch provider space groups
  const spaceProvidersStore = useSpaceProvidersStore();
  const spaceProviders = Object.values(spaceProvidersStore.spaceProviders);
  const { failedProviders } =
    await spaceProvidersStore.fetchSpaceGroupsForProviders(spaceProviders);

  if (failedProviders.length > 0) {
    const { toastPresets } = getToastPresets();
    toastPresets.spaces.crud.fetchProviderSpaceGroupsFailed({
      failedProviders,
    });
  }
};

useGlobalErrorReporting();

const checkClipboardSupport = async () => {
  if (isDesktop()) {
    applicationSettingsStore.setHasClipboardSupport(true);
    return;
  }

  let hasClipboardSupport = false;

  try {
    // Ask for permission if Permission API is available
    const permission = await navigator.permissions.query({
      // TODO: check if this is needed anymore
      // @ts-expect-error (please add error description)
      name: "clipboard-read",
    });

    if (permission.state === "granted" || permission.state === "prompt") {
      hasClipboardSupport = true;
    }
  } catch (_error) {
    // Check if the Clipboard API is available
    // (on Firefox this is a property `readText` in navigator.clipboard)
    if (navigator.clipboard && "readText" in navigator.clipboard) {
      hasClipboardSupport = true;
    }
  }

  applicationSettingsStore.setHasClipboardSupport(hasClipboardSupport);
};

onBeforeMount(async () => {
  await setup();
});

const preventBrowserZooming = (event: WheelEvent) => {
  // only handle wheel with ctrl otherwise its a scroll not a zoom
  if (!event[getMetaOrCtrlKey()]) {
    return;
  }

  // do nothing if we are working with the Kanvas
  if ((event.target as Element).id === KANVAS_ID) {
    return;
  }

  event.preventDefault();
};

onMounted(() => {
  document.addEventListener("wheel", preventBrowserZooming, { passive: false });
  checkClipboardSupport();
});

if (isBrowser()) {
  useIdleUserTracking();
}

onBeforeUnmount(async () => {
  document.removeEventListener("wheel", preventBrowserZooming);
  await lifecycleStore.destroyApplication();
});

const onDismissUpdateBanner = () => {
  applicationStore.setDismissedUpdateBanner(true);
};

const onCloseError = () => {
  if (applicationSettingsStore.devMode) {
    error.value = null;
  }
};
</script>

<template>
  <div id="knime-ui">
    <!-- if subsequent errors occur, stick with the first one -->
    <ErrorOverlay
      v-if="error"
      :message="error.message"
      :stack="error.stack"
      @close="onCloseError"
    />

    <DynamicEnvRenderer value="DESKTOP">
      <AppHeader id="app-header" />
    </DynamicEnvRenderer>

    <HotkeyHandler />

    <AppSkeletonLoader />

    <template v-if="loaded">
      <div
        :class="[
          $route.meta.showUpdateBanner &&
          applicationStore.availableUpdates &&
          !applicationStore.dismissedUpdateBanner
            ? 'main-content-with-banner'
            : 'main-content',
        ]"
      >
        <RouterView />
      </div>
    </template>

    <DownloadBanner
      v-if="uiControls.shouldDisplayDownloadAPButton"
      class="download-banner"
    />

    <GlobalLoader v-bind="globalLoaderStore.globalLoader" />

    <UpdateBanner
      v-if="
        $route.meta.showUpdateBanner &&
        applicationStore.availableUpdates &&
        !applicationStore.dismissedUpdateBanner
      "
      :available-updates="applicationStore.availableUpdates"
      @dismiss="onDismissUpdateBanner"
    />

    <Transition name="slide-to-bottom">
      <div
        v-if="showUploadPanel || showDownloadPanel"
        class="floating-file-transfer-panel"
      >
        <DownloadProgressPanel
          v-if="showDownloadPanel"
          v-model:expanded="isDownloadPanelExpanded"
          :class="{ 'additional-margin': showUploadPanel && showDownloadPanel }"
          :items="downloadItems"
          @cancel="spaceDownloadsStore.cancel($event.downloadId)"
          @remove="spaceDownloadsStore.removeItem($event.downloadId)"
          @close="spaceDownloadsStore.closeDownloadPanel()"
          @download="spaceDownloadsStore.openDownload($event.downloadUrl)"
        />
        <UploadProgressPanel
          v-if="showUploadPanel"
          v-model:expanded="isUploadPanelExpanded"
          :placeholder-items="totalFilesBeingPrepared"
          :items="uploadItems"
          @remove="spaceUploadsStore.removeItem($event.id)"
          @close="spaceUploadsStore.closeUploadsPanel()"
          @cancel="spaceUploadsStore.cancelUpload($event.id)"
        />
      </div>
    </Transition>

    <ConfirmDialog />

    <CreateWorkflowModal />

    <ShortcutsOverviewDialog />

    <DestinationPickerModal />

    <ToastStack class="toast-stack" />
    <HintProvider />

    <BlockUi />

    <DevTools v-if="devMode" />
  </div>
</template>

<style lang="postcss" scoped>
#knime-ui {
  --z-index-base-popover: v-bind("$zIndices.layerToasts");

  display: grid;
  grid-template:
    "header" min-content
    "workflow" auto
    "download-banner" min-content;
}

#header {
  grid-area: header;
}

.main-content {
  width: 100vw;
  grid-area: workflow;
  height: var(--app-main-content-height);
}

.main-content-with-banner {
  height: calc(
    var(--app-main-content-height) - var(--app-update-banner-height)
  );
}

.download-banner {
  grid-area: download-banner;
}

.toast-stack {
  z-index: calc(v-bind("$zIndices.layerToasts"));
}

.floating-file-transfer-panel {
  z-index: v-bind("$zIndices.layerFloatingWindows");
  position: fixed;
  bottom: var(--space-16);
  right: var(--space-16);
}

.additional-margin {
  margin-bottom: var(--space-6);
}

.slide-to-bottom-leave-active {
  transition: all 0.3s linear;
}

.slide-to-bottom-leave-to {
  transform: translateY(100%);
}
</style>
