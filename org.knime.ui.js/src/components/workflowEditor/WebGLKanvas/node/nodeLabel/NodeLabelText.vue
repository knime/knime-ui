<!-- eslint-disable no-magic-numbers -->
<!-- eslint-disable no-undefined -->
<script lang="ts" setup>
import { computed, ref } from "vue";
import { CanvasTextMetrics, FederatedPointerEvent, TextStyle } from "pixi.js";

import { sleep } from "@knime/utils";

import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import * as $colors from "@/style/colors";
import type { GraphicsInst } from "@/vue3-pixi";
import { usePointerDownDoubleClick } from "../../common/usePointerDownDoubleClick";
import { useZoomAwareResolution } from "../../common/useZoomAwareResolution";
import { markEventAsHandled } from "../../util/interaction";
import { nodeLabelText } from "../../util/textStyles";

const props = defineProps<{
  nodeId: string;
  isNodeSelected: boolean;
  label?: string;
}>();

const { resolution } = useZoomAwareResolution();

const nodeInteractionsStore = useNodeInteractionsStore();

const { isPointerDownDoubleClick } = usePointerDownDoubleClick();

const onPointerdown = async (event: FederatedPointerEvent) => {
  markEventAsHandled(event, { initiator: "node-label-edit" });
  if (isPointerDownDoubleClick(event)) {
    // make a brief pause before registering the click outside handler,
    // to avoid closing immediately after opening
    await sleep(50);
    nodeInteractionsStore.openLabelEditor(props.nodeId);
  }
};

const hover = ref(false);

const showEmptyState = computed(
  () => props.isNodeSelected && (!props.label || props.label?.trim() === ""),
);

const label = computed(() =>
  showEmptyState.value ? "Add comment" : props.label!,
);

const labelMeasures = computed(() => {
  return CanvasTextMetrics.measureText(
    label.value,
    new TextStyle(nodeLabelText.styles),
    undefined,
    false,
  );
});

const textStyle = computed<Partial<TextStyle>>(() => {
  if (showEmptyState.value) {
    return {
      ...nodeLabelText.styles,
      fill: $colors.DoveGray,
      fontStyle: "italic",
    };
  }
  return nodeLabelText.styles;
});

const borderPadding = 2;
const renderBorder = (graphics: GraphicsInst) => {
  graphics.clear();
  graphics.rect(
    -labelMeasures.value.width / 2 - borderPadding,
    0,
    labelMeasures.value.width + borderPadding * 2,
    labelMeasures.value.height,
  );
  graphics.stroke($colors.SilverSand);
};
</script>

<template>
  <Container :label="`NodeLabel__${nodeId}`">
    <Text
      :resolution="resolution"
      :style="textStyle"
      :round-pixels="true"
      :x="-labelMeasures.width / 2 + 1"
      event-mode="static"
      @pointerenter="hover = true"
      @pointerleave="hover = false"
      @pointerdown.stop.prevent="onPointerdown"
    >
      {{ label }}
    </Text>
    <Graphics :renderable="hover" @render="renderBorder" />
  </Container>
</template>
