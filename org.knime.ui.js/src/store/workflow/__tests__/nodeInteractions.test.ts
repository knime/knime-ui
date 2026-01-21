import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { API } from "@api";

import { AddNodeCommand } from "@/api/gateway-api/generated-api";
import { isBrowser, isDesktop } from "@/environment";
import {
  createComponentNode,
  createNativeNode,
  createSpaceProvider,
  createWorkflow,
} from "@/test/factories";
import { deepMocked } from "@/test/utils";
import { mockEnvironment } from "@/test/utils/mockEnvironment";
import { mockStores } from "@/test/utils/mockStores";

const mockedAPI = deepMocked(API);

vi.mock("@/environment");

describe("workflow::nodeInteractions", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("connects nodes", async () => {
    const { workflowStore, nodeInteractionsStore } = mockStores();
    workflowStore.setActiveWorkflow(
      createWorkflow({
        projectId: "foo",
        info: { containerId: "root" },
      }),
    );

    await nodeInteractionsStore.connectNodes({
      sourceNode: "source:1",
      sourcePort: 0,
      destNode: "dest:1",
      destPort: 1,
    });

    expect(mockedAPI.workflowCommand.Connect).toHaveBeenCalledWith({
      projectId: "foo",
      workflowId: "root",
      sourceNodeId: "source:1",
      sourcePortIdx: 0,
      destinationNodeId: "dest:1",
      destinationPortIdx: 1,
    });
  });

  it("opens and closes node label editor", () => {
    const { nodeInteractionsStore } = mockStores();

    nodeInteractionsStore.openLabelEditor("root:1");
    expect(nodeInteractionsStore.labelEditorNodeId).toBe("root:1");

    nodeInteractionsStore.closeLabelEditor();
    expect(nodeInteractionsStore.labelEditorNodeId).toBeNull();
  });

  it("returns if a node is connected", () => {
    const { workflowStore, nodeInteractionsStore } = mockStores();

    workflowStore.setActiveWorkflow(
      createWorkflow({
        connections: {
          "connector-1": { destNode: "node1", sourceNode: "node2" },
          "connector-2": { destNode: "node2", sourceNode: "node3" },
          "connector-3": { destNode: "node3", sourceNode: "node4" },
        },
      }),
    );

    expect(nodeInteractionsStore.isNodeConnected("node1")).toBeTruthy();
    expect(nodeInteractionsStore.isNodeConnected("node5")).toBeFalsy();
  });

  describe("add node", () => {
    const setupStoreWithWorkflow = () => {
      mockedAPI.workflowCommand.AddNode.mockImplementation(() => ({
        newNodeId: "new-mock-node",
      }));
      const loadStoreResponse = mockStores();

      loadStoreResponse.workflowStore.setActiveWorkflow(
        createWorkflow({
          projectId: "bar",
          info: { containerId: "baz" },
          nodes: {
            "root:1": { id: "root:1", position: { x: 0, y: 0 } },
            "new-mock-node": { id: "new-mock-node", position: { x: 0, y: 0 } },
          },
        }),
      );

      return { ...loadStoreResponse };
    };

    it("should add nodes based from a space", async () => {
      const { nodeInteractionsStore, workflowStore } = setupStoreWithWorkflow();

      await nodeInteractionsStore.addNativeNode({
        position: { x: 7, y: 31 },
        spaceItemReference: {
          providerId: "provider",
          spaceId: "space",
          itemId: "item",
        },
        autoConnectOptions: {
          nodeRelation: AddNodeCommand.NodeRelationEnum.SUCCESSORS,
          sourceNodeId: "1",
          sourcePortIdx: 1,
        },
      });
      expect(mockedAPI.workflowCommand.AddNode).toHaveBeenCalledWith({
        projectId: workflowStore.activeWorkflow!.projectId,
        workflowId: workflowStore.activeWorkflow!.info.containerId,
        position: { x: 5, y: 30 },
        sourceNodeId: "1",
        nodeRelation: AddNodeCommand.NodeRelationEnum.SUCCESSORS,
        sourcePortIdx: 1,
        spaceItemReference: {
          providerId: "provider",
          spaceId: "space",
          itemId: "item",
        },
      });
    });

    it("should adjust the position of the node to grid positions", async () => {
      const { nodeInteractionsStore, workflowStore } = setupStoreWithWorkflow();

      await nodeInteractionsStore.addNativeNode({
        position: { x: 7, y: 31 },
        nodeFactory: { className: "factory" },
      });

      expect(mockedAPI.workflowCommand.AddNode).toHaveBeenCalledWith({
        projectId: workflowStore.activeWorkflow!.projectId,
        workflowId: workflowStore.activeWorkflow!.info.containerId,
        position: { x: 5, y: 30 },
        nodeFactory: { className: "factory" },
        sourceNodeId: undefined,
        sourcePortIdx: undefined,
      });
    });

    it.each([
      ["new-only" as const, ["root:1"], ["new-mock-node"]],
      ["none" as const, [], []],
    ])(
      "adjusts selection correctly after adding node with %s selection mode",
      async (selectionMode, currentSelectedNodeIds, expectedNodeIds) => {
        const { nodeInteractionsStore, selectionStore } =
          setupStoreWithWorkflow();

        selectionStore.selectNodes(currentSelectedNodeIds);
        await flushPromises();

        await nodeInteractionsStore.addNativeNode({
          position: { x: 0, y: 0 },
          nodeFactory: { className: "factory" },
          selectionMode,
        });
        await flushPromises();

        expect(selectionStore.selectedNodeIds).toEqual(expectedNodeIds);
      },
    );
  });

  describe("add component", () => {
    const setupStoreWithWorkflow = () => {
      mockedAPI.workflowCommand.AddNode.mockImplementation(() => ({
        newNodeId: "new-mock-node",
      }));
      const loadStoreResponse = mockStores();

      loadStoreResponse.workflowStore.setActiveWorkflow(
        createWorkflow({
          projectId: "bar",
          info: { containerId: "baz" },
          nodes: {
            "root:1": { id: "root:1", position: { x: 0, y: 0 } },
            "new-mock-node": { id: "new-mock-node", position: { x: 0, y: 0 } },
          },
        }),
      );

      return { ...loadStoreResponse };
    };

    it("[DESKTOP] should add component from a space", async () => {
      mockEnvironment("DESKTOP", { isBrowser, isDesktop });
      const { nodeInteractionsStore, workflowStore } = setupStoreWithWorkflow();

      await nodeInteractionsStore.addComponentNode({
        position: { x: 7, y: 31 },
        componentName: "foo",
        spaceItemReference: {
          providerId: "provider",
          spaceId: "space",
          itemId: "item",
        },
      });
      expect(mockedAPI.workflowCommand.AddNode).not.toHaveBeenCalled();
      expect(mockedAPI.desktop.importComponent).toHaveBeenCalledWith({
        projectId: workflowStore.activeWorkflow!.projectId,
        workflowId: workflowStore.activeWorkflow!.info.containerId,
        x: 5,
        y: 30,
        spaceProviderId: "provider",
        spaceId: "space",
        itemId: "item",
      });
    });

    it("[BROWSER] should add component from a space", async () => {
      mockEnvironment("BROWSER", { isBrowser, isDesktop });
      const { nodeInteractionsStore, workflowStore } = setupStoreWithWorkflow();

      mockedAPI.workflowCommand.AddComponent.mockResolvedValueOnce({
        newPlaceholderId: "placeholderId",
      });

      await nodeInteractionsStore.addComponentNode({
        position: { x: 7, y: 31 },
        componentName: "foo",
        spaceItemReference: {
          providerId: "provider",
          spaceId: "space",
          itemId: "item",
        },
      });
      expect(mockedAPI.workflowCommand.AddComponent).toHaveBeenCalledWith({
        projectId: workflowStore.activeWorkflow!.projectId,
        workflowId: workflowStore.activeWorkflow!.info.containerId,
        position: { x: 5, y: 30 },
        name: "foo",
        providerId: "provider",
        itemId: "item",
      });
    });

    it("should add component from main hub", async () => {
      mockEnvironment("BROWSER", { isBrowser, isDesktop });
      const { nodeInteractionsStore, workflowStore, spaceProvidersStore } =
        setupStoreWithWorkflow();

      const provider = createSpaceProvider();
      spaceProvidersStore.setSpaceProviders({
        [provider.id]: provider,
      });

      mockedAPI.workflowCommand.AddComponent.mockResolvedValueOnce({
        newPlaceholderId: "placeholderId",
      });

      await nodeInteractionsStore.addComponentNodeFromMainHub({
        position: { x: 7, y: 31 },
        componentName: "foo",
        componentIdInHub: "*1234",
      });
      expect(mockedAPI.workflowCommand.AddComponent).toHaveBeenCalledWith({
        projectId: workflowStore.activeWorkflow!.projectId,
        workflowId: workflowStore.activeWorkflow!.info.containerId,
        position: { x: 5, y: 30 },
        name: "foo",
        providerId: provider.id,
        itemId: "*1234",
      });
    });
  });

  describe("add ports", () => {
    it("can add Node Ports", async () => {
      const { workflowStore, nodeInteractionsStore } = mockStores();

      workflowStore.setActiveWorkflow(
        createWorkflow({
          projectId: "foo",
          info: { containerId: "root" },
        }),
      );
      const payload = {
        nodeId: "node x",
        side: "input" as const,
        typeId: "porty",
        portGroup: "group",
      };
      await nodeInteractionsStore.addNodePort(payload);

      expect(mockedAPI.workflowCommand.AddPort).toHaveBeenCalledWith({
        projectId: "foo",
        workflowId: "root",
        nodeId: payload.nodeId,
        side: payload.side,
        portGroup: payload.portGroup,
        portTypeId: payload.typeId,
      });
    });

    it("can remove Node Ports", async () => {
      const { workflowStore, nodeInteractionsStore } = mockStores();

      const payload = {
        nodeId: "node x",
        side: "input" as const,
        index: 1,
      };
      workflowStore.setActiveWorkflow(
        createWorkflow({
          projectId: "foo",
          info: { containerId: "root" },
        }),
      );
      await nodeInteractionsStore.removeNodePort(payload);

      expect(mockedAPI.workflowCommand.RemovePort).toHaveBeenCalledWith({
        nodeId: payload.nodeId,
        side: payload.side,
        portIndex: payload.index,
        projectId: "foo",
        workflowId: "root",
      });
    });
  });

  describe("node getters", () => {
    const loadStoreWithWorkflow = () => {
      const loadStoreResult = mockStores();

      loadStoreResult.workflowStore.setActiveWorkflow(
        createWorkflow({
          projectId: "foo",
          nodes: {
            foo: createNativeNode({
              templateId: "bla",
            }),
            ownData: createComponentNode({
              icon: "ownIcon",
              name: "ownName",
              type: "ownType",
              // @ts-expect-error
              executionInfo: { jobManager: "test" },
            }),
          },
          nodeTemplates: {
            bla: {
              icon: "exampleIcon",
              name: "exampleName",
              // @ts-expect-error
              type: "exampleType",
              nodeFactory: {
                className: "example.class.name",
              },
            },
          },
        }),
      );

      return loadStoreResult;
    };

    it("gets name", () => {
      const { nodeInteractionsStore } = loadStoreWithWorkflow();
      expect(nodeInteractionsStore.getNodeName("foo")).toBe("exampleName");
      expect(nodeInteractionsStore.getNodeName("ownData")).toBe("ownName");
    });

    it("gets nodeFactory", () => {
      const { nodeInteractionsStore } = loadStoreWithWorkflow();
      expect(nodeInteractionsStore.getNodeFactory("foo")).toMatchObject({
        className: "example.class.name",
      });
      expect(nodeInteractionsStore.getNodeFactory("ownData")).toBeUndefined();
    });

    it("gets icon", () => {
      const { nodeInteractionsStore } = loadStoreWithWorkflow();
      expect(nodeInteractionsStore.getNodeIcon("foo")).toBe("exampleIcon");
      expect(nodeInteractionsStore.getNodeIcon("ownData")).toBe("ownIcon");
    });

    it("gets type", () => {
      const { nodeInteractionsStore } = loadStoreWithWorkflow();
      expect(nodeInteractionsStore.getNodeType("foo")).toBe("exampleType");
      expect(nodeInteractionsStore.getNodeType("ownData")).toBe("ownType");
    });
  });
});
