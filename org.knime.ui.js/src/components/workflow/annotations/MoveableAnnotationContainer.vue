<script setup lang="ts">
import { ref, computed } from "vue";

import type { Bounds } from "@/api/gateway-api/generated-api";
import { useMoveObject } from "@/composables/useMoveObject";
import { useStore } from "@/composables/useStore";
import { useEscapeStack } from "@/composables/useEscapeStack";

interface Props {
  id: string;
  bounds: Bounds;
}
const props = defineProps<Props>();

const store = useStore();
const movePreviewDelta = computed(() => store.state.workflow.movePreviewDelta);
const isDragging = computed(() => store.state.workflow.isDragging);
const isMoveLocked = computed(() => store.state.canvas.isMoveLocked);

const isAnnotationSelected = computed(
  () => store.getters["selection/isAnnotationSelected"],
);

const container = ref<HTMLElement | null>(null);

const translationAmount = computed(() => {
  return isAnnotationSelected.value(props.id)
    ? movePreviewDelta.value
    : { x: 0, y: 0 };
});

const initialPosition = computed(() => ({
  x: props.bounds.x,
  y: props.bounds.y,
}));

const { createPointerDownHandler } = useMoveObject({
  objectElement: computed(() => container.value as HTMLElement),
  onMoveStartCallback: () => {
    if (!isAnnotationSelected.value(props.id)) {
      store.dispatch("selection/deselectAllObjects");
    }

    store.dispatch("selection/selectAnnotation", props.id);
  },
});

const onPointerDown = (event: PointerEvent) => {
  if (isMoveLocked.value) {
    store.commit("selection/setStartedSelectionFromAnnotationId", props.id);
    return;
  }

  const handler = createPointerDownHandler(initialPosition);
  handler(event);
};

const { useOnEscapeStack } = useEscapeStack();

useOnEscapeStack({
  group: "OBJECT_DRAG",
  alwaysActive: true,
  onEscape: () => {
    if (isDragging.value) {
      store.dispatch("workflow/abortDrag");
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
    @pointerdown.left="onPointerDown($event)"
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
