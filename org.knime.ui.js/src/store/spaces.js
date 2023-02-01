// eslint-disable-next-line object-curly-newline
import {
    fetchSpaceProvider,
    fetchAllSpaceProviders,
    connectSpaceProvider,
    disconnectSpaceProvider,
    fetchWorkflowGroupContent,
    createWorkflow,
    openWorkflow,
    importFiles,
    importWorkflows
// eslint-disable-next-line object-curly-newline
} from '@api';

import { APP_ROUTES } from '@/router';

export const state = () => ({
    activeSpaceProvider: { id: 'local' },
    activeSpace: {
        spaceId: 'local',
        activeWorkflowGroup: null,
        startItemId: null
    },
    spaceProviders: null,
    // state of the global space browser (tab with knime icon)
    spaceBrowser: {
        spaceId: null,
        spaceProviderId: null,
        itemId: 'root'
    },
    // map of projectId: itemId of last used item by any project
    lastItemForProject: {}
});

export const mutations = {
    setActiveSpaceProvider(state, value) {
        state.activeSpaceProvider = value;
    },

    setActiveSpaceProviderById(state, spaceProviderId) {
        // this assumes the provider has been already loaded
        state.activeSpaceProvider = spaceProviderId === 'local'
            ? { id: 'local' }
            : state.spaceProviders[spaceProviderId];
    },

    setActiveSpaceId(state, value) {
        state.activeSpace.spaceId = value;
    },

    setStartItemId(state, itemId) {
        state.activeSpace.startItemId = itemId;
    },

    clearSpaceBrowserState(state) {
        state.spaceBrowser = {
            spaceId: null,
            spaceProviderId: null,
            itemId: 'root'
        };
    },

    setSpaceBrowserState(state, data) {
        state.spaceBrowser = data;
    },

    clearLastItemForProject(state, { projectId }) {
        // eslint-disable-next-line no-unused-vars
        const { [projectId]: _, ...result } = state.lastItemForProject;
        state.lastItemForProject = result;
    },

    setLastItemForProject(state, { projectId, itemId }) {
        state.lastItemForProject = { ...state.lastItemForProject, [projectId]: itemId };
    },

    setActiveWorkflowGroupData(state, data) {
        state.activeSpace.activeWorkflowGroup = data;
    },

    setSpaceProviders(state, value) {
        state.spaceProviders = value;
    }
};

export const actions = {
    saveLastItemForProject({ commit, getters, rootState }, { itemId, projectId } = {}) {
        itemId = itemId || getters.currentWorkflowGroupId;
        projectId = projectId || rootState.application.activeProjectId;
        commit('setLastItemForProject', { projectId, itemId });
    },

    saveSpaceBrowserState({ commit, getters, state }, { itemId = 'root' } = {}) {
        commit('setSpaceBrowserState', {
            spaceId: state.activeSpace?.spaceId,
            spaceProviderId: state.activeSpaceProvider?.id,
            itemId
        });
    },

    loadSpaceBrowserState({ commit, state }) {
        if (state.spaceBrowser.spaceProviderId && state.spaceBrowser.spaceId) {
            commit('setActiveSpaceProviderById', state.spaceBrowser.spaceProviderId);
            commit('setActiveSpaceId', state.spaceBrowser.spaceId);
            commit('setStartItemId', state.spaceBrowser.itemId || 'root');
            // clear data to avoid display of old states
            commit('setActiveWorkflowGroupData', null);
        }
    },

    async fetchAllSpaceProviders({ commit, dispatch }) {
        try {
            let spaceProviders = await fetchAllSpaceProviders();

            const connectedProviderIds = Object.values(spaceProviders)
                .filter(({ connected, connectionMode }) => connected || connectionMode === 'AUTOMATIC')
                .map(({ id }) => id);

            for (const id of connectedProviderIds) {
                const spacesData = await dispatch('fetchProviderSpaces', { id });
                spaceProviders[id] = { ...spaceProviders[id], ...spacesData };
            }

            commit('setSpaceProviders', spaceProviders);
        } catch (error) {
            consola.error('Error fetching providers', { error });
            throw error;
        }
    },

    async fetchProviderSpaces({ commit }, { id, user = null }) {
        try {
            const providerData = await fetchSpaceProvider({ spaceProviderId: id });

            return { ...providerData, connected: true, user };
        } catch (error) {
            consola.error('Error fetching provider spaces', { error });
            throw error;
        }
    },

    async connectProvider({ dispatch, commit, state }, { spaceProviderId }) {
        try {
            const user = await connectSpaceProvider({ spaceProviderId });

            if (user) {
                // Only fetch spaces when a valid user was returned
                const updatedProvider = await dispatch('fetchProviderSpaces', { id: spaceProviderId, user });
                commit('setSpaceProviders', {
                    ...state.spaceProviders,
                    [spaceProviderId]: { ...state.spaceProviders[spaceProviderId], ...updatedProvider }
                });
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
        const itemId = getters.pathToItemId(pathId);
        return dispatch('fetchWorkflowGroupContent', { itemId });
    },

    async createWorkflow({ commit, getters, state, dispatch }) {
        try {
            const { spaceId } = state.activeSpace;
            const itemId = getters.currentWorkflowGroupId;

            const newWorkflowItem = await createWorkflow({ spaceId, itemId });

            dispatch('fetchWorkflowGroupContent', { itemId });
            openWorkflow({ workflowItemId: newWorkflowItem.id });

            return newWorkflowItem;
        } catch (error) {
            throw error;
        }
    },

    openWorkflow({ rootState, state, dispatch }, { workflowItemId, $router, spaceId = null, spaceProviderId = null }) {
        if (spaceId === null) {
            spaceId = state.activeSpace.spaceId;
        }
        if (spaceProviderId === null) {
            spaceProviderId = state.activeSpaceProvider.id;
        }
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
    },

    async importToWorkflowGroup({ dispatch, getters }, { importType }) {
        const itemId = getters.currentWorkflowGroupId;
        const success = importType === 'FILES' ? await importFiles({ itemId }) : await importWorkflows({ itemId });
        if (success) {
            dispatch('fetchWorkflowGroupContent', { itemId });
        }
    }
};

export const getters = {

    pathToItemId: (state, getters) => (pathId) => {
        const isGoingBack = pathId === '..';
        if (isGoingBack) {
            return getters.parentWorkflowGroupId;
        }
        return pathId;
    },

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

        if (activeId === 'local') {
            return {
                local: true,
                private: false,
                name: 'Local space'
            };
        }

        const space = activeSpaceProvider.spaces.find(space => space.id === activeId);

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
