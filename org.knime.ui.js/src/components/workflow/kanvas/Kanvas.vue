<script setup lang="ts">
import type { Ref } from "vue";
import {
  onMounted,
  watch,
  computed,
  ref,
  nextTick,
  onBeforeUnmount,
} from "vue";
import { debounce } from "lodash-es";

import { capitalize } from "webapps-common/util/capitalize";
import useKeyPressedUntilMouseClick from "webapps-common/ui/composables/useKeyPressedUntilMouseClick";
import { getMetaOrCtrlKey } from "webapps-common/util/navigator";

import { useStore } from "@/composables/useStore";
import { $bus } from "@/plugins/event-bus";
import { useMouseWheelZooming } from "./useMouseWheelZooming";
import { usePanning } from "./usePanning";
import { useCanvasMoveLocking } from "./useCanvasMoveLocking";
import { useArrowKeyNavigation } from "./useArrowKeyNavigation";
import { RESIZE_DEBOUNCE } from "./constants";
import {
  workflowNavigationService,
  type Direction,
} from "@/util/workflowNavigationService";

const emit = defineEmits(["containerSizeChanged"]);

const store = useStore();

// canvas
const interactionsEnabled = computed(
  () => store.state.canvas.interactionsEnabled,
);
const canvasSize = computed(() => store.getters["canvas/canvasSize"]);
const viewBox = computed(() => store.getters["canvas/viewBox"]);
const contentBounds = computed(() => store.getters["canvas/contentBounds"]);

watch(contentBounds, (...args) => {
  store.dispatch("canvas/contentBoundsChanged", args);
});

// application
const hasPanModeEnabled = computed(
  () => store.getters["application/hasPanModeEnabled"],
);

// workflow
const isWorkflowEmpty = computed(
  () => store.getters["workflow/isWorkflowEmpty"],
);

const rootEl = ref<HTMLDivElement | null>(null);
let resizeObserver: ResizeObserver, stopResizeObserver: () => void;

const initResizeObserver = () => {
  // updating the container size and recalculating the canvas is debounced.
  const updateContainerSize = debounce(() => {
    store.dispatch("canvas/updateContainerSize");
    nextTick(() => {
      emit("containerSizeChanged");
    });
  }, RESIZE_DEBOUNCE);

  resizeObserver = new ResizeObserver((entries) => {
    const containerEl = entries.find(({ target }) => target === rootEl.value);
    if (containerEl) {
      updateContainerSize();
    }
  });

  stopResizeObserver = () => {
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
  };

  resizeObserver.observe(rootEl.value!);
};

onMounted(() => {
  store.dispatch("canvas/initScrollContainerElement", rootEl.value);
  initResizeObserver();
});

onBeforeUnmount(() => {
  // Stop Resize Observer
  stopResizeObserver();

  // Remove reference to canvas element wrapper
  store.commit("canvas/clearScrollContainerElement");
});

useCanvasMoveLocking();

const { onMouseWheel } = useMouseWheelZooming({
  rootEl: rootEl as Ref<HTMLElement>,
});

const { shouldShowMoveCursor, beginPan, movePan, stopPan, isHoldingDownSpace } =
  usePanning({
    rootEl: rootEl as Ref<HTMLElement>,
  });

useArrowKeyNavigation({ isHoldingDownSpace });

const startRectangleSelection = (event: PointerEvent) => {
  const metaOrCtrlKey = getMetaOrCtrlKey();

  if (event.shiftKey || event[metaOrCtrlKey]) {
    $bus.emit("selection-pointerdown", event);
  }
};

const hasKeyboardFocus = useKeyPressedUntilMouseClick(["Tab"]);

const hasSelectedObjects = () => {
  const selectedObjects = store.getters["selection/selectedObjects"];
  return selectedObjects.length > 0;
};

const selectObjectInKanvas = async (event?: KeyboardEvent) => {
  // we only select something if we don't have a selection yet
  if (hasSelectedObjects()) {
    return;
  }

  const directionMap: Record<string, Direction> = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowUp: "top",
    ArrowDown: "bottom",
  } as const;

  // do we have some objects?
  const objects = store.getters["workflow/workflowObjects"];
  if (objects.length === 0) {
    return;
  }

  const referencePoint = store.getters["canvas/getCenterOfScrollContainer"](
    event ? "center" : "left",
  );

  // look for the "first" object, just use one if we can't find a near one at the center
  const mostCenterObject = await workflowNavigationService.nearestObject({
    objects,
    reference: {
      ...referencePoint,
      id: "",
    },
    direction: event ? directionMap[event.key] : "right",
  });

  // the nearestObject uses some max distances so it can happen that there is nothing "found", just use any object
  const objectToSelect = mostCenterObject ?? objects.at(0);

  await store.dispatch(
    `selection/select${capitalize(objectToSelect.type)}`,
    objectToSelect.id,
  );
  await store.dispatch("canvas/moveObjectIntoView", objectToSelect);
};

const toggleContextMenu = (event: unknown) => {
  // this is not the only place where it is activated, look into Kanvas (usePanning.stopPan)
  // where an unsuccessful pan by right click also opens it
  store.dispatch("application/toggleContextMenu", { event });
};

const onContextMenu = (event: MouseEvent | KeyboardEvent) => {
  if (
    event.target &&
    (event.target as HTMLElement).classList.contains("native-context-menu")
  ) {
    return;
  }
  // prevent native context menus to appear
  event.preventDefault();

  // trigger it for empty workflows as we don't have a pan there
  if (store.getters["workflow/isWorkflowEmpty"]) {
    toggleContextMenu(event);
  }
};

const deselectAllObjects = () => {
  store.dispatch("selection/deselectAllObjects");
};
const preventContextMenuKey = (event: KeyboardEvent) => {
  // we prevent that key because it will issue a PointerEvent and calculate the position to the center of the
  // focused element which in our case is just the canvas and not the selected nodes. The fallback position will be
  // used if we supply a KeyboardEvent (or any Event without clientX/Y) to the toggleContextMenu.
  if (event.key === "ContextMenu") {
    event.preventDefault();
    event.stopPropagation();
  }
};

const onKeydown = (event: KeyboardEvent) => {
  const contextMenu = () => {
    toggleContextMenu(event);
    event.preventDefault();
    event.stopPropagation();
  };

  switch (event.key) {
    // handle key with KeyboardEvent to get our fallback position (based on the selection)
    case "ContextMenu":
      contextMenu();
      break;
    case "Escape":
      deselectAllObjects();
      event.stopPropagation();
      break;
    // Shift+F10 is used as cross platform context menu key (linux/windows support that anyway but Equo/CEF does not)
    case "F10":
      if (event.shiftKey) {
        contextMenu();
      }
      break;
    // select the first item if non is selected (for example after pressing the DELETE button)
    case "ArrowLeft":
    case "ArrowRight":
    case "ArrowUp":
    case "ArrowDown":
      if (!hasSelectedObjects()) {
        event.stopPropagation();
        event.preventDefault();
        event.stopImmediatePropagation();
        selectObjectInKanvas(event);
      }
      break;
  }
};
</script>

<template>
  <div
    ref="rootEl"
    tabindex="0"
    :class="[
      'scroll-container',
      {
        panning: shouldShowMoveCursor || hasPanModeEnabled,
        empty: isWorkflowEmpty,
        disabled: !interactionsEnabled,
      },
    ]"
    @wheel="onMouseWheel"
    @pointerdown.middle="beginPan"
    @pointerdown.prevent.right="beginPan"
    @pointerdown.left="beginPan"
    @pointerup.middle="stopPan"
    @pointerup.left="stopPan"
    @pointerup.prevent.right="stopPan"
    @pointermove="movePan"
    @focusin="() => hasKeyboardFocus && selectObjectInKanvas()"
    @contextmenu.stop="onContextMenu"
    @keyup="preventContextMenuKey"
    @keydown="onKeydown"
  >
    <svg
      ref="svg"
      :width="canvasSize.width"
      :height="canvasSize.height"
      :viewBox="viewBox.string"
      @pointerdown.left.exact.stop="$bus.emit('selection-pointerdown', $event)"
      @pointerdown.left.stop="startRectangleSelection"
      @pointerup.left.stop="$bus.emit('selection-pointerup', $event)"
      @pointermove="$bus.emit('selection-pointermove', $event)"
      @lostpointercapture="$bus.emit('selection-lostpointercapture', $event)"
    >
      <slot />
    </svg>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

svg {
  position: relative;

  /* needed for z-index to have effect */
  display: block;
}

.panning {
  cursor: move;

  & svg,
  & svg :deep(*) {
    pointer-events: none !important;
  }
}

.scroll-container {
  position: relative;
  overflow: scroll;
  height: 100%;
  width: 100%;

  &:focus {
    outline: none;
  }

  &.empty {
    overflow: hidden;

    /* disables scrolling */
  }

  &.disabled {
    pointer-events: none !important;

    & svg,
    & svg :deep(*) {
      pointer-events: none !important;
    }
  }
}
</style>
