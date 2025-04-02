import { API } from "@api";
import { defineStore } from "pinia";

import type {
  AddNodeCommand,
  Connection,
  NodeFactoryKey,
  PortCommand,
  SpaceItemReference,
  XY,
} from "@/api/gateway-api/generated-api";
import { isBrowser } from "@/environment";
import { useSelectionStore } from "@/store/selection";
import { geometry } from "@/util/geometry";
import { isNativeNode } from "@/util/nodeUtil";

import { useWorkflowStore } from "./workflow";

type NodeInteractionsState = {
  nameEditorNodeId: string | null;
  labelEditorNodeId: string | null;
};

export const useNodeInteractionsStore = defineStore("nodeInteractions", {
  state: (): NodeInteractionsState => ({
    nameEditorNodeId: null,
    labelEditorNodeId: null,
  }),
  actions: {
    openNameEditor(nodeId: string) {
      this.nameEditorNodeId = nodeId;
    },

    closeNameEditor() {
      this.nameEditorNodeId = null;
    },

    openLabelEditor(nodeId: string) {
      this.labelEditorNodeId = nodeId;
    },

    closeLabelEditor() {
      this.labelEditorNodeId = null;
    },

    connectNodes({
      sourceNode,
      sourcePort,
      destNode,
      destPort,
    }: {
      sourceNode: string;
      sourcePort: number;
      destNode: string;
      destPort: number;
    }) {
      const { projectId, workflowId } =
        useWorkflowStore().getProjectAndWorkflowIds;
      return API.workflowCommand.Connect({
        projectId,
        workflowId,
        sourceNodeId: sourceNode,
        sourcePortIdx: sourcePort,
        destinationNodeId: destNode,
        destinationPortIdx: destPort,
      });
    },

    renameContainerNode({ nodeId, name }: { nodeId: string; name: string }) {
      const { projectId, workflowId } =
        useWorkflowStore().getProjectAndWorkflowIds;
      return API.workflowCommand.UpdateComponentOrMetanodeName({
        projectId,
        workflowId,
        nodeId,
        name,
      });
    },

    renameNodeLabel({ nodeId, label }: { nodeId: string; label: string }) {
      const { projectId, workflowId } =
        useWorkflowStore().getProjectAndWorkflowIds;
      return API.workflowCommand.UpdateNodeLabel({
        projectId,
        workflowId,
        nodeId,
        label,
      });
    },

    async addNode({
      position,
      // use either nodeFactory or spaceItemReference
      nodeFactory,
      spaceItemReference,

      sourceNodeId,
      sourcePortIdx,
      nodeRelation,
      // possible values are: 'new-only' | 'add' | 'none'
      // 'new-only' clears the active selection and selects only the new node
      // 'add' adds the new node to the active selection
      // 'none' doesn't modify the active selection nor it selects the new node
      selectionMode = "new-only",
      isComponent = false,
    }: {
      position: XY;
      nodeFactory?: { className: string };
      spaceItemReference?: SpaceItemReference;
      sourceNodeId?: string;
      sourcePortIdx?: number;
      nodeRelation?: AddNodeCommand.NodeRelationEnum;
      /**
       * 'new-only' clears the active selection and selects only the new node
       * 'add' adds the new node to the active selection
       * 'none' doesn't modify the active selection nor it selects the new node
       */
      selectionMode?: "new-only" | "add" | "none";
      isComponent?: boolean;
    }): Promise<{
      newNodeId?: string | null;
      problem?: {
        type: "error" | "warning";
        headline: string;
        message: string;
      };
    }> {
      const { projectId, workflowId } =
        useWorkflowStore().getProjectAndWorkflowIds;

      // Adjusted For Grid Snapping
      const gridAdjustedPosition = {
        x: geometry.utils.snapToGrid(position.x),
        y: geometry.utils.snapToGrid(position.y),
      };

      let newNodeId: string | null;
      if (isComponent && spaceItemReference) {
        if (isBrowser()) {
          try {
            const result = await API.workflowCommand.AddComponent({
              projectId,
              workflowId,
              providerId: spaceItemReference.providerId,
              position: {
                x: gridAdjustedPosition.x,
                y: gridAdjustedPosition.y,
              },
              spaceId: spaceItemReference.spaceId,
              itemId: spaceItemReference.itemId,
            });
            // TODO re-visit with NXT-3471
            newNodeId = result.newPlaceholderId;
          } catch (error) {
            // TODO re-visit with NXT-3471
            return {
              problem: {
                type: "error",
                headline: "Failed to add component",
                message: (error as Error).message,
              },
            };
          }
        } else {
          // TODO remove with NXT-3389
          newNodeId = await API.desktop.importComponent({
            projectId,
            workflowId,
            x: gridAdjustedPosition.x,
            y: gridAdjustedPosition.y,
            spaceProviderId: spaceItemReference.providerId,
            spaceId: spaceItemReference.spaceId,
            itemId: spaceItemReference.itemId,
          });
        }
      } else {
        const result = await API.workflowCommand.AddNode({
          projectId,
          workflowId,
          position: gridAdjustedPosition,
          nodeFactory,
          spaceItemReference,
          sourceNodeId,
          sourcePortIdx,
          nodeRelation,
        });
        newNodeId = result.newNodeId;
      }

      if (!newNodeId) {
        return {};
      }

      if (selectionMode !== "none") {
        if (selectionMode === "new-only") {
          useSelectionStore().selectSingleObject({
            type: "node",
            id: newNodeId,
          });
        } else {
          useSelectionStore().selectNode(newNodeId);
        }
      }

      return { newNodeId };
    },

    replaceNode({
      targetNodeId,
      replacementNodeId,
      nodeFactory,
    }: {
      targetNodeId: string;
      replacementNodeId?: string;
      nodeFactory?: NodeFactoryKey;
    }) {
      const { projectId, workflowId } =
        useWorkflowStore().getProjectAndWorkflowIds;

      return API.workflowCommand.ReplaceNode({
        projectId,
        workflowId,
        targetNodeId,
        replacementNodeId,
        nodeFactory,
      });
    },

    insertNode({
      connectionId,
      position,
      nodeFactory,
      nodeId,
    }: {
      connectionId: string;
      position: XY;
      nodeFactory?: NodeFactoryKey;
      nodeId?: string;
    }) {
      const projectId = useWorkflowStore().activeWorkflow!.projectId;
      const workflowId = useWorkflowStore().activeWorkflow!.info.containerId;

      return API.workflowCommand.InsertNode({
        projectId,
        workflowId,
        connectionId,
        position,
        nodeFactory,
        nodeId,
      });
    },

    addNodePort({
      nodeId,
      side,
      portGroup,
      typeId,
    }: {
      nodeId: string;
      side: "input" | "output";
      portGroup?: string;
      typeId: string;
    }) {
      const { projectId, workflowId } =
        useWorkflowStore().getProjectAndWorkflowIds;

      return API.workflowCommand.AddPort({
        projectId,
        workflowId,
        nodeId,
        side: side as PortCommand.SideEnum,
        portGroup,
        portTypeId: typeId,
      });
    },

    removeNodePort({
      nodeId,
      side,
      index,
      portGroup,
    }: {
      nodeId: string;
      side: "input" | "output";
      index: number;
      portGroup: string;
    }) {
      const { projectId, workflowId } =
        useWorkflowStore().getProjectAndWorkflowIds;

      return API.workflowCommand.RemovePort({
        projectId,
        workflowId,
        nodeId,
        side: side as PortCommand.SideEnum,
        portGroup,
        portIndex: index,
      });
    },
  },

  getters: {
    getNodeTemplateProperty:
      () =>
      ({
        nodeId,
        property,
      }: {
        nodeId: string;
        property: "name" | "icon" | "type" | "nodeFactory";
      }) => {
        const node = useWorkflowStore().activeWorkflow!.nodes[nodeId];

        // These nodeTemplates are not to be confused with the ones from the
        // `nodeTemplates` store module. Because these do not contain port information
        // and also only refer to the data of the current workflow level
        const nodeTemplates = useWorkflowStore().activeWorkflow!.nodeTemplates;

        if (isNativeNode(node)) {
          const { templateId } = node;

          return nodeTemplates[templateId][property];
        }

        // @ts-ignore - TODO: NXT-2023 component is not inheriting properties correctly. Type narrowing
        // can be improved here once NativeNode, ComponentNode and MetaNode types are generated correctly
        return node[property];
      },

    isNodeConnected: () => (nodeId: string) => {
      let connection: Connection;

      const currentConnections = useWorkflowStore().activeWorkflow!.connections;

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

    getNodeById: () => (nodeId: string) =>
      useWorkflowStore().activeWorkflow?.nodes[nodeId] || null,

    getNodeIcon() {
      return (nodeId: string) => {
        return this.getNodeTemplateProperty({
          nodeId,
          property: "icon",
        });
      };
    },

    getNodeName() {
      return (nodeId: string) => {
        return this.getNodeTemplateProperty({
          nodeId,
          property: "name",
        });
      };
    },

    getNodeFactory() {
      return (nodeId: string) => {
        return this.getNodeTemplateProperty({
          nodeId,
          property: "nodeFactory",
        });
      };
    },

    getNodeType() {
      return (nodeId: string) => {
        return this.getNodeTemplateProperty({
          nodeId,
          property: "type",
        });
      };
    },
  },
});
