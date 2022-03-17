import { openWorkflow } from '~api';

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
    }
};
