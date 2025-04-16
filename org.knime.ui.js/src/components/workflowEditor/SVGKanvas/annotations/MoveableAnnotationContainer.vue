<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";

import type { Bounds } from "@/api/gateway-api/generated-api";
import { useMoveObject } from "@/components/workflowEditor/SVGKanvas/common/useMoveObject";
import { useEscapeStack } from "@/composables/useEscapeStack";
import { useSVGCanvasStore } from "@/store/canvas/canvas-svg";
import { useSelectionStore } from "@/store/selection";
import { useMovingStore } from "@/store/workflow/moving";

interface Props {
  id: string;
  bounds: Bounds;
}
const props = defineProps<Props>();

const movingStore = useMovingStore();
const { movePreviewDelta, isDragging } = storeToRefs(movingStore);
const { isMoveLocked } = storeToRefs(useSVGCanvasStore());
const { isAnnotationSelected, selectAnnotations, deselectAllObjects } =
  useSelectionStore();
const { startedSelectionFromAnnotationId } = storeToRefs(useSelectionStore());

const container = ref<HTMLElement | null>(null);

const translationAmount = computed(() => {
  return isAnnotationSelected(props.id)
    ? movePreviewDelta.value
    : { x: 0, y: 0 };
});

const initialPosition = computed(() => ({
  x: props.bounds.x,
  y: props.bounds.y,
}));

const { createPointerDownHandler } = useMoveObject({
  objectElement: computed(() => container.value as HTMLElement),
});

const onPointerDown = async (event: PointerEvent) => {
  if (isMoveLocked.value) {
    startedSelectionFromAnnotationId.value = props.id;
    return;
  }

  const currentTarget = event.currentTarget as HTMLElement;

  if (!isAnnotationSelected(props.id)) {
    const { wasAborted } = await deselectAllObjects();
    if (wasAborted) {
      return;
    }
    selectAnnotations(props.id);
  }

  createPointerDownHandler(initialPosition)(event, currentTarget);
};

useEscapeStack({
  group: "OBJECT_DRAG",
  alwaysActive: true,
  onEscape: () => {
    if (isDragging) {
      movingStore.abortDrag();
    }
  },
});
</script>

<template>
  <g
    ref="container"
    :transform="`translate(${translationAmount.x}, ${translationAmount.y})`"
    :class="[{ dragging: isDragging && isAnnotationSelected(id) }]"
    class="annotation"
    @pointerdown.left.exact="onPointerDown($event)"
  >
    <slot />
  </g>
</template>

<style lang="postcss" scoped>
.dragging {
  cursor: grabbing;
  pointer-events: none;
}
</style>
