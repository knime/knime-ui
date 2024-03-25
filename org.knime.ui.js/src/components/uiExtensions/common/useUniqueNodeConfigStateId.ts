import type { NativeNode } from "@/api/gateway-api/generated-api";
import { computed, type Ref } from "vue";

type UseUniqueNodeConfigStateIdOptions = {
  projectId: Ref<string>;
  workflowId: Ref<string>;
  selectedNode: Ref<NativeNode>;
};

export const useUniqueNodeConfigStateId = (
  options: UseUniqueNodeConfigStateIdOptions,
) => {
  const { projectId, workflowId, selectedNode } = options;

  const uniqueId = computed(
    () =>
      `${projectId.value}__${workflowId.value}::${selectedNode.value.id}_${selectedNode.value.state?.executionState}`,
  );

  return { uniqueId };
};
