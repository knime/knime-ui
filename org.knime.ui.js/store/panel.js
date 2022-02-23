/**
 * Store that manages the global state of the side-panel (tabs plus expanding drawer).
 */

const TABS = {
    WORKFLOW_METADATA: 'workflowMetadata',
    NODE_REPOSITORY: 'nodeRepository'
};

export const state = () => ({
    expanded: false,
    activeTab: TABS.WORKFLOW_METADATA,
    activeDescriptionPanel: false
});

export const getters = {
    workflowMetaActive: state => state.activeTab === TABS.WORKFLOW_METADATA,
    nodeRepositoryActive: state => state.activeTab === TABS.NODE_REPOSITORY
};

export const mutations = {
    setExpanded(state, value) {
        state.expanded = value;
    },
    setActiveTab(state, active) {
        state.activeTab = active;
    },
    setDescriptionPanel(state, value) {
        state.activeDescriptionPanel = value;
    }
};

export const actions = {
    toggleExpanded({ commit, state }) {
        commit('setExpanded', !state.expanded);
    },

    setWorkflowMetaActive({ commit, state }) {
        commit('setActiveTab', TABS.WORKFLOW_METADATA);
        commit('setExpanded', true);
    },

    setNodeRepositoryActive({ commit, state }) {
        commit('setActiveTab', TABS.NODE_REPOSITORY);
        commit('setExpanded', true);
    },

    close({ commit }) {
        commit('setExpanded', false);
    },

    openDescriptionPanel({ commit }) {
        commit('setDescriptionPanel', true);
    },

    closeDescriptionPanel({ commit }) {
        commit('setDescriptionPanel', false);
    }
};
