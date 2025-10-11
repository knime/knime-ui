/* eslint-disable max-lines */
import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { API } from "@api";

import {
  AlignNodesCommand,
  AllowedNodeActions,
  CollapseCommand,
  Node,
  WorkflowInfo,
} from "@/api/gateway-api/generated-api";
import {
  createComponentPlaceholder,
  createConnection,
  createMetanode,
  createNativeNode,
  createWorkflow,
  createWorkflowAnnotation,
} from "@/test/factories";
import { deepMocked } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";

const mockedAPI = deepMocked(API);

describe("workflow::index", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("allows setting the snapshot ID", () => {
    const { workflowStore } = mockStores();
    workflowStore.setActiveSnapshotId("myId");
    expect(workflowStore.activeSnapshotId).toBe("myId");
  });

  it("allows setting the tooltip", () => {
    const { workflowStore } = mockStores();

    // @ts-expect-error
    workflowStore.setTooltip({ dummy: true });
    expect(workflowStore.tooltip).toStrictEqual({ dummy: true });
  });

  describe("delete objects", () => {
    it.each([[1], [20]])("deletes %s objects", async (amount) => {
      const { workflowStore, selectionStore } = mockStores();
      const nodesArray = {};
      const connectionsArray = {};
      const annotationsArray: Array<{ id: string }> = [];
      const nodeIds: string[] = [];
      const connectionIds: string[] = [];
      const annotationIds: string[] = [];
      const connectionBendpoints = {};
      const bendpointIds: string[] = [];

      for (let i = 0; i < amount / 2; i++) {
        const id = `node-${i}`;
        nodesArray[id] = { id, allowedActions: { canDelete: true } };
        nodeIds.push(id);
      }

      for (let i = 0; i < amount / 2; i++) {
        const id = `connection-${i}`;
        connectionsArray[id] = { id, allowedActions: { canDelete: true } };
        selectionStore.selectConnections(id);
        connectionIds.push(id);
      }

      for (let i = 0; i < amount / 2; i++) {
        const id = `annotation-${i}`;
        annotationsArray[i] = { id };
        annotationIds.push(id);
      }

      for (let i = 0; i < amount / 2; i++) {
        const connectionId = `connection-${i}`;
        const id = `${connectionId}__0`;
        bendpointIds.push(id);
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
      selectionStore.selectNodes(nodeIds);
      selectionStore.selectAnnotations(annotationIds);
      selectionStore.selectBendpoints(bendpointIds);

      await workflowStore.deleteSelectedObjects();
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
        const loadStoreResponse = mockStores();
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
        const { selectionStore, workflowStore } = setupStoreWithWorkflow();

        await selectionStore.selectNodes([nodesArray[nodeName].id]);
        await flushPromises();

        await workflowStore.deleteSelectedObjects();
        expect(window.alert).toHaveBeenCalledWith(
          "The following nodes can’t be deleted: [node-1]",
        );
      });

      it("connections", async () => {
        const { selectionStore, workflowStore } = setupStoreWithWorkflow();

        selectionStore.selectConnections(connectionsArray[connectorName].id);

        await workflowStore.deleteSelectedObjects();

        expect(window.alert).toHaveBeenCalledWith(
          "The following connections can’t be deleted: [connection-1]",
        );
      });

      it("nodes and connections", async () => {
        const { workflowStore, selectionStore } = setupStoreWithWorkflow();

        await selectionStore.selectNodes([nodesArray[nodeName].id]);
        await flushPromises();
        selectionStore.selectConnections(connectionsArray[connectorName].id);

        await workflowStore.deleteSelectedObjects();

        expect(window.alert).toHaveBeenCalledWith(
          "The following nodes can’t be deleted: [node-1] \n" +
            "The following connections can’t be deleted: [connection-1]",
        );
      });
    });

    it("deletes selected port", async () => {
      const matchingNodeId = "matchingNodeId";

      const { workflowStore, selectionStore, nodeInteractionsStore } =
        mockStores();

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
      await workflowStore.deleteSelectedPort();
      await flushPromises();

      expect(nodeInteractionsStore.removeNodePort).toHaveBeenCalled();

      expect(selectionStore.updateActiveNodePorts).toHaveBeenNthCalledWith(1, {
        isModificationInProgress: true,
      });

      expect(selectionStore.updateActiveNodePorts).toHaveBeenNthCalledWith(2, {
        selectedPort: "output-1",
      });
      expect(selectionStore.updateActiveNodePorts).toHaveBeenNthCalledWith(3, {
        isModificationInProgress: false,
      });

      expect(selectionStore.activeNodePorts.selectedPort).toBe("output-1");
    });
  });

  describe("collapse", () => {
    const loadStoreWithNodes = () => {
      const result = mockStores();
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
                canCollapse: AllowedNodeActions.CanCollapseEnum.True,
                canExecute: true,
              },
            },
            bar: {
              id: "bar",
              allowedActions: {
                canCollapse: AllowedNodeActions.CanCollapseEnum.True,
                canExecute: true,
              },
            },
            "new-container": {
              id: "new-container",
              allowedActions: {
                canExecute: true,
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
      await selectionStore.selectAllObjects();
      await flushPromises();

      selectionStore.selectBendpoints([
        "connection1__0",
        "connection1__1",
        "connection2__0",
      ]);

      await workflowStore.collapseToContainer({
        containerType: CollapseCommand.ContainerTypeEnum.Metanode,
      });

      expect(mockedAPI.workflowCommand.Collapse).toHaveBeenCalledWith({
        projectId: "bar",
        workflowId: "root",
        nodeIds: ["foo", "bar", "new-container"],
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
      await selectionStore.selectAllObjects();
      await flushPromises();

      await workflowStore.collapseToContainer({
        containerType: CollapseCommand.ContainerTypeEnum.Metanode,
      });

      expect(selectionStore.selectedNodeIds).toEqual([newNodeId]);
      expect(nodeInteractionsStore.nameEditorNodeId).toBe(newNodeId);
    });

    it("does not select new container if user made a selection before collapse command finishes", async () => {
      const newNodeId = "new-container";
      mockedAPI.workflowCommand.Collapse.mockImplementation(() => ({
        newNodeId,
      }));
      const { selectionStore, workflowStore, nodeInteractionsStore } =
        loadStoreWithNodes();
      await selectionStore.selectAllObjects();
      await flushPromises();

      const commandCall = workflowStore.collapseToContainer({
        containerType: CollapseCommand.ContainerTypeEnum.Metanode,
      });

      await selectionStore.selectNodes(["foo"]);
      await flushPromises();

      await commandCall;

      expect(selectionStore.selectedNodeIds).toStrictEqual(["foo"]);
      expect(nodeInteractionsStore.nameEditorNodeId).toBeNull();
    });
  });

  describe("expand", () => {
    const loadStoreWithNodes = () => {
      const result = mockStores();
      result.workflowStore.setActiveWorkflow(
        createWorkflow({
          projectId: "bar",
          info: {
            containerId: "root",
          },
          nodes: {
            foo: {
              id: "foo",
              kind: Node.KindEnum.Metanode,
              allowedActions: {
                canCollapse: AllowedNodeActions.CanCollapseEnum.True,
                canExecute: true,
                canExpand: AllowedNodeActions.CanExpandEnum.True,
              },
            },
            bar: {
              id: "bar",
              kind: Node.KindEnum.Node,
              allowedActions: {
                canExecute: true,
              },
            },
            "new-container": {
              id: "new-container",
              kind: Node.KindEnum.Component,
              allowedActions: {
                canCollapse: AllowedNodeActions.CanCollapseEnum.True,
                canExecute: true,
                canExpand: AllowedNodeActions.CanExpandEnum.True,
              },
            },
            barbaz: {
              id: "barbaz",
              allowedActions: {
                canCollapse: AllowedNodeActions.CanCollapseEnum.True,
                canExecute: true,
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
      await selectionStore.selectNodes(["foo"]);
      await flushPromises();

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
      await selectionStore.selectNodes(["new-container"]);
      await flushPromises();

      await workflowStore.expandContainerNode();
      await flushPromises();

      expect(selectionStore.selectedNodeIds).toEqual(["foo", "bar"]);
      expect(selectionStore.selectedAnnotationIds).toEqual(["id1"]);
    });

    it("does not select the expanded nodes if user selected something before command ends", async () => {
      const expandedNodeIds = ["bar", "baz"];

      mockedAPI.workflowCommand.Expand.mockImplementation(() => ({
        expandedNodeIds,
      }));
      const { selectionStore, workflowStore } = loadStoreWithNodes();
      await selectionStore.selectNodes(["foo"]);

      const commandCall = workflowStore.expandContainerNode();

      await selectionStore.deselectAllObjects(["barbaz"]);

      await commandCall;

      expect(selectionStore.selectedNodeIds).toStrictEqual(["barbaz"]);
    });
  });

  describe("alignSelectedNodes", () => {
    it("calls workflow command API with correct arguments", async () => {
      const { workflowStore, selectionStore } = mockStores();
      const direction = AlignNodesCommand.DirectionEnum.Horizontal;
      const projectId = "projectId";
      const workflowId = "workflowId";
      const nodeId1 = "root:1";
      const nodeId2 = "root:2";
      const nodeId3 = "root:3";

      const node1 = createNativeNode({ id: nodeId1 });
      const node2 = createNativeNode({ id: nodeId2 });
      const node3 = createNativeNode({ id: nodeId3 });

      workflowStore.setActiveWorkflow(
        createWorkflow({
          projectId,
          info: {
            containerId: workflowId,
          },
          nodes: {
            "root:1": node1,
            "root:2": node2,
            "root:3": node3,
          },
        }),
      );

      await selectionStore.selectNodes([node1.id, node3.id]);
      await workflowStore.alignSelectedNodes(direction);

      expect(mockedAPI.workflowCommand.AlignNodes).toHaveBeenCalledWith({
        direction,
        nodeIds: [node1.id, node3.id],
        projectId,
        workflowId,
      });
    });
  });

  describe("getters", () => {
    it("isLinked", () => {
      const { workflowStore } = mockStores();
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
      const { workflowStore } = mockStores();
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
      const { workflowStore } = mockStores();
      workflowStore.setActiveWorkflow(
        createWorkflow({
          parents: [
            {
              containerType: WorkflowInfo.ContainerTypeEnum.Component,
              linked: false,
            },
          ],
        }),
      );
      expect(workflowStore.isInsideLinked).toBe(false);
    });

    it("isInsideLinked", () => {
      const { workflowStore } = mockStores();
      workflowStore.setActiveWorkflow(
        createWorkflow({
          parents: [
            {
              containerType: WorkflowInfo.ContainerTypeEnum.Metanode,
              linked: true,
            },
          ],
        }),
      );
      expect(workflowStore.isInsideLinked).toBe(true);
    });

    it("insideLinkedType", () => {
      const { workflowStore } = mockStores();
      workflowStore.setActiveWorkflow(
        createWorkflow({
          parents: [
            {
              containerType: WorkflowInfo.ContainerTypeEnum.Metanode,
              linked: true,
            },
          ],
        }),
      );
      expect(workflowStore.insideLinkedType).toBe("metanode");
    });

    it("isWorkflowEmpty", () => {
      const { workflowStore } = mockStores();
      workflowStore.setActiveWorkflow(
        createWorkflow({
          projectId: "foo",
          nodes: Object.create({}),
          workflowAnnotations: Object.create([]),
          componentPlaceholders: Object.create({}),
        }),
      );
      expect(workflowStore.isWorkflowEmpty).toBe(true);

      workflowStore.setActiveWorkflow(
        createWorkflow({
          projectId: "foo",
          nodes: { "1": createNativeNode({ id: "1" }) },
          workflowAnnotations: [],
        }),
      );
      expect(workflowStore.isWorkflowEmpty).toBe(false);

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
          // @ts-expect-error
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
          // @ts-expect-error
          metaOutPorts: { ports: [{ id: "port" }] },
        }),
      );
      expect(workflowStore.isWorkflowEmpty).toBe(false);

      workflowStore.setActiveWorkflow(
        createWorkflow({
          projectId: "foo",
          nodes: {},
          workflowAnnotations: [],
          componentPlaceholders: [createComponentPlaceholder()],
        }),
      );
      expect(workflowStore.isWorkflowEmpty).toBe(false);
    });

    it("totalNodes returns correct node count", () => {
      const { workflowStore } = mockStores();

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
