import type { ActionTree, Commit, GetterTree, MutationTree } from "vuex";

import type { RootStoreState } from "./types";
import { parseBendpointId } from "@/util/connectorUtil";
import type { SelectedPortIdentifier } from "@/util/portSelection";
import type { KnimeNode, WorkflowObject } from "@/api/custom-types";
import type { WorkflowAnnotation, XY } from "@/api/gateway-api/generated-api";

export interface SelectionState {
  selectedNodes: Record<string, boolean>;
  selectedConnections: Record<string, boolean>;
  selectedAnnotations: Record<string, boolean>;
  selectedBendpoints: Record<string, boolean>;
  selectedMetanodePortBars: { in?: boolean; out?: boolean };
  activePortTab: "view" | Omit<string, "view"> | null;
  activeNodePorts: {
    nodeId: string | null;
    selectedPort: SelectedPortIdentifier;
    isModificationInProgress: boolean;
  };

  startedSelectionFromAnnotationId: string | null;
  didStartRectangleSelection: boolean;

  focusedObject: WorkflowObject | null;

  shouldHideSelection: boolean;
}

/**
 * Store that holds selected objects (nodes, connections)
 */
// WARNING: Do not use this state directly. Use getters that filter non existent workflow objects.
export const state = (): SelectionState => ({
  selectedNodes: {},
  selectedConnections: {},
  selectedAnnotations: {},
  selectedMetanodePortBars: {},
  startedSelectionFromAnnotationId: null,
  didStartRectangleSelection: false,
  selectedBendpoints: {},
  activePortTab: null,
  activeNodePorts: {
    nodeId: null,
    selectedPort: null,
    isModificationInProgress: false,
  },

  focusedObject: null,

  shouldHideSelection: false,
});

export const mutations: MutationTree<SelectionState> = {
  addNodesToSelection(state, nodeIds: string[]) {
    // Work on a copy of the state. The vue reactivity-machinery only runs once afterwards
    const selectedNodes = { ...state.selectedNodes };
    nodeIds.forEach((id) => {
      selectedNodes[id] = true;
    });

    state.selectedNodes = selectedNodes;
  },

  removeNodesFromSelection(state, nodeIds: string[]) {
    // Work on a copy of the state. The vue reactivity-machinery only runs once afterwards
    const selectedNodes = { ...state.selectedNodes };
    nodeIds.forEach((id) => {
      delete selectedNodes[id];
    });

    state.selectedNodes = selectedNodes;
  },

  clearSelection(state) {
    // dont override selection objects in case there is nothing selected
    // prevents unnecessary slowdown.
    if (Object.keys(state.selectedNodes).length > 0) {
      state.selectedNodes = {};
    }
    if (Object.keys(state.selectedConnections).length > 0) {
      state.selectedConnections = {};
    }
    if (Object.keys(state.selectedAnnotations).length > 0) {
      state.selectedAnnotations = {};
    }
    if (Object.keys(state.selectedBendpoints).length > 0) {
      state.selectedBendpoints = {};
    }
    if (Object.keys(state.selectedMetanodePortBars).length > 0) {
      state.selectedMetanodePortBars = {};
    }
    if (state.activeNodePorts.selectedPort) {
      state.activeNodePorts.nodeId = null;
      state.activeNodePorts.selectedPort = null;
    }
  },

  addConnectionsToSelection(state, connectionIds: string[]) {
    connectionIds.forEach((id) => {
      state.selectedConnections[id] = true;
    });
  },

  removeConnectionsFromSelection(state, connectionIds: string[]) {
    connectionIds.forEach((id) => {
      delete state.selectedConnections[id];
    });
  },

  removeMetanodePortBarsFromSelection(
    state,
    metaNodePortBarTypes: Array<"in" | "out">,
  ) {
    metaNodePortBarTypes.forEach((type) => {
      delete state.selectedMetanodePortBars[type];
    });
  },

  addMetanodePortBarsToSelection(
    state,
    metaNodePortBarTypes: Array<"in" | "out">,
  ) {
    metaNodePortBarTypes.forEach(
      (type) => (state.selectedMetanodePortBars[type] = true),
    );
  },

  addAnnotationToSelection(state, annotationIds: string[]) {
    annotationIds.forEach((id) => {
      state.selectedAnnotations[id] = true;
    });
  },

  removeAnnotationFromSelection(state, annotationIds: string[]) {
    annotationIds.forEach((id) => {
      delete state.selectedAnnotations[id];
    });
  },

  addBendpointsToSelection(state, bendpoints: Array<string>) {
    bendpoints.forEach((bendpointId) => {
      state.selectedBendpoints[bendpointId] = true;
    });
  },

  removeBendpointsFromSelection(state, bendpoints: Array<string>) {
    bendpoints.forEach((bendpointId) => {
      delete state.selectedBendpoints[bendpointId];
    });
  },

  setStartedSelectionFromAnnotationId(state, value) {
    state.startedSelectionFromAnnotationId = value;
  },

  setDidStartRectangleSelection(state, value) {
    state.didStartRectangleSelection = value;
  },

  focusObject(state, value) {
    state.focusedObject = value;
  },

  unfocusObject(state) {
    state.focusedObject = null;
  },

  setShouldHideSelection(state, value) {
    state.shouldHideSelection = value;
  },

  setActivePortTab(state, value) {
    state.activePortTab = value;
  },

  updateActiveNodePorts(state, value) {
    Object.assign(state.activeNodePorts, value);
  },
};

const doDeselect = (commit: Commit) => {
  commit("clearSelection");
  commit("unfocusObject");
};

export const actions: ActionTree<SelectionState, RootStoreState> = {
  deselectAllObjects({ commit }) {
    doDeselect(commit);
  },

  selectAllObjects({ commit, rootState }) {
    commit(
      "addNodesToSelection",
      Object.keys(rootState.workflow.activeWorkflow!.nodes),
    );
    commit(
      "addAnnotationToSelection",
      rootState.workflow.activeWorkflow!.workflowAnnotations.map(
        (annotation) => annotation.id,
      ),
    );
  },

  selectNode({ commit }, nodeId) {
    commit("addNodesToSelection", [nodeId]);
  },

  selectSingleObject({ commit }, object: Omit<WorkflowObject, keyof XY>) {
    doDeselect(commit);

    switch (object.type) {
      case "node":
        commit("addNodesToSelection", [object.id]);
        break;
      case "annotation":
        commit("addAnnotationToSelection", [object.id]);
        break;
    }
  },

  selectNodes({ commit }, nodeIds) {
    commit("addNodesToSelection", nodeIds);
  },

  deselectNode({ commit }, nodeId) {
    commit("removeNodesFromSelection", [nodeId]);
  },

  deselectNodes({ commit }, nodeIds) {
    commit("removeNodesFromSelection", nodeIds);
  },

  selectConnection({ commit }, connectionId) {
    commit("addConnectionsToSelection", [connectionId]);
  },

  deselectConnection({ commit }, connectionId) {
    commit("removeConnectionsFromSelection", [connectionId]);
  },

  selectMetanodePortBar({ commit }, metaNodePortBarType: "in" | "out") {
    commit("addMetanodePortBarsToSelection", [metaNodePortBarType]);
  },

  deselectMetanodePortBar({ commit }, metaNodePortBarType: "in" | "out") {
    commit("removeMetanodePortBarsFromSelection", [metaNodePortBarType]);
  },

  selectAnnotation({ commit }, annotationId) {
    commit("addAnnotationToSelection", [annotationId]);
  },

  selectAnnotations({ commit }, annotationIds) {
    commit("addAnnotationToSelection", annotationIds);
  },

  deselectAnnotation({ commit }, annotationId) {
    commit("removeAnnotationFromSelection", [annotationId]);
  },

  deselectAnnotations({ commit }, annotationId) {
    commit("removeAnnotationFromSelection", annotationId);
  },

  selectBendpoint({ commit }, bendpoint) {
    commit("addBendpointsToSelection", [bendpoint]);
  },

  deselectBendpoint({ commit }, bendpoint) {
    commit("removeBendpointsFromSelection", [bendpoint]);
  },

  selectBendpoints({ commit }, bendpoints) {
    commit("addBendpointsToSelection", bendpoints);
  },

  deselectBendpoints({ commit }, bendpoints) {
    commit("removeBendpointsFromSelection", bendpoints);
  },

  async toggleAnnotationSelection(
    { state, dispatch, commit },
    { annotationId, isMultiselect, isSelected },
  ) {
    // Prevents selecting/deselecting the annotation that the rectangle selection started from but was not included
    // in a rectangle selection
    if (
      annotationId === state.startedSelectionFromAnnotationId &&
      state.didStartRectangleSelection
    ) {
      commit("setStartedSelectionFromAnnotationId", null);
      return;
    }

    if (!isMultiselect) {
      await dispatch("deselectAllObjects");
      await dispatch("selectAnnotation", annotationId);
      return;
    }

    const action = isSelected ? "deselectAnnotation" : "selectAnnotation";

    dispatch(action, annotationId);
  },
};

export const getters: GetterTree<SelectionState, RootStoreState> = {
  // Returns an array of selected node objects.
  // This getter filters non-existent selected nodes
  selectedNodes(state, _getters, rootState) {
    if (!rootState.workflow.activeWorkflow) {
      return [];
    }
    return Object.keys(state.selectedNodes)
      .map((nodeId) => rootState.workflow.activeWorkflow!.nodes[nodeId])
      .filter(Boolean);
  },

  selectedAnnotations(state, _getters, rootState) {
    if (!rootState.workflow.activeWorkflow) {
      return [];
    }
    return rootState.workflow.activeWorkflow.workflowAnnotations.filter(
      (annotation) =>
        Object.keys(state.selectedAnnotations).includes(annotation.id),
    );
  },

  selectedMetanodePortBars(state, _getters, rootState) {
    if (!rootState.workflow.activeWorkflow) {
      return [];
    }

    return Object.keys(state.selectedMetanodePortBars)
      .map((type) =>
        state.selectedMetanodePortBars[type as "in" | "out"] ? type : null,
      )
      .filter(Boolean);
  },

  selectedConnections(state, _getters, { workflow: { activeWorkflow } }) {
    if (!activeWorkflow) {
      return [];
    }

    return Object.keys(state.selectedConnections)
      .map((id) => activeWorkflow.connections[id])
      .filter(Boolean); // after deleting a selected connection, it will be undefined
  },

  selectedBendpoints(state, _getters, rootState) {
    if (!rootState.workflow.activeWorkflow) {
      return {};
    }

    return Object.keys(state.selectedBendpoints)
      .map((bendpointId) => parseBendpointId(bendpointId))
      .reduce(
        (acc, item) => {
          const { connectionId, index } = item;
          const indexes = acc[connectionId] ?? [];
          indexes.push(index);
          acc[connectionId] = indexes;
          return acc;
        },
        {} as Record<string, number[]>,
      );
  },

  selectedNodeIds(_state, { selectedNodes }) {
    return selectedNodes.map((node: KnimeNode) => node.id);
  },

  selectedAnnotationIds(_state, { selectedAnnotations }) {
    return selectedAnnotations.map(
      (annotation: WorkflowAnnotation) => annotation.id,
    );
  },

  selectedBendpointIds(state) {
    return Object.keys(state.selectedBendpoints);
  },

  singleSelectedNode(_state, { selectedNodes }) {
    if (selectedNodes.length !== 1) {
      return null;
    }

    return selectedNodes[0];
  },

  singleSelectedAnnotation(_state, { selectedAnnotations }) {
    if (selectedAnnotations.length !== 1) {
      return null;
    }

    return selectedAnnotations[0];
  },

  singleSelectedObject(
    _state,
    {
      selectedNodes,
      selectedAnnotations,
      singleSelectedNode,
      singleSelectedAnnotation,
    },
  ): WorkflowObject | null {
    if (selectedNodes.length > 1 || selectedAnnotations.length > 1) {
      return null;
    }

    if (singleSelectedNode && !singleSelectedAnnotation) {
      return {
        id: singleSelectedNode.id,
        type: "node",
        ...singleSelectedNode.position,
      };
    }

    if (singleSelectedAnnotation && !singleSelectedNode) {
      return {
        id: singleSelectedAnnotation.id,
        type: "annotation",
        x: singleSelectedAnnotation.bounds.x,
        y: singleSelectedAnnotation.bounds.y,
      };
    }

    return null;
  },

  selectedObjects(
    _state,
    {
      selectedNodes,
      selectedAnnotations,
    }: {
      selectedNodes: KnimeNode[];
      selectedAnnotations: WorkflowAnnotation[];
    },
  ): WorkflowObject[] {
    const nodePositions = selectedNodes.map((node) => ({
      id: node.id,
      type: "node" as const,
      ...node.position,
    }));

    const annotationPositions = selectedAnnotations.map(({ id, bounds }) => ({
      id,
      type: "annotation" as const,
      x: bounds.x,
      y: bounds.y,
    }));

    return [...nodePositions, ...annotationPositions];
  },

  isNodeSelected: (state) => (nodeId: string) => nodeId in state.selectedNodes,

  isMetaNodePortBarSelected: (state) => (metaNodePortBarType: "in" | "out") =>
    metaNodePortBarType in state.selectedMetanodePortBars,

  isAnnotationSelected: (state) => (annotationId: string) =>
    annotationId in state.selectedAnnotations,

  isConnectionSelected: (state) => (connectionId: string) =>
    Reflect.has(state.selectedConnections, connectionId),

  isBendpointSelected: (state) => (bendpointId: string) =>
    Reflect.has(state.selectedBendpoints, bendpointId),

  isSelectionEmpty(_, getters) {
    return (
      getters.selectedNodeIds.length === 0 &&
      getters.selectedConnections.length === 0 &&
      getters.selectedAnnotationIds.length === 0 &&
      getters.selectedBendpointIds.length === 0
    );
  },

  focusedObject(state, _, rootState): WorkflowObject | null {
    if (!state.focusedObject) {
      return null;
    }

    const { nodes, workflowAnnotations } = rootState.workflow.activeWorkflow!;
    const { id, type } = state.focusedObject;

    if (type === "node") {
      return { id, type, ...nodes[id].position };
    }

    const annotation = workflowAnnotations.find(
      ({ id: annotationId }) => annotationId === id,
    )!;

    return { id, type, x: annotation.bounds.x, y: annotation.bounds.y };
  },
};
