import { type Ref, computed } from "vue";

import type {
  ComponentNode,
  NativeNode,
} from "@/api/gateway-api/generated-api";
import { workflowDomain } from "@/lib/workflow-domain";

type UseUniqueNodeStateIdOptions = {
  projectId: Ref<string>;
  workflowId: Ref<string>;
  selectedNode: Ref<NativeNode | ComponentNode>;
};

export const useUniqueNodeStateId = (options: UseUniqueNodeStateIdOptions) => {
  const { projectId, workflowId, selectedNode } = options;
  const templateId = computed(() =>
    workflowDomain.node.isNative(selectedNode.value)
      ? selectedNode.value.templateId
      : selectedNode.value.kind,
  );

  const uniqueNodeConfigId = computed(() => {
    const inputPortCount = selectedNode.value.inPorts.length;
    const outputPortCount = selectedNode.value.outPorts.length;
    return `${projectId.value}__${workflowId.value}::${templateId.value}_${selectedNode.value.id}_ports-${inputPortCount}-${outputPortCount}-${selectedNode.value.inputContentVersion}`;
  });

  const uniqueNodeViewId = computed(
    () =>
      `${projectId.value}__${workflowId.value}::${selectedNode.value.id}_${selectedNode.value.modelSettingsContentVersion}`,
  );

  return { uniqueNodeConfigId, uniqueNodeViewId };
};
