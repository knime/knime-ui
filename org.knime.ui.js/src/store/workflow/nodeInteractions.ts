import type { ActionTree, GetterTree, MutationTree } from "vuex";

import { API } from "@api";
import type {
  Connection,
  SpaceItemReference,
  XY,
} from "@/api/gateway-api/generated-api";

import { geometry } from "@/util/geometry";
import type { RootStoreState } from "../types";
import { getProjectAndWorkflowIds } from "./util";
import type { WorkflowState } from ".";
import { isNativeNode } from "@/util/nodeUtil";

interface State {
  nameEditorNodeId: string | null;
  labelEditorNodeId: string | null;
}

declare module "./index" {
  interface WorkflowState extends State {}
}

export const state = (): State => ({
  nameEditorNodeId: null,
  labelEditorNodeId: null,
});

export const mutations: MutationTree<WorkflowState> = {
  setNameEditorNodeId(state, nodeId) {
    state.nameEditorNodeId = nodeId;
  },

  setLabelEditorNodeId(state, nodeId) {
    state.labelEditorNodeId = nodeId;
  },
};

export const actions: ActionTree<WorkflowState, RootStoreState> = {
  openNameEditor({ commit }, nodeId) {
    commit("setNameEditorNodeId", nodeId);
  },

  closeNameEditor({ commit }) {
    commit("setNameEditorNodeId", null);
  },

  openLabelEditor({ commit }, nodeId) {
    commit("setLabelEditorNodeId", nodeId);
  },

  closeLabelEditor({ commit }) {
    commit("setLabelEditorNodeId", null);
  },

  connectNodes({ state }, { sourceNode, sourcePort, destNode, destPort }) {
    const { projectId, workflowId } = getProjectAndWorkflowIds(state);
    return API.workflowCommand.Connect({
      projectId,
      workflowId,
      sourceNodeId: sourceNode,
      sourcePortIdx: sourcePort,
      destinationNodeId: destNode,
      destinationPortIdx: destPort,
    });
  },

  renameContainerNode({ state }, { nodeId, name }) {
    const { projectId, workflowId } = getProjectAndWorkflowIds(state);
    return API.workflowCommand.UpdateComponentOrMetanodeName({
      projectId,
      workflowId,
      nodeId,
      name,
    });
  },

  renameNodeLabel({ state }, { nodeId, label }) {
    const { projectId, workflowId } = getProjectAndWorkflowIds(state);
    return API.workflowCommand.UpdateNodeLabel({
      projectId,
      workflowId,
      nodeId,
      label,
    });
  },

  async addNode(
    { state, dispatch },
    {
      position,
      // use either nodeFactory or spaceItemReference
      nodeFactory,
      spaceItemReference,

      sourceNodeId,
      sourcePortIdx,
      // possible values are: 'new-only' | 'add' | 'none'
      // 'new-only' clears the active selection and selects only the new node
      // 'add' adds the new node to the active selection
      // 'none' doesn't modify the active selection nor it selects the new node
      selectionMode = "new-only",
      isComponent = false,
    }: {
      position: XY;
      nodeFactory?: { className: string };
      spaceItemReference: SpaceItemReference;
      sourceNodeId?: string;
      sourcePortIdx?: number;
      /**
       * 'new-only' clears the active selection and selects only the new node
       * 'add' adds the new node to the active selection
       * 'none' doesn't modify the active selection nor it selects the new node
       */
      selectionMode: "new-only" | "add" | "none";
      isComponent?: boolean;
    },
  ) {
    const { projectId, workflowId } = getProjectAndWorkflowIds(state);

    // Adjusted For Grid Snapping
    const gridAdjustedPosition = {
      x: geometry.utils.snapToGrid(position.x),
      y: geometry.utils.snapToGrid(position.y),
    };

    const apiCall = isComponent
      ? () =>
          API.desktop.importComponent({
            projectId,
            workflowId,
            x: gridAdjustedPosition.x,
            y: gridAdjustedPosition.y,
            spaceProviderId: spaceItemReference.providerId,
            spaceId: spaceItemReference.spaceId,
            itemId: spaceItemReference.itemId,
          })
      : () =>
          API.workflowCommand.AddNode({
            projectId,
            workflowId,
            position: gridAdjustedPosition,
            nodeFactory,
            spaceItemReference,
            sourceNodeId,
            sourcePortIdx,
          });

    const response = await apiCall();
    if (!response) {
      return null;
    }

    const newNodeId =
      typeof response === "string" ? response : response.newNodeId;

    if (selectionMode !== "none") {
      if (selectionMode === "new-only") {
        await dispatch(
          "selection/selectSingleObject",
          { type: "node", id: newNodeId },
          { root: true },
        );
      } else {
        await dispatch("selection/selectNode", newNodeId, { root: true });
      }
    }

    return response;
  },

  replaceNode(
    { state },
    { targetNodeId, replacementNodeId = null, nodeFactory = null },
  ) {
    const { projectId, workflowId } = getProjectAndWorkflowIds(state);

    return API.workflowCommand.ReplaceNode({
      projectId,
      workflowId,
      targetNodeId,
      replacementNodeId,
      nodeFactory,
    });
  },

  insertNode(
    { state: { activeWorkflow } },
    { connectionId, position, nodeFactory, nodeId },
  ) {
    const projectId = activeWorkflow!.projectId;
    const workflowId = activeWorkflow!.info.containerId;

    return API.workflowCommand.InsertNode({
      projectId,
      workflowId,
      connectionId,
      position,
      nodeFactory,
      nodeId,
    });
  },

  addNodePort({ state }, { nodeId, side, portGroup, typeId }) {
    const { projectId, workflowId } = getProjectAndWorkflowIds(state);

    return API.workflowCommand.AddPort({
      projectId,
      workflowId,
      nodeId,
      side,
      portGroup,
      portTypeId: typeId,
    });
  },

  removeNodePort({ state }, { nodeId, side, index, portGroup }) {
    const { projectId, workflowId } = getProjectAndWorkflowIds(state);

    return API.workflowCommand.RemovePort({
      projectId,
      workflowId,
      nodeId,
      side,
      portGroup,
      portIndex: index,
    });
  },
};

const getNodeTemplateProperty = (params: {
  activeWorkflow: WorkflowState["activeWorkflow"];
  nodeId: string;
  property: "name" | "icon" | "type" | "nodeFactory";
}) => {
  const { activeWorkflow, nodeId, property } = params;

  const node = activeWorkflow!.nodes[nodeId];

  // These nodeTemplates are not to be confused with the ones from the
  // `nodeTemplates` store module. Because these do not contain port information
  // and also only refer to the data of the current workflow level
  const nodeTemplates = activeWorkflow!.nodeTemplates;

  if (isNativeNode(node)) {
    const { templateId } = node;

    return nodeTemplates[templateId][property];
  }

  // @ts-expect-error - TODO: NXT-2023 component is not inheriting properties correctly. Type narrowing
  // can be improved here once NativeNode, ComponentNode and MetaNode types are generated correctly
  return node[property];
};

export const getters: GetterTree<WorkflowState, RootStoreState> = {
  isNodeConnected:
    ({ activeWorkflow }) =>
    (nodeId: string) => {
      let connection: Connection;

      const currentConnections = activeWorkflow!.connections;

      for (const connectionID in currentConnections) {
        connection = currentConnections[connectionID];
        if (
          connection.destNode === nodeId ||
          connection.sourceNode === nodeId
        ) {
          return true;
        }
      }

      return false;
    },

  getNodeById:
    ({ activeWorkflow }) =>
    (nodeId: string) =>
      activeWorkflow?.nodes[nodeId] || null,

  getNodeIcon:
    ({ activeWorkflow }) =>
    (nodeId: string) => {
      return getNodeTemplateProperty({
        nodeId,
        activeWorkflow,
        property: "icon",
      });
    },

  getNodeName:
    ({ activeWorkflow }) =>
    (nodeId: string) => {
      return getNodeTemplateProperty({
        nodeId,
        activeWorkflow,
        property: "name",
      });
    },

  getNodeFactory:
    ({ activeWorkflow }) =>
    (nodeId: string) => {
      return getNodeTemplateProperty({
        nodeId,
        activeWorkflow,
        property: "nodeFactory",
      });
    },

  getNodeType:
    ({ activeWorkflow }) =>
    (nodeId: string) => {
      return getNodeTemplateProperty({
        activeWorkflow,
        nodeId,
        property: "type",
      });
    },
};
