import { API } from "@api";
import { toNodeTemplateWithExtendedPorts } from "@/util/portDataMapper";
import type { NodeTemplateWithExtendedPorts } from "@/api/custom-types";
import { debounce } from "lodash";
import type { ActionTree, GetterTree, MutationTree } from "vuex";
import type { RootStoreState } from "../types";
import type { NodeSearchResult } from "@/api/gateway-api/generated-api";

/**
 * This store is not instantiated by Vuex but used by other stores.
 */

const nodeSearchPageSize = 100;
const searchNodesDebounceWait = 150; // ms

export interface CommonNodeSearchState {
  query: string;
  selectedTags: string[];
  portTypeId: string | null;
  searchScrollPosition: number;

  nodes: NodeTemplateWithExtendedPorts[];
  totalNumNodes: number;
  nodeSearchPage: number;
  nodesTags: string[];

  abortController: AbortController;
}

export const state = (): CommonNodeSearchState => ({
  /* basic search params */
  query: "",
  selectedTags: [],
  /* filter for compatible port type ids */
  portTypeId: null,
  /* ui scroll state */
  searchScrollPosition: 0,

  nodes: null,
  totalNumNodes: 0,
  nodeSearchPage: 0,
  nodesTags: [],

  abortController: new AbortController(),
});

export const mutations: MutationTree<CommonNodeSearchState> = {
  setQuery(state, value) {
    state.query = value;
    state.searchScrollPosition = 0;
  },

  setSelectedTags(state, selectedTags) {
    state.selectedTags = selectedTags;
    state.searchScrollPosition = 0;
  },

  setPortTypeId(state, value) {
    state.portTypeId = value;
  },

  setSearchScrollPosition(state, value) {
    state.searchScrollPosition = value;
  },

  setNodes(state, nodes) {
    state.nodes = nodes;
  },

  addNodes(state, nodes) {
    const existingNodeIds = state.nodes.map((node) => node.id);
    const newNodes = nodes.filter((node) => !existingNodeIds.includes(node.id));
    state.nodes.push(...newNodes);
  },

  setTotalNumNodes(state, totalNumNodes) {
    state.totalNumNodes = totalNumNodes;
  },

  setNodeSearchPage(state, pageNumber) {
    state.nodeSearchPage = pageNumber;
  },

  setNodesTags(state, nodesTags) {
    state.nodesTags = nodesTags;
  },

  setAbortController(state, abortController) {
    state.abortController = abortController;
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

    state.abortController.abort();
    commit("setAbortController", new AbortController());

    const nextSearchPage = state.nodeSearchPage + 1;
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
        state.abortController,
      );

      // update current page in state AFTER the API call resolved successfully
      commit("setNodeSearchPage", searchPage);

      // update results
      const { nodes, totalNumNodes, tags } = searchResponse;

      const { availablePortTypes } = rootState.application;
      const withMappedPorts = nodes.map(
        toNodeTemplateWithExtendedPorts(availablePortTypes),
      );

      commit("setTotalNumNodes", totalNumNodes);
      commit(append ? "addNodes" : "setNodes", withMappedPorts);
      commit("setNodesTags", tags);
    } catch (error) {
      // we aborted the call so just return and do nothing
      if (error?.name === "AbortError") {
        return;
      }
      throw error;
    }
  },

  /**
   * Dispatches the search of starter or all nodes depending on hasNodeCollectionActive.
   *
   * @param {*} context - Vuex context.
   * @returns {Promise<void>}
   */
  searchStarterOrAllNodes: debounce(async ({ dispatch, rootState }) => {
    if (rootState.application.hasNodeCollectionActive) {
      await dispatch("searchNodes");
    } else {
      await dispatch("searchNodes", { all: true });
    }
  }, searchNodesDebounceWait),

  /**
   * Clear search results (nodes and tags)
   * @param {*} context - Vuex context.
   * @returns {undefined}
   */
  clearSearchResults({ commit }) {
    commit("setNodes", null);
    commit("setNodesTags", []);
    commit("setTotalNumNodes", 0);
  },

  /**
   * Fetch the next page of node results.
   *
   * @param {*} context - Vuex context.
   * @returns {undefined}
   */
  async searchNodesNextPage({ dispatch, state }) {
    if (state.nodes?.length !== state.totalNumNodes) {
      await dispatch("searchNodes", { append: true });
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
    await dispatch("searchStarterOrAllNodes");
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
    await dispatch("searchStarterOrAllNodes");
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
  searchIsActive: (state) => Boolean(state.query || state.nodesTags.length),
  searchResultsContainNodeId(state) {
    return (selectedNodeId) =>
      Boolean(state.nodes?.some((node) => node.id === selectedNodeId));
  },
  getFirstSearchResult: (state) => () => state.nodes.at(0) || null,
  tagsOfVisibleNodes: (state) => {
    const allTags = [...state.nodesTags, ...state.selectedTags];
    return [...new Set(allTags)];
  },
};
