<script setup lang="ts">
import { ref, toRef, watch, computed } from "vue";

import type { Bounds } from "@/api/gateway-api/generated-api";
import { useMoveObject } from "@/composables/useMoveObject";
import { useStore } from "@/composables/useStore";
import { useEscapeStack } from "@/mixins/escapeStack";

interface Props {
  type?: "in" | "out";
  bounds: Bounds;
}
const props = defineProps<Props>();

const store = useStore();
const movePreviewDelta = computed(() => store.state.workflow.movePreviewDelta);
const isDragging = computed(() => store.state.workflow.isDragging);
const isMoveLocked = computed(() => store.state.canvas.isMoveLocked);

const workflow = computed(() => store.state.workflow.activeWorkflow);
const backendBounds = computed(() =>
  props.type === "out"
    ? workflow.value.metaOutPorts?.bounds
    : workflow.value.metaInPorts?.bounds,
);

const isMetaNodePortBarSelected = computed(
  () => store.getters["selection/isMetaNodePortBarSelected"],
);

const container = ref<HTMLElement | null>(null);

const translationAmount = computed(() => {
  return isMetaNodePortBarSelected.value(props.type)
    ? movePreviewDelta.value
    : { x: 0, y: 0 };
});

watch(
  toRef(props, "bounds"),
  () => {
    if (isDragging.value) {
      store.dispatch("workflow/resetDragState");
    }
  },
  { deep: true },
);

const initialPosition = computed(() => ({
  x: props.bounds.x,
  y: props.bounds.y,
}));

const { createPointerDownHandler } = useMoveObject({
  objectElement: computed(() => container.value as HTMLElement),
  onMoveStartCallback: () => {
    if (!isMetaNodePortBarSelected.value(props.type)) {
      store.dispatch("selection/deselectAllObjects");
    }

    store.dispatch("selection/selectMetanodePortBar", props.type);
  },
  onMoveEndCallback: async () => {
    // we need to set this on the first move as the backend has no data to translate otherwise
    if (!backendBounds.value) {
      const { bounds, type } = props;
      await store.dispatch("workflow/transformMetaNodePortBar", {
        bounds,
        type,
      });
    }
    return true;
  },
});

const onPointerDown = (event: PointerEvent) => {
  if (isMoveLocked.value) {
    return;
  }
  const handler = createPointerDownHandler(initialPosition);
  handler(event);
};

useEscapeStack({
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
    :class="[{ dragging: isDragging && isMetaNodePortBarSelected(type) }]"
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
