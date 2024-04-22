<script lang="ts">
import { defineComponent, defineAsyncComponent } from "vue";
import { mapActions, mapState } from "vuex";

import { ToastStack } from "webapps-common/ui/services/toast";
import { DynamicEnvRenderer, environment, isDesktop } from "@/environment";
import UpdateBanner from "@/components/common/UpdateBanner.vue";
import HotkeyHandler from "@/components/application/HotkeyHandler.vue";
import Error from "@/components/application/Error.vue";
import DownloadBanner from "./workflow/DownloadBanner.vue";
import SmartLoader from "@/components/common/SmartLoader.vue";
import CreateWorkflowModal from "@/components/application/CreateWorkflowModal.vue";
import BlockUi from "@/components/application/BlockUi.vue";
import ShortcutsOverviewDialog from "./application/ShortcutsOverviewDialog.vue";
import AppSkeletonLoader from "./application/AppSkeletonLoader.vue";
import AppHeaderSkeleton from "./application/AppHeaderSkeleton.vue";

type ComponentData = {
  loaded: boolean;
  error: { message: string; stack: string } | null;
};

/**
 * Main page and entry point of KNIME Next
 * Initiates application state
 * Defines the router outlet
 */
export default defineComponent({
  components: {
    AppHeader: defineAsyncComponent({
      loadingComponent: AppHeaderSkeleton,
      loader: () => import("@/components/application/AppHeader.vue"),
    }),
    AppSkeletonLoader,
    UpdateBanner,
    HotkeyHandler,
    Error,
    BlockUi,
    DownloadBanner,
    SmartLoader,
    CreateWorkflowModal,
    ToastStack,
    DynamicEnvRenderer,
    ShortcutsOverviewDialog,
  },

  data(): ComponentData {
    return {
      loaded: false,
      error: null,
    };
  },

  computed: {
    ...mapState("workflow", { workflow: "activeWorkflow" }),
    ...mapState("application", ["availableUpdates", "globalLoader", "devMode"]),

    environment() {
      return environment;
    },
  },

  async beforeMount() {
    await this.setup();
  },

  mounted() {
    this.checkClipboardSupport();
  },

  async beforeUnmount() {
    await this.destroyApplication();
  },

  methods: {
    ...mapActions("application", [
      "initializeApplication",
      "destroyApplication",
    ]),

    async setup() {
      try {
        await Promise.all([
          this.initializeApplication({ $router: this.$router }),

          // These fonts will be pre-loaded at application startup with the given font-weights,
          // to prevent text-jumping
          document.fonts.load("400 1em Roboto"),
          document.fonts.load("400 1em Roboto Mono"),
          document.fonts.load("400 1em Roboto Condensed"),
          document.fonts.load("700 1em Roboto Condensed"),
        ]);

        // render the application
        this.loaded = true;
        // @ts-ignore
      } catch ({ message, stack }) {
        // @ts-ignore
        this.error = { message, stack };
      }
    },

    async checkClipboardSupport() {
      if (isDesktop) {
        this.$store.commit("application/setHasClipboardSupport", true);
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

      this.$store.commit(
        "application/setHasClipboardSupport",
        hasClipboardSupport,
      );
    },

    onCloseError() {
      if (this.devMode) {
        this.error = null;
      }
    },
  },
});
</script>

<template>
  <div id="knime-ui">
    <!-- if subsequent errors occur, stick with the first one -->
    <Error v-if="error" v-bind="error" @close="onCloseError" />

    <DynamicEnvRenderer value="DESKTOP">
      <AppHeader id="app-header" />
    </DynamicEnvRenderer>

    <HotkeyHandler />

    <AppSkeletonLoader />

    <template v-if="loaded">
      <div
        :class="[
          $route.meta.showUpdateBanner && availableUpdates
            ? 'main-content-with-banner'
            : 'main-content',
          environment.toLowerCase(),
        ]"
      >
        <RouterView />
      </div>
    </template>

    <DynamicEnvRenderer value="BROWSER">
      <DownloadBanner class="download-banner" />
    </DynamicEnvRenderer>

    <SmartLoader
      :loading="globalLoader.loading"
      :text="globalLoader.text"
      :config="globalLoader.config"
    />

    <UpdateBanner
      v-if="$route.meta.showUpdateBanner"
      :available-updates="availableUpdates"
    />

    <CreateWorkflowModal />

    <ShortcutsOverviewDialog />

    <ToastStack class="toast-stack" />

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

  &.desktop {
    height: calc(100vh - var(--app-header-height));
  }

  &.browser {
    height: calc(100vh - var(--app-download-banner-height));
  }
}

.main-content-with-banner {
  height: calc(
    100vh - var(--app-header-height) - var(--app-update-banner-height)
  );
}

.download-banner {
  grid-area: download-banner;
}

.toast-stack {
  z-index: 9;
}
</style>
