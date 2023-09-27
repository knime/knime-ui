<script>
import { mapState } from "vuex";

import Splitter from "@/components/application/Splitter.vue";
import Sidebar from "@/components/sidebar/Sidebar.vue";
import NodeOutput from "@/components/output/NodeOutput.vue";

import TooltipContainer from "@/components/application/TooltipContainer.vue";
import WorkflowToolbar from "@/components/toolbar/WorkflowToolbar.vue";

import WorkflowPanel from "@/components/workflow/WorkflowPanel.vue";

/**
 * Component that acts as a router page to render the workflow
 */
export default {
  components: {
    Sidebar,
    WorkflowPanel,
    NodeOutput,
    Splitter,
    WorkflowToolbar,
    TooltipContainer,
  },
  computed: {
    ...mapState("workflow", { workflow: "activeWorkflow" }),
  },
};
</script>

<template>
  <div v-if="workflow" id="workflow-page">
    <WorkflowToolbar id="toolbar" />
    <TooltipContainer id="tooltip-container" />
    <Sidebar id="sidebar" />

    <main class="workflow-area">
      <Splitter id="kanvasOutputSplitter" direction="column">
        <WorkflowPanel id="workflow-panel" />
        <template #secondary>
          <NodeOutput />
        </template>
      </Splitter>
    </main>
  </div>
</template>

<style lang="postcss" scoped>
#workflow-page {
  display: grid;
  grid-template:
    "toolbar toolbar" min-content
    "sidebar workflow" auto
    / min-content auto;
  height: 100%;
  /* background: var(--knime-white);
  color: var(--knime-masala); */
  overflow: hidden;
}

#sidebar {
  grid-area: sidebar;
}

#toolbar {
  grid-area: toolbar;
  height: var(--app-toolbar-height);
  flex: 0 0 auto;
  padding: 10px;
  /* background-color: var(--knime-porcelain); */
  /* border-bottom: 1px solid var(--knime-silver-sand); */
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
</style>
