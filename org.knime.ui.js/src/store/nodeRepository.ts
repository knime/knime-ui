import type { ActionTree, GetterTree, MutationTree } from "vuex";

import { API } from "@api";
import type {
  NodeTemplateWithExtendedPorts,
  NodeCategoryWithExtendedPorts,
} from "@/api/custom-types";

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

  /** tree */
  nodeCategoryCache: Map<string, NodeCategoryWithExtendedPorts>;
  treeExpandedKeys: string[];
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

  /** tree */
  nodeCategoryCache: new Map(),
  treeExpandedKeys: [],
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

  updateNodeCategoryCache(
    state,
    {
      categoryPath,
      nodeCategory,
    }: { categoryPath: string[]; nodeCategory: NodeCategoryWithExtendedPorts },
  ) {
    state.nodeCategoryCache.set(categoryPath.join("/"), nodeCategory);
  },

  resetNodeCategoryCache(state) {
    state.nodeCategoryCache = new Map();
  },

  setTreeExpandedKeys(state, value) {
    state.treeExpandedKeys = value;
  },
};

export const actions: ActionTree<NodeRepositoryState, RootStoreState> = {
  ...nodeSearch.actions,

  async getNodeCategory(
    { state, rootState, dispatch, commit },
    { categoryPath }: { categoryPath: string[] },
  ) {
    // use cache if available
    const path = categoryPath.join("/");
    if (state.nodeCategoryCache.has(path)) {
      return state.nodeCategoryCache.get(path);
    }

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

    const result = {
      ...nodeCategoryResult,
      nodes: nodesWithMappedPorts,
    };

    // cache the results
    commit("updateNodeCategoryCache", { categoryPath, nodeCategory: result });

    return result;
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

  clearTree({ commit }) {
    commit("resetNodeCategoryCache");
    commit("setTreeExpandedKeys", []);
  },

  async resetSearchTagsAndTree({ dispatch, getters }) {
    if (getters.searchIsActive) {
      await dispatch("clearSearchResults");
      await dispatch("searchNodesDebounced");
    }
    // Always clear the tag and tree data
    await dispatch("clearTagResults");
    await dispatch("clearTree");
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

  treeContainsNodeId(state: NodeRepositoryState) {
    return (nodeId: string) =>
      state.treeExpandedKeys.some(
        (nodeKey) =>
          state.nodeCategoryCache
            ?.get(nodeKey)
            ?.nodes?.some((node) => node.id === nodeId),
      );
  },

  isNodeVisible: (state, getters, rootState) => (nodeId: string) => {
    if (getters.searchIsActive) {
      return getters.searchResultsContainNodeId(nodeId);
    }

    if (rootState.settings.settings.nodeRepositoryDisplayMode === "tree") {
      return getters.treeContainsNodeId(nodeId);
    }

    return getters.nodesPerTagContainNodeId(nodeId);
  },
};
