/**
 * Store that manages the global state of the side-panel (tabs plus expanding drawer).
 */

const TABS = {
    WORKFLOW_METADATA: 'workflowMetadata',
    NODE_REPOSITORY: 'nodeRepository'
};

export const state = () => ({
    expanded: false,
    activeTab: TABS.WORKFLOW_METADATA
});

export const getters = {
    workflowMetaActive: state => state.activeTab === TABS.WORKFLOW_METADATA,
    nodeRepositoryActive: state => state.activeTab === TABS.NODE_REPOSITORY
};

export const mutations = {
    toggleExpanded(state) {
        state.expanded = !state.expanded;
    },

    setActiveTab(state, active) {
        state.activeTab = active;
    }
};

export const actions = {
    toggleExpanded({ commit }) {
        commit('toggleExpanded');
    },
    
    setWorkflowMetaActive({ commit, state }) {
        commit('setActiveTab', TABS.WORKFLOW_METADATA);
        if (!state.expanded) {
            commit('toggleExpanded');
        }
    },

    setNodeRepositoryActive({ commit, state }) {
        commit('setActiveTab', TABS.NODE_REPOSITORY);
        if (!state.expanded) {
            commit('toggleExpanded');
        }
    }
};
