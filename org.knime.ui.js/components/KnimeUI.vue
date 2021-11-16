<script>
import { mapActions } from 'vuex';
import AppHeader from '~/components/AppHeader';
import Sidebar from '~/components/Sidebar';
import WorkflowToolbar from '~/components/WorkflowToolbar';
import WorkflowTabContent from '~/components/WorkflowTabContent';
import TooltipContainer from '~/components/TooltipContainer';
import Error from '~/components/Error';

import { hotKeys } from '~/mixins';

// These fonts will be pre-loaded at application startup
const requiredFonts = ['Roboto', 'Roboto Condensed', 'Roboto Mono'];

/**
 * Main page and entry point of Knime Next
 * Initiates application state
 * Defines the layout of the application
 */
export default {
    components: {
        Error,
        AppHeader,
        Sidebar,
        WorkflowToolbar,
        WorkflowTabContent,
        TooltipContainer
    },
    mixins: [hotKeys],
    data() {
        return {
            loaded: false,
            error: null
        };
    },
    async fetch() {
        try {
            await this.initState();
            await Promise.all(requiredFonts.map(fontName => document.fonts.load(`1em ${fontName}`)));
            this.loaded = true;
        } catch ({ message, stack }) {
            // errors in the fetch hook are not captured by errorCaptured
            this.error = { message, stack };
        }
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
        ...mapActions('application', ['initState']),
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
    <WorkflowToolbar
      v-if="loaded"
      id="toolbar"
    />
    <Sidebar id="sidebar" />
    <template v-if="loaded">
      <WorkflowTabContent id="tab-content" />
      <TooltipContainer id="tooltip-container" />
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
  height: 50px;
  flex: 0 0 auto;
  padding: 10px;
  margin-top: 80px;
  background-color: var(--knime-porcelain);
  border-bottom: 1px solid var(--knime-silver-sand);
}

#tab-content {
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
