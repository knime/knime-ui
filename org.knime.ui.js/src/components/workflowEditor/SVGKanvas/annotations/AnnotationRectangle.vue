<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import throttle from "raf-throttle";

import { useGlobalBusListener } from "@/composables/useGlobalBusListener";
import { useShortcuts } from "@/plugins/shortcuts";
import { useCanvasModesStore } from "@/store/application/canvasModes";
import { useSVGCanvasStore } from "@/store/canvas/canvas-svg";

const startPosition = reactive({ x: 0, y: 0 });
const endPosition = reactive({ x: 0, y: 0 });
const pointerId = ref<number | null>(null);

const $shortcuts = useShortcuts();
const { screenToCanvasCoordinates } = useSVGCanvasStore();
const { switchCanvasMode } = useCanvasModesStore();

const selectionBounds = computed(() => {
  return {
    x: Math.min(startPosition.x, endPosition.x),
    y: Math.min(startPosition.y, endPosition.y),

    width: Math.abs(startPosition.x - endPosition.x),
    height: Math.abs(startPosition.y - endPosition.y),
  };
});

const startAnnotationDrag = (event: PointerEvent) => {
  pointerId.value = event.pointerId;
  (event.target as HTMLElement).setPointerCapture(event.pointerId);

  [startPosition.x, startPosition.y] = screenToCanvasCoordinates([
    event.clientX,
    event.clientY,
  ]);
  endPosition.x = startPosition.x;
  endPosition.y = startPosition.y;
};

const updateAnnotationDrag = throttle(function (e) {
  if (pointerId.value !== e.pointerId) {
    return;
  }

  [endPosition.x, endPosition.y] = screenToCanvasCoordinates([
    e.clientX,
    e.clientY,
  ]);
});

// Because the selection update/move function is throttled we also need to
// throttle the stop function to guarantee order of event handling
const stopAnnotationDrag = throttle(function (event) {
  if (pointerId.value !== event.pointerId) {
    return;
  }
  event.target.releasePointerCapture(pointerId.value);

  // hide rect
  pointerId.value = null;

  setTimeout(() => {
    const { x, y, width, height } = selectionBounds.value;
    $shortcuts.dispatch("addWorkflowAnnotation", {
      event,
      metadata: {
        position: { x, y },
        width,
        height,
      },
    });
    switchCanvasMode("selection");
  }, 0);
});

useGlobalBusListener({
  eventName: "selection-pointerdown",
  handler: startAnnotationDrag,
});
useGlobalBusListener({
  eventName: "selection-pointerup",
  handler: stopAnnotationDrag,
});
useGlobalBusListener({
  eventName: "selection-pointermove",
  handler: updateAnnotationDrag,
});
useGlobalBusListener({
  eventName: "selection-lostpointercapture",
  handler: stopAnnotationDrag,
});
</script>

<template>
  <rect
    v-show="pointerId !== null"
    :x="selectionBounds.x"
    :y="selectionBounds.y"
    :width="selectionBounds.width"
    :height="selectionBounds.height"
    :stroke="$colors.Cornflower"
    vector-effect="non-scaling-stroke"
  />
</template>

<style lang="postcss" scoped>
rect {
  fill: none;
  stroke-width: 2;
}
</style>
