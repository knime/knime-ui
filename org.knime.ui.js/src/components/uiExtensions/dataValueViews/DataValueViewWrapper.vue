<script setup lang="ts">
import { FunctionButton } from "@knime/components";
import CloseIcon from "@knime/styles/img/icons/close.svg";

import DataValueViewLoader, {
  type Props as DataValueViewLoaderProps,
} from "./DataValueViewLoader.vue";

export type Props = DataValueViewLoaderProps & {
  isDragging: boolean;
};

defineProps<Props>();
const emit = defineEmits(["close"]);
</script>

<template>
  <div class="data-value-view-element" draggable>
    <FunctionButton compact class="close-button" @click="() => emit('close')">
      <CloseIcon />
    </FunctionButton>
    <DataValueViewLoader
      :tabindex="-1"
      class="data-value-view-loader"
      :style="isDragging ? { pointerEvents: 'none' } : {}"
      :project-id="projectId"
      :workflow-id="workflowId"
      :node-id="nodeId"
      :selected-port-index="selectedPortIndex"
      :selected-row-index="selectedRowIndex"
      :selected-col-index="selectedColIndex"
    />
  </div>
</template>

<style lang="postcss" scoped>
.data-value-view-element {
  z-index: 20;
  border-radius: 8px;
  width: 720px;
  height: 400px;
  background-color: var(--knime-porcelain);
  box-shadow: var(--shadow-elevation-2);
  padding: var(--space-32) var(--space-8) var(--space-8);
  cursor: move;

  & .close-button {
    position: absolute;
    top: var(--space-4);
    right: var(--space-4);
  }

  & .data-value-view-loader {
    border-radius: 8px;
  }
}
</style>
