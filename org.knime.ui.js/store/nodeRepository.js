import { searchNodes, getNodesGroupedByTags } from '~api';


/**
 * Store that manages node repository state.
 */

const nodeSearchPageSize = 21;
const categoryPageSize = 3;
const firstLoadOffset = 6;

export const state = () => ({
    nodesPerCategory: [],
    totalNumCategories: null,
    nodes: [],
    totalNumNodes: 0,
    selectedTags: [],
    tags: [],
    query: '',
    nodeSearchPage: 0,
    categoryPage: 0,
    scrollPosition: 0
});

export const getters = {
    hasSearchParams: state => state.query !== '' || state.selectedTags.length > 0
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
        commit('setNodes', []);
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
     * Add a tag to the current tag filters.
     *
     * @param {*} context - Vuex context.
     * @param {String} tag - tag to add.
     * @returns {undefined}
     */
    selectTag({ dispatch, commit }, tag) {
        commit('addSelectedTag', tag);
        dispatch('searchNodes');
    },

    /**
     * Remove a tag from the current tag filters.
     *
     * @param {*} context - Vuex context.
     * @param {String} tag - tag to remove.
     * @returns {undefined}
     */
    deselectTag({ dispatch, commit }, tag) {
        commit('removeSelectedTag', tag);
        dispatch('searchNodes');
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

    addTag(state, tag) {
        if (!state.tags.includes(tag)) {
            state.tags.push(tag);
        }
    },

    setTags(state, tags) {
        state.tags = tags;
    },

    addSelectedTag(state, tag) {
        if (!state.selectedTags.includes(tag)) {
            state.selectedTags.push(tag);
        }
    },

    removeSelectedTag(state, tag) {
        state.selectedTags = state.selectedTags.filter(currentTag => currentTag !== tag);
    },

    setSelectedTags(state, selectedTags) {
        state.selectedTags = selectedTags;
    },
    setNodesPerCategories(state, groupedNodes) {
        state.nodesPerCategory = groupedNodes;
    },
    addNodesPerCategories(state, groupedNodes) {
        state.nodesPerCategory = state.nodesPerCategory.concat(groupedNodes);
    },
    setQuery(state, value) {
        state.query = value;
    },
    setTotalNumCategories(state, totalNumCategories) {
        state.totalNumCategories = totalNumCategories;
    },
    setScrollPosition(state, value) {
        state.scrollPosition = value;
    }
};
