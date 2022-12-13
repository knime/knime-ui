import { openWorkflow, createWorkflow } from '@api';

export default {
    openWorkflow: {
        text: 'Open workflow',
        hotkey: ['Ctrl', 'O'],
        execute:
            ({ $router }) => {
                openWorkflow();
                $router.push('/workflow');
            }
    },
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
        execute:
            () => createWorkflow()
    }
};
