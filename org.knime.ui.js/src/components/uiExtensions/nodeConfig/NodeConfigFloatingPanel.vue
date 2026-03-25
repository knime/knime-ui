<script setup lang="ts">
import { computed, onMounted, onUnmounted, provide, ref, shallowRef, watch } from "vue";
import { storeToRefs } from "pinia";

import ManageVersionsWrapper from "@/components/workflowEditor/ManageVersionsWrapper.vue";
import { useApplicationSettingsStore } from "@/store/application/settings";
import { useCurrentCanvasStore } from "@/store/canvas/useCurrentCanvasStore";
import { useNodeConfigurationStore } from "@/store/nodeConfiguration/nodeConfiguration";
import { usePanelStore } from "@/store/panel";
import { useSelectionStore } from "@/store/selection";
import { useWorkflowVersionsStore } from "@/store/workflow/workflowVersions";
import NodeOutput from "../NodeOutput.vue";
import ResizableComponentWrapper from "../dataValueViews/ResizableComponentWrapper.vue";
import {
  type BoundingBox,
  useDraggableResizableRectState,
} from "../dataValueViews/useDataValueView";

import NodeConfig from "./NodeConfig.vue";
import NodeConfigDescriptionPanel from "./NodeConfigDescriptionPanel.vue";
import NodeConfigJumpMarks from "./NodeConfigJumpMarks.vue";
import { DIALOG_JUMP_MARKS_KEY } from "./dialogJumpMarksContext";
import type { JumpMark } from "./useDialogJumpMarks";

// ─── State ───────────────────────────────────────────────────────────────────

const panelStore = usePanelStore();
const { singleSelectedNode } = storeToRefs(useSelectionStore());
const currentCanvasStore = useCurrentCanvasStore();
const applicationSettingsStore = useApplicationSettingsStore();
const { useEmbeddedDialogs, nodeOutputLayout, jumpMarksMode, nodeConfigOpenMode } = storeToRefs(applicationSettingsStore);
const versionsStore = useWorkflowVersionsStore();
const nodeConfigStore = useNodeConfigurationStore();
const { showNodeDescriptionPanel } = storeToRefs(nodeConfigStore);

// ─── Size / position ─────────────────────────────────────────────────────────

const SIDE_BY_SIDE_WIDTH = 1200;
const SINGLE_PANEL_WIDTH = 600;
const DESCRIPTION_PANEL_WIDTH = 360;
const DESCRIPTION_PANEL_GAP = 8;
const DEFAULT_HEIGHT = 700;
const SIDE_BY_SIDE_MIN_WIDTH = 660;
const SINGLE_PANEL_MIN_WIDTH = 560;
const MIN_HEIGHT = 300;
/** Pixels from a screen edge at which a drag triggers docking */
const DOCK_THRESHOLD = 80;
/** Approximate header height — used to place the panel under the cursor when releasing from dock */
const HEADER_HEIGHT = 40;
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

const panelDefaultWidth = computed(() =>
  nodeOutputLayout.value === "side-by-side" ? SIDE_BY_SIDE_WIDTH : SINGLE_PANEL_WIDTH,
);
const panelMinWidth = computed(() =>
  nodeOutputLayout.value === "side-by-side" ? SIDE_BY_SIDE_MIN_WIDTH : SINGLE_PANEL_MIN_WIDTH,
);

const { state: rectState, setRect } = useDraggableResizableRectState();
const { state: descRectState, setRect: setDescRect } = useDraggableResizableRectState();

/** "left" | "right" = docked to that screen edge; null = floating */
const dockedSide = ref<"left" | "right" | null>(
  nodeConfigOpenMode.value === "dock" ? "right" : null,
);

// Auto-dock right when switching to "dock" mode; undock when leaving it
watch(nodeConfigOpenMode, (mode) => {
  if (mode === "dock") {
    dockedSide.value = "right";
  } else if (dockedSide.value !== null) {
    dockedSide.value = null;
  }
});
/** Non-null only while the user is dragging near an edge — drives the preview overlay */
const dockPreviewSide = ref<"left" | "right" | null>(null);

// Sync docked-right width into panel store so WorkflowPanel can reserve space
watch(
  [dockedSide, () => rectState.value.width],
  ([side, width]) => {
    panelStore.dockedRightPanelWidth = side === "right" ? width : 0;
  },
  { immediate: true },
);

onUnmounted(() => {
  panelStore.dockedRightPanelWidth = 0;
});

const getVersionsAnchoredPosition = (): Pick<BoundingBox, "left" | "top"> => {
  const overlay = document.querySelector<HTMLElement>(".canvas-overlay-top-right");
  if (overlay) {
    const rect = overlay.getBoundingClientRect();
    return {
      left: Math.max(VIEWPORT_MARGIN, rect.right - panelDefaultWidth.value),
      top: rect.bottom + VERSIONS_BUTTON_GAP,
    };
  }
  return {
    left: window.innerWidth - panelDefaultWidth.value - VIEWPORT_MARGIN,
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
          window.innerWidth - panelDefaultWidth.value - VIEWPORT_MARGIN,
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
  setRect({ left, top, width: panelDefaultWidth.value, height: DEFAULT_HEIGHT });
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
// but not when the versions panel is open, and not in dock mode (where the
// panel persists regardless of selection — selection may briefly clear when
// switching between nodes)
watch(singleSelectedNode, (node) => {
  if (!node && !versionsStore.isSidepanelOpen && nodeConfigOpenMode.value !== "dock") {
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

// Resize config panel when switching between side-by-side and bottom layouts
watch(nodeOutputLayout, () => {
  setRect({ width: panelDefaultWidth.value });
});

// ─── Jump marks context (provided to NodeConfigWrapper via inject) ────────────

const jumpMarksContext = {
  sections: ref<JumpMark[]>([]),
  activeSection: ref<number | null>(null),
  hasAdvancedOptions: ref(false),
  activateFn: shallowRef<((index: number) => void) | null>(null),
};
provide(DIALOG_JUMP_MARKS_KEY, jumpMarksContext);

const JUMP_MARKS_WIDTH = 128;
/** How many px of the jump marks panel remain visible when collapsed (peeking) */
const JUMP_MARKS_PEEK = 40;
/** Gap used only in docked mode where the panel sits beside the edge */
const JUMP_MARKS_GAP = 8;
/** Delay (ms) before collapsing jump marks after mouse leaves — prevents flicker */
const HOVER_LEAVE_DELAY = 80;

// ─── Hover tracking — drives jump marks expand/collapse animation ─────────────

const isConfigAreaHovered = ref(false);
let hoverLeaveTimer: ReturnType<typeof setTimeout> | null = null;

const onConfigAreaMouseenter = () => {
  if (hoverLeaveTimer) {
    clearTimeout(hoverLeaveTimer);
    hoverLeaveTimer = null;
  }
  isConfigAreaHovered.value = true;
};

const onConfigAreaMouseleave = () => {
  hoverLeaveTimer = setTimeout(() => {
    isConfigAreaHovered.value = false;
  }, HOVER_LEAVE_DELAY);
};

onUnmounted(() => {
  if (hoverLeaveTimer) {
    clearTimeout(hoverLeaveTimer);
  }
});

/** Jump marks are fully expanded when: docked (always visible) or area is hovered */
const jumpMarksExpanded = computed(
  () => dockedSide.value !== null || isConfigAreaHovered.value,
);

const floatingJumpMarksStyles = computed(() => {
  const base = { position: "fixed" as const, width: `${JUMP_MARKS_WIDTH}px` };

  if (dockedSide.value === "left") {
    return { ...base, left: `${rectState.value.width + JUMP_MARKS_GAP}px`, top: "0px", maxHeight: "100dvh" };
  }
  if (dockedSide.value === "right") {
    return {
      ...base,
      left: `calc(100vw - ${rectState.value.width + JUMP_MARKS_WIDTH + JUMP_MARKS_GAP}px)`,
      top: "0px",
      maxHeight: "100dvh",
    };
  }
  // Floating: right edge flush against the dialog's left edge.
  // Collapsed → slide right so only PEEK_WIDTH is visible (rest hidden under dialog).
  const shift = jumpMarksExpanded.value ? 0 : JUMP_MARKS_WIDTH - JUMP_MARKS_PEEK;
  return {
    ...base,
    left: `${rectState.value.left - JUMP_MARKS_WIDTH}px`,
    top: `${rectState.value.top}px`,
    maxHeight: `${rectState.value.height}px`,
    transform: `translateX(${shift}px)`,
  };
});

// ─── Companion description panel ─────────────────────────────────────────────

/** Position the description panel to the right of the config panel. */
const placeDescriptionPanel = () => {
  const descLeft = Math.min(
    rectState.value.left + rectState.value.width + DESCRIPTION_PANEL_GAP,
    window.innerWidth - DESCRIPTION_PANEL_WIDTH - VIEWPORT_MARGIN,
  );
  setDescRect({
    left: descLeft,
    top: rectState.value.top,
    width: DESCRIPTION_PANEL_WIDTH,
    height: rectState.value.height,
  });
};

watch(showNodeDescriptionPanel, (open) => {
  if (open) {
    placeDescriptionPanel();
  }
});

const descPanelStyles = computed(() => ({
  left: `${descRectState.value.left}px`,
  top: `${descRectState.value.top}px`,
  width: `${descRectState.value.width}px`,
  height: `${descRectState.value.height}px`,
}));

const panelStyles = computed(() => {
  if (dockedSide.value === "left") {
    return {
      left: "0px",
      top: "0px",
      width: `${rectState.value.width}px`,
      height: "100dvh",
    };
  }
  if (dockedSide.value === "right") {
    return {
      left: `calc(100vw - ${rectState.value.width}px)`,
      top: "0px",
      width: `${rectState.value.width}px`,
      height: "100dvh",
    };
  }
  return {
    left: `${rectState.value.left}px`,
    top: `${rectState.value.top}px`,
    width: `${rectState.value.width}px`,
    height: `${rectState.value.height}px`,
  };
});

// ─── Dragging (config panel) ───────────────────────────────────────────────────

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

  // Undock first if currently docked — reposition panel so header is under cursor
  if (dockedSide.value !== null) {
    dockedSide.value = null;
    setRect({
      left: Math.max(
        VIEWPORT_MARGIN,
        Math.min(
          event.clientX - rectState.value.width / 2,
          window.innerWidth - rectState.value.width - VIEWPORT_MARGIN,
        ),
      ),
      top: Math.max(VIEWPORT_MARGIN, event.clientY - HEADER_HEIGHT / 2),
      height: DEFAULT_HEIGHT,
    });
  }

  isDragging.value = true;
  const startLeft = event.clientX - rectState.value.left;
  const startTop = event.clientY - rectState.value.top;

  const onMove = (e: MouseEvent) => {
    setRect({ left: e.clientX - startLeft, top: e.clientY - startTop });
    if (e.clientX < DOCK_THRESHOLD) {
      dockPreviewSide.value = "left";
    } else if (e.clientX > window.innerWidth - DOCK_THRESHOLD) {
      dockPreviewSide.value = "right";
    } else {
      dockPreviewSide.value = null;
    }
  };

  const onUp = (e: MouseEvent) => {
    isDragging.value = false;
    if (e.clientX < DOCK_THRESHOLD) {
      dockedSide.value = "left";
    } else if (e.clientX > window.innerWidth - DOCK_THRESHOLD) {
      dockedSide.value = "right";
    }
    dockPreviewSide.value = null;
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  };

  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
  event.preventDefault();
};

// ─── Dragging (description panel) ─────────────────────────────────────────────

const isDescDragging = ref(false);

const onDescHeaderMouseDown = (event: MouseEvent) => {
  if (!(event.target as HTMLElement).closest(".header")) {
    return;
  }
  if ((event.target as HTMLElement).closest("button")) {
    return;
  }

  isDescDragging.value = true;
  const startLeft = event.clientX - descRectState.value.left;
  const startTop = event.clientY - descRectState.value.top;

  const onMove = (e: MouseEvent) => {
    setDescRect({
      left: e.clientX - startLeft,
      top: e.clientY - startTop,
    });
  };

  const onUp = () => {
    isDescDragging.value = false;
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  };

  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
  event.preventDefault();
};

</script>

<template>
  <!-- Dock-zone preview shown while dragging the header near a screen edge -->
  <div
    v-if="dockPreviewSide !== null"
    :class="['dock-preview', `dock-preview--${dockPreviewSide}`]"
    :style="{ width: `${rectState.width}px` }"
  />

  <!--
    Jump marks rendered BEFORE the config panel so the dialog (same z-index,
    later in DOM) naturally stacks on top and covers the collapsed peek portion.
  -->
  <NodeConfigJumpMarks
    v-if="jumpMarksContext.sections.value.length > 0 && jumpMarksMode !== 'disabled'"
    variant="floating"
    :sections="jumpMarksContext.sections.value"
    :active-section="jumpMarksContext.activeSection.value"
    :style="floatingJumpMarksStyles"
    @activate-section="jumpMarksContext.activateFn.value?.($event)"
    @mouseenter="onConfigAreaMouseenter"
    @mouseleave="onConfigAreaMouseleave"
  />

  <ResizableComponentWrapper
    :class="['node-config-floating-panel', dockedSide && `docked-${dockedSide}`]"
    :min-size="{ width: panelMinWidth, height: MIN_HEIGHT }"
    :rect-state="rectState"
    :style="panelStyles"
    @custom-resize="setRect"
    @mouseenter="onConfigAreaMouseenter"
    @mouseleave="onConfigAreaMouseleave"
  >
    <!-- Panel body — inner RightPanelHeader (.header) acts as drag handle -->
    <div
      class="floating-panel-content"
      :style="isDragging ? { pointerEvents: 'none' } : {}"
      @mousedown.capture="onHeaderMouseDown"
    >
      <template v-if="nodeOutputLayout === 'side-by-side'">
        <div class="port-view-section">
          <NodeOutput />
        </div>
        <div class="panel-divider" />
      </template>
      <div class="config-section">
        <NodeConfig
          v-if="useEmbeddedDialogs"
          @close="() => { dockedSide = null; panelStore.isRightPanelExpanded = false; }"
        />
        <ManageVersionsWrapper v-else />
      </div>
    </div>
  </ResizableComponentWrapper>

  <!-- Companion node description panel -->
  <ResizableComponentWrapper
    v-if="showNodeDescriptionPanel && useEmbeddedDialogs"
    class="node-desc-floating-panel"
    :min-size="{ width: 280, height: MIN_HEIGHT }"
    :rect-state="descRectState"
    :style="descPanelStyles"
    @custom-resize="setDescRect"
  >
    <div
      class="floating-panel-content"
      :style="isDescDragging ? { pointerEvents: 'none' } : {}"
      @mousedown.capture="onDescHeaderMouseDown"
    >
      <NodeConfigDescriptionPanel />
    </div>
  </ResizableComponentWrapper>
</template>

<style lang="postcss" scoped>
.node-config-floating-panel,
.node-desc-floating-panel {
  position: fixed;
  z-index: v-bind("$zIndices.layerFloatingWindows");
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 8px;
  background-color: var(--kds-color-surface-default);
  box-shadow: var(--shadow-elevation-2);
}

/* ── Docked states ─────────────────────────────────────────────────────────── */
.node-config-floating-panel.docked-left {
  border-radius: 0 8px 8px 0;
}

.node-config-floating-panel.docked-right {
  border-radius: 8px 0 0 8px;
}

/* ── Dock-zone preview overlay (shown while dragging near a screen edge) ───── */
.dock-preview {
  position: fixed;
  top: 0;
  height: 100dvh;
  pointer-events: none;
  z-index: v-bind("$zIndices.layerFloatingWindows");
  background-color: var(--kds-color-surface-default);
  opacity: 0.35;
  border: 2px dashed var(--kds-color-border-default, var(--knime-silver-sand));
  transition: opacity 100ms ease;

  &.dock-preview--left {
    left: 0;
    border-radius: 0 8px 8px 0;
    border-left: none;
  }

  &.dock-preview--right {
    right: 0;
    border-radius: 8px 0 0 8px;
    border-right: none;
  }
}

.floating-panel-content {
  /* inner RightPanelHeader becomes the drag handle */
  :deep(.header) {
    cursor: move;
    user-select: none;
  }

  display: flex;
  flex: 1;
  flex-direction: row;
  min-height: 0;
  overflow: hidden;
}

.port-view-section {
  flex: 2;
  min-width: 220px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-divider {
  width: 1px;
  flex-shrink: 0;
  background-color: var(--kds-color-border-default, var(--knime-silver-sand));
}

.config-section {
  flex: 1;
  min-width: 560px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
