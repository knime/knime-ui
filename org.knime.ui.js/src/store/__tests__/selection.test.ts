/* eslint-disable max-lines */
import { expect, describe, beforeEach, it } from "vitest";
import { mockVuexStore } from "@/test/utils";

import * as selectionStoreConfig from "../selection";
import type { RootStoreState } from "../types";
import type { Store } from "vuex";

describe("workflow store", () => {
  let $store: Store<RootStoreState>, storeConfig;

  beforeEach(() => {
    storeConfig = {
      selection: {
        ...selectionStoreConfig,
      },
      workflow: {
        state: {
          activeWorkflow: {
            nodes: {
              "root:1": { id: "root:1" },
              "root:2": { id: "root:2" },
            },
            connections: {
              "root:2_1": {
                allowedActions: { canDelete: true },
                id: "root:2_1",
              },
              "root:2_2": {
                allowedActions: { canDelete: true },
                id: "root:2_2",
              },
            },
            workflowAnnotations: [
              { id: "root:3_1", text: "Annotation text" },
              { id: "root:3_2", text: "Annotation text 2" },
            ],
          },
        },
      },
    };

    $store = mockVuexStore(storeConfig);
  });

  describe("mutations", () => {
    it("adding nodes to selection", () => {
      expect(Object.keys($store.state.selection.selectedNodes).length).toBe(0);
      $store.commit("selection/addNodesToSelection", ["root:1"]);
      expect(Object.keys($store.state.selection.selectedNodes).length).toBe(1);
    });

    it("removes nodes from selection", () => {
      $store.commit("selection/addNodesToSelection", ["root:1"]);
      expect(Object.keys($store.state.selection.selectedNodes).length).toBe(1);
      $store.commit("selection/removeNodesFromSelection", ["root:1"]);
      expect(Object.keys($store.state.selection.selectedNodes).length).toBe(0);
    });

    it("adding connections to selection", () => {
      expect(
        Object.keys($store.state.selection.selectedConnections).length,
      ).toBe(0);
      $store.commit("selection/addConnectionsToSelection", ["root:1"]);
      expect(
        Object.keys($store.state.selection.selectedConnections).length,
      ).toBe(1);
    });

    it("removes connections from selection", () => {
      $store.commit("selection/addConnectionsToSelection", ["root:1"]);
      expect(
        Object.keys($store.state.selection.selectedConnections).length,
      ).toBe(1);
      $store.commit("selection/removeConnectionsFromSelection", ["root:1"]);
      expect(
        Object.keys($store.state.selection.selectedConnections).length,
      ).toBe(0);
    });

    it("clear selection doesnt override state, if nothing to clear", () => {
      const selectedNodes = $store.state.selection.selectedNodes;
      const selectedConnections = $store.state.selection.selectedConnections;
      const selectedAnnotations = $store.state.selection.selectedAnnotations;

      $store.commit("selection/clearSelection");

      expect($store.state.selection.selectedNodes).toBe(selectedNodes);
      expect($store.state.selection.selectedConnections).toBe(
        selectedConnections,
      );
      expect($store.state.selection.selectedAnnotations).toBe(
        selectedAnnotations,
      );
    });

    it("adding annotations to selection", () => {
      expect(
        Object.keys($store.state.selection.selectedAnnotations).length,
      ).toBe(0);
      $store.commit("selection/addAnnotationToSelection", ["root:1"]);
      expect(
        Object.keys($store.state.selection.selectedAnnotations).length,
      ).toBe(1);
    });

    it("removes annotations from selection", () => {
      $store.commit("selection/addAnnotationToSelection", ["root:1"]);
      expect(
        Object.keys($store.state.selection.selectedAnnotations).length,
      ).toBe(1);
      $store.commit("selection/removeAnnotationFromSelection", ["root:1"]);
      expect(
        Object.keys($store.state.selection.selectedAnnotations).length,
      ).toBe(0);
    });

    it("sets id of annotation that rectangle selection was started from", () => {
      expect(
        $store.state.selection.startedSelectionFromAnnotationId,
      ).toBeNull();
      $store.commit("selection/setStartedSelectionFromAnnotationId", "root:1");
      expect($store.state.selection.startedSelectionFromAnnotationId).toBe(
        "root:1",
      );
    });

    it("sets if rectangle selection was started", () => {
      expect($store.state.selection.didStartRectangleSelection).toBe(false);
      $store.commit("selection/setDidStartRectangleSelection", true);
      expect($store.state.selection.didStartRectangleSelection).toBe(true);
    });

    it("adding bendpoint to selection", () => {
      expect(
        Object.keys($store.state.selection.selectedBendpoints).length,
      ).toBe(0);
      $store.commit("selection/addBendpointsToSelection", ["connection1__0"]);
      expect(
        Object.keys($store.state.selection.selectedBendpoints).length,
      ).toBe(1);
    });

    it("removes bendpoints from selection", () => {
      $store.commit("selection/addBendpointsToSelection", ["connection1__0"]);
      expect(
        Object.keys($store.state.selection.selectedBendpoints).length,
      ).toBe(1);
      $store.commit("selection/removeBendpointsFromSelection", [
        "connection1__0",
      ]);
      expect(
        Object.keys($store.state.selection.selectedBendpoints).length,
      ).toBe(0);
    });
  });

  describe("actions", () => {
    beforeEach(() => {
      storeConfig = {
        selection: {
          ...selectionStoreConfig,
          state: {
            selectedNodes: {
              "root:1": true,
            },
            selectedConnections: {
              "root:1_1": true,
            },
            selectedAnnotations: {
              "root:2_1": true,
            },
            selectedBendpoints: {},
            selectedMetanodePortBars: {},
            activeNodePorts: {
              nodeId: null,
              selectedPort: null,
              isModificationInProgress: false,
            },
          },
        },
        workflow: {
          state: {
            activeWorkflow: {
              nodes: {
                "root:1": { id: "root:1" },
                "root:2": { id: "root:2" },
              },
              workflowAnnotations: [
                { id: "root:2_1", text: "Test" },
                { id: "root:2_2", text: "Test1" },
              ],
            },
          },
        },
      };

      $store = mockVuexStore(storeConfig);
    });

    it("deselects all selected Objects", () => {
      Object.assign($store.state.selection.activeNodePorts, {
        nodeId: "someid:0",
        selectedPort: "output-3",
      });
      $store.dispatch("selection/deselectAllObjects");
      expect(Object.keys($store.state.selection.selectedNodes).length).toBe(0);
      expect(
        Object.keys($store.state.selection.selectedConnections).length,
      ).toBe(0);
      expect(
        Object.keys($store.state.selection.selectedAnnotations).length,
      ).toBe(0);
      expect($store.state.selection.activeNodePorts.nodeId).toBeNull();
      expect($store.state.selection.activeNodePorts.selectedPort).toBeNull();
    });

    it("selects all objects", () => {
      $store.dispatch("selection/selectAllObjects");
      expect(Object.keys($store.state.selection.selectedNodes).length).toBe(2);
      expect(
        Object.keys($store.state.selection.selectedAnnotations).length,
      ).toBe(2);
      expect(
        Object.keys($store.state.selection.selectedConnections).length,
      ).toBe(1);
    });

    describe("nodes", () => {
      it("selects a specific node", () => {
        $store.dispatch("selection/deselectAllObjects");
        $store.dispatch("selection/selectNode", "root:1");
        expect(Object.keys($store.state.selection.selectedNodes).length).toBe(
          1,
        );
        expect(
          Object.keys($store.state.selection.selectedConnections).length,
        ).toBe(0);
      });

      it("selects multiple nodes", () => {
        $store.dispatch("selection/deselectAllObjects");
        $store.dispatch("selection/selectNodes", ["root:1", "root:2"]);
        expect(Object.keys($store.state.selection.selectedNodes).length).toBe(
          2,
        );
        expect(
          Object.keys($store.state.selection.selectedConnections).length,
        ).toBe(0);
      });

      it("deselects a specific node", () => {
        $store.dispatch("selection/deselectNode", "root:1");
        expect(Object.keys($store.state.selection.selectedNodes).length).toBe(
          0,
        );
        expect(
          Object.keys($store.state.selection.selectedConnections).length,
        ).toBe(1);
      });

      it("deselects multiple nodes", () => {
        storeConfig.selection.state.selectedNodes["root:2"] = true;
        $store = mockVuexStore(storeConfig);
        $store.dispatch("selection/deselectNodes", ["root:1", "root:2"]);
        expect(Object.keys($store.state.selection.selectedNodes).length).toBe(
          0,
        );
        expect(
          Object.keys($store.state.selection.selectedConnections).length,
        ).toBe(1);
      });
    });

    describe("connections", () => {
      it("selects a specific connection", () => {
        $store.dispatch("selection/deselectAllObjects");
        $store.dispatch("selection/selectConnection", "root:1_1");
        expect(Object.keys($store.state.selection.selectedNodes).length).toBe(
          0,
        );
        expect(
          Object.keys($store.state.selection.selectedConnections).length,
        ).toBe(1);
      });

      it("deselects a specific connection", () => {
        $store.dispatch("selection/deselectConnection", "root:1_1");
        expect(Object.keys($store.state.selection.selectedNodes).length).toBe(
          1,
        );
        expect(
          Object.keys($store.state.selection.selectedConnections).length,
        ).toBe(0);
      });

      it("selects a specific annotation", () => {
        $store.dispatch("selection/deselectAllObjects");
        $store.dispatch("selection/selectAnnotation", "root:3_1");
        expect(
          Object.keys($store.state.selection.selectedAnnotations).length,
        ).toBe(1);
        expect(Object.keys($store.state.selection.selectedNodes).length).toBe(
          0,
        );
      });
    });

    describe("bendpoints", () => {
      it("selects a specific bendpoint", () => {
        $store.dispatch("selection/deselectAllObjects");
        $store.dispatch("selection/selectBendpoint", "connection1__0");
        expect(
          Object.keys($store.state.selection.selectedBendpoints).length,
        ).toBe(1);
      });

      it("selects multiple bendpoints", () => {
        $store.dispatch("selection/deselectAllObjects");
        $store.dispatch("selection/selectBendpoints", [
          "connection1__0",
          "connection1__1",
        ]);
        expect(
          Object.keys($store.state.selection.selectedBendpoints).length,
        ).toBe(2);
      });

      it("deselects a specific bendpoint", () => {
        $store.dispatch("selection/selectBendpoints", [
          "connection1__0",
          "connection1__1",
        ]);

        $store.dispatch("selection/deselectBendpoint", "connection1__0");
        expect(
          Object.keys($store.state.selection.selectedBendpoints).length,
        ).toBe(1);
      });

      it("deselects multiple bendpoints", () => {
        $store.dispatch("selection/selectBendpoints", [
          "connection1__0",
          "connection1__1",
        ]);

        $store.dispatch("selection/deselectBendpoints", [
          "connection1__0",
          "connection1__1",
        ]);
        expect(
          Object.keys($store.state.selection.selectedBendpoints).length,
        ).toBe(0);
      });
    });

    describe("metanode port bars", () => {
      it("selects a specific metanode port bar", () => {
        $store.dispatch("selection/deselectAllObjects");
        $store.dispatch("selection/selectMetanodePortBar", "in");
        expect(
          Object.keys($store.state.selection.selectedMetanodePortBars).length,
        ).toBe(1);
      });

      it("select both port bars", () => {
        $store.dispatch("selection/deselectAllObjects");
        $store.dispatch("selection/selectMetanodePortBar", "in");
        $store.dispatch("selection/selectMetanodePortBar", "out");
        expect(
          Object.keys($store.state.selection.selectedMetanodePortBars).length,
        ).toBe(2);
      });

      it("deselects a port bar", () => {
        $store.dispatch("selection/selectMetanodePortBar", "in");
        $store.dispatch("selection/selectMetanodePortBar", "out");

        $store.dispatch("selection/deselectMetanodePortBar", "out");
        expect(
          Object.keys($store.state.selection.selectedMetanodePortBars).length,
        ).toBe(1);
      });
    });

    describe("annotations", () => {
      it("selects multiple annotation", () => {
        $store.dispatch("selection/deselectAllObjects");
        $store.dispatch("selection/selectAnnotations", [
          "root:3_1",
          "root:3_2",
        ]);
        expect(
          Object.keys($store.state.selection.selectedAnnotations).length,
        ).toBe(2);
        expect(Object.keys($store.state.selection.selectedNodes).length).toBe(
          0,
        );
      });

      it("deselects a specific annotation", () => {
        $store.dispatch("selection/deselectAnnotation", "root:2_1");
        expect(
          Object.keys($store.state.selection.selectedAnnotations).length,
        ).toBe(0);
        expect(Object.keys($store.state.selection.selectedNodes).length).toBe(
          1,
        );
      });

      it("deselects multiple annotation", () => {
        storeConfig.selection.state.selectedAnnotations["root:3_1"] = true;
        $store = mockVuexStore(storeConfig);
        $store.dispatch("selection/deselectAnnotations", [
          "root:2_1",
          "root:3_1",
        ]);
        expect(
          Object.keys($store.state.selection.selectedAnnotations).length,
        ).toBe(0);
        expect(Object.keys($store.state.selection.selectedNodes).length).toBe(
          1,
        );
      });

      it("toggles selection of an annotation", () => {
        const annotationId = "root:1_1";
        const isMultiselect = true;
        const isSelected = false;
        $store = mockVuexStore(storeConfig);
        $store.dispatch("selection/toggleAnnotationSelection", {
          annotationId,
          isMultiselect,
          isSelected,
        });
        expect(
          Object.keys($store.state.selection.selectedAnnotations),
        ).toContain(annotationId);
        expect(
          Object.keys($store.state.selection.selectedAnnotations).length,
        ).toBe(2);
      });

      it("selects only clicked annotation if multi selection is false", async () => {
        const annotationId = "root:1_1";
        const isMultiselect = false;
        const isSelected = false;
        $store = mockVuexStore(storeConfig);
        await $store.dispatch("selection/toggleAnnotationSelection", {
          annotationId,
          isMultiselect,
          isSelected,
        });
        expect(
          Object.keys($store.state.selection.selectedAnnotations),
        ).toStrictEqual([annotationId]);
        expect(
          Object.keys($store.state.selection.selectedAnnotations).length,
        ).toBe(1);
      });

      it("returns if rectangle selection was started from selected annotation", () => {
        storeConfig.selection.state.didStartRectangleSelection = true;
        storeConfig.selection.state.startedSelectionFromAnnotationId =
          "root:1_1";
        $store = mockVuexStore(storeConfig);
        $store.dispatch("selection/toggleAnnotationSelection", {
          annotationId: "root:1_1",
          isMultiselect: true,
          isSelected: false,
        });
        expect(
          $store.state.selection.startedSelectionFromAnnotationId,
        ).toBeNull();
      });
    });
  });

  describe("getters", () => {
    beforeEach(() => {
      $store.commit("selection/addNodesToSelection", ["root:1", "root:2"]);
      $store.commit("selection/addConnectionsToSelection", [
        "root:2_1",
        "root:2_2",
      ]);
      $store.commit("selection/addAnnotationToSelection", [
        "root:3_1",
        "root:3_2",
      ]);

      $store.commit("selection/addNodesToSelection", ["unknown node"]);
      $store.commit("selection/addConnectionsToSelection", [
        "unknown connection",
      ]);
    });

    describe("nodes", () => {
      it("get all selected node ids, for that nodes exist", () => {
        expect($store.getters["selection/selectedNodeIds"]).toStrictEqual([
          "root:1",
          "root:2",
        ]);
      });

      it("get multiple selected nodes", () => {
        expect($store.getters["selection/selectedNodes"]).toStrictEqual(
          expect.objectContaining([{ id: "root:1" }, { id: "root:2" }]),
        );
        expect($store.getters["selection/singleSelectedNode"]).toBeNull();
      });

      it("get single selected node", () => {
        $store.commit("selection/clearSelection");
        $store.commit("selection/addNodesToSelection", ["root:1"]);

        expect($store.getters["selection/singleSelectedNode"]).toStrictEqual({
          id: "root:1",
        });
      });

      it("test if node is selected", () => {
        expect($store.getters["selection/isNodeSelected"]("root:1")).toBe(true);
        expect($store.getters["selection/isNodeSelected"]("root:3")).toBe(
          false,
        );
      });

      it("get multiple selected nodes without a active workflow", () => {
        storeConfig.workflow.state.activeWorkflow = null;
        $store = mockVuexStore(storeConfig);
        expect($store.getters["selection/selectedNodes"]).toStrictEqual([]);
      });
    });

    describe("connections", () => {
      it("get all selected connections", () => {
        expect($store.getters["selection/selectedConnections"]).toStrictEqual([
          { allowedActions: { canDelete: true }, id: "root:2_1" },
          { allowedActions: { canDelete: true }, id: "root:2_2" },
        ]);
      });

      it("get all selected connections without a active workflow", () => {
        storeConfig.workflow.state.activeWorkflow = null;
        $store = mockVuexStore(storeConfig);
        expect($store.getters["selection/selectedConnections"]).toStrictEqual(
          [],
        );
      });

      it("test if connection is selected", () => {
        expect(
          $store.getters["selection/isConnectionSelected"]("root:2_2"),
        ).toBe(true);
        expect(
          $store.getters["selection/isConnectionSelected"]("root:2_3"),
        ).toBe(false);
      });
    });

    describe("bendpoints", () => {
      it("returns selected bendpoint ids", () => {
        $store.commit("selection/addBendpointsToSelection", [
          "connection1__0",
          "connection1__1",
        ]);

        expect($store.getters["selection/selectedBendpointIds"]).toEqual([
          "connection1__0",
          "connection1__1",
        ]);
      });

      it("returns selected bendpoints", () => {
        $store.commit("selection/addBendpointsToSelection", [
          "connection1__0",
          "connection1__1",
          "connection2__1",
        ]);

        expect($store.getters["selection/selectedBendpoints"]).toEqual({
          connection1: [0, 1],
          connection2: [1],
        });
      });
    });

    describe("annotations", () => {
      it("get all selected annotations", () => {
        expect($store.getters["selection/selectedAnnotations"]).toStrictEqual([
          { id: "root:3_1", text: "Annotation text" },
          { id: "root:3_2", text: "Annotation text 2" },
        ]);
      });

      it("get all selected annotations ids", () => {
        expect($store.getters["selection/selectedAnnotationIds"]).toStrictEqual(
          ["root:3_1", "root:3_2"],
        );
      });

      it("test if annotations is selected", () => {
        expect(
          $store.getters["selection/isAnnotationSelected"]("root:3_2"),
        ).toBe(true);
        expect(
          $store.getters["selection/isAnnotationSelected"]("root:3_3"),
        ).toBe(false);
      });

      it("get all selected annotations without a active workflow", () => {
        storeConfig.workflow.state.activeWorkflow = null;
        $store = mockVuexStore(storeConfig);
        expect($store.getters["selection/selectedAnnotations"]).toStrictEqual(
          [],
        );
      });
    });

    it("selection is empty", () => {
      expect($store.getters["selection/isSelectionEmpty"]).toBe(false);

      $store.commit("selection/clearSelection");

      expect($store.getters["selection/isSelectionEmpty"]).toBe(true);
    });
  });
});
