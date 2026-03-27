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
import AnnotationIcon from "@knime/styles/img/icons/pencil.svg";

import type { KnimeNode } from "@/api/custom-types";
import type { WorkflowAnnotation } from "@/api/gateway-api/generated-api";
import { Node } from "@/api/gateway-api/generated-api";
import {
  annotationToWorkflowObject,
  nodeToWorkflowObject,
} from "@/lib/workflow-canvas";
import { usePanelStore } from "@/store/panel";
import { useCurrentCanvasStore } from "@/store/canvas/useCurrentCanvasStore";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useSelectionStore } from "@/store/selection";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { useWorkflowMonitorStore } from "@/store/workflowMonitor/workflowMonitor";

type NodeResult = { kind: "node"; node: KnimeNode };
type AnnotationResult = { kind: "annotation"; annotation: WorkflowAnnotation };
type FlowVarResult = { kind: "flowvar"; sourceNodeId: string };
type SearchResult = NodeResult | AnnotationResult | FlowVarResult;

const panelStore = usePanelStore();
const { searchFocusTrigger } = storeToRefs(panelStore);
const { activeWorkflow } = storeToRefs(useWorkflowStore());
const nodeInteractionsStore = useNodeInteractionsStore();
const workflowMonitorStore = useWorkflowMonitorStore();
const { currentState: monitorState } = storeToRefs(workflowMonitorStore);

const query = ref("");
const activeIndex = ref(0);
const inputRef = useTemplateRef<HTMLInputElement>("inputRef");
const resultsRef = useTemplateRef<HTMLElement>("resultsRef");

const flowVarSourceNodeIds = computed<Set<string>>(() => {
  if (!activeWorkflow.value) return new Set();
  const set = new Set<string>();
  Object.values(activeWorkflow.value.connections ?? {}).forEach((conn) => {
    if (conn.flowVariableConnection) { set.add(conn.sourceNode); }
  });
  return set;
});

const allResults = computed<SearchResult[]>(() => {
  if (!activeWorkflow.value) return [];
  const nodes: SearchResult[] = Object.values(activeWorkflow.value.nodes).map(
    (node) => ({ kind: "node", node }),
  );
  const annotations: SearchResult[] = (
    activeWorkflow.value.workflowAnnotations ?? []
  ).map((annotation) => ({ kind: "annotation", annotation }));
  const flowVars: SearchResult[] = [...flowVarSourceNodeIds.value].map(
    (sourceNodeId) => ({ kind: "flowvar", sourceNodeId }),
  );
  return [...nodes, ...annotations, ...flowVars];
});

const nodeMatchesQuery = (result: NodeResult, q: string) => {
  const label = result.node.annotation?.text?.value?.toLowerCase() ?? "";
  const name = nodeInteractionsStore.getNodeName(result.node.id)?.toLowerCase() ?? "";
  return label.includes(q) || name.includes(q) || result.node.id.toLowerCase().includes(q);
};

const annotationMatchesQuery = (result: AnnotationResult, q: string) => {
  const text = result.annotation.text?.value?.toLowerCase() ?? "";
  return text.includes(q) || result.annotation.id.toLowerCase().includes(q);
};

const flowVarMatchesQuery = (result: FlowVarResult, q: string) => {
  const node = activeWorkflow.value?.nodes[result.sourceNodeId];
  if (!node) { return false; }
  const label = node.annotation?.text?.value?.toLowerCase() ?? "";
  const name = nodeInteractionsStore.getNodeName(result.sourceNodeId)?.toLowerCase() ?? "";
  return label.includes(q) || name.includes(q) || "flow variable".includes(q);
};

const matchesQuery = (result: SearchResult, q: string): boolean => {
  if (result.kind === "node") { return nodeMatchesQuery(result, q); }
  if (result.kind === "annotation") { return annotationMatchesQuery(result, q); }
  return flowVarMatchesQuery(result, q);
};

const filteredResults = computed<SearchResult[]>(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) { return allResults.value; }
  return allResults.value.filter((result) => matchesQuery(result, q));
});

watch(filteredResults, () => {
  activeIndex.value = 0;
});

const resultLabel = (result: SearchResult): string => {
  if (result.kind === "node") {
    return (
      result.node.annotation?.text?.value ||
      nodeInteractionsStore.getNodeName(result.node.id) ||
      result.node.id
    );
  } else if (result.kind === "annotation") {
    return result.annotation.text?.value || result.annotation.id;
  } else {
    const node = activeWorkflow.value?.nodes[result.sourceNodeId];
    return (
      node?.annotation?.text?.value ||
      nodeInteractionsStore.getNodeName(result.sourceNodeId) ||
      result.sourceNodeId
    );
  }
};

const resultSubLabel = (result: SearchResult): string | null => {
  if (result.kind === "node") {
    const name = nodeInteractionsStore.getNodeName(result.node.id);
    const label = result.node.annotation?.text?.value;
    return name && name !== label ? name : null;
  }
  if (result.kind === "flowvar") { return "Exposes flow variables"; }
  return null;
};

const nodeMonitorState = (nodeId: string) => ({
  error: monitorState.value.errors?.find((e) => e.nodeId === nodeId) ?? null,
  warning: monitorState.value.warnings?.find((w) => w.nodeId === nodeId) ?? null,
});

const { selectedNodeIds, selectedAnnotationIds } = storeToRefs(useSelectionStore());

const isResultSelected = (result: SearchResult) => {
  if (result.kind === "node") { return selectedNodeIds.value.includes(result.node.id); }
  if (result.kind === "annotation") { return selectedAnnotationIds.value.includes(result.annotation.id); }
  return selectedNodeIds.value.includes(result.sourceNodeId);
};

const navigateTo = async (result: SearchResult) => {
  const selectionStore = useSelectionStore();
  const canvasStore = useCurrentCanvasStore();
  const nodeId =
    result.kind === "node"
      ? result.node.id
      : result.kind === "flowvar"
        ? result.sourceNodeId
        : null;
  if (nodeId) {
    const node = activeWorkflow.value?.nodes[nodeId];
    if (!node) { return; }
    const { wasAborted } = await selectionStore.tryClearSelection({ keepNodesInSelection: [nodeId] });
    if (wasAborted) { return; }
    await nextTick();
    canvasStore.value.moveObjectIntoView({ ...nodeToWorkflowObject(node), forceMove: true });
  } else if (result.kind === "annotation") {
    const { wasAborted } = await selectionStore.tryClearSelection();
    if (wasAborted) { return; }
    selectionStore.selectAnnotations([result.annotation.id]);
    await nextTick();
    canvasStore.value.moveObjectIntoView({ ...annotationToWorkflowObject(result.annotation), forceMove: true });
  }
};

const scrollActiveIntoView = async () => {
  await nextTick();
  (resultsRef.value?.children[activeIndex.value] as HTMLElement | undefined)?.scrollIntoView({
    block: "nearest",
  });
};

const close = () => {
  panelStore.isSearchPanelOpen = false;
};

const focusInput = async () => {
  query.value = "";
  activeIndex.value = 0;
  await nextTick();
  inputRef.value?.focus();
};

watch(searchFocusTrigger, async () => {
  await focusInput();
});

/** Gap between .canvas-overlay-top-left bottom and the search panel — matches SidebarFloatingPanel */
const PANEL_GAP = 4;
const panelPos = ref({ left: 12, top: 60 });

onMounted(async () => {
  await focusInput();
  window.addEventListener("keydown", onGlobalKeyDown);
  const overlay = document.querySelector<HTMLElement>(".canvas-overlay-top-left");
  if (overlay) {
    const r = overlay.getBoundingClientRect();
    panelPos.value = { left: r.left, top: r.bottom + PANEL_GAP };
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onGlobalKeyDown);
});

const onGlobalKeyDown = (event: KeyboardEvent) => {
  if (event.key === "Escape") { close(); }
};

const onKeyDown = (event: KeyboardEvent) => {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    activeIndex.value = Math.min(activeIndex.value + 1, filteredResults.value.length - 1);
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

const resultKey = (result: SearchResult): string => {
  if (result.kind === "node") return `node-${result.node.id}`;
  if (result.kind === "annotation") return `ann-${result.annotation.id}`;
  return `fv-${result.sourceNodeId}`;
};
</script>

<template>
  <div class="search-panel" role="dialog" aria-label="Search workflow">
    <div class="search-header">
      <svg class="search-icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
        <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5" />
        <path d="M11 11l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
      <input
        ref="inputRef"
        v-model="query"
        class="search-input"
        placeholder="Search nodes, annotations, flow variables… (⌘F)"
        type="text"
        @keydown="onKeyDown"
      />
      <button v-if="query" class="clear-btn" aria-label="Clear search" @click="query = ''">✕</button>
      <button class="close-btn" aria-label="Close search" @click="close">✕</button>
    </div>

    <div v-if="query.trim()" ref="resultsRef" class="search-results" role="listbox">
      <div v-if="filteredResults.length === 0" class="no-results">No results found</div>

      <button
        v-for="(result, index) in filteredResults"
        :key="resultKey(result)"
        class="result-item"
        :class="{ active: index === activeIndex, selected: isResultSelected(result) }"
        role="option"
        :aria-selected="index === activeIndex"
        @click="navigateTo(result)"
        @mouseenter="activeIndex = index"
      >
        <span class="cat-badge" :class="{ 'fv-badge': result.kind === 'flowvar' }">
          <ComponentIcon
            v-if="result.kind === 'node' && result.node.kind === Node.KindEnum.Component"
            class="cat-icon"
          />
          <MetanodeIcon
            v-else-if="result.kind === 'node' && result.node.kind === Node.KindEnum.Metanode"
            class="cat-icon"
          />
          <AnnotationIcon v-else-if="result.kind === 'annotation'" class="cat-icon" />
          <NodeIcon v-else class="cat-icon" />
        </span>

        <span class="result-text">
          <span class="result-label">{{ resultLabel(result) }}</span>
          <span v-if="resultSubLabel(result)" class="result-sublabel">{{ resultSubLabel(result) }}</span>
          <template v-if="result.kind === 'node'">
            <span v-if="nodeMonitorState(result.node.id).error" class="issue-msg error-msg">
              {{ nodeMonitorState(result.node.id).error!.message }}
            </span>
            <span v-else-if="nodeMonitorState(result.node.id).warning" class="issue-msg warning-msg">
              {{ nodeMonitorState(result.node.id).warning!.message }}
            </span>
          </template>
        </span>

        <span
          v-if="result.kind === 'node' && nodeMonitorState(result.node.id).error"
          class="issue-badge error-badge"
          title="Error"
        >
          <CloseIcon class="badge-icon" />
        </span>
        <span
          v-else-if="result.kind === 'node' && nodeMonitorState(result.node.id).warning"
          class="issue-badge warning-badge"
          title="Warning"
        >
          <WarningIcon class="badge-icon" />
        </span>
      </button>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.search-panel {
  position: fixed;
  z-index: v-bind("$zIndices.layerFloatingWindows");
  top: v-bind("panelPos.top + 'px'");
  left: v-bind("panelPos.left + 'px'");
  width: 360px;
  height: 600px;
  max-height: calc(100dvh - 80px);
  background-color: var(--kds-color-surface-default);
  border-radius: var(--kds-border-radius-container-0-50x);
  box-shadow: var(--kds-elevation-level-3);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.search-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-bottom: 1px solid rgb(26 26 26 / 10%);
  flex-shrink: 0;
}

.search-icon {
  flex-shrink: 0;
  color: var(--kds-color-text-and-icon-neutral-faint);
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: var(--kds-core-font-size-0-87x);
  color: var(--kds-color-text-and-icon-neutral);
  min-width: 0;

  &::placeholder {
    color: var(--kds-color-text-and-icon-neutral-faint);
  }
}

.clear-btn,
.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--kds-color-text-and-icon-neutral-faint);
  font-size: 11px;
  padding: 2px 4px;
  line-height: 1;
  flex-shrink: 0;
  border-radius: 3px;

  &:hover {
    color: var(--kds-color-text-and-icon-neutral);
    background-color: var(--kds-color-background-neutral-hover);
  }
}

.search-results {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
  min-height: 0;
}

.no-results {
  padding: 16px;
  color: var(--kds-color-text-and-icon-neutral-faint);
  text-align: center;
  font-size: var(--kds-core-font-size-0-87x);
}

.result-item {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 8px;
  background: transparent;
  border: none;
  border-radius: var(--kds-border-radius-container-0-25x);
  cursor: pointer;
  text-align: left;
  font-size: var(--kds-core-font-size-0-87x);
  color: var(--kds-color-text-and-icon-neutral);

  &.active,
  &:hover {
    background-color: var(--kds-color-background-neutral-hover);
  }

  &.selected {
    outline: 1px solid var(--knime-cornflower);
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
  border: 1px solid rgb(26 26 26 / 10%);
  margin-top: 1px;

  &.fv-badge {
    background-color: rgb(200 230 255 / 40%);
    border-color: rgb(60 130 200 / 30%);
  }
}

.cat-icon {
  width: 12px;
  height: 12px;
  color: var(--kds-color-text-and-icon-neutral-faint);
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
  color: var(--kds-color-text-and-icon-neutral-faint);
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
  color: var(--kds-color-text-and-icon-neutral-faint);
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
</style>
