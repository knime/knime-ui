import { searchNodes, getNodesGroupedByTags, getNodeDescription } from '~api';

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
    
    /* node description */
    selectedNode: null,
    nodeDescriptionObject: null
});

export const getters = {
    hasSearchParams: state => state.query !== '' || state.selectedTags.length > 0,
    searchIsActive: state => Boolean(state.query || state.tags.length) && state.nodes !== null
};

export const actions = {
    async getAllNodes({ commit, state }, append) {
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
        let res = await getNodesGroupedByTags({
            numNodesPerTag: 6,
            tagsOffset,
            tagsLimit,
            fullTemplateInfo: true
        });
        commit('setTotalNumCategories', res.totalNumSelections);
        if (append) {
            commit('addNodesPerCategories', res.selections);
        } else {
            commit('setNodesPerCategories', res.selections);
        }
    },

    /**
     * Fetch nodes. Used for initial data retrieval, but also for searching via query and/or tag filters.
     *
     * @param {*} context - Vuex context.
     * @param {Boolean} append - if the results should be added to the current nodes (for pagination) or if the state
     *      should be cleared (for a new search).
     * @returns {Promise}
     */
    async searchNodes({ commit, state, dispatch, getters }, append = false) {
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

        let res = await searchNodes({
            query: state.query,
            tags: state.selectedTags,
            allTagsMatch: true,
            nodeOffset: state.nodeSearchPage * nodeSearchPageSize,
            nodeLimit: nodeSearchPageSize,
            fullTemplateInfo: true
        });
        commit('setTotalNumNodes', res.totalNumNodes);
        if (append) {
            commit('addNodes', res.nodes);
        } else {
            commit('setNodes', res.nodes);
        }
        commit('setTags', res.tags);
    },

    async getNodeDescription({ commit, state }) {
        let results = await getNodeDescription({
            className: state.selectedNode.nodeFactory.className,
            settings: state.selectedNode.nodeFactory.settings
        });

        commit('setNodeDescription', results);
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
        await dispatch('searchNodes');
    },

    /**
     * Clear search parameter (query and selectedTags) and results
     *
     * @param {*} context - Vuex context.
     * @returns {undefined}
     */
    clearSearchParams({ commit, dispatch }) {
        commit('setSelectedTags', []);
        commit('setQuery', '');
        dispatch('clearSearchResults');
    },

    /**
     * Clear search results (nodes and tags)
     * @param {*} context - Vuex context.
     * @returns {undefined}
     */
    clearSearchResults({ commit }) {
        commit('setNodes', null);
        commit('setTags', []);
    },

    /**
     * Fetch the next page of node results.
     *
     * @param {*} context - Vuex context.
     * @returns {undefined}
     */
    async searchNodesNextPage({ dispatch }) {
        await dispatch('searchNodes', true);
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
        await dispatch('searchNodes');
    }
};

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

    setSelectedTags(state, selectedTags) {
        state.selectedTags = selectedTags;
        state.searchScrollPosition = 0;
    },
    setNodesPerCategories(state, groupedNodes) {
        state.nodesPerCategory = groupedNodes;
    },
    addNodesPerCategories(state, groupedNodes) {
        state.nodesPerCategory = state.nodesPerCategory.concat(groupedNodes);
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
    setNodeDescription(state, nodeDescriptionObject) {
        state.nodeDescriptionObject = nodeDescriptionObject;
    },
    setSelectedNode(state, node) {
        state.selectedNode = node;
    }
};
