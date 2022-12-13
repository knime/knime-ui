<script>
import { mapState } from 'vuex';

import HotkeyHandler from '@/components/application/HotkeyHandler.vue';
import Splitter from '@/components/application/Splitter.vue';
import Sidebar from '@/components/sidebar/Sidebar.vue';
import NodeOutput from '@/components/output/NodeOutput.vue';

import WorkflowPanel from '@/components/workflow/WorkflowPanel.vue';

/**
 * Main page and entry point of KNIME Next
 * Initiates application state
 * Defines the layout of the application
 */
export default {
    components: {
        HotkeyHandler,
        Sidebar,
        WorkflowPanel,
        NodeOutput,
        Splitter
    },
    computed: {
        ...mapState('workflow', {
            workflow: 'activeWorkflow'
        })
    }
};
</script>

<template>
  <div
    v-if="workflow"
    id="knime-ui"
  >
    <HotkeyHandler />
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
  height: var(--app-toolbar-height);
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
