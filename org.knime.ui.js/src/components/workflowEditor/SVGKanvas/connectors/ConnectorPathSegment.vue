<script setup lang="ts">
import { computed, ref, toRef, watch } from "vue";
import gsap from "gsap";

import type { XY } from "@/api/gateway-api/generated-api";
import connectorPath from "@/util/connectorPath";
import { geometry } from "@/util/geometry";

import ConnectorBendpoint from "./ConnectorBendpoint.vue";
import type { PathSegment } from "./types";

interface Props {
  connectionId: string;
  segment: PathSegment;
  isFlowvariableConnection: boolean;
  isHighlighted: boolean;
  isDraggedOver: boolean;
  suggestDelete: boolean;
  isConnectionHovered: boolean;
  index: number;
  isLastSegment: boolean;
  isReadonly?: boolean;
  isSelected?: boolean;
  interactive?: boolean;
  streaming?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  interactive: true,
  isReadonly: false,
  isSelected: false,
  streaming: false,
});

const emit = defineEmits<{
  addVirtualBendpoint: [{ position: XY; event: PointerEvent }];
}>();

const path = computed(() => {
  const x1 = props.segment.start.x;
  const y1 = props.segment.start.y;
  const x2 = props.segment.end.x;
  const y2 = props.segment.end.y;

  const shotldOffsetStart = props.index !== 0;
  const shouldOffsetEnd = !props.isLastSegment;

  return connectorPath(x1, y1, x2, y2, shotldOffsetStart, shouldOffsetEnd);
});

const centerPoint = computed(() =>
  geometry.utils.getCenterPoint(props.segment.start, props.segment.end),
);

const visiblePath = ref<SVGPathElement | null>(null);
/*
 * if suggestDelete changes to 'true' the connector will animate away from its target port
 * if suggestDelete changes back to 'false' the connector will move back
 */
watch(toRef(props, "suggestDelete"), (newValue, oldValue) => {
  if (!visiblePath.value) {
    return;
  }

  const shiftX = -12;
  const shiftY = -6;
  const x1 = props.segment.start.x;
  const y1 = props.segment.start.y;
  const x2 = props.segment.end.x;
  const y2 = props.segment.end.y;

  const newPath =
    newValue && !oldValue
      ? connectorPath(x1, y1, x2 + shiftX, y2 + shiftY)
      : path.value;

  gsap.to(visiblePath.value, {
    attr: { d: newPath },
    duration: 0.2,
    ease: "power2.out",
  });
});

const isSegmentHovered = ref(false);
</script>

<template>
  <path
    v-if="interactive"
    :d="path"
    :class="['hover-area', { hovered: isConnectionHovered }]"
    data-hide-in-workflow-preview
    v-bind="$attrs"
    @mouseenter="isSegmentHovered = true"
    @mouseleave="isSegmentHovered = false"
  />
  <path
    v-bind="$attrs"
    ref="visiblePath"
    :d="path"
    :class="{
      'flow-variable': isFlowvariableConnection,
      'read-only': isReadonly,
      highlighted: isHighlighted,
      dashed: streaming,
      selected: isSelected,
      'is-dragged-over': isDraggedOver,
    }"
    fill="none"
  />
  <ConnectorBendpoint
    v-if="!isReadonly"
    v-show="isSegmentHovered"
    :connection-id="connectionId"
    :is-flow-variable-connection="false"
    :is-selected="false"
    :is-dragging="false"
    :index="-1"
    :position="centerPoint"
    virtual
    @mouseenter="isSegmentHovered = true"
    @mouseleave="isSegmentHovered = false"
    @pointerdown.left="
      emit('addVirtualBendpoint', { position: centerPoint, event: $event })
    "
  />
</template>

<style lang="postcss" scoped>
@keyframes dash {
  from {
    stroke-dashoffset: 100;
  }

  to {
    stroke-dashoffset: 0;
  }
}

path:not(.hover-area) {
  pointer-events: none;
  stroke-width: v-bind("$shapes.connectorWidth");
  stroke: var(--knime-stone-gray);
  transition:
    stroke-width 0.1s ease-in,
    stroke 0.1s ease-in;

  &:not(.read-only) {
    cursor: grab;
  }

  &.selected {
    stroke-width: v-bind("$shapes.selectedConnectorWidth");
    stroke: var(--knime-cornflower);
  }

  &.highlighted {
    stroke-width: v-bind("$shapes.highlightedConnectorWidth");
    stroke: var(--knime-masala);
  }

  &.is-dragged-over {
    stroke-width: v-bind("$shapes.selectedConnectorWidth");
    stroke: var(--knime-meadow-dark);
  }

  &.dashed {
    stroke-dasharray: 5;
    stroke-dashoffset: 50;
    animation: dash 3s linear infinite;
  }

  &.flow-variable {
    stroke: var(--knime-coral);

    &.selected {
      stroke: var(--knime-cornflower);
    }
  }
}

.hover-area {
  stroke: transparent;
  stroke-width: 8px;
  fill: none;

  &:hover + path,
  &.hovered + path {
    stroke-width: v-bind("$shapes.selectedConnectorWidth");
  }
}
</style>
