import { openWorkflow, createWorkflow } from '@api';

export default {
    openWorkflow: {
        text: 'Open workflow',
        hotkey: ['Ctrl', 'O'],
        execute:
            () => openWorkflow()
    },
    closeWorkflow: {
        text: 'Close workflow',
        hotkey: ['Ctrl', 'W'],
        execute:
            ({ $store }) => $store.dispatch('workflow/closeWorkflow')
    },
    createWorkflow: {
        text: 'Create workflow',
        hotkey: ['Ctrl', 'N'],
        execute:
            () => createWorkflow()
    }
};
