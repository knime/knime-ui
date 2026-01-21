import { type Ref, computed, readonly, ref } from "vue";

import type { WorkflowObject } from "@/api/custom-types";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { nodeToWorkflowObject } from "@/util/workflowUtil";

import type { SelectionMode } from "./types";
import { useStateWithPreview } from "./utils";

type UseNodeSelectionOptions = {
  focusedObject: Ref<WorkflowObject | null>;
  shouldHideSelection: Ref<boolean>;
};

export const useNodeSelection = (options: UseNodeSelectionOptions) => {
  const workflowStore = useWorkflowStore();

  const {
    committedSelection,
    previewSelection,
    hasUncommittedSelection,
    updatePreview,
    commitSelection,
  } = useStateWithPreview();

  /**
   * List of selected nodes ids. Defaults to "committed" mode.
   */
  const selectedNodeIds = computed(() => [...committedSelection.values()]);

  /**
   * List of selected nodes. Defaults to "committed" mode.
   */
  const getSelectedNodes = computed(() => {
    return workflowStore.activeWorkflow
      ? selectedNodeIds.value
          .map((id) => workflowStore.activeWorkflow!.nodes[id])
          .filter(Boolean)
      : [];
  });

  /**
   * When only one node is selected, return it; otherwise `null`. Doesn't account
   * for other types of objects in the selection (e.g annotations)
   * Defaults to "committed" mode.
   */
  const singleSelectedNode = computed(() => {
    if (selectedNodeIds.value.length !== 1) {
      return null;
    }

    const id = selectedNodeIds.value[0];
    return workflowStore.activeWorkflow!.nodes[id];
  });

  const selectedComponentPlaceholder = ref<string | null>(null);

  const setNodeSelection = (nodeIds: string[], mode: SelectionMode) => {
    // clear placeholder because it can not be part of a selection with others
    if (selectedComponentPlaceholder.value) {
      selectedComponentPlaceholder.value = null;
    }

    const newSelected: Record<string, boolean> = Object.fromEntries(
      nodeIds
        .filter((id) => workflowStore.activeWorkflow?.nodes[id])
        .map((id) => [id, true]),
    );

    updatePreview(newSelected);

    if (mode === "committed") {
      commitSelection();
    }
  };

  const getSelectedComponentPlaceholder = computed(() => {
    if (!selectedComponentPlaceholder.value || !workflowStore.activeWorkflow) {
      return null;
    }

    return (
      workflowStore.activeWorkflow.componentPlaceholders?.find(
        (component) => component.id === selectedComponentPlaceholder.value,
      ) ?? null
    );
  });

  const focusedNode = computed<WorkflowObject | null>(() => {
    if (
      options.focusedObject.value?.type !== "node" ||
      !workflowStore.activeWorkflow
    ) {
      return null;
    }

    const node =
      workflowStore.activeWorkflow.nodes[options.focusedObject.value.id];

    return node ? nodeToWorkflowObject(node) : null;
  });

  const selectAll = (mode: SelectionMode = "committed") => {
    setNodeSelection(Object.keys(workflowStore.activeWorkflow!.nodes), mode);

    if (selectedComponentPlaceholder.value) {
      selectedComponentPlaceholder.value = null;
    }
  };

  const deselectAll = (
    preserveNodeSelectionFor: string[] = [],
    mode: SelectionMode = "committed",
  ) => {
    setNodeSelection(preserveNodeSelectionFor, mode);

    if (selectedComponentPlaceholder.value) {
      selectedComponentPlaceholder.value = null;
    }
  };

  /**
   * Returns the visual selection states for a given node. This only uses
   * selection preview instead of a committed selection
   */
  const getNodeVisualSelectionStates = (nodeId: string) => {
    const showSelection = computed(() => {
      if (options.shouldHideSelection.value) {
        return false;
      }

      if (selectedComponentPlaceholder.value === nodeId) {
        return true;
      }

      return previewSelection.has(nodeId);
    });

    const showFocus = computed(() => focusedNode.value?.id === nodeId);

    return {
      showFocus,
      showSelection,
    };
  };

  const query = (mode: SelectionMode) => {
    const _state = mode === "committed" ? committedSelection : previewSelection;

    const selectedNodeIds = computed(() => [..._state.values()]);
    const singleSelectedNode = computed(() => {
      if (selectedNodeIds.value.length !== 1) {
        return null;
      }

      const id = selectedNodeIds.value[0];
      return workflowStore.activeWorkflow!.nodes[id];
    });

    const getSelectedNodes = computed(() => {
      return workflowStore.activeWorkflow
        ? selectedNodeIds.value
            .map((id) => workflowStore.activeWorkflow!.nodes[id])
            .filter(Boolean)
        : [];
    });

    const isNodeSelected = (id: string) => _state.has(id);

    return {
      selectedNodeIds,
      singleSelectedNode,
      getSelectedNodes,
      isNodeSelected,
    };
  };

  return {
    selectedNodeIds,
    singleSelectedNode,
    getSelectedNodes,

    isNodeSelected: (id: string) =>
      committedSelection.has(id) || previewSelection.has(id),

    selectNodes: (ids: string[], mode: SelectionMode = "committed") => {
      if (mode === "committed") {
        setNodeSelection([...selectedNodeIds.value, ...ids], mode);
      } else {
        setNodeSelection([...previewSelection.values(), ...ids], mode);
      }
    },

    deselectNodes: (ids: string[], mode: SelectionMode = "committed") =>
      setNodeSelection(
        selectedNodeIds.value.filter((id) => !ids.includes(id)),
        mode,
      ),

    getSelectedComponentPlaceholder,
    selectComponentPlaceholder: (newComponentPlaceholderId: string) => {
      selectedComponentPlaceholder.value = newComponentPlaceholderId;
    },
    deselectComponentPlaceholder: () =>
      (selectedComponentPlaceholder.value = null),

    getNodeVisualSelectionStates,

    internal: {
      previewSelectedNodes: readonly(previewSelection),
      committedSelectedNodes: readonly(committedSelection),
      focusedNode,
      selectAll,
      deselectAll,
      commitSelection,
      hasUncommittedSelection,
      query,
    },
  };
};
