<!-- eslint-disable no-magic-numbers -->
<!-- eslint-disable no-undefined -->
<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";

import { sleep } from "@knime/utils";

import type { XY } from "@/api/gateway-api/generated-api";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";

import NodeLabelText from "./NodeLabelText.vue";

const props = defineProps<{
  label?: string;
  nodeId: string;
  isNodeSelected: boolean;
  position: XY;
}>();

const nodeInteractionsStore = useNodeInteractionsStore();
const { labelEditorNodeId } = storeToRefs(nodeInteractionsStore);

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
    :position="position"
    :label="label"
    :node-id="nodeId"
    :is-node-selected="isNodeSelected"
  />
</template>
