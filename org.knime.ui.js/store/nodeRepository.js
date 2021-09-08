import { searchNodes } from '~api';

// TODO: NXT-65 add node category support
// TODO: NXT-115 add node search support

/**
 * Store that manages node repository state.
 */

const nodeSearchPageSize = 21;
const nodeSearchTagsLimit = 10;

export const state = () => ({
    nodes: [],
    nodeCategories: [],
    totalNumNodes: 0,
    selectedTags: [],
    tags: [],
    query: '',
    nodeSearchPage: 0
});

export const actions = {
    /**
     * Fetch nodes. Used for initial data retrieval, but also for searching via query and/or tag filters.
     *
     * @param {*} context - Vuex context.
     * @param {Boolean} append - if the results should be added to the current nodes (for pagination) or if the state
     *      should be cleared (for a new search).
     * @returns {Promise}
     */
    async searchNodes({ dispatch, commit, state }, append = false) {
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
     * Fetch the next page of node results.
     *
     * @param {*} context - Vuex context.
     * @returns {undefined}
     */
     searchNodesNextPage({ dispatch }) {
        dispatch('searchNodes', true);
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
    },

    /**
     * Clear all tag filters.
     *
     * @param {*} context - Vuex context.
     * @returns {undefined}
     */
    clearSelectedTags({ dispatch, commit }) {
        commit('setSelectedTags', []);
        dispatch('searchNodes');
    }
};

export const mutations = {

    setNodeSearchPage(state, pageNumber) {
        state.nodeSearchPage = pageNumber;
    },
    
    setTotalNumNodes(state, totalNumNodes) {
        state.totalNumNodes = totalNumNodes;
    },

    addNodes(state, nodes) {
        nodes.filter(node => !state.nodes.includes(node.id)).forEach(node => {
            state.nodes.push(node);
        });
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
    }
};
