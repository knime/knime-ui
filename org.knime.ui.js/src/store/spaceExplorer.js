import { getSpaceItems } from '@api';

export const state = () => ({
    spaceId: 'local',
    spaceDirectory: null
});

export const mutations = {
    setSpaceId(state, value) {
        state.spaceId = value;
    },

    setSpaceDirectory(state, spaceDirectoryData) {
        state.spaceDirectory = spaceDirectoryData;
    }
};

export const actions = {
    async fetchSpaceItems({ commit }, { spaceId = 'local', itemId = 'root' }) {
        const data = await getSpaceItems({ spaceId, itemId });
        
        commit('setSpaceDirectory', data);
        return data;
    },

    changeDirectory({ dispatch, getters }, { pathId }) {
        const isGoingBack = pathId === '..';

        const nextSpaceDirectoryId = isGoingBack
            ? getters.parentDirectoryId
            : pathId;

        return dispatch('fetchSpaceItems', { itemId: nextSpaceDirectoryId });
    }
};

export const getters = {
    parentDirectoryId(state) {
        const { spaceDirectory: { pathIds } } = state;

        // when we're down to 1 item it means we're 1 level away from the root
        return pathIds.length === 1 ? 'root' : pathIds[pathIds.length - 2];
    }
};
