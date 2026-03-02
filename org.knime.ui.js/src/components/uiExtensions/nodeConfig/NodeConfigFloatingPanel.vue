<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";

import ManageVersionsWrapper from "@/components/workflowEditor/ManageVersionsWrapper.vue";
import { useApplicationSettingsStore } from "@/store/application/settings";
import { useCurrentCanvasStore } from "@/store/canvas/useCurrentCanvasStore";
import { usePanelStore } from "@/store/panel";
import { useSelectionStore } from "@/store/selection";
import { useWorkflowVersionsStore } from "@/store/workflow/workflowVersions";
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
const versionsStore = useWorkflowVersionsStore();

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
/** Gap between the top-right overlay pill and the anchored Versions panel */
const VERSIONS_BUTTON_GAP = 4;
/** Gap between the top-left overlay buttons and the floating panel */
const LEFT_OVERLAY_PANEL_GAP = 4;

const { state: rectState, setRect } = useDraggableResizableRectState();

const getVersionsAnchoredPosition = (): Pick<BoundingBox, "left" | "top"> => {
  const overlay = document.querySelector<HTMLElement>(".canvas-overlay-top-right");
  if (overlay) {
    const rect = overlay.getBoundingClientRect();
    return {
      left: Math.max(VIEWPORT_MARGIN, rect.right - DEFAULT_WIDTH),
      top: rect.bottom + VERSIONS_BUTTON_GAP,
    };
  }
  return {
    left: window.innerWidth - DEFAULT_WIDTH - VIEWPORT_MARGIN,
    top: 100,
  };
};

const getLeftOverlayAnchoredPosition = (): Pick<BoundingBox, "left" | "top"> => {
  const overlay = document.querySelector<HTMLElement>(".canvas-overlay-top-left");
  if (overlay) {
    const rect = overlay.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.bottom + LEFT_OVERLAY_PANEL_GAP,
    };
  }
  return {
    left: VIEWPORT_MARGIN,
    top: 100,
  };
};

const getInitialPosition = (): Pick<BoundingBox, "left" | "top"> => {
  if (versionsStore.isSidepanelOpen && !singleSelectedNode.value) {
    return getVersionsAnchoredPosition();
  }
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
  return getLeftOverlayAnchoredPosition();
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

// Close the panel when the selection is cleared (e.g. clicking empty canvas),
// but not when the versions panel is open
watch(singleSelectedNode, (node) => {
  if (!node && !versionsStore.isSidepanelOpen) {
    panelStore.isRightPanelExpanded = false;
  }
});

// Reposition below the Versions button when versions mode activates
watch(
  () => versionsStore.isSidepanelOpen,
  (open) => {
    if (open && !singleSelectedNode.value) {
      const { left, top } = getVersionsAnchoredPosition();
      setRect({ left, top });
    }
  },
);

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
