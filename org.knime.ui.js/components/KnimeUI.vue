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
        ...mapActions('workflows', ['initState'])
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
    <main>
      <WorkflowTabContent />
    </main>
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
    "sidebar main";
  height: 100vh;
  background: var(--knime-white);
}

#header {
  grid-area: header;
}

#sidebar {
  grid-area: sidebar;
  height: 100%;
}

main {
  grid-area: main;
  overflow: auto;
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
