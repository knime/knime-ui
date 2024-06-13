import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

import { API } from "@api";
import { deepMocked } from "@/test/utils";

import { loadStore } from "./loadStore";
import { createConnection, createMetanode } from "@/test/factories";
import { flushPromises } from "@vue/test-utils";

const mockedAPI = deepMocked(API);

describe("workflow::index", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("allows setting the snapshot ID", async () => {
    const { store } = await loadStore();
    store.commit("workflow/setActiveSnapshotId", "myId");
    expect(store.state.workflow.activeSnapshotId).toBe("myId");
  });

  it("allows setting the tooltip", async () => {
    const { store } = await loadStore();
    store.commit("workflow/setTooltip", { dummy: true });
    expect(store.state.workflow.tooltip).toStrictEqual({ dummy: true });
  });

  describe("delete objects", () => {
    it.each([[1], [20]])("deletes %s objects", async (amount) => {
      const { store } = await loadStore();
      const nodesArray = {};
      const connectionsArray = {};
      const annotationsArray = [];
      const nodeIds = [];
      const connectionIds = [];
      const annotationIds = [];
      const connectionBendpoints = {};

      for (let i = 0; i < amount / 2; i++) {
        const id = `node-${i}`;
        nodesArray[id] = { id, allowedActions: { canDelete: true } };
        store.dispatch("selection/selectNode", id);
        nodeIds.push(id);
      }

      for (let i = 0; i < amount / 2; i++) {
        const id = `connection-${i}`;
        connectionsArray[id] = { id, allowedActions: { canDelete: true } };
        store.dispatch("selection/selectConnection", id);
        connectionIds.push(id);
      }

      for (let i = 0; i < amount / 2; i++) {
        const id = `annotation-${i}`;
        annotationsArray[i] = { id };
        store.dispatch("selection/selectAnnotation", id);
        annotationIds.push(id);
      }

      for (let i = 0; i < amount / 2; i++) {
        const connectionId = `connection-${i}`;
        const id = `${connectionId}__0`;
        store.dispatch("selection/selectBendpoint", id);
        connectionBendpoints[connectionId] = [0];
      }

      store.commit("workflow/setActiveWorkflow", {
        nodes: nodesArray,
        connections: connectionsArray,
        workflowAnnotations: annotationsArray,
        projectId: "foo",
        info: {
          containerId: "test",
        },
      });

      await nextTick();

      store.dispatch("workflow/deleteSelectedObjects");
      expect(mockedAPI.workflowCommand.Delete).toHaveBeenNthCalledWith(1, {
        projectId: "foo",
        workflowId: "test",
        nodeIds,
        connectionIds,
        annotationIds,
        connectionBendpoints,
      });
    });

    describe("tries to delete objects that cannot be deleted", () => {
      vi.spyOn(window, "alert").mockImplementation(() => {});

      const nodeName = "node-1";
      const connectorName = "connection-1";
      const nodesArray = {};
      nodesArray[nodeName] = {
        id: nodeName,
        allowedActions: { canDelete: false },
      };
      const connectionsArray = {};
      connectionsArray[connectorName] = {
        id: connectorName,
        allowedActions: { canDelete: false },
      };
      const annotationsArray = [];

      const setupStoreWithWorkflow = async () => {
        const loadStoreResponse = await loadStore();
        loadStoreResponse.store.commit("workflow/setActiveWorkflow", {
          nodes: nodesArray,
          connections: connectionsArray,
          workflowAnnotations: annotationsArray,
          projectId: "foo",
          info: {
            containerId: "test",
          },
        });
        return loadStoreResponse;
      };

      it("nodes", async () => {
        const { store } = await setupStoreWithWorkflow();

        store.dispatch("selection/selectNode", nodesArray[nodeName].id);

        await nextTick();
        store.dispatch("workflow/deleteSelectedObjects");
        expect(window.alert).toHaveBeenCalledWith(
          "The following nodes can’t be deleted: [node-1]",
        );
      });

      it("connections", async () => {
        const { store } = await setupStoreWithWorkflow();

        store.dispatch(
          "selection/selectConnection",
          connectionsArray[connectorName].id,
        );

        await nextTick();
        store.dispatch("workflow/deleteSelectedObjects");
        expect(window.alert).toHaveBeenCalledWith(
          "The following connections can’t be deleted: [connection-1]",
        );
      });

      it("nodes and connections", async () => {
        const { store } = await setupStoreWithWorkflow();

        store.dispatch("selection/selectNode", nodesArray[nodeName].id);
        store.dispatch(
          "selection/selectConnection",
          connectionsArray[connectorName].id,
        );

        await nextTick();
        store.dispatch("workflow/deleteSelectedObjects");
        expect(window.alert).toHaveBeenCalledWith(
          "The following nodes can’t be deleted: [node-1] \n" +
            "The following connections can’t be deleted: [connection-1]",
        );
      });
    });

    it("deletes selected port", async () => {
      const matchingNodeId = "matchingNodeId";

      const { store } = await loadStore();
      vi.spyOn(store, "commit");

      store.state.workflow.activeWorkflow = {
        nodes: {
          matchingNodeId: createMetanode({
            outPorts: [{}, {}, { canRemove: true }],
          }),
        },
      };

      store.state.selection.activeNodePorts = {
        nodeId: matchingNodeId,
        selectedPort: "output-2",
        isModificationInProgress: false,
      };
      const dispatchOriginal = store.dispatch;
      let resolveRemoveNodePortAction = null;
      vi.spyOn(store, "dispatch")
        .mockImplementationOnce(dispatchOriginal)
        .mockImplementationOnce((target, args) => {
          // check remove port action is dispatched as expected
          expect(target).toBe("workflow/removeNodePort");
          expect(args).toStrictEqual({
            nodeId: matchingNodeId,
            side: "output",
            index: 2,
            portGroup: undefined,
          });
          return new Promise((resolve) => {
            resolveRemoveNodePortAction = resolve;
          });
        });
      store.dispatch("workflow/deleteSelectedPort");

      expect(
        store.state.selection.activeNodePorts.isModificationInProgress,
      ).toBe(true);

      // remove finished
      expect(resolveRemoveNodePortAction).not.toBeNull();
      resolveRemoveNodePortAction!();
      await flushPromises();
      // check modification lock is removed
      expect(
        store.state.selection.activeNodePorts.isModificationInProgress,
      ).toBe(false);
      // deleted port was at last index: check selection is updated to new last
      expect(store.state.selection.activeNodePorts.selectedPort).toBe(
        "output-1",
      );
    });
  });

  describe("collapse", () => {
    const loadStoreWithNodes = async () => {
      const result = await loadStore();
      result.store.commit("workflow/setActiveWorkflow", {
        projectId: "bar",
        info: {
          containerId: "root",
        },
        nodes: {
          foo: {
            id: "foo",
            allowedActions: {
              canCancel: false,
              canCollapse: "true",
              canDelete: true,
              canExecute: true,
              canOpenDialog: true,
              canReset: false,
            },
          },
          bar: {
            id: "bar",
            allowedActions: {
              canCancel: false,
              canCollapse: "true",
              canDelete: true,
              canExecute: true,
              canOpenDialog: true,
              canReset: false,
            },
          },
        },
        workflowAnnotations: [
          { id: "root:2_1", text: "Test" },
          { id: "root:2_2", text: "Test1" },
        ],
        connections: {
          connection1: createConnection({
            bendpoints: [
              { x: 10, y: 10 },
              { x: 20, y: 20 },
            ],
          }),
          connection2: createConnection({
            bendpoints: [{ x: 10, y: 10 }],
          }),
        },
      });
      return result;
    };

    it("collapses objects to a container", async () => {
      mockedAPI.workflowCommand.Collapse.mockImplementation(() => ({
        newNodeId: "",
      }));

      const { store } = await loadStoreWithNodes();
      await store.dispatch("selection/selectAllObjects");
      store.dispatch("selection/selectBendpoints", [
        "connection1__0",
        "connection1__1",
        "connection2__0",
      ]);

      await store.dispatch("workflow/collapseToContainer", {
        containerType: "metanode",
      });

      expect(mockedAPI.workflowCommand.Collapse).toHaveBeenCalledWith({
        projectId: "bar",
        workflowId: "root",
        nodeIds: ["foo", "bar"],
        containerType: "metanode",
        annotationIds: ["root:2_1", "root:2_2"],
        connectionBendpoints: {
          connection1: [0, 1],
          connection2: [0],
        },
      });
    });

    it("selects the new container after collapsing nodes", async () => {
      const newNodeId = "new-container";
      mockedAPI.workflowCommand.Collapse.mockImplementation(() => ({
        newNodeId,
      }));

      const { store } = await loadStoreWithNodes();
      await store.dispatch("selection/selectAllObjects");

      await store.dispatch("workflow/collapseToContainer", {
        containerType: "metanode",
      });

      expect(store.state.selection.selectedNodes).toEqual({
        [newNodeId]: true,
      });
      expect(store.state.workflow.nameEditorNodeId).toBe(newNodeId);
    });

    it("does not select new container if user made a selection before collapse command finishes", async () => {
      const newNodeId = "new-container";
      mockedAPI.workflowCommand.Collapse.mockImplementation(() => ({
        newNodeId,
      }));
      const { store } = await loadStoreWithNodes();
      store.dispatch("selection/selectAllObjects");

      const commandCall = store.dispatch("workflow/collapseToContainer", {
        containerType: "metanode",
      });

      store.dispatch("selection/selectNode", "foo");

      await commandCall;

      expect(store.state.selection.selectedNodes).toStrictEqual({
        foo: true,
      });
      expect(store.state.workflow.nameEditorNodeId).toBeNull();
    });
  });

  describe("expand", () => {
    const loadStoreWithNodes = async () => {
      const result = await loadStore();
      result.store.commit("workflow/setActiveWorkflow", {
        projectId: "bar",
        info: {
          containerId: "root",
        },
        nodes: {
          foo: {
            id: "foo",
            kind: "metanode",
            allowedActions: {
              canCancel: false,
              canCollapse: "true",
              canDelete: true,
              canExecute: true,
              canOpenDialog: true,
              canReset: false,
              canExpand: "true",
            },
          },
          barbaz: {
            id: "barbaz",
            allowedActions: {
              canCancel: false,
              canCollapse: "true",
              canDelete: true,
              canExecute: true,
              canOpenDialog: true,
              canReset: false,
            },
          },
        },
        workflowAnnotations: [],
      });

      return result;
    };

    it("expands a container node", async () => {
      mockedAPI.workflowCommand.Expand.mockImplementation(() => ({
        expandedNodeIds: [],
        expandedAnnotationIds: [],
      }));
      const { store } = await loadStoreWithNodes();
      await store.dispatch("selection/selectNode", "foo");

      await store.dispatch("workflow/expandContainerNode");

      expect(mockedAPI.workflowCommand.Expand).toHaveBeenCalledWith({
        projectId: "bar",
        workflowId: "root",
        nodeId: "foo",
      });
    });

    it("selects the expanded nodes after the command finishes", async () => {
      const expandedNodeIds = ["foo", "bar"];
      const expandedAnnotationIds = ["id1"];
      mockedAPI.workflowCommand.Expand.mockImplementation(() => ({
        expandedNodeIds,
        expandedAnnotationIds,
      }));

      const { store } = await loadStoreWithNodes();
      store.dispatch("selection/selectNode", "foo");

      await store.dispatch("workflow/expandContainerNode");

      expect(store.state.selection.selectedNodes).toEqual({
        foo: true,
        bar: true,
      });
      expect(store.state.selection.selectedAnnotations).toEqual({
        id1: true,
      });
    });

    it("does not select the expanded nodes if user selected something before command ends", async () => {
      const expandedNodeIds = ["bar", "baz"];

      mockedAPI.workflowCommand.Expand.mockImplementation(() => ({
        expandedNodeIds,
      }));
      const { store } = await loadStoreWithNodes();
      store.dispatch("selection/selectNode", "foo");

      const commandCall = store.dispatch("workflow/expandContainerNode");

      await store.dispatch("selection/selectNode", "barbaz");

      await commandCall;

      expect(store.state.selection.selectedNodes).toStrictEqual({
        barbaz: true,
      });
    });
  });

  describe("getters", () => {
    it("isLinked", async () => {
      const { store } = await loadStore();
      store.commit("workflow/setActiveWorkflow", {
        info: {
          linked: true,
        },
      });
      expect(store.getters["workflow/isLinked"]).toBe(true);
    });

    it("returns false for isWritable if linked", async () => {
      const { store } = await loadStore();
      store.commit("workflow/setActiveWorkflow", {
        info: {
          linked: true,
        },
      });
      expect(store.getters["workflow/isWritable"]).toBe(false);
    });

    it("isInsideLinked defaults to false", async () => {
      const { store } = await loadStore();
      store.commit("workflow/setActiveWorkflow", {
        parents: [
          {
            containerType: "component",
            linked: false,
          },
        ],
      });
      expect(store.getters["workflow/isInsideLinked"]).toBe(false);
    });

    it("isInsideLinked", async () => {
      const { store } = await loadStore();
      store.commit("workflow/setActiveWorkflow", {
        parents: [
          {
            containerType: "metanode",
            linked: true,
          },
        ],
      });
      expect(store.getters["workflow/isInsideLinked"]).toBe(true);
    });

    it("insideLinkedType", async () => {
      const { store } = await loadStore();
      store.commit("workflow/setActiveWorkflow", {
        parents: [
          {
            containerType: "metanode",
            linked: true,
          },
        ],
      });
      expect(store.getters["workflow/insideLinkedType"]).toBe("metanode");
    });

    it("isWorkflowEmpty", async () => {
      const { store } = await loadStore();
      store.commit("workflow/setActiveWorkflow", {
        projectId: "foo",
        nodes: [],
        workflowAnnotations: [],
      });
      expect(store.getters["workflow/isWorkflowEmpty"]).toBe(true);

      store.commit("workflow/setActiveWorkflow", {
        projectId: "foo",
        nodes: [{ node: { id: 1 } }],
        workflowAnnotations: [],
      });

      store.commit("workflow/setActiveWorkflow", {
        projectId: "foo",
        nodes: [],
        workflowAnnotations: ["something"],
      });
      expect(store.getters["workflow/isWorkflowEmpty"]).toBe(false);

      store.commit("workflow/setActiveWorkflow", {
        projectId: "foo",
        nodes: [],
        workflowAnnotations: [],
        metaInPorts: { ports: [{ id: "port" }] },
        metaOutPorts: { ports: [] },
      });
      expect(store.getters["workflow/isWorkflowEmpty"]).toBe(false);

      store.commit("workflow/setActiveWorkflow", {
        projectId: "foo",
        nodes: [],
        workflowAnnotations: [],
        metaInPorts: { ports: [] },
        metaOutPorts: { ports: [{ id: "port" }] },
      });
    });
  });
});
