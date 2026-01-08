import { computed, ref } from "vue";
import { defineStore } from "pinia";

import { useCompositeViewStore } from "@/store/compositeView/compositeView";
import { useNodeConfigurationStore } from "@/store/nodeConfiguration/nodeConfiguration";
import { useWorkflowStore } from "@/store/workflow/workflow";
import type { WorkflowObject } from "@/util/workflow-canvas";
import {
  annotationToWorkflowObject,
  componentPlaceholderToWorkflowObject,
  nodeToWorkflowObject,
} from "@/util/workflow-canvas/mappers";
import { useMovingStore } from "../workflow/moving";

import { useAnnotationSelection } from "./annotations";
import { useConnectionSelection } from "./connections";
import { useNodeSelection } from "./nodes";
import { usePortbarSelection } from "./portbars";
import { useNodePortSelection } from "./ports";
import type { SelectionMode } from "./types";

export const useSelectionStore = defineStore("selection", () => {
  const workflowStore = useWorkflowStore();

  const shouldHideSelection = ref(false);
  const focusedObject = ref<WorkflowObject | null>(null);

  const nodeSelection = useNodeSelection({
    shouldHideSelection,
    focusedObject,
  });
  const annotationSelection = useAnnotationSelection({
    shouldHideSelection,
    focusedObject,
  });
  const connectionSelection = useConnectionSelection();
  const portbarSelection = usePortbarSelection();
  const nodePortSelection = useNodePortSelection();

  /**
   * Returns the selected WorkflowObject when there's exactly one selected
   * in the whole Workflow; otherwise `null`
   * This includes: nodes, annotations and loading component placeholders.
   * Defaults to "committed" mode.
   */
  const singleSelectedObject = computed(() => {
    if (
      nodeSelection.getSelectedNodes.value.length > 1 ||
      annotationSelection.getSelectedAnnotations.value.length > 1
    ) {
      return null;
    }

    if (
      nodeSelection.singleSelectedNode.value &&
      !annotationSelection.singleSelectedAnnotation.value &&
      !nodeSelection.getSelectedComponentPlaceholder.value
    ) {
      return {
        ...nodeSelection.singleSelectedNode.value.position,
        id: nodeSelection.singleSelectedNode.value.id,
        type: "node",
      } as const as WorkflowObject;
    }

    if (
      annotationSelection.singleSelectedAnnotation.value &&
      !nodeSelection.singleSelectedNode.value &&
      !nodeSelection.getSelectedComponentPlaceholder.value
    ) {
      return {
        id: annotationSelection.singleSelectedAnnotation.value.id,
        type: "annotation",
        ...annotationSelection.singleSelectedAnnotation.value.bounds,
      } as const as WorkflowObject;
    }

    if (
      nodeSelection.getSelectedComponentPlaceholder.value &&
      !annotationSelection.singleSelectedAnnotation.value &&
      !nodeSelection.singleSelectedNode.value
    ) {
      return {
        id: nodeSelection.getSelectedComponentPlaceholder.value.id,
        type: "componentPlaceholder",
        ...nodeSelection.getSelectedComponentPlaceholder.value.position,
      } as const as WorkflowObject;
    }

    return null;
  });

  const selectedObjects = computed<WorkflowObject[]>(() => [
    ...nodeSelection.getSelectedNodes.value.map(nodeToWorkflowObject),

    ...annotationSelection.getSelectedAnnotations.value.map(
      annotationToWorkflowObject,
    ),

    ...(nodeSelection.getSelectedComponentPlaceholder?.value
      ? [
          componentPlaceholderToWorkflowObject(
            nodeSelection.getSelectedComponentPlaceholder.value,
          ),
        ]
      : []),
  ]);

  const isSelectionEmpty = computed(
    () =>
      nodeSelection.selectedNodeIds.value.length === 0 &&
      connectionSelection.selectedConnectionIds.value.length === 0 &&
      connectionSelection.selectedBendpointIds.value.length === 0 &&
      annotationSelection.selectedAnnotationIds.value.length === 0 &&
      Boolean(!nodeSelection.getSelectedComponentPlaceholder.value),
  );

  const getFocusedObject = computed(() => {
    const { activeWorkflow } = workflowStore;

    if (!focusedObject.value || !activeWorkflow) {
      return null;
    }

    const focusedNode = nodeSelection.internal.focusedNode.value;
    const focusedAnnotation =
      annotationSelection.internal.focusedAnnotation.value;

    return focusedNode ?? focusedAnnotation ?? null;
  });

  const connectionsBetweenSelectedNodes = computed(() => {
    const { activeWorkflow } = workflowStore;

    if (!activeWorkflow) {
      return [];
    }

    return Object.values(activeWorkflow.connections).filter(
      (conn) =>
        nodeSelection.internal.committedSelectedNodes.has(conn.sourceNode) &&
        nodeSelection.internal.committedSelectedNodes.has(conn.destNode),
    );
  });

  /**
   * Selects all objects in the workflow.
   */
  const selectAllObjects = (mode: SelectionMode = "committed") => {
    nodeSelection.internal.selectAll(mode);
    annotationSelection.internal.selectAll(mode);
    connectionSelection.selectAllBendpointsInConnections(
      connectionsBetweenSelectedNodes.value,
    );
  };

  /**
   *  Deselects all objects in the workflow.
   *
   * @param preserveNodeSelectionFor the nodes will be exempt from deselecting, avoiding
   *  unnecessary vue reactivity. In case they were not selected, they will be selected afterwards.
   */
  const deselectAllObjects = (
    preserveNodeSelectionFor: string[] = [],
    mode: SelectionMode = "committed",
  ) => {
    nodeSelection.internal.deselectAll(preserveNodeSelectionFor, mode);
    annotationSelection.internal.deselectAll(mode);
    connectionSelection.internal.deselectAll();
    portbarSelection.internal.deselectAll();
    nodePortSelection.deselectNodePort();

    if (preserveNodeSelectionFor.length > 1) {
      connectionSelection.selectAllBendpointsInConnections(
        connectionsBetweenSelectedNodes.value,
      );
    }

    focusedObject.value = null;
  };

  /**
   * Checks whether the active selection can be cleared. For example
   * changing from one node to another, which would not be possible if the node
   * has an unsaved configuration.
   *
   * @returns whether the selection can be cleared or not.
   */
  const canClearCurrentSelection = () => {
    return (
      !useCompositeViewStore().isCompositeViewDirty &&
      !useNodeConfigurationStore().isDirty
    );
  };

  /**
   * Prompts the user if they want to discard unsaved changes.
   * Will not modify the selection itself; it just prompts the user.
   *
   * @returns Whether the user aborted or not
   */
  const promptUserAboutClearingSelection = async () => {
    const { canContinue, didPrompt } =
      (await useCompositeViewStore().clickAwayCompositeView()) &&
      (await useNodeConfigurationStore().autoApplySettings());

    return { wasAborted: !canContinue, didPrompt };
  };

  /**
   * Tries to clear the current selection. If the selection cannot be cleared
   * then the user will be prompted; the action to clear can then be aborted
   * based on the user's response.
   *
    @returns Whether the user aborted or not
   */
  const tryClearSelection = async (
    params: { keepNodesInSelection?: string[] } = { keepNodesInSelection: [] },
  ): Promise<{ wasAborted: boolean; didPrompt: boolean }> => {
    if (canClearCurrentSelection()) {
      deselectAllObjects(params.keepNodesInSelection, "committed");
      return { wasAborted: false, didPrompt: false };
    }

    const { wasAborted, didPrompt } = await promptUserAboutClearingSelection();

    if (wasAborted) {
      return { wasAborted: true, didPrompt };
    } else {
      deselectAllObjects(params.keepNodesInSelection, "committed");
      return { wasAborted: false, didPrompt };
    }
  };

  // only expose public actions
  const { internal: _nodeInternal, ...nodeSelectionActions } = nodeSelection;
  const { internal: _annotationInternal, ...annotationSelectionActions } =
    annotationSelection;
  const { internal: _connectionInternal, ...connectionActions } =
    connectionSelection;
  const { internal: _portbarInternal, ...portbarActions } = portbarSelection;

  /**
   * Queries the selection state based on a given mode.
   * @param mode
   * @returns reactive values to determine different states from the current selection
   */
  const querySelection = (mode: SelectionMode) => {
    const {
      singleSelectedNode,
      getSelectedNodes,
      selectedNodeIds,
      isNodeSelected,
    } = nodeSelection.internal.query(mode);
    const {
      singleSelectedAnnotation,
      getSelectedAnnotations,
      selectedAnnotationIds,
      isAnnotationSelected,
    } = annotationSelection.internal.query(mode);

    /**
     * Returns the selected WorkflowObject when there's exactly one selected
     * in the whole Workflow; otherwise `null`
     * This includes: nodes, annotations and loading component placeholders.
     */
    const singleSelectedObject = computed(() => {
      if (
        getSelectedNodes.value.length > 1 ||
        getSelectedAnnotations.value.length > 1
      ) {
        return null;
      }

      if (
        singleSelectedNode.value &&
        !singleSelectedAnnotation.value &&
        !nodeSelection.getSelectedComponentPlaceholder.value
      ) {
        return {
          ...singleSelectedNode.value.position,
          id: singleSelectedNode.value.id,
          type: "node",
        } as const as WorkflowObject;
      }

      if (
        singleSelectedAnnotation.value &&
        !singleSelectedNode.value &&
        !nodeSelection.getSelectedComponentPlaceholder.value
      ) {
        return {
          id: singleSelectedAnnotation.value.id,
          type: "annotation",
          ...singleSelectedAnnotation.value.bounds,
        } as const as WorkflowObject;
      }

      if (
        nodeSelection.getSelectedComponentPlaceholder.value &&
        !singleSelectedAnnotation.value &&
        !singleSelectedNode.value
      ) {
        return {
          id: nodeSelection.getSelectedComponentPlaceholder.value.id,
          type: "componentPlaceholder",
          ...nodeSelection.getSelectedComponentPlaceholder.value.position,
        } as const as WorkflowObject;
      }

      return null;
    });

    const selectedObjects = computed<WorkflowObject[]>(() => [
      ...getSelectedNodes.value.map(nodeToWorkflowObject),

      ...getSelectedAnnotations.value.map(annotationToWorkflowObject),

      ...(nodeSelection.getSelectedComponentPlaceholder?.value
        ? [
            componentPlaceholderToWorkflowObject(
              nodeSelection.getSelectedComponentPlaceholder.value,
            ),
          ]
        : []),
    ]);

    const isSelectionEmpty = computed(
      () =>
        selectedNodeIds.value.length === 0 &&
        connectionSelection.selectedConnectionIds.value.length === 0 &&
        connectionSelection.selectedBendpointIds.value.length === 0 &&
        selectedAnnotationIds.value.length === 0 &&
        Boolean(!nodeSelection.getSelectedComponentPlaceholder.value),
    );

    const hasUncommittedSelection = computed(
      () =>
        nodeSelection.internal.hasUncommittedSelection.value ||
        annotationSelection.internal.hasUncommittedSelection.value,
    );

    return {
      singleSelectedObject,
      singleSelectedNode,
      getSelectedNodes,
      selectedNodeIds,
      singleSelectedAnnotation,
      getSelectedAnnotations,
      selectedAnnotationIds,
      selectedObjects,
      isSelectionEmpty,
      hasUncommittedSelection,
      isNodeSelected,
      isAnnotationSelected,
    };
  };

  const getAnnotationVisualSelectionState = (annotationId: string) => {
    const movingStore = useMovingStore();
    const { showSelection, showFocus } =
      annotationSelection.getAnnotationVisualSelectionState(annotationId);

    const showTransformControls = computed(() => {
      if (movingStore.isDragging || !workflowStore.isWritable) {
        return false;
      }

      return singleSelectedObject.value !== null && showSelection.value;
    });

    return {
      showFocus,
      showSelection,
      showTransformControls,
    };
  };

  return {
    promptUserAboutClearingSelection,
    canClearCurrentSelection,
    querySelection,
    selectAllObjects,
    deselectAllObjects,
    tryClearSelection,
    focusObject: (object: WorkflowObject | null) => {
      focusedObject.value = object;
    },

    shouldHideSelection,
    singleSelectedObject,
    selectedObjects,
    isSelectionEmpty,
    getFocusedObject,

    ...nodeSelectionActions,
    ...annotationSelectionActions,
    ...connectionActions,
    ...portbarActions,
    ...nodePortSelection,

    getAnnotationVisualSelectionState,

    selectNodes: (ids: string[], mode: SelectionMode = "committed") => {
      nodeSelection.selectNodes(ids, mode);

      if (mode === "committed") {
        connectionSelection.selectAllBendpointsInConnections(
          connectionsBetweenSelectedNodes.value,
        );
      }
    },

    selectComponentPlaceholder: (newComponentPlaceholderId: string) => {
      deselectAllObjects();
      nodeSelection.selectComponentPlaceholder(newComponentPlaceholderId);
    },

    commitSelectionPreview: () => {
      nodeSelection.internal.commitSelection();
      connectionSelection.selectAllBendpointsInConnections(
        connectionsBetweenSelectedNodes.value,
      );
      annotationSelection.internal.commitSelection();
    },
  };
});
