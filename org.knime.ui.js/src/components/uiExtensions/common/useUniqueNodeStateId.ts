import { type Ref, computed, ref } from "vue";

import type { NativeNode } from "@/api/gateway-api/generated-api";

type UseUniqueNodeStateIdOptions = {
  projectId: Ref<string>;
  workflowId: Ref<string>;
  selectedNode: Ref<NativeNode>;
  timestamp?: Ref<number>;
};

export const useUniqueNodeStateId = (options: UseUniqueNodeStateIdOptions) => {
  const { projectId, workflowId, selectedNode, timestamp = ref(0) } = options;

  const uniqueNodeConfigId = computed(
    () =>
      `${projectId.value}__${workflowId.value}::${selectedNode.value.templateId}_${selectedNode.value.id}_${selectedNode.value.inputContentVersion}`,
  );

  const uniqueNodeViewId = computed(
    () =>
      `${projectId.value}__${workflowId.value}::${selectedNode.value.id}_${selectedNode.value.state?.executionState}_${timestamp.value}`,
  );

  return { uniqueNodeConfigId, uniqueNodeViewId };
};
