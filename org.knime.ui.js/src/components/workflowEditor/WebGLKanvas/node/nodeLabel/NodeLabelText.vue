<!-- eslint-disable no-magic-numbers -->
<!-- eslint-disable no-undefined -->
<script lang="ts" setup>
import { computed, ref } from "vue";
import { CanvasTextMetrics, Graphics, TextStyle } from "pixi.js";

import { sleep } from "@knime/utils";

import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { DoveGray, SilverSand } from "@/style/colors";
import type { GraphicsInst } from "@/vue3-pixi";
import { usePointerDownDoubleClick } from "../../common/usePointerDownDoubleClick";
import { useZoomAwareResolution } from "../../common/useZoomAwareResolution";
import { nodeLabelText } from "../../util/textStyles";

const props = defineProps<{
  label?: string;
  nodeId: string;
  isNodeSelected: boolean;
}>();

const { resolution } = useZoomAwareResolution();

const nodeInteractionsStore = useNodeInteractionsStore();

const { isPointerDownDoubleClick } = usePointerDownDoubleClick();

const onPointerdown = async (event: PointerEvent) => {
  if (isPointerDownDoubleClick(event)) {
    // avoid click away to be run
    await sleep(10);
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
      fill: DoveGray,
      fontStyle: "italic",
    };
  }
  return nodeLabelText.styles;
});

const renderBorder = (graphics: GraphicsInst) => {
  graphics.clear();
  const doublePadding = nodeLabelText.styles.padding! * 2;
  if (hover.value) {
    graphics.rect(
      -labelMeasures.value.width / 2 - doublePadding - 1,
      -doublePadding,
      labelMeasures.value.width + doublePadding,
      labelMeasures.value.height + doublePadding,
    );
    graphics.stroke(SilverSand);
  }
};
</script>

<template>
  <Container>
    <Text
      ref="text"
      label="NodeLabel"
      :resolution="resolution"
      :style="textStyle"
      :anchor="{ x: 0.5, y: 0 }"
      :round-pixels="true"
      event-mode="static"
      @pointerenter="hover = true"
      @pointerleave="hover = false"
      @pointerdown.stop.prevent="onPointerdown"
    >
      {{ label }}
    </Text>
    <Graphics @render="renderBorder" />
  </Container>
</template>
