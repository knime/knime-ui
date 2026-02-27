<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";

import ManageVersionsWrapper from "@/components/workflowEditor/ManageVersionsWrapper.vue";
import { useApplicationSettingsStore } from "@/store/application/settings";
import { useCurrentCanvasStore } from "@/store/canvas/useCurrentCanvasStore";
import { usePanelStore } from "@/store/panel";
import { useSelectionStore } from "@/store/selection";
import ResizableComponentWrapper from "../dataValueViews/ResizableComponentWrapper.vue";
import {
  type BoundingBox,
  useDraggableResizableRectState,
} from "../dataValueViews/useDataValueView";

import NodeConfig from "./NodeConfig.vue";

// ─── State ───────────────────────────────────────────────────────────────────

const panelStore = usePanelStore();
const { singleSelectedNode } = storeToRefs(useSelectionStore());
const currentCanvasStore = useCurrentCanvasStore();
const { useEmbeddedDialogs } = storeToRefs(useApplicationSettingsStore());

// ─── Size / position ─────────────────────────────────────────────────────────

const DEFAULT_WIDTH = 440;
const DEFAULT_HEIGHT = 600;
const MIN_WIDTH = 432;
const MIN_HEIGHT = 300;
/** Gap between right edge of node bounding box and the floating panel */
const NODE_OFFSET_X = 24;
/** Approximate half-width of a node in canvas coordinates used to place the
 *  panel directly to its right */
const NODE_RIGHT_MARGIN = 80;
const VIEWPORT_MARGIN = 20;

const { state: rectState, setRect } = useDraggableResizableRectState();

const getInitialPosition = (): Pick<BoundingBox, "left" | "top"> => {
  const node = singleSelectedNode.value;
  if (node) {
    try {
      const canvasPos = {
        x: node.position.x + NODE_RIGHT_MARGIN,
        y: node.position.y,
      };
      const screenPos =
        currentCanvasStore.value.screenFromCanvasCoordinates(canvasPos);
      return {
        left: Math.min(
          screenPos.x + NODE_OFFSET_X,
          window.innerWidth - DEFAULT_WIDTH - VIEWPORT_MARGIN,
        ),
        top: Math.max(
          VIEWPORT_MARGIN,
          Math.min(
            screenPos.y,
            window.innerHeight - DEFAULT_HEIGHT - VIEWPORT_MARGIN,
          ),
        ),
      };
    } catch {
      // canvas not yet ready — fall through to default
    }
  }
  // Fallback: right side of viewport, vertically centred
  return {
    left: window.innerWidth - DEFAULT_WIDTH - VIEWPORT_MARGIN,
    top: Math.max(
      VIEWPORT_MARGIN,
      (window.innerHeight - DEFAULT_HEIGHT) / 2,
    ),
  };
};

onMounted(() => {
  const { left, top } = getInitialPosition();
  setRect({ left, top, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
});

// Reposition when the selected node changes
watch(
  () => singleSelectedNode.value?.id,
  () => {
    const { left, top } = getInitialPosition();
    setRect({ left, top });
  },
);

// Close the panel when the selection is cleared (e.g. clicking empty canvas)
watch(singleSelectedNode, (node) => {
  if (!node) {
    panelStore.isRightPanelExpanded = false;
  }
});

const panelStyles = computed(() => ({
  left: `${rectState.value.left}px`,
  top: `${rectState.value.top}px`,
  width: `${rectState.value.width}px`,
  height: `${rectState.value.height}px`,
}));

// ─── Dragging ─────────────────────────────────────────────────────────────────

const isDragging = ref(false);

const onHeaderMouseDown = (event: MouseEvent) => {
  // Only drag when the mousedown originates from the inner panel header
  if (!(event.target as HTMLElement).closest(".header")) {
    return;
  }
  // Ignore clicks on interactive children (buttons etc.)
  if ((event.target as HTMLElement).closest("button")) {
    return;
  }

  isDragging.value = true;
  const startLeft = event.clientX - rectState.value.left;
  const startTop = event.clientY - rectState.value.top;

  const onMove = (e: MouseEvent) => {
    setRect({
      left: e.clientX - startLeft,
      top: e.clientY - startTop,
    });
  };

  const onUp = () => {
    isDragging.value = false;
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  };

  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
  event.preventDefault();
};

</script>

<template>
  <ResizableComponentWrapper
    class="node-config-floating-panel"
    :min-size="{ width: MIN_WIDTH, height: MIN_HEIGHT }"
    :rect-state="rectState"
    :style="panelStyles"
    @custom-resize="setRect"
  >
    <!-- Panel body — inner RightPanelHeader (.header) acts as drag handle -->
    <div
      class="floating-panel-content"
      :style="isDragging ? { pointerEvents: 'none' } : {}"
      @mousedown.capture="onHeaderMouseDown"
    >
      <NodeConfig v-if="useEmbeddedDialogs" />
      <ManageVersionsWrapper v-else />
    </div>
  </ResizableComponentWrapper>
</template>

<style lang="postcss" scoped>
.node-config-floating-panel {
  position: fixed;
  z-index: v-bind("$zIndices.layerFloatingWindows");
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 8px;
  background-color: var(--kds-color-surface-default);
  box-shadow: var(--shadow-elevation-2);
}

.floating-panel-content {
  /* inner RightPanelHeader becomes the drag handle */
  :deep(.header) {
    cursor: move;
    user-select: none;
  }

  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
</style>
