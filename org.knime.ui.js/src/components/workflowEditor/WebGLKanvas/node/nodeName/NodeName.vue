<!-- eslint-disable no-magic-numbers -->
<!-- eslint-disable no-undefined -->
<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import type { CanvasTextMetrics, FederatedPointerEvent } from "pixi.js";

import { sleep } from "@knime/utils";

import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { usePointerDownDoubleClick } from "../../common/usePointerDownDoubleClick";
import { useZoomAwareResolution } from "../../common/useZoomAwareResolution";
import { markEventAsHandled } from "../../util/interaction";
import { nodeNameText } from "../../util/textStyles";

const props = defineProps<{
  name: string;
  nodeId: string;
  isEditable: boolean;
  metrics: CanvasTextMetrics;
}>();

const { resolution } = useZoomAwareResolution();

const nodeInteractionsStore = useNodeInteractionsStore();
const { nameEditorNodeId } = storeToRefs(nodeInteractionsStore);

const isEditing = computed(
  () =>
    nameEditorNodeId.value !== null && nameEditorNodeId.value === props.nodeId,
);

const { isPointerDownDoubleClick } = usePointerDownDoubleClick();

const onPointerdown = async (event: FederatedPointerEvent) => {
  markEventAsHandled(event, { initiator: "node-name-edit" });
  if (isPointerDownDoubleClick(event)) {
    // stop to prevent handling of double click action on the node itself
    // e.g opening a metanode
    event.stopPropagation();
    // make a brief pause before registering the click outside handler,
    // to avoid closing immediately after opening
    await sleep(50);
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
  <Container label="NodeName">
    <Text
      v-if="!isEditing"
      :resolution="resolution"
      :style="nodeNameText.styles"
      :alpha="alpha"
      :round-pixels="true"
      :x="-metrics.width / 2 + 1.2"
      :y="-metrics.height"
      event-mode="static"
      @pointerdown.prevent="isEditable && onPointerdown($event)"
    >
      {{ name }}
    </Text>
  </Container>
</template>
