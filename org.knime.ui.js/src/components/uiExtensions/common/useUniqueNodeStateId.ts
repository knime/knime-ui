import { type Ref, computed } from "vue";

import type { NativeNode } from "@/api/gateway-api/generated-api";

type UseUniqueNodeStateIdOptions = {
  projectId: Ref<string>;
  workflowId: Ref<string>;
  selectedNode: Ref<NativeNode>;
};

export const useUniqueNodeStateId = (options: UseUniqueNodeStateIdOptions) => {
  const { projectId, workflowId, selectedNode } = options;

  const uniqueNodeConfigId = computed(
    () =>
      `${projectId.value}__${workflowId.value}::${selectedNode.value.templateId}_${selectedNode.value.id}_${selectedNode.value.inputContentVersion}`,
  );

  const uniqueNodeViewId = computed(
    () =>
      `${projectId.value}__${workflowId.value}::${selectedNode.value.id}_${selectedNode.value.state?.executionState}`,
  );

  return { uniqueNodeConfigId, uniqueNodeViewId };
};
