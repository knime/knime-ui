import type { ActionTree, GetterTree, MutationTree } from "vuex";
import { debounce } from "lodash-es";

import { API } from "@api";
import type { NodeTemplateWithExtendedPorts } from "@/api/custom-types";
import { createAbortablePromise } from "@/api/utils";
import { toNodeTemplateWithExtendedPorts } from "@/util/portDataMapper";

import type { RootStoreState } from "../types";
import { Direction } from "@/api/gateway-api/generated-api";

/**
 * This store is not instantiated by Vuex but used by other stores.
 */

const nodeSearchPageSize = 100;
const searchNodesDebounceWait = 150; // ms

export interface CommonNodeSearchState {
  query: string;
  selectedTags: string[];
  portTypeId: string | null;
  searchDirection: Direction.DirectionEnum | null;
  searchScrollPosition: number;

  nodes: NodeTemplateWithExtendedPorts[] | null;
  totalNumNodesFound: number;
  totalNumFilteredNodesFound: number;
  nodeSearchPage: number;
  nodesTags: string[];

  abortController: AbortController;
  isLoadingSearchResults: boolean;
}

export const state = (): CommonNodeSearchState => ({
  /* basic search params */
  query: "",
  selectedTags: [],
  /* filter for compatible port type ids */
  portTypeId: null,
  searchDirection: null,
  /* ui scroll state */
  searchScrollPosition: 0,

  nodes: null,
  totalNumNodesFound: 0,
  totalNumFilteredNodesFound: 0,
  nodeSearchPage: 0,
  nodesTags: [],

  abortController: new AbortController(),
  isLoadingSearchResults: false,
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

  setSearchDirection(state, value) {
    state.searchDirection = value;
  },

  setSearchScrollPosition(state, value) {
    state.searchScrollPosition = value;
  },

  setNodes(state, nodes) {
    state.nodes = nodes;
  },

  addNodes(state, nodes: NodeTemplateWithExtendedPorts[]) {
    const existingNodeIds = (state.nodes ?? []).map((node) => node.id);
    const newNodes = nodes.filter((node) => !existingNodeIds.includes(node.id));
    state.nodes = state.nodes ? state.nodes.concat(...newNodes) : newNodes;
  },

  setTotalNumNodesFound(state, totalNumNodesFound) {
    state.totalNumNodesFound = totalNumNodesFound;
  },

  setTotalNumFilteredNodesFound(state, totalNumFilteredNodesFound) {
    state.totalNumFilteredNodesFound = totalNumFilteredNodesFound;
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

  setLoadingSearchResults(state, isLoadingSearchResults) {
    state.isLoadingSearchResults = isLoadingSearchResults;
  },
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
    { append = false } = {},
  ) {
    // only do request if we search for something
    if (!getters.hasSearchParams) {
      // clear old results
      dispatch("clearSearchResults");
      return;
    }

    const { abortController, runAbortablePromise } = createAbortablePromise();

    state.abortController.abort();
    commit("setAbortController", abortController);

    const nextSearchPage = state.nodeSearchPage + 1;
    const searchPage = append ? nextSearchPage : 0;

    // call the api
    try {
      const searchResponse = await runAbortablePromise(() =>
        API.noderepository.searchNodes({
          q: state.query,
          tags: state.selectedTags,
          allTagsMatch: true,
          offset: searchPage * nodeSearchPageSize,
          limit: nodeSearchPageSize,
          fullTemplateInfo: true,
          // @ts-expect-error - due to a limitation of the API type generation
          portTypeId: state.portTypeId,
          // @ts-expect-error - due to a limitation of the API type generation
          searchDirection:
            state.searchDirection &&
            ({
              direction: state.searchDirection,
            } as Direction),
        }),
      );

      consola.trace("action::searchNodes -> calling API.searchNodes", {
        params: {
          q: state.query,
          tags: state.selectedTags,
          allTagsMatch: true,
          offset: searchPage * nodeSearchPageSize,
          limit: nodeSearchPageSize,
          fullTemplateInfo: true,
          portTypeId: state.portTypeId,
        },
        response: searchResponse,
      });

      // update current page in state AFTER the API call resolved successfully
      commit("setNodeSearchPage", searchPage);

      // update results
      const {
        nodes,
        totalNumNodesFound,
        tags,
        totalNumFilteredNodesFound = 0,
      } = searchResponse;

      const { availablePortTypes } = rootState.application;
      const withMappedPorts = nodes.map(
        toNodeTemplateWithExtendedPorts(availablePortTypes),
      );

      // contribute to the node templates cache
      dispatch(
        "nodeTemplates/updateCacheFromSearchResults",
        { nodeTemplates: withMappedPorts },
        { root: true },
      );

      commit("setTotalNumNodesFound", totalNumNodesFound);
      commit("setTotalNumFilteredNodesFound", totalNumFilteredNodesFound);
      commit(append ? "addNodes" : "setNodes", withMappedPorts);
      commit("setNodesTags", tags);
    } catch (error) {
      // we aborted the call so just return and do nothing
      if (
        typeof error === "object" &&
        error &&
        "name" in error &&
        error.name === "AbortError"
      ) {
        return;
      }

      consola.error(
        "action::searchNodes -> Error calling API.searchNodes",
        error,
      );
      throw error;
    }
  },

  /**
   * Dispatches the search of starter or all nodes depending on hasNodeCollectionActive.
   *
   * @param {*} context - Vuex context.
   * @returns {Promise<void>}
   */
  searchNodesDebounced: debounce(async ({ dispatch, commit }) => {
    await dispatch("searchNodes");
    commit("setLoadingSearchResults", false);
  }, searchNodesDebounceWait),

  /**
   * Clear search results (nodes and tags)
   * @param {*} context - Vuex context.
   * @returns {undefined}
   */
  clearSearchResults({ commit }) {
    commit("setNodes", null);
    commit("setNodesTags", []);
    commit("setTotalNumNodesFound", 0);
    commit("setTotalNumFilteredNodesFound", 0);
  },

  /**
   * Fetch the next page of node results.
   *
   * @param {*} context - Vuex context.
   * @returns {undefined}
   */
  async searchNodesNextPage({ dispatch, state }) {
    if (state.nodes?.length !== state.totalNumNodesFound) {
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
    commit("setLoadingSearchResults", true);
    commit("setSelectedTags", tags);
    await dispatch("searchNodesDebounced");
  },

  /**
   * Update the value of the single search node query
   *
   * @param {*} context - Vuex context.
   * @param {String} value - Search query value
   * @returns {undefined}
   */
  async updateQuery({ commit, dispatch }, value) {
    commit("setLoadingSearchResults", true);
    commit("setQuery", value);
    await dispatch("searchNodesDebounced");
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
    commit("setSearchDirection", null);
    await dispatch("clearSearchResults");
  },
};

export const getters: GetterTree<CommonNodeSearchState, RootStoreState> = {
  hasSearchParams: (state) =>
    state.query !== "" || state.selectedTags.length > 0,
  searchIsActive: (state) => Boolean(state.query || state.nodesTags.length),
  searchResultsContainNodeId(state) {
    return (selectedNodeId: string) =>
      Boolean(state.nodes?.some((node) => node.id === selectedNodeId));
  },
  getFirstSearchResult: (state) => () => (state.nodes ?? []).at(0) || null,
  tagsOfVisibleNodes: (state) => {
    const allTags = [...state.nodesTags, ...state.selectedTags];
    return [...new Set(allTags)];
  },
};
