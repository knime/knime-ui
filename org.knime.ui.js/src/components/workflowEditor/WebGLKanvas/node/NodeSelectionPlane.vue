<script setup lang="ts">
import { computed } from "vue";

import type { Node, XY } from "@/api/gateway-api/generated-api";
import * as $colors from "@/style/colors";
import * as $shapes from "@/style/shapes";
import type { GraphicsInst } from "@/vue3-pixi";

/**
 * Colored rect that is used as selection plane for nodes
 */

type Props = {
  renderable?: boolean;
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
  graphics.roundRect(
    config.value.x,
    config.value.y,
    config.value.width,
    config.value.height,
    $shapes.selectedItemBorderRadius,
  );
  graphics.stroke({
    width: 2,
    color: $colors.kanvasNodeSelection.activeBorder,
  });
  graphics.fill($colors.kanvasNodeSelection.activeBackground);
};
</script>

<template>
  <Graphics
    :x="anchorPosition?.x"
    :y="anchorPosition?.y + $shapes.selectedItemBorderRadius"
    :renderable="renderable"
    @render="renderFn"
  />
</template>
