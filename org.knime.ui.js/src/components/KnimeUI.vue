<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onBeforeMount,
  onBeforeUnmount,
  onMounted,
  ref,
} from "vue";
import { useRoute, useRouter } from "vue-router";

import { HintProvider, ToastStack } from "@knime/components";

import BlockUi from "@/components/application/BlockUi.vue";
import CreateWorkflowModal from "@/components/application/CreateWorkflowModal.vue";
import DownloadBanner from "@/components/application/DownloadBanner.vue";
import ErrorOverlay from "@/components/application/ErrorOverlay.vue";
import HotkeyHandler from "@/components/application/HotkeyHandler.vue";
import GlobalLoader from "@/components/common/GlobalLoader.vue";
import UpdateBanner from "@/components/common/UpdateBanner.vue";
import ConfirmDialog from "@/composables/useConfirmDialog/ConfirmDialog.vue";
import { useStore } from "@/composables/useStore";
import { DynamicEnvRenderer, isDesktop } from "@/environment";

import AppHeaderSkeleton from "./application/AppHeaderSkeleton.vue";
import AppSkeletonLoader from "./application/AppSkeletonLoader/AppSkeletonLoader.vue";
import ShortcutsOverviewDialog from "./application/ShortcutsOverviewDialog.vue";
import DestinationPickerModal from "./spaces/DestinationPicker/DestinationPickerModal.vue";
import { useGlobalErrorReporting } from "./useGlobalErrorReporting";

/**
 * Main page and entry point of KNIME AP Next
 * Initiates application state
 * Defines the router outlet
 */

const AppHeader = defineAsyncComponent({
  loadingComponent: AppHeaderSkeleton,
  loader: () => import("@/components/application/AppHeader.vue"),
});

const loaded = ref(false);
const error = ref<{ message: string; stack?: string } | null>(null);

const $router = useRouter();
const $route = useRoute();
const store = useStore();
const availableUpdates = computed(
  () => store.state.application.availableUpdates,
);
const devMode = computed(() => store.state.application.devMode);

const uiControls = computed(() => store.state.uiControls);

const setContentHeight = () => {
  let mainContentHeight = "100vh";

  if (isDesktop) {
    mainContentHeight = "calc(100vh - var(--app-header-height))";
  } else if (uiControls.value.shouldDisplayDownloadAPButton) {
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
      store.dispatch("application/initializeApplication", { $router }),

      // These fonts will be pre-loaded at application startup with the given font-weights,
      // to prevent text-jumping
      document.fonts.load("400 1em Roboto"),
      document.fonts.load("400 1em Roboto Mono"),
      document.fonts.load("400 1em Roboto Condensed"),
      document.fonts.load("700 1em Roboto Condensed"),
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
  }
};

useGlobalErrorReporting();

const checkClipboardSupport = async () => {
  if (isDesktop) {
    store.commit("application/setHasClipboardSupport", true);
    return;
  }

  let hasClipboardSupport = false;

  try {
    // Ask for permission if Permission API is available
    const permission = await navigator.permissions.query({
      // TODO: check if this is needed anymore
      // @ts-expect-error
      name: "clipboard-read",
    });

    if (permission.state === "granted" || permission.state === "prompt") {
      hasClipboardSupport = true;
    }
  } catch (error) {
    // Check if the Clipboard API is available
    // (on Firefox this is a property `readText` in navigator.clipboard)
    if (navigator.clipboard && "readText" in navigator.clipboard) {
      hasClipboardSupport = true;
    }
  }

  store.commit("application/setHasClipboardSupport", hasClipboardSupport);
};

onBeforeMount(async () => {
  await setup();
});

onMounted(() => {
  checkClipboardSupport();
});

onBeforeUnmount(() => {
  store.dispatch("application/destroyApplication");
});

const onDismissUpdateBanner = () => {
  store.commit("application/setDismissedUpdateBanner", true);
};

const onCloseError = () => {
  if (devMode.value) {
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
          availableUpdates &&
          !store.state.application.dismissedUpdateBanner
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

    <GlobalLoader v-bind="$store.state.application.globalLoader" />

    <UpdateBanner
      v-if="
        $route.meta.showUpdateBanner &&
        availableUpdates &&
        !store.state.application.dismissedUpdateBanner
      "
      :available-updates="availableUpdates"
      @dismiss="onDismissUpdateBanner"
    />

    <ConfirmDialog />

    <CreateWorkflowModal />

    <ShortcutsOverviewDialog />

    <DestinationPickerModal />

    <ToastStack class="toast-stack" />
    <HintProvider />

    <BlockUi />
  </div>
</template>

<style lang="postcss" scoped>
#knime-ui {
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
</style>
