import { afterEach, describe, expect, it, vi } from "vitest";

import type { Bounds } from "@/api/gateway-api/generated-api";
import { KaiQuickActionId } from "@/store/ai/types";
import {
  createNativeNode,
  createWorkflow,
  createWorkflowAnnotation,
} from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import { mountComposable } from "@/test/utils/mountComposable";
import { useAiContextBuilder } from "../useAiContextBuilder";

describe("useAiContextBuilder", () => {
  const setup = ({
    workflow = createWorkflow(),
    selectedNodeIds = [] as string[],
    mockGetContainedNodesForAnnotation,
    mockGetAnnotationBoundsForSelectedNodes,
  }: {
    workflow?: ReturnType<typeof createWorkflow> | null;
    selectedNodeIds?: string[];
    mockGetContainedNodesForAnnotation?: (annotationId: string) => string[];
    mockGetAnnotationBoundsForSelectedNodes?: Bounds;
  } = {}) => {
    const stores = mockStores({ stubActions: false });
    const {
      workflowStore,
      selectionStore,
      annotationInteractionsStore,
      nodeInteractionsStore,
    } = stores;

    if (workflow) {
      workflowStore.setActiveWorkflow(workflow);
    } else {
      workflowStore.setActiveWorkflow(null);
    }

    if (selectedNodeIds.length > 0) {
      selectionStore.selectNodes(selectedNodeIds);
    }

    if (mockGetContainedNodesForAnnotation) {
      // @ts-expect-error
      annotationInteractionsStore.getContainedNodesForAnnotation =
        mockGetContainedNodesForAnnotation;
    }

    if (mockGetAnnotationBoundsForSelectedNodes) {
      // @ts-expect-error
      annotationInteractionsStore.getAnnotationBoundsForSelectedNodes =
        mockGetAnnotationBoundsForSelectedNodes;
    }

    // @ts-expect-error
    nodeInteractionsStore.getNodeTemplateProperty = vi
      .fn()
      .mockImplementation(({ nodeId, property }) => {
        if (property === "nodeFactory" && workflow) {
          const node = workflow.nodes[nodeId];
          return node?.templateId;
        }
        return undefined;
      });

    const { getComposableResult } = mountComposable({
      composable: useAiContextBuilder,
      composableProps: undefined,
      mockedStores: stores,
    });

    return {
      composableResult: getComposableResult(),
      stores,
    };
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("buildForQuickAction", () => {
    it("should build context for generateAnnotation action with small workflow", () => {
      const node1 = createNativeNode({ id: "root:1" });
      const node2 = createNativeNode({ id: "root:2" });
      const annotation1 = createWorkflowAnnotation({
        id: "annotation:1",
        text: { value: "Annotation 1" },
      });

      const workflow = createWorkflow({
        projectId: "test-project",
        nodes: {
          "root:1": node1,
          "root:2": node2,
        },
        workflowAnnotations: [annotation1],
      });

      const { composableResult } = setup({
        workflow,
        selectedNodeIds: ["root:1", "root:2"],
        mockGetContainedNodesForAnnotation: () => ["root:1"],
      });

      const context = composableResult.buildForQuickAction(
        KaiQuickActionId.generateAnnotation,
      );

      expect(context).not.toBeNull();
      expect(context?.selectedNodeIds).toEqual(["root:1", "root:2"]);
      expect(context?.workflow).toBeDefined();
      expect(context?.workflow.projectId).toBe("test-project");
      expect(context?.annotationsContainingNodes).toBeDefined();
      expect(context?.annotationsContainingNodes).toHaveLength(1);
      expect(context?.annotationsContainingNodes?.[0].id).toBe("annotation:1");
      expect(context?.annotationsContainingNodes?.[0].containedNodes).toEqual([
        "root:1",
      ]);
    });

    it("should remove icons from nodeTemplates", () => {
      const workflow = createWorkflow({
        nodeTemplates: {
          "template:1": {
            icon: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
            name: "Node Template",
          } as any,
        },
      });

      const { composableResult } = setup({ workflow });

      const context = composableResult.buildForQuickAction(
        KaiQuickActionId.generateAnnotation,
      );

      expect(context).not.toBeNull();
      expect(context?.workflow.nodeTemplates["template:1"]).toBeDefined();
      expect(
        context?.workflow.nodeTemplates["template:1"].icon,
      ).toBeUndefined();
      expect(context?.workflow.nodeTemplates["template:1"].name).toBe(
        "Node Template",
      );
    });

    it("should return null when no active workflow", () => {
      const { composableResult } = setup({ workflow: null });

      const context = composableResult.buildForQuickAction(
        KaiQuickActionId.generateAnnotation,
      );

      expect(context).toBeNull();
    });

    it("should include annotationsContainingNodes based on workflow state", () => {
      const node1 = createNativeNode({ id: "root:1" });
      const workflow = createWorkflow({
        nodes: {
          "root:1": node1,
        },
      });

      const { composableResult } = setup({
        workflow,
        selectedNodeIds: ["root:1"],
        mockGetContainedNodesForAnnotation: () => [],
      });

      const context = composableResult.buildForQuickAction(
        KaiQuickActionId.generateAnnotation,
      );

      expect(context).not.toBeNull();
      expect(Array.isArray(context?.annotationsContainingNodes)).toBe(true);
    });

    it("should handle workflow with multiple annotations", () => {
      const node1 = createNativeNode({ id: "root:1" });
      const node2 = createNativeNode({ id: "root:2" });
      const node3 = createNativeNode({ id: "root:3" });

      const annotation1 = createWorkflowAnnotation({
        id: "annotation:1",
        text: { value: "Annotation 1" },
      });
      const annotation2 = createWorkflowAnnotation({
        id: "annotation:2",
        text: { value: "Annotation 2" },
      });

      const workflow = createWorkflow({
        nodes: {
          "root:1": node1,
          "root:2": node2,
          "root:3": node3,
        },
        workflowAnnotations: [annotation1, annotation2],
      });

      const { composableResult } = setup({
        workflow,
        selectedNodeIds: ["root:1", "root:2", "root:3"],
        mockGetContainedNodesForAnnotation: (id) => {
          if (id === "annotation:1") {
            return ["root:1", "root:2"];
          }
          if (id === "annotation:2") {
            return ["root:3"];
          }
          return [];
        },
      });

      const context = composableResult.buildForQuickAction(
        KaiQuickActionId.generateAnnotation,
      );

      expect(context).not.toBeNull();
      expect(context?.annotationsContainingNodes).toHaveLength(2);
      expect(context?.annotationsContainingNodes?.[0]).toEqual({
        id: "annotation:1",
        containedNodes: ["root:1", "root:2"],
      });
      expect(context?.annotationsContainingNodes?.[1]).toEqual({
        id: "annotation:2",
        containedNodes: ["root:3"],
      });
    });

    it("should preserve all workflow properties except icons", () => {
      const workflow = createWorkflow({
        projectId: "test-project",
        info: {
          name: "Test Workflow",
          containerId: "container:1",
        },
        nodeTemplates: {
          "template:1": {
            icon: "some-icon",
            name: "Template 1",
            type: "NativeNode",
          } as any,
        },
      });

      const { composableResult } = setup({ workflow });

      const context = composableResult.buildForQuickAction(
        KaiQuickActionId.generateAnnotation,
      );

      expect(context).not.toBeNull();
      expect(context?.workflow.projectId).toBe("test-project");
      expect(context?.workflow.info.name).toBe("Test Workflow");
      expect(context?.workflow.nodes).toBeDefined();
      expect(context?.workflow.connections).toBeDefined();
      expect(context?.workflow.dirty).toBe(false);
    });

    it("should filter large workflows to vicinity of selected nodes", () => {
      // Create a large workflow with 100 nodes spread across a large area
      const nodes = {};
      const connections = {};
      const nodeTemplates = {};

      // Create 100 nodes in a grid pattern (10x10)
      for (let i = 0; i < 100; i++) {
        const nodeId = `root:${i}`;
        const x = (i % 10) * 200;
        const y = Math.floor(i / 10) * 200;

        nodes[nodeId] = createNativeNode({
          id: nodeId,
          position: { x, y },
          templateId: `template:${i}`,
        });

        nodeTemplates[`template:${i}`] = {
          name: `Template ${i}`,
          type: "Manipulator",
          nodeFactory: { className: `factory.${i}` },
        };

        if (i > 0 && i % 10 !== 0) {
          connections[`${nodeId}_${i - 1}`] = {
            id: `${nodeId}_${i - 1}`,
            sourceNode: `root:${i - 1}`,
            destNode: nodeId,
            sourcePort: 1,
            destPort: 1,
            allowedActions: { canDelete: true },
          };
        }
      }

      const annotations = [
        createWorkflowAnnotation({
          id: "ann:1",
          bounds: { x: 0, y: 0, width: 300, height: 300 },
        }),
        createWorkflowAnnotation({
          id: "ann:2",
          bounds: { x: 1500, y: 1500, width: 300, height: 300 },
        }),
      ];

      const workflow = createWorkflow({
        nodes,
        connections,
        nodeTemplates,
        workflowAnnotations: annotations,
      });

      const { composableResult } = setup({
        workflow,
        selectedNodeIds: ["root:0", "root:1"],
        mockGetAnnotationBoundsForSelectedNodes: {
          x: -50,
          y: -50,
          width: 300,
          height: 150,
        },
        mockGetContainedNodesForAnnotation: () => [],
      });

      const context = composableResult.buildForQuickAction(
        KaiQuickActionId.generateAnnotation,
      );

      expect(context).not.toBeNull();

      const includedNodeCount = Object.keys(
        context?.workflow.nodes || {},
      ).length;

      expect(includedNodeCount).toBeLessThan(100);
      expect(includedNodeCount).toBeGreaterThan(10);

      expect(context?.workflow.nodes["root:0"]).toBeDefined();
      expect(context?.workflow.nodes["root:1"]).toBeDefined();
      expect(context?.workflow.nodes["root:99"]).toBeUndefined();

      expect(Object.keys(context?.workflow.nodeTemplates || {}).length).toBe(
        includedNodeCount,
      );

      Object.values(context?.workflow.connections || {}).forEach(
        (connection) => {
          expect(context?.workflow.nodes[connection.sourceNode]).toBeDefined();
          expect(context?.workflow.nodes[connection.destNode]).toBeDefined();
        },
      );

      expect(
        context?.workflow.workflowAnnotations.find((a) => a.id === "ann:1"),
      ).toBeDefined();
      expect(
        context?.workflow.workflowAnnotations.find((a) => a.id === "ann:2"),
      ).toBeUndefined();
    });

    it("should not filter small workflows (<=50 nodes)", () => {
      const nodes = {};
      for (let i = 0; i < 50; i++) {
        nodes[`root:${i}`] = createNativeNode({
          id: `root:${i}`,
          position: { x: i * 1000, y: 0 },
        });
      }

      const workflow = createWorkflow({ nodes });

      const { composableResult } = setup({
        workflow,
        selectedNodeIds: ["root:0"],
      });

      const context = composableResult.buildForQuickAction(
        KaiQuickActionId.generateAnnotation,
      );

      expect(context).not.toBeNull();
      expect(Object.keys(context?.workflow.nodes || {}).length).toBe(50);
      expect(context?.workflow.nodes["root:0"]).toBeDefined();
      expect(context?.workflow.nodes["root:49"]).toBeDefined();
    });

    it("should throw VALIDATION_ERROR when filtered workflow has too many nodes", () => {
      const nodes = {};
      for (let i = 0; i < 51; i++) {
        nodes[`root:${i}`] = createNativeNode({
          id: `root:${i}`,
          position: { x: i * 200, y: 0 },
        });
      }

      const workflow = createWorkflow({ nodes });

      const { composableResult } = setup({
        workflow,
        selectedNodeIds: ["root:0", "root:50"],
        mockGetAnnotationBoundsForSelectedNodes: {
          x: -100,
          y: -100,
          width: 10200,
          height: 200,
        },
      });

      expect(() =>
        composableResult.buildForQuickAction(
          KaiQuickActionId.generateAnnotation,
        ),
      ).toThrow();

      try {
        composableResult.buildForQuickAction(
          KaiQuickActionId.generateAnnotation,
        );
      } catch (error: any) {
        const parsed = JSON.parse(error.message);
        expect(parsed.detail.code).toBe("VALIDATION_ERROR");
        expect(parsed.detail.message).toContain(
          "The number of nodes in the selected area is too large",
        );
      }
    });
  });
});
