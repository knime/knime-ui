import { API } from '@api';
import { toNodeWithFullPorts } from '../util/portDataMapper';
import * as nodeSearch from './common/nodeSearch';

/**
 * Store that manages quick add nodes menu states.
 */

const recommendationLimit = 12;

export const state = () => ({
    ...nodeSearch.state(),
    recommendedNodes: null
});

export const mutations = {
    ...nodeSearch.mutations,

    setRecommendedNodes(state, recommendedNodes) {
        state.recommendedNodes = recommendedNodes;
    }
};

export const actions = {
    ...nodeSearch.actions,

    async getNodeRecommendations({
        commit,
        rootState
    }, { nodeId, portIdx, nodesLimit = recommendationLimit }) {
        const { projectId, info: { containerId: workflowId } } = rootState.workflow.activeWorkflow;
        const { availablePortTypes } = rootState.application;

        // call api
        const recommendedNodesResult = await API.noderepository.getNodeRecommendations({
            workflowId,
            projectId,
            nodeId,
            portIdx,
            nodesLimit,
            fullTemplateInfo: true
        });

        commit('setRecommendedNodes', recommendedNodesResult.map(toNodeWithFullPorts(availablePortTypes)));
    },

    async clearRecommendedNodesAndSearchParams({ commit, dispatch }) {
        commit('setRecommendedNodes', null);
        await dispatch('clearSearchParams');
    }
};

export const getters = {
    ...nodeSearch.getters,

    getFirstResult: (state, getters) => () => {
        if (getters.searchIsActive) {
            return getters.getFirstSearchResult();
        }
        return state.recommendedNodes?.length > 0 ? state.recommendedNodes[0] : null;
    }
};
