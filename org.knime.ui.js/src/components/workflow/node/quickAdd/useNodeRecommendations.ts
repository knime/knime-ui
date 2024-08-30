import { computed, watch, type Ref } from "vue";
import { useStore } from "@/composables/useStore";
import type { NodeRelation } from "@/api/custom-types";

export const useNodeRecommendations = (
  nodeId: Ref<string | null>,
  portIndex: Ref<number | null>,
  nodeRelation: Ref<NodeRelation | null>,
) => {
  const store = useStore();

  const hasNodeRecommendationsEnabled = computed(
    () => store.state.application.hasNodeRecommendationsEnabled,
  );

  const fetchNodeRecommendations = async () => {
    await store.dispatch("quickAddNodes/getNodeRecommendations", {
      nodeId: nodeId.value,
      portIdx: portIndex.value,
      nodeRelation: nodeRelation.value,
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
