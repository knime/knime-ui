/* eslint-disable max-lines */
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises } from "@vue/test-utils";
import { API } from "@api";

import {
  createConnection,
  createMetanode,
  createWorkflow,
  createWorkflowAnnotation,
} from "@/test/factories";
import { deepMocked } from "@/test/utils";

import { loadStore } from "./loadStore";

const mockedAPI = deepMocked(API);

describe("workflow::index", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("allows setting the snapshot ID", () => {
    const { workflowStore } = loadStore();
    workflowStore.setActiveSnapshotId("myId");
    expect(workflowStore.activeSnapshotId).toBe("myId");
  });

  it("allows setting the tooltip", () => {
    const { workflowStore } = loadStore();

    // @ts-expect-error
    workflowStore.setTooltip({ dummy: true });
    expect(workflowStore.tooltip).toStrictEqual({ dummy: true });
  });

  describe("delete objects", () => {
    it.each([[1], [20]])("deletes %s objects", async (amount) => {
      const { workflowStore, selectionStore } = loadStore();
      const nodesArray = {};
      const connectionsArray = {};
      const annotationsArray: Array<{ id: string }> = [];
      const nodeIds: string[] = [];
      const connectionIds: string[] = [];
      const annotationIds: string[] = [];
      const connectionBendpoints = {};

      for (let i = 0; i < amount / 2; i++) {
        const id = `node-${i}`;
        nodesArray[id] = { id, allowedActions: { canDelete: true } };
        selectionStore.selectNode(id);
        nodeIds.push(id);
      }

      for (let i = 0; i < amount / 2; i++) {
        const id = `connection-${i}`;
        connectionsArray[id] = { id, allowedActions: { canDelete: true } };
        selectionStore.selectConnection(id);
        connectionIds.push(id);
      }

      for (let i = 0; i < amount / 2; i++) {
        const id = `annotation-${i}`;
        annotationsArray[i] = { id };
        selectionStore.selectAnnotation(id);
        annotationIds.push(id);
      }

      for (let i = 0; i < amount / 2; i++) {
        const connectionId = `connection-${i}`;
        const id = `${connectionId}__0`;
        selectionStore.selectBendpoint(id);
        connectionBendpoints[connectionId] = [0];
      }

      workflowStore.setActiveWorkflow(
        createWorkflow({
          nodes: nodesArray,
          connections: connectionsArray,
          workflowAnnotations: annotationsArray,
          projectId: "foo",
          info: {
            containerId: "test",
          },
        }),
      );

      await nextTick();

      workflowStore.deleteSelectedObjects();
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

      const setupStoreWithWorkflow = () => {
        const loadStoreResponse = loadStore();
        loadStoreResponse.workflowStore.setActiveWorkflow(
          createWorkflow({
            nodes: nodesArray,
            connections: connectionsArray,
            workflowAnnotations: annotationsArray,
            projectId: "foo",
            info: {
              containerId: "test",
            },
          }),
        );

        return loadStoreResponse;
      };

      it("nodes", async () => {
        const { selectionStore, workflowStore } =
          await setupStoreWithWorkflow();

        selectionStore.selectNode(nodesArray[nodeName].id);

        await nextTick();
        workflowStore.deleteSelectedObjects();
        expect(window.alert).toHaveBeenCalledWith(
          "The following nodes can’t be deleted: [node-1]",
        );
      });

      it("connections", async () => {
        const { selectionStore, workflowStore } =
          await setupStoreWithWorkflow();

        selectionStore.selectConnection(connectionsArray[connectorName].id);

        await nextTick();
        workflowStore.deleteSelectedObjects();

        expect(window.alert).toHaveBeenCalledWith(
          "The following connections can’t be deleted: [connection-1]",
        );
      });

      it("nodes and connections", async () => {
        const { workflowStore, selectionStore } =
          await setupStoreWithWorkflow();

        selectionStore.selectNode(nodesArray[nodeName].id);
        selectionStore.selectConnection(connectionsArray[connectorName].id);

        await nextTick();
        workflowStore.deleteSelectedObjects();

        expect(window.alert).toHaveBeenCalledWith(
          "The following nodes can’t be deleted: [node-1] \n" +
            "The following connections can’t be deleted: [connection-1]",
        );
      });
    });

    it("deletes selected port", async () => {
      const matchingNodeId = "matchingNodeId";

      const { workflowStore, selectionStore, nodeInteractionsStore } =
        loadStore();

      workflowStore.setActiveWorkflow(
        createWorkflow({
          nodes: {
            matchingNodeId: createMetanode({
              outPorts: [{}, {}, { canRemove: true }],
            }),
          },
        }),
      );

      selectionStore.activeNodePorts = {
        nodeId: matchingNodeId,
        selectedPort: "output-2",
        isModificationInProgress: false,
      };

      mockedAPI.workflowCommand.RemovePort.mockResolvedValue(true);
      workflowStore.deleteSelectedPort();

      expect(nodeInteractionsStore.removeNodePort).toHaveBeenCalled();

      expect(selectionStore.activeNodePorts.isModificationInProgress).toBe(
        true,
      );

      await flushPromises();
      // check modification lock is removed
      expect(selectionStore.activeNodePorts.isModificationInProgress).toBe(
        false,
      );
      // deleted port was at last index: check selection is updated to new last
      expect(selectionStore.activeNodePorts.selectedPort).toBe("output-1");
    });
  });

  describe("collapse", () => {
    const loadStoreWithNodes = () => {
      const result = loadStore();
      result.workflowStore.setActiveWorkflow(
        createWorkflow({
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
            createWorkflowAnnotation({
              id: "root:2_1",
              text: { value: "Test" },
            }),
            createWorkflowAnnotation({
              id: "root:2_2",
              text: { value: "Test1" },
            }),
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
        }),
      );

      return result;
    };

    it("collapses objects to a container", async () => {
      mockedAPI.workflowCommand.Collapse.mockImplementation(() => ({
        newNodeId: "",
      }));

      const { workflowStore, selectionStore } = loadStoreWithNodes();
      selectionStore.selectAllObjects();
      selectionStore.selectBendpoints([
        "connection1__0",
        "connection1__1",
        "connection2__0",
      ]);

      await workflowStore.collapseToContainer({
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

      const { selectionStore, workflowStore, nodeInteractionsStore } =
        loadStoreWithNodes();
      selectionStore.selectAllObjects();

      await workflowStore.collapseToContainer({
        containerType: "metanode",
      });

      expect(selectionStore.selectedNodes).toEqual({
        [newNodeId]: true,
      });
      expect(nodeInteractionsStore.nameEditorNodeId).toBe(newNodeId);
    });

    it("does not select new container if user made a selection before collapse command finishes", async () => {
      const newNodeId = "new-container";
      mockedAPI.workflowCommand.Collapse.mockImplementation(() => ({
        newNodeId,
      }));
      const { selectionStore, workflowStore, nodeInteractionsStore } =
        loadStoreWithNodes();
      selectionStore.selectAllObjects();

      const commandCall = workflowStore.collapseToContainer({
        containerType: "metanode",
      });

      selectionStore.selectNode("foo");

      await commandCall;

      expect(selectionStore.selectedNodes).toStrictEqual({
        foo: true,
      });
      expect(nodeInteractionsStore.nameEditorNodeId).toBeNull();
    });
  });

  describe("expand", () => {
    const loadStoreWithNodes = () => {
      const result = loadStore();
      result.workflowStore.setActiveWorkflow(
        createWorkflow({
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
        }),
      );

      return result;
    };

    it("expands a container node", async () => {
      mockedAPI.workflowCommand.Expand.mockImplementation(() => ({
        expandedNodeIds: [],
        expandedAnnotationIds: [],
      }));
      const { selectionStore, workflowStore } = loadStoreWithNodes();
      selectionStore.selectNode("foo");

      await workflowStore.expandContainerNode();

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

      const { selectionStore, workflowStore } = loadStoreWithNodes();
      selectionStore.selectNode("foo");

      await workflowStore.expandContainerNode();

      expect(selectionStore.selectedNodes).toEqual({
        foo: true,
        bar: true,
      });
      expect(selectionStore.selectedAnnotations).toEqual({
        id1: true,
      });
    });

    it("does not select the expanded nodes if user selected something before command ends", async () => {
      const expandedNodeIds = ["bar", "baz"];

      mockedAPI.workflowCommand.Expand.mockImplementation(() => ({
        expandedNodeIds,
      }));
      const { selectionStore, workflowStore } = loadStoreWithNodes();
      selectionStore.selectNode("foo");

      const commandCall = workflowStore.expandContainerNode();

      selectionStore.selectNode("barbaz");

      await commandCall;

      expect(selectionStore.selectedNodes).toStrictEqual({
        barbaz: true,
      });
    });
  });

  describe("getters", () => {
    it("isLinked", () => {
      const { workflowStore } = loadStore();
      workflowStore.setActiveWorkflow(
        createWorkflow({
          info: {
            linked: true,
          },
        }),
      );
      expect(workflowStore.isLinked).toBe(true);
    });

    it("returns false for isWritable if linked", () => {
      const { workflowStore } = loadStore();
      workflowStore.setActiveWorkflow(
        createWorkflow({
          info: {
            linked: true,
          },
        }),
      );

      expect(workflowStore.isWritable).toBe(false);
    });

    it("isInsideLinked defaults to false", () => {
      const { workflowStore } = loadStore();
      workflowStore.setActiveWorkflow(
        createWorkflow({
          parents: [
            {
              containerType: "component",
              linked: false,
            },
          ],
        }),
      );
      expect(workflowStore.isInsideLinked).toBe(false);
    });

    it("isInsideLinked", () => {
      const { workflowStore } = loadStore();
      workflowStore.setActiveWorkflow(
        createWorkflow({
          parents: [
            {
              containerType: "metanode",
              linked: true,
            },
          ],
        }),
      );
      expect(workflowStore.isInsideLinked).toBe(true);
    });

    it("insideLinkedType", () => {
      const { workflowStore } = loadStore();
      workflowStore.setActiveWorkflow(
        createWorkflow({
          parents: [
            {
              containerType: "metanode",
              linked: true,
            },
          ],
        }),
      );
      expect(workflowStore.insideLinkedType).toBe("metanode");
    });

    it("isWorkflowEmpty", () => {
      const { workflowStore } = loadStore();
      workflowStore.setActiveWorkflow(
        createWorkflow({
          projectId: "foo",
          nodes: Object.create({}),
          workflowAnnotations: Object.create([]),
        }),
      );
      expect(workflowStore.isWorkflowEmpty).toBe(true);

      workflowStore.setActiveWorkflow({
        projectId: "foo",
        nodes: [{ node: { id: 1 } }],
        workflowAnnotations: [],
      });

      workflowStore.setActiveWorkflow(
        createWorkflow({
          projectId: "foo",
          nodes: {},
          workflowAnnotations: [createWorkflowAnnotation()],
        }),
      );
      expect(workflowStore.isWorkflowEmpty).toBe(false);

      workflowStore.setActiveWorkflow(
        createWorkflow({
          projectId: "foo",
          nodes: {},
          workflowAnnotations: [],
          // @ts-ignore
          metaInPorts: { ports: [{ id: "port" }] },
          metaOutPorts: { ports: [] },
        }),
      );
      expect(workflowStore.isWorkflowEmpty).toBe(false);

      workflowStore.setActiveWorkflow(
        createWorkflow({
          projectId: "foo",
          nodes: {},
          workflowAnnotations: [],
          metaInPorts: { ports: [] },
          // @ts-ignore
          metaOutPorts: { ports: [{ id: "port" }] },
        }),
      );
    });

    it("totalNodes returns correct node count", () => {
      const { workflowStore } = loadStore();

      workflowStore.setActiveWorkflow(
        createWorkflow({
          projectId: "foo",
          nodes: {
            "node-1": { id: "node-1" },
            "node-2": { id: "node-2" },
            "node-3": { id: "node-3" },
          },
        }),
      );

      expect(workflowStore.totalNodes).toBe(3);

      workflowStore.setActiveWorkflow(null);
      expect(workflowStore.totalNodes).toBe(0);
    });
  });
});
