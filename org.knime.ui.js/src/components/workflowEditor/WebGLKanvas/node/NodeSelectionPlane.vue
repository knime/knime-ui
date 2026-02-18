<!-- eslint-disable no-magic-numbers -->
<script setup lang="ts">
import { computed, toRef } from "vue";
import { storeToRefs } from "pinia";

import type { XY } from "@/api/gateway-api/generated-api";
import { geometry } from "@/lib/geometry";
import { DashLine } from "@/lib/pixi-dash-line";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useSelectionStore } from "@/store/selection";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import * as $colors from "@/style/colors";
import * as $shapes from "@/style/shapes";
import type { GraphicsInst } from "@/vue3-pixi";

import { useNodeSelectionPlaneMeasures } from "./useNodeSelectionPlaneMeasures";
import { useNodeNameShortening } from "./useTextShortening";

/**
 * Colored rect that is used as selection plane for nodes
 */

type Props = {
  nodeId: string;
  position: XY;
  name: string;
  isMetanode?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  isMetanode: false,
});

const canvasStore = useWebGLCanvasStore();
const { visibleArea } = storeToRefs(canvasStore);
const renderable = computed(
  () => !geometry.isPointOutsideBounds(props.position, visibleArea.value),
);

const selectionStore = useSelectionStore();
const { shouldHideSelection } = storeToRefs(selectionStore);
const { showSelection, showFocus } =
  selectionStore.getNodeVisualSelectionStates(props.nodeId);

const { metrics: nodeNameDimensions } = useNodeNameShortening(
  toRef(props, "name"),
);

const nodeInteractionsStore = useNodeInteractionsStore();
const { nameEditorNodeId, nameEditorDimensions } = storeToRefs(
  nodeInteractionsStore,
);

const isEditingName = computed(() => nameEditorNodeId.value === props.nodeId);
const { nodeSelectionMeasures: measures } = useNodeSelectionPlaneMeasures({
  extraHeight: () =>
    isEditingName.value
      ? nameEditorDimensions.value.height
      : nodeNameDimensions.value.height,
  isMetanode: props.isMetanode,
  width: () =>
    isEditingName.value
      ? nameEditorDimensions.value.width
      : $shapes.nodeNameHorizontalMargin * 2,
});

const selectionPlaneRenderFn = (graphics: GraphicsInst) => {
  graphics.clear();

  graphics.roundRect(
    measures.value.x,
    measures.value.y,
    measures.value.width,
    measures.value.height,
    $shapes.selectedItemBorderRadius,
  );
  graphics.stroke({
    width: $shapes.selectedNodeStrokeWidth,
    color: $colors.kanvasNodeSelection.activeBorder,
  });
  graphics.fill($colors.kanvasNodeSelection.activeBackground);
};

const focusPlaneRenderFn = (graphics: GraphicsInst) => {
  graphics.clear();
  const dash = new DashLine(graphics, { dash: [5, 5] });

  dash.roundRect(
    measures.value.x - 4,
    measures.value.y - 4,
    measures.value.width + 8,
    measures.value.height + 8,
    $shapes.selectedItemBorderRadius,
  );

  graphics.stroke({
    width: $shapes.selectedNodeStrokeWidth,
    color: $colors.kanvasNodeSelection.activeBorder,
  });
};
</script>

<template>
  <Container
    :label="`NodeSelectionPlane__${nodeId}`"
    :renderable="
      renderable && (showFocus || showSelection) && !shouldHideSelection
    "
    :visible="
      renderable && (showFocus || showSelection) && !shouldHideSelection
    "
    :position="{
      x: position.x,
      y: position.y + $shapes.selectedItemBorderRadius,
    }"
    event-mode="none"
  >
    <Graphics
      v-if="showFocus"
      label="NodeSelectionPlaneFocusRing"
      @render="focusPlaneRenderFn"
    />

    <Graphics
      v-if="showSelection"
      label="NodeSelectionPlaneSelectionRing"
      @render="selectionPlaneRenderFn"
    />
  </Container>
</template>
