import { searchNodes, getNodesGroupedByTags, getNodeDescription } from '@api';
import { toNodeWithFullPorts } from '../util/portDataMapper';

/**
 * Store that manages node repository state.
 */

const nodeSearchPageSize = 100;
const categoryPageSize = 3;
const firstLoadOffset = 6;

export const state = () => ({
    /* categories */
    nodesPerCategory: [],
    totalNumCategories: null,
    categoryPage: 0,
    categoryScrollPosition: 0,

    /* search results */
    topNodes: null,
    totalNumTopNodes: 0,
    selectedTags: [],
    topNodesTags: [],
    query: '',
    topNodeSearchPage: 0,
    searchScrollPosition: 0,
    isShowingBottomNodes: false,
    bottomNodes: null,
    totalNumBottomNodes: 0,
    bottomNodesTags: [],
    bottomNodesSearchPage: 0,

    /* node interaction */
    selectedNode: null,
    isDraggingNode: false,
    isDescriptionPanelOpen: false
});

export const mutations = {

    setCategoryPage(state, pageNumber) {
        state.categoryPage = pageNumber;
    },
    setTopNodeSearchPage(state, pageNumber) {
        state.topNodeSearchPage = pageNumber;
    },

    setTotalNumTopNodes(state, totalNumTopNodes) {
        state.totalNumTopNodes = totalNumTopNodes;
    },

    addTopNodes(state, topNodes) {
        let existingNodeIds = state.topNodes.map(node => node.id);
        let newNodes = topNodes.filter(node => !existingNodeIds.includes(node.id));
        state.topNodes.push(...newNodes);
    },

    setTopNodes(state, topNodes) {
        state.topNodes = topNodes;
    },

    setTopNodesTags(state, topNodesTags) {
        state.topNodesTags = topNodesTags;
    },

    setBottomNodesSearchPage(state, pageNumber) {
        state.bottomNodesSearchPage = pageNumber;
    },

    setTotalNumBottomNodes(state, totalNumBottomNodes) {
        state.totalNumBottomNodes = totalNumBottomNodes;
    },

    addBottomNodes(state, bottomNodes) {
        let existingNodeIds = state.bottomNodes.map(node => node.id);
        let newNodes = bottomNodes.filter(node => !existingNodeIds.includes(node.id));
        state.bottomNodes.push(...newNodes);
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
    setNodesPerCategories(state, { groupedNodes, append }) {
        state.nodesPerCategory = append
            ? state.nodesPerCategory.concat(groupedNodes)
            : groupedNodes;
    },
    setQuery(state, value) {
        state.query = value;
        state.searchScrollPosition = 0;
    },
    setTotalNumCategories(state, totalNumCategories) {
        state.totalNumCategories = totalNumCategories;
    },
    setSearchScrollPosition(state, value) {
        state.searchScrollPosition = value;
    },
    setCategoryScrollPosition(state, value) {
        state.categoryScrollPosition = value;
    },
    setSelectedNode(state, node) {
        state.selectedNode = node;
    },
    setDraggingNode(state, value) {
        state.isDraggingNode = value;
    },
    setDescriptionPanel(state, value) {
        state.isDescriptionPanelOpen = value;
    },
    setShowingBottomNodes(state, value) {
        state.isShowingBottomNodes = value;
    }
};

export const actions = {
    async getAllNodes({ commit, state, rootState }, { append }) {
        if (state.nodesPerCategory.length === state.totalNumCategories) {
            return;
        }
        let tagsOffset = append ? firstLoadOffset + state.categoryPage * categoryPageSize : 0;
        let tagsLimit = append ? categoryPageSize : firstLoadOffset;

        if (append) {
            commit('setCategoryPage', state.categoryPage + 1);
        } else {
            commit('setTopNodeSearchPage', 0);
            commit('setCategoryPage', 0);
        }

        const { totalNumGroups, groups } = await getNodesGroupedByTags({
            numNodesPerTag: 6,
            tagsOffset,
            tagsLimit,
            fullTemplateInfo: true
        });

        const { availablePortTypes } = rootState.application;
        const withMappedPorts = groups.map(({ nodes, tag }) => ({
            nodes: nodes.map(toNodeWithFullPorts(availablePortTypes)),
            tag
        }));

        commit('setTotalNumCategories', totalNumGroups);
        commit('setNodesPerCategories', { groupedNodes: withMappedPorts, append });
    },

    /**
     * Fetch nodes. Used for initial data retrieval, but also for searching via query and/or tag filters.
     *
     * @param {*} context - Vuex context.
     * @param {Boolean} append - if the results should be added to the current nodes (for pagination) or if the state
     *      should be cleared (for a new search).
     * @returns {Promise}
     */
    async searchNodes({ commit, state, dispatch, getters, rootState }, { append = false } = {}) {
        // only do request if we search for something
        if (!getters.hasSearchParams) {
            // clear old results
            dispatch('clearSearchResults');
            return;
        }
        if (append) {
            commit('setTopNodeSearchPage', state.topNodeSearchPage + 1);
        } else {
            commit('setTopNodeSearchPage', 0);
        }

        const { nodes, totalNumNodes, tags } = await searchNodes({
            query: state.query,
            tags: state.selectedTags,
            allTagsMatch: true,
            nodeOffset: state.topNodeSearchPage * nodeSearchPageSize,
            nodeLimit: nodeSearchPageSize,
            fullTemplateInfo: true,
            additionalNodes: false
        });

        const { availablePortTypes } = rootState.application;
        const withMappedPorts = nodes.map(toNodeWithFullPorts(availablePortTypes));

        commit('setTotalNumTopNodes', totalNumNodes);
        commit(append ? 'addTopNodes' : 'setTopNodes', withMappedPorts);
        commit('setTopNodesTags', tags);
    },

    /**
     * Fetch nodes that are not part of the collection if an collection is active.
     *
     * @param {*} context - Vuex context.
     * @param {Boolean} append - if the results should be added to the current nodes (for pagination) or if the state
     *      should be cleared (for a new search).
     * @returns {Promise}
     */
    async searchMoreNodes({ commit, state, dispatch, getters, rootState }, { append = false } = {}) {
        // only do request if we search for something
        if (!getters.hasSearchParams) {
            // clear old results
            dispatch('clearSearchResults');
            return;
        }
        if (append) {
            commit('setBottomNodesSearchPage', state.bottomNodesSearchPage + 1);
        } else {
            commit('setBottomNodesSearchPage', 0);
        }

        const { nodes, totalNumNodes, tags } = await searchNodes({
            query: state.query,
            tags: state.selectedTags,
            allTagsMatch: true,
            nodeOffset: state.bottomNodesSearchPage * nodeSearchPageSize,
            nodeLimit: nodeSearchPageSize,
            fullTemplateInfo: true,
            additionalNodes: true
        });

        const { availablePortTypes } = rootState.application;
        const withMappedPorts = nodes.map(toNodeWithFullPorts(availablePortTypes));

        commit('setTotalNumBottomNodes', totalNumNodes);
        commit(append ? 'addBottomNodes' : 'setBottomNodes', withMappedPorts);
        commit('setBottomNodesTags', tags);
    },

    /**
     * Dispatches the search of nodes. If isShowingBottomNodes is true also a search for more nodes is dispatched.
     * Otherwise, the results for more nodes are cleared.
     *
     * @param {*} context - Vuex context.
     * @returns {Promise<void>}
     */
    async searchTopAndBottomNodes({ dispatch, state }) {
        await Promise.all([
            dispatch('searchNodes'),
            state.isShowingBottomNodes
                ? dispatch('searchMoreNodes')
                : dispatch('clearSearchResultsForBottomNodes')
        ]);
    },

    async getNodeDescription({ commit, state, rootState }, { selectedNode }) {
        const { className, settings } = selectedNode.nodeFactory;
        const node = await getNodeDescription({ className, settings });

        const { availablePortTypes } = rootState.application;
        return toNodeWithFullPorts(availablePortTypes)(node);
    },

    /**
     * Update the value of the single search node query
     *
     * @param {*} context - Vuex context.
     * @param {String} value - Search query value
     * @returns {undefined}
     */
    async updateQuery({ commit, dispatch }, value) {
        commit('setQuery', value);
        await dispatch('searchTopAndBottomNodes');
    },

    /**
     * Clear search parameter (query and selectedTags) and results
     *
     * @param {*} context - Vuex context.
     * @returns {undefined}
     */
    async clearSearchParams({ commit, dispatch }) {
        commit('setSelectedTags', []);
        commit('setQuery', '');
        await dispatch('clearSearchResults');
    },

    /**
     * Clear search results (nodes and tags)
     * @param {*} context - Vuex context.
     * @returns {undefined}
     */
    async clearSearchResults({ commit, dispatch }) {
        commit('setTopNodes', null);
        commit('setTopNodesTags', []);
        commit('setTotalNumTopNodes', 0);
        await dispatch('clearSearchResultsForBottomNodes');
    },

    clearSearchResultsForBottomNodes({ commit }) {
        commit('setBottomNodes', null);
        commit('setBottomNodesTags', []);
        commit('setTotalNumBottomNodes', 0);
    },

    clearCategoryResults({ commit }) {
        commit('setNodesPerCategories', { groupedNodes: [], append: false });
        commit('setTotalNumCategories', null);
        commit('setCategoryPage', 0);
        commit('setCategoryScrollPosition', 0);
    },

    /**
     * Fetch the next page of node results.
     *
     * @param {*} context - Vuex context.
     * @returns {undefined}
     */
    async searchTopNodesNextPage({ dispatch, state }) {
        if (state.topNodes?.length !== state.totalNumTopNodes) {
            await dispatch('searchNodes', { append: true });
        }
    },

    /**
     * Fetch the next page of node results for more nodes.
     *
     * @param {*} context - Vuex context.
     * @returns {undefined}
     */
    async searchBottomNodesNextPage({ dispatch, state }) {
        if (state.isShowingBottomNodes && state.bottomNodes?.length !== state.totalNumBottomNodes) {
            await dispatch('searchMoreNodes', { append: true });
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
        commit('setSelectedTags', tags);
        await dispatch('searchTopAndBottomNodes');
    },

    openDescriptionPanel({ commit }) {
        commit('setDescriptionPanel', true);
    },

    closeDescriptionPanel({ commit }) {
        commit('setDescriptionPanel', false);
    },

    async toggleShowingBottomNodes({ commit, dispatch, state }) {
        commit('setShowingBottomNodes', !state.isShowingBottomNodes);
        if (state.isShowingBottomNodes && state.bottomNodes === null) {
            await dispatch('searchMoreNodes');
        }
    },

    async resetSearchAndCategories({ dispatch, getters }) {
        if (getters.searchIsActive) {
            await dispatch('clearSearchResults');
            await dispatch('searchTopAndBottomNodes');
        }
        // Always clear the category results
        await dispatch('clearCategoryResults');
        await dispatch('getAllNodes', { append: false });
    }
};

export const getters = {
    hasSearchParams: state => state.query !== '' || state.selectedTags.length > 0,
    searchIsActive: state => Boolean(state.query || state.topNodesTags.length) && state.topNodes !== null,
    searchResultsContainSelectedNode(state) {
        return Boolean(state.topNodes?.some(node => node.id === state.selectedNode?.id)) ||
            (state.isShowingBottomNodes &&
                Boolean(state.bottomNodes?.some(node => node.id === state.selectedNode?.id)));
    },
    nodesPerCategoryContainSelectedNode(state) {
        return state.nodesPerCategory.some(category => category.nodes.some(
            node => node.id === state.selectedNode?.id
        ));
    },
    isSelectedNodeVisible: (state, getters) => getters.searchIsActive
        ? getters.searchResultsContainSelectedNode
        : getters.nodesPerCategoryContainSelectedNode,
    tagsOfVisibleNodes: state => {
        if (state.isShowingBottomNodes) {
            return [
                ...state.topNodesTags,
                ...state.bottomNodesTags.filter(t => !state.topNodesTags.includes(t))
            ];
        } else {
            return state.topNodesTags;
        }
    }
};
