import { describe, expect, it } from "vitest";

import {
  createConnection,
  createNativeNode,
  createWorkflow,
  createWorkflowAnnotation,
} from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";

describe("selection store", () => {
  describe("actions", () => {
    it("adding nodes to selection", () => {
      const { selectionStore } = mockStores();

      expect(Object.keys(selectionStore.selectedNodes).length).toBe(0);
      selectionStore.addNodesToSelection(["root:1"]);
      expect(Object.keys(selectionStore.selectedNodes).length).toBe(1);
    });

    it("removes nodes from selection", () => {
      const { selectionStore } = mockStores();

      selectionStore.addNodesToSelection(["root:1"]);
      expect(Object.keys(selectionStore.selectedNodes).length).toBe(1);
      selectionStore.removeNodesFromSelection(["root:1"]);
      expect(Object.keys(selectionStore.selectedNodes).length).toBe(0);
    });

    it("adding connections to selection", () => {
      const { selectionStore } = mockStores();

      expect(Object.keys(selectionStore.selectedConnections).length).toBe(0);
      selectionStore.addConnectionsToSelection(["root:1"]);
      expect(Object.keys(selectionStore.selectedConnections).length).toBe(1);
    });

    it("removes connections from selection", () => {
      const { selectionStore } = mockStores();

      selectionStore.addConnectionsToSelection(["root:1"]);
      expect(Object.keys(selectionStore.selectedConnections).length).toBe(1);
      selectionStore.removeConnectionsFromSelection(["root:1"]);
      expect(Object.keys(selectionStore.selectedConnections).length).toBe(0);
    });

    it("clear selection doesnt override state, if nothing to clear", () => {
      const { selectionStore } = mockStores();

      const selectedNodes = selectionStore.selectedNodes;
      const selectedConnections = selectionStore.selectedConnections;
      const selectedAnnotations = selectionStore.selectedAnnotations;

      selectionStore.clearSelection();

      expect(selectionStore.selectedNodes).toBe(selectedNodes);
      expect(selectionStore.selectedConnections).toBe(selectedConnections);
      expect(selectionStore.selectedAnnotations).toBe(selectedAnnotations);
    });

    it("adding annotations to selection", () => {
      const { selectionStore } = mockStores();

      expect(Object.keys(selectionStore.selectedAnnotations).length).toBe(0);
      selectionStore.addAnnotationToSelection(["root:1"]);
      expect(Object.keys(selectionStore.selectedAnnotations).length).toBe(1);
    });

    it("removes annotations from selection", () => {
      const { selectionStore } = mockStores();

      selectionStore.addAnnotationToSelection(["root:1"]);
      expect(Object.keys(selectionStore.selectedAnnotations).length).toBe(1);
      selectionStore.removeAnnotationFromSelection(["root:1"]);
      expect(Object.keys(selectionStore.selectedAnnotations).length).toBe(0);
    });

    it("sets id of annotation that rectangle selection was started from", () => {
      const { selectionStore } = mockStores();

      expect(selectionStore.startedSelectionFromAnnotationId).toBeNull();
      selectionStore.setStartedSelectionFromAnnotationId("root:1");
      expect(selectionStore.startedSelectionFromAnnotationId).toBe("root:1");
    });

    it("sets if rectangle selection was started", () => {
      const { selectionStore } = mockStores();

      expect(selectionStore.didStartRectangleSelection).toBe(false);
      selectionStore.setDidStartRectangleSelection(true);
      expect(selectionStore.didStartRectangleSelection).toBe(true);
    });

    it("adding bendpoint to selection", () => {
      const { selectionStore } = mockStores();

      expect(Object.keys(selectionStore.selectedBendpoints).length).toBe(0);
      selectionStore.addBendpointsToSelection(["connection1__0"]);
      expect(Object.keys(selectionStore.selectedBendpoints).length).toBe(1);
    });

    it("removes bendpoints from selection", () => {
      const { selectionStore } = mockStores();

      selectionStore.addBendpointsToSelection(["connection1__0"]);
      expect(Object.keys(selectionStore.selectedBendpoints).length).toBe(1);
      selectionStore.removeBendpointsFromSelection(["connection1__0"]);
      expect(Object.keys(selectionStore.selectedBendpoints).length).toBe(0);
    });

    describe("select and deselect all", () => {
      const createStore = () => {
        const { selectionStore, workflowStore } = mockStores();

        selectionStore.selectedNodes = { "root:1": true };
        selectionStore.selectedConnections = { "root:1_1": true };
        selectionStore.selectedAnnotations = { "root:2_1": true };

        const node1 = createNativeNode({
          id: "root:1",
          position: { x: 10, y: 10 },
        });
        const node2 = createNativeNode({
          id: "root:2",
          position: { x: 20, y: 10 },
        });
        const annotation1 = createWorkflowAnnotation({
          id: "annotation:1",
          bounds: { x: 40, y: 10, width: 20, height: 20 },
        });
        const annotation2 = createWorkflowAnnotation({
          id: "annotation:1",
          bounds: { x: 40, y: 10, width: 20, height: 20 },
        });

        workflowStore.activeWorkflow = createWorkflow({
          nodes: {
            [node1.id]: node1,
            [node2.id]: node2,
          },
          workflowAnnotations: [annotation1, annotation2],
        });

        return {
          selectionStore,
          workflowStore,
        };
      };

      it("deselects all selected objects", () => {
        const { selectionStore } = createStore();

        selectionStore.activeNodePorts = {
          nodeId: "root:3",
          selectedPort: "output-3",
          isModificationInProgress: false,
        };
        selectionStore.deselectAllObjects();

        expect(Object.keys(selectionStore.selectedNodes).length).toBe(0);
        expect(Object.keys(selectionStore.selectedConnections).length).toBe(0);
        expect(Object.keys(selectionStore.selectedAnnotations).length).toBe(0);
        expect(selectionStore.activeNodePorts.nodeId).toBeNull();
        expect(selectionStore.activeNodePorts.selectedPort).toBeNull();
      });

      it("selects all objects", () => {
        const { selectionStore } = createStore();

        selectionStore.selectAllObjects();
        expect(Object.keys(selectionStore.selectedNodes).length).toBe(2);
        expect(Object.keys(selectionStore.selectedAnnotations).length).toBe(2);
        expect(Object.keys(selectionStore.selectedConnections).length).toBe(1);
      });
    });

    describe("nodes", () => {
      const createStore = () => {
        const { selectionStore } = mockStores();

        selectionStore.selectedNodes = { "root:1": true };
        selectionStore.selectedConnections = { "root:1_1": true };

        return {
          selectionStore,
        };
      };

      it("selects a specific node", () => {
        const { selectionStore } = createStore();

        selectionStore.deselectAllObjects();
        selectionStore.selectNode("root:1");
        expect(Object.keys(selectionStore.selectedNodes).length).toBe(1);
        expect(Object.keys(selectionStore.selectedConnections).length).toBe(0);
      });

      it("selects multiple nodes", () => {
        const { selectionStore } = createStore();

        selectionStore.deselectAllObjects();
        selectionStore.selectNodes(["root:1", "root:2"]);
        expect(Object.keys(selectionStore.selectedNodes).length).toBe(2);
        expect(Object.keys(selectionStore.selectedConnections).length).toBe(0);
      });

      it("deselects a specific node", () => {
        const { selectionStore } = createStore();

        selectionStore.deselectNode("root:1");
        expect(Object.keys(selectionStore.selectedNodes).length).toBe(0);
        expect(Object.keys(selectionStore.selectedConnections).length).toBe(1);
      });

      it("deselects multiple nodes", () => {
        const { selectionStore } = createStore();

        selectionStore.selectNodes(["root:1", "root:2"]);
        expect(Object.keys(selectionStore.selectedNodes).length).toBe(2);
        selectionStore.deselectNodes(["root:1", "root:2"]);
        expect(Object.keys(selectionStore.selectedNodes).length).toBe(0);
        expect(Object.keys(selectionStore.selectedConnections).length).toBe(1);
      });
    });

    describe("connections", () => {
      const createStore = () => {
        const { selectionStore } = mockStores();

        selectionStore.selectedNodes = { "root:1": true };
        selectionStore.selectedConnections = { "root:1_1": true };

        return {
          selectionStore,
        };
      };

      it("selects a specific connection", () => {
        const { selectionStore } = createStore();

        selectionStore.deselectAllObjects();
        selectionStore.selectConnection("root:1_1");
        expect(Object.keys(selectionStore.selectedNodes).length).toBe(0);
        expect(Object.keys(selectionStore.selectedConnections).length).toBe(1);
      });

      it("deselects a specific connection", () => {
        const { selectionStore } = createStore();

        selectionStore.deselectConnection("root:1_1");
        expect(Object.keys(selectionStore.selectedNodes).length).toBe(1);
        expect(Object.keys(selectionStore.selectedConnections).length).toBe(0);
      });
    });

    describe("bendpoints", () => {
      it("selects a specific bendpoint", () => {
        const { selectionStore } = mockStores();

        selectionStore.selectBendpoint("connection1__0");
        expect(Object.keys(selectionStore.selectedBendpoints).length).toBe(1);
      });

      it("selects multiple bendpoints", () => {
        const { selectionStore } = mockStores();

        selectionStore.selectBendpoints(["connection1__0", "connection1__1"]);
        expect(Object.keys(selectionStore.selectedBendpoints).length).toBe(2);
      });

      it("deselects a specific bendpoint", () => {
        const { selectionStore } = mockStores();

        selectionStore.selectBendpoints(["connection1__0", "connection1__1"]);
        selectionStore.deselectBendpoint("connection1__0");
        expect(Object.keys(selectionStore.selectedBendpoints).length).toBe(1);
      });

      it("deselects multiple bendpoints", () => {
        const { selectionStore } = mockStores();

        selectionStore.selectBendpoints(["connection1__0", "connection1__1"]);
        selectionStore.deselectBendpoints(["connection1__0", "connection1__1"]);
        expect(Object.keys(selectionStore.selectedBendpoints).length).toBe(0);
      });
    });

    describe("metanode port bars", () => {
      it("selects a specific metanode port bar", () => {
        const { selectionStore } = mockStores();

        selectionStore.selectMetanodePortBar("in");
        expect(
          Object.keys(selectionStore.selectedMetanodePortBars).length,
        ).toBe(1);
      });

      it("select both port bars", () => {
        const { selectionStore } = mockStores();

        selectionStore.selectMetanodePortBar("in");
        selectionStore.selectMetanodePortBar("out");
        expect(
          Object.keys(selectionStore.selectedMetanodePortBars).length,
        ).toBe(2);
      });

      it("deselects a port bar", () => {
        const { selectionStore } = mockStores();

        selectionStore.selectMetanodePortBar("in");
        selectionStore.selectMetanodePortBar("out");
        selectionStore.deselectMetanodePortBar("out");
        expect(
          Object.keys(selectionStore.selectedMetanodePortBars).length,
        ).toBe(1);
      });
    });

    describe("annotations", () => {
      const createStore = () => {
        const { selectionStore } = mockStores();

        selectionStore.selectedNodes = { "root:1": true };
        selectionStore.selectedAnnotations = { "root:2_1": true };

        return {
          selectionStore,
        };
      };

      it("selects a specific annotation", () => {
        const { selectionStore } = createStore();

        selectionStore.deselectAllObjects();
        selectionStore.selectAnnotation("root:3_1");
        expect(Object.keys(selectionStore.selectedAnnotations).length).toBe(1);
        expect(Object.keys(selectionStore.selectedNodes).length).toBe(0);
      });

      it("selects multiple annotation", () => {
        const { selectionStore } = createStore();

        selectionStore.deselectAllObjects();
        selectionStore.selectAnnotations(["root:3_1", "root:3_2"]);
        expect(Object.keys(selectionStore.selectedAnnotations).length).toBe(2);
        expect(Object.keys(selectionStore.selectedNodes).length).toBe(0);
      });

      it("deselects a specific annotation", () => {
        const { selectionStore } = createStore();

        selectionStore.deselectAnnotation("root:2_1");
        expect(Object.keys(selectionStore.selectedAnnotations).length).toBe(0);
        expect(Object.keys(selectionStore.selectedNodes).length).toBe(1);
      });

      it("deselects multiple annotation", () => {
        const { selectionStore } = createStore();

        selectionStore.selectAnnotation("root:3_1");
        selectionStore.deselectAnnotations(["root:2_1", "root:3_1"]);
        expect(Object.keys(selectionStore.selectedAnnotations).length).toBe(0);
        expect(Object.keys(selectionStore.selectedNodes).length).toBe(1);
      });

      it("toggles selection of an annotation", () => {
        const { selectionStore } = createStore();

        const annotationId = "root:1_1";
        const isMultiselect = true;
        const isSelected = false;

        selectionStore.toggleAnnotationSelection({
          annotationId,
          isMultiselect,
          isSelected,
        });
        expect(Object.keys(selectionStore.selectedAnnotations)).toContain(
          annotationId,
        );
        expect(Object.keys(selectionStore.selectedAnnotations).length).toBe(2);
      });

      it("selects only clicked annotation if multi selection is false", () => {
        const { selectionStore } = createStore();

        const annotationId = "root:1_1";
        const isMultiselect = false;
        const isSelected = false;

        selectionStore.toggleAnnotationSelection({
          annotationId,
          isMultiselect,
          isSelected,
        });
        expect(Object.keys(selectionStore.selectedAnnotations)).toStrictEqual([
          annotationId,
        ]);
        expect(Object.keys(selectionStore.selectedAnnotations).length).toBe(1);
      });

      it("returns if rectangle selection was started from selected annotation", () => {
        const { selectionStore } = createStore();

        selectionStore.didStartRectangleSelection = true;
        selectionStore.startedSelectionFromAnnotationId = "root:1_1";
        selectionStore.toggleAnnotationSelection({
          annotationId: "root:1_1",
          isMultiselect: true,
          isSelected: false,
        });
        expect(selectionStore.startedSelectionFromAnnotationId).toBeNull();
      });
    });
  });

  describe("getters", () => {
    const createStore = () => {
      const { selectionStore, workflowStore } = mockStores();

      const node1 = createNativeNode({
        id: "root:1",
        position: { x: 10, y: 10 },
      });
      const node2 = createNativeNode({
        id: "root:2",
        position: { x: 20, y: 10 },
      });
      const connection1 = createConnection({
        id: "root:2_1",
        bendpoints: [{ x: 10, y: 10 }],
      });
      const connection2 = createConnection({
        id: "root:2_2",
        bendpoints: [{ x: 10, y: 10 }],
      });
      const annotation1 = createWorkflowAnnotation({
        id: "root:3_1",
        text: { value: "Annotation text" },
      });
      const annotation2 = createWorkflowAnnotation({
        id: "root:3_2",
        text: { value: "Annotation text 2" },
      });

      workflowStore.activeWorkflow = createWorkflow({
        nodes: {
          [node1.id]: node1,
          [node2.id]: node2,
        },
        connections: {
          [connection1.id]: connection1,
          [connection2.id]: connection2,
        },
        workflowAnnotations: [annotation1, annotation2],
      });
      selectionStore.addNodesToSelection(["root:1", "root:2"]);
      selectionStore.addConnectionsToSelection(["root:2_1", "root:2_2"]);
      selectionStore.addAnnotationToSelection(["root:3_1", "root:3_2"]);
      selectionStore.addNodesToSelection(["unknown node"]);
      selectionStore.addConnectionsToSelection(["unknown connection"]);

      return {
        selectionStore,
        workflowStore,
      };
    };

    describe("nodes", () => {
      it("get all selected node ids, for that nodes exist", () => {
        const { selectionStore } = createStore();

        expect(selectionStore.selectedNodeIds).toStrictEqual([
          "root:1",
          "root:2",
        ]);
      });

      it("get multiple selected nodes", () => {
        const { selectionStore } = createStore();

        expect(selectionStore.getSelectedNodes).toMatchObject([
          { id: "root:1" },
          { id: "root:2" },
        ]);
        expect(selectionStore.singleSelectedNode).toBeNull();
      });

      it("get single selected node", () => {
        const { selectionStore } = createStore();

        selectionStore.clearSelection();
        selectionStore.addNodesToSelection(["root:1"]);

        expect(selectionStore.singleSelectedNode).toMatchObject({
          id: "root:1",
        });
      });

      it("test if node is selected", () => {
        const { selectionStore } = createStore();

        expect(selectionStore.isNodeSelected("root:1")).toBe(true);
        expect(selectionStore.isNodeSelected("root:3")).toBe(false);
      });

      it("get multiple selected nodes without a active workflow", () => {
        const { selectionStore, workflowStore } = createStore();

        workflowStore.activeWorkflow = null;
        expect(selectionStore.getSelectedNodes).toStrictEqual([]);
      });
    });

    describe("connections", () => {
      it("get all selected connections", () => {
        const { selectionStore } = createStore();

        expect(selectionStore.getSelectedConnections).toMatchObject([
          { allowedActions: { canDelete: true }, id: "root:2_1" },
          { allowedActions: { canDelete: true }, id: "root:2_2" },
        ]);
      });

      it("get all selected connections without a active workflow", () => {
        const { selectionStore, workflowStore } = createStore();

        workflowStore.activeWorkflow = null;
        expect(selectionStore.getSelectedConnections).toStrictEqual([]);
      });

      it("test if connection is selected", () => {
        const { selectionStore } = createStore();

        expect(selectionStore.isConnectionSelected("root:2_2")).toBe(true);
        expect(selectionStore.isConnectionSelected("root:2_3")).toBe(false);
      });
    });

    describe("bendpoints", () => {
      it("returns selected bendpoint ids", () => {
        const { selectionStore } = createStore();

        selectionStore.addBendpointsToSelection([
          "connection1__0",
          "connection1__1",
        ]);
        expect(selectionStore.selectedBendpointIds).toEqual([
          "connection1__0",
          "connection1__1",
        ]);
      });

      it("returns selected bendpoints", () => {
        const { selectionStore } = createStore();

        selectionStore.addBendpointsToSelection([
          "connection1__0",
          "connection1__1",
          "connection2__1",
        ]);
        expect(selectionStore.getSelectedBendpoints).toEqual({
          connection1: [0, 1],
          connection2: [1],
        });
      });
    });

    describe("annotations", () => {
      it("get all selected annotations", () => {
        const { selectionStore } = createStore();

        expect(selectionStore.getSelectedAnnotations).toMatchObject([
          { id: "root:3_1", text: { value: "Annotation text" } },
          { id: "root:3_2", text: { value: "Annotation text 2" } },
        ]);
      });

      it("get all selected annotations ids", () => {
        const { selectionStore } = createStore();

        expect(selectionStore.selectedAnnotationIds).toStrictEqual([
          "root:3_1",
          "root:3_2",
        ]);
      });

      it("test if annotations is selected", () => {
        const { selectionStore } = createStore();

        expect(selectionStore.isAnnotationSelected("root:3_2")).toBe(true);
        expect(selectionStore.isAnnotationSelected("root:3_3")).toBe(false);
      });

      it("get all selected annotations without a active workflow", () => {
        const { selectionStore, workflowStore } = createStore();

        workflowStore.activeWorkflow = null;
        expect(selectionStore.getSelectedAnnotations).toStrictEqual([]);
      });
    });

    it("selection is empty", () => {
      const { selectionStore } = createStore();

      expect(selectionStore.isSelectionEmpty).toBe(false);
      selectionStore.clearSelection();
      expect(selectionStore.isSelectionEmpty).toBe(true);
    });
  });
});
