<script setup lang="ts">
import { computed, toRefs } from "vue";

import type { XY } from "@/api/gateway-api/generated-api";
import { useStore } from "@/composables/useStore";
import { geometry } from "@/util/geometry";

import type { ConnectorProps } from "./types";
import { useConnectorPathSegments } from "./useConnectorPathSegments";

type ConnectorLabelProps = {
  label?: string;
};

const props = withDefaults(
  defineProps<ConnectorProps & ConnectorLabelProps>(),
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
const LABEL_WIDTH = 1000;
const LABEL_HEIGHT = 60;
const OFFSET_Y = 16;

const store = useStore();
const isDragging = computed(() => store.state.workflow.isDragging);

const movePreviewDelta = computed(() => store.state.workflow.movePreviewDelta);
const isNodeSelected = computed(
  () => store.getters["selection/isNodeSelected"],
);

const {
  sourceNode,
  sourcePort,
  destNode,
  destPort,
  absolutePoint,
  bendpoints,
} = toRefs(props);

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

  return {
    x: startX + (endX - startX + offset.x) / 2 - LABEL_WIDTH / 2,
    y: startY + (endY - startY + offset.y) / 2 - OFFSET_Y - LABEL_HEIGHT / 2,
  };
};

const isConnectionAffectedByDrag = computed(
  () =>
    isDragging.value &&
    (isNodeSelected.value(props.sourceNode) ||
      isNodeSelected.value(props.destNode)),
);

const halfWayPosition = computed(() => {
  // Calculates the middle point and subtracts half of the length of the text element

  const startX = startSegmentPosition.value.x;
  const startY = startSegmentPosition.value.y;
  const endX = endSegmentPosition.value.x;
  const endY = endSegmentPosition.value.y;

  if (bendpoints.value.length > 0) {
    // When there are bendpoints we cannot predict the curve of the connection path
    // therfore, to place the label, we must:
    // (1) Find the main path's center, which is the center point of the vector between the
    // source port's coords (x, y) and the destination port's coords (x, y)
    const mainPathCenter = geometry.utils.getCenterPoint(
      { x: startX, y: startY },
      { x: endX, y: endY },
    );

    // (2) For every path segment we have (determined by the bendpoints) we try to find the
    // closest distance to the main path's center. To do so, we optimize for the smallest delta possible using
    // the euclidian distance when compared with the segment's center point (x, y)
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
</script>

<template>
  <foreignObject
    v-if="label.length > 0"
    class="foreign-object"
    :width="LABEL_WIDTH"
    :height="LABEL_HEIGHT"
    :transform="`translate(${halfWayPosition.x}, ${halfWayPosition.y})`"
  >
    <p class="text-wrapper">
      <span class="streaming-label">
        {{ label }}
      </span>
    </p>
  </foreignObject>
</template>

<style lang="postcss" scoped>
.streaming-label {
  color: white;
  font-size: 12px;
  box-shadow: var(--shadow-elevation-1);
  border-radius: 2px;
  background-color: var(--knime-masala);
  padding: 5px;
}

.text-wrapper {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
}

.foreign-object {
  pointer-events: none;
}
</style>
