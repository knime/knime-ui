<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";

import { useEscapeStack } from "@/composables/useEscapeStack";
import { useMoveObject } from "@/composables/useMoveObject";
import { usePortBarPositions } from "@/composables/usePortBarPositions";
import { useCanvasStore } from "@/store/canvas";
import { useSelectionStore } from "@/store/selection";
import { useMovingStore } from "@/store/workflow/moving";
import { useWorkflowStore } from "@/store/workflow/workflow";

interface Props {
  type: "in" | "out";
}
const props = defineProps<Props>();

const { getBounds } = usePortBarPositions();
const bounds = computed(() => getBounds(props.type === "out"));

const movingStore = useMovingStore();
const { movePreviewDelta, isDragging } = storeToRefs(movingStore);
const { isMoveLocked } = storeToRefs(useCanvasStore());

const workflowStore = useWorkflowStore();
const { activeWorkflow: workflow } = storeToRefs(workflowStore);
const selectionStore = useSelectionStore();
const { isMetaNodePortBarSelected } = storeToRefs(selectionStore);

const backendBounds = computed(() =>
  props.type === "out"
    ? workflow.value!.metaOutPorts?.bounds
    : workflow.value!.metaInPorts?.bounds,
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
      selectionStore.deselectAllObjects();
    }

    selectionStore.selectMetanodePortBar(props.type);
  },
  onMoveEndCallback: async () => {
    // we need to set this on the first move as the backend has no data to translate otherwise
    // only send if we have really moved
    if (
      !backendBounds.value &&
      !(movePreviewDelta.value.x === 0 && movePreviewDelta.value.y === 0)
    ) {
      const { type } = props;
      await workflowStore.transformMetaNodePortBar({
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
      movingStore.abortDrag();
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
