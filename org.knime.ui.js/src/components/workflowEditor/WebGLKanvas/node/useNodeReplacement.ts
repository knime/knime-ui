import { type ComputedRef, computed } from "vue";
import { storeToRefs } from "pinia";

import type { XY } from "@/api/gateway-api/generated-api";
import { useSelectionStore } from "@/store/selection";
import { useMovingStore } from "@/store/workflow/moving";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { getToastPresets } from "@/toastPresets";
import { useNodeCollisionCheck } from "../common/useNodeCollisionCheck";

type UseNodeReplacementOptions = {
  nodeId: string;
  position: ComputedRef<XY>;
};

export const useNodeReplacement = (options: UseNodeReplacementOptions) => {
  const { nodeId, position } = options;
  const nodeInteractionsStore = useNodeInteractionsStore();
  const { singleSelectedNode } = storeToRefs(useSelectionStore());
  const { hasAbortedDrag } = storeToRefs(useMovingStore());
  const { replacementCandidateId } = storeToRefs(nodeInteractionsStore);
  const { toastPresets } = getToastPresets();

  const isReplacementCandidate = computed(
    () => !hasAbortedDrag.value && replacementCandidateId.value === nodeId,
  );

  const { collisionChecker } = useNodeCollisionCheck();

  const onNodeDragStart = () => {
    if (!singleSelectedNode.value) {
      return;
    }

    collisionChecker.init();
  };

  const onNodeDragMove = () => {
    if (!singleSelectedNode.value) {
      return;
    }

    replacementCandidateId.value = collisionChecker.check({
      id: nodeId,
      position: position.value,
    });
  };

  const onNodeDrop = async () => {
    if (hasAbortedDrag.value) {
      replacementCandidateId.value = null;
      return { wasReplaced: false };
    }

    if (replacementCandidateId.value) {
      try {
        await nodeInteractionsStore.replaceNode({
          targetNodeId: replacementCandidateId.value,
          replacementNodeId: nodeId,
        });

        return { wasReplaced: true };
      } catch (error) {
        consola.error("Failed to replace node. Will perform a move instead", {
          error,
        });
        toastPresets.workflow.addToCanvas.replaceNode({ error });
        return { wasReplaced: false };
      } finally {
        replacementCandidateId.value = null;
      }
    }

    return { wasReplaced: false };
  };

  return {
    isReplacementCandidate,
    onNodeDragStart,
    onNodeDragMove,
    onNodeDrop,
  };
};
