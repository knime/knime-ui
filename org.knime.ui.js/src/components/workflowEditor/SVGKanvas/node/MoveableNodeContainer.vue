<script setup lang="ts">
import { computed, ref, toRef } from "vue";
import { storeToRefs } from "pinia";

import type { XY } from "@/api/gateway-api/generated-api";
import { useMoveObject } from "@/components/workflowEditor/SVGKanvas/common/useMoveObject";
import { useEscapeStack } from "@/composables/useEscapeStack";
import { useSelectionStore } from "@/store/selection";
import { useMovingStore } from "@/store/workflow/moving";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";

interface Props {
  id: string;
  position: XY;
}

const DRAG_TARGET_SELECTOR = ".node-torso-wrapper";

const props = defineProps<Props>();
let lastHitTarget: Element | null = null;

const movingStore = useMovingStore();
const { movePreviewDelta, isDragging, hasAbortedDrag } =
  storeToRefs(movingStore);
const { isNodeSelected, deselectAllObjects } = useSelectionStore();
const { isNodeConnected, getNodeById } = storeToRefs(
  useNodeInteractionsStore(),
);

const container = ref<SVGGElement | null>(null);

const positionWithDelta = computed(() => ({
  x: props.position.x + movePreviewDelta.value.x,
  y: props.position.y + movePreviewDelta.value.y,
}));
const translationAmount = computed(() => {
  return isNodeSelected(props.id) ? positionWithDelta.value : props.position;
});

const dragContainer = computed(() => {
  return container.value!.querySelector(DRAG_TARGET_SELECTOR) as HTMLElement;
});

const notifyNodeDraggingListeners = (x: number, y: number) => {
  const hitTarget = document.elementFromPoint(x, y);

  // skip matched elements inside "self"
  if (hitTarget && dragContainer.value.contains(hitTarget)) {
    return;
  }

  const isSameTarget = hitTarget && lastHitTarget === hitTarget;
  if (!isSameTarget && lastHitTarget) {
    lastHitTarget.dispatchEvent(
      new CustomEvent("node-dragging-leave", {
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  if (!isSameTarget && hitTarget) {
    const { inPorts = [], outPorts = [] } = getNodeById.value(props.id)!;
    const isEventIgnored = hitTarget.dispatchEvent(
      new CustomEvent("node-dragging-enter", {
        bubbles: true,
        cancelable: true,
        detail: {
          isNodeConnected: isNodeConnected.value(props.id),
          inPorts,
          outPorts,
        },
      }),
    );
    lastHitTarget = isEventIgnored ? null : hitTarget;
  }
};
const position = toRef(props, "position");

const { createPointerDownHandler } = useMoveObject({
  objectElement: dragContainer,

  onMoveCallback: (ptrMoveEvent) => {
    notifyNodeDraggingListeners(ptrMoveEvent.clientX, ptrMoveEvent.clientY);
  },

  onMoveEndCallback: (ptrUpEvent) => {
    if (hasAbortedDrag.value && lastHitTarget) {
      lastHitTarget.dispatchEvent(
        new CustomEvent("node-dragging-leave", {
          bubbles: true,
          cancelable: true,
        }),
      );

      lastHitTarget = null;

      return Promise.resolve(false);
    }

    if (lastHitTarget) {
      lastHitTarget.dispatchEvent(
        new CustomEvent("node-dragging-end", {
          bubbles: true,
          cancelable: true,
          detail: {
            id: props.id,
            clientX: ptrUpEvent.clientX,
            clientY: ptrUpEvent.clientY,
            onError: movingStore.moveObjects,
          },
        }),
      );

      lastHitTarget = null;

      return Promise.resolve(false);
    }

    return Promise.resolve(true);
  },
});

const onPointerDown = async (event: PointerEvent) => {
  // Capture currentTarget synchronously as the async deselectAllObjects call will
  // cause the event to be already bubbled up and current Target to be null
  const currentTarget = event.currentTarget as HTMLElement;

  if (!isNodeSelected(props.id)) {
    const { wasAborted } = await deselectAllObjects([props.id]);
    if (wasAborted) {
      return;
    }
  }
  createPointerDownHandler(position)(event, currentTarget);
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
    :data-node-id="id"
    :class="[{ dragging: isDragging && isNodeSelected(id) }]"
    @pointerdown.left.exact="onPointerDown"
  >
    <slot :position="translationAmount" />
  </g>
</template>

<style lang="postcss" scoped>
.dragging {
  cursor: grabbing;
  pointer-events: none;

  & :deep() {
    & * {
      pointer-events: none;
    }
  }
}
</style>
