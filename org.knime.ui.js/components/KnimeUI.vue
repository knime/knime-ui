<script>
import { mapActions } from 'vuex';

import AppHeader from '~/components/AppHeader';
import Sidebar from '~/components/Sidebar';
import WorkflowTabContent from '~/components/WorkflowTabContent';

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
        WorkflowTabContent
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
  <div
    v-if="loaded"
    id="knime-ui"
  >
    <AppHeader id="header" />
    <Sidebar id="sidebar" />
    <WorkflowTabContent id="tab-content" />
  </div>
  <div
    v-else
    class="loader"
  />
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

#tab-content {
  grid-area: workflow;
}

#header {
  grid-area: header;
}

#sidebar {
  grid-area: sidebar;
  height: 100%;
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
