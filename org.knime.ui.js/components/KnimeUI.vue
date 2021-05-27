<script>
import { mapActions } from 'vuex';
import AppHeader from '~/components/AppHeader';
import Sidebar from '~/components/Sidebar';
import WorkflowToolbar from '~/components/WorkflowToolbar';
import WorkflowTabContent from '~/components/WorkflowTabContent';
import HotKeys from '~/components/HotKeys';
import TooltipContainer from '~/components/TooltipContainer';

// These fonts will be pre-loaded at application startup
const requiredFonts = ['Roboto', 'Roboto Condensed', 'Roboto Mono'];

/**
 * Main page and entry point of Knime Next
 * Initiates application state
 * Defines the layout of the application
 */
export default {
    components: {
        AppHeader,
        Sidebar,
        WorkflowToolbar,
        WorkflowTabContent,
        HotKeys,
        TooltipContainer
    },
    data() {
        return {
            loaded: false
        };
    },
    async fetch() {
        await this.initState();
        await Promise.all(requiredFonts.map(fontName => document.fonts.load(`1em ${fontName}`)));
        this.loaded = true;
    },
    methods: {
        ...mapActions('application', ['initState'])
    }
};
</script>

<template>
  <div id="knime-ui">
    <AppHeader id="header" />
    <WorkflowToolbar v-if="loaded" id="toolbar" />
    <Sidebar id="sidebar" />
    <template v-if="loaded">
      <HotKeys />
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
