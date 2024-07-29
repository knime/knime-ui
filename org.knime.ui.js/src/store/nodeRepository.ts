import type { ActionTree, GetterTree, MutationTree } from "vuex";

import { API } from "@api";
import type { NodeTemplateWithExtendedPorts } from "@/api/custom-types";

import { toNodeTemplateWithExtendedPorts } from "@/util/portDataMapper";

import * as nodeSearch from "./common/nodeSearch";
import type { RootStoreState } from "./types";
import { sample } from "lodash-es";

/**
 * Store that manages node repository state.
 */

const categoryPageSize = 3;
const firstLoadOffset = 6;

export interface NodeRepositoryState extends nodeSearch.CommonNodeSearchState {
  nodesPerCategory: Array<{
    tag: string;
    nodes: NodeTemplateWithExtendedPorts[];
  }>;
  totalNumCategories: number | null;
  categoryPage: number;
  categoryScrollPosition: number;

  selectedNode: NodeTemplateWithExtendedPorts | null;
  showDescriptionForNode: NodeTemplateWithExtendedPorts | null;
}

export const state = (): NodeRepositoryState => ({
  ...nodeSearch.state(),

  /* categories */
  nodesPerCategory: [],
  totalNumCategories: null,
  categoryPage: 0,
  categoryScrollPosition: 0,

  /* node interaction */
  selectedNode: null,
  showDescriptionForNode: null,
});

export const mutations: MutationTree<NodeRepositoryState> = {
  ...nodeSearch.mutations,

  setCategoryPage(state, pageNumber) {
    state.categoryPage = pageNumber;
  },

  setNodesPerCategories(state, { groupedNodes, append }) {
    state.nodesPerCategory = append
      ? state.nodesPerCategory.concat(groupedNodes)
      : groupedNodes;
  },

  setTotalNumCategories(state, totalNumCategories) {
    state.totalNumCategories = totalNumCategories;
  },

  setCategoryScrollPosition(state, value) {
    state.categoryScrollPosition = value;
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

  async getRootCategories() {
    // just fake them for now
    await new Promise((r) => setTimeout(r, 100));
    return [
      {
        id: "node",
        name: "Nodes",
      },
      {
        id: "csv",
        name: "CSV",
      },
      { id: "excel", name: "Excel" },
      { id: "data", name: "Data" },
      { id: "mining", name: "Mining" },
      { id: "tree", name: "Tree" },
      { id: "weka", name: "Weka" },
      {
        id: "decision",
        name: "Weka",
      },
      { id: "filter", name: "Filter" },
      {
        id: "super",
        name: "Super",
      },
    ];
  },

  async getNodesOfCategory({ rootState }, { categoryId }) {
    // FAKE IMPL using search
    const searchResponse = await API.noderepository.searchNodes({
      q: categoryId,
      tags: [],
      allTagsMatch: true,
      offset: 0,
      limit: 250,
      fullTemplateInfo: true,
    });

    const nodes: NodeTemplateWithExtendedPorts[] = searchResponse.nodes.map(
      (node) => ({
        ...toNodeTemplateWithExtendedPorts(
          rootState.application.availablePortTypes,
        )(node),
      }),
    );

    const subCategories = (base: number) => {
      let count = base;
      return [
        { id: `excel${performance.now()}${++count}`, name: "Excel" },
        { id: `data${performance.now()}${++count}`, name: "Data" },
        { id: `mining${performance.now()}${++count}`, name: "Mining" },
        { id: `tree${performance.now()}${++count}`, name: "Tree" },
        { id: `weka${performance.now()}${++count}`, name: "Weka" },
      ];
    };

    const result = {
      categories: [sample(subCategories(1)), sample(subCategories(2))],
      nodes,
    };
    return result;
  },

  async getAllNodes({ commit, dispatch, state, rootState }, { append }) {
    if (state.nodesPerCategory.length === state.totalNumCategories) {
      return;
    }
    const tagsOffset = append
      ? firstLoadOffset + state.categoryPage * categoryPageSize
      : 0;
    const tagsLimit = append ? categoryPageSize : firstLoadOffset;

    if (append) {
      commit("setCategoryPage", state.categoryPage + 1);
    } else {
      commit("setNodeSearchPage", 0);
      commit("setCategoryPage", 0);
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

    commit("setTotalNumCategories", totalNumGroups);
    commit("setNodesPerCategories", { groupedNodes: withMappedPorts, append });
  },

  clearCategoryResults({ commit }) {
    commit("setNodesPerCategories", { groupedNodes: [], append: false });
    commit("setTotalNumCategories", null);
    commit("setCategoryPage", 0);
    commit("setCategoryScrollPosition", 0);
  },

  async resetSearchAndCategories({ dispatch, getters }) {
    if (getters.searchIsActive) {
      await dispatch("clearSearchResults");
      await dispatch("searchNodesDebounced");
    }
    // Always clear the category results
    await dispatch("clearCategoryResults");
    await dispatch("getAllNodes", { append: false });
  },
};

export const getters: GetterTree<NodeRepositoryState, RootStoreState> = {
  ...nodeSearch.getters,

  nodesPerCategoryContainNodeId(state) {
    return (nodeId: string) =>
      state.nodesPerCategory.some((category) =>
        category.nodes.some((node) => node.id === nodeId),
      );
  },

  isNodeVisible: (state, getters) => (nodeId: string) =>
    getters.searchIsActive
      ? getters.searchResultsContainNodeId(nodeId)
      : getters.nodesPerCategoryContainNodeId(nodeId),
};
