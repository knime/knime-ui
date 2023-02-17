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
    nodes: null,
    totalNumNodes: 0,
    selectedTags: [],
    tags: [],
    query: '',
    nodeSearchPage: 0,
    searchScrollPosition: 0,
    showingMoreNodes: false,
    moreNodes: null,
    totalNumMoreNodes: 0,
    moreTags: [],
    moreNodesSearchPage: 0,

    /* node interaction */
    selectedNode: null,
    isDraggingNode: false,
    isDescriptionPanelOpen: false
});

export const mutations = {

    setCategoryPage(state, pageNumber) {
        state.categoryPage = pageNumber;
    },
    setNodeSearchPage(state, pageNumber) {
        state.nodeSearchPage = pageNumber;
    },

    setTotalNumNodes(state, totalNumNodes) {
        state.totalNumNodes = totalNumNodes;
    },

    addNodes(state, nodes) {
        let existingNodeIds = state.nodes.map(node => node.id);
        let newNodes = nodes.filter(node => !existingNodeIds.includes(node.id));
        state.nodes.push(...newNodes);
    },

    setNodes(state, nodes) {
        state.nodes = nodes;
    },

    setTags(state, tags) {
        state.tags = tags;
    },

    setMoreNodesSearchPage(state, pageNumber) {
        state.moreNodesSearchPage = pageNumber;
    },

    setTotalNumMoreNodes(state, totalNumMoreNodes) {
        state.totalNumMoreNodes = totalNumMoreNodes;
    },

    addMoreNodes(state, moreNodes) {
        let existingNodeIds = state.moreNodes.map(node => node.id);
        let newNodes = moreNodes.filter(node => !existingNodeIds.includes(node.id));
        state.moreNodes.push(...newNodes);
    },

    setMoreNodes(state, moreNodes) {
        state.moreNodes = moreNodes;
    },

    setMoreTags(state, moreTags) {
        state.moreTags = moreTags;
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
    setShowingMoreNodes(state, value) {
        state.showingMoreNodes = value;
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
            commit('setNodeSearchPage', 0);
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
            commit('setNodeSearchPage', state.nodeSearchPage + 1);
        } else {
            commit('setNodeSearchPage', 0);
        }

        const { nodes, totalNumNodes, tags } = await searchNodes({
            query: state.query,
            tags: state.selectedTags,
            allTagsMatch: true,
            nodeOffset: state.nodeSearchPage * nodeSearchPageSize,
            nodeLimit: nodeSearchPageSize,
            fullTemplateInfo: true,
            inCollection: true
        });

        const { availablePortTypes } = rootState.application;
        const withMappedPorts = nodes.map(toNodeWithFullPorts(availablePortTypes));

        commit('setTotalNumNodes', totalNumNodes);
        commit(append ? 'addNodes' : 'setNodes', withMappedPorts);
        commit('setTags', tags);
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
            commit('setMoreNodesSearchPage', state.moreNodesSearchPage + 1);
        } else {
            commit('setMoreNodesSearchPage', 0);
        }

        const { nodes, totalNumNodes, tags } = await searchNodes({
            query: state.query,
            tags: state.selectedTags,
            allTagsMatch: true,
            nodeOffset: state.moreNodesSearchPage * nodeSearchPageSize,
            nodeLimit: nodeSearchPageSize,
            fullTemplateInfo: true,
            inCollection: false
        });

        const { availablePortTypes } = rootState.application;
        const withMappedPorts = nodes.map(toNodeWithFullPorts(availablePortTypes));

        commit('setTotalNumMoreNodes', totalNumNodes);
        commit(append ? 'addMoreNodes' : 'setMoreNodes', withMappedPorts);
        commit('setMoreTags', tags);
    },

    /**
     * Dispatches the search of nodes. If showingMoreNodes is true also a search for more nodes is dispatched.
     * Otherwise, the results for more nodes are cleared.
     *
     * @param {*} context - Vuex context.
     * @returns {Promise<void>}
     */
    async searchNodesAndMoreNodes({ dispatch, state }) {
        await Promise.all([
            dispatch('searchNodes'),
            state.showingMoreNodes
                ? dispatch('searchMoreNodes')
                : dispatch('clearSearchResultsForMoreNodes')
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
        await dispatch('searchNodesAndMoreNodes');
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
        commit('setNodes', null);
        commit('setTags', []);
        commit('setTotalNumNodes', 0);
        await dispatch('clearSearchResultsForMoreNodes');
    },

    clearSearchResultsForMoreNodes({ commit }) {
        commit('setMoreNodes', null);
        commit('setMoreTags', []);
        commit('setTotalNumMoreNodes', 0);
    },

    /**
     * Fetch the next page of node results.
     *
     * @param {*} context - Vuex context.
     * @returns {undefined}
     */
    async searchNodesNextPage({ dispatch, state }) {
        if (state.nodes?.length !== state.totalNumNodes) {
            await dispatch('searchNodes', { append: true });
        }
    },

    /**
     * Fetch the next page of node results for more nodes.
     *
     * @param {*} context - Vuex context.
     * @returns {undefined}
     */
    async searchMoreNodesNextPage({ dispatch, state }) {
        if (state.showingMoreNodes && state.moreNodes?.length !== state.totalNumMoreNodes) {
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
        await dispatch('searchNodesAndMoreNodes');
    },

    openDescriptionPanel({ commit }) {
        commit('setDescriptionPanel', true);
    },

    closeDescriptionPanel({ commit }) {
        commit('setDescriptionPanel', false);
    },

    async toggleShowingMoreNodes({ commit, dispatch, state }) {
        commit('setShowingMoreNodes', !state.showingMoreNodes);
        if (state.showingMoreNodes && state.moreNodes === null) {
            await dispatch('searchMoreNodes');
        }
    }
};

export const getters = {
    hasSearchParams: state => state.query !== '' || state.selectedTags.length > 0,
    searchIsActive: state => Boolean(state.query || state.tags.length) && state.nodes !== null,
    searchResultsContainSelectedNode(state) {
        return Boolean(state.nodes?.some(node => node.id === state.selectedNode?.id)) ||
            Boolean(state.moreNodes?.some(node => node.id === state.selectedNode?.id));
    },
    nodesPerCategoryContainSelectedNode(state) {
        return state.nodesPerCategory.some(category => category.nodes.some(
            node => node.id === state.selectedNode?.id
        ));
    },
    selectedNodeIsVisible: (state, getters) => getters.searchIsActive
        ? getters.searchResultsContainSelectedNode
        : getters.nodesPerCategoryContainSelectedNode
};
