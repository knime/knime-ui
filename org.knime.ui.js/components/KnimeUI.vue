<script>
import { mapActions } from 'vuex';

import AppHeader from '~/components/AppHeader';
import Sidebar from '~/components/Sidebar';
import WorkflowTabContent from '~/components/WorkflowTabContent';

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
    async fetch() {
        await this.initState();
    },
    methods: {
        ...mapActions('application', ['initState'])
    }
};
</script>

<template>
  <div id="knime-ui">
    <AppHeader id="header" />
    <Sidebar id="sidebar" />
    <WorkflowTabContent id="tab-content" />
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
</style>
