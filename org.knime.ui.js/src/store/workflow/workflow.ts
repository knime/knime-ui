/* eslint-disable no-undefined */
import { API } from "@api";
import { defineStore } from "pinia";

import type { KnimeNode, Workflow, WorkflowObject } from "@/api/custom-types";
import {
  AlignNodesCommand,
  type Bounds,
  CollapseCommand,
  type Connection,
  EditableMetadata,
  type Link,
  PortCommand,
  TransformMetanodePortsBarCommand,
  TypedText,
  UpdateComponentMetadataCommand,
  WorkflowInfo,
} from "@/api/gateway-api/generated-api";
import type { TooltipDefinition } from "@/components/workflowEditor/types";
import { useConfirmDialog } from "@/composables/useConfirmDialog";
import { useAIAssistantStore } from "@/store/aiAssistant";
import { useSelectionStore } from "@/store/selection";
import { useUIControlsStore } from "@/store/uiControls/uiControls";
import { geometry } from "@/util/geometry";
import { getPortContext } from "@/util/portSelection";
import { actions as jsonPatchActions } from "../json-patch/json-patch";

import { useNodeInteractionsStore } from "./nodeInteractions";

const { show: showConfirmDialog } = useConfirmDialog();

/**
 * The workflow store holds a workflow graph and the associated tooltips.
 * The store is split up into several files.
 *
 * A workflow can either be contained in a component / metanode, or it can be the top level workflow.
 * Note that the notion of "workflow" is different from what users call a "KNIME workflow".
 * The technical term for the latter in this application is "project".
 */
export interface WorkflowState {
  activeWorkflow: Workflow | null;
  activeSnapshotId: string | null;
  tooltip: TooltipDefinition | null;

  calculatedMetanodePortBarBounds: {
    in: Bounds | null;
    out: Bounds | null;
  };

  error: Error | null;
}

export const useWorkflowStore = defineStore("workflow", {
  state: (): WorkflowState => ({
    activeWorkflow: null,
    activeSnapshotId: null,
    tooltip: null,
    calculatedMetanodePortBarBounds: { in: null, out: null },
    error: null,
  }),
  actions: {
    ...jsonPatchActions,

    setActiveWorkflow(workflow: Workflow | null) {
      this.activeWorkflow = workflow;
    },

    setActiveSnapshotId(id: string) {
      this.activeSnapshotId = id;
    },

    setTooltip(tooltip: TooltipDefinition | null) {
      this.tooltip = tooltip;
    },

    setWorkflowLoadingError(error: Error | null) {
      this.error = error;
    },

    setCalculatedMetanodePortBarBounds(bounds: { in: Bounds; out: Bounds }) {
      this.calculatedMetanodePortBarBounds = bounds;
    },

    undo() {
      const { projectId, workflowId } = this.getProjectAndWorkflowIds;
      return API.workflow.undoWorkflowCommand({ projectId, workflowId });
    },

    redo() {
      const { projectId, workflowId } = this.getProjectAndWorkflowIds;
      return API.workflow.redoWorkflowCommand({ projectId, workflowId });
    },
    /**
     * Deletes all selected objects and displays an error message for the objects, that cannot be deleted.
     * If the objects can be deleted a deselect event is fired.
     */
    async deleteSelectedObjects() {
      const selectionStore = useSelectionStore();
      const { projectId, workflowId } = this.getProjectAndWorkflowIds;
      const selectedNodes: KnimeNode[] = selectionStore.getSelectedNodes;
      const selectedConnections: Connection[] =
        selectionStore.getSelectedConnections;
      const selectedAnnotationIds: string[] =
        selectionStore.selectedAnnotationIds;
      const connectionBendpoints: Record<string, number[]> =
        selectionStore.getSelectedBendpoints;

      const deletableNodeIds = selectedNodes
        .filter((node) => node.allowedActions?.canDelete)
        .map((node) => node.id);

      const nonDeletableNodeIds = selectedNodes
        .filter((node) => !node.allowedActions?.canDelete)
        .map((node) => node.id);

      const deletableConnectionIds = selectedConnections
        .filter((connection) => connection.allowedActions?.canDelete)
        .map((connection) => connection.id);

      const nonDeletableConnectionIds = selectedConnections
        .filter((connection) => !connection.allowedActions?.canDelete)
        .map((connection) => connection.id);

      const deleteableBendpoints = Object.keys(connectionBendpoints).reduce(
        (acc, connectionId) => {
          const connection = this.activeWorkflow!.connections[connectionId];
          return connection.allowedActions?.canDelete
            ? {
                ...acc,
                [connectionId]: connectionBendpoints[connectionId],
              }
            : acc;
        },
        {},
      );
      const hasBendpointsToDelete =
        Object.keys(deleteableBendpoints).length > 0;

      if (
        deletableNodeIds.length ||
        deletableConnectionIds.length ||
        selectedAnnotationIds.length ||
        hasBendpointsToDelete
      ) {
        await API.workflowCommand.Delete({
          projectId,
          workflowId,
          nodeIds: deletableNodeIds.length ? deletableNodeIds : [],
          connectionIds: deletableConnectionIds.length
            ? deletableConnectionIds
            : [],
          annotationIds: selectedAnnotationIds.length
            ? selectedAnnotationIds
            : [],
          connectionBendpoints: deleteableBendpoints,
        });

        selectionStore.deselectAllObjects();
      }

      const messages: string[] = [];
      if (nonDeletableNodeIds.length) {
        messages.push(
          `The following nodes can’t be deleted: [${nonDeletableNodeIds.join(
            ", ",
          )}]`,
        );
      }

      if (nonDeletableConnectionIds.length) {
        messages.push(
          `The following connections can’t be deleted: [${nonDeletableConnectionIds.join(
            ", ",
          )}]`,
        );
      }

      if (messages.length) {
        window.alert(messages.join(" \n"));
      }
    },

    async deleteSelectedPort() {
      const selectionStore = useSelectionStore();
      const { selectedPort, nodeId } = useSelectionStore().activeNodePorts;

      const node = useNodeInteractionsStore().getNodeById(nodeId ?? "");

      if (!node || !nodeId) {
        return;
      }

      if (
        !selectedPort ||
        selectionStore.activeNodePorts.isModificationInProgress
      ) {
        return;
      }

      const { side, index, sidePorts, isAddPort } = getPortContext(
        node,
        selectedPort,
      );

      if (isAddPort || !sidePorts[index].canRemove) {
        return;
      }

      selectionStore.updateActiveNodePorts({
        isModificationInProgress: true,
      });

      const isLastSideport = index === sidePorts.length - 1;
      await useNodeInteractionsStore()
        .removeNodePort({
          nodeId,
          side: side as PortCommand.SideEnum,
          index,
        })
        .then(() => {
          if (isLastSideport) {
            const minIndex = node.kind === "metanode" ? 0 : 1;
            if (index - 1 >= minIndex) {
              selectionStore.updateActiveNodePorts({
                selectedPort: `${side}-${index - 1}`,
              });
            } else {
              selectionStore.updateActiveNodePorts({
                nodeId: null,
                selectedPort: null,
              });
            }
          }
        })

        .finally(() => {
          selectionStore.updateActiveNodePorts({
            isModificationInProgress: false,
          });
        });
    },

    async collapseToContainer({
      containerType,
    }: {
      containerType: CollapseCommand.ContainerTypeEnum;
    }) {
      const selectionStore = useSelectionStore();
      const { projectId, workflowId } = this.getProjectAndWorkflowIds;
      const selectedNodeIds: string[] = selectionStore.selectedNodeIds;
      const selectedNodes: KnimeNode[] = selectionStore.getSelectedNodes;
      const selectedAnnotationIds: string[] =
        selectionStore.selectedAnnotationIds;
      const connectionBendpoints: Record<string, number[]> =
        selectionStore.getSelectedBendpoints;

      const isResetRequired = selectedNodes.some(
        (node) => node.allowedActions?.canCollapse === "resetRequired",
      );

      if (isResetRequired) {
        const { confirmed } = await showConfirmDialog({
          title: "Confirm action",
          message: `Creating this ${containerType} will reset executed nodes.`,
          buttons: [
            { type: "cancel", label: "Cancel" },
            { type: "confirm", label: "Confirm", flushRight: true },
          ],
        });
        if (!confirmed) {
          return;
        }
      }

      // 1. deselect all objects
      selectionStore.deselectAllObjects();

      // 2. send request
      const { newNodeId } = await API.workflowCommand.Collapse({
        containerType,
        projectId,
        workflowId,
        nodeIds: selectedNodeIds,
        annotationIds: selectedAnnotationIds,
        connectionBendpoints,
      });

      // 3. select new container node, if user hasn't selected something else in the meantime
      if (selectionStore.isSelectionEmpty) {
        selectionStore.selectNode(newNodeId);
        useNodeInteractionsStore().openNameEditor(newNodeId);
      }
    },

    async expandContainerNode() {
      const selectionStore = useSelectionStore();
      const { projectId, workflowId } = this.getProjectAndWorkflowIds;
      const selectedNode = selectionStore.singleSelectedNode;

      if (!selectedNode) {
        return;
      }

      if (selectedNode.allowedActions?.canExpand === "resetRequired") {
        const { confirmed } = await showConfirmDialog({
          title: "Confirm action",
          message: `Expanding this ${selectedNode.kind} will reset executed nodes.`,
          buttons: [
            { type: "cancel", label: "Cancel" },
            { type: "confirm", label: "Confirm", flushRight: true },
          ],
        });
        if (!confirmed) {
          return;
        }
      }

      // 1. deselect all objects
      selectionStore.deselectAllObjects();

      // 2. send request
      const { expandedNodeIds, expandedAnnotationIds } =
        await API.workflowCommand.Expand({
          projectId,
          workflowId,
          nodeId: selectedNode.id,
        });

      // 3. select expanded nodes, if user hasn't selected something else in the meantime
      if (selectionStore.isSelectionEmpty) {
        selectionStore.selectNodes(expandedNodeIds);
        selectionStore.selectAnnotations(expandedAnnotationIds);
      }
    },

    /** Calls the API */
    transformMetaNodePortBar({
      bounds,
      type,
    }: {
      bounds: Bounds;
      type: "in" | "out";
    }) {
      const { projectId, workflowId } = this.getProjectAndWorkflowIds;

      return API.workflowCommand.TransformMetanodePortsBar({
        projectId,
        workflowId,
        type: type as TransformMetanodePortsBarCommand.TypeEnum,
        bounds,
      });
    },

    async updateComponentMetadata({
      projectId,
      workflowId,
      description,
      type,
      icon,
      inPorts,
      outPorts,
      links,
      tags,
    }: {
      projectId: string;
      workflowId: string;
      description: TypedText;
      type: string | null;
      icon: string | null;
      inPorts: UpdateComponentMetadataCommand["inPorts"];
      outPorts: UpdateComponentMetadataCommand["outPorts"];
      links: Link[];
      tags: string[];
    }) {
      await API.workflowCommand.UpdateComponentMetadata({
        projectId,
        workflowId,
        // TODO: NXT-2023: remove when types are correctly generated
        // @ts-expect-error (please add error description)
        description,
        type: (type as UpdateComponentMetadataCommand.TypeEnum) ?? undefined,
        metadataType: EditableMetadata.MetadataTypeEnum.Component,
        icon: icon ?? undefined,
        inPorts,
        outPorts,
        links,
        tags,
      });
    },

    async updateWorkflowMetadata({
      projectId,
      workflowId,
      description,
      tags,
      links,
    }: {
      projectId: string;
      workflowId: string;
      description: TypedText;
      tags: string[];
      links: Link[];
    }) {
      await API.workflowCommand.UpdateProjectMetadata({
        projectId,
        workflowId,
        // TODO: NXT-2023: remove when types are correctly generated
        // @ts-expect-error (please add error description)
        metadataType: EditableMetadata.MetadataTypeEnum.Project,
        description,
        tags,
        links,
      });
    },
    async alignSelectedNodes(direction: AlignNodesCommand.DirectionEnum) {
      const selectionStore = useSelectionStore();
      const { projectId, workflowId } = this.getProjectAndWorkflowIds;
      const selectedNodes: KnimeNode[] = selectionStore.getSelectedNodes;

      await API.workflowCommand.AlignNodes({
        projectId,
        workflowId,
        direction,
        nodeIds: selectedNodes.map((sn) => sn.id),
      });
    },
  },
  getters: {
    getProjectAndWorkflowIds: (
      state,
    ): { projectId: string; workflowId: string } => {
      if (!state.activeWorkflow) {
        return { projectId: "", workflowId: "" };
      }

      const {
        projectId,
        info: { containerId },
      } = state.activeWorkflow;

      return { projectId, workflowId: containerId };
    },

    workflowObjects: (state): WorkflowObject[] => {
      if (!state.activeWorkflow) {
        return [];
      }

      const { nodes, workflowAnnotations } = state.activeWorkflow;

      const nodeObjects = Object.values(nodes).map(({ id, position }) => ({
        id,
        type: "node" as const,
        x: position.x,
        y: position.y,
      }));

      const annotationObjects = workflowAnnotations.map(({ id, bounds }) => ({
        id,
        type: "annotation" as const,
        x: bounds.x,
        y: bounds.y,
      }));

      return [...nodeObjects, ...annotationObjects];
    },

    /* Workflow is empty if it doesn't contain nodes */
    isWorkflowEmpty: (state): boolean => {
      const hasNodes = Boolean(
        Object.keys(state.activeWorkflow?.nodes ?? {}).length,
      );
      const hasAnnotations = Boolean(
        state.activeWorkflow?.workflowAnnotations.length,
      );
      const hasMetaNodeInBar = Boolean(
        state.activeWorkflow?.metaInPorts?.ports?.length,
      );
      const hasMetaNodeOutBar = Boolean(
        state.activeWorkflow?.metaOutPorts?.ports?.length,
      );

      return (
        !hasNodes && !hasAnnotations && !hasMetaNodeInBar && !hasMetaNodeOutBar
      );
    },

    workflowHasNodes(state) {
      return Boolean(Object.keys(state.activeWorkflow?.nodes ?? {}).length);
    },

    isStreaming: (state) => {
      return Boolean(state.activeWorkflow?.info.jobManager);
    },

    isLinked: (state) => {
      return Boolean(state.activeWorkflow?.info.linked);
    },

    totalNodes: (state) => {
      return Object.keys(state.activeWorkflow?.nodes ?? {}).length;
    },

    insideLinkedType: (state) => {
      if (!state.activeWorkflow?.parents) {
        return null;
      }
      return state.activeWorkflow.parents.find(({ linked }) => linked)
        ?.containerType;
    },

    isInsideLinked() {
      return Boolean(this.insideLinkedType);
    },

    isWritable(): boolean {
      if (
        !useUIControlsStore().canEditWorkflow ||
        this.activeWorkflow?.info.version
      ) {
        return false;
      }

      // linking state
      const linkage = this.isLinked || this.isInsideLinked;
      const projectAndWorkflowIds = this.getProjectAndWorkflowIds;

      // ai assistant stuff
      if (!useAIAssistantStore()) {
        return !linkage;
      }

      const { build: aiAssistantBuildMode } = useAIAssistantStore();

      const isAiProcessingCurrentWorkflow =
        aiAssistantBuildMode.isProcessing &&
        aiAssistantBuildMode.projectAndWorkflowIds &&
        aiAssistantBuildMode.projectAndWorkflowIds.projectId ===
          projectAndWorkflowIds.projectId &&
        aiAssistantBuildMode.projectAndWorkflowIds.workflowId ===
          projectAndWorkflowIds.workflowId;

      // TODO: document better under which conditions a workflow is not writable
      return !linkage && !isAiProcessingCurrentWorkflow;
    },

    isRemoteWorkflow: (state) => {
      return Boolean(
        state.activeWorkflow?.info.providerType !==
          WorkflowInfo.ProviderTypeEnum.LOCAL,
      );
    },

    /* returns the upper-left bound [xMin, yMin] and the lower-right bound [xMax, yMax] of the workflow */
    workflowBounds: (state) => {
      if (!state.activeWorkflow) {
        return {
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          width: 0,
          height: 0,
        };
      }

      return geometry.getWorkflowObjectBounds(state.activeWorkflow, {
        padding: true,
        calculatedPortBarBounds: state.calculatedMetanodePortBarBounds,
      });
    },
  },
});
