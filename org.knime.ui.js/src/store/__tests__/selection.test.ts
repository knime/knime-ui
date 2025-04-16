import { describe, expect, it } from "vitest";
import { flushPromises } from "@vue/test-utils";

import type { WorkflowObject } from "@/api/custom-types";
import {
  createConnection,
  createNativeNode,
  createWorkflow,
  createWorkflowAnnotation,
} from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";

describe("selection store", () => {
  const createWorkflowContext = () => {
    const { workflowStore, selectionStore } = mockStores();

    const node1 = createNativeNode({ id: "root:1" });
    const node2 = createNativeNode({ id: "root:2" });
    const connection1 = createConnection({ id: "1_to_2" });
    const connection2 = createConnection({ id: "2_to_1" });
    const annotation1 = createWorkflowAnnotation({
      id: "anno1602",
      text: { value: "Annotation text" },
    });
    const annotation2 = createWorkflowAnnotation({
      id: "anno1603",
      text: { value: "Annotation text 2" },
    });

    workflowStore.activeWorkflow = createWorkflow({
      nodes: { [node1.id]: node1, [node2.id]: node2 },
      connections: {
        [connection1.id]: connection1,
        [connection2.id]: connection2,
      },
      workflowAnnotations: [annotation1, annotation2],
    });

    return {
      selectionStore,
      workflowStore,
      node1,
      node2,
      connection1,
      connection2,
      annotation1,
      annotation2,
    };
  };

  describe("actions", () => {
    it("adding nodes to selection", async () => {
      const { selectionStore, node1 } = createWorkflowContext();

      expect(selectionStore.selectedNodeIds.length).toBe(0);
      await selectionStore.selectNodes([node1.id]);
      expect(selectionStore.selectedNodeIds).toEqual([node1.id]);
    });

    it("removes nodes from selection", async () => {
      const { selectionStore, node1, node2 } = createWorkflowContext();

      await selectionStore.selectNodes([node1.id, node2.id]);
      await selectionStore.deselectNodes([node1.id]);
      expect(selectionStore.selectedNodeIds).toEqual([node2.id]);
    });

    it("adding connections to selection", () => {
      const { selectionStore, connection1 } = createWorkflowContext();

      expect(selectionStore.getSelectedConnections.length).toBe(0);
      selectionStore.selectConnections([connection1.id]);
      expect(selectionStore.isConnectionSelected(connection1.id)).toBe(true);
    });

    it("removes connections from selection", () => {
      const { selectionStore, connection1 } = createWorkflowContext();

      selectionStore.selectConnections([connection1.id]);
      selectionStore.deselectConnections(connection1.id);
      expect(selectionStore.isConnectionSelected(connection1.id)).toBe(false);
    });

    it("adding annotations to selection", () => {
      const { selectionStore, annotation1 } = createWorkflowContext();

      expect(selectionStore.selectedAnnotationIds.length).toBe(0);
      selectionStore.selectAnnotations([annotation1.id]);
      expect(selectionStore.isAnnotationSelected(annotation1.id)).toBe(true);
    });

    it("removes annotations from selection", () => {
      const { selectionStore, annotation1 } = createWorkflowContext();

      selectionStore.selectAnnotations([annotation1.id]);
      selectionStore.deselectAnnotations(annotation1.id);
      expect(selectionStore.isAnnotationSelected(annotation1.id)).toBe(false);
    });

    it("sets id of annotation that rectangle selection was started from", () => {
      const { selectionStore, annotation1 } = createWorkflowContext();

      expect(selectionStore.startedSelectionFromAnnotationId).toBeNull();
      selectionStore.startedSelectionFromAnnotationId = annotation1.id;
      expect(selectionStore.startedSelectionFromAnnotationId).toBe(
        annotation1.id,
      );
    });

    it("adding bendpoint to selection", () => {
      const { selectionStore, connection1 } = createWorkflowContext();

      expect(selectionStore.selectedBendpointIds.length).toBe(0);
      selectionStore.selectBendpoints([connection1.id]);
      expect(selectionStore.selectedBendpointIds).toEqual([connection1.id]);
    });

    it("removes bendpoints from selection", () => {
      const { selectionStore, connection1 } = createWorkflowContext();

      selectionStore.selectBendpoints([connection1.id]);
      selectionStore.deselectBendpoints(connection1.id);
      expect(selectionStore.selectedBendpointIds).toEqual([]);
    });

    it("deselects all selected objects", async () => {
      const { selectionStore } = createWorkflowContext();

      selectionStore.updateActiveNodePorts({
        nodeId: "root:3",
        selectedPort: "output-3",
      });

      await selectionStore.deselectAllObjects();
      await flushPromises();

      expect(selectionStore.selectedNodeIds).toHaveLength(0);
      expect(selectionStore.getSelectedConnections).toHaveLength(0);
      expect(selectionStore.selectedAnnotationIds).toHaveLength(0);
      expect(selectionStore.activeNodePorts.nodeId).toBeNull();
      expect(selectionStore.activeNodePorts.selectedPort).toBeNull();
    });

    it("selects all objects", async () => {
      const { selectionStore, node1, node2, annotation1 } =
        createWorkflowContext();

      await selectionStore.selectAllObjects();

      expect(selectionStore.selectedNodeIds).toEqual(
        expect.arrayContaining([node1.id, node2.id]),
      );

      expect(selectionStore.selectedAnnotationIds).toEqual(
        expect.arrayContaining([annotation1.id]),
      );

      expect(selectionStore.getSelectedConnections).toHaveLength(0);
    });

    it("deselects all objects and ensures given nodes are selected afterwards", async () => {
      const { selectionStore, node1, node2, annotation1 } =
        createWorkflowContext();

      await selectionStore.selectNodes([node1.id, node2.id]);
      selectionStore.selectAnnotations([annotation1.id]);

      expect(selectionStore.selectedNodeIds).toEqual([node1.id, node2.id]);
      expect(selectionStore.selectedAnnotationIds).toEqual([annotation1.id]);

      await selectionStore.deselectAllObjects([node1.id]);
      expect(selectionStore.selectedNodeIds).toHaveLength(1);
      expect(selectionStore.selectedAnnotationIds).toHaveLength(0);
    });

    describe("nodes", () => {
      it("selects a specific node", async () => {
        const { selectionStore, node1 } = createWorkflowContext();

        await selectionStore.deselectAllObjects();
        expect(selectionStore.selectedNodeIds).toEqual([]);

        await selectionStore.selectNodes([node1.id]);
        expect(selectionStore.selectedNodeIds).toEqual([node1.id]);
      });

      it("selects multiple nodes", async () => {
        const { selectionStore, node1, node2 } = createWorkflowContext();

        await selectionStore.deselectAllObjects();
        expect(selectionStore.selectedNodeIds).toEqual([]);

        await selectionStore.selectNodes([node1.id, node2.id]);
        expect(selectionStore.selectedNodeIds).toEqual([node1.id, node2.id]);
      });

      it("deselects a specific node", async () => {
        const { selectionStore, node1, node2 } = createWorkflowContext();

        await selectionStore.selectNodes([node1.id, node2.id]);
        expect(selectionStore.selectedNodeIds).toHaveLength(2);

        await selectionStore.deselectNodes([node1.id]);
        expect(selectionStore.selectedNodeIds).toHaveLength(1);
      });

      it("deselects multiple nodes", async () => {
        const { selectionStore, node1, node2 } = createWorkflowContext();

        await selectionStore.selectNodes([node1.id, node2.id]);
        expect(selectionStore.selectedNodeIds).toHaveLength(2);

        await selectionStore.deselectNodes([node1.id, node2.id]);
        expect(selectionStore.selectedNodeIds).toHaveLength(0);
      });
    });

    describe("connections", () => {
      it("selects a specific connection", () => {
        const { selectionStore, connection1 } = createWorkflowContext();

        selectionStore.selectConnections([connection1.id]);

        expect(selectionStore.getSelectedConnections).toHaveLength(1);
      });

      it("deselects a specific connection", () => {
        const { selectionStore, connection1 } = createWorkflowContext();

        selectionStore.deselectConnections(connection1.id);

        expect(selectionStore.getSelectedConnections).toHaveLength(0);
      });
    });

    describe("bendpoints", () => {
      it("selects a specific bendpoint", () => {
        const { selectionStore } = createWorkflowContext();

        selectionStore.selectBendpoints(["connection1__0"]);

        expect(selectionStore.selectedBendpointIds).toEqual(["connection1__0"]);
      });

      it("selects multiple bendpoints", () => {
        const { selectionStore } = createWorkflowContext();

        selectionStore.selectBendpoints(["connection1__0", "connection1__1"]);

        expect(selectionStore.selectedBendpointIds).toEqual([
          "connection1__0",
          "connection1__1",
        ]);
      });

      it("deselects a specific bendpoint", () => {
        const { selectionStore } = createWorkflowContext();

        selectionStore.selectBendpoints(["connection1__0", "connection1__1"]);
        selectionStore.deselectBendpoints("connection1__0");

        expect(selectionStore.selectedBendpointIds).toEqual(["connection1__1"]);
      });

      it("deselects multiple bendpoints", () => {
        const { selectionStore } = createWorkflowContext();

        selectionStore.selectBendpoints(["connection1__0", "connection1__1"]);
        selectionStore.deselectBendpoints(["connection1__0", "connection1__1"]);

        expect(selectionStore.selectedBendpointIds).toHaveLength(0);
      });
    });

    describe("metanode port bars", () => {
      it("selects a specific metanode port bar", () => {
        const { selectionStore } = createWorkflowContext();

        selectionStore.selectMetanodePortBar(["in"]);
        expect(selectionStore.getSelectedMetanodePortBars).toEqual(["in"]);
      });

      it("selects both port bars", () => {
        const { selectionStore } = createWorkflowContext();

        selectionStore.selectMetanodePortBar(["in", "out"]);
        expect(selectionStore.getSelectedMetanodePortBars).toEqual(
          expect.arrayContaining(["in", "out"]),
        );
      });

      it("deselects a port bar", () => {
        const { selectionStore } = createWorkflowContext();

        selectionStore.selectMetanodePortBar(["in", "out"]);
        selectionStore.deselectMetanodePortBar(["out"]);
        expect(selectionStore.getSelectedMetanodePortBars).toEqual(["in"]);
      });
    });

    describe("annotations", () => {
      it("selects a specific annotation", () => {
        const { selectionStore } = createWorkflowContext();

        selectionStore.selectAnnotations(["anno2"]);

        expect(selectionStore.selectedAnnotationIds).toEqual(["anno2"]);
        expect(selectionStore.selectedNodeIds).toHaveLength(0);
      });

      it("selects multiple annotations", () => {
        const { selectionStore } = createWorkflowContext();

        selectionStore.selectAnnotations(["anno1", "anno2"]);

        expect(selectionStore.selectedAnnotationIds).toEqual(
          expect.arrayContaining(["anno1", "anno2"]),
        );
        expect(selectionStore.selectedNodeIds).toHaveLength(0);
      });

      it("deselects a specific annotation", () => {
        const { selectionStore } = createWorkflowContext();
        selectionStore.selectAnnotations(["anno1", "anno2"]);
        expect(selectionStore.selectedAnnotationIds).toHaveLength(2);

        selectionStore.deselectAnnotations("anno1");
        expect(selectionStore.selectedAnnotationIds).toHaveLength(1);
      });

      it("deselects multiple annotations", () => {
        const { selectionStore } = createWorkflowContext();
        selectionStore.selectAnnotations(["anno1", "anno2"]);
        expect(selectionStore.selectedAnnotationIds).toHaveLength(2);

        selectionStore.deselectAnnotations(["anno1", "anno2"]);
        expect(selectionStore.selectedAnnotationIds).toHaveLength(0);
      });

      it("toggles selection with multiselect enabled", () => {
        const { selectionStore } = createWorkflowContext();

        selectionStore.selectAnnotations(["anno1"]);
        selectionStore.toggleAnnotationSelection({
          annotationId: "anno2",
          isMultiselect: true,
          isSelected: false,
        });

        expect(selectionStore.selectedAnnotationIds).toEqual(
          expect.arrayContaining(["anno1", "anno2"]),
        );
      });

      it("replaces selection when multiselect disabled", () => {
        const { selectionStore } = createWorkflowContext();

        selectionStore.toggleAnnotationSelection({
          annotationId: "anno2",
          isMultiselect: false,
          isSelected: false,
        });

        expect(selectionStore.selectedAnnotationIds).toEqual(["anno2"]);
      });

      it("clears selection origin when starting from same annotation", () => {
        const { selectionStore } = createWorkflowContext();

        selectionStore.startedSelectionFromAnnotationId = "anno1";
        selectionStore.didStartRectangleSelection = true;

        selectionStore.toggleAnnotationSelection({
          annotationId: "anno1",
          isMultiselect: true,
          isSelected: false,
        });

        expect(selectionStore.startedSelectionFromAnnotationId).toBeNull();
      });
    });

    it("focuses and unfocuses objects", async () => {
      const { selectionStore, node1, annotation1 } = createWorkflowContext();

      await selectionStore.selectNodes([node1.id]);
      const nodeObject = selectionStore.selectedObjects[0];

      selectionStore.focusObject(nodeObject);
      expect(selectionStore.getFocusedObject).toStrictEqual(nodeObject);

      selectionStore.focusObject(null);
      expect(selectionStore.getFocusedObject).toBeNull();

      await selectionStore.deselectNodes([node1.id]);
      selectionStore.selectAnnotations(annotation1.id);

      const annotationObject = selectionStore.selectedObjects[0];

      selectionStore.focusObject(annotationObject);
      expect(selectionStore.getFocusedObject).toStrictEqual(annotationObject);
    });

    it("updates activePortTab state", () => {
      const { selectionStore } = createWorkflowContext();

      selectionStore.activePortTab = "0";
      expect(selectionStore.activePortTab).toBe("0");

      selectionStore.activePortTab = null;
      expect(selectionStore.activePortTab).toBeNull();
    });

    it("returns single selected objects correctly", async () => {
      const { selectionStore, node1, node2, annotation1 } =
        createWorkflowContext();

      await selectionStore.selectNodes([node1.id]);
      expect(selectionStore.singleSelectedNode?.id).toBe(node1.id);
      expect(selectionStore.singleSelectedObject?.id).toBe(node1.id);

      selectionStore.selectAnnotations([annotation1.id]);
      expect(selectionStore.singleSelectedAnnotation?.id).toBe(annotation1.id);
      expect(selectionStore.singleSelectedObject?.id).toBeUndefined();
      await selectionStore.deselectNodes([node1.id]);
      expect(selectionStore.singleSelectedObject?.id).toBe(annotation1.id);

      await selectionStore.selectNodes([node1.id, node2.id]);
      expect(selectionStore.singleSelectedNode).toBeNull();
    });

    it("detects empty selection state", async () => {
      const { selectionStore, node1 } = createWorkflowContext();

      expect(selectionStore.isSelectionEmpty).toBe(true);

      await selectionStore.selectNodes([node1.id]);
      expect(selectionStore.isSelectionEmpty).toBe(false);

      await selectionStore.deselectAllObjects();
      expect(selectionStore.isSelectionEmpty).toBe(true);
    });
  });

  describe("edge cases and invalid states", () => {
    it("handles focusing non-existent objects", () => {
      const { selectionStore } = createWorkflowContext();
      const fakeNode = {
        id: "ghost-node",
        type: "non-existent",
      } as unknown as WorkflowObject;

      selectionStore.focusObject(fakeNode);
      expect(selectionStore.getFocusedObject).toBeNull();
    });

    it("handles duplicate selection IDs", async () => {
      const { selectionStore, node1 } = createWorkflowContext();

      await selectionStore.selectNodes([node1.id, node1.id]);
      expect(selectionStore.selectedNodeIds).toEqual([node1.id]);

      await selectionStore.deselectNodes(["non-existent-id"]);
      expect(selectionStore.selectedNodeIds).toEqual([node1.id]);
    });

    it("handles toggleAnnotationSelection with isSelected=true", () => {
      const { selectionStore, annotation1 } = createWorkflowContext();

      selectionStore.toggleAnnotationSelection({
        annotationId: annotation1.id,
        isMultiselect: false,
        isSelected: true,
      });

      expect(selectionStore.selectedAnnotationIds).toEqual([annotation1.id]);
    });

    it("handles empty selection operations", async () => {
      const { selectionStore } = createWorkflowContext();

      await selectionStore.selectNodes([]);
      await selectionStore.deselectNodes([]);
      selectionStore.selectConnections([]);

      expect(selectionStore.selectedNodeIds).toEqual([]);
      expect(selectionStore.getSelectedConnections).toEqual([]);
    });

    it("handles selection of non-existent nodes", async () => {
      const { selectionStore } = createWorkflowContext();

      await selectionStore.selectNodes(["non-existent-node"]);
      expect(selectionStore.selectedNodeIds).toEqual([]);
      expect(selectionStore.getSelectedNodes).toEqual([]);
    });
  });
});
