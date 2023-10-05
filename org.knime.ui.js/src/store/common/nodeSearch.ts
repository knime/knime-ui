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
  isShowingBottomNodes: boolean;
  searchScrollPosition: number;

  topNodes: NodeTemplateWithExtendedPorts[];
  totalNumTopNodes: number;
  topNodeSearchPage: number;
  topNodesTags: string[];

  bottomNodes: NodeTemplateWithExtendedPorts[];
  totalNumBottomNodes: number;
  bottomNodeSearchPage: number;
  bottomNodesTags: string[];

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
  isShowingBottomNodes: false,
  /* ui scroll state */
  searchScrollPosition: 0,

  /* nodes always visible */
  topNodes: null,
  totalNumTopNodes: 0,
  topNodeSearchPage: 0,
  topNodesTags: [],

  /* nodes that might be hidden if a nodeCollection is active (see application state for that) */
  bottomNodes: null,
  totalNumBottomNodes: 0,
  bottomNodeSearchPage: 0,
  bottomNodesTags: [],

  topAbortController: new AbortController(),
  bottomAbortController: new AbortController(),
});

export const mutations: MutationTree<CommonNodeSearchState> = {
  setTopNodeSearchPage(state, pageNumber) {
    state.topNodeSearchPage = pageNumber;
  },

  setTotalNumTopNodes(state, totalNumTopNodes) {
    state.totalNumTopNodes = totalNumTopNodes;
  },

  setBottomAbortController(state, abortController) {
    state.bottomAbortController = abortController;
  },

  setTopAbortController(state, abortController) {
    state.topAbortController = abortController;
  },

  addTopNodes(state, topNodes) {
    const existingNodeIds = state.topNodes.map((node) => node.id);
    const newNodes = topNodes.filter(
      (node) => !existingNodeIds.includes(node.id),
    );
    state.topNodes.push(...newNodes);
  },

  addBottomNodes(state, bottomNodes) {
    const existingNodeIds = state.bottomNodes.map((node) => node.id);
    const newNodes = bottomNodes.filter(
      (node) => !existingNodeIds.includes(node.id),
    );
    state.bottomNodes.push(...newNodes);
  },

  setTopNodes(state, topNodes) {
    state.topNodes = topNodes;
  },

  setTopNodesTags(state, topNodesTags) {
    state.topNodesTags = topNodesTags;
  },

  setBottomNodeSearchPage(state, pageNumber) {
    state.bottomNodeSearchPage = pageNumber;
  },

  setTotalNumBottomNodes(state, totalNumBottomNodes) {
    state.totalNumBottomNodes = totalNumBottomNodes;
  },

  setBottomNodes(state, bottomNodes) {
    state.bottomNodes = bottomNodes;
  },

  setBottomNodesTags(state, bottomNodesTags) {
    state.bottomNodesTags = bottomNodesTags;
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

  setShowingBottomNodes(state, value) {
    state.isShowingBottomNodes = value;
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
   * @param {Boolean} bottom - if search should be for additional nodes that are displayed on the bottom
   * @param {String} [portTypeId] - only results that are compatible with that portTypeId
   * @returns {Promise}
   */
  async searchNodes(
    { commit, state, dispatch, getters, rootState },
    { append = false, bottom = false } = {},
  ) {
    // only do request if we search for something
    if (!getters.hasSearchParams) {
      // clear old results
      dispatch("clearSearchResults");
      return;
    }

    if (bottom) {
      state.bottomAbortController.abort();
      commit("setBottomAbortController", new AbortController());
    } else {
      state.topAbortController.abort();
      commit("setTopAbortController", new AbortController());
    }

    // determine current search page
    const lastSearchPage = bottom
      ? state.bottomNodeSearchPage
      : state.topNodeSearchPage;

    const nextSearchPage = lastSearchPage + 1;
    const searchPage = append ? nextSearchPage : 0;

    // call the api
    let searchResponse: NodeSearchResult;
    try {
      searchResponse = await searchNodesAPI(
        {
          q: state.query,
          tags: state.selectedTags,
          allTagsMatch: true,
          offset: searchPage * nodeSearchPageSize,
          limit: nodeSearchPageSize,
          fullTemplateInfo: true,
          nodesPartition: bottom ? "NOT_IN_COLLECTION" : "IN_COLLECTION",
          portTypeId: state.portTypeId,
        },
        bottom ? state.bottomAbortController : state.topAbortController,
      );
    } catch (error) {
      // we aborted the call so just return and do nothing
      if (error?.name === "AbortError") {
        return;
      }
      throw error;
    }

    // update current page in state AFTER the API call resolved successfully
    const prefix = bottom ? "Bottom" : "Top";
    commit(`set${prefix}NodeSearchPage`, searchPage);

    // update results
    const { nodes, totalNumNodes, tags } = searchResponse;

    const { availablePortTypes } = rootState.application;
    const withMappedPorts = nodes.map(
      toNodeTemplateWithExtendedPorts(availablePortTypes),
    );

    commit(`setTotalNum${prefix}Nodes`, totalNumNodes);
    commit(append ? `add${prefix}Nodes` : `set${prefix}Nodes`, withMappedPorts);
    commit(`set${prefix}NodesTags`, tags);
  },

  /**
   * Dispatches the search of nodes. If isShowingBottomNodes is true also a search for more nodes is dispatched.
   * Otherwise, the results for more nodes are cleared.
   *
   * @param {*} context - Vuex context.
   * @returns {Promise<void>}
   */
  searchTopAndBottomNodes: debounce(async ({ dispatch, state }) => {
    await Promise.all([
      dispatch("searchNodes"),
      state.isShowingBottomNodes
        ? dispatch("searchNodes", { bottom: true })
        : dispatch("clearSearchResultsForBottomNodes"),
    ]);
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
    if (state.topNodes?.length !== state.totalNumTopNodes) {
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
    if (
      state.isShowingBottomNodes &&
      state.bottomNodes?.length !== state.totalNumBottomNodes
    ) {
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
    await dispatch("searchTopAndBottomNodes");
  },

  async toggleShowingBottomNodes({ commit, dispatch, state }) {
    commit("setShowingBottomNodes", !state.isShowingBottomNodes);
    if (state.isShowingBottomNodes && state.bottomNodes === null) {
      await dispatch("searchNodes", { bottom: true });
    }
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
    await dispatch("searchTopAndBottomNodes");
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
    Boolean(state.query || state.topNodesTags.length) &&
    state.topNodes !== null,
  searchResultsContainNodeId(state) {
    return (selectedNodeId) =>
      Boolean(state.topNodes?.some((node) => node.id === selectedNodeId)) ||
      (state.isShowingBottomNodes &&
        Boolean(state.bottomNodes?.some((node) => node.id === selectedNodeId)));
  },
  getFirstSearchResult: (state) => () =>
    state.topNodes.at(0) || state.bottomNodes.at(0) || null,
  tagsOfVisibleNodes: (state) => {
    const allTags = [
      ...state.topNodesTags,
      ...state.selectedTags,
      ...(state.isShowingBottomNodes ? state.bottomNodesTags : []),
    ];
    return [...new Set(allTags)];
  },
};
