import { searchNodes, getNodeTemplates } from '~api';

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
    nodeTemplates: {},
    totalNumNodes: 0,
    selectedTags: [],
    tags: [],
    query: '',
    nodeSearchPage: 0
});

export const actions = {
    /**
     * Utility method to fetch node repository data. Used for initial data retrieval, but also for searching via query
     * and/or tag filters.
     *
     * @param {*} context - Vuex context.
     * @param {Boolean} append - if the results should be added to the current nodes (for pagination) or if the state
     *      should be cleared (for a new search).
     * @returns {undefined}
     */
    async searchNodes({ dispatch, commit, state }, append) {
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
            fullTemplateInfo: nodeSearchTagsLimit
        });
        commit('setTotalNumNodes', res.totalNumNodes);
        if (append) {
            commit('addNodes', res.nodes);
        } else {
            commit('setNodes', res.nodes);
        }
        commit('setTags', res.tags);
        return dispatch('updateNodeTemplates');
    },
    /**
     * Fetch the next page of node results.
     *
     * @param {*} context - Vuex context.
     * @returns {undefined}
     */
    nextNodeSearchPage({ dispatch }) {
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
        dispatch('searchNodes', false);
    },
    /**
     * Remove a tag to the current tag filters.
     *
     * @param {*} context - Vuex context.
     * @param {String} tag - tag to remove.
     * @returns {undefined}
     */
    deselectTag({ dispatch, commit }, tag) {
        commit('removeSelectedTag', tag);
        dispatch('searchNodes', false);
    },
    /**
     * Clear all tag filters.
     *
     * @param {*} context - Vuex context.
     * @returns {undefined}
     */
    clearSelectedTags({ dispatch, commit }) {
        commit('setSelectedTags', []);
        dispatch('searchNodes', false);
    },
    /**
     * Update the stored (cached) node template data.
     *
     * @param {*} context - Vuex context.
     * @returns {undefined}
     */
    async updateNodeTemplates({ commit, state }) {
        let missingTemplates = [
            ...state.nodes.map(n => n.id),
            ...state.nodeCategories.map(s => s.nodes).map(n => n.id)
        ].filter(id => !state.nodeTemplates[id]);
        let res = await getNodeTemplates(missingTemplates);
        commit('updateNodeTemplates', res);
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
            state.nodes.push(node.id);
            if (!state.nodeTemplates[node.id]) {
                state.nodeTemplates[node.id] = node;
            }
        });
    },

    setNodes(state, nodes) {
        state.nodes = nodes.map(node => {
            if (!state.nodeTemplates[node.id]) {
                state.nodeTemplates[node.id] = node;
            }
            return node.id;
        });
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
        state.selectedTags = state.selectedTags.filter(currTag => currTag !== tag);
    },

    setSelectedTags(state, selectedTags) {
        state.selectedTags = selectedTags;
    },

    updateNodeTemplates(state, nodeTemplates) {
        Object.keys(nodeTemplates).forEach(node => { state.nodeTemplate = nodeTemplates[node]; });
    }
};
