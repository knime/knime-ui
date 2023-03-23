import { API } from '@api';
import { toNodeWithFullPorts } from '../util/portDataMapper';
import * as nodeSearch from './common/nodeSearch';

/**
 * Store that manages quick add nodes menu states. Shares the search with nodeRepository
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
    }
};

export const getters = {
    ...nodeSearch.getters
};
