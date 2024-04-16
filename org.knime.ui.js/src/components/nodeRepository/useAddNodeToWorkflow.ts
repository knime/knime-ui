import type { NodeFactoryKey } from "@/api/gateway-api/generated-api";
import { useStore } from "@/composables/useStore";
import { geometry } from "@/util/geometry";

/**
 * Add a node to the workflow. This has some handling for position as well as connecting to a selected node
 * It was ripped out of DraggableNodeTemplate where this code was used for the double click action.
 */
export const useAddNodeToWorkflow = () => {
  const store = useStore();

  return ({ nodeFactory }: { nodeFactory: NodeFactoryKey }) => {
    // do not try to add a node to a read only workflow
    if (!store.getters["workflow/isWritable"]) {
      return;
    }

    const singleSelectedNode = store.getters["selection/singleSelectedNode"];
    const getVisibleFrame = store.getters["canvas/getVisibleFrame"];
    const { activeWorkflow } = store.state.workflow;

    const position = singleSelectedNode
      ? {
          // eslint-disable-next-line no-magic-numbers
          x: singleSelectedNode.position.x + 120,
          y: singleSelectedNode.position.y,
        }
      : geometry.findFreeSpaceAroundCenterWithFallback({
          visibleFrame: getVisibleFrame(),
          nodes: activeWorkflow!.nodes,
        });
    const sourceNodeId = singleSelectedNode?.id ?? null;

    store.dispatch("workflow/addNode", { position, nodeFactory, sourceNodeId });
  };
};
