import { type Ref, computed, ref } from "vue";
import { defineStore } from "pinia";

import type { WorkflowObject } from "@/api/custom-types";
import { isBrowser } from "@/environment";
import { useCompositeViewStore } from "@/store/compositeView/compositeView";
import { useNodeConfigurationStore } from "@/store/nodeConfiguration/nodeConfiguration";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { getBendpointId, parseBendpointId } from "@/util/connectorUtil";

export type NodeOutputTabIdentifier = "view" | `${number}` | null;

const selectionAdder =
  (target: Ref<Record<string, boolean>>) => (toAdd: string[] | string) => {
    if (Array.isArray(toAdd)) {
      toAdd.forEach((id) => (target.value[id] = true));
    } else {
      target.value[toAdd] = true;
    }
  };

const selectionRemover =
  (target: Ref<Record<string, boolean>>) => (toRemove: string[] | string) => {
    if (Array.isArray(toRemove)) {
      toRemove.forEach((id) => delete target.value[id]);
    } else {
      delete target.value[toRemove];
    }
  };

export const useSelectionStore = defineStore("selection", () => {
  const selectedNodes = ref<Record<string, boolean>>({});
  const getSelectedNodes = computed(() => {
    const workflowStore = useWorkflowStore();
    return workflowStore.activeWorkflow
      ? Object.keys(selectedNodes.value)
          .map((id) => workflowStore.activeWorkflow!.nodes[id])
          .filter(Boolean)
      : [];
  });
  const selectedNodeIds = computed(() =>
    getSelectedNodes.value.map(({ id }) => id),
  );

  const singleSelectedNode = computed(() => {
    return getSelectedNodes.value.length === 1
      ? getSelectedNodes.value[0]
      : null;
  });

  const canDiscardCurrentSelection = () => {
    // in the browser all operations to save
    // node configurations, etc are made on clickaway
    // without prompting the user, so we can always change the selection
    if (isBrowser()) {
      return true;
    }

    return (
      !useCompositeViewStore().isCompositeViewDirty &&
      !useNodeConfigurationStore().isDirty
    );
  };

  const preselectedNodes = ref<Record<string, boolean>>({});
  const preselectedAnnotations = ref<Record<string, boolean>>({});
  const preselectionMode = ref(false);

  const selectedComponentPlaceholder = ref<string | null>(null);

  const setNodeSelection = async (nodeIds: string[]) => {
    if (selectedComponentPlaceholder.value) {
      selectedComponentPlaceholder.value = null;
    }

    if (
      singleSelectedNode.value !== null &&
      (nodeIds.length === 0 ||
        nodeIds.some((id) => id !== singleSelectedNode.value!.id))
    ) {
      const canContinue =
        (await useCompositeViewStore().clickAwayCompositeView()) &&
        (await useNodeConfigurationStore().autoApplySettings());
      if (!canContinue) {
        return { wasAborted: true };
      }
    }
    const newSelected = {};
    nodeIds.forEach((id) => {
      newSelected[id] = true;
    });

    if (
      Object.keys(newSelected).length !==
        Object.keys(selectedNodes.value).length ||
      !nodeIds.every((id) => selectedNodes.value[id])
    ) {
      selectedNodes.value = newSelected;
    }
    return { wasAborted: false };
  };

  const getSelectedComponentPlaceholder = computed(() => {
    const workflowStore = useWorkflowStore();

    if (!selectedComponentPlaceholder.value) {
      return null;
    }

    return workflowStore.activeWorkflow
      ? workflowStore.activeWorkflow.componentPlaceholders!.find(
          (component) => component.id === selectedComponentPlaceholder.value,
        )
      : null;
  });

  const selectedConnections = ref<Record<string, boolean>>({});
  const getSelectedConnections = computed(() => {
    const workflowStore = useWorkflowStore();
    return workflowStore.activeWorkflow
      ? Object.keys(selectedConnections.value)
          .map((id) => workflowStore.activeWorkflow!.connections[id])
          .filter(Boolean)
      : [];
  });
  const selectedConnectionIds = computed(() =>
    getSelectedConnections.value.map(({ id }) => id),
  );

  const selectedBendpoints = ref<Record<string, boolean>>({});
  const selectedBendpointIds = computed(() =>
    Object.keys(selectedBendpoints.value),
  );
  const getSelectedBendpoints = computed(() => {
    if (!useWorkflowStore().activeWorkflow) {
      return {};
    }
    const result: Record<string, number[]> = {};
    Object.keys(selectedBendpoints.value).forEach((bendpointId) => {
      const { connectionId, index } = parseBendpointId(bendpointId);
      if (!result[connectionId]) {
        result[connectionId] = [];
      }
      result[connectionId].push(index);
    });
    return result;
  });

  const selectedAnnotations = ref<Record<string, boolean>>({});
  const selectedAnnotationIds = computed(() =>
    Object.keys(selectedAnnotations.value),
  );
  const getSelectedAnnotations = computed(() => {
    const workflowStore = useWorkflowStore();
    return workflowStore.activeWorkflow
      ? workflowStore.activeWorkflow.workflowAnnotations.filter(
          ({ id }) => selectedAnnotations.value[id],
        )
      : [];
  });
  const singleSelectedAnnotation = computed(() => {
    return getSelectedAnnotations.value.length === 1
      ? getSelectedAnnotations.value[0]
      : null;
  });

  type MetanodePortBarType = "in" | "out";
  const selectedMetanodePortBars = ref<Record<string, boolean>>({});
  const getSelectedMetanodePortBars = computed(
    () =>
      Object.keys(selectedMetanodePortBars.value).filter(
        (type) => selectedMetanodePortBars.value[type as MetanodePortBarType],
      ) as MetanodePortBarType[],
  );

  const activeNodePorts = ref({
    nodeId: null as string | null,
    selectedPort: null as any,
    isModificationInProgress: false,
  });
  const updateActiveNodePorts = (options) => {
    if ("nodeId" in options) {
      activeNodePorts.value.nodeId = options.nodeId;
    }
    if ("selectedPort" in options) {
      activeNodePorts.value.selectedPort = options.selectedPort;
    }
    if ("isModificationInProgress" in options) {
      activeNodePorts.value.isModificationInProgress =
        options.isModificationInProgress;
    }
  };

  const focusedObject = ref<WorkflowObject | null>(null);
  const startedSelectionFromAnnotationId = ref<string | null>(null);
  const didStartRectangleSelection = ref(false);

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
      !getSelectedComponentPlaceholder.value
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
      !getSelectedComponentPlaceholder.value
    ) {
      return {
        id: singleSelectedAnnotation.value.id,
        type: "annotation",
        ...singleSelectedAnnotation.value.bounds,
      } as const as WorkflowObject;
    }
    if (
      getSelectedComponentPlaceholder.value &&
      !singleSelectedAnnotation.value &&
      !singleSelectedNode.value
    ) {
      return {
        id: getSelectedComponentPlaceholder.value.id,
        type: "componentPlaceholder",
        ...getSelectedComponentPlaceholder.value.position,
      } as const as WorkflowObject;
    }
    return null;
  });

  const selectedObjects = computed(() => [
    ...getSelectedNodes.value.map(({ id, position }) => ({
      id,
      type: "node" as const,
      ...position,
    })),
    ...getSelectedAnnotations.value.map(({ id, bounds }) => ({
      id,
      type: "annotation" as const,
      ...bounds,
    })),
    ...(getSelectedComponentPlaceholder?.value
      ? [
          {
            id: getSelectedComponentPlaceholder.value.id,
            type: "componentPlaceholder" as const,
            ...getSelectedComponentPlaceholder.value.position,
          },
        ]
      : []),
  ]);

  const isSelectionEmpty = computed(
    () =>
      selectedNodeIds.value.length === 0 &&
      getSelectedConnections.value.length === 0 &&
      selectedAnnotationIds.value.length === 0 &&
      selectedBendpointIds.value.length === 0 &&
      Boolean(!getSelectedComponentPlaceholder.value),
  );

  const getFocusedObject = computed(() => {
    if (!focusedObject.value) {
      return null;
    }
    const workflowStore = useWorkflowStore();
    const { activeWorkflow } = workflowStore;
    if (!activeWorkflow) {
      return null;
    }

    const object = focusedObject.value;
    if (object.type === "node") {
      const node = activeWorkflow.nodes[object.id];
      return node ? { ...node.position, id: node.id, type: "node" } : null;
    }
    const annotation = activeWorkflow.workflowAnnotations.find(
      ({ id }) => id === object.id,
    );
    return annotation
      ? {
          id: annotation.id,
          type: "annotation",
          ...annotation.bounds,
        }
      : null;
  });

  const toggleAnnotationSelection = ({
    annotationId,
    isMultiselect,
    isSelected,
  }: {
    annotationId: string;
    isMultiselect: boolean;
    isSelected: boolean;
  }) => {
    if (
      annotationId === startedSelectionFromAnnotationId.value &&
      didStartRectangleSelection.value
    ) {
      startedSelectionFromAnnotationId.value = null;
      return;
    }

    if (!isMultiselect) {
      selectedAnnotations.value = { [annotationId]: true };
      return;
    }

    if (isSelected) {
      delete selectedAnnotations.value[annotationId];
    } else {
      selectedAnnotations.value[annotationId] = true;
    }
  };

  const connectionsBetweenSelectedNodes = computed(() => {
    const workflow = useWorkflowStore().activeWorkflow;
    if (!workflow) {
      return [];
    }
    return Object.values(workflow.connections).filter(
      (conn) =>
        selectedNodes.value[conn.sourceNode] &&
        selectedNodes.value[conn.destNode],
    );
  });

  const selectBendpointsBetweenSelectedNodes = () => {
    connectionsBetweenSelectedNodes.value.forEach((conn) => {
      const bendpoints = Array(conn.bendpoints?.length ?? 0)
        .fill(null)
        .map((_, i) => getBendpointId(conn.id, i));
      selectionAdder(selectedBendpoints)(bendpoints);
    });
  };

  /*
   *  Deselects all objects in the workflow. Can be interrupted by the user.
   *  @param preserveSelectionFor - the nodes will be except from deselecting avoiding unnecessary vue reactivity. In case they were not selected, they will be selected afterwards.
   */
  const deselectAllObjects = async (
    preserveNodeSelectionFor: string[] = [],
  ) => {
    const { wasAborted } = await setNodeSelection(preserveNodeSelectionFor);
    if (wasAborted) {
      return { wasAborted: true };
    }

    // don't override selection objects in case there is nothing selected
    // prevents unnecessary triggering of vue reactivity.
    if (Object.keys(selectedConnections.value).length > 0) {
      selectedConnections.value = {};
    }
    if (Object.keys(selectedAnnotations.value).length > 0) {
      selectedAnnotations.value = {};
    }
    if (Object.keys(selectedBendpoints.value).length > 0) {
      selectedBendpoints.value = {};
    }
    if (preserveNodeSelectionFor.length > 1) {
      selectBendpointsBetweenSelectedNodes();
    }
    if (Object.keys(selectedMetanodePortBars.value).length > 0) {
      selectedMetanodePortBars.value = {};
    }
    if (selectedComponentPlaceholder.value) {
      selectedComponentPlaceholder.value = null;
    }

    activeNodePorts.value = {
      nodeId: null,
      selectedPort: null,
      isModificationInProgress: false,
    };

    focusedObject.value = null;
    return { wasAborted: false };
  };

  const selectAllObjects = async () => {
    const { wasAborted } = await setNodeSelection(
      Object.keys(useWorkflowStore().activeWorkflow!.nodes),
    );

    if (wasAborted) {
      return { wasAborted: true };
    }

    if (selectedComponentPlaceholder.value) {
      selectedComponentPlaceholder.value = null;
    }

    useWorkflowStore().activeWorkflow!.workflowAnnotations.forEach(
      ({ id }) => (selectedAnnotations.value[id] = true),
    );

    return { wasAborted: false };
  };

  return {
    // actions
    selectAllObjects,
    deselectAllObjects,
    toggleAnnotationSelection,
    focusObject: (object: WorkflowObject | null) => {
      focusedObject.value = object;
    },

    // direct accessible state
    startedSelectionFromAnnotationId,
    didStartRectangleSelection,
    activePortTab: ref<NodeOutputTabIdentifier | null>(null),

    activeNodePorts,
    updateActiveNodePorts,
    shouldHideSelection: ref(false),

    preselectionMode,
    setPreselectionMode: (isPreselectionMode: boolean) => {
      preselectionMode.value = isPreselectionMode;
    },

    // getters
    selectedNodeIds,
    singleSelectedNode,
    getSelectedNodes,

    selectedAnnotationIds,
    getSelectedAnnotations,
    singleSelectedAnnotation,

    getSelectedMetanodePortBars,

    selectedBendpointIds,
    getSelectedBendpoints,

    selectedConnectionIds,
    getSelectedConnections,

    singleSelectedObject,
    selectedObjects,
    isSelectionEmpty,
    getFocusedObject,

    // selection state predicates
    isNodeSelected: (id: string) => Boolean(selectedNodes.value[id]),
    isNodePreselected: (id: string) =>
      preselectionMode.value && Boolean(preselectedNodes.value[id]),
    isAnnotationPreselected: (id: string) =>
      preselectionMode.value && Boolean(preselectedAnnotations.value[id]),
    isMetaNodePortBarSelected: (type: "in" | "out") =>
      Boolean(selectedMetanodePortBars.value[type]),
    isAnnotationSelected: (id: string) =>
      Boolean(selectedAnnotations.value[id]),
    isConnectionSelected: (id: string) =>
      Boolean(selectedConnections.value[id]),
    isBendpointSelected: (id: string) => Boolean(selectedBendpoints.value[id]),

    // adder and remover functions
    selectNodes: async (ids: string[]) => {
      const selectionResult = await setNodeSelection([
        ...Object.keys(selectedNodes.value),
        ...ids,
      ]);
      if (!selectionResult.wasAborted) {
        selectBendpointsBetweenSelectedNodes();
      }
      return selectionResult;
    },
    deselectNodes: (ids: string[]) =>
      setNodeSelection(
        Object.keys(selectedNodes.value).filter((id) => !ids.includes(id)),
      ),

    getSelectedComponentPlaceholder,
    selectComponentPlaceholder: async (newComponentPlaceholderId: string) => {
      await deselectAllObjects();
      selectedComponentPlaceholder.value = newComponentPlaceholderId;
    },
    deselectComponentPlaceholder: () =>
      (selectedComponentPlaceholder.value = null),

    preselectNodes: selectionAdder(preselectedNodes),
    preselectAnnotations: selectionAdder(preselectedAnnotations),
    deselectAllPreselectedObjects: () => {
      preselectedNodes.value = {};
      preselectedAnnotations.value = {};
    },

    selectMetanodePortBar: selectionAdder(selectedMetanodePortBars),
    deselectMetanodePortBar: selectionRemover(selectedMetanodePortBars),

    selectAnnotations: selectionAdder(selectedAnnotations),
    deselectAnnotations: selectionRemover(selectedAnnotations),

    selectBendpoints: selectionAdder(selectedBendpoints),
    deselectBendpoints: selectionRemover(selectedBendpoints),

    selectConnections: selectionAdder(selectedConnections),
    deselectConnections: selectionRemover(selectedConnections),

    canDiscardCurrentSelection,
  };
});
