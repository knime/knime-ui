import { computed } from "vue";

import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { isNodeComponent, isNodeMetaNode } from "@/util/nodeUtil";

type UseNodeInfoOptions = {
  nodeId: string;
};

export const useNodeInfo = (options: UseNodeInfoOptions) => {
  const { getNodeById } = useNodeInteractionsStore();

  const node = computed(() => getNodeById(options.nodeId)!);

  const isMetanode = computed(() => {
    return isNodeMetaNode(node.value);
  });

  const isComponent = computed(() => {
    return isNodeComponent(node.value);
  });

  return { node, isComponent, isMetanode };
};
