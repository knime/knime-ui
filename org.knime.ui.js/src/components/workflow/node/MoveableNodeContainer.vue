<script setup lang="ts">
import { ref, computed, toRef } from "vue";

import type { XY } from "@/api/gateway-api/generated-api";
import { useStore } from "@/composables/useStore";

import { useMoveObject } from "@/composables/useMoveObject";
import { useEscapeStack } from "@/mixins/escapeStack";

interface Props {
  id: string;
  position: XY;
}

const DRAG_TARGET_SELECTOR = ".node-torso-wrapper";

const props = defineProps<Props>();
let lastHitTarget: Element | null = null;

const store = useStore();
const movePreviewDelta = computed(() => store.state.workflow.movePreviewDelta);
const hasAbortedDrag = computed(() => store.state.workflow.hasAbortedDrag);
const isDragging = computed(() => store.state.workflow.isDragging);

const isNodeConnected = computed(
  () => store.getters["workflow/isNodeConnected"],
);
const getNodeById = computed(() => store.getters["workflow/getNodeById"]);

const isNodeSelected = computed(
  () => store.getters["selection/isNodeSelected"],
);

const container = ref<SVGGElement | null>(null);

const positionWithDelta = computed(() => ({
  x: props.position.x + movePreviewDelta.value.x,
  y: props.position.y + movePreviewDelta.value.y,
}));
const translationAmount = computed(() => {
  return isNodeSelected.value(props.id)
    ? positionWithDelta.value
    : props.position;
});

const dragContainer = computed(() => {
  return container.value!.querySelector(DRAG_TARGET_SELECTOR) as HTMLElement;
});

const moveNode = () => {
  store.dispatch("workflow/moveObjects");
};

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
    const { inPorts = [], outPorts = [] } = getNodeById.value(props.id);
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

  onMoveStartCallback: () => {
    if (!isNodeSelected.value(props.id)) {
      store.dispatch("selection/deselectAllObjects");
    }
    store.dispatch("selection/selectNode", props.id);
  },

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
            onError: moveNode,
          },
        }),
      );

      lastHitTarget = null;

      return Promise.resolve(false);
    }

    return Promise.resolve(true);
  },
});

const onPointerDown = createPointerDownHandler(position);

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
    :data-node-id="id"
    :class="[{ dragging: isDragging && isNodeSelected(id) }]"
    @pointerdown.left="onPointerDown"
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
