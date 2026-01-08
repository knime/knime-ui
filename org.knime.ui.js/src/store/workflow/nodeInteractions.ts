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
import { gridSize } from "@/style/shapes";
import { geometry } from "@/util/geometry";
import { isNativeNode } from "@/util/nodeUtil";
import { useSVGCanvasStore } from "../canvas/canvas-svg";
import { usePanelStore } from "../panel";
import { useSpaceOperationsStore } from "../spaces/spaceOperations";

import { useMovingStore } from "./moving";
import { useWorkflowStore } from "./workflow";

type NodeInteractionsState = {
  nameEditorNodeId: string | null;
  nameEditorDimensions: { width: number; height: number };
  labelEditorNodeId: string | null;
  replacementOperation: {
    type: "node" | "connection";
    candidateId: string;
  } | null;
};

export const useNodeInteractionsStore = defineStore("nodeInteractions", {
  state: (): NodeInteractionsState => ({
    nameEditorNodeId: null,
    nameEditorDimensions: { width: 0, height: 0 },
    labelEditorNodeId: null,
    replacementOperation: null,
  }),
  actions: {
    openNameEditor(nodeId: string) {
      this.nameEditorNodeId = nodeId;
    },

    closeNameEditor() {
      this.nameEditorNodeId = null;
      this.nameEditorDimensions = { width: 0, height: 0 };
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

    // TODO NXT-3668 reduce complexity
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
      componentName,
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
       * 'none' doesn't modify the active selection nor selects the new node
       */
      selectionMode?: "new-only" | "add" | "none";
      /**
       * The name of the component, iff the object to be added is a component
       */
      componentName?: string;
    }): Promise<{
      newNodeId?: string | null;
      problem?: {
        type: "error" | "warning";
        headline: string;
        message: string;
      };
    }> {
      const selectionStore = useSelectionStore();
      const currentSelection = selectionStore.selectedNodeIds;
      if (selectionMode !== "none") {
        const { wasAborted } = await selectionStore.tryClearSelection();
        if (wasAborted) {
          return {};
        }
      }

      const { projectId, workflowId } =
        useWorkflowStore().getProjectAndWorkflowIds;

      // Adjusted For Grid Snapping
      const gridAdjustedPosition = {
        x: geometry.snapToGrid(position.x, gridSize.x),
        y: geometry.snapToGrid(position.y, gridSize.y),
      };

      let newNodeId: string | null;
      if (componentName && spaceItemReference) {
        if (isBrowser()) {
          // needs to be before focus() to not set focus back to space explorer items
          useSpaceOperationsStore().setCurrentSelectedItemIds([]);
          try {
            const componentPlaceholder = await API.workflowCommand.AddComponent(
              {
                projectId,
                workflowId,
                providerId: spaceItemReference.providerId,
                position: {
                  x: gridAdjustedPosition.x,
                  y: gridAdjustedPosition.y,
                },
                spaceId: spaceItemReference.spaceId,
                itemId: spaceItemReference.itemId,
                name: componentName,
              },
            );
            newNodeId = null;

            useSVGCanvasStore().focus();
            useSelectionStore().selectComponentPlaceholder(
              componentPlaceholder.newPlaceholderId,
            );
          } catch (error) {
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
          await selectionStore.selectNodes([newNodeId]);
          usePanelStore().isRightPanelExpanded = true;
        } else {
          await selectionStore.selectNodes([...currentSelection, newNodeId]);
        }
      }

      return { newNodeId };
    },

    async replaceNode({
      targetNodeId,
      replacementNodeId,
      nodeFactory,
    }: {
      /**
       * Node to be replaced
       */
      targetNodeId: string;
      /**
       * When defined, this refers to the node id in the canvas that will
       * be the replacement
       */
      replacementNodeId?: string;
      /**
       * When defined, this refers to the node template factory which will
       * instantiate a new node to replace one in the canvas. This is used when
       * dragging from the node repository
       */
      nodeFactory?: NodeFactoryKey;
    }) {
      const { projectId, workflowId } =
        useWorkflowStore().getProjectAndWorkflowIds;

      await API.workflowCommand.ReplaceNode({
        projectId,
        workflowId,
        targetNodeId,
        replacementNodeId,
        nodeFactory,
      });

      useMovingStore().resetDragState();
    },

    async insertNode({
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

      await API.workflowCommand.InsertNode({
        projectId,
        workflowId,
        connectionId,
        position,
        nodeFactory,
        nodeId,
      });

      useMovingStore().resetDragState();
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
    }: {
      nodeId: string;
      side: "input" | "output";
      index: number;
    }) {
      const { projectId, workflowId } =
        useWorkflowStore().getProjectAndWorkflowIds;

      return API.workflowCommand.RemovePort({
        projectId,
        workflowId,
        nodeId,
        side: side as PortCommand.SideEnum,
        portIndex: index,
      });
    },

    updatePosition(
      nodeId: string,
      position: XY,
      mode: "add" | "replace" = "replace",
    ) {
      const { activeWorkflow } = useWorkflowStore();

      if (!activeWorkflow) {
        return;
      }

      if (!activeWorkflow.nodes[nodeId]) {
        consola.error(
          "nodeInteraction:: Cannot apply position update, node is invalid",
        );
        return;
      }

      if (mode === "add") {
        activeWorkflow.nodes[nodeId].position.x += position.x;
        activeWorkflow.nodes[nodeId].position.y += position.y;
      } else {
        activeWorkflow.nodes[nodeId].position.x = position.x;
        activeWorkflow.nodes[nodeId].position.y = position.y;
      }
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
