<script setup lang="ts">
import { computed } from "vue";

import TooltipContainer from "@/components/application/TooltipContainer.vue";
import SplitPanel from "@/components/common/SplitPanel.vue";
import Sidebar from "@/components/sidebar/Sidebar.vue";
import WorkflowToolbar from "@/components/toolbar/WorkflowToolbar.vue";
import NodeOutput from "@/components/uiExtensions/NodeOutput.vue";
import { useSettingsStore } from "@/store/settings";
import { useWorkflowStore } from "@/store/workflow/workflow";

import WorkflowPanel from "./WorkflowPanel.vue";

/**
 * Component that acts as a router page to render the workflow
 */
const workflowStore = useWorkflowStore();
const settingsStore = useSettingsStore();

const savedSecondarySize = computed({
  get() {
    return settingsStore.settings.nodeOutputSize;
  },
  set(value: number) {
    settingsStore.updateSetting({
      key: "nodeOutputSize",
      value,
    });
  },
});
</script>

<template>
  <div
    v-if="workflowStore.activeWorkflow && !workflowStore.error"
    id="workflow-page"
  >
    <WorkflowToolbar id="toolbar" />
    <TooltipContainer id="tooltip-container" />
    <Sidebar id="sidebar" />

    <main class="workflow-area">
      <SplitPanel
        v-model:secondary-size="savedSecondarySize"
        splitter-id="node-output-split-panel"
        direction="down"
        :secondary-max-size="90"
        :secondary-snap-size="15"
      >
        <WorkflowPanel id="workflow-panel" />
        <template #secondary>
          <NodeOutput />
        </template>
      </SplitPanel>
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
  background: var(--knime-white);
  color: var(--knime-masala);
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
  overflow: hidden;
}
</style>
