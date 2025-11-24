<!-- eslint-disable no-magic-numbers -->
<!-- eslint-disable no-undefined -->
<script lang="ts" setup>
import { computed, ref, useTemplateRef, watch } from "vue";
import { storeToRefs } from "pinia";
import type { CanvasTextMetrics, FederatedPointerEvent } from "pixi.js";

import { sleep } from "@knime/utils";

import { useTooltip } from "@/components/workflowEditor/WebGLKanvas/tooltip/useTooltip";
import type { TooltipDefinition } from "@/components/workflowEditor/types";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import type { Container } from "pixi.js";
import { usePointerDownDoubleClick } from "../../common/usePointerDownDoubleClick";
import { markPointerEventAsHandled } from "../../util/interaction";
import { nodeNameText } from "../../util/textStyles";

const props = defineProps<{
  name: string;
  fullName: string;
  nodeId: string;
  isEditable: boolean;
  metrics: CanvasTextMetrics;
}>();

const canvasStore = useWebGLCanvasStore();
const { zoomAwareResolution } = storeToRefs(canvasStore);

const nodeInteractionsStore = useNodeInteractionsStore();
const { nameEditorNodeId } = storeToRefs(nodeInteractionsStore);

const isEditing = computed(
  () =>
    nameEditorNodeId.value !== null && nameEditorNodeId.value === props.nodeId,
);

const { isPointerDownDoubleClick } = usePointerDownDoubleClick();

const onPointerdown = async (event: FederatedPointerEvent) => {
  if (isPointerDownDoubleClick(event)) {
    // stop to prevent handling of double click action on the node itself
    // e.g opening a metanode
    event.stopPropagation();

    markPointerEventAsHandled(event, { initiator: "node-name-edit" });

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

const tooltip = computed<TooltipDefinition | null>(() => {
  if (props.fullName === props.name) {
    return null;
  }
  return {
    position: {
      x: props.metrics.width / 2,
      y: 0,
    },
    gap: 4,
    orientation: "bottom",
    text: props.fullName ?? "",
  };
});

const tooltipRef = useTemplateRef<Container>("tooltipRef");
const { showTooltip, hideTooltip } = useTooltip({
  element: tooltipRef,
  tooltip,
});
</script>

<template>
  <Container ref="tooltipRef" label="NodeName" event-mode="static">
    <Text
      v-if="!isEditing"
      ref="tooltipRef"
      event-mode="static"
      label="NodeNameText"
      :resolution="zoomAwareResolution"
      :style="nodeNameText.styles"
      :alpha="alpha"
      :round-pixels="true"
      :x="-metrics.width / 2 + 1.2"
      :y="-metrics.height"
      @pointerdown.prevent="isEditable && onPointerdown($event)"
      @pointerenter="showTooltip"
      @pointerleave="hideTooltip"
    >
      {{ name }}
    </Text>
  </Container>
</template>
