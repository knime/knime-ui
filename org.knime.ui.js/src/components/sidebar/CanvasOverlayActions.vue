<script setup lang="ts">
import { ref, useTemplateRef } from "vue";
import { storeToRefs } from "pinia";
import { onClickOutside } from "@vueuse/core";

import { KdsToggleButton } from "@knime/kds-components";

import NodeRepository from "@/components/nodeRepository/NodeRepository.vue";
import { useCurrentCanvasStore } from "@/store/canvas/useCurrentCanvasStore";
import { useUIControlsStore } from "@/store/uiControls/uiControls";
import { useAnnotationInteractionsStore } from "@/store/workflow/annotationInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { freeSpaceInCanvas } from "@/lib/workflow-canvas";
import {
  defaultAddWorkflowAnnotationHeight,
  defaultAddWorkflowAnnotationWidth,
} from "@/style/shapes";

import AddToCanvasPopover from "./AddToCanvasPopover.vue";

const workflowStore = useWorkflowStore();
const { activeWorkflow } = storeToRefs(workflowStore);
const uiControls = useUIControlsStore();

// popover open state
const nodeRepoOpen = ref(false);
const addFilesOpen = ref(false);

// refs for click-outside detection
const nodeRepoWrap = useTemplateRef<HTMLElement>("nodeRepoWrap");
const addFilesWrap = useTemplateRef<HTMLElement>("addFilesWrap");

onClickOutside(nodeRepoWrap, () => {
  nodeRepoOpen.value = false;
});
onClickOutside(addFilesWrap, () => {
  addFilesOpen.value = false;
});

const addAnnotation = () => {
  if (!activeWorkflow.value) return;
  const center = freeSpaceInCanvas.aroundCenterWithFallback({
    visibleFrame: useCurrentCanvasStore().value.getVisibleFrame,
    nodes: activeWorkflow.value.nodes,
  });
  useAnnotationInteractionsStore().addWorkflowAnnotation({
    bounds: {
      x: center.x,
      y: center.y,
      width: defaultAddWorkflowAnnotationWidth,
      height: defaultAddWorkflowAnnotationHeight,
    },
  });
};
</script>

<template>
  <div
    v-if="activeWorkflow && uiControls.canEditWorkflow"
    class="canvas-overlay-actions"
  >
    <!-- Add group -->
    <div class="action-group">

      <!-- + node repo button with inline popover -->
      <div ref="nodeRepoWrap" class="btn-wrap">
        <KdsToggleButton
          :model-value="nodeRepoOpen"
          leading-icon="plus"
          title="Add nodes"
          variant="transparent"
          size="medium"
          aria-label="Add nodes"
          @update:model-value="nodeRepoOpen = !nodeRepoOpen"
        />
        <div v-if="nodeRepoOpen" class="popover node-repo-popover">
          <NodeRepository />
        </div>
      </div>

      <!-- Upload / add files with popover -->
      <div ref="addFilesWrap" class="btn-wrap">
        <KdsToggleButton
          :model-value="addFilesOpen"
          leading-icon="cloud-upload"
          title="Add to canvas"
          variant="transparent"
          size="medium"
          aria-label="Add files or integrations to canvas"
          @update:model-value="addFilesOpen = !addFilesOpen"
        />
        <AddToCanvasPopover
          v-if="addFilesOpen"
          class="popover add-files-popover"
          @close="addFilesOpen = false"
        />
      </div>

      <!-- Add annotation -->
      <KdsToggleButton
        :model-value="false"
        leading-icon="annotation-mode"
        title="Add annotation"
        variant="transparent"
        size="medium"
        aria-label="Add workflow annotation"
        :disabled="!workflowStore.isWritable"
        @update:model-value="addAnnotation"
      />
    </div>

  </div>
</template>

<style lang="postcss" scoped>
.canvas-overlay-actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--kds-spacing-container-0-25x);
  background-color: var(--kds-color-surface-default);
  border-radius: var(--kds-border-radius-container-0-50x);
  box-shadow: var(--shadow-elevation-1);
  padding: var(--kds-spacing-container-0-25x);
}

.action-group {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--kds-spacing-container-0-25x);
}

.btn-wrap {
  position: relative;
}

/* popovers drop below the toolbar */
.popover {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
}

.node-repo-popover {
  width: 320px;
  height: 480px;
  overflow: hidden;
  background-color: var(--kds-color-surface-default);
  border-radius: var(--kds-border-radius-container-0-50x);
  box-shadow: var(--kds-elevation-level-3);
  display: flex;
  flex-direction: column;
}

.add-files-popover {
  width: 380px;
}
</style>
