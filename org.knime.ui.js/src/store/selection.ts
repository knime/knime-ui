import { defineStore } from "pinia";

import type { KnimeNode, WorkflowObject } from "@/api/custom-types";
import type { WorkflowAnnotation, XY } from "@/api/gateway-api/generated-api";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { parseBendpointId } from "@/util/connectorUtil";
import type { SelectedPortIdentifier } from "@/util/portSelection";

export type NodeOutputTabIdentifier = "view" | `${number}` | null;

export interface SelectionState {
  selectedNodes: Record<string, boolean>;
  selectedConnections: Record<string, boolean>;
  selectedAnnotations: Record<string, boolean>;
  selectedBendpoints: Record<string, boolean>;
  selectedMetanodePortBars: { in?: boolean; out?: boolean };
  activePortTab: NodeOutputTabIdentifier;
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
export const useSelectionStore = defineStore("selection", {
  state: (): SelectionState => ({
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
  }),
  actions: {
    addNodesToSelection(nodeIds: string[]) {
      // Work on a copy of the state. The vue reactivity-machinery only runs once afterwards
      const selectedNodes = { ...this.selectedNodes };
      nodeIds.forEach((id) => {
        selectedNodes[id] = true;
      });

      this.selectedNodes = selectedNodes;
    },

    removeNodesFromSelection(nodeIds: string[]) {
      // Work on a copy of the state. The vue reactivity-machinery only runs once afterwards
      const selectedNodes = { ...this.selectedNodes };
      nodeIds.forEach((id) => {
        delete selectedNodes[id];
      });

      this.selectedNodes = selectedNodes;
    },

    clearSelection() {
      // don't override selection objects in case there is nothing selected
      // prevents unnecessary slowdown.
      if (Object.keys(this.selectedNodes).length > 0) {
        this.selectedNodes = {};
      }
      if (Object.keys(this.selectedConnections).length > 0) {
        this.selectedConnections = {};
      }
      if (Object.keys(this.selectedAnnotations).length > 0) {
        this.selectedAnnotations = {};
      }
      if (Object.keys(this.selectedBendpoints).length > 0) {
        this.selectedBendpoints = {};
      }
      if (Object.keys(this.selectedMetanodePortBars).length > 0) {
        this.selectedMetanodePortBars = {};
      }
      if (this.activeNodePorts.selectedPort) {
        this.activeNodePorts.nodeId = null;
        this.activeNodePorts.selectedPort = null;
      }
    },

    addConnectionsToSelection(connectionIds: string[]) {
      connectionIds.forEach((id) => {
        this.selectedConnections[id] = true;
      });
    },

    removeConnectionsFromSelection(connectionIds: string[]) {
      connectionIds.forEach((id) => {
        delete this.selectedConnections[id];
      });
    },

    removeMetanodePortBarsFromSelection(
      metaNodePortBarTypes: Array<"in" | "out">,
    ) {
      metaNodePortBarTypes.forEach((type) => {
        delete this.selectedMetanodePortBars[type];
      });
    },

    addMetanodePortBarsToSelection(metaNodePortBarTypes: Array<"in" | "out">) {
      metaNodePortBarTypes.forEach(
        (type) => (this.selectedMetanodePortBars[type] = true),
      );
    },

    addAnnotationToSelection(annotationIds: string[]) {
      annotationIds.forEach((id) => {
        this.selectedAnnotations[id] = true;
      });
    },

    removeAnnotationFromSelection(annotationIds: string[]) {
      annotationIds.forEach((id) => {
        delete this.selectedAnnotations[id];
      });
    },

    addBendpointsToSelection(bendpoints: Array<string>) {
      bendpoints.forEach((bendpointId) => {
        this.selectedBendpoints[bendpointId] = true;
      });
    },

    removeBendpointsFromSelection(bendpoints: Array<string>) {
      bendpoints.forEach((bendpointId) => {
        delete this.selectedBendpoints[bendpointId];
      });
    },

    setStartedSelectionFromAnnotationId(
      startedSelectionFromAnnotationId: string | null,
    ) {
      this.startedSelectionFromAnnotationId = startedSelectionFromAnnotationId;
    },

    setDidStartRectangleSelection(didStartRectangleSelection: boolean) {
      this.didStartRectangleSelection = didStartRectangleSelection;
    },

    focusObject(focusedObject: WorkflowObject) {
      this.focusedObject = focusedObject;
    },

    unfocusObject() {
      this.focusedObject = null;
    },

    setShouldHideSelection(shouldHideSelection: boolean) {
      this.shouldHideSelection = shouldHideSelection;
    },

    setActivePortTab(activePortTab: NodeOutputTabIdentifier) {
      this.activePortTab = activePortTab;
    },

    updateActiveNodePorts(
      activeNodePorts: Partial<SelectionState["activeNodePorts"]>,
    ) {
      Object.assign(this.activeNodePorts, activeNodePorts);
    },

    deselectAllObjects() {
      this.clearSelection();
      this.unfocusObject();
    },

    selectAllObjects() {
      this.addNodesToSelection(
        Object.keys(useWorkflowStore().activeWorkflow!.nodes),
      );
      this.addAnnotationToSelection(
        useWorkflowStore().activeWorkflow!.workflowAnnotations.map(
          (annotation) => annotation.id,
        ),
      );
    },

    selectNode(nodeId: string) {
      this.addNodesToSelection([nodeId]);
    },

    selectSingleObject(object: Omit<WorkflowObject, keyof XY>) {
      this.deselectAllObjects();

      switch (object.type) {
        case "node":
          this.addNodesToSelection([object.id]);
          break;
        case "annotation":
          this.addAnnotationToSelection([object.id]);
          break;
      }
    },

    selectNodes(nodeIds: string[]) {
      this.addNodesToSelection(nodeIds);
    },

    deselectNode(nodeId: string) {
      this.removeNodesFromSelection([nodeId]);
    },

    deselectNodes(nodeIds: string[]) {
      this.removeNodesFromSelection(nodeIds);
    },

    selectConnection(connectionId: string) {
      this.addConnectionsToSelection([connectionId]);
    },

    deselectConnection(connectionId: string) {
      this.removeConnectionsFromSelection([connectionId]);
    },

    selectMetanodePortBar(metaNodePortBarType: "in" | "out") {
      this.addMetanodePortBarsToSelection([metaNodePortBarType]);
    },

    deselectMetanodePortBar(metaNodePortBarType: "in" | "out") {
      this.removeMetanodePortBarsFromSelection([metaNodePortBarType]);
    },

    selectAnnotation(annotationId: string) {
      this.addAnnotationToSelection([annotationId]);
    },

    selectAnnotations(annotationIds: string[]) {
      this.addAnnotationToSelection(annotationIds);
    },

    deselectAnnotation(annotationId: string) {
      this.removeAnnotationFromSelection([annotationId]);
    },

    deselectAnnotations(annotationIds: string[]) {
      this.removeAnnotationFromSelection(annotationIds);
    },

    selectBendpoint(bendpoint: string) {
      this.addBendpointsToSelection([bendpoint]);
    },

    deselectBendpoint(bendpoint: string) {
      this.removeBendpointsFromSelection([bendpoint]);
    },

    selectBendpoints(bendpoints: string[]) {
      this.addBendpointsToSelection(bendpoints);
    },

    deselectBendpoints(bendpoints: string[]) {
      this.removeBendpointsFromSelection(bendpoints);
    },

    toggleAnnotationSelection({
      annotationId,
      isMultiselect,
      isSelected,
    }: {
      annotationId: string;
      isMultiselect: boolean;
      isSelected: boolean;
    }) {
      // Prevents selecting/deselecting the annotation that the rectangle selection started from but was not included
      // in a rectangle selection
      if (
        annotationId === this.startedSelectionFromAnnotationId &&
        this.didStartRectangleSelection
      ) {
        this.setStartedSelectionFromAnnotationId(null);
        return;
      }

      if (!isMultiselect) {
        this.deselectAllObjects();
        this.selectAnnotation(annotationId);
        return;
      }

      if (isSelected) {
        this.deselectAnnotation(annotationId);
      } else {
        this.selectAnnotation(annotationId);
      }
    },
  },
  getters: {
    // Returns an array of selected node objects.
    // This getter filters non-existent selected nodes
    getSelectedNodes: (state): KnimeNode[] => {
      if (!useWorkflowStore().activeWorkflow) {
        return [];
      }
      return Object.keys(state.selectedNodes)
        .map((nodeId) => useWorkflowStore().activeWorkflow!.nodes[nodeId])
        .filter(Boolean);
    },

    getSelectedAnnotations: (state): WorkflowAnnotation[] => {
      const workflowStore = useWorkflowStore();

      if (!workflowStore.activeWorkflow) {
        return [];
      }
      return workflowStore.activeWorkflow.workflowAnnotations.filter(
        (annotation) =>
          Object.keys(state.selectedAnnotations).includes(annotation.id),
      );
    },

    getSelectedMetanodePortBars: (state) => {
      if (!useWorkflowStore().activeWorkflow) {
        return [];
      }

      return Object.keys(state.selectedMetanodePortBars)
        .map((type) =>
          state.selectedMetanodePortBars[type as "in" | "out"] ? type : null,
        )
        .filter(Boolean);
    },

    getSelectedConnections: (state) => {
      if (!useWorkflowStore().activeWorkflow) {
        return [];
      }

      return Object.keys(state.selectedConnections)
        .map((id) => useWorkflowStore().activeWorkflow!.connections[id])
        .filter(Boolean); // after deleting a selected connection, it will be undefined
    },

    getSelectedBendpoints: (state) => {
      if (!useWorkflowStore().activeWorkflow) {
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

    selectedNodeIds(): string[] {
      return this.getSelectedNodes.map((node: KnimeNode) => node.id);
    },

    selectedAnnotationIds(): string[] {
      return this.getSelectedAnnotations.map(
        (annotation: WorkflowAnnotation) => annotation.id,
      );
    },

    selectedBendpointIds: (state) => {
      return Object.keys(state.selectedBendpoints);
    },

    singleSelectedNode(): KnimeNode | null {
      if (this.getSelectedNodes.length !== 1) {
        return null;
      }

      return this.getSelectedNodes[0];
    },

    singleSelectedAnnotation(): WorkflowAnnotation | null {
      if (this.getSelectedAnnotations.length !== 1) {
        return null;
      }

      return this.getSelectedAnnotations[0];
    },

    singleSelectedObject(): WorkflowObject | null {
      if (
        this.getSelectedNodes.length > 1 ||
        this.getSelectedAnnotations.length > 1
      ) {
        return null;
      }

      if (this.singleSelectedNode && !this.singleSelectedAnnotation) {
        return {
          id: this.singleSelectedNode.id,
          type: "node",
          ...this.singleSelectedNode.position,
        };
      }

      if (this.singleSelectedAnnotation && !this.singleSelectedNode) {
        return {
          id: this.singleSelectedAnnotation.id,
          type: "annotation",
          x: this.singleSelectedAnnotation.bounds.x,
          y: this.singleSelectedAnnotation.bounds.y,
        };
      }

      return null;
    },

    selectedObjects(): WorkflowObject[] {
      const nodePositions = this.getSelectedNodes.map((node) => ({
        id: node.id,
        type: "node" as const,
        ...node.position,
      }));

      const annotationPositions = this.getSelectedAnnotations.map(
        ({ id, bounds }) => ({
          id,
          type: "annotation" as const,
          x: bounds.x,
          y: bounds.y,
        }),
      );

      return [...nodePositions, ...annotationPositions];
    },

    isNodeSelected: (state) => (nodeId: string) =>
      nodeId in state.selectedNodes,

    isMetaNodePortBarSelected: (state) => (metaNodePortBarType: "in" | "out") =>
      metaNodePortBarType in state.selectedMetanodePortBars,

    isAnnotationSelected: (state) => (annotationId: string) =>
      annotationId in state.selectedAnnotations,

    isConnectionSelected: (state) => (connectionId: string) =>
      Reflect.has(state.selectedConnections, connectionId),

    isBendpointSelected: (state) => (bendpointId: string) =>
      Reflect.has(state.selectedBendpoints, bendpointId),

    isSelectionEmpty() {
      return (
        this.selectedNodeIds.length === 0 &&
        this.getSelectedConnections.length === 0 &&
        this.selectedAnnotationIds.length === 0 &&
        this.selectedBendpointIds.length === 0
      );
    },

    getFocusedObject(state): WorkflowObject | null {
      if (!state.focusedObject) {
        return null;
      }

      const { nodes, workflowAnnotations } = useWorkflowStore().activeWorkflow!;
      const { id, type } = state.focusedObject;

      if (type === "node") {
        return { id, type, ...nodes[id].position };
      }

      const annotation = workflowAnnotations.find(
        ({ id: annotationId }) => annotationId === id,
      )!;

      return { id, type, x: annotation.bounds.x, y: annotation.bounds.y };
    },
  },
});
