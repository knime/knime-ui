export default {
    closeWorkflow: {
        text: 'Close workflow',
        hotkey: ['Ctrl', 'W'],
        execute:
            ({ $store }) => $store.dispatch('workflow/closeWorkflow', $store.state.workflow.activeWorkflow?.projectId),
        condition:
            ({ $store }) => $store.state.workflow.activeWorkflow?.projectId !== null
    },
    createWorkflow: {
        text: 'Create workflow',
        hotkey: ['Ctrl', 'N'],
        execute: ({ $store }) => $store.commit('spaces/setIsCreateWorkflowModalOpen', true)
    }
};
