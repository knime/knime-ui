<script setup lang="ts">
import { computed, ref } from "vue";
import { debounce } from "lodash-es";

import { SplitPanel } from "@knime/components";

import LayoutEditorDialog from "@/components/layoutEditor/LayoutEditorDialog.vue";
import Sidebar from "@/components/sidebar/Sidebar.vue";
import WorkflowToolbar from "@/components/toolbar/WorkflowToolbar.vue";
import NodeOutput from "@/components/uiExtensions/NodeOutput.vue";
import TooltipContainer from "@/components/workflowEditor/SVGKanvas/tooltip/TooltipContainer.vue";
import { useSettingsStore } from "@/store/settings";
import { useWorkflowStore } from "@/store/workflow/workflow";

import WorkflowPanel from "./WorkflowPanel.vue";
import { useCanvasRendererUtils } from "./util/canvasRenderer";

/**
 * Component that acts as a router page to render the workflow
 */
const workflowStore = useWorkflowStore();
const expanded = ref(true);

const { isSVGRenderer } = useCanvasRendererUtils();

const settingsStore = useSettingsStore();
// eslint-disable-next-line no-magic-numbers
const debouncedUpdateSetting = debounce(settingsStore.updateSetting, 5000);

const savedSecondarySize = computed({
  get() {
    return settingsStore.settings.nodeOutputSize;
  },
  set(value: number) {
    debouncedUpdateSetting({ key: "nodeOutputSize", value });
  },
});
</script>

<template>
  <div
    v-if="workflowStore.activeWorkflow && !workflowStore.error"
    id="workflow-page"
  >
    <WorkflowToolbar id="toolbar" />
    <TooltipContainer v-if="isSVGRenderer" id="tooltip-container" />
    <Sidebar id="sidebar" />

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
<<<<<<< HEAD
<<<<<<< HEAD
  padding: 10px;
  background-color: var(--kds-color-surface-default);
=======
  padding: var(--kds-spacing-container-0-5x);
  background-color: var(--knime-porcelain);
>>>>>>> 159b92329 (NXT-4173: Tokenise workflow toolbar)
=======
  background-color: var(--kds-color-surface-default);
  padding: var(--kds-spacing-container-0-5x);
<<<<<<< HEAD
>>>>>>> adde9191c (NXT-4173: Add button border-radius fallback)
  border-bottom: 1px solid var(--knime-silver-sand);
=======
  border-bottom: var(--kds-border-base-muted);
>>>>>>> db7cbcf16 (NXT-4173: Refine css)
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
