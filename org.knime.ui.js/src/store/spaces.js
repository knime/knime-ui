// eslint-disable-next-line object-curly-newline
import {
    fetchSpaceProvider,
    fetchAllSpaceProviders,
    connectSpaceProvider,
    disconnectSpaceProvider,
    fetchWorkflowGroupContent
// eslint-disable-next-line object-curly-newline
} from '@api';

export const state = () => ({
    activeSpaceProvider: null,
    activeSpace: {
        spaceId: null,
        activeWorkflowGroup: null
    },
    spaceProviders: null
});

export const mutations = {
    setActiveSpaceProvider(state, value) {
        state.activeSpaceProvider = value;
    },

    setActiveSpaceId(state, value) {
        state.activeSpace.spaceId = value;
    },

    setActiveWorkflowGroupData(state, data) {
        state.activeSpace.activeWorkflowGroup = data;
    },

    setSpaceProviders(state, value) {
        state.spaceProviders = value;
    }
};

export const actions = {
    fetchAllSpaceProviders({ commit, dispatch, state }) {
        try {
            const spaceProviders = fetchAllSpaceProviders();
            commit('setSpaceProviders', spaceProviders);
            
            const connectedProviderIds = Object.values(spaceProviders)
                .filter(({ connected, connectionMode }) => connected || connectionMode === 'AUTOMATIC')
                .map(({ id }) => id);

            connectedProviderIds.forEach((id) => dispatch('fetchProviderSpaces', { id }));
        } catch (error) {
            consola.error('Error fetching providers', { error });
            throw error;
        }
    },

    async fetchProviderSpaces({ state, commit }, { id, user = null }) {
        try {
            const { spaceProviders } = state;

            const providerData = await fetchSpaceProvider({ spaceProviderId: id });

            const updatedProvider = { ...spaceProviders[id], ...providerData, connected: true, user };
        
            commit('setSpaceProviders', {
                ...state.spaceProviders,
                [id]: updatedProvider
            });
        } catch (error) {
            consola.error('Error fetching provider spaces', { error });
            throw error;
        }
    },

    connectProvider({ dispatch }, { spaceProviderId }) {
        try {
            const user = connectSpaceProvider({ spaceProviderId });
            
            dispatch('fetchProviderSpaces', { id: spaceProviderId, user });
        } catch (error) {
            consola.error('Error connecting to provider', { error });
            throw error;
        }
    },

    disconnectProvider({ commit, state }, { spaceProviderId }) {
        try {
            disconnectSpaceProvider({ spaceProviderId });

            const { spaceProviders } = state;
            const { name, connectionMode } = spaceProviders[spaceProviderId];
            commit('setSpaceProviders', {
                ...state.spaceProviders,
                [spaceProviderId]: { id: spaceProviderId, name, connectionMode, connected: false }
            });
        } catch (error) {
            consola.error('Error disconnecting from provider', { error });
            throw error;
        }
    },

    async fetchWorkflowGroupContent({ commit, state }, { itemId = 'root' }) {
        try {
            if (!state.activeSpace || !state.activeSpaceProvider) {
                commit('setActiveSpaceId', 'local');
                commit('setActiveSpaceProvider', { id: 'local' });
            }

            const { activeSpaceProvider, activeSpace } = state;
            
            const data = await fetchWorkflowGroupContent({
                spaceProviderId: activeSpaceProvider.id,
                spaceId: activeSpace.spaceId,
                itemId
            });
        
            commit('setActiveWorkflowGroupData', data);
            return data;
        } catch (error) {
            consola.error('Error trying to fetch workflow group content', { error });
            throw error;
        }
    },

    changeDirectory({ dispatch, getters, state }, { pathId }) {
        const { spaceId } = state.activeSpace;
        const isGoingBack = pathId === '..';

        const nextWorkflowGroupId = isGoingBack
            ? getters.parentWorkflowGroupId
            : pathId;

        return dispatch('fetchWorkflowGroupContent', { itemId: nextWorkflowGroupId, spaceId });
    }
};

export const getters = {
    parentWorkflowGroupId({ activeSpace }) {
        if (!activeSpace.spaceId || !activeSpace.activeWorkflowGroup) {
            return null;
        }

        const { path } = activeSpace.activeWorkflowGroup;

        // we're already at the root, there's no parent
        if (path.length === 0) {
            return null;
        }

        // when we're down to 1 item it means we're 1 level away from the root
        return path.length === 1 ? 'root' : path[path.length - 2].id;
    }
};
