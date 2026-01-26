import { ref } from "vue";
import { API } from "@api";
import { defineStore } from "pinia";

import type {
  AddComponentCommand,
  AddNodeCommand,
  Connection,
  NodeFactoryKey,
  PortCommand,
  SpaceItemReference,
  XY,
} from "@/api/gateway-api/generated-api";
import type { NodeRelation } from "@/api/custom-types";
import { isDesktop } from "@/environment";
import { geometry } from "@/util/geometry";
import { isNativeNode } from "@/util/nodeUtil";
import { useSVGCanvasStore } from "../canvas/canvas-svg";
import { usePanelStore } from "../panel";
import { useSelectionStore } from "../selection";
import { useSpaceProvidersStore } from "../spaces/providers";
import { useSpaceOperationsStore } from "../spaces/spaceOperations";

import { useMovingStore } from "./moving";
import { useWorkflowStore } from "./workflow";

export const useNodeInteractionsStore = defineStore("nodeInteractions", () => {
  const nameEditorNodeId = ref<string | null>(null);
  const nameEditorDimensions = ref<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const labelEditorNodeId = ref<string | null>(null);
  const replacementOperation = ref<{
    type: "node" | "connection";
    candidateId: string;
  } | null>();

  const openNameEditor = (nodeId: string) => {
    nameEditorNodeId.value = nodeId;
  };

  const closeNameEditor = () => {
    nameEditorNodeId.value = null;
    nameEditorDimensions.value = { width: 0, height: 0 };
  };

  const openLabelEditor = (nodeId: string) => {
    labelEditorNodeId.value = nodeId;
  };

  const closeLabelEditor = () => {
    labelEditorNodeId.value = null;
  };

  const workflowStore = useWorkflowStore();

  const getNodeTemplateProperty = ({
    nodeId,
    property,
  }: {
    nodeId: string;
    property: "name" | "icon" | "type" | "nodeFactory";
  }) => {
    const node = workflowStore.activeWorkflow!.nodes[nodeId];

    // These nodeTemplates are not to be confused with the ones from the
    // `nodeTemplates` store module. Because these do not contain port information
    // and also only refer to the data of the current workflow level
    const nodeTemplates = workflowStore.activeWorkflow!.nodeTemplates;

    if (isNativeNode(node)) {
      const { templateId } = node;

      return nodeTemplates[templateId][property];
    }

    return node[property];
  };

  const isNodeConnected = (nodeId: string) => {
    let connection: Connection;

    const currentConnections = workflowStore.activeWorkflow!.connections;

    for (const connectionID in currentConnections) {
      connection = currentConnections[connectionID];
      if (connection.destNode === nodeId || connection.sourceNode === nodeId) {
        return true;
      }
    }

    return false;
  };

  const getNodeById = (nodeId: string) =>
    workflowStore.activeWorkflow?.nodes[nodeId] || null;

  const getNodeIcon = (nodeId: string) => {
    return getNodeTemplateProperty({
      nodeId,
      property: "icon",
    });
  };

  const getNodeName = (nodeId: string) => {
    return getNodeTemplateProperty({
      nodeId,
      property: "name",
    });
  };

  const getNodeFactory = (nodeId: string) => {
    return getNodeTemplateProperty({
      nodeId,
      property: "nodeFactory",
    });
  };

  const getNodeType = (nodeId: string) => {
    return getNodeTemplateProperty({
      nodeId,
      property: "type",
    });
  };

  const connectNodes = ({
    sourceNode,
    sourcePort,
    destNode,
    destPort,
  }: {
    sourceNode: string;
    sourcePort: number;
    destNode: string;
    destPort: number;
  }) => {
    const { projectId, workflowId } = workflowStore.getProjectAndWorkflowIds;

    return API.workflowCommand.Connect({
      projectId,
      workflowId,
      sourceNodeId: sourceNode,
      sourcePortIdx: sourcePort,
      destinationNodeId: destNode,
      destinationPortIdx: destPort,
    });
  };

  const renameContainerNode = ({
    nodeId,
    name,
  }: {
    nodeId: string;
    name: string;
  }) => {
    const { projectId, workflowId } = workflowStore.getProjectAndWorkflowIds;
    return API.workflowCommand.UpdateComponentOrMetanodeName({
      projectId,
      workflowId,
      nodeId,
      name,
    });
  };

  const renameNodeLabel = ({
    nodeId,
    label,
  }: {
    nodeId: string;
    label: string;
  }) => {
    const { projectId, workflowId } = workflowStore.getProjectAndWorkflowIds;
    return API.workflowCommand.UpdateNodeLabel({
      projectId,
      workflowId,
      nodeId,
      label,
    });
  };

  type AutoConnectParams = {
    autoConnectOptions?: {
      sourceNodeId: string;
      nodeRelation: NodeRelation;
      sourcePortIdx?: number;
    };
  };

  type SelectionModeAfterAdd = "new-only" | "none";
  type SelectionModeParams = {
    /**
     * 'new-only' clears the active selection and selects only the new node
     * 'none' doesn't modify the active selection nor selects the new node
     */
    selectionMode?: SelectionModeAfterAdd;
  };

  const handleSelectionForNewNode = (
    selectionMode: SelectionModeAfterAdd,
    newNodeId: string,
  ) => {
    const selectionStore = useSelectionStore();
    const currentSelection = selectionStore.selectedNodeIds;

    if (selectionMode !== "none") {
      if (selectionMode === "new-only") {
        selectionStore.selectNodes([newNodeId]);
        usePanelStore().isRightPanelExpanded = true;
      } else {
        selectionStore.selectNodes([...currentSelection, newNodeId]);
      }
    }
  };

  type AddNodeParams = AutoConnectParams &
    SelectionModeParams & {
      position: XY;
    } & ( // you can either add via a nodeFactory or a spaceItem reference; not both
      | {
          nodeFactory: NodeFactoryKey;
          spaceItemReference?: never;
        }
      | {
          nodeFactory?: never;
          spaceItemReference: SpaceItemReference;
        }
    );

  const addNativeNode = async ({
    position,
    nodeFactory,
    spaceItemReference,
    autoConnectOptions,
    selectionMode = "new-only",
  }: AddNodeParams): Promise<{ newNodeId: string | null }> => {
    // do not try to add a node to a read only workflow
    if (!workflowStore.isWritable) {
      return { newNodeId: null };
    }

    const selectionStore = useSelectionStore();
    if (selectionMode !== "none") {
      const { wasAborted } = await selectionStore.tryClearSelection();
      if (wasAborted) {
        return { newNodeId: null };
      }
    }

    const { projectId, workflowId } = workflowStore.getProjectAndWorkflowIds;

    // Adjusted For Grid Snapping
    const gridAdjustedPosition = {
      x: geometry.utils.snapToGrid(position.x),
      y: geometry.utils.snapToGrid(position.y),
    };

    const { newNodeId } = await API.workflowCommand.AddNode({
      projectId,
      workflowId,
      position: gridAdjustedPosition,
      nodeFactory,
      spaceItemReference,
      sourceNodeId: autoConnectOptions?.sourceNodeId,
      sourcePortIdx: autoConnectOptions?.sourcePortIdx,
      nodeRelation: autoConnectOptions?.nodeRelation as
        | AddNodeCommand.NodeRelationEnum
        | undefined,
    });

    if (!newNodeId) {
      return { newNodeId: null };
    }

    handleSelectionForNewNode(selectionMode, newNodeId);

    return { newNodeId };
  };

  type AddComponentParams = SelectionModeParams & {
    position: XY;
    spaceItemReference: SpaceItemReference;
    componentName: string;
  };

  const addComponentNode = async ({
    position,
    spaceItemReference,
    componentName,
    selectionMode = "new-only",
  }: AddComponentParams): Promise<{ newNodeId: string | null }> => {
    // do not try to add a node to a read only workflow
    if (!workflowStore.isWritable) {
      return { newNodeId: null };
    }

    const selectionStore = useSelectionStore();
    if (selectionMode !== "none") {
      const { wasAborted } = await selectionStore.tryClearSelection();
      if (wasAborted) {
        return { newNodeId: null };
      }
    }

    const { projectId, workflowId } = workflowStore.getProjectAndWorkflowIds;

    // Adjusted For Grid Snapping
    const gridAdjustedPosition = {
      x: geometry.utils.snapToGrid(position.x),
      y: geometry.utils.snapToGrid(position.y),
    };

    if (isDesktop()) {
      // TODO remove with NXT-3389
      const newNodeId = await API.desktop.importComponent({
        projectId,
        workflowId,
        x: gridAdjustedPosition.x,
        y: gridAdjustedPosition.y,
        spaceProviderId: spaceItemReference.providerId,
        spaceId: spaceItemReference.spaceId,
        itemId: spaceItemReference.itemId,
      });

      if (newNodeId) {
        handleSelectionForNewNode(selectionMode, newNodeId);
      }

      return { newNodeId };
    }

    // needs to be before focus() to not set focus back to space explorer items
    useSpaceOperationsStore().setCurrentSelectedItemIds([]);
    const componentPlaceholder = await API.workflowCommand.AddComponent({
      projectId,
      workflowId,
      providerId: spaceItemReference.providerId,
      position: {
        x: gridAdjustedPosition.x,
        y: gridAdjustedPosition.y,
      },
      itemId: spaceItemReference.itemId,
      name: componentName,
      sourceNodeId: autoConnectOptions?.sourceNodeId,
      sourcePortIdx: autoConnectOptions?.sourcePortIdx,
      nodeRelation: autoConnectOptions?.nodeRelation as
        | AddComponentCommand.NodeRelationEnum
        | undefined,
    });

    useSVGCanvasStore().focus();
    selectionStore.selectComponentPlaceholder(
      componentPlaceholder.newPlaceholderId,
    );

    return { newNodeId: null };
  };

  const addComponentNodeFromMainHub = async ({
    position,
    componentIdInHub,
    componentName,
    autoConnectOptions,
    selectionMode = "new-only",
  }: AutoConnectParams &
    SelectionModeParams & {
      position: XY;
      componentIdInHub: string;
      componentName: string;
    }): Promise<{
    newNodeId: string | null;
  }> => {
    if (isDesktop()) {
      throw new Error("This action is not supported in desktop AP");
    }

    // do not try to add a node to a read only workflow
    if (!workflowStore.isWritable) {
      return { newNodeId: null };
    }

    const selectionStore = useSelectionStore();
    if (selectionMode !== "none") {
      const { wasAborted } = await selectionStore.tryClearSelection();
      if (wasAborted) {
        return { newNodeId: null };
      }
    }

    const { projectId, workflowId } = workflowStore.getProjectAndWorkflowIds;

    // Adjusted For Grid Snapping
    const gridAdjustedPosition = {
      x: geometry.utils.snapToGrid(position.x),
      y: geometry.utils.snapToGrid(position.y),
    };

    const { spaceProviders } = useSpaceProvidersStore();
    const firstProvider = Object.values(spaceProviders)[0];

    if (!firstProvider) {
      consola.error(
        "Unexpected error. No providers where found to add a component",
      );
      return { newNodeId: null };
    }

    // needs to be before focus() to not set focus back to space explorer items
    useSpaceOperationsStore().setCurrentSelectedItemIds([]);
    const componentPlaceholder = await API.workflowCommand.AddComponent({
      projectId,
      workflowId,
      providerId: firstProvider.id,
      position: {
        x: gridAdjustedPosition.x,
        y: gridAdjustedPosition.y,
      },
      itemId: componentIdInHub,
      name: componentName,
      sourceNodeId: autoConnectOptions?.sourceNodeId,
      sourcePortIdx: autoConnectOptions?.sourcePortIdx,
      nodeRelation: autoConnectOptions?.nodeRelation as
        | AddComponentCommand.NodeRelationEnum
        | undefined,
    });

    useSVGCanvasStore().focus();
    selectionStore.selectComponentPlaceholder(
      componentPlaceholder.newPlaceholderId,
    );

    return { newNodeId: null };
  };

  const replaceNode = async ({
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
  }) => {
    const { projectId, workflowId } = workflowStore.getProjectAndWorkflowIds;

    await API.workflowCommand.ReplaceNode({
      projectId,
      workflowId,
      targetNodeId,
      replacementNodeId,
      nodeFactory,
    });

    useMovingStore().resetDragState();
  };

  const insertNode = async ({
    connectionId,
    position,
    nodeFactory,
    nodeId,
  }: {
    connectionId: string;
    position: XY;
    nodeFactory?: NodeFactoryKey;
    nodeId?: string;
  }) => {
    const projectId = workflowStore.activeWorkflow!.projectId;
    const workflowId = workflowStore.activeWorkflow!.info.containerId;

    await API.workflowCommand.InsertNode({
      projectId,
      workflowId,
      connectionId,
      position,
      nodeFactory,
      nodeId,
    });

    useMovingStore().resetDragState();
  };

  const addNodePort = ({
    nodeId,
    side,
    portGroup,
    typeId,
  }: {
    nodeId: string;
    side: "input" | "output";
    portGroup?: string;
    typeId: string;
  }) => {
    const { projectId, workflowId } = workflowStore.getProjectAndWorkflowIds;

    return API.workflowCommand.AddPort({
      projectId,
      workflowId,
      nodeId,
      side: side as PortCommand.SideEnum,
      portGroup,
      portTypeId: typeId,
    });
  };

  const removeNodePort = ({
    nodeId,
    side,
    index,
  }: {
    nodeId: string;
    side: "input" | "output";
    index: number;
  }) => {
    const { projectId, workflowId } = workflowStore.getProjectAndWorkflowIds;

    return API.workflowCommand.RemovePort({
      projectId,
      workflowId,
      nodeId,
      side: side as PortCommand.SideEnum,
      portIndex: index,
    });
  };

  const updatePosition = (
    nodeId: string,
    position: XY,
    mode: "add" | "replace" = "replace",
  ) => {
    const { activeWorkflow } = workflowStore;

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
  };

  return {
    nameEditorNodeId,
    nameEditorDimensions,
    labelEditorNodeId,
    replacementOperation,

    openNameEditor,
    closeNameEditor,
    openLabelEditor,
    closeLabelEditor,

    isNodeConnected,
    getNodeById,
    getNodeIcon,
    getNodeName,
    getNodeFactory,
    getNodeType,

    connectNodes,
    renameContainerNode,
    renameNodeLabel,
    addNativeNode,
    addComponentNode,
    addComponentNodeFromMainHub,
    replaceNode,
    insertNode,
    addNodePort,
    removeNodePort,
    updatePosition,
  };
});
