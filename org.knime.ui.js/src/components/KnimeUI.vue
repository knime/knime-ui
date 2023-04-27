<script>
import { mapActions, mapState } from 'vuex';

import UpdateBanner from '@/components/common/UpdateBanner.vue';
import AppHeader from '@/components/application/AppHeader.vue';
import HotkeyHandler from '@/components/application/HotkeyHandler.vue';
import Error from '@/components/application/Error.vue';
import SmartLoader from '@/components/common/SmartLoader.vue';
import CreateWorkflowModal from '@/components/application/CreateWorkflowModal.vue';


/**
 * Main page and entry point of KNIME Next
 * Initiates application state
 * Defines the router outlet
 */
export default {
    components: {
        UpdateBanner,
        AppHeader,
        HotkeyHandler,
        Error,
        SmartLoader,
        CreateWorkflowModal
    },

    data() {
        return {
            loaded: false,
            error: null
        };
    },

    computed: {
        ...mapState('workflow', { workflow: 'activeWorkflow' }),
        ...mapState('application', ['availableUpdates', 'globalLoader']),

        isInsideAP() {
            // When the `window.isInsideAP` property is set, the app is being run in development mode
            // via knime-ui-internal, so the API will be mocked and therefore the browser functions will exist
            // and we can't use them to determine the value
            // eslint-disable-next-line no-undefined
            return window.isInsideAP === undefined
                ? Boolean(window.switchToJavaUI)
                : window.isInsideAP;
        }
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
        ...mapActions('application', ['initializeApplication', 'destroyApplication']),

        async setup() {
            try {
                await Promise.all([
                    this.initializeApplication({ $router: this.$router }),

                    // These fonts will be pre-loaded at application startup with the given font-weights,
                    // to prevent text-jumping
                    document.fonts.load('400 1em Roboto'),
                    document.fonts.load('400 1em Roboto Mono'),
                    document.fonts.load('400 1em Roboto Condensed'),
                    document.fonts.load('700 1em Roboto Condensed')
                ]);

                // render the application
                this.loaded = true;
            } catch ({ message, stack }) {
                this.error = { message, stack };
            }
        },

        async checkClipboardSupport() {
            if (this.isInsideAP) {
                this.$store.commit('application/setHasClipboardSupport', true);
                return;
            }

            let hasClipboardSupport = false;

            try {
                // Ask for permission if Permission API is available
                const permission = await navigator.permissions.query({ name: 'clipboard-read' });
                if (permission.state === 'granted' || permission.state === 'prompt') {
                    hasClipboardSupport = true;
                }
            } catch (error) {
                // Check if the Clipboard API is available
                // (on Firefox this is a property `readText` in navigator.clipboard)
                if ('readText' in navigator.clipboard) {
                    hasClipboardSupport = true;
                }
            }

            this.$store.commit('application/setHasClipboardSupport', hasClipboardSupport);
        },

        onCloseError() {
            if (process.env.isDev) { // eslint-disable-line no-process-env
                this.error = null;
            }
        }
    }
};
</script>

<template>
  <div id="knime-ui">
    <!-- if subsequent errors occur, stick with the first one -->
    <Error
      v-if="error"
      v-bind="error"
      @close="onCloseError"
    />

    <AppHeader id="header" />
    <HotkeyHandler />

    <template v-if="loaded">
      <div :class="($route.meta.showUpdateBanner && availableUpdates) ? 'main-content-with-banner' : 'main-content'">
        <RouterView />
      </div>
    </template>

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
  </div>
</template>

<style lang="postcss" scoped>
#knime-ui {
  display: grid;
  grid-template:
    "header" min-content
    "workflow" auto;
}

#header {
  grid-area: header;
}

.main-content {
  width: 100vw;
  height: calc(100vh - var(--app-header-height));
  grid-area: workflow;
}

.main-content-with-banner {
  height: calc(100vh - var(--app-header-height) - var(--app-update-banner-height));
}
</style>
