import { type Ref, computed } from "vue";

import type {
  ComponentNode,
  NativeNode,
} from "@/api/gateway-api/generated-api";
import { isNativeNode } from "@/util/nodeUtil";

type UseUniqueNodeStateIdOptions = {
  projectId: Ref<string>;
  workflowId: Ref<string>;
  selectedNode: Ref<NativeNode | ComponentNode>;
};

export const useUniqueNodeStateId = (options: UseUniqueNodeStateIdOptions) => {
  const { projectId, workflowId, selectedNode } = options;
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
      `${projectId.value}__${workflowId.value}::${selectedNode.value.id}_${selectedNode.value.modelSettingsContentVersion}`,
  );

  return { uniqueNodeConfigId, uniqueNodeViewId };
};
