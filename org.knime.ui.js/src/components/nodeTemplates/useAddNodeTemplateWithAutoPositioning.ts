/* eslint-disable no-undefined */
import { storeToRefs } from "pinia";

import type { KnimeNode } from "@/api/custom-types";
import {
  AddNodeCommand,
  type NodeFactoryKey,
} from "@/api/gateway-api/generated-api";
import { freeSpaceInCanvas } from "@/lib/workflow-canvas";
import { getToastPresets } from "@/services/toastPresets";
import { useCurrentCanvasStore } from "@/store/canvas/useCurrentCanvasStore";
import { useSelectionStore } from "@/store/selection";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";

export const useAddNodeTemplateWithAutoPositioning = () => {
  const { activeWorkflow } = storeToRefs(useWorkflowStore());
  const { toastPresets } = getToastPresets();

  const nodeInteractionsStore = useNodeInteractionsStore();

  const handleError = (error: unknown) => {
    consola.error({
      message: "Error adding node to canvas with auto-placement",
      error,
    });
    toastPresets.workflow.addNodeToCanvas({ error });
  };

  const defaultPosition = () => {
    const canvasStore = useCurrentCanvasStore();

    if (!activeWorkflow.value) {
      throw new Error("Invalid state: there is no active workflow");
    }

    return freeSpaceInCanvas.aroundCenterWithFallback({
      visibleFrame: canvasStore.value.getVisibleFrame,
      nodes: activeWorkflow.value!.nodes,
    });
  };

  const addNodeWithAutoPositioning = async (
    nodeFactory: NodeFactoryKey,
  ): Promise<{
    newNodeId: string | null;
    connectedTo?: { node: KnimeNode };
  }> => {
    const singleSelectedNode = useSelectionStore().singleSelectedNode;

    const position = singleSelectedNode
      ? {
          // eslint-disable-next-line no-magic-numbers
          x: singleSelectedNode.position.x + 120,
          y: singleSelectedNode.position.y,
        }
      : defaultPosition();

    const autoConnectOptions = singleSelectedNode
      ? {
          sourceNodeId: singleSelectedNode.id,
          nodeRelation: AddNodeCommand.NodeRelationEnum.SUCCESSORS,
        }
      : undefined;

    try {
      const { newNodeId } = await nodeInteractionsStore.addNativeNode({
        position,
        nodeFactory,
        autoConnectOptions,
      });

      if (newNodeId) {
        const connectedTo = singleSelectedNode
          ? { node: singleSelectedNode }
          : undefined;

        return { newNodeId, connectedTo };
      }

      return { newNodeId: null };
    } catch (error) {
      handleError(error);
      return { newNodeId: null };
    }
  };

  const addComponentWithAutoPositioning = (
    componentId: string,
    componentName: string,
  ) => {
    try {
      return nodeInteractionsStore.addComponentNode({
        position: defaultPosition(),
        componentIdInHub: componentId,
        componentName,
      });
    } catch (error) {
      handleError(error);
      return { newNodeId: null };
    }
  };

  return {
    addNodeWithAutoPositioning,
    addComponentWithAutoPositioning,
  };
};
