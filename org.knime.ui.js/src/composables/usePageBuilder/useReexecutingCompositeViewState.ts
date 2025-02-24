import { type Ref, ref, watch } from "vue";

import { useSelectionStore } from "@/store/selection";

const reexecutingNodes: Ref<Set<string>> = ref(new Set<string>());

const isReexecuting = (nodeId: string) => {
  return reexecutingNodes.value.has(nodeId);
};

const addReexecutingNode = (nodeId: string): "added" | "alreadyExists" => {
  if (isReexecuting(nodeId)) {
    return "alreadyExists";
  }
  reexecutingNodes.value.add(nodeId);
  return "added";
};

const removeReexecutingNode = (nodeId: string) => {
  if (!isReexecuting(nodeId)) {
    return;
  }
  reexecutingNodes.value.delete(nodeId);
};

let isWatcherActive = false;

export const useReexecutingCompositeViewState = () => {
  if (!isWatcherActive) {
    watch(
      () => useSelectionStore().singleSelectedNode,
      (_, oldNode) => {
        if (oldNode) {
          removeReexecutingNode(oldNode?.id);
        }
      },
    );
    isWatcherActive = true;
  }

  return {
    isReexecuting,
    addReexecutingNode,
    removeReexecutingNode,
  };
};
