<script setup lang="ts">
import { KdsButton } from "@knime/kds-components";

import { useAddNodeViaFileUpload } from "@/components/nodeTemplates/useAddNodeViaFileUpload";

const { importFilesViaDialog } = useAddNodeViaFileUpload();
</script>

<template>
  <div class="workflow-actions" @pointerdown.stop>
    <KdsButton
      title="Add node from a local file"
      data-test-id="wf-action-add-node-by-file"
      leading-icon="file-text"
      variant="transparent"
      @pointerdown="importFilesViaDialog"
    />
  </div>
</template>

<style lang="postcss" scoped>
.workflow-actions {
  position: absolute;
  max-height: calc(v-bind("$shapes.floatingCanvasToolsSize") * 1px);
  bottom: calc(v-bind("$shapes.floatingCanvasToolsBottomOffset") * 1px);
  left: calc(v-bind("$shapes.floatingCanvasToolsBottomOffset") * 1px);
  display: flex;
  align-items: center;
  background: var(--knime-white);
  border: 1px solid var(--knime-gray-ultra-light);
  border-radius: 8px;
  box-shadow: var(--shadow-elevation-1);
  z-index: v-bind("$zIndices.layerCanvasDecorations");
  padding: var(--space-4);
}
</style>
