<script>
import { mapActions, mapState } from 'vuex';

import AppHeader from '@/components/application/AppHeader.vue';
import TooltipContainer from '@/components/application/TooltipContainer.vue';
import Error from '@/components/application/Error.vue';
import HotkeyHandler from '@/components/application/HotkeyHandler.vue';
import Splitter from '@/components/application/Splitter.vue';
import Sidebar from '@/components/sidebar/Sidebar.vue';
import WorkflowToolbar from '@/components/toolbar/WorkflowToolbar.vue';
import NodeOutput from '@/components/output/NodeOutput.vue';

import WorkflowEntryPage from '@/components/workflow/WorkflowEntryPage.vue';
import WorkflowPanel from '@/components/workflow/WorkflowPanel.vue';

/**
 * Main page and entry point of KNIME Next
 * Initiates application state
 * Defines the layout of the application
 */
export default {
    components: {
        AppHeader,
        Error,
        HotkeyHandler,
        Sidebar,
        TooltipContainer,
        WorkflowToolbar,
        WorkflowEntryPage,
        WorkflowPanel,
        NodeOutput,
        Splitter
    },

    data() {
        return {
            loaded: false,
            error: null
        };
    },
    
    computed: {
        ...mapState('workflow', {
            workflow: 'activeWorkflow'
        }),

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
                    this.initializeApplication(),

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
      v-once
      v-bind="error"
      @close="onCloseError"
    />
    
    <AppHeader id="header" />
    <WorkflowToolbar id="toolbar" />
    <TooltipContainer id="tooltip-container" />
    
    <template v-if="loaded">
      <HotkeyHandler />

      <template v-if="workflow">
        <Sidebar id="sidebar" />

        <main class="workflow-area">
          <Splitter
            id="kanvasOutputSplitter"
            direction="column"
          >
            <WorkflowPanel id="workflow-panel" />
            <template #secondary>
              <NodeOutput />
            </template>
          </Splitter>
        </main>
      </template>
      
      <WorkflowEntryPage
        v-else
        class="workflow-empty"
      />
    </template>
    
    <div
      v-else
      class="loader"
    />
  </div>
</template>

<style lang="postcss" scoped>
#knime-ui {
  --side-bar-width: 40px;

  display: grid;
  grid-template:
    "header header" min-content
    "toolbar toolbar" min-content
    "sidebar workflow" auto
    / min-content auto;
  height: 100vh;
  background: var(--knime-white);
  color: var(--knime-masala);
  overflow: hidden;
}

#header {
  grid-area: header;
}

#sidebar {
  grid-area: sidebar;
}

#toolbar {
  grid-area: toolbar;
  height: 50px;
  flex: 0 0 auto;
  padding: 10px;
  background-color: var(--knime-porcelain);
  border-bottom: 1px solid var(--knime-silver-sand);
}

main {
  display: flex;
  overflow: auto;
  flex-direction: column;
  align-items: stretch;
  height: 100%;
}

.workflow-area {
  grid-area: workflow;
}

.workflow-empty {
  grid-area: workflow;
  grid-column-start: 1;
}

.loader {
  height: 100vh;

  &::after {
    content: "Loading…";
    display: block;
    position: absolute;
    right: 10px;
    bottom: 10px;
    color: var(--knime-silver-sand);
  }
}
</style>
