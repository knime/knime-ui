<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";

import { SplitPanel } from "@knime/components";

import TooltipContainer from "@/components/application/TooltipContainer.vue";
import LayoutEditorDialog from "@/components/layoutEditor/LayoutEditorDialog.vue";
import Sidebar from "@/components/sidebar/Sidebar.vue";
import WorkflowToolbar from "@/components/toolbar/WorkflowToolbar.vue";
import NodeOutput from "@/components/uiExtensions/NodeOutput.vue";
import { usePanelStore } from "@/store/panel";
import { useSettingsStore } from "@/store/settings";
import { useWorkflowStore } from "@/store/workflow/workflow";

import CommandPanel from "./CommandPanel.vue";
import WorkflowPanel from "./WorkflowPanel.vue";

/**
 * Component that acts as a router page to render the workflow
 */
const workflowStore = useWorkflowStore();
const settingsStore = useSettingsStore();
const expanded = ref(true);

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

const { isCommandPanelVisible } = storeToRefs(usePanelStore());
</script>

<template>
  <div
    v-if="workflowStore.activeWorkflow && !workflowStore.error"
    id="workflow-page"
  >
    <WorkflowToolbar id="toolbar" />
    <TooltipContainer id="tooltip-container" />
    <Sidebar id="sidebar" />
    <CommandPanel v-if="isCommandPanelVisible" />

    <main class="workflow-area">
      <SplitPanel
        v-model:expanded="expanded"
        v-model:secondary-size="savedSecondarySize"
        class="split-panel"
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

    <LayoutEditorDialog />
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

.split-panel {
  --z-index-common-splitter: v-bind("$zIndices.layerStaticPanelDecorations");
}
</style>
