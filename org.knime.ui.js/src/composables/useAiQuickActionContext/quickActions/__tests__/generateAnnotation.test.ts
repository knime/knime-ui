import { afterEach, describe, expect, it, vi } from "vitest";

import type { Bounds } from "@/api/gateway-api/generated-api";
import { QuickActionId } from "@/store/ai/types";
import {
  createNativeNode,
  createWorkflow,
  createWorkflowAnnotation,
} from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import { buildContext } from "../generateAnnotation";

describe("generateAnnotation.buildContext", () => {
  const setupContext = ({
    workflow = createWorkflow(),
    selectedNodeIds = [] as string[],
    bounds = { x: 0, y: 0, width: 100, height: 100 },
    mockGetContainedNodesForAnnotation,
  }: {
    workflow?: ReturnType<typeof createWorkflow> | null;
    selectedNodeIds?: string[];
    bounds?: Bounds;
    mockGetContainedNodesForAnnotation?: (annotationId: string) => string[];
  } = {}) => {
    const stores = mockStores({ stubActions: false });
    const {
      workflowStore,
      annotationInteractionsStore,
      nodeInteractionsStore,
    } = stores;

    if (workflow) {
      workflowStore.setActiveWorkflow(workflow);
    } else {
      workflowStore.setActiveWorkflow(null);
    }

    stores.aiQuickActionsStore.processingActions[
      QuickActionId.GenerateAnnotation
    ] = {
      bounds,
      selectedNodeIds,
    };

    if (mockGetContainedNodesForAnnotation) {
      // @ts-expect-error Partial mock
      annotationInteractionsStore.getContainedNodesForAnnotation =
        mockGetContainedNodesForAnnotation;
    }

    // @ts-expect-error Partial mock
    nodeInteractionsStore.getNodeFactory = vi
      .fn()
      .mockImplementation((nodeId: string) => {
        if (workflow) {
          const node = workflow.nodes[nodeId];
          // @ts-expect-error templateId may not exist on all node types
          return node?.templateId || "default-template";
        }
        return "default-template";
      });

    return stores;
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return null when no active workflow", () => {
    setupContext({ workflow: null });

    const context = buildContext();

    expect(context).toBeNull();
  });

  it("should return null when no processing state for action", () => {
    const workflow = createWorkflow();
    const stores = mockStores();
    stores.workflowStore.setActiveWorkflow(workflow);

    const context = buildContext();

    expect(context).toBeNull();
  });

  it("should return context with full workflow for small workflows", () => {
    const node1 = createNativeNode({ id: "root:1" });
    const node2 = createNativeNode({ id: "root:2" });

    const workflow = createWorkflow({
      nodes: {
        "root:1": node1,
        "root:2": node2,
      },
    });

    setupContext({
      workflow,
      selectedNodeIds: ["root:1", "root:2"],
    });

    const context = buildContext();

    expect(context).not.toBeNull();
    expect(context?.selectedNodeIds).toEqual(["root:1", "root:2"]);
    expect(context?.workflow).toBeDefined();
    expect(Object.keys(context?.workflow.nodes || {}).length).toBe(2);
  });

  it("should remove svg icon data from node templates", () => {
    const workflow = createWorkflow({
      nodeTemplates: {
        "template:1": {
          icon: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
          name: "Node Template",
        } as any,
      },
    });

    setupContext({ workflow });

    const context = buildContext();

    expect(context).not.toBeNull();
    expect(context?.workflow.nodeTemplates["template:1"]).toBeDefined();
    expect(context?.workflow.nodeTemplates["template:1"].icon).toBeUndefined();
    expect(context?.workflow.nodeTemplates["template:1"].name).toBe(
      "Node Template",
    );
  });

  it("should include selected node IDs in context", () => {
    const node1 = createNativeNode({ id: "root:1" });
    const node2 = createNativeNode({ id: "root:2" });
    const node3 = createNativeNode({ id: "root:3" });

    const workflow = createWorkflow({
      nodes: {
        "root:1": node1,
        "root:2": node2,
        "root:3": node3,
      },
    });

    setupContext({
      workflow,
      selectedNodeIds: ["root:1", "root:3"],
    });

    const context = buildContext();

    expect(context).not.toBeNull();
    expect(context?.selectedNodeIds).toEqual(["root:1", "root:3"]);
  });

  it("should include annotations containing nodes with their contained node IDs", () => {
    const node1 = createNativeNode({ id: "root:1" });
    const node2 = createNativeNode({ id: "root:2" });

    const annotation1 = createWorkflowAnnotation({
      id: "annotation:1",
      text: { value: "Annotation 1" },
    });

    const workflow = createWorkflow({
      nodes: {
        "root:1": node1,
        "root:2": node2,
      },
      workflowAnnotations: [annotation1],
    });

    setupContext({
      workflow,
      selectedNodeIds: ["root:1", "root:2"],
      mockGetContainedNodesForAnnotation: (id) => {
        if (id === "annotation:1") {
          return ["root:1"];
        }
        return [];
      },
    });

    const context = buildContext();

    expect(context).not.toBeNull();
    expect(context?.annotationsContainingNodes).toHaveLength(1);
    expect(context?.annotationsContainingNodes?.[0]).toEqual({
      id: "annotation:1",
      containedNodes: ["root:1"],
    });
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

    setupContext({
      workflow,
      selectedNodeIds: ["root:0"],
    });

    const context = buildContext();

    expect(context).not.toBeNull();
    expect(Object.keys(context?.workflow.nodes || {}).length).toBe(50);
    expect(context?.workflow.nodes["root:0"]).toBeDefined();
    expect(context?.workflow.nodes["root:49"]).toBeDefined();
  });

  it("should filter workflow to vicinity for large workflows (>50 nodes)", () => {
    const nodes = {};
    const nodeTemplates = {};

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
      };
    }

    const workflow = createWorkflow({
      nodes,
      nodeTemplates,
    });

    setupContext({
      workflow,
      selectedNodeIds: ["root:0", "root:1"],
      bounds: { x: -50, y: -50, width: 300, height: 150 },
    });

    const context = buildContext();

    expect(context).not.toBeNull();

    const includedNodeCount = Object.keys(context?.workflow.nodes || {}).length;

    expect(includedNodeCount).toBeLessThan(100);
    expect(includedNodeCount).toBeGreaterThan(0);
    expect(context?.workflow.nodes["root:0"]).toBeDefined();
    expect(context?.workflow.nodes["root:1"]).toBeDefined();
    expect(context?.workflow.nodes["root:99"]).toBeUndefined();
  });

  it("should only include connections within vicinity", () => {
    const nodes = {};
    const connections = {};

    for (let i = 0; i < 100; i++) {
      const nodeId = `root:${i}`;
      nodes[nodeId] = createNativeNode({
        id: nodeId,
        position: { x: i * 200, y: 0 },
      });

      if (i > 0) {
        connections[`conn:${i}`] = {
          id: `conn:${i}`,
          sourceNode: `root:${i - 1}`,
          destNode: nodeId,
          sourcePort: 1,
          destPort: 1,
        };
      }
    }

    const workflow = createWorkflow({ nodes, connections });

    setupContext({
      workflow,
      selectedNodeIds: ["root:0", "root:1"],
      bounds: { x: -50, y: -50, width: 300, height: 150 },
    });

    const context = buildContext();

    expect(context).not.toBeNull();

    Object.values(context?.workflow.connections || {}).forEach((connection) => {
      expect(context?.workflow.nodes[connection.sourceNode]).toBeDefined();
      expect(context?.workflow.nodes[connection.destNode]).toBeDefined();
    });
  });

  it("should only include node templates used by nodes in vicinity", () => {
    const nodes = {};
    const nodeTemplates = {};

    for (let i = 0; i < 100; i++) {
      nodes[`root:${i}`] = createNativeNode({
        id: `root:${i}`,
        position: { x: i * 200, y: 0 },
        templateId: `template:${i}`,
      });

      nodeTemplates[`template:${i}`] = {
        name: `Template ${i}`,
      };
    }

    const workflow = createWorkflow({ nodes, nodeTemplates });

    setupContext({
      workflow,
      selectedNodeIds: ["root:0"],
      bounds: { x: -50, y: -50, width: 200, height: 200 },
    });

    const context = buildContext();

    expect(context).not.toBeNull();

    const includedNodeCount = Object.keys(context?.workflow.nodes || {}).length;
    const includedTemplateCount = Object.keys(
      context?.workflow.nodeTemplates || {},
    ).length;

    expect(includedTemplateCount).toBe(includedNodeCount);
  });

  it("should throw error when vicinity contains too many nodes", () => {
    const nodes = {};
    for (let i = 0; i < 51; i++) {
      nodes[`root:${i}`] = createNativeNode({
        id: `root:${i}`,
        position: { x: i * 200, y: 0 },
      });
    }

    const workflow = createWorkflow({ nodes });

    setupContext({
      workflow,
      selectedNodeIds: ["root:0", "root:50"],
      bounds: { x: -100, y: -100, width: 10200, height: 200 },
    });

    expect(() => buildContext()).toThrow();

    try {
      buildContext();
    } catch (error: any) {
      const parsed = JSON.parse(error.message);
      expect(parsed.detail.code).toBe("VALIDATION_ERROR");
      expect(parsed.detail.message).toContain(
        "The number of nodes in the selected area is too large",
      );
    }
  });
});
