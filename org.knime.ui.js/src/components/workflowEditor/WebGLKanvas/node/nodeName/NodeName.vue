<!-- eslint-disable no-magic-numbers -->
<!-- eslint-disable no-undefined -->
<script lang="ts" setup>
import { computed, ref, useTemplateRef, watch } from "vue";
import { storeToRefs } from "pinia";
import type { CanvasTextMetrics, FederatedPointerEvent } from "pixi.js";

import { sleep } from "@knime/utils";

import { useTooltip } from "@/components/workflowEditor/common/useTooltip";
import type { TooltipDefinition } from "@/components/workflowEditor/types";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import type { ContainerInst } from "@/vue3-pixi";
import { usePointerDownDoubleClick } from "../../common/usePointerDownDoubleClick";
import { useZoomAwareResolution } from "../../common/useZoomAwareResolution";
import { markPointerEventAsHandled } from "../../util/interaction";
import { nodeNameText } from "../../util/textStyles";

const props = defineProps<{
  name: string;
  fullName: string;
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

useTooltip({ tooltip, element: useTemplateRef<ContainerInst>("tooltipRef") });
</script>

<template>
  <Container ref="tooltipRef" label="NodeName" event-mode="static">
    <Text
      v-if="!isEditing"
      ref="tooltipRef"
      event-mode="static"
      label="NodeNameText"
      :resolution="resolution"
      :style="nodeNameText.styles"
      :alpha="alpha"
      :round-pixels="true"
      :x="-metrics.width / 2 + 1.2"
      :y="-metrics.height"
      @pointerdown.prevent="isEditable && onPointerdown($event)"
    >
      {{ name }}
    </Text>
  </Container>
</template>
