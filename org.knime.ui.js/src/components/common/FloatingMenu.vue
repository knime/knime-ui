<script setup lang="ts">
import { toRef, watch, computed, ref, onBeforeUnmount, onMounted } from "vue";
import { onClickOutside, useResizeObserver } from "@vueuse/core";
import throttle from "raf-throttle";

import type { XY } from "@/api/gateway-api/generated-api";
import { useStore } from "@/composables/useStore";

import { useEscapeStack } from "@/mixins/escapeStack";

/*
 * The FloatingMenu component is a container that can be sticked to a position on the canvas,
 * but is shown on top of the whole application.
 *
 * For stickiness, it observes changes to its own size, and to scroll and zoom changes of the canvas
 *
 * If the menu wants to be closed it emits @menu-close event.
 * The menu will be closed on `esc` key press or on click away.
 *
 */

type Props = {
  /**
   * Whether the menu should be prevented from moving out of sight
   */
  preventOverflow?: boolean;

  /**
   * Position of the target the floating menu is attached to in canvas coordinates
   */
  canvasPosition: XY;

  /**
   * Which corner of the floating menu should stick to target position
   */
  anchor?: "top-left" | "top-right";

  /**
   * When set to true will disable interactions on the workflow canvas when the menu is open
   */
  disableInteractions?: boolean;

  /**
   * Whether to enable the behavior that closes the menu by pressing the escape key. `true` by default
   */
  closeOnEscape?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  preventOverflow: false,
  anchor: "top-left",
  disableInteractions: false,
  closeOnEscape: true,
});

const emit = defineEmits(["menuClose"]);

const absolutePosition = ref({ left: 0, top: 0 });

const store = useStore();

const screenFromCanvasCoordinates = computed(
  () => store.getters["canvas/screenFromCanvasCoordinates"],
);

const zoomFactor = computed(() => store.state.canvas.zoomFactor);
const isDraggingNodeFromRepository = computed(
  () => store.state.nodeRepository.isDraggingNode,
);
const isDraggingNodeInCanvas = computed(() => store.state.workflow.isDragging);

const rootEl = ref<HTMLDivElement | null>(null);

onClickOutside(rootEl, () => {
  emit("menuClose");
});

const distanceToCanvas = ({ left, top }: { left: number; top: number }) => {
  let kanvas = document.getElementById("kanvas")!;
  let { y, x, width, height } = kanvas.getBoundingClientRect();

  // find distance of point to all edges
  let leftDistance = x - left;
  let rightDistance = left - x - width;
  let topDistance = y - top;
  let bottomDistance = top - y - height;

  // find distance to closest horizontal edge, if outside canvas
  let distanceX = Math.max(Math.max(leftDistance, rightDistance), 0);

  // find distance to closest vertical edge, if outside canvas
  let distanceY = Math.max(Math.max(topDistance, bottomDistance), 0);

  // return greatest distance
  return Math.max(distanceX, distanceY);
};

const setAbsolutePosition = () => {
  if (!rootEl.value) {
    return;
  }

  // get position relative to the window
  let { x: left, y: top } = screenFromCanvasCoordinates.value(
    props.canvasPosition,
  );

  // if the target point is outside the canvas, first reduce opacity then close menu
  let distance = distanceToCanvas({ left, top });

  // linear fading depending on distance
  const distanceThreshold = 50;

  let alpha = Math.max(0, distanceThreshold - distance) / distanceThreshold;
  rootEl.value.style.opacity = alpha.toString();

  // close menu if outside threshold
  if (distance > distanceThreshold) {
    emit("menuClose");
    return;
  }

  const menuWidth = rootEl.value.offsetWidth;
  const menuHeight = rootEl.value.offsetHeight;

  if (props.anchor === "top-right") {
    left -= menuWidth;
  }

  if (props.preventOverflow) {
    // ensure the menu is always visible within the window
    if (window.innerWidth - left < menuWidth) {
      left = window.innerWidth - menuWidth;
    } else if (left < 0) {
      left = 0;
    }

    // ensure the menu is always visible within the window
    if (window.innerHeight - top < menuHeight) {
      top = window.innerHeight - menuHeight;
    } else if (top < 0) {
      top = 0;
    }
  }

  absolutePosition.value = { left, top };
};

watch([zoomFactor, toRef(props, "canvasPosition")], () => {
  setAbsolutePosition();
});

watch(isDraggingNodeInCanvas, () => {
  if (isDraggingNodeInCanvas.value) {
    emit("menuClose");
  }
});

watch(
  isDraggingNodeFromRepository,
  () => {
    if (isDraggingNodeFromRepository.value) {
      emit("menuClose");
    }
  },
  { immediate: true },
);

const onCanvasScroll = throttle(function () {
  setAbsolutePosition();
});

useResizeObserver(rootEl, () => {
  setAbsolutePosition();
  consola.trace("floating menu: resize detected");
});

onMounted(() => {
  setAbsolutePosition();
  if (props.disableInteractions) {
    store.commit("canvas/setInteractionsEnabled", false);
  }

  let kanvas = document.getElementById("kanvas")!;
  kanvas.addEventListener("scroll", onCanvasScroll);

  if (props.closeOnEscape) {
    useEscapeStack({
      onEscape: () => {
        emit("menuClose");
      },
    });
  }
});

onBeforeUnmount(() => {
  store.commit("canvas/setInteractionsEnabled", true);

  // if kanvas currently exists (workflow is open) remove scroll event listener
  let kanvas = document.getElementById("kanvas")!;
  kanvas?.removeEventListener("scroll", onCanvasScroll);
});

const onFocusOut = (event: FocusEvent) => {
  if (
    event.relatedTarget &&
    rootEl.value &&
    !rootEl.value.contains(event.relatedTarget as HTMLElement)
  ) {
    emit("menuClose");
  }
};
</script>

<template>
  <div
    ref="rootEl"
    class="floating-menu"
    :style="{
      left: `${absolutePosition.left}px`,
      top: `${absolutePosition.top}px`,
    }"
    @focusout.stop="onFocusOut"
    @keydown.tab.stop.prevent
  >
    <slot />
  </div>
</template>

<style lang="postcss" scoped>
.floating-menu {
  position: absolute;
  display: block;
  z-index: 5;

  &:focus {
    outline: none;
  }
}
</style>
