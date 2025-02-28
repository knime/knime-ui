<!-- eslint-disable no-magic-numbers -->
<script setup lang="ts">
import { computed } from "vue";

import type { Node, XY } from "@/api/gateway-api/generated-api";
import * as $colors from "@/style/colors";
import * as $shapes from "@/style/shapes";
import { DashLine } from "@/util/pixiDashedLine";
import type { GraphicsInst } from "@/vue3-pixi";

/**
 * Colored rect that is used as selection plane for nodes
 */

type Props = {
  renderable?: boolean;
  anchorPosition: XY;
  kind: Node.KindEnum;
  showSelection: boolean;
  showFocus: boolean;
  /**
   * Makes the selection plane larger vertically based on this value
   */
  extraHeight?: number;
  width?: number;
};

const props = withDefaults(defineProps<Props>(), {
  width: 0,
  extraHeight: 20,
});

const nodeSelectionMeasures = computed(() => {
  const {
    nodeStatusHeight,
    nodeStatusMarginTop,
    nodeSize,
    nodeSelectionPadding: [top, right, bottom, left],
  } = $shapes;

  const hasStatusBar = props.kind !== "metanode";
  // the selection plane's height has to account for
  // (1) node's size plus the selection padding for top and bottom
  // (2) the height and margin of the node status bar if it's present
  // (3) the provided `extraHeight` prop on the component
  const height =
    top +
    nodeSize +
    bottom +
    (hasStatusBar ? nodeStatusHeight + nodeStatusMarginTop : 0) +
    props.extraHeight;

  const defaultWidth = left + right + nodeSize;
  const width = props.width > defaultWidth ? props.width : defaultWidth;

  return {
    y: -(top + props.extraHeight),
    x: -((width - nodeSize) / 2),
    height,
    width,
  };
});

const position = computed(() => ({
  x: props.anchorPosition?.x,
  y: props.anchorPosition?.y + $shapes.selectedItemBorderRadius,
}));

const selectionPlaneRenderFn = (graphics: GraphicsInst) => {
  graphics.clear();

  graphics.roundRect(
    nodeSelectionMeasures.value.x,
    nodeSelectionMeasures.value.y,
    nodeSelectionMeasures.value.width,
    nodeSelectionMeasures.value.height,
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
    nodeSelectionMeasures.value.x - 4,
    nodeSelectionMeasures.value.y - 4,
    nodeSelectionMeasures.value.width + 8,
    nodeSelectionMeasures.value.height + 8,
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
    label="NodeSelectionPlane"
    :renderable="renderable"
    :visible="renderable && (showFocus || showSelection)"
  >
    <Graphics
      v-if="showFocus"
      :position="position"
      @render="focusPlaneRenderFn"
    />

    <Graphics
      v-if="showSelection"
      :position="position"
      @render="selectionPlaneRenderFn"
    />
  </Container>
</template>
