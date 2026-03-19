<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useTemplateRef,
  watch,
} from "vue";
import { storeToRefs } from "pinia";

import ComponentIcon from "@knime/styles/img/icons/component.svg";
import MetanodeIcon from "@knime/styles/img/icons/metanode.svg";
import NodeIcon from "@knime/styles/img/icons/node.svg";
import CloseIcon from "@knime/styles/img/icons/circle-close.svg";
import WarningIcon from "@knime/styles/img/icons/sign-warning.svg";
import AnnotationModeIcon from "@knime/styles/img/icons/pencil.svg";

import type { KnimeNode } from "@/api/custom-types";
import type { WorkflowAnnotation } from "@/api/gateway-api/generated-api";
import { Node } from "@/api/gateway-api/generated-api";
import SidebarPanelLayout from "@/components/common/side-panel/SidebarPanelLayout.vue";
import SidebarPanelScrollContainer from "@/components/common/side-panel/SidebarPanelScrollContainer.vue";
import SkeletonItem from "@/components/common/skeleton-loader/SkeletonItem.vue";
import {
  annotationToWorkflowObject,
  nodeToWorkflowObject,
} from "@/lib/workflow-canvas";
import { TABS, usePanelStore } from "@/store/panel";
import { useCurrentCanvasStore } from "@/store/canvas/useCurrentCanvasStore";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useSelectionStore } from "@/store/selection";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { useWorkflowMonitorStore } from "@/store/workflowMonitor/workflowMonitor";

import WorkflowMonitorContent from "./WorkflowMonitorContent.vue";
import WorkflowMonitorMessage from "./WorkflowMonitorMessage.vue";

type NodeResult = { kind: "node"; node: KnimeNode };
type AnnotationResult = { kind: "annotation"; annotation: WorkflowAnnotation };
type SearchResult = NodeResult | AnnotationResult;

const panelStore = usePanelStore();
const { activeWorkflow } = storeToRefs(useWorkflowStore());
const nodeInteractionsStore = useNodeInteractionsStore();
const workflowMonitorStore = useWorkflowMonitorStore();
const { currentState: monitorState, isLoading } =
  storeToRefs(workflowMonitorStore);
const { selectedNodeIds, selectedAnnotationIds } = storeToRefs(
  useSelectionStore(),
);

const query = ref("");
const activeIndex = ref(0);
const inputRef = useTemplateRef<HTMLInputElement>("inputRef");
const resultsRef = useTemplateRef<HTMLElement>("resultsRef");

// ─── Monitor lifecycle ────────────────────────────────────────────────────────

onMounted(() => workflowMonitorStore.activateWorkflowMonitor());
onBeforeUnmount(() => workflowMonitorStore.deactivateWorkflowMonitor());

// ─── Search data ──────────────────────────────────────────────────────────────

const allResults = computed<SearchResult[]>(() => {
  if (!activeWorkflow.value) return [];
  const nodes: SearchResult[] = Object.values(activeWorkflow.value.nodes).map(
    (node) => ({ kind: "node", node }),
  );
  const annotations: SearchResult[] = (
    activeWorkflow.value.workflowAnnotations ?? []
  ).map((annotation) => ({ kind: "annotation", annotation }));
  return [...nodes, ...annotations];
});

const filteredResults = computed<SearchResult[]>(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return allResults.value;
  return allResults.value.filter((result) => {
    if (result.kind === "node") {
      const label = result.node.annotation?.text?.value?.toLowerCase() ?? "";
      const name =
        nodeInteractionsStore.getNodeName(result.node.id)?.toLowerCase() ?? "";
      return (
        label.includes(q) ||
        name.includes(q) ||
        result.node.id.toLowerCase().includes(q)
      );
    } else {
      const text = result.annotation.text?.value?.toLowerCase() ?? "";
      return (
        text.includes(q) || result.annotation.id.toLowerCase().includes(q)
      );
    }
  });
});

const isSearchActive = computed(() => query.value.trim().length > 0);

watch(filteredResults, () => {
  activeIndex.value = 0;
});

// ─── Selection highlight ──────────────────────────────────────────────────────

const isResultSelected = (result: SearchResult) => {
  if (result.kind === "node") {
    return selectedNodeIds.value.includes(result.node.id);
  }
  return selectedAnnotationIds.value.includes(result.annotation.id);
};

// ─── Monitor state lookup ─────────────────────────────────────────────────────

const nodeMonitorState = (nodeId: string) => {
  const error = monitorState.value.errors?.find((e) => e.nodeId === nodeId);
  const warning = monitorState.value.warnings?.find(
    (w) => w.nodeId === nodeId,
  );
  return { error: error ?? null, warning: warning ?? null };
};

// ─── Labels ───────────────────────────────────────────────────────────────────

const resultLabel = (result: SearchResult) => {
  if (result.kind === "node") {
    return (
      result.node.annotation?.text?.value ||
      nodeInteractionsStore.getNodeName(result.node.id) ||
      result.node.id
    );
  }
  return result.annotation.text?.value || result.annotation.id;
};

const resultSubLabel = (result: SearchResult) => {
  if (result.kind !== "node") return null;
  const name = nodeInteractionsStore.getNodeName(result.node.id);
  const label = result.node.annotation?.text?.value;
  return name && name !== label ? name : null;
};

// ─── Focus management ─────────────────────────────────────────────────────────

const focusInput = async () => {
  query.value = "";
  activeIndex.value = 0;
  await nextTick();
  inputRef.value?.focus();
};

// Focus when panel opens to this tab
watch(
  () =>
    panelStore.isTabActive(TABS.WORKFLOW_MONITOR) &&
    panelStore.isLeftPanelExpanded,
  async (active) => {
    if (active) await focusInput();
  },
);

// Re-focus when shortcut is triggered (even if panel is already open)
watch(
  () => panelStore.searchFocusTrigger,
  async () => {
    await focusInput();
  },
);

// ─── Navigation ───────────────────────────────────────────────────────────────

const navigateTo = async (result: SearchResult) => {
  const selectionStore = useSelectionStore();
  const canvasStore = useCurrentCanvasStore();

  if (result.kind === "node") {
    const { wasAborted } = await selectionStore.tryClearSelection({
      keepNodesInSelection: [result.node.id],
    });
    if (wasAborted) return;
    canvasStore.value.moveObjectIntoView(nodeToWorkflowObject(result.node));
  } else {
    const { wasAborted } = await selectionStore.tryClearSelection();
    if (wasAborted) return;
    selectionStore.selectAnnotations([result.annotation.id]);
    canvasStore.value.moveObjectIntoView(
      annotationToWorkflowObject(result.annotation),
    );
  }
};

const scrollActiveIntoView = async () => {
  await nextTick();
  const el = resultsRef.value?.children[activeIndex.value] as
    | HTMLElement
    | undefined;
  el?.scrollIntoView({ block: "nearest" });
};

const onKeyDown = (event: KeyboardEvent) => {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    activeIndex.value = Math.min(
      activeIndex.value + 1,
      filteredResults.value.length - 1,
    );
    scrollActiveIntoView();
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    activeIndex.value = Math.max(activeIndex.value - 1, 0);
    scrollActiveIntoView();
  } else if (event.key === "Enter") {
    const result = filteredResults.value[activeIndex.value];
    if (result) navigateTo(result);
  }
};
</script>

<template>
  <SidebarPanelLayout>
    <template #header>
      <h2>Monitor</h2>
    </template>

    <!-- Search input — always visible -->
    <div class="search-row">
      <svg
        class="search-icon"
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
      >
        <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.2" />
        <path
          d="M11 11l3 3"
          stroke="currentColor"
          stroke-width="1.2"
          stroke-linecap="round"
        />
      </svg>
      <input
        ref="inputRef"
        v-model="query"
        class="search-input"
        placeholder="Search nodes and annotations… (⌘P)"
        type="text"
        @keydown="onKeyDown"
      />
      <button
        v-if="query"
        class="clear-btn"
        aria-label="Clear search"
        @click="query = ''"
      >
        ✕
      </button>
    </div>

    <!-- Search results (query active) -->
    <div v-if="isSearchActive" ref="resultsRef" class="search-results" role="listbox">
      <div v-if="filteredResults.length === 0" class="no-results">
        No results found
      </div>
      <button
        v-for="(result, index) in filteredResults"
        :key="result.kind === 'node' ? result.node.id : result.annotation.id"
        class="result-item"
        :class="{ active: index === activeIndex, selected: isResultSelected(result) }"
        role="option"
        :aria-selected="index === activeIndex"
        @click="navigateTo(result)"
        @mouseenter="activeIndex = index"
      >
        <!-- Category icon -->
        <span class="cat-badge">
          <ComponentIcon
            v-if="
              result.kind === 'node' &&
              result.node.kind === Node.KindEnum.Component
            "
            class="cat-icon"
          />
          <MetanodeIcon
            v-else-if="
              result.kind === 'node' &&
              result.node.kind === Node.KindEnum.Metanode
            "
            class="cat-icon"
          />
          <AnnotationModeIcon
            v-else-if="result.kind === 'annotation'"
            class="cat-icon"
          />
          <NodeIcon v-else class="cat-icon" />
        </span>

        <!-- Text content -->
        <span class="result-text">
          <span class="result-label">{{ resultLabel(result) }}</span>
          <span v-if="resultSubLabel(result)" class="result-sublabel">{{
            resultSubLabel(result)
          }}</span>
          <template v-if="result.kind === 'node'">
            <span
              v-if="nodeMonitorState(result.node.id).error"
              class="issue-msg error-msg"
            >
              {{ nodeMonitorState(result.node.id).error!.message }}
            </span>
            <span
              v-else-if="nodeMonitorState(result.node.id).warning"
              class="issue-msg warning-msg"
            >
              {{ nodeMonitorState(result.node.id).warning!.message }}
            </span>
          </template>
        </span>

        <!-- Error / warning badge -->
        <span
          v-if="result.kind === 'node' && nodeMonitorState(result.node.id).error"
          class="issue-badge error-badge"
          title="Error"
        >
          <CloseIcon class="badge-icon" />
        </span>
        <span
          v-else-if="
            result.kind === 'node' &&
            nodeMonitorState(result.node.id).warning
          "
          class="issue-badge warning-badge"
          title="Warning"
        >
          <WarningIcon class="badge-icon" />
        </span>
      </button>
    </div>

    <!-- Workflow monitor content (idle) -->
    <SidebarPanelScrollContainer v-else>
      <template v-if="isLoading">
        <div class="loading-category">
          <SkeletonItem width="100px" height="24px" />
        </div>
        <WorkflowMonitorMessage v-for="i in 3" :key="i" skeleton />
      </template>
      <WorkflowMonitorContent v-else />
    </SidebarPanelScrollContainer>
  </SidebarPanelLayout>
</template>

<style lang="postcss" scoped>
.search-row {
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: var(--kds-color-surface-subtle);
  border-radius: var(--kds-border-radius-container-0-25x);
  border: 1px solid var(--kds-color-border-subtle);
  padding: 0 var(--kds-spacing-container-0-5x);
  margin-bottom: var(--kds-spacing-container-0-5x);
  flex-shrink: 0;
}

.search-icon {
  flex-shrink: 0;
  color: var(--kds-color-text-secondary);
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  padding: var(--kds-spacing-container-0-5x) 0;
  font-size: var(--kds-core-font-size-0-87x);
  color: var(--kds-color-text-primary);

  &::placeholder {
    color: var(--kds-color-text-placeholder);
  }
}

.clear-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--kds-color-text-secondary);
  font-size: 11px;
  padding: 2px;
  line-height: 1;
  flex-shrink: 0;

  &:hover {
    color: var(--kds-color-text-primary);
  }
}

.search-results {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.no-results {
  padding: var(--kds-spacing-container-1x) 0;
  color: var(--kds-color-text-secondary);
  text-align: center;
  font-size: var(--kds-core-font-size-0-87x);
}

.result-item {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: var(--kds-spacing-container-0-5x);
  padding: var(--kds-spacing-container-0-5x);
  background: transparent;
  border: none;
  border-radius: var(--kds-border-radius-container-0-25x);
  cursor: pointer;
  text-align: left;
  font-size: var(--kds-core-font-size-0-87x);
  color: var(--kds-color-text-primary);

  &.active,
  &:hover {
    background-color: var(--kds-color-surface-hover);
  }

  &.selected {
    border: 1px solid var(--knime-cornflower);
  }
}

.cat-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  min-width: 20px;
  border-radius: var(--kds-border-radius-container-0-25x);
  background-color: var(--kds-color-surface-subtle);
  border: 1px solid var(--kds-color-border-subtle);
  margin-top: 1px;
}

.cat-icon {
  width: 12px;
  height: 12px;
  color: var(--kds-color-text-secondary);
}

.result-text {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
  min-width: 0;
  gap: 1px;
}

.result-label {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-sublabel {
  font-size: var(--kds-core-font-size-0-75x);
  color: var(--kds-color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.issue-msg {
  font-size: var(--kds-core-font-size-0-75x);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.error-msg {
  color: v-bind("$colors.error");
}

.warning-msg {
  color: var(--kds-color-text-secondary);
}

.issue-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  min-width: 16px;
  flex-shrink: 0;
  margin-top: 2px;
}

.badge-icon {
  width: 14px;
  height: 14px;
}

.error-badge .badge-icon {
  &:deep(circle) {
    fill: v-bind("$colors.error");
    stroke: v-bind("$colors.error");
  }

  &:deep(path) {
    stroke: var(--knime-white);
    stroke-width: 5px;
  }
}

.warning-badge .badge-icon {
  &:deep(polygon) {
    fill: v-bind("$colors.warning");
  }
}

.loading-category {
  text-align: center;
  padding: 20px;
}
</style>
