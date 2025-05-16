import { computed, ref } from "vue";
import { storeToRefs } from "pinia";

import type { XY } from "@/api/gateway-api/generated-api";
import { useWorkflowStore } from "@/store/workflow/workflow";
import * as $shapes from "@/style/shapes";
import { geometry } from "@/util/geometry";

const REPLACE_DISTANCE = 150;
// const MAGNETIC_CONNECTION_DISTANCE = 150;
const spatialHash = ref<Record<string, string[]>>({});
const cellSize = ref(0);

export const useNodeCollisionCheck = () => {
  const workflowStore = useWorkflowStore();
  const { activeWorkflow } = storeToRefs(workflowStore);
  const nodes = computed(() => activeWorkflow.value?.nodes);

  const init = () => {
    if (!nodes.value) {
      return;
    }

    const result = geometry.buildSpatialHash(
      nodes.value,
      $shapes.nodeSize + REPLACE_DISTANCE,
    );
    spatialHash.value = result.hash;
    cellSize.value = result.cellSize;
  };

  const check = (referenceNode: { id: string; position: XY }) => {
    if (!nodes.value) {
      return null;
    }

    const foundCandidate = geometry.queryNearbyObjects({
      reference: {
        id: referenceNode.id,
        position: referenceNode.position,
      },
      objects: nodes.value,
      hash: spatialHash.value,
      aabbTest: (reference, candidate) => {
        return Boolean(
          geometry.utils.rectangleIntersection(
            {
              left: reference.position.x,
              top: reference.position.y,
              width: $shapes.nodeSize + REPLACE_DISTANCE,
              height: $shapes.nodeSize + REPLACE_DISTANCE,
            },
            {
              left: candidate.position.x,
              top: candidate.position.y,
              width: $shapes.nodeSize + REPLACE_DISTANCE,
              height: $shapes.nodeSize + REPLACE_DISTANCE,
            },
          ),
        );
      },
      cellSize: cellSize.value,
    });

    return foundCandidate;
  };

  return { collisionChecker: { init, check } };
};
