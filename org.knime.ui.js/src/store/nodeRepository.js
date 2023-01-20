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
    includeAll: false,

    /* node description */
    selectedNode: null,
    nodeDescriptionObject: null,

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
    setNodeDescription(state, nodeDescriptionObject) {
        state.nodeDescriptionObject = nodeDescriptionObject;
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
    setIncludeAll(state, value) {
        state.includeAll = value;
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
            fullTemplateInfo: true,
            includeAll: !rootState.application.nodeRepoFilterEnabled
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
            includeAll: state.includeAll
        });

        const { availablePortTypes } = rootState.application;
        const withMappedPorts = nodes.map(toNodeWithFullPorts(availablePortTypes));

        commit('setTotalNumNodes', totalNumNodes);

        const nodesMutation = append ? 'addNodes' : 'setNodes';
        commit(nodesMutation, withMappedPorts);
        
        commit('setTags', tags);
    },

    async getNodeDescription({ commit, state, rootState }) {
        const node = await getNodeDescription({
            className: state.selectedNode.nodeFactory.className,
            settings: state.selectedNode.nodeFactory.settings
        });

        const { availablePortTypes } = rootState.application;
        const withMappedPorts = toNodeWithFullPorts(availablePortTypes)(node);

        commit('setNodeDescription', withMappedPorts);
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
        // Show a filtered result for the new query by setting includeAll to false
        await dispatch('resetIncludeAll');
        await dispatch('searchNodes');
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
        await dispatch('resetIncludeAll');
        await dispatch('clearSearchResults');
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
        await dispatch('searchNodes', { append: true });
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
        // Set includeAll to false to filter the next search if no tag is selected
        // We do not want to reset the state of the filtered search if only tags are selected or deselected
        if (tags.length === 0) {
            await dispatch('resetIncludeAll');
        }
        await dispatch('searchNodes');
    },

    resetIncludeAll({ commit, rootState }) {
        // If the node repository is not filtered includeAll must always be true
        // -> We always get all results and never show the "Show more" button
        if (rootState.application.nodeRepoFilterEnabled) {
            commit('setIncludeAll', false);
        }
    },

    /**
     * Set the includeAll flag to true and dispatch searchNodes if the search is active.
     * The includeAll value will stay until the search changes.
     *
     * @param {*} context - Vuex context.
     * @param {boolean} includeAll - if all nodes should be included in the next search
     * @returns {undefined}
     */
    async setIncludeAllAndSearchNodes({ commit, dispatch, getters }, includeAll) {
        commit('setIncludeAll', includeAll);
        if (getters.searchIsActive) {
            await dispatch('searchNodes');
        }
    },

    openDescriptionPanel({ commit }) {
        commit('setDescriptionPanel', true);
    },

    closeDescriptionPanel({ commit }) {
        commit('setDescriptionPanel', false);
    }
};

export const getters = {
    hasSearchParams: state => state.query !== '' || state.selectedTags.length > 0,
    searchIsActive: state => Boolean(state.query || state.tags.length) && state.nodes !== null,
    searchResultsContainSelectedNode: (state) => Boolean(state.nodes?.some(node => node.id === state.selectedNode?.id)),
    nodesPerCategoryContainSelectedNode(state) {
        return state.nodesPerCategory.some(category => category.nodes.some(
            node => node.id === state.selectedNode?.id
        ));
    },
    selectedNodeIsVisible: (state, getters) => getters.searchIsActive
        ? getters.searchResultsContainSelectedNode
        : getters.nodesPerCategoryContainSelectedNode
};
