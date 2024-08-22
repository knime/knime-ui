import type { ActionTree, GetterTree, MutationTree } from "vuex";

import { API } from "@api";
import type { NodeTemplateWithExtendedPorts } from "@/api/custom-types";

import { toNodeTemplateWithExtendedPorts } from "@/util/portDataMapper";

import * as nodeSearch from "./common/nodeSearch";
import type { RootStoreState } from "./types";

/**
 * Store that manages node repository state.
 */

const tagPageSize = 3;
const firstLoadOffset = 6;

export interface NodeRepositoryState extends nodeSearch.CommonNodeSearchState {
  nodesPerTag: Array<{
    tag: string;
    nodes: NodeTemplateWithExtendedPorts[];
  }>;
  totalNumTags: number | null;
  tagPage: number;
  tagScrollPosition: number;

  selectedNode: NodeTemplateWithExtendedPorts | null;
  showDescriptionForNode: NodeTemplateWithExtendedPorts | null;
}

export const state = (): NodeRepositoryState => ({
  ...nodeSearch.state(),

  /* tags */
  nodesPerTag: [],
  totalNumTags: null,
  tagPage: 0,
  tagScrollPosition: 0,

  /* node interaction */
  selectedNode: null,
  showDescriptionForNode: null,
});

export const mutations: MutationTree<NodeRepositoryState> = {
  ...nodeSearch.mutations,

  setTagPage(state, pageNumber) {
    state.tagPage = pageNumber;
  },

  setNodesPerTags(state, { groupedNodes, append }) {
    state.nodesPerTag = append
      ? state.nodesPerTag.concat(groupedNodes)
      : groupedNodes;
  },

  setTotalNumTags(state, totalNumTags) {
    state.totalNumTags = totalNumTags;
  },

  setTagScrollPosition(state, value) {
    state.tagScrollPosition = value;
  },

  setSelectedNode(state, node) {
    state.selectedNode = node;
  },

  setShowDescriptionForNode(state, node) {
    state.showDescriptionForNode = node;
  },
};

export const actions: ActionTree<NodeRepositoryState, RootStoreState> = {
  ...nodeSearch.actions,

  async getNodeCategory(
    { rootState, dispatch },
    { categoryPath }: { categoryPath: string[] },
  ) {
    const nodeCategoryResult = await API.noderepository.getNodeCategory({
      categoryPath,
    });

    const { availablePortTypes } = rootState.application;
    const nodesWithMappedPorts = nodeCategoryResult.nodes?.map(
      toNodeTemplateWithExtendedPorts(availablePortTypes),
    );

    // contribute to the node templates cache
    dispatch(
      "nodeTemplates/updateCacheFromSearchResults",
      { nodeTemplates: nodesWithMappedPorts },
      { root: true },
    );

    return {
      ...nodeCategoryResult,
      nodes: nodesWithMappedPorts,
    };
  },

  async getAllNodes({ commit, dispatch, state, rootState }, { append }) {
    if (state.nodesPerTag.length === state.totalNumTags) {
      return;
    }
    const tagsOffset = append
      ? firstLoadOffset + state.tagPage * tagPageSize
      : 0;
    const tagsLimit = append ? tagPageSize : firstLoadOffset;

    if (append) {
      commit("setTagPage", state.tagPage + 1);
    } else {
      commit("setNodeSearchPage", 0);
      commit("setTagPage", 0);
    }

    const { totalNumGroups, groups } =
      await API.noderepository.getNodesGroupedByTags({
        numNodesPerTag: 8,
        tagsOffset,
        tagsLimit,
        fullTemplateInfo: true,
      });

    const { availablePortTypes } = rootState.application;
    const withMappedPorts = groups.map(({ nodes, tag }) => ({
      nodes: nodes.map(toNodeTemplateWithExtendedPorts(availablePortTypes)),
      tag,
    }));

    // contribute to the node templates cache
    dispatch(
      "nodeTemplates/updateCacheFromSearchResults",
      { nodeTemplates: withMappedPorts.flatMap(({ nodes }) => nodes) },
      { root: true },
    );

    commit("setTotalNumTags", totalNumGroups);
    commit("setNodesPerTags", { groupedNodes: withMappedPorts, append });
  },

  clearTagResults({ commit }) {
    commit("setNodesPerTags", { groupedNodes: [], append: false });
    commit("setTotalNumTags", null);
    commit("setTagPage", 0);
    commit("setTagScrollPosition", 0);
  },

  async resetSearchAndTags({ dispatch, getters }) {
    if (getters.searchIsActive) {
      await dispatch("clearSearchResults");
      await dispatch("searchNodesDebounced");
    }
    // Always clear the tag results
    await dispatch("clearTagResults");
    await dispatch("getAllNodes", { append: false });
  },
};

export const getters: GetterTree<NodeRepositoryState, RootStoreState> = {
  ...nodeSearch.getters,

  nodesPerTagContainNodeId(state) {
    return (nodeId: string) =>
      state.nodesPerTag.some((tag) =>
        tag.nodes.some((node) => node.id === nodeId),
      );
  },

  isNodeVisible: (state, getters) => (nodeId: string) =>
    getters.searchIsActive
      ? getters.searchResultsContainNodeId(nodeId)
      : getters.nodesPerTagContainNodeId(nodeId),
};
