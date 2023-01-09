import { fetchWorkflowGroupContent, openWorkflow } from '@api';
import { APP_ROUTES } from '@/router';

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
    },

    openWorkflow({ rootState, state, dispatch }, { workflowItemId, $router }) {
        const { spaceId } = state;
        const { openProjects } = rootState.application;
        const foundOpenProject = openProjects.find(
            project => project.origin.spaceId === spaceId && project.origin.itemId === workflowItemId
        );

        if (foundOpenProject) {
            $router.push({
                name: APP_ROUTES.WorkflowPage.name,
                params: { workflowId: 'root', projectId: foundOpenProject.projectId }
            });
            return;
        }

        openWorkflow({ spaceId, workflowItemId });
    }
};

export const getters = {
    parentWorkflowGroupId({ currentWorkflowGroup }) {
        const { path } = currentWorkflowGroup;

        // we're already at the root, there's no parent
        if (path.length === 0) {
            return null;
        }

        // when we're down to 1 item it means we're 1 level away from the root
        return path.length === 1 ? 'root' : path[path.length - 2].id;
    },

    openedWorkflowItems({ spaceId, currentWorkflowGroup }, _, { application }) {
        if (!currentWorkflowGroup) {
            return [];
        }

        const { openProjects } = application;
        
        const currentWorkflowGroupItemIds = currentWorkflowGroup.items
            .filter(item => item.type === 'Workflow')
            .map(item => item.id);

        return openProjects
            .filter(project => {
                const { origin } = project;
                return origin.spaceId === spaceId && currentWorkflowGroupItemIds.includes(origin.itemId);
            })
            .map(({ origin }) => origin.itemId);
    }
};
