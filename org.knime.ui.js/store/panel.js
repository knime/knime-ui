/**
 * Store that manages the global state of the side-panel (tabs plus expanding drawer).
 */

const TABS = {
    WF_META: 'workflowMetadata',
    NODE_REPO: 'nodeRepository'
};

export const state = () => ({
    expanded: false,
    activeTab: TABS.WF_META
});

export const getters = {
    wfMetaActive: state => state.activeTab === TABS.WF_META,
    nodeRepoActive: state => state.activeTab === TABS.NODE_REPO
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
        commit('setActiveTab', TABS.WF_META);
        if (!state.expanded) {
            commit('toggleExpanded');
        }
    },

    setNodeRepoActive({ commit, state }) {
        commit('setActiveTab', TABS.NODE_REPO);
        if (!state.expanded) {
            commit('toggleExpanded');
        }
    }
};
