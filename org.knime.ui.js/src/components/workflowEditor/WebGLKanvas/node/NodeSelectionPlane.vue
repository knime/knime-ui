<script setup lang="ts">
import { computed } from "vue";
import type { GraphicsInst } from "vue3-pixi";

import type { Node, XY } from "@/api/gateway-api/generated-api";
import * as $colors from "@/style/colors";
import * as $shapes from "@/style/shapes";

/**
 * Colored rect that is used as selection plane for nodes
 */

type Props = {
  anchorPosition: XY;
  kind: Node.KindEnum;
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

const config = computed(() => {
  return {
    x: nodeSelectionMeasures.value.x,
    y: nodeSelectionMeasures.value.y,
    width: nodeSelectionMeasures.value.width,
    height: nodeSelectionMeasures.value.height,
    fill: $colors.kanvasNodeSelection.activeBackground,
    stroke: $colors.kanvasNodeSelection.activeBorder,
    strokeWidth: $shapes.selectedNodeStrokeWidth,
    cornerRadius: $shapes.selectedItemBorderRadius,
  };
});

const renderFn = (graphics: GraphicsInst) => {
  graphics.clear();
  graphics.lineStyle(2, $colors.kanvasNodeSelection.activeBorder, 1);
  graphics.beginFill($colors.kanvasNodeSelection.activeBackground);
  graphics.drawRect(0, 0, config.value.width, config.value.height);
  graphics.endFill();
};
</script>

<template>
  <Graphics
    :x="anchorPosition?.x - config.width / 2 + $shapes.nodeSize / 2"
    :y="anchorPosition?.y - config.height / 2 + $shapes.nodeSize / 2"
    @render="renderFn"
  />
</template>
