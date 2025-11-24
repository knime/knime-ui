<script setup lang="ts">
import { computed, toRefs } from "vue";
import { storeToRefs } from "pinia";
import type { Graphics } from "pixi.js";

import type { XY } from "@/api/gateway-api/generated-api";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useSelectionStore } from "@/store/selection";
import { useMovingStore } from "@/store/workflow/moving";
import * as $colors from "@/style/colors";
import { geometry } from "@/util/geometry";
import { useConnectorPathSegments } from "../../common/useConnectorPathSegments";
import type { AbsolutePointTuple, ConnectorProps } from "../../types";
import { measureText } from "../util/measureText";
import { connectorLabelText } from "../util/textStyles";

type ConnectorLabelProps = {
  label?: string;
};

const props = withDefaults(
  defineProps<ConnectorProps<AbsolutePointTuple> & ConnectorLabelProps>(),
  {
    label: "",
    bendpoints: () => [],
    sourceNode: null,
    sourcePort: null,
    destNode: null,
    destPort: null,
    absolutePoint: null,
    interactive: true,
  },
);

// offset so that label appears above connector segment in most cases (straight horizontal lines)
const OFFSET_Y = 16;

const { isDragging, movePreviewDelta } = storeToRefs(useMovingStore());
const { isNodeSelected } = useSelectionStore();

const {
  sourceNode,
  sourcePort,
  destNode,
  destPort,
  absolutePoint,
  bendpoints,
} = toRefs(props);

const isSourceNodeSelected = computed(() =>
  isNodeSelected(props.sourceNode ?? ""),
);
const isDestNodeSelected = computed(() => isNodeSelected(props.destNode ?? ""));

const isConnectedToExactlyOneSelectedNode = computed(
  () => isSourceNodeSelected.value !== isDestNodeSelected.value,
);

const rawLabelMetrics = computed(() => {
  if (props.label) {
    return measureText(props.label, connectorLabelText.styles);
  }
  return { width: 0, height: 0 };
});

const labelWidth = computed(() => {
  return rawLabelMetrics.value.width;
});

const labelHeight = computed(() => {
  return rawLabelMetrics.value.height;
});

const { pathSegments, startSegmentPosition, endSegmentPosition } =
  useConnectorPathSegments({
    id: props.id,
    sourceNode,
    sourcePort,
    destNode,
    destPort,
    absolutePoint,
    bendpoints,
  });

const getLabelPosition = (start: XY, end: XY, offset: XY): XY => {
  const { x: startX, y: startY } = start;
  const { x: endX, y: endY } = end;

  const offsetX = isConnectedToExactlyOneSelectedNode.value
    ? offset.x
    : offset.x * 2;
  const offsetY = isConnectedToExactlyOneSelectedNode.value
    ? offset.y
    : offset.y * 2;

  return {
    x: startX + (endX - startX + offsetX) / 2 - labelWidth.value / 2,
    y:
      startY + (endY - startY + offsetY) / 2 - OFFSET_Y - labelHeight.value / 2,
  };
};

const isConnectionAffectedByDrag = computed(
  () =>
    isDragging.value &&
    (isNodeSelected(props.sourceNode ?? "") ||
      isNodeSelected(props.destNode ?? "")),
);

const halfWayPosition = computed(() => {
  // Calculates the middle point and subtracts half of the length of the text element

  const startX = startSegmentPosition.value.x;
  const startY = startSegmentPosition.value.y;
  const endX = endSegmentPosition.value.x;
  const endY = endSegmentPosition.value.y;

  if (bendpoints.value.length > 0) {
    // When there are bendpoints we cannot predict the curve of the connection path
    // therefore, to place the label, we must:
    // (1) Find the main path's center, which is the center point of the vector between the
    // source port's coords (x, y) and the destination port's coords (x, y)
    const mainPathCenter = geometry.utils.getCenterPoint(
      { x: startX, y: startY },
      { x: endX, y: endY },
    );

    // (2) For every path segment we have (determined by the bendpoints) we try to find the
    // closest distance to the main path's center. To do so, we optimize for the smallest delta possible using
    // the euclidean distance when compared with the segment's center point (x, y)
    const { index: centermostPathSegmentIndex } = pathSegments.value.reduce(
      (acc, segment, index) => {
        const segmentCenter = geometry.utils.getCenterPoint(
          segment.start,
          segment.end,
        );

        const deltaCenter = geometry.utils.distanceBetweenPoints(
          mainPathCenter.x,
          mainPathCenter.y,
          segmentCenter.x,
          segmentCenter.y,
        );

        const minDelta = Math.min(deltaCenter);

        if (minDelta < acc.x) {
          acc.index = index;
          acc.x = minDelta;
        }

        return acc;
      },
      { x: Infinity, index: -1 },
    );

    // Once we have the segment which is "closest" to the center, we place the label
    // with respect to it
    const centermostSegment = pathSegments.value[centermostPathSegmentIndex];

    return getLabelPosition(centermostSegment.start, centermostSegment.end, {
      x: 0,
      y: 0,
    });
  }

  const offset = isConnectionAffectedByDrag.value
    ? movePreviewDelta.value
    : { x: 0, y: 0 };

  return getLabelPosition(
    { x: startX, y: startY },
    { x: endX, y: endY },
    offset,
  );
});

const { zoomAwareResolution } = storeToRefs(useWebGLCanvasStore());

const renderLabelBackground = (graphics: Graphics) => {
  const padding = 5;
  const borderRadius = 2;
  graphics
    .clear()
    .roundRect(
      halfWayPosition.value.x - padding,
      halfWayPosition.value.y - padding,
      labelWidth.value + padding * 2,
      labelHeight.value + padding * 2,
      borderRadius,
    )
    .fill($colors.Masala);
};
</script>

<template>
  <Container v-if="label.length > 0" label="ConnectorLabel">
    <Graphics
      label="ConnectorLabelBackground"
      @render="renderLabelBackground"
    />
    <Text
      ref="tooltipRef"
      label="ConnectorLabelText"
      :round-pixels="true"
      :resolution="zoomAwareResolution"
      :style="connectorLabelText.styles"
      :x="halfWayPosition.x"
      :y="halfWayPosition.y"
    >
      {{ label }}
    </Text>
  </Container>
</template>
