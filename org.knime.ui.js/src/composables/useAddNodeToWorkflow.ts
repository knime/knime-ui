/* eslint-disable no-undefined */
import { storeToRefs } from "pinia";

import {
  AddNodeCommand,
  type NodeFactoryKey,
  SpaceItemReference,
  type XY,
} from "@/api/gateway-api/generated-api";
import { useCurrentCanvasStore } from "@/store/canvas/useCurrentCanvasStore";
import { useSelectionStore } from "@/store/selection";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { getToastPresets } from "@/toastPresets";
import { geometry } from "@/util/geometry";

export const useAddNodeToWorkflow = () => {
  const { isWritable, activeWorkflow } = storeToRefs(useWorkflowStore());
  const { toastPresets } = getToastPresets();

  const nodeInteractionsStore = useNodeInteractionsStore();

  const handleError = (error: unknown) => {
    consola.error({
      message: "Error adding node to canvas with auto-placement",
      error,
    });
    toastPresets.workflow.addNodeToCanvas({ error });
  };

  const addNodeByPosition = async (
    position: XY,
    nodeFactory: NodeFactoryKey,
    autoConnectOptions?: {
      sourceNodeId: string;
      nodeRelation: AddNodeCommand.NodeRelationEnum;
    },
  ) => {
    try {
      await nodeInteractionsStore.addNode({
        position,
        nodeFactory,
        sourceNodeId: autoConnectOptions?.sourceNodeId,
        nodeRelation: autoConnectOptions?.nodeRelation,
      });
    } catch (error) {
      handleError(error);
    }
  };

  const addNodeWithAutoPositioning = async (nodeFactory: NodeFactoryKey) => {
    // do not try to add a node to a read only workflow
    if (!isWritable.value) {
      return;
    }

    const { singleSelectedNode } = storeToRefs(useSelectionStore());
    const canvasStore = useCurrentCanvasStore();

    const position = singleSelectedNode.value
      ? {
          // eslint-disable-next-line no-magic-numbers
          x: singleSelectedNode.value.position.x + 120,
          y: singleSelectedNode.value.position.y,
        }
      : geometry.findFreeSpaceAroundCenterWithFallback({
          visibleFrame: canvasStore.value.getVisibleFrame,
          nodes: activeWorkflow.value!.nodes,
        });

    const autoConnectOptions = singleSelectedNode.value
      ? {
          sourceNodeId: singleSelectedNode.value.id,
          nodeRelation: AddNodeCommand.NodeRelationEnum.SUCCESSORS,
        }
      : undefined;

    await addNodeByPosition(position, nodeFactory, autoConnectOptions);
  };

  const addComponentWithAutoPositioning = async (
    componentName: string,
    spaceItemReference: SpaceItemReference,
  ) => {
    const canvasStore = useCurrentCanvasStore();

    const position = geometry.findFreeSpaceAroundCenterWithFallback({
      visibleFrame: canvasStore.value.getVisibleFrame,
      nodes: activeWorkflow.value!.nodes,
    });

    try {
      await nodeInteractionsStore.addNode({
        position,
        spaceItemReference,
        componentName,
      });
    } catch (error) {
      handleError(error);
    }
  };

  return {
    addNodeByPosition,
    addNodeWithAutoPositioning,
    addComponentWithAutoPositioning,
  };
};
