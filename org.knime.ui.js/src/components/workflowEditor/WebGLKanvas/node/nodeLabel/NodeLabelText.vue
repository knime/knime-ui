<!-- eslint-disable no-magic-numbers -->
<!-- eslint-disable no-undefined -->
<script lang="ts" setup>
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { FederatedPointerEvent, Text, TextStyle } from "pixi.js";

import { navigatorUtils, sleep } from "@knime/utils";

import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import * as $colors from "@/style/colors";
import { nodeSize } from "@/style/shapes";
import type { GraphicsInst } from "@/vue3-pixi";
import { usePointerDownDoubleClick } from "../../common/usePointerDownDoubleClick";
import { markPointerEventAsHandled } from "../../util/interaction";
import { nodeLabelText } from "../../util/textStyles";
import { useNodeLabelShortening } from "../useTextShortening";

import { getNodeLabelTopOffset } from "./getNodeLabelTopOffset";

const emit = defineEmits<{
  rightclick: [FederatedPointerEvent];
  pointerdown: [FederatedPointerEvent];
}>();

const props = defineProps<{
  nodeId: string;
  isNodeSelected: boolean;
  isMetanode: boolean;
  label?: string;
}>();

const { zoomAwareResolution } = storeToRefs(useWebGLCanvasStore());

const nodeInteractionsStore = useNodeInteractionsStore();

const { isPointerDownDoubleClick } = usePointerDownDoubleClick();

const onPointerdown = async (event: FederatedPointerEvent) => {
  const isDoubleClick = isPointerDownDoubleClick(event);
  if (isDoubleClick) {
    // label is positioned outside the node interaction container, so we need to
    // mark it as handled always
    markPointerEventAsHandled(event, { initiator: "node-label-edit" });
    // make a brief pause before registering the click outside handler,
    // to avoid closing immediately after opening
    await sleep(50);
    nodeInteractionsStore.openLabelEditor(props.nodeId);
  } else {
    // however, if it's a simple click, we emit it to the Node and it will be
    // marked as handled there
    emit("pointerdown", event);
  }
};

const isHovered = ref(false);

const showEmptyState = computed(
  () => props.isNodeSelected && (!props.label || props.label?.trim() === ""),
);

const label = computed(() =>
  showEmptyState.value
    ? "Add comment"
    : props.label?.replaceAll("\r\n", "\n") ?? "",
);

const { shortenedText, metrics: labelMeasures } = useNodeLabelShortening(label);

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

const textX = computed(() => nodeSize / 2 - labelMeasures.value.width / 2 - 1);

const textY = computed(() => {
  const baseYOffset = props.isMetanode ? nodeSize + 12 : nodeSize * 2;

  return (
    baseYOffset +
    getNodeLabelTopOffset(props.nodeId) +
    (navigatorUtils.isMac() ? 1 : -0.5)
  );
});

const borderPadding = 2;
const renderBorder = (graphics: GraphicsInst) => {
  graphics.clear();
  graphics.rect(
    textX.value - borderPadding,
    textY.value,
    labelMeasures.value.width + borderPadding * 2,
    labelMeasures.value.height + 3,
  );
  graphics.stroke({ color: $colors.SilverSand, width: 1.3 });
};
</script>

<template>
  <Container :label="`NodeLabel__${nodeId}`">
    <Text
      label="NodeLabelText"
      :resolution="zoomAwareResolution"
      :style="textStyle"
      :round-pixels="true"
      :x="textX"
      :y="textY"
      event-mode="static"
      @rightclick="emit('rightclick', $event)"
      @pointerenter="isHovered = true"
      @pointerleave="isHovered = false"
      @pointerdown.stop.prevent="onPointerdown"
    >
      {{ shortenedText }}
    </Text>
    <Graphics :renderable="isHovered" @render="renderBorder" />
  </Container>
</template>
