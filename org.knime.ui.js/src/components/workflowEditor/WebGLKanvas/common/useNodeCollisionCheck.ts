import { computed } from "vue";
import { storeToRefs } from "pinia";

import type { XY } from "@/api/gateway-api/generated-api";
import { useWorkflowStore } from "@/store/workflow/workflow";
import * as $shapes from "@/style/shapes";
import { geometry } from "@/util/geometry";
import { SpatialHash } from "@/util/workflow-canvas";

const DISTANCE_BUFFER = 20;
const spatialHash = new SpatialHash({
  cellSize: $shapes.nodeSize + DISTANCE_BUFFER,
  aabbTesters: {
    node: (reference, candidate) => {
      return Boolean(
        geometry.utils.rectangleIntersection(
          {
            left: reference.x,
            top: reference.y,
            width: reference.width + DISTANCE_BUFFER,
            height: reference.height + DISTANCE_BUFFER,
          },
          {
            left: candidate.x,
            top: candidate.y,
            width: candidate.width + DISTANCE_BUFFER,
            height: candidate.height + DISTANCE_BUFFER,
          },
        ),
      );
    },
  },
});

export const useNodeCollisionCheck = () => {
  const workflowStore = useWorkflowStore();
  const { activeWorkflow } = storeToRefs(workflowStore);
  const nodes = computed(() => activeWorkflow.value?.nodes);

  const init = () => {
    if (!nodes.value) {
      return;
    }

    spatialHash.reset(
      Object.values(nodes.value).map((node) => ({
        id: node.id,
        type: "node",
        x: node.position.x,
        y: node.position.y,
        width: $shapes.nodeSize,
        height: $shapes.nodeSize,
      })),
    );
  };

  const check = (referenceNode: { id: string; position: XY }) => {
    if (!nodes.value) {
      return null;
    }

    const foundCandidate = spatialHash.queryNearbyObjects({
      id: referenceNode.id,
      type: "node",
      x: referenceNode.position.x,
      y: referenceNode.position.y,
      width: $shapes.nodeSize,
      height: $shapes.nodeSize,
    });

    return foundCandidate;
  };

  return { collisionChecker: { init, check } };
};
