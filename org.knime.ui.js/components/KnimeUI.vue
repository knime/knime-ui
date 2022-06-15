<script>
import { mapActions, mapState } from 'vuex';
import AppHeader from '~/components/AppHeader';
import Sidebar from '~/components/Sidebar';
import WorkflowToolbar from '~/components/WorkflowToolbar';
import WorkflowTabContent from '~/components/WorkflowTabContent';
import TooltipContainer from '~/components/TooltipContainer';
import Error from '~/components/Error';
import WorkflowEntryPage from '~/components/workflow/WorkflowEntryPage';
import HotkeyHandler from '~/components/HotkeyHandler';

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
        WorkflowTabContent,
        WorkflowEntryPage
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
        <WorkflowTabContent class="workflow-area" />
      </template>
      
      <WorkflowEntryPage
        v-else
        class="workflow-area"
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
  grid-template-rows: min-content auto;
  grid-template-areas:
    "header header"
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
  height: 100%;
}

#toolbar {
  grid-area: header;
  height: calc(var(--toolbar-height-shape) * 1px);
  flex: 0 0 auto;
  padding: 10px;
  margin-top: calc(var(--header-height-shape) * 1px);
  background-color: var(--knime-porcelain);
  border-bottom: 1px solid var(--knime-silver-sand);
}

.workflow-area {
  grid-area: workflow;
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
