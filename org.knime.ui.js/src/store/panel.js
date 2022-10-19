/**
 * Store that manages the global state of the side-panel (tabs plus expanding drawer).
 */

export const TABS = {
    WORKFLOW_METADATA: 'workflowMetadata',
    NODE_REPOSITORY: 'nodeRepository',
    NODE_DIALOG: 'nodeDialog'
};

export const state = () => ({
    expanded: false,
    activeTab: TABS.WORKFLOW_METADATA
});

export const mutations = {
    setActiveTab(state, activeTab) {
        state.activeTab = activeTab;
        state.expanded = true;
    },
    toggleExpanded(state) {
        state.expanded = !state.expanded;
    },
    closePanel(state) {
        state.expanded = false;
    }
};
