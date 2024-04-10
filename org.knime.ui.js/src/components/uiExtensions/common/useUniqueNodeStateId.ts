import type { NativeNode } from "@/api/gateway-api/generated-api";
import { computed, type Ref } from "vue";

type UseUniqueNodeStateIdOptions = {
  projectId: Ref<string>;
  workflowId: Ref<string>;
  selectedNode: Ref<NativeNode>;
};

export const useUniqueNodeStateId = (options: UseUniqueNodeStateIdOptions) => {
  const { projectId, workflowId, selectedNode } = options;

  const uniqueNodeInputStateId = computed(
    () =>
      `${projectId.value}__${workflowId.value}::${selectedNode.value.id}_${selectedNode.value.inputContentVersion}`,
  );

  const uniqueNodeConfigStateId = computed(
    () =>
      `${projectId.value}__${workflowId.value}::${selectedNode.value.id}_${selectedNode.value.state?.executionState}`,
  );

  return { uniqueNodeInputStateId, uniqueNodeConfigStateId };
};
