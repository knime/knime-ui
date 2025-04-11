<!-- eslint-disable no-magic-numbers -->
<!-- eslint-disable no-undefined -->
<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";

import { sleep } from "@knime/utils";

import type { XY } from "@/api/gateway-api/generated-api";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { usePointerDownDoubleClick } from "../../common/usePointerDownDoubleClick";
import { useZoomAwareResolution } from "../../common/useZoomAwareResolution";
import { nodeNameText } from "../../util/textStyles";

const props = defineProps<{
  name: string;
  nodeId: string;
  isEditable: boolean;
  position: XY;
}>();

const { resolution } = useZoomAwareResolution();

const nodeInteractionsStore = useNodeInteractionsStore();
const { nameEditorNodeId } = storeToRefs(nodeInteractionsStore);

const isEditing = computed(
  () =>
    nameEditorNodeId.value !== null && nameEditorNodeId.value === props.nodeId,
);

const { isPointerDownDoubleClick } = usePointerDownDoubleClick();

const onPointerdown = async (event: PointerEvent) => {
  if (isPointerDownDoubleClick(event)) {
    // avoid click away to be run
    await sleep(10);
    nodeInteractionsStore.openNameEditor(props.nodeId);
  }
};

// use alpha to prevent flashing
const alpha = ref(1);
watch(isEditing, async (isEdit) => {
  if (isEdit) {
    alpha.value = 0;
  } else {
    await sleep(50);
    alpha.value = 1;
  }
});
</script>

<template>
  <Text
    v-if="!isEditing"
    label="NodeName"
    :position="position"
    :resolution="resolution"
    :style="nodeNameText.styles"
    :alpha="alpha"
    :anchor="{ x: 0.5, y: 1 }"
    :round-pixels="true"
    event-mode="static"
    @pointerdown.stop.prevent="onPointerdown"
  >
    {{ name }}
  </Text>
</template>
