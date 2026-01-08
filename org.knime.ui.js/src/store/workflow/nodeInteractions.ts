/* eslint-disable no-undefined */
import { ref } from "vue";
import { API } from "@api";
import { defineStore } from "pinia";

import {
  AddNodeCommand,
  type Connection,
  NativeNodeInvariants,
  type NodeFactoryKey,
  type PortCommand,
  type SpaceItemReference,
  type XY,
} from "@/api/gateway-api/generated-api";
import { isDesktop } from "@/environment";
import { gridSize } from "@/style/shapes";
import { geometry } from "@/util/geometry";
import { isNativeNode } from "@/util/nodeUtil";
import { useSVGCanvasStore } from "../canvas/canvas-svg";
import { usePanelStore } from "../panel";
import { useSelectionStore } from "../selection";
import { useSpaceProvidersStore } from "../spaces/providers";
import { useSpaceOperationsStore } from "../spaces/spaceOperations";

import { useConnectionInteractionsStore } from "./connectionInteractions";
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

  const getNodeName = (nodeId: string): string => {
    return getNodeTemplateProperty({
      nodeId,
      property: "name",
    });
  };

  const getNodeFactory = (nodeId: string): NodeFactoryKey => {
    return getNodeTemplateProperty({
      nodeId,
      property: "nodeFactory",
    });
  };

  const getNodeType = (nodeId: string): NativeNodeInvariants.TypeEnum => {
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

  type NodeAutoConnectOptions = {
    autoConnectOptions?: {
      sourceNodeId: string;
      nodeRelation: AddNodeCommand.NodeRelationEnum;
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

  type AddNodeParams = NodeAutoConnectOptions &
    SelectionModeParams & {
      position: XY;
      nodeFactory: NodeFactoryKey;
      spaceItemReference?: SpaceItemReference;
    };

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
      x: geometry.snapToGrid(position.x, gridSize.x),
      y: geometry.snapToGrid(position.y, gridSize.y),
    };

    const { newNodeId } = await API.workflowCommand.AddNode({
      projectId,
      workflowId,
      position: gridAdjustedPosition,
      nodeFactory,
      spaceItemReference,
      sourceNodeId: autoConnectOptions?.sourceNodeId,
      sourcePortIdx: autoConnectOptions?.sourcePortIdx,
      nodeRelation: autoConnectOptions?.nodeRelation,
    });

    if (!newNodeId) {
      return { newNodeId: null };
    }

    handleSelectionForNewNode(selectionMode, newNodeId);

    return { newNodeId };
  };

  type ImportComponentNodeParams = SelectionModeParams & {
    position: XY;
    spaceItemReference: SpaceItemReference;
    componentName: string;
  };

  /**
   * Imports a component from the space explorer using its full SpaceItemReference
   */
  const importComponentNode = async ({
    position,
    spaceItemReference,
    componentName,
    selectionMode = "new-only",
  }: ImportComponentNodeParams): Promise<{ newNodeId: string | null }> => {
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
      x: geometry.snapToGrid(position.x, gridSize.x),
      y: geometry.snapToGrid(position.y, gridSize.y),
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
    });

    useSVGCanvasStore().focus();
    selectionStore.selectComponentPlaceholder(
      componentPlaceholder.newPlaceholderId,
    );

    return { newNodeId: null };
  };

  type ComponentAutoConnectOptions = {
    autoConnectOptions?: {
      targetNodeId: string;
      targetNodePortIdx?: number;
      nodeRelation: AddNodeCommand.NodeRelationEnum;
    };
  };

  type InsertionOptions = {
    insertionOptions?: {
      connectionId: string;
    };
  };

  type ReplacementOptions = {
    replacementOptions?: {
      targetNodeId: string;
    };
  };

  type AddComponentNodeParams = {
    componentIdInHub: string;
    componentName: string;
  } & (
    | { mode?: "default"; position: XY }
    | (Required<ComponentAutoConnectOptions> & {
        mode: "add-autoconnect";
        position: XY;
      })
    | (Required<InsertionOptions> & {
        mode: "insert-on-connection";
        position: XY;
      })
    | (Required<ReplacementOptions> & { mode: "replace-node" })
  );

  const addComponentNode = async (
    params: AddComponentNodeParams,
  ): Promise<{ newNodeId: string | null }> => {
    if (isDesktop()) {
      throw new Error("This action is not supported in desktop AP");
    }

    const { componentIdInHub, componentName } = params;

    // do not try to add a node to a read only workflow
    if (!workflowStore.isWritable) {
      return { newNodeId: null };
    }

    const selectionStore = useSelectionStore();
    const { wasAborted } = await selectionStore.tryClearSelection();
    if (wasAborted) {
      return { newNodeId: null };
    }

    const { projectId, workflowId } = workflowStore.getProjectAndWorkflowIds;

    const position = (() => {
      // replace node mode doesn't need a position, but the wf command still
      // requires it
      if (params.mode === "replace-node") {
        return { x: 0, y: 0 };
      }

      // Adjusted For Grid Snapping
      const gridAdjustedPosition = {
        x: geometry.snapToGrid(params.position.x, gridSize.x),
        y: geometry.snapToGrid(params.position.y, gridSize.y),
      };

      return gridAdjustedPosition;
    })();

    const { spaceProviders } = useSpaceProvidersStore();
    const firstProvider = Object.values(spaceProviders)[0];

    if (!firstProvider) {
      consola.error(
        "Unexpected error. No providers where found to add a component",
      );
      return { newNodeId: null };
    }

    const autoConnectOptions =
      params.mode === "add-autoconnect" ? params.autoConnectOptions : undefined;

    const insertionOptions =
      params.mode === "insert-on-connection"
        ? params.insertionOptions
        : undefined;

    const replacementOptions =
      params.mode === "replace-node" ? params.replacementOptions : undefined;

    // needs to be before focus() to not set focus back to space explorer items
    useSpaceOperationsStore().setCurrentSelectedItemIds([]);
    const componentPlaceholder = await API.workflowCommand.AddComponent({
      projectId,
      workflowId,
      providerId: firstProvider.id,
      position,
      itemId: componentIdInHub,
      name: componentName,
      autoConnectOptions,
      insertionOptions,
      replacementOptions,
    });

    if (autoConnectOptions) {
      const connectionInteractionStore = useConnectionInteractionsStore();
      connectionInteractionStore.addComponentPlaceholderConnection(
        {
          nodeId: autoConnectOptions.targetNodeId,
          portIndex: autoConnectOptions.targetNodePortIdx ?? 1,
          type: autoConnectOptions.nodeRelation,
        },
        componentPlaceholder.newPlaceholderId,
      );
    }

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
    importComponentNode,
    addComponentNode,
    replaceNode,
    insertNode,
    addNodePort,
    removeNodePort,
    updatePosition,
  };
});
