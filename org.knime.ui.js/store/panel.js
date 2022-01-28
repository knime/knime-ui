/**
 * Store that manages the global state of the side-panel (tabs plus expanding drawer).
 */

const TABS = {
    WORKFLOW_METADATA: 'workflowMetadata',
    NODE_REPOSITORY: 'nodeRepository',
    NODE_DESCRIPTION: 'nodeDescription'
};

export const state = () => ({
    expanded: false,
    activeTab: TABS.WORKFLOW_METADATA,
    additionalPanel: false
});

export const getters = {
    workflowMetaActive: state => state.activeTab === TABS.WORKFLOW_METADATA,
    nodeRepositoryActive: state => state.activeTab === TABS.NODE_REPOSITORY,
    additionalPanelActive: state => state.additionalPanel === true
};

export const mutations = {
    setExpanded(state, value) {
        state.expanded = value;
    },
    setActiveTab(state, active) {
        state.activeTab = active;
    },
    setAdditionalPanel(state, value) {
        state.additionalPanel = value;
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

    openAdditionalPanel({ commit }) {
        commit('setAdditionalPanel', true);
    },

    closeAdditionalPanel({ commit }) {
        commit('setAdditionalPanel', false);
    }
};
