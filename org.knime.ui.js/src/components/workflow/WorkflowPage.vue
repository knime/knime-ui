<script setup lang="ts">
import { computed } from "vue";
import { useStore } from "@/composables/useStore";

import SplitPanel from "@/components/common/SplitPanel.vue";
import DownloadAPButton from "@/components/common/DownloadAPButton.vue";
import Sidebar from "@/components/sidebar/Sidebar.vue";
import NodeOutput from "@/components/uiExtensions/NodeOutput.vue";
import TooltipContainer from "@/components/application/TooltipContainer.vue";
import WorkflowToolbar from "@/components/toolbar/WorkflowToolbar.vue";
import WorkflowPanel from "@/components/workflow/WorkflowPanel.vue";

/**
 * Component that acts as a router page to render the workflow
 */
const store = useStore();

const showDownloadButton = computed(
  () => store.state.application.permissions.showFloatingDownloadButton,
);

const workflow = computed(() => store.state.workflow.activeWorkflow);
const savedSecondarySize = computed({
  get() {
    return store.state.settings.settings.nodeOutputSize;
  },
  set(value: number) {
    store.dispatch("settings/updateSetting", {
      key: "nodeOutputSize",
      value,
    });
  },
});
</script>

<template>
  <div v-if="workflow" id="workflow-page">
    <WorkflowToolbar id="toolbar" />
    <TooltipContainer id="tooltip-container" />
    <Sidebar id="sidebar" />
    <DownloadAPButton
      v-if="showDownloadButton"
      src="floating-action-button"
      class="floating-download-button"
    />

    <main class="workflow-area">
      <SplitPanel
        v-model:secondary-size="savedSecondarySize"
        direction="down"
        :secondary-max-size="90"
        :secondary-snap-size="20"
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

.floating-download-button {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
  box-shadow: var(--shadow-elevation-2);
}
</style>
