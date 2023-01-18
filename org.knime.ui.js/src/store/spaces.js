// eslint-disable-next-line object-curly-newline
import {
    fetchSpaceProvider,
    fetchAllSpaceProviders,
    connectSpaceProvider,
    disconnectSpaceProvider,
    fetchWorkflowGroupContent,
    createWorkflow,
    openWorkflow
// eslint-disable-next-line object-curly-newline
} from '@api';

import { APP_ROUTES } from '@/router';

export const state = () => ({
    activeSpaceProvider: { id: 'local' },
    activeSpace: {
        spaceId: 'local',
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
    async fetchAllSpaceProviders({ commit, dispatch, state }) {
        try {
            const spaceProviders = await fetchAllSpaceProviders();
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

    async connectProvider({ dispatch }, { spaceProviderId }) {
        try {
            const user = await connectSpaceProvider({ spaceProviderId });

            if (user) {
                // Only fetch spaces when a valid user was returned
                dispatch('fetchProviderSpaces', { id: spaceProviderId, user });
            }
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
    },

    async createWorkflow({ commit, getters, state }) {
        try {
            const { spaceId, activeWorkflowGroup } = state.activeSpace;
            const itemId = getters.currentWorkflowGroupId;
        
            const newWorkflowItem = await createWorkflow({ spaceId, itemId });
            
            const updatedWorkflowGroupItems = activeWorkflowGroup
                .items
                .concat(newWorkflowItem)
                .sort((item1, item2) => {
                    if (item1.type === 'WorflowGroup' && item2.type !== 'WorkflowGroup') {
                        return -1;
                    }
                    
                    if (item1.type !== 'WorflowGroup' && item2.type === 'WorkflowGroup') {
                        return 1;
                    }

                    return item1.name < item2.name ? -1 : 1;
                });
        
            commit('setActiveWorkflowGroupData', {
                path: activeWorkflowGroup.path,
                items: updatedWorkflowGroupItems
            });
            openWorkflow({ workflowItemId: newWorkflowItem.id });
        
            return newWorkflowItem;
        } catch (error) {
            throw error;
        }
    },

    openWorkflow({ rootState, state, dispatch }, { workflowItemId, $router }) {
        const { spaceId } = state.activeSpace;
        const { id: spaceProviderId } = state.activeSpaceProvider;
        const { openProjects } = rootState.application;
        const foundOpenProject = openProjects.find(
            project => project.origin.providerId === spaceProviderId &&
                           project.origin.spaceId === spaceId &&
                           project.origin.itemId === workflowItemId
        );

        if (foundOpenProject) {
            $router.push({
                name: APP_ROUTES.WorkflowPage,
                params: { workflowId: 'root', projectId: foundOpenProject.projectId }
            });
            return;
        }

        openWorkflow({ spaceId, workflowItemId, spaceProviderId });
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
    },

    currentWorkflowGroupId({ activeSpace }) {
        if (!activeSpace.spaceId || !activeSpace.activeWorkflowGroup) {
            return null;
        }

        const { path } = activeSpace.activeWorkflowGroup;

        return path.length > 0 ? path[path.length - 1].id : 'root';
    },

    openedWorkflowItems({ activeSpace }, _, { application }) {
        if (!activeSpace) {
            return [];
        }

        const { spaceId, activeWorkflowGroup } = activeSpace;
        const { openProjects } = application;
        
        const workflowItemIds = activeWorkflowGroup.items
            .filter(item => item.type === 'Workflow')
            .map(item => item.id);

        return openProjects
            .filter(project => {
                const { origin } = project;
                return origin.spaceId === spaceId && workflowItemIds.includes(origin.itemId);
            })
            .map(({ origin }) => origin.itemId);
    },

    activeSpaceInfo({ activeSpace, activeSpaceProvider }) {
        const activeId = activeSpace.spaceId;
        const space = activeSpaceProvider.spaces.find(space => space.id === activeId);

        if (activeSpaceProvider.local) {
            return {
                local: true,
                private: false,
                name: activeSpaceProvider.name
            };
        }

        if (space) {
            return {
                local: false,
                private: space.private,
                name: space.name
            };
        }
        

        return {};
    }
};
