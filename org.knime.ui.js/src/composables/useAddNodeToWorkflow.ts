import { storeToRefs } from "pinia";

import {
  AddNodeCommand,
  type NodeFactoryKey,
} from "@/api/gateway-api/generated-api";
import { useCurrentCanvasStore } from "@/store/canvas/useCurrentCanvasStore";
import { useSelectionStore } from "@/store/selection";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { geometry } from "@/util/geometry";

/**
 * Add a node to the workflow by a node template factory.
 * It will automatically position the node in the canvas according to available
 * space and inside the visible frame as well as connecting the newly added node
 * to a selected node (if any)
 */
export const useAddNodeToWorkflow = () => {
  const { isWritable, activeWorkflow } = storeToRefs(useWorkflowStore());

  return ({ nodeFactory }: { nodeFactory?: NodeFactoryKey }) => {
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
