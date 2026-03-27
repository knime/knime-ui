import { ref, watch } from "vue";
import { defineStore } from "pinia";

import * as $shapes from "@/style/shapes";
import { useWorkflowStore } from "@/store/workflow/workflow";

export type NodeCustomSize = { width: number; height: number };

/** Minimum total card height (header + minimum body) */
export const MIN_NODE_CARD_HEIGHT = $shapes.compactNodeCardHeight + 30;
export const MAX_NODE_CARD_HEIGHT = 800;
export const MIN_NODE_CARD_WIDTH = 80;
export const MAX_NODE_CARD_WIDTH = 600;

const LS_PREFIX = "knime-node-custom-sizes:";

const lsKey = (workflowId: string) => `${LS_PREFIX}${workflowId}`;

const loadFromStorage = (workflowId: string): Record<string, NodeCustomSize> => {
  try {
    const raw = localStorage.getItem(lsKey(workflowId));
    return raw ? (JSON.parse(raw) as Record<string, NodeCustomSize>) : {};
  } catch {
    return {};
  }
};

const saveToStorage = (workflowId: string, data: Record<string, NodeCustomSize>) => {
  try {
    if (Object.keys(data).length === 0) {
      localStorage.removeItem(lsKey(workflowId));
    } else {
      localStorage.setItem(lsKey(workflowId), JSON.stringify(data));
    }
  } catch {
    // ignore storage errors (e.g. private browsing quota)
  }
};

/**
 * Stores per-node custom card dimensions (width × total height including header).
 * Persisted to localStorage per workflow. Used by NodeTorsoCard (PIXI rendering)
 * and the inline view overlays.
 */
export const useNodeCustomSizesStore = defineStore("nodeCustomSizes", () => {
  const workflowStore = useWorkflowStore();
  const sizes = ref<Record<string, NodeCustomSize>>({});

  // Track current workflow ID so we can scope persistence correctly.
  let currentWorkflowId: string | null = null;

  watch(
    () => workflowStore.getProjectAndWorkflowIds.workflowId,
    (workflowId) => {
      currentWorkflowId = workflowId ?? null;
      sizes.value = workflowId ? loadFromStorage(workflowId) : {};
    },
    { immediate: true },
  );

  const getSize = (nodeId: string): NodeCustomSize | null =>
    sizes.value[nodeId] ?? null;

  const setSize = (nodeId: string, size: NodeCustomSize) => {
    sizes.value = { ...sizes.value, [nodeId]: size };
    if (currentWorkflowId) {
      saveToStorage(currentWorkflowId, sizes.value);
    }
  };

  const clearSize = (nodeId: string) => {
    const next = { ...sizes.value };
    delete next[nodeId];
    sizes.value = next;
    if (currentWorkflowId) {
      saveToStorage(currentWorkflowId, sizes.value);
    }
  };

  return { sizes, getSize, setSize, clearSize };
});
