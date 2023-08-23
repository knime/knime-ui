import type { ActionTree, GetterTree, MutationTree } from "vuex";

import type { RootStoreState } from "./types";
import { parseBendpointId } from "@/util/connectorUtil";

export interface SelectionState {
  selectedNodes: Record<string, boolean>;
  selectedConnections: Record<string, boolean>;
  selectedAnnotations: Record<string, boolean>;
  selectedBendpoints: Record<string, boolean>;

  startedSelectionFromAnnotationId: string | null;
  didStartRectangleSelection: boolean;
}

/**
 * Store that holds selected objects (nodes, connections)
 */
// WARNING: Do not use this state directly. Use getters that filter non existent workflow objects.
export const state = (): SelectionState => ({
  selectedNodes: {},
  selectedConnections: {},
  selectedAnnotations: {},
  startedSelectionFromAnnotationId: null,
  didStartRectangleSelection: false,
  selectedBendpoints: {},
});

export const mutations: MutationTree<SelectionState> = {
  // Add nodeIds to selection
  addNodesToSelection(state, nodeIds: string[]) {
    // Work on a copy of the state. The vue reactivity-machinery only runs once afterwards
    const selectedNodes = { ...state.selectedNodes };
    nodeIds.forEach((id) => {
      selectedNodes[id] = true;
    });

    state.selectedNodes = selectedNodes;
  },

  // Removes each node of the provided nodeIds array from the selected nodes
  removeNodesFromSelection(state, nodeIds: string[]) {
    // Work on a copy of the state. The vue reactivity-machinery only runs once afterwards
    const selectedNodes = { ...state.selectedNodes };
    nodeIds.forEach((id) => {
      delete selectedNodes[id];
    });

    state.selectedNodes = selectedNodes;
  },

  // Clear the selected nodes and the selected connections at once
  clearSelection(state) {
    // dont override selectedNodes/Connections-object, in case there is nothing selected
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
  },

  //  Add connectionIds to selection.
  addConnectionsToSelection(state, connectionIds: string[]) {
    connectionIds.forEach((id) => {
      state.selectedConnections[id] = true;
    });
  },

  // Removes each connection of the provided connections object to the selected connection object.
  removeConnectionsFromSelection(state, connectionIds: string[]) {
    connectionIds.forEach((id) => {
      delete state.selectedConnections[id];
    });
  },

  //  Add annotationIds to selection.
  addAnnotationToSelection(state, annotationIds: string[]) {
    annotationIds.forEach((id) => {
      state.selectedAnnotations[id] = true;
    });
  },

  // Removes each annotation of the provided annotation object to the selected annotation object.
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
};

export const actions: ActionTree<SelectionState, RootStoreState> = {
  // Deselect all objects, this includes connections and nodes.
  deselectAllObjects({ commit }) {
    commit("clearSelection");
  },

  // Selects all nodes and annotations that are present in the current workflow store.
  selectAllObjects({ commit, rootState }) {
    commit(
      "addNodesToSelection",
      Object.keys(rootState.workflow.activeWorkflow.nodes),
    );
    commit(
      "addAnnotationToSelection",
      rootState.workflow.activeWorkflow.workflowAnnotations.map(
        (annotation) => annotation.id,
      ),
    );
  },

  // Selects the given node.
  selectNode({ commit }, nodeId) {
    commit("addNodesToSelection", [nodeId]);
  },

  // Selects all nodeIds
  selectNodes({ commit }, nodeIds) {
    commit("addNodesToSelection", nodeIds);
  },

  // Deselects the given node.
  deselectNode({ commit }, nodeId) {
    commit("removeNodesFromSelection", [nodeId]);
  },

  // Deselects all nodeIds
  deselectNodes({ commit }, nodeIds) {
    commit("removeNodesFromSelection", nodeIds);
  },

  // Selects the given connection.
  selectConnection({ commit }, connectionId) {
    commit("addConnectionsToSelection", [connectionId]);
  },

  // Deselects the given connection.
  deselectConnection({ commit }, connectionId) {
    commit("removeConnectionsFromSelection", [connectionId]);
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

  // Deselects the given connection.
  deselectBendpoint({ commit }, bendpoint) {
    commit("removeBendpointsFromSelection", [bendpoint]);
  },

  selectBendpoints({ commit }, bendpoints) {
    commit("addBendpointsToSelection", bendpoints);
  },

  // Deselects the given connection.
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
      .map((nodeId) => rootState.workflow.activeWorkflow.nodes[nodeId])
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
      return [];
    }

    return Object.keys(state.selectedBendpoints)
      .map((bendpointId) => parseBendpointId(bendpointId))
      .reduce((acc, item) => {
        const { connectionId, index } = item;
        const indexes = acc[connectionId] ?? [];
        indexes.push(index);
        acc[connectionId] = indexes;
        return acc;
      }, {});
  },

  // Returns an array of all selected node ids.
  selectedNodeIds(_state, { selectedNodes }) {
    return selectedNodes.map((node) => node.id);
  },

  selectedAnnotationIds(_state, { selectedAnnotations }) {
    return selectedAnnotations.map((annotation) => annotation.id);
  },

  selectedBendpointIds(_state, { selectedBendpoints }) {
    return selectedBendpoints.map(
      ({ connectionId, index }) => `${connectionId}__${index}`,
    );
  },

  // Returns null if none or multiple nodes are selected, otherwise returns the selected node
  singleSelectedNode(_state, { selectedNodes }) {
    if (selectedNodes.length !== 1) {
      return null;
    }

    return selectedNodes[0];
  },

  // Checks if a given node id is present in the selected object.
  isNodeSelected: (state) => (nodeId: string) => nodeId in state.selectedNodes,

  // Checks if a given annotation id is present in the selected object.
  isAnnotationSelected: (state) => (annotationId: string) =>
    annotationId in state.selectedAnnotations,

  // Checks if a given connection id is present in the selected object.
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
};
