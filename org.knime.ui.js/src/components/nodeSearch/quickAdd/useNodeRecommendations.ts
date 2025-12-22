import { type Ref, watch } from "vue";
import { storeToRefs } from "pinia";

import type { NodeRelation } from "@/api/custom-types";
import { useApplicationSettingsStore } from "@/store/application/settings";
import { useQuickAddNodesStore } from "@/store/quickAddNodes";

export const useNodeRecommendations = (
  nodeId: Ref<string | null>,
  portIndex: Ref<number | null>,
  nodeRelation: Ref<NodeRelation | null>,
) => {
  const { hasNodeRecommendationsEnabled } = storeToRefs(
    useApplicationSettingsStore(),
  );
  const { getNodeRecommendations } = useQuickAddNodesStore();

  const fetchNodeRecommendations = async () => {
    await getNodeRecommendations({
      nodeId: nodeId.value!,
      portIdx: portIndex.value!,
      nodeRelation: nodeRelation.value!,
    });
  };

  watch(
    hasNodeRecommendationsEnabled,
    (newValue) => {
      if (newValue) {
        fetchNodeRecommendations();
      }
    },
    { immediate: true },
  );

  return {
    hasNodeRecommendationsEnabled,
    fetchNodeRecommendations,
  };
};
