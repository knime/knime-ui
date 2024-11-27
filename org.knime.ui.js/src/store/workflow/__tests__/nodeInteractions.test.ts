import { describe, expect, it } from "vitest";

import { API } from "@/api";
import { deepMocked } from "@/test/utils";

import { loadStore } from "./loadStore";

const mockedAPI = deepMocked(API);

describe("workflow::nodeInteractions", () => {
  it("connects nodes", async () => {
    const { store } = await loadStore();
    store.commit("workflow/setActiveWorkflow", {
      projectId: "foo",
      info: { containerId: "root" },
    });

    await store.dispatch("workflow/connectNodes", {
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

  it("opens and closes node label editor", async () => {
    const { store } = await loadStore();

    await store.dispatch("workflow/openLabelEditor", "root:1");
    expect(store.state.workflow.labelEditorNodeId).toBe("root:1");

    await store.dispatch("workflow/closeLabelEditor");
    expect(store.state.workflow.labelEditorNodeId).toBeNull();
  });

  it("sets the id of the node thats label is being edited", async () => {
    const { store } = await loadStore();
    store.commit("workflow/setLabelEditorNodeId", "root:1");

    expect(store.state.workflow.labelEditorNodeId).toBe("root:1");
  });

  it("returns if a node is connected", async () => {
    const { store } = await loadStore();

    store.commit("workflow/setActiveWorkflow", {
      connections: {
        "connector-1": { destNode: "node1", sourceNode: "node2" },
        "connector-2": { destNode: "node2", sourceNode: "node3" },
        "connector-3": { destNode: "node3", sourceNode: "node4" },
      },
    });

    expect(store.getters["workflow/isNodeConnected"]("node1")).toBeTruthy();
    expect(store.getters["workflow/isNodeConnected"]("node5")).toBeFalsy();
  });

  describe("add node", () => {
    const setupStoreWithWorkflow = async () => {
      mockedAPI.workflowCommand.AddNode.mockImplementation(() => ({
        newNodeId: "new-mock-node",
      }));
      const loadStoreResponse = await loadStore();

      loadStoreResponse.store.commit("workflow/setActiveWorkflow", {
        projectId: "bar",
        info: { containerId: "baz" },
        nodes: {
          "root:1": { id: "root:1", position: { x: 0, y: 0 } },
        },
      });
      return { ...loadStoreResponse };
    };

    it("should add nodes based from a space", async () => {
      const { store } = await setupStoreWithWorkflow();
      await store.dispatch("workflow/addNode", {
        position: { x: 7, y: 31 },
        nodeFactory: "factory",
        sourceNodeId: null,
        sourcePortIdx: null,
        spaceItemReference: {
          providerId: "provider",
          spaceId: "space",
          itemId: "item",
        },
      });
      expect(mockedAPI.workflowCommand.AddNode).toHaveBeenCalledWith({
        projectId: store.state.workflow.activeWorkflow.projectId,
        workflowId: store.state.workflow.activeWorkflow.info.containerId,
        position: { x: 5, y: 30 },
        nodeFactory: "factory",
        sourceNodeId: null,
        sourcePortIdx: null,
        spaceItemReference: {
          providerId: "provider",
          spaceId: "space",
          itemId: "item",
        },
      });
    });

    it("should add components from a space", async () => {
      const { store } = await setupStoreWithWorkflow();
      mockedAPI.desktop.importComponent.mockReturnValueOnce("new-node");
      await store.dispatch("workflow/addNode", {
        position: { x: 7, y: 31 },
        nodeFactory: null,
        isComponent: true,
        spaceItemReference: {
          providerId: "provider",
          spaceId: "space",
          itemId: "item",
        },
      });
      expect(mockedAPI.desktop.importComponent).toHaveBeenCalledWith({
        projectId: store.state.workflow.activeWorkflow.projectId,
        workflowId: store.state.workflow.activeWorkflow.info.containerId,
        x: 5,
        y: 30,
        spaceProviderId: "provider",
        spaceId: "space",
        itemId: "item",
      });
    });

    it("should adjust the position of the node to grid positions", async () => {
      const { store } = await setupStoreWithWorkflow();

      await store.dispatch("workflow/addNode", {
        position: { x: 7, y: 31 },
        nodeFactory: "factory",
      });

      expect(mockedAPI.workflowCommand.AddNode).toHaveBeenCalledWith({
        projectId: store.state.workflow.activeWorkflow.projectId,
        workflowId: store.state.workflow.activeWorkflow.info.containerId,
        position: { x: 5, y: 30 },
        nodeFactory: "factory",
        sourceNodeId: undefined,
        sourcePortIdx: undefined,
      });
    });

    it.each([
      // selectionMode, currentSelectedNodeIds, expectedNodeIds
      ["new-only", ["root:id"], ["new-mock-node"]],
      ["add", ["root:id"], ["root:id", "new-mock-node"]],
      ["none", [], []],
    ])(
      "adjusts selection correctly after adding node",
      async (selectionMode, currentSelectedNodeIds, expectedNodeIds) => {
        const { store } = await setupStoreWithWorkflow();
        await store.dispatch("selection/selectNodes", currentSelectedNodeIds);

        await store.dispatch("workflow/addNode", {
          position: { x: 0, y: 0 },
          nodeFactory: "factory",
          selectionMode,
        });

        const expectedSelection = expectedNodeIds.reduce(
          (acc, nodeId) => ({
            ...acc,
            [nodeId]: true,
          }),
          {},
        );

        expect(store.state.selection.selectedNodes).toEqual(expectedSelection);
      },
    );
  });

  describe("add ports", () => {
    it("can add Node Ports", async () => {
      const { store } = await loadStore();

      store.commit("workflow/setActiveWorkflow", {
        projectId: "foo",
        info: { containerId: "root" },
      });
      const payload = {
        nodeId: "node x",
        side: "input",
        typeId: "porty",
        portGroup: "group",
      };
      await store.dispatch("workflow/addNodePort", payload);

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
      const { store } = await loadStore();

      const payload = {
        nodeId: "node x",
        side: "input",
        index: 1,
        portGroup: "group",
      };
      store.commit("workflow/setActiveWorkflow", {
        projectId: "foo",
        info: { containerId: "root" },
      });
      await store.dispatch("workflow/removeNodePort", payload);

      expect(mockedAPI.workflowCommand.RemovePort).toHaveBeenCalledWith({
        nodeId: payload.nodeId,
        side: payload.side,
        portGroup: payload.portGroup,
        portIndex: payload.index,
        projectId: "foo",
        workflowId: "root",
      });
    });
  });

  describe("node getters", () => {
    const loadStoreWithWorkflow = async () => {
      const { store } = await loadStore();

      store.commit("workflow/setActiveWorkflow", {
        projectId: "foo",
        nodes: {
          foo: {
            templateId: "bla",
            kind: "node",
          },
          ownData: {
            kind: "component",
            icon: "ownIcon",
            name: "ownName",
            type: "ownType",
            executionInfo: { jobManager: "test" },
          },
        },
        nodeTemplates: {
          bla: {
            icon: "exampleIcon",
            name: "exampleName",
            type: "exampleType",
            nodeFactory: {
              className: "example.class.name",
            },
          },
        },
      });

      return { store };
    };

    it("gets name", async () => {
      const { store } = await loadStoreWithWorkflow();
      expect(store.getters["workflow/getNodeName"]("foo")).toBe("exampleName");
      expect(store.getters["workflow/getNodeName"]("ownData")).toBe("ownName");
    });

    it("gets nodeFactory", async () => {
      const { store } = await loadStoreWithWorkflow();
      expect(store.getters["workflow/getNodeFactory"]("foo")).toMatchObject({
        className: "example.class.name",
      });
      expect(
        store.getters["workflow/getNodeFactory"]("ownData"),
      ).toBeUndefined();
    });

    it("gets icon", async () => {
      const { store } = await loadStoreWithWorkflow();
      expect(store.getters["workflow/getNodeIcon"]("foo")).toBe("exampleIcon");
      expect(store.getters["workflow/getNodeIcon"]("ownData")).toBe("ownIcon");
    });

    it("gets type", async () => {
      const { store } = await loadStoreWithWorkflow();
      expect(store.getters["workflow/getNodeType"]("foo")).toBe("exampleType");
      expect(store.getters["workflow/getNodeType"]("ownData")).toBe("ownType");
    });
  });
});
