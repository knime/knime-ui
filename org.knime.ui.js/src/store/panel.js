/**
 * Store that manages the global state of the side-panel (tabs plus expanding drawer).
 */

export const TABS = {
    WORKFLOW_METADATA: 'workflowMetadata',
    NODE_REPOSITORY: 'nodeRepository',
    NODE_DIALOG: 'nodeDialog',
    SPACE_EXPLORER: 'spaceExplorer'
};

export const state = () => ({
    expanded: true,
    activeTab: {}
});

export const actions = {
    setCurrentProjectActiveTab({ commit, rootState }, activeTab) {
        const projectId = rootState.application.activeProjectId;
        if (projectId === null) {
            return;
        }
        commit('setActiveTab', { projectId, activeTab });
    }
};

export const mutations = {
    setActiveTab(state, { projectId, activeTab }) {
        state.activeTab = {
            ...state.activeTab,
            [projectId]: activeTab
        };
        state.expanded = true;
    },
    toggleExpanded(state) {
        state.expanded = !state.expanded;
    },
    closePanel(state) {
        state.expanded = false;
    }
};
