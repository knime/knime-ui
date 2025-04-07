<!-- eslint-disable no-magic-numbers -->
<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import type { XY } from "@/api/gateway-api/generated-api";
import { useSelectionStore } from "@/store/selection";
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
  showSelection: boolean;
  showFocus: boolean;
  measures: XY & { width: number; height: number };
};

const { shouldHideSelection } = storeToRefs(useSelectionStore());

const props = defineProps<Props>();

const position = computed(() => ({
  x: props.anchorPosition?.x,
  y: props.anchorPosition?.y + $shapes.selectedItemBorderRadius,
}));

const selectionPlaneRenderFn = (graphics: GraphicsInst) => {
  graphics.clear();

  graphics.roundRect(
    props.measures.x,
    props.measures.y,
    props.measures.width,
    props.measures.height,
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
    props.measures.x - 4,
    props.measures.y - 4,
    props.measures.width + 8,
    props.measures.height + 8,
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
    :visible="
      renderable && (showFocus || showSelection) && !shouldHideSelection
    "
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
