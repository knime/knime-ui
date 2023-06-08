import type { ActionTree, GetterTree, MutationTree } from "vuex";

import { API } from "@api";
import type {
  Connection,
  NativeNode,
  NodeTemplate,
  XY,
} from "@/api/gateway-api/generated-api";
import type { KnimeNode } from "@/api/custom-types";

import { geometry } from "@/util/geometry";
import type { RootStoreState } from "../types";
import { getProjectAndWorkflowIds } from "./util";
import type { WorkflowState } from ".";

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
      nodeFactory = null,
      spaceItemReference,
      // use either nodeFactory or spaceItemReference
      sourceNodeId = null,
      sourcePortIdx = null,
      // possible values are: 'new-only' | 'add' | 'none'
      // 'new-only' clears the active selection and selects only the new node
      // 'add' adds the new node to the active selection
      // 'none' doesn't modify the active selection nor it selects the new node
      selectionMode = "new-only",
      isComponent = false,
    }: {
      position: XY;
      nodeFactory: { className: string };
      spaceItemReference: {
        providerId: string;
        spaceId: string;
        itemId: string;
      };
      sourceNodeId: string | null;
      sourcePortIdx: number | null;
      /**
       * 'new-only' clears the active selection and selects only the new node
       * 'add' adds the new node to the active selection
       * 'none' doesn't modify the active selection nor it selects the new node
       */
      selectionMode: "new-only" | "add" | "none";
      isComponent?: boolean;
    }
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

    // TODO: NXT-1788 component selection doesn't work atm because the api call is
    // made via a browser function which is async, so when the node id
    // is returned the WorkflowChangedEvent that adds the node to the state
    // still hasn't arrived, so the selection doesn't happen
    if (selectionMode !== "none") {
      if (selectionMode === "new-only") {
        await dispatch("selection/deselectAllObjects", null, { root: true });
      }

      await dispatch("selection/selectNode", newNodeId, { root: true });
    }

    return response;
  },

  replaceNode(
    { state },
    { targetNodeId, replacementNodeId = null, nodeFactory = null }
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
    { connectionId, position, nodeFactory, nodeId }
  ) {
    const projectId = activeWorkflow.projectId;
    const workflowId = activeWorkflow.info.containerId;

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
  property: keyof NodeTemplate;
  fallbackProperty?: keyof KnimeNode | null;
}) => {
  const {
    activeWorkflow,
    nodeId,
    property,
    fallbackProperty = property,
  } = params;

  const node = activeWorkflow.nodes[nodeId] as NativeNode;
  const { templateId } = node;

  // get property from the node if there's no templateId
  const fallbackValue = fallbackProperty ? node[fallbackProperty] : null;

  return templateId
    ? activeWorkflow.nodeTemplates[templateId][property]
    : fallbackValue;
};

export const getters: GetterTree<WorkflowState, RootStoreState> = {
  isNodeConnected:
    ({ activeWorkflow }) =>
    (nodeId: string) => {
      let connection: Connection;

      for (const connectionID in activeWorkflow.connections) {
        connection = activeWorkflow.connections[connectionID];
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
        fallbackProperty: null,
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
