import { computed, ref, watch } from "vue";
import { useStore } from "@/composables/useStore";
import QuickAddNodeRecommendations from "./QuickAddNodeRecommendations.vue";
import type { NodeRelation } from "@/api/custom-types";

export const useNodeRecommendations = (
  nodeId: string | null,
  portIndex: number | null,
  nodeRelation: NodeRelation | null,
) => {
  const store = useStore();

  const hasNodeRecommendationsEnabled = computed(
    () => store.state.application.hasNodeRecommendationsEnabled,
  );

  const recommendationResults =
    ref<InstanceType<typeof QuickAddNodeRecommendations>>();

  const fetchNodeRecommendations = async () => {
    await store.dispatch("quickAddNodes/getNodeRecommendations", {
      nodeId,
      portIdx: portIndex,
      nodeRelation,
    });
  };

  watch(
    () => hasNodeRecommendationsEnabled.value,
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
    recommendationResults,
  };
};
