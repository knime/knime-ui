<script setup lang="ts">
import { ref, computed } from "vue";

import { useMoveObject } from "@/composables/useMoveObject";
import { useStore } from "@/composables/useStore";
import { useEscapeStack } from "@/composables/useEscapeStack";
import { usePortBarPositions } from "@/composables/usePortBarPositions";

interface Props {
  type?: "in" | "out";
}
const props = defineProps<Props>();

const { getBounds } = usePortBarPositions();
const bounds = computed(() => getBounds(props.type === "out"));

const store = useStore();
const movePreviewDelta = computed(() => store.state.workflow.movePreviewDelta);
const isDragging = computed(() => store.state.workflow.isDragging);
const isMoveLocked = computed(() => store.state.canvas.isMoveLocked);

const workflow = computed(() => store.state.workflow.activeWorkflow);
const backendBounds = computed(() =>
  props.type === "out"
    ? workflow.value?.metaOutPorts?.bounds
    : workflow.value?.metaInPorts?.bounds,
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

const initialPosition = computed(() => ({
  x: bounds.value.x,
  y: bounds.value.y,
}));

const { createPointerDownHandler } = useMoveObject({
  objectElement: computed(() => container.value),
  onMoveStartCallback: (event) => {
    if (!isMetaNodePortBarSelected.value(props.type) && !event.ctrlKey) {
      store.dispatch("selection/deselectAllObjects");
    }

    store.dispatch("selection/selectMetanodePortBar", props.type);
  },
  onMoveEndCallback: async () => {
    // we need to set this on the first move as the backend has no data to translate otherwise
    // only send if we have really moved
    if (
      !backendBounds.value &&
      !(movePreviewDelta.value.x === 0 && movePreviewDelta.value.y === 0)
    ) {
      const { type } = props;
      await store.dispatch("workflow/transformMetaNodePortBar", {
        // classic expects width 50 - we use 10
        bounds: { ...bounds.value, width: 50 },
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
