import { API } from "@api";
import {
  toNodeTemplateWithExtendedPorts,
  type NodeTemplateWithExtendedPorts,
} from "@/util/portDataMapper";
import { debounce } from "lodash";
import type { ActionTree, GetterTree, MutationTree } from "vuex";
import type { RootStoreState } from "../types";
import type { NodeSearchResult } from "@/api/gateway-api/generated-api";

/**
 * This store is not instantiated by Vuex but used by other stores.
 */

const nodeSearchPageSize = 100;
const searchTopAndBottomNodesDebounceWait = 150; // ms

export interface CommonNodeSearchState {
  query: string;
  selectedTags: string[];
  portTypeId: string | null;
  searchScrollPosition: number;

  starterNodes: NodeTemplateWithExtendedPorts[];
  totalNumStarterNodes: number;
  starterNodeSearchPage: number;
  starterNodesTags: string[];

  allNodes: NodeTemplateWithExtendedPorts[];
  totalNumAllNodes: number;
  allNodeSearchPage: number;
  allNodesTags: string[];

  bottomAbortController: AbortController;
  topAbortController: AbortController;
}

export const state = (): CommonNodeSearchState => ({
  /* basic search params */
  query: "",
  selectedTags: [],
  /* filter for compatible port type ids */
  portTypeId: null,
  /* local state of the bottom nodes */
  /* ui scroll state */
  searchScrollPosition: 0,

  /* nodes visible if nodeCollection is active */
  starterNodes: null,
  totalNumStarterNodes: 0,
  starterNodeSearchPage: 0,
  starterNodesTags: [],

  /* nodes visible if nodeCollection in not active */
  allNodes: null,
  totalNumAllNodes: 0,
  allNodeSearchPage: 0,
  allNodesTags: [],

  topAbortController: new AbortController(),
  bottomAbortController: new AbortController(),
});

export const mutations: MutationTree<CommonNodeSearchState> = {
  setTopNodeSearchPage(state, pageNumber) {
    state.starterNodeSearchPage = pageNumber;
  },

  setTotalNumTopNodes(state, totalNumStarterNodes) {
    state.totalNumStarterNodes = totalNumStarterNodes;
  },

  setBottomAbortController(state, abortController) {
    state.bottomAbortController = abortController;
  },

  setTopAbortController(state, abortController) {
    state.topAbortController = abortController;
  },

  addTopNodes(state, starterNodes) {
    const existingNodeIds = state.starterNodes.map((node) => node.id);
    const newNodes = starterNodes.filter(
      (node) => !existingNodeIds.includes(node.id),
    );
    state.starterNodes.push(...newNodes);
  },

  addBottomNodes(state, allNodes) {
    const existingNodeIds = state.allNodes.map((node) => node.id);
    const newNodes = allNodes.filter(
      (node) => !existingNodeIds.includes(node.id),
    );
    state.allNodes.push(...newNodes);
  },

  setTopNodes(state, starterNodes) {
    state.starterNodes = starterNodes;
  },

  setTopNodesTags(state, starterNodesTags) {
    state.starterNodesTags = starterNodesTags;
  },

  setBottomNodeSearchPage(state, pageNumber) {
    state.allNodeSearchPage = pageNumber;
  },

  setTotalNumBottomNodes(state, totalNumAllNodes) {
    state.totalNumAllNodes = totalNumAllNodes;
  },

  setBottomNodes(state, allNodes) {
    state.allNodes = allNodes;
  },

  setBottomNodesTags(state, allNodesTags) {
    state.allNodesTags = allNodesTags;
  },

  setSelectedTags(state, selectedTags) {
    state.selectedTags = selectedTags;
    state.searchScrollPosition = 0;
  },

  setPortTypeId(state, value) {
    state.portTypeId = value;
  },

  setQuery(state, value) {
    state.query = value;
    state.searchScrollPosition = 0;
  },

  setSearchScrollPosition(state, value) {
    state.searchScrollPosition = value;
  },
};

const searchNodesAPI = (
  params: Parameters<typeof API.noderepository.searchNodes>[0],
  options?: { signal: AbortSignal },
): Promise<NodeSearchResult> => {
  return new Promise((resolve, reject) => {
    // the actual call
    API.noderepository.searchNodes(params).then(resolve);
    // abort logic
    const abortListener = ({ target }) => {
      options.signal.removeEventListener("abort", abortListener);
      reject(target.reason);
    };
    options.signal.addEventListener("abort", abortListener);
  });
};

export const actions: ActionTree<CommonNodeSearchState, RootStoreState> = {
  /**
   * Fetch nodes. Used for initial data retrieval, but also for searching via query and/or tag filters.
   *
   * @param {*} context - Vuex context.
   * @param {Boolean} append - if the results should be added to the current nodes (for pagination) or if the state
   *      should be cleared (for a new search).
   * @param {Boolean} all - if search should be for all nodes
   * @param {String} [portTypeId] - only results that are compatible with that portTypeId
   * @returns {Promise}
   */
  async searchNodes(
    { commit, state, dispatch, getters, rootState },
    { append = false, all = false } = {},
  ) {
    // only do request if we search for something
    if (!getters.hasSearchParams) {
      // clear old results
      dispatch("clearSearchResults");
      return;
    }

    if (all) {
      state.bottomAbortController.abort();
      commit("setBottomAbortController", new AbortController());
    } else {
      state.topAbortController.abort();
      commit("setTopAbortController", new AbortController());
    }

    // determine current search page
    const lastSearchPage = all
      ? state.allNodeSearchPage
      : state.starterNodeSearchPage;

    const nextSearchPage = lastSearchPage + 1;
    const searchPage = append ? nextSearchPage : 0;

    // call the api
    try {
      const searchResponse = await searchNodesAPI(
        {
          q: state.query,
          tags: state.selectedTags,
          allTagsMatch: true,
          offset: searchPage * nodeSearchPageSize,
          limit: nodeSearchPageSize,
          fullTemplateInfo: true,
          nodesPartition: all ? "ALL" : "IN_COLLECTION",
          portTypeId: state.portTypeId,
        },
        all ? state.bottomAbortController : state.topAbortController,
      );

      // update current page in state AFTER the API call resolved successfully
      const prefix = all ? "Bottom" : "Top";
      commit(`set${prefix}NodeSearchPage`, searchPage);

      // update results
      const { nodes, totalNumNodes, tags } = searchResponse;

      const { availablePortTypes } = rootState.application;
      const withMappedPorts = nodes.map(
        toNodeTemplateWithExtendedPorts(availablePortTypes),
      );

      commit(`setTotalNum${prefix}Nodes`, totalNumNodes);
      commit(
        append ? `add${prefix}Nodes` : `set${prefix}Nodes`,
        withMappedPorts,
      );
      commit(`set${prefix}NodesTags`, tags);
    } catch (error) {
      // we aborted the call so just return and do nothing
      if (error?.name === "AbortError") {
        return;
      }
      throw error;
    }
  },

  /**
   * Dispatches the search of starter nodes. If hasNodeCollectionActive is false search for all nodes instead.
   * Otherwise, the results for more nodes are cleared.
   *
   * @param {*} context - Vuex context.
   * @returns {Promise<void>}
   */
  searchStarterAndAllNodes: debounce(async ({ dispatch, rootState }) => {
    if (rootState.application.hasNodeCollectionActive) {
      await dispatch("searchNodes");
    } else {
      await dispatch("searchNodes", { all: true });
    }
  }, searchTopAndBottomNodesDebounceWait),

  /**
   * Clear search results (nodes and tags)
   * @param {*} context - Vuex context.
   * @returns {undefined}
   */
  async clearSearchResults({ commit, dispatch }) {
    commit("setTopNodes", null);
    commit("setTopNodesTags", []);
    commit("setTotalNumTopNodes", 0);
    await dispatch("clearSearchResultsForBottomNodes");
  },

  clearSearchResultsForBottomNodes({ commit }) {
    commit("setBottomNodes", null);
    commit("setBottomNodesTags", []);
    commit("setTotalNumBottomNodes", 0);
  },

  /**
   * Fetch the next page of node results.
   *
   * @param {*} context - Vuex context.
   * @returns {undefined}
   */
  async searchTopNodesNextPage({ dispatch, state }) {
    if (state.starterNodes?.length !== state.totalNumStarterNodes) {
      await dispatch("searchNodes", { append: true });
    }
  },

  /**
   * Fetch the next page of node results for more nodes.
   *
   * @param {*} context - Vuex context.
   * @returns {undefined}
   */
  async searchBottomNodesNextPage({ dispatch, state }) {
    if (state.allNodes?.length !== state.totalNumAllNodes) {
      await dispatch("searchNodes", { append: true, bottom: true });
    }
  },

  /**
   * Update all selected tags
   *
   * @param {*} context - Vuex context.
   * @param {Array<String>} tags - array of tags to set
   * @returns {undefined}
   */
  async setSelectedTags({ dispatch, commit }, tags) {
    commit("setSelectedTags", tags);
    await dispatch("searchStarterAndAllNodes");
  },

  /**
   * Update the value of the single search node query
   *
   * @param {*} context - Vuex context.
   * @param {String} value - Search query value
   * @returns {undefined}
   */
  async updateQuery({ commit, dispatch }, value) {
    commit("setQuery", value);
    // await dispatch("searchStarterNodes");
    await dispatch("searchStarterAndAllNodes");
  },

  /**
   * Clear search parameter (query and selectedTags) and results
   *
   * @param {*} context - Vuex context.
   * @returns {undefined}
   */
  async clearSearchParams({ commit, dispatch }) {
    commit("setSelectedTags", []);
    commit("setQuery", "");
    commit("setPortTypeId", null);
    await dispatch("clearSearchResults");
  },
};

export const getters: GetterTree<CommonNodeSearchState, RootStoreState> = {
  hasSearchParams: (state) =>
    state.query !== "" || state.selectedTags.length > 0,
  searchIsActive: (state) =>
    Boolean(
      state.query || state.starterNodesTags.length || state.allNodesTags.length,
    ),
  searchResultsContainNodeId(state) {
    return (selectedNodeId) =>
      Boolean(state.starterNodes?.some((node) => node.id === selectedNodeId)) ||
      Boolean(state.allNodes?.some((node) => node.id === selectedNodeId));
  },
  getFirstSearchResult: (state) => () =>
    state.starterNodes.at(0) || state.allNodes.at(0) || null,
  tagsOfVisibleNodes: (state) => {
    const allTags = [
      ...state.starterNodesTags,
      ...state.selectedTags,
      ...state.allNodesTags,
    ];
    return [...new Set(allTags)];
  },
};
