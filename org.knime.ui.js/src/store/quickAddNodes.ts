import type { ActionTree, GetterTree, MutationTree } from "vuex";

import { API } from "@/api";
import type {
  NodeRelation,
  NodeTemplateWithExtendedPorts,
} from "@/api/custom-types";
import { toNodeTemplateWithExtendedPorts } from "../util/portDataMapper";

import * as nodeSearch from "./common/nodeSearch";
import type { RootStoreState } from "./types";

/**
 * Store that manages quick add nodes menu states.
 */

const recommendationLimit = 12;

export interface QuickAddNodesState extends nodeSearch.CommonNodeSearchState {
  recommendedNodes: Array<NodeTemplateWithExtendedPorts> | null;
}

export const state = (): QuickAddNodesState => ({
  ...nodeSearch.state(),
  recommendedNodes: null,
});

export const mutations: MutationTree<QuickAddNodesState> = {
  ...nodeSearch.mutations,

  setRecommendedNodes(state, recommendedNodes) {
    state.recommendedNodes = recommendedNodes;
  },
};

export const actions: ActionTree<QuickAddNodesState, RootStoreState> = {
  ...nodeSearch.actions,

  async getNodeRecommendations(
    { commit, rootState },
    {
      nodeId,
      portIdx,
      nodesLimit = recommendationLimit,
      nodeRelation,
    }: {
      nodeId?: string;
      portIdx?: number;
      nodesLimit?: number;
      nodeRelation: NodeRelation;
    },
  ) {
    if (!rootState.workflow.activeWorkflow) {
      return;
    }

    const {
      projectId,
      info: { containerId: workflowId },
    } = rootState.workflow.activeWorkflow;
    const { availablePortTypes } = rootState.application;

    // call api
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

    commit(
      "setRecommendedNodes",
      recommendedNodesResult.map(
        toNodeTemplateWithExtendedPorts(availablePortTypes),
      ),
    );
  },

  async clearRecommendedNodesAndSearchParams({ commit, dispatch }) {
    commit("setRecommendedNodes", null);
    await dispatch("clearSearchParams");
  },
};

export const getters: GetterTree<QuickAddNodesState, RootStoreState> = {
  ...nodeSearch.getters,

  getFirstResult: (state, getters) => () => {
    if (getters.searchIsActive) {
      return getters.getFirstSearchResult();
    }

    return state.recommendedNodes && state.recommendedNodes.length > 0
      ? state.recommendedNodes[0]
      : null;
  },
};
