<!-- eslint-disable no-magic-numbers -->
<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import type { FederatedPointerEvent } from "pixi.js";

import { sleep } from "@knime/utils";

import { useSelectionStore } from "@/store/selection";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";

import NodeLabelText from "./NodeLabelText.vue";

const emit = defineEmits<{
  rightclick: [FederatedPointerEvent];
  pointerdown: [FederatedPointerEvent];
}>();

const props = defineProps<{
  nodeId: string;
  label?: string;
}>();

const nodeInteractionsStore = useNodeInteractionsStore();
const { labelEditorNodeId } = storeToRefs(nodeInteractionsStore);
const { singleSelectedNode } = storeToRefs(useSelectionStore());

const isSelected = computed(
  () => props.nodeId === singleSelectedNode.value?.id,
);

const isEditing = computed(
  () =>
    labelEditorNodeId.value !== null &&
    labelEditorNodeId.value === props.nodeId,
);

const showText = ref(!isEditing.value);

// prevent flashing and missing style updates
watch(isEditing, async () => {
  if (isEditing.value) {
    showText.value = false;
    return;
  }
  await sleep(50);
  showText.value = true;
});
</script>

<template>
  <NodeLabelText
    v-if="showText"
    :label="label"
    :node-id="nodeId"
    :is-node-selected="isSelected"
    @rightclick="emit('rightclick', $event)"
    @pointerdown="emit('pointerdown', $event)"
  />
</template>
