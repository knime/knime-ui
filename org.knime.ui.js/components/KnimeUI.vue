<script>
import { mapActions, mapState } from 'vuex';

import AppHeader from '~/components/AppHeader';
import Sidebar from '~/components/Sidebar';
import WorkflowToolbar from '~/components/WorkflowToolbar';
import TooltipContainer from '~/components/TooltipContainer';
import Error from '~/components/Error';
import WorkflowEntryPage from '~/components/workflow/WorkflowEntryPage';
import HotkeyHandler from '~/components/HotkeyHandler';
import WorkflowPanel from '~/components/WorkflowPanel';
import NodeOutput from '~/components/output/NodeOutput';
import Splitter from '~/components/Splitter';

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
    async fetch() {
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
            // errors in the fetch hook are not captured by errorCaptured
            this.error = { message, stack };
        }
    },
    computed: {
        ...mapState('workflow', {
            workflow: 'activeWorkflow'
        })
    },
    mounted() {
        this.checkClipboardSupport();
    },
    async beforeDestroy() {
        await this.destroyApplication();
    },
    errorCaptured({ message, stack }, vm, vueInfo) {
        consola.error(message, vueInfo, stack);

        this.error = {
            message,
            stack,
            vueInfo
        };

        // stop propagation
        return false;
    },
    methods: {
        ...mapActions('application', ['initializeApplication', 'destroyApplication']),

        async checkClipboardSupport() {
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
  grid-template-columns: min-content auto;
  grid-template-rows: min-content min-content auto;
  grid-template-areas:
    "header header"
    "toolbar toolbar"
    "sidebar workflow";
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
