/* eslint-disable no-undefined */
import { storeToRefs } from "pinia";

import {
  AddNodeCommand,
  type NodeFactoryKey,
} from "@/api/gateway-api/generated-api";
import { useCurrentCanvasStore } from "@/store/canvas/useCurrentCanvasStore";
import { useSelectionStore } from "@/store/selection";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { getToastPresets } from "@/toastPresets";
import { geometry } from "@/util/geometry";

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

    return geometry.findFreeSpaceAroundCenterWithFallback({
      visibleFrame: canvasStore.value.getVisibleFrame,
      nodes: activeWorkflow.value.nodes,
    });
  };

  const addNodeWithAutoPositioning = (nodeFactory: NodeFactoryKey) => {
    const { singleSelectedNode } = storeToRefs(useSelectionStore());

    const position = singleSelectedNode.value
      ? {
          // eslint-disable-next-line no-magic-numbers
          x: singleSelectedNode.value.position.x + 120,
          y: singleSelectedNode.value.position.y,
        }
      : defaultPosition();

    const autoConnectOptions = singleSelectedNode.value
      ? {
          sourceNodeId: singleSelectedNode.value.id,
          nodeRelation: AddNodeCommand.NodeRelationEnum.SUCCESSORS,
        }
      : undefined;

    try {
      return nodeInteractionsStore.addNativeNode({
        position,
        nodeFactory,
        autoConnectOptions,
      });
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
      return nodeInteractionsStore.addComponentNodeFromMainHub({
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
