// eslint-disable-next-line object-curly-newline
import {
    fetchSpaceProvider,
    fetchAllSpaceProviders,
    connectSpaceProvider,
    disconnectSpaceProvider,
    fetchWorkflowGroupContent,
    createWorkflow,
    createFolder,
    openWorkflow,
    importFiles,
    importWorkflows,
    deleteItems,
    moveItems,
    renameItem,
    copyBetweenSpaces
// eslint-disable-next-line object-curly-newline
} from '@api';

import { APP_ROUTES } from '@/router';
import ITEM_TYPES from '@/util/spaceItemTypes';

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
    lastItemForProject: {},
    isLoading: false,
    isCreateWorkflowModalOpen: false
});

export const mutations = {
    setIsLoading(state, value) {
        state.isLoading = value;
    },

    setActiveSpaceProvider(state, value) {
        state.activeSpaceProvider = value;
    },

    setActiveSpaceProviderById(state, spaceProviderId) {
        // this assumes the list of providers has been already loaded
        state.activeSpaceProvider = state.spaceProviders[spaceProviderId];
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

    async fetchAllSpaceProviders({ commit, state, dispatch }) {
        try {
            let spaceProviders = await fetchAllSpaceProviders();

            commit('setIsLoading', true);
            const connectedProviderIds = Object.values(spaceProviders)
                .filter(({ connected, connectionMode }) => connected || connectionMode === 'AUTOMATIC')
                .map(({ id }) => id);

            for (const id of connectedProviderIds) {
                const spacesData = await dispatch('fetchProviderSpaces', { id });
                // use current state of store to ensure the user is kept,
                // it's not part of the response and set by connectProvider
                spaceProviders[id] = { ...state.spaceProviders?.[id], ...spaceProviders[id], ...spacesData };
            }
            commit('setSpaceProviders', spaceProviders);
        } catch (error) {
            consola.error('Error fetching providers', { error });
            throw error;
        } finally {
            commit('setIsLoading', false);
        }
    },

    async fetchProviderSpaces({ commit }, { id }) {
        try {
            const providerData = await fetchSpaceProvider({ spaceProviderId: id });

            return { ...providerData, connected: true };
        } catch (error) {
            consola.error('Error fetching provider spaces', { error });
            throw error;
        }
    },

    async connectProvider({ dispatch, commit, state }, { spaceProviderId }) {
        try {
            commit('setIsLoading', true);
            const user = await connectSpaceProvider({ spaceProviderId });

            if (user) {
                // Only fetch spaces when a valid user was returned
                const updatedProvider = await dispatch('fetchProviderSpaces', { id: spaceProviderId });
                commit('setSpaceProviders', {
                    ...state.spaceProviders,
                    [spaceProviderId]: { ...state.spaceProviders[spaceProviderId], ...updatedProvider, user }
                });
            }
        } catch (error) {
            consola.error('Error connecting to provider', { error });
            throw error;
        } finally {
            commit('setIsLoading', false);
        }
    },

    async disconnectProvider({ commit, state, dispatch }, { spaceProviderId }) {
        try {
            await disconnectSpaceProvider({ spaceProviderId });

            const { spaceProviders } = state;
            const { name, connectionMode } = spaceProviders[spaceProviderId];
            commit('setSpaceProviders', {
                ...state.spaceProviders,
                [spaceProviderId]: { id: spaceProviderId, name, connectionMode, connected: false }
            });
            return spaceProviderId;
        } catch (error) {
            consola.error('Error disconnecting from provider', { error });
            throw error;
        }
    },

    async fetchWorkflowGroupContent({ commit, state }, { itemId = 'root' }) {
        try {
            const { activeSpaceProvider, activeSpace } = state;

            commit('setIsLoading', true);
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
        } finally {
            commit('setIsLoading', false);
        }
    },

    changeDirectory({ dispatch, getters, state }, { pathId }) {
        const itemId = getters.pathToItemId(pathId);
        return dispatch('fetchWorkflowGroupContent', { itemId });
    },

    async createWorkflow({ commit, getters, state, dispatch }) {
        const { id: spaceProviderId } = state.activeSpaceProvider;
        const { spaceId } = state.activeSpace;
        const itemId = getters.currentWorkflowGroupId || 'root';

        try {
            // use global loader because just using the local one for the space explorer
            // is not enough since createWorkflow would also open a new workflow instead of just
            // doing a local operation like fetching data or renaming
            dispatch(
                'application/updateGlobalLoader',
                { loading: true, config: { displayMode: 'transparent' } },
                { root: true }
            );
            const newWorkflowItem = await createWorkflow({ spaceProviderId, spaceId, itemId });
            dispatch(
                'application/updateGlobalLoader',
                { loading: false },
                { root: true }
            );

            dispatch('fetchWorkflowGroupContent', { itemId });
            openWorkflow({ workflowItemId: newWorkflowItem.id, spaceId, spaceProviderId });

            return newWorkflowItem;
        } catch (error) {
            dispatch(
                'application/updateGlobalLoader',
                { loading: false },
                { root: true }
            );
            consola.log('Error creating workflow', { error });
            throw error;
        }
    },

    async createFolder({ dispatch, getters, state, commit }) {
        const { id: spaceProviderId } = state.activeSpaceProvider;
        const { spaceId } = state.activeSpace;
        const itemId = getters.currentWorkflowGroupId;

        try {
            // loading will be cleared after fetching the data by fetchWorkflowGroupContent
            commit('setIsLoading', true);
            const newFolderItem = await createFolder({ spaceId, spaceProviderId, itemId });

            dispatch('fetchWorkflowGroupContent', { itemId });

            return newFolderItem;
        } catch (error) {
            commit('setIsLoading', false);
            consola.log('Error creating folder', { error });
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

        // eslint-disable-next-line no-extra-parens
        const foundOpenProject = openProjects.find(project => (
            project.origin.providerId === spaceProviderId &&
            project.origin.spaceId === spaceId &&
            project.origin.itemId === workflowItemId
        ));

        if (foundOpenProject) {
            $router.push({
                name: APP_ROUTES.WorkflowPage,
                params: { workflowId: 'root', projectId: foundOpenProject.projectId }
            });
            return;
        }

        // use global loader because just using the local one for the space explorer
        // is not enough since openWorkflow would open a new workflow instead of just
        // doing a local operation like fetching data or renaming
        dispatch(
            'application/updateGlobalLoader',
            { loading: true, config: { displayMode: 'transparent' } },
            { root: true }
        );
        openWorkflow({ spaceId, workflowItemId, spaceProviderId });
        dispatch(
            'application/updateGlobalLoader',
            { loading: false },
            { root: true }
        );
    },

    async importToWorkflowGroup({ state, dispatch, getters }, { importType }) {
        const { id: spaceProviderId } = state.activeSpaceProvider;
        const { spaceId } = state.activeSpace;
        const itemId = getters.currentWorkflowGroupId;
        const success = importType === 'FILES'
            ? await importFiles({ spaceProviderId, spaceId, itemId })
            : await importWorkflows({ spaceProviderId, spaceId, itemId });

        if (success) {
            dispatch('fetchWorkflowGroupContent', { itemId });
        }
    },

    async renameItem({ state, getters, dispatch, commit }, { itemId, newName }) {
        const { spaceId } = state.activeSpace;
        const { id: spaceProviderId } = state.activeSpaceProvider;

        try {
            // loading is cleared after data is fetched by fetchWorkflowGroupContent
            commit('setIsLoading', true);
            await renameItem({ spaceProviderId, spaceId, itemId, newName });

            const currentWorkflowGroupId = getters.currentWorkflowGroupId;
            await dispatch('fetchWorkflowGroupContent', { itemId: currentWorkflowGroupId });
        } catch (error) {
            commit('setIsLoading', false);
            consola.log('Error renaming item', { error });
            throw error;
        }
    },

    async deleteItems({ state, getters, dispatch, commit }, { itemIds }) {
        const { spaceId } = state.activeSpace;
        const { id: spaceProviderId } = state.activeSpaceProvider;
        const currentWorkflowGroupId = getters.currentWorkflowGroupId;

        try {
            // loading is cleared after data is fetched by fetchWorkflowGroupContent
            commit('setIsLoading', true);
            await deleteItems({ spaceProviderId, spaceId, itemIds });
            await dispatch('fetchWorkflowGroupContent', { itemId: currentWorkflowGroupId });
        } catch (error) {
            commit('setIsLoading', false);
            consola.log('Error deleting item', { error });
            throw error;
        }
    },

    async moveItems({ state, getters, dispatch, commit }, { itemIds, destWorkflowGroupItemId, collisionStrategy }) {
        const { id: spaceProviderId } = state.activeSpaceProvider;
        const { spaceId } = state.activeSpace;
        const currentWorkflowGroupId = getters.currentWorkflowGroupId;

        try {
            commit('setIsLoading', true);
            await moveItems({ spaceProviderId, spaceId, itemIds, destWorkflowGroupItemId, collisionStrategy });
            await dispatch('fetchWorkflowGroupContent', { itemId: currentWorkflowGroupId });
        } catch (error) {
            consola.log('Error moving items', { error });
            throw error;
        } finally {
            commit('setIsLoading', false);
        }
    },

    copyBetweenSpaces({ state }, { itemIds }) {
        const { id: spaceProviderId } = state.activeSpaceProvider;
        const { spaceId } = state.activeSpace;
        copyBetweenSpaces({ spaceProviderId, spaceId, itemIds });
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
            .filter(item => item.type === ITEM_TYPES.Workflow)
            .map(item => item.id);

        return openProjects
            .filter(project => {
                const { origin } = project;
                return origin.spaceId === spaceId && workflowItemIds.includes(origin.itemId);
            })
            .map(({ origin }) => origin.itemId);
    },

    openedFolderItems({ activeSpace }, _, { application }) {
        if (!activeSpace) {
            return [];
        }

        const { spaceId, activeWorkflowGroup } = activeSpace;
        const { openProjects } = application;

        const openProjectsFolders = openProjects
            .filter(project => project.origin.spaceId === spaceId)
            .flatMap(project => project.origin.ancestorItemIds);

        return activeWorkflowGroup.items
            .filter(item => item.type === ITEM_TYPES.WorkflowGroup && openProjectsFolders.includes(item.id))
            .map(item => item.id);
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
    },

    hasActiveHubSession({ spaceProviders }) {
        if (!spaceProviders) {
            return false;
        }

        return Boolean(
            Object
                .values(spaceProviders)
                .find(({ id, connected }) => id !== 'local' && connected)
        );
    }
};
