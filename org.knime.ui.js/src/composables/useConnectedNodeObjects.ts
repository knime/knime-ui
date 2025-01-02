import { type Ref, computed } from "vue";
import { storeToRefs } from "pinia";

import { useWorkflowStore } from "@/store/workflow/workflow";

type UseConnectedNodeObjectsOptions = {
  /**
   * Node ID of the connector's source node
   */
  sourceNode: Ref<string | null>;
  /**
   * Node ID of the connector's target node
   */
  destNode: Ref<string | null>;
};

export const useConnectedNodeObjects = (
  options: UseConnectedNodeObjectsOptions,
) => {
  const { activeWorkflow } = storeToRefs(useWorkflowStore());

  const sourceNodeObject = computed(() =>
    options.sourceNode.value
      ? activeWorkflow.value!.nodes[options.sourceNode.value]
      : null,
  );

  const destNodeObject = computed(() =>
    options.destNode.value
      ? activeWorkflow.value!.nodes[options.destNode.value]
      : null,
  );

  return {
    sourceNodeObject,
    destNodeObject,
  };
};
