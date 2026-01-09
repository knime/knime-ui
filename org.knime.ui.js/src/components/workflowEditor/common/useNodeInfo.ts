import { computed } from "vue";

import { workflowDomain } from "@/lib/workflow-domain";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";

type UseNodeInfoOptions = {
  nodeId: string;
};

export const useNodeInfo = (options: UseNodeInfoOptions) => {
  const { getNodeById } = useNodeInteractionsStore();

  const node = computed(() => getNodeById(options.nodeId)!);

  const isMetanode = computed(() => {
    return workflowDomain.node.isMetaNode(node.value);
  });

  const isComponent = computed(() => {
    return workflowDomain.node.isComponent(node.value);
  });

  return { node, isComponent, isMetanode };
};
