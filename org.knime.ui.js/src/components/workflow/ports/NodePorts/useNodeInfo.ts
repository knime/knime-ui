import { computed } from "vue";
import type { KnimeNode } from "@/api/custom-types";
import { useStore } from "@/composables/useStore";
import { isNodeComponent, isNodeMetaNode } from "@/util/nodeUtil";

type UseNodeInfoOptions = {
  nodeId: string;
};

export const useNodeInfo = (options: UseNodeInfoOptions) => {
  const store = useStore();

  const getNodeById: (id: string) => KnimeNode =
    store.getters["workflow/getNodeById"];

  const node = computed(() => getNodeById(options.nodeId));

  const isMetanode = computed(() => {
    return isNodeMetaNode(node.value);
  });

  const isComponent = computed(() => {
    return isNodeComponent(node.value);
  });

  return { node, isComponent, isMetanode };
};
