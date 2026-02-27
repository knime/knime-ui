<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";

import { FunctionButton } from "@knime/components";
import CloseIcon from "@knime/styles/img/icons/close.svg";

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
/** Left margin: 12px gap + 48px buttons + 8px gap */
const LEFT_OFFSET = 68;
const TOP_OFFSET = 40;
const VIEWPORT_MARGIN = 12;

const { state: rectState, setRect } = useDraggableResizableRectState();

const DEFAULT_TOOLBAR_HEIGHT = 50; // fallback if CSS var not available

const getDefaultPosition = (): Pick<BoundingBox, "left" | "top"> => {
  const toolbarHeight =
    parseInt(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--app-toolbar-height",
      ),
      10,
    ) || DEFAULT_TOOLBAR_HEIGHT;
  return {
    left: LEFT_OFFSET,
    top: toolbarHeight + TOP_OFFSET,
  };
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

// ─── Active tab title ─────────────────────────────────────────────────────────

const tabTitles: Partial<Record<string, string>> = {
  [TABS.CONTEXT_AWARE_DESCRIPTION]: "Info",
  [TABS.NODE_REPOSITORY]: "Nodes",
  [TABS.SPACE_EXPLORER]: "Explorer",
  [TABS.KAI]: "K-AI",
  [TABS.WORKFLOW_MONITOR]: "Monitor",
};

const activeTabTitle = computed(() => {
  for (const [tab, title] of Object.entries(tabTitles)) {
    if (panelStore.isTabActive(tab as any)) {
      return title;
    }
  }
  return "Panel";
});

// ─── Dragging ─────────────────────────────────────────────────────────────────

const isDragging = ref(false);

const onHeaderMouseDown = (event: MouseEvent) => {
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
    <!-- Drag handle header -->
    <div class="fp-header" @mousedown="onHeaderMouseDown">
      <span class="fp-title">{{ activeTabTitle }}</span>
      <FunctionButton compact class="close-btn" @click="close">
        <CloseIcon />
      </FunctionButton>
    </div>

    <!-- Tab content -->
    <div class="fp-body" :style="isDragging ? { pointerEvents: 'none' } : {}">
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
  border-radius: 8px;
  background-color: var(--sidebar-background-color);
  box-shadow: var(--shadow-elevation-2);
}

.fp-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-8) var(--space-8) var(--space-8) var(--space-16);
  background-color: var(--knime-gray-ultra-light);
  border-bottom: 1px solid var(--knime-silver-sand);
  border-radius: 8px 8px 0 0;
  cursor: move;
  user-select: none;
}

.fp-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--knime-masala);
}

.fp-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  border-radius: 0 0 8px 8px;
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
