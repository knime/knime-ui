import { type Ref, computed, ref } from "vue";

import type {
  ComponentNode,
  NativeNode,
} from "@/api/gateway-api/generated-api";
import { isNativeNode } from "@/util/nodeUtil";

type UseUniqueNodeStateIdOptions = {
  projectId: Ref<string>;
  workflowId: Ref<string>;
  selectedNode: Ref<NativeNode | ComponentNode>;
  timestamp?: Ref<number>;
};

export const useUniqueNodeStateId = (options: UseUniqueNodeStateIdOptions) => {
  const { projectId, workflowId, selectedNode, timestamp = ref(0) } = options;
  const templateId = computed(() =>
    isNativeNode(selectedNode.value)
      ? selectedNode.value.templateId
      : selectedNode.value.kind,
  );

  const uniqueNodeConfigId = computed(
    () =>
      `${projectId.value}__${workflowId.value}::${templateId.value}_${selectedNode.value.id}_inports-${selectedNode.value.inPorts.length}_content-${selectedNode.value.inputContentVersion}`,
  );

  const uniqueNodeViewId = computed(
    () =>
      `${projectId.value}__${workflowId.value}::${selectedNode.value.id}_${selectedNode.value.state?.executionState}_${timestamp.value}`,
  );

  return { uniqueNodeConfigId, uniqueNodeViewId };
};
