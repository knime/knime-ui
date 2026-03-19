<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from "vue";
import { storeToRefs } from "pinia";

import { KdsBadge } from "@knime/kds-components";

import type { KnimeNode } from "@/api/custom-types";
import type { WorkflowAnnotation } from "@/api/gateway-api/generated-api";
import { Node } from "@/api/gateway-api/generated-api";
import SidebarPanelLayout from "@/components/common/side-panel/SidebarPanelLayout.vue";
import {
  annotationToWorkflowObject,
  nodeToWorkflowObject,
} from "@/lib/workflow-canvas";
import { TABS, usePanelStore } from "@/store/panel";
import { useSelectionStore } from "@/store/selection";
import { useCurrentCanvasStore } from "@/store/canvas/useCurrentCanvasStore";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";

type NodeResult = { kind: "node"; node: KnimeNode };
type AnnotationResult = { kind: "annotation"; annotation: WorkflowAnnotation };
type SearchResult = NodeResult | AnnotationResult;

const panelStore = usePanelStore();
const { activeWorkflow } = storeToRefs(useWorkflowStore());
const nodeInteractionsStore = useNodeInteractionsStore();

const query = ref("");
const activeIndex = ref(0);
const inputRef = useTemplateRef<HTMLInputElement>("inputRef");

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
      const name = nodeInteractionsStore.getNodeName(result.node.id)?.toLowerCase() ?? "";
      return label.includes(q) || name.includes(q) || result.node.id.toLowerCase().includes(q);
    } else {
      const text = result.annotation.text?.value?.toLowerCase() ?? "";
      return text.includes(q) || result.annotation.id.toLowerCase().includes(q);
    }
  });
});

const resultLabel = (result: SearchResult) => {
  if (result.kind === "node") {
    return result.node.annotation?.text?.value || nodeInteractionsStore.getNodeName(result.node.id) || result.node.id;
  }
  return result.annotation.text?.value || result.annotation.id;
};

const resultSubLabel = (result: SearchResult) => {
  if (result.kind !== "node") return null;
  const name = nodeInteractionsStore.getNodeName(result.node.id);
  const label = result.node.annotation?.text?.value;
  // Show node type name as sublabel only when it differs from the displayed label
  return name && name !== label ? name : null;
};

const resultKindLabel = (result: SearchResult) => {
  if (result.kind === "annotation") return "Annotation";
  if (result.node.kind === Node.KindEnum.Component) return "Component";
  if (result.node.kind === Node.KindEnum.Metanode) return "Metanode";
  return "Node";
};

watch(filteredResults, () => {
  activeIndex.value = 0;
});

// Focus input when panel opens
watch(
  () => panelStore.isTabActive(TABS.WORKFLOW_MONITOR) && panelStore.isLeftPanelExpanded,
  async (active) => {
    if (active) {
      query.value = "";
      activeIndex.value = 0;
      await nextTick();
      inputRef.value?.focus();
    }
  },
);

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

const onKeyDown = (event: KeyboardEvent) => {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    activeIndex.value = Math.min(
      activeIndex.value + 1,
      filteredResults.value.length - 1,
    );
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    activeIndex.value = Math.max(activeIndex.value - 1, 0);
  } else if (event.key === "Enter") {
    const result = filteredResults.value[activeIndex.value];
    if (result) navigateTo(result);
  }
};
</script>

<template>
  <SidebarPanelLayout>
    <template #header>
      <h2>Search</h2>
    </template>

    <div class="search-body" @keydown="onKeyDown">
      <input
        ref="inputRef"
        v-model="query"
        class="search-input"
        placeholder="Search nodes and annotations…"
        type="text"
      />
      <div class="results" role="listbox">
        <div v-if="filteredResults.length === 0" class="no-results">
          No results found
        </div>
        <button
          v-for="(result, index) in filteredResults"
          :key="result.kind === 'node' ? result.node.id : result.annotation.id"
          class="result-item"
          :class="{ active: index === activeIndex }"
          role="option"
          :aria-selected="index === activeIndex"
          @click="navigateTo(result)"
          @mouseenter="activeIndex = index"
        >
          <KdsBadge variant="neutral">{{ resultKindLabel(result) }}</KdsBadge>
          <span class="result-text">
            <span class="result-label">{{ resultLabel(result) }}</span>
            <span v-if="resultSubLabel(result)" class="result-sublabel">{{ resultSubLabel(result) }}</span>
          </span>
        </button>
      </div>
    </div>
  </SidebarPanelLayout>
</template>

<style lang="postcss" scoped>
.search-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.search-input {
  width: 100%;
  border: none;
  outline: none;
  padding: var(--kds-spacing-container-0-5x) var(--kds-spacing-container-0-75x);
  font-size: var(--kds-core-font-size-0-87x);
  background: var(--kds-color-surface-subtle);
  color: var(--kds-color-text-primary);
  border-radius: var(--kds-border-radius-container-0-25x);
  box-sizing: border-box;
  margin-bottom: var(--kds-spacing-container-0-5x);
}

.results {
  flex: 1;
  overflow-y: auto;
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
  padding: var(--kds-spacing-container-0-5x) var(--kds-spacing-container-0-5x);
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
}

.result-text {
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
</style>
