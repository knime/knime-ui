import { fetchWorkflowGroupContent } from '@api';

export const state = () => ({
    spaceId: 'local',
    currentWorkflowGroup: null
});

export const mutations = {
    setSpaceId(state, value) {
        state.spaceId = value;
    },

    setCurrentWorkflowGroup(state, data) {
        state.currentWorkflowGroup = data;
    }
};

export const actions = {
    async fetchWorkflowGroupContent({ commit }, { spaceId = 'local', itemId = 'root' }) {
        const data = await fetchWorkflowGroupContent({ spaceId, itemId });
        
        commit('setCurrentWorkflowGroup', data);
        return data;
    },

    changeDirectory({ dispatch, getters }, { pathId }) {
        const isGoingBack = pathId === '..';

        const nextWorkflowGroupId = isGoingBack
            ? getters.parentWorkflowGroupId
            : pathId;

        return dispatch('fetchWorkflowGroupContent', { itemId: nextWorkflowGroupId });
    }
};

export const getters = {
    parentWorkflowGroupId(state) {
        const { currentWorkflowGroup: { path } } = state;

        // we're already at the root, there's no parent
        if (path.length === 0) {
            return null;
        }

        // when we're down to 1 item it means we're 1 level away from the root
        return path.length === 1 ? 'root' : path[path.length - 2].id;
    }
};
