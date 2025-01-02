import { storeToRefs } from "pinia";

import {
  AddNodeCommand,
  type NodeFactoryKey,
} from "@/api/gateway-api/generated-api";
import { useCanvasStore } from "@/store/canvas";
import { useSelectionStore } from "@/store/selection";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { geometry } from "@/util/geometry";

/**
 * Add a node to the workflow. This has some handling for position as well as connecting to a selected node
 * It was ripped out of DraggableNodeTemplate where this code was used for the double click action.
 */
export const useAddNodeToWorkflow = () => {
  const { isWritable, activeWorkflow } = storeToRefs(useWorkflowStore());

  return ({ nodeFactory }: { nodeFactory?: NodeFactoryKey }) => {
    // do not try to add a node to a read only workflow
    if (!isWritable.value) {
      return;
    }

    const { singleSelectedNode } = storeToRefs(useSelectionStore());
    const { getVisibleFrame } = storeToRefs(useCanvasStore());

    const position = singleSelectedNode.value
      ? {
          // eslint-disable-next-line no-magic-numbers
          x: singleSelectedNode.value.position.x + 120,
          y: singleSelectedNode.value.position.y,
        }
      : geometry.findFreeSpaceAroundCenterWithFallback({
          visibleFrame: getVisibleFrame.value,
          nodes: activeWorkflow.value!.nodes,
        });
    // eslint-disable-next-line no-undefined
    const sourceNodeId = singleSelectedNode.value?.id ?? undefined;
    const nodeRelation = singleSelectedNode.value
      ? AddNodeCommand.NodeRelationEnum.SUCCESSORS
      : // eslint-disable-next-line no-undefined
        undefined;

    useNodeInteractionsStore().addNode({
      position,
      nodeFactory,
      sourceNodeId,
      nodeRelation,
    });
  };
};
