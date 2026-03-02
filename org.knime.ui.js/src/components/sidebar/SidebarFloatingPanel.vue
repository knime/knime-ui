<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, provide, ref, watch } from "vue";
import { storeToRefs } from "pinia";

import { TABS, usePanelStore } from "@/store/panel";
import ResizableComponentWrapper from "../uiExtensions/dataValueViews/ResizableComponentWrapper.vue";
import {
  type BoundingBox,
  useDraggableResizableRectState,
} from "../uiExtensions/dataValueViews/useDataValueView";

import SidebarContentLoading from "./SidebarContentLoading.vue";
import SidebarExtensionPanel from "./SidebarExtensionPanel.vue";

// ─── Async content components ────────────────────────────────────────────────

const ContextAwareDescription = defineAsyncComponent({
  loader: () =>
    import("@/components/nodeDescription/ContextAwareDescription.vue"),
  loadingComponent: SidebarContentLoading,
});

const NodeRepository = defineAsyncComponent({
  loader: () => import("@/components/nodeRepository/NodeRepository.vue"),
  loadingComponent: SidebarContentLoading,
});

const SidebarSpaceExplorer = defineAsyncComponent({
  loader: () => import("@/components/sidebar/SidebarSpaceExplorer.vue"),
  loadingComponent: SidebarContentLoading,
});

const KaiSidebar = defineAsyncComponent({
  loader: () => import("@/components/kai/KaiSidebar.vue"),
  loadingComponent: SidebarContentLoading,
});

const WorkflowMonitor = defineAsyncComponent({
  loader: () => import("@/components/workflowMonitor/WorkflowMonitor.vue"),
  loadingComponent: SidebarContentLoading,
});

// ─── State ────────────────────────────────────────────────────────────────────

const panelStore = usePanelStore();
const { isLeftPanelExpanded } = storeToRefs(panelStore);

// ─── Size / position ─────────────────────────────────────────────────────────

const DEFAULT_WIDTH = 360;
const DEFAULT_HEIGHT = 600;
const MIN_WIDTH = 280;
const MIN_HEIGHT = 200;
/** Horizontal offset from the left edge of the overlay pill */
const LEFT_OFFSET = 12;
/** Gap between the bottom of the overlay pill and the panel */
const OVERLAY_GAP = 4;

const { state: rectState, setRect } = useDraggableResizableRectState();

const getDefaultPosition = (): Pick<BoundingBox, "left" | "top"> => {
  const overlay = document.querySelector<HTMLElement>(".canvas-overlay-top-left");
  if (overlay) {
    const rect = overlay.getBoundingClientRect();
    return { left: rect.left, top: rect.bottom + OVERLAY_GAP };
  }
  return { left: LEFT_OFFSET, top: 60 };
};

onMounted(() => {
  const { left, top } = getDefaultPosition();
  setRect({ left, top, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
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
  // Only drag when originating from the inner panel-header area
  if (!(event.target as HTMLElement).closest(".panel-header")) {
    return;
  }
  if ((event.target as HTMLElement).closest("button")) {
    return;
  }

  isDragging.value = true;
  const startLeft = event.clientX - rectState.value.left;
  const startTop = event.clientY - rectState.value.top;

  const onMove = (e: MouseEvent) => {
    setRect({ left: e.clientX - startLeft, top: e.clientY - startTop });
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

// ─── Close ────────────────────────────────────────────────────────────────────

const close = () => {
  panelStore.isLeftPanelExpanded = false;
  panelStore.closeExtensionPanel();
};

// Provide close so SidebarPanelLayout can render the button inside the header
provide("fpClose", close);

// Reposition when re-opened to default if it gets too far off screen
watch(isLeftPanelExpanded, (expanded) => {
  if (!expanded) {
    return;
  }
  const rect = rectState.value;
  const isOffScreen =
    rect.left + rect.width < 0 ||
    rect.top + rect.height < 0 ||
    rect.left > window.innerWidth ||
    rect.top > window.innerHeight;
  if (isOffScreen) {
    const { left, top } = getDefaultPosition();
    setRect({ left, top });
  }
});
</script>

<template>
  <ResizableComponentWrapper
    v-if="isLeftPanelExpanded"
    class="sidebar-floating-panel"
    :min-size="{ width: MIN_WIDTH, height: MIN_HEIGHT }"
    :rect-state="rectState"
    :style="panelStyles"
    @custom-resize="setRect"
  >
    <!-- Tab content — inner .panel-header acts as drag handle -->
    <div class="fp-body" :style="isDragging ? { pointerEvents: 'none' } : {}" @mousedown.capture="onHeaderMouseDown">
      <ContextAwareDescription
        v-if="panelStore.isTabActive(TABS.CONTEXT_AWARE_DESCRIPTION)"
      />
      <NodeRepository
        v-if="panelStore.isTabActive(TABS.NODE_REPOSITORY)"
      />
      <SidebarSpaceExplorer
        v-if="panelStore.isTabActive(TABS.SPACE_EXPLORER)"
      />
      <KaiSidebar v-if="panelStore.isTabActive(TABS.KAI)" />
      <WorkflowMonitor v-if="panelStore.isTabActive(TABS.WORKFLOW_MONITOR)" />
    </div>

    <!-- Extension panel (node description pop-out, K-AI wide mode, etc.) -->
    <SidebarExtensionPanel />
  </ResizableComponentWrapper>
</template>

<style lang="postcss" scoped>
.sidebar-floating-panel {
  position: fixed;
  z-index: v-bind("$zIndices.layerFloatingWindows");
  display: flex;
  flex-direction: column;
  overflow: visible; /* allow extension panel to overflow */
  border-radius: var(--kds-border-radius-container-0-50x);
  background-color: var(--kds-color-surface-default);
  box-shadow: var(--shadow-elevation-2);
}

.fp-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  border-radius: var(--kds-border-radius-container-0-50x);

  /* Inner panel-header becomes the drag handle */
  :deep(.panel-header) {
    cursor: move;
    user-select: none;
  }
}

/* Override the fixed-position SidebarExtensionPanel to appear adjacent */
:deep(.extension-panel) {
  position: absolute;
  left: auto;
  right: calc(-360px - 2px);
  top: 0;
  width: 360px;
  height: 100%;
  border-radius: 0 8px 8px 0;
  overflow: hidden;
}
</style>
