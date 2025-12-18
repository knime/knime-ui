import { computed, ref } from "vue";
import { API } from "@api";
import { defineStore } from "pinia";

import type { NodeRelation } from "@/api/custom-types";
import { useApplicationStore } from "@/store/application/application";
import { useNodeSearch } from "@/store/common/useNodeSearch";
import { useWorkflowStore } from "@/store/workflow/workflow";
import type { NodeTemplateWithExtendedPorts } from "@/util/dataMappers";
import { nodeTemplate } from "@/util/dataMappers";

/**
 * Store that manages quick add nodes menu states.
 */
const recommendationLimit = 12;

export const useQuickAddNodesStore = defineStore("quick", () => {
  const nodeSearch = useNodeSearch();

  const recommendedNodes = ref<Array<NodeTemplateWithExtendedPorts>>([]);

  const setRecommendedNodes = (
    _recommendedNodes: Array<NodeTemplateWithExtendedPorts>,
  ) => {
    recommendedNodes.value = _recommendedNodes;
  };

  const getNodeRecommendations = async ({
    nodeId,
    portIdx,
    nodesLimit = recommendationLimit,
    nodeRelation,
  }: {
    nodeId?: string;
    portIdx?: number;
    nodesLimit?: number;
    nodeRelation?: NodeRelation;
  }) => {
    const workflowStore = useWorkflowStore();

    if (!workflowStore.activeWorkflow) {
      return;
    }

    const {
      projectId,
      info: { containerId: workflowId },
    } = workflowStore.activeWorkflow;

    const recommendedNodesResult =
      await API.noderepository.getNodeRecommendations({
        workflowId,
        projectId,
        nodeId,
        portIdx,
        nodesLimit,
        nodeRelation,
        fullTemplateInfo: true,
      });

    setRecommendedNodes(
      recommendedNodesResult.map(
        nodeTemplate.toNodeTemplateWithExtendedPorts(
          useApplicationStore().availablePortTypes,
        ),
      ),
    );
  };

  const clearRecommendedNodesAndSearchParams = () => {
    setRecommendedNodes([]);
    nodeSearch.clearSearchParams();
  };

  const getFirstResult = computed<NodeTemplateWithExtendedPorts | null>(() => {
    if (nodeSearch.searchIsActive.value) {
      return nodeSearch.getFirstSearchResult.value;
    }

    return recommendedNodes.value && recommendedNodes.value.length > 0
      ? recommendedNodes.value[0]
      : null;
  });

  return {
    ...nodeSearch,
    recommendedNodes,
    getNodeRecommendations,
    setRecommendedNodes,
    clearRecommendedNodesAndSearchParams,
    getFirstResult,
  };
});
